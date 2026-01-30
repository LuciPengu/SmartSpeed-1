from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Response, Form, Request, Depends, Cookie
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import uuid
import shutil
import json
import secrets
from datetime import datetime, timedelta

from backend.video_analyzer import analyze_video
from backend.risk_calculator import calculate_brain_injury_risk
from backend.concussion_assessment import get_assessment_questions, evaluate_assessment
from backend.ai_summary import generate_ai_summary_stream, generate_ai_summary
from backend.database import init_db, get_db, User, InjurySession, ImpactRecord
from backend import auth
from backend import stripe_client

init_db()

app = FastAPI(title="Hitsmart Strike Calculator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware

class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.endswith(('.js', '.css')):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

app.add_middleware(NoCacheMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")

analysis_results: Dict[str, Any] = {}

UPLOAD_DIR = "static/uploads"
FRAMES_DIR = "static/frames"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(FRAMES_DIR, exist_ok=True)

def cleanup_old_frames(max_age_hours: int = 24):
    """Remove frame directories older than max_age_hours"""
    try:
        now = datetime.now()
        for session_dir in os.listdir(FRAMES_DIR):
            session_path = os.path.join(FRAMES_DIR, session_dir)
            if os.path.isdir(session_path):
                dir_mtime = datetime.fromtimestamp(os.path.getmtime(session_path))
                if (now - dir_mtime) > timedelta(hours=max_age_hours):
                    shutil.rmtree(session_path)
    except Exception as e:
        print(f"Error cleaning up frames: {e}")

cleanup_old_frames(24)


class FighterSetting(BaseModel):
    skill: str
    weight: float

class FighterSettings(BaseModel):
    fighter1: FighterSetting
    fighter2: FighterSetting

class RiskCalculationRequest(BaseModel):
    session_id: str
    selected_impact_ids: List[int]
    impact_data: Optional[List[Dict[str, Any]]] = None
    fighter_settings: Optional[FighterSettings] = None


class AssessmentRequest(BaseModel):
    red_flags: List[Dict[str, Any]]
    symptoms: List[Dict[str, Any]]
    strike_data: Optional[Dict[str, Any]] = None


@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("frontend/index.html", "r") as f:
        return f.read()


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/favicon.ico")
async def favicon():
    if os.path.exists("generated-icon.png"):
        return FileResponse("generated-icon.png", media_type="image/png")
    return Response(status_code=204)


MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

@app.post("/api/upload")
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    fighter_settings: str = Form(default="{}")
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Please sign in before uploading a video.")
    
    db_gen = get_db()
    db = next(db_gen)
    try:
        user_data = auth.get_user_from_session(db, session_id)
        if not user_data:
            raise HTTPException(status_code=401, detail="Please sign in before uploading a video.")
        
        user = db.query(User).filter(User.id == user_data.get('id')).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")
        
        has_access = stripe_client.check_subscription_access(user)
        if not has_access:
            raise HTTPException(status_code=403, detail="Active subscription required. Please subscribe to analyze videos.")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
    
    filename_str = file.filename or ""
    if not filename_str.endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a video file.")
    
    try:
        settings = json.loads(fighter_settings)
    except:
        settings = {}
    
    session_id = str(uuid.uuid4())[:8]
    file_extension = os.path.splitext(filename_str)[1]
    filename = f"{session_id}{file_extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB.")
    
    with open(filepath, "wb") as buffer:
        buffer.write(file_content)
    
    try:
        result = analyze_video(filepath)
        result['fighter_settings'] = settings
        analysis_results[result['session_id']] = result
        
        os.remove(filepath)
        
        return {
            "success": True,
            "session_id": result['session_id'],
            "fps": result['fps'],
            "duration": result['duration'],
            "total_frames": result['total_frames'],
            "impact_count": result['impact_count'],
            "impacts": result['impacts'],
            "fighter_settings": settings
        }
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Error processing video: {str(e)}")


@app.get("/api/session/{session_id}")
async def get_session(session_id: str):
    if session_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return analysis_results[session_id]


@app.post("/api/calculate-risk")
async def calculate_risk(request: RiskCalculationRequest):
    if request.session_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = analysis_results[request.session_id]
    
    if request.impact_data:
        selected_impacts = request.impact_data
    else:
        selected_impacts = [
            impact for impact in session['impacts'] 
            if impact['id'] in request.selected_impact_ids
        ]
    
    if not selected_impacts:
        raise HTTPException(status_code=400, detail="No impacts selected")
    
    fighter_settings = None
    if request.fighter_settings:
        fighter_settings = {
            'fighter1': {'skill': request.fighter_settings.fighter1.skill, 'weight': request.fighter_settings.fighter1.weight},
            'fighter2': {'skill': request.fighter_settings.fighter2.skill, 'weight': request.fighter_settings.fighter2.weight}
        }
    
    risk_result = calculate_brain_injury_risk(selected_impacts, fighter_settings)
    
    return risk_result


@app.get("/api/concussion-assessment")
async def get_concussion_questions():
    return get_assessment_questions()


@app.post("/api/concussion-assessment/evaluate")
async def evaluate_concussion(request: AssessmentRequest):
    try:
        responses = {
            "red_flags": request.red_flags,
            "symptoms": request.symptoms
        }
        
        strike_data = None
        if request.strike_data:
            strike_data = {
                "impact_count": request.strike_data.get("impact_count", 0),
                "risk_percentage": request.strike_data.get("risk_percentage", 0),
                "max_single_impact_force": request.strike_data.get("max_single_impact_force", 0),
                "total_force_estimate": request.strike_data.get("total_force_estimate", 0),
                "avg_g_force": request.strike_data.get("avg_g_force", 0)
            }
        
        result = evaluate_assessment(responses, strike_data)
        return result
    except Exception as e:
        return {"error": str(e), "urgency_level": "none", "recommendation": "An error occurred. Please try again."}


class AISummaryRequest(BaseModel):
    risk_data: Dict[str, Any]
    fighter_settings: Optional[Dict[str, Any]] = None


@app.post("/api/ai-summary/stream")
async def stream_ai_summary(request: AISummaryRequest):
    def event_generator():
        for chunk in generate_ai_summary_stream(request.risk_data, request.fighter_settings):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/ai-summary")
async def get_ai_summary(request: AISummaryRequest):
    summary = generate_ai_summary(request.risk_data, request.fighter_settings)
    return {"summary": summary}


class AIChatRequest(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]]
    session_context: Dict[str, Any]


