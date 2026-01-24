from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Response, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import uuid
import shutil
import json

from backend.video_analyzer import analyze_video
from backend.risk_calculator import calculate_brain_injury_risk
from backend.concussion_assessment import get_assessment_questions, evaluate_assessment

app = FastAPI(title="Punch Impact Analyzer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
