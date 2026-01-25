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
from backend.database import init_db, get_db, User, InjurySession, ImpactRecord, OAuthSession
from backend import replit_auth

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
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs("static/frames", exist_ok=True)


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
    orientation: List[Dict[str, Any]]
    memory: List[Dict[str, Any]]


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
    file: UploadFile = File(...),
    fighter_settings: str = Form(default="{}")
):
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
    responses = {
        "red_flags": request.red_flags,
        "symptoms": request.symptoms,
        "orientation": request.orientation,
        "memory": request.memory
    }
    
    result = evaluate_assessment(responses)
    return result


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


@app.get("/api/auth/login")
async def start_login(request: Request):
    state = secrets.token_urlsafe(32)
    
    host = request.headers.get('host', 'localhost:5000')
    scheme = request.headers.get('x-forwarded-proto', 'https')
    redirect_uri = f"{scheme}://{host}/api/auth/callback"
    
    auth_url, code_verifier = replit_auth.get_auth_url(redirect_uri, state)
    replit_auth.store_auth_state(state, code_verifier, redirect_uri)
    
    return RedirectResponse(url=auth_url)

@app.get("/api/auth/callback")
async def auth_callback(request: Request, code: str = None, state: str = None, error: str = None):
    if error:
        return RedirectResponse(url="/?auth_error=" + error)
    
    if not code or not state:
        return RedirectResponse(url="/?auth_error=missing_params")
    
    auth_state = replit_auth.get_auth_state(state)
    if not auth_state:
        return RedirectResponse(url="/?auth_error=invalid_state")
    
    tokens = await replit_auth.exchange_code_for_token(
        code, 
        auth_state['redirect_uri'], 
        auth_state['code_verifier']
    )
    
    if not tokens:
        return RedirectResponse(url="/?auth_error=token_exchange_failed")
    
    user_claims = replit_auth.decode_id_token(tokens.get('id_token', ''))
    if not user_claims:
        return RedirectResponse(url="/?auth_error=invalid_token")
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        user_id = str(user_claims.get('sub'))
        email = user_claims.get('email')
        
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user and email:
            existing_email_user = db.query(User).filter(User.email == email).first()
            if existing_email_user:
                existing_email_user.id = user_id
                existing_email_user.first_name = user_claims.get('first_name') or existing_email_user.first_name
                existing_email_user.last_name = user_claims.get('last_name') or existing_email_user.last_name
                existing_email_user.profile_image_url = user_claims.get('profile_image_url') or existing_email_user.profile_image_url
                db.commit()
                user = existing_email_user
        
        if not user:
            user = User(
                id=user_id,
                email=email,
                first_name=user_claims.get('first_name'),
                last_name=user_claims.get('last_name'),
                profile_image_url=user_claims.get('profile_image_url')
            )
            db.add(user)
            db.commit()
        else:
            if email:
                user.email = email
            user.first_name = user_claims.get('first_name') or user.first_name
            user.last_name = user_claims.get('last_name') or user.last_name
            user.profile_image_url = user_claims.get('profile_image_url') or user.profile_image_url
            db.commit()
        
        session_id = replit_auth.create_session(user_claims, tokens)
        
        oauth_session = OAuthSession(
            session_id=session_id,
            user_id=user_id,
            access_token=tokens.get('access_token'),
            refresh_token=tokens.get('refresh_token'),
            expires_at=datetime.now() + timedelta(seconds=tokens.get('expires_in', 3600))
        )
        db.add(oauth_session)
        db.commit()
        
        response = RedirectResponse(url="/?auth_success=true")
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=86400 * 7
        )
        return response
        
    except Exception as e:
        print(f"Auth error: {e}")
        return RedirectResponse(url="/?auth_error=database_error")
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
    
    user = replit_auth.get_user_from_session(session_id)
    if user:
        return {"authenticated": True, "user": user}
    
    db_gen = get_db()
    db = next(db_gen)
    
    try:
        oauth_session = db.query(OAuthSession).filter(OAuthSession.session_id == session_id).first()
        if oauth_session:
            db_user = db.query(User).filter(User.id == oauth_session.user_id).first()
            if db_user:
                replit_auth.sessions[session_id] = {
                    'user': {
                        'id': db_user.id,
                        'email': db_user.email,
                        'first_name': db_user.first_name,
                        'last_name': db_user.last_name,
                        'profile_image_url': db_user.profile_image_url
                    }
                }
                return {
                    "authenticated": True,
                    "user": {
                        "id": db_user.id,
                        "email": db_user.email,
                        "first_name": db_user.first_name,
                        "last_name": db_user.last_name,
                        "profile_image_url": db_user.profile_image_url
                    }
                }
    except Exception as e:
        print(f"Session lookup error: {e}")
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
    
    return {"authenticated": False, "user": None}

@app.get("/api/auth/logout")
async def logout(request: Request, session_id: Optional[str] = Cookie(default=None)):
    if session_id:
        replit_auth.delete_session(session_id)
        
        db_gen = get_db()
        db = next(db_gen)
        try:
            db.query(OAuthSession).filter(OAuthSession.session_id == session_id).delete()
            db.commit()
        except:
            pass
        finally:
            try:
                next(db_gen)
            except StopIteration:
                pass
    
    host = request.headers.get('host', 'localhost:5000')
    scheme = request.headers.get('x-forwarded-proto', 'https')
    post_logout_uri = f"{scheme}://{host}/"
    
    logout_url = replit_auth.get_logout_url(post_logout_uri)
    
    response = RedirectResponse(url=logout_url)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