@app.post("/api/ai-chat/stream")
async def stream_ai_chat(request: AIChatRequest):
    from backend.ai_summary import generate_chat_response_stream
    
    def event_generator():
        for chunk in generate_chat_response_stream(
            request.message, 
            request.conversation_history, 
            request.session_context
        ):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        existing = db.query(User).filter(User.email == request.email.lower()).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        password_hash, salt = auth.hash_password(request.password)
        user_id = str(uuid.uuid4())
        
        new_user = User(
            id=user_id,
            email=request.email.lower(),
            password_hash=password_hash,
            password_salt=salt,
            first_name=request.first_name,
            last_name=request.last_name
        )
        db.add(new_user)
        db.commit()
        
        user_data = {
            'id': user_id,
            'email': new_user.email,
            'first_name': new_user.first_name,
            'last_name': new_user.last_name
        }
        session_id = auth.create_session(db, user_data)
        
        response = JSONResponse(content={"success": True, "user": user_data})
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60*60*24*7
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        user = db.query(User).filter(User.email == request.email.lower()).first()
        if not user or not user.password_hash:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not auth.verify_password(request.password, user.password_hash, user.password_salt):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_data = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name
        }
        session_id = auth.create_session(db, user_data)
        
        response = JSONResponse(content={"success": True, "user": user_data})
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60*60*24*7
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.get("/api/auth/user")
async def get_current_user(request: Request):
    session_id = request.cookies.get("session_id")
    
    if not session_id:
        return {"authenticated": False, "user": None}
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        user = auth.get_user_from_session(db, session_id)
        if user:
            return {"authenticated": True, "user": user}
        return {"authenticated": False, "user": None}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.get("/api/auth/logout")
async def logout(request: Request, session_id: Optional[str] = Cookie(default=None)):
    if session_id:
        db_gen = get_db()
        db = next(db_gen)
        try:
            auth.delete_session(db, session_id)
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass
    
    response = JSONResponse(content={"success": True})
    response.delete_cookie("session_id")
    return response


class SaveSessionRequest(BaseModel):
    user_id: str
    session_id: str
    fighter_settings: Dict[str, Any]
    risk_data: Dict[str, Any]
    ai_summary: Optional[str] = None
    assessment_result: Optional[Dict[str, Any]] = None


@app.post("/api/sessions/save")
async def save_session(request: SaveSessionRequest):
    db_gen = get_db()
    db = next(db_gen)
    
    if db is None:
        return {"success": False, "error": "Database not configured"}
    
    try:
        f1 = request.fighter_settings.get('fighter1', {})
        f2 = request.fighter_settings.get('fighter2', {})
        
        injury_session = InjurySession(
            user_id=request.user_id,
            session_id=request.session_id,
            fighter1_skill=f1.get('skill', 'professional'),
            fighter1_weight=f1.get('weight', 75),
            fighter2_skill=f2.get('skill', 'professional'),
            fighter2_weight=f2.get('weight', 75),
            overall_risk=request.risk_data.get('overall_risk'),
            risk_percentage=request.risk_data.get('risk_percentage'),
            total_force=request.risk_data.get('total_force_estimate'),
            impact_count=request.risk_data.get('impact_count', 0),
            ai_summary=request.ai_summary,
            recommendation=request.risk_data.get('recommendation'),
            assessment_result=request.assessment_result
        )
        db.add(injury_session)
        db.flush()
        
        for impact in request.risk_data.get('impact_details', []):
            impact_record = ImpactRecord(
                session_id=injury_session.id,
                frame=impact.get('frame'),
                time=impact.get('time'),
                hand=impact.get('hand'),
                fighter=impact.get('fighter', 1),
                speed_min=impact.get('speed_min'),
                speed_max=impact.get('speed_max'),
                power_min=impact.get('force_min'),
                power_max=impact.get('force_max'),
                motion_intensity=impact.get('motion_intensity'),
                risk_level=impact.get('risk_level'),
                injury_probability=impact.get('injury_probability'),
                g_force=impact.get('g_force')
            )
            db.add(impact_record)
        
        db.commit()
        return {"success": True, "session_db_id": injury_session.id}
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


@app.get("/api/sessions/{user_id}")
async def get_user_sessions(user_id: str):
    db_gen = get_db()
    db = next(db_gen)
    
    if db is None:
        return {"sessions": [], "error": "Database not configured"}
    
    try:
        sessions = db.query(InjurySession).filter(
            InjurySession.user_id == user_id
        ).order_by(InjurySession.created_at.desc()).limit(20).all()
        
        result = []
        for s in sessions:
            result.append({
                "id": s.id,
                "session_id": s.session_id,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "overall_risk": s.overall_risk,
                "risk_percentage": s.risk_percentage,
                "impact_count": s.impact_count,
                "total_force": s.total_force,
                "ai_summary": s.ai_summary,
                "recommendation": s.recommendation,
                "fighter1_skill": s.fighter1_skill,
                "fighter1_weight": s.fighter1_weight,
                "fighter2_skill": s.fighter2_skill,
                "fighter2_weight": s.fighter2_weight
            })
        
        return {"sessions": result}
    except Exception as e:
        return {"sessions": [], "error": str(e)}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


@app.get("/api/sessions/{user_id}/{session_db_id}")
async def get_session_details(user_id: str, session_db_id: int):
    db_gen = get_db()
    db = next(db_gen)
    
    if db is None:
        return {"error": "Database not configured"}
    
    try:
        session = db.query(InjurySession).filter(
            InjurySession.id == session_db_id,
            InjurySession.user_id == user_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        impacts = []
        for impact in session.impacts:
            impacts.append({
                "id": impact.id,
                "frame": impact.frame,
                "time": impact.time,
                "hand": impact.hand,
                "fighter": impact.fighter,
                "speed_min": impact.speed_min,
                "speed_max": impact.speed_max,
                "power_min": impact.power_min,
                "power_max": impact.power_max,
                "motion_intensity": impact.motion_intensity,
                "risk_level": impact.risk_level,
                "injury_probability": impact.injury_probability,
                "g_force": impact.g_force
            })
        
        return {
            "id": session.id,
            "session_id": session.session_id,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "overall_risk": session.overall_risk,
            "risk_percentage": session.risk_percentage,
            "impact_count": session.impact_count,
            "total_force": session.total_force,
            "ai_summary": session.ai_summary,
            "recommendation": session.recommendation,
            "assessment_result": session.assessment_result,
            "fighter1_skill": session.fighter1_skill,
            "fighter1_weight": session.fighter1_weight,
            "fighter2_skill": session.fighter2_skill,
            "fighter2_weight": session.fighter2_weight,
            "impacts": impacts
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"error": str(e)}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


@app.get("/api/stripe/publishable-key")
async def get_stripe_publishable_key():
    try:
        key = await stripe_client.get_publishable_key()
        return {"publishable_key": key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stripe/product")
async def get_stripe_product():
    try:
        product = await stripe_client.get_or_create_subscription_product()
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CheckoutRequest(BaseModel):
    return_url: str

@app.post("/api/stripe/checkout")
async def create_checkout(request: CheckoutRequest, session_id: str = Cookie(None)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        from backend.database import OAuthSession
        oauth_session = db.query(OAuthSession).filter(OAuthSession.session_id == session_id).first()
        if not oauth_session:
            raise HTTPException(status_code=401, detail="Session not found")
        
        user = db.query(User).filter(User.id == oauth_session.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        result = await stripe_client.create_checkout_session(
            user_id=user.id,
            email=user.email,
            customer_id=user.stripe_customer_id,
            return_url=request.return_url
        )
        
        if not user.stripe_customer_id:
            user.stripe_customer_id = result['customer_id']
            db.commit()
        
        return {"url": result['url'], "session_id": result['session_id']}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.post("/api/stripe/portal")
async def create_portal_session(request: CheckoutRequest, session_id: str = Cookie(None)):
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        from backend.database import OAuthSession
        oauth_session = db.query(OAuthSession).filter(OAuthSession.session_id == session_id).first()
        if not oauth_session:
            raise HTTPException(status_code=401, detail="Session not found")
        
        user = db.query(User).filter(User.id == oauth_session.user_id).first()
        if not user or not user.stripe_customer_id:
            raise HTTPException(status_code=400, detail="No subscription found")
        
        result = await stripe_client.create_customer_portal_session(
            customer_id=user.stripe_customer_id,
            return_url=request.return_url
        )
        
        return {"url": result['url']}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.post("/api/stripe/verify-session")
async def verify_checkout_session(request: Request, session_id: str = Cookie(None)):
    """Verify checkout session and activate subscription after redirect from Stripe"""
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    checkout_session_id = body.get('session_id')
    
    if not checkout_session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        from backend.database import OAuthSession
        oauth_session = db.query(OAuthSession).filter(OAuthSession.session_id == session_id).first()
        if not oauth_session:
            raise HTTPException(status_code=401, detail="Session not found")
        
        user = db.query(User).filter(User.id == oauth_session.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        stripe_api = await stripe_client.get_stripe_client()
        checkout = stripe_api.checkout.Session.retrieve(checkout_session_id)
        
        if checkout.payment_status == 'paid' or checkout.status == 'complete':
            user.stripe_customer_id = checkout.customer
            user.stripe_subscription_id = checkout.subscription
            user.subscription_status = 'trialing' if checkout.subscription else 'active'
            user.trial_ends_at = datetime.now() + timedelta(days=7)
            db.commit()
            
            return {
                "success": True,
                "subscription_status": user.subscription_status,
                "has_access": True
            }
        
        return {"success": False, "has_access": False}
    except Exception as e:
        print(f"Verify session error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.get("/api/stripe/subscription")
async def get_subscription_status(session_id: str = Cookie(None)):
    if not session_id:
        return {"subscription": None, "has_access": False}
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        from backend.database import OAuthSession
        oauth_session = db.query(OAuthSession).filter(OAuthSession.session_id == session_id).first()
        if not oauth_session:
            return {"subscription": None, "has_access": False}
        
        user = db.query(User).filter(User.id == oauth_session.user_id).first()
        if not user:
            return {"subscription": None, "has_access": False}
        
        ADMIN_EMAILS = ['nealconwayp@gmail.com']
        if user.email in ADMIN_EMAILS:
            return {
                "subscription": {"status": "admin"},
                "has_access": True
            }
        
        if user.stripe_subscription_id:
            sub_status = await stripe_client.get_subscription_status(user.stripe_subscription_id)
            if sub_status:
                has_access = sub_status['status'] in ['active', 'trialing']
                return {
                    "subscription": {
                        "status": sub_status['status'],
                        "trial_end": sub_status['trial_end'].isoformat() if sub_status['trial_end'] else None,
                        "current_period_end": sub_status['current_period_end'].isoformat(),
                        "cancel_at_period_end": sub_status['cancel_at_period_end']
                    },
                    "has_access": has_access
                }
        
        return {
            "subscription": {"status": user.subscription_status} if user.subscription_status != 'none' else None,
            "has_access": user.subscription_status in ['active', 'trialing']
        }
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing signature")
    
    webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        import stripe
        credentials = await stripe_client.get_stripe_credentials()
        stripe.api_key = credentials['secret_key']
        
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        event_type = event['type']
        
        if event_type == 'checkout.session.completed':
            session = event['data']['object']
            customer_id = session.get('customer')
            subscription_id = session.get('subscription')
            user_id = session.get('metadata', {}).get('user_id')
            
            if user_id and subscription_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    user.stripe_customer_id = customer_id
                    user.stripe_subscription_id = subscription_id
                    user.subscription_status = 'trialing'
                    user.trial_ends_at = datetime.now() + timedelta(days=7)
                    db.commit()
        
        elif event_type == 'customer.subscription.updated':
            subscription = event['data']['object']
            subscription_id = subscription.get('id')
            status = subscription.get('status')
            
            user = db.query(User).filter(User.stripe_subscription_id == subscription_id).first()
            if user:
                user.subscription_status = status
                if subscription.get('trial_end'):
                    user.trial_ends_at = datetime.fromtimestamp(subscription['trial_end'])
                db.commit()
        
        elif event_type == 'customer.subscription.deleted':
            subscription = event['data']['object']
            subscription_id = subscription.get('id')
            
            user = db.query(User).filter(User.stripe_subscription_id == subscription_id).first()
            if user:
                user.subscription_status = 'canceled'
                user.stripe_subscription_id = None
                db.commit()
        
        return {"received": True}
    except Exception as e:
        print(f"Webhook error: {e}")
        return {"received": True}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
