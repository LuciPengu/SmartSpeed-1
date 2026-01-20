from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import uuid
import shutil

from backend.video_analyzer import analyze_video
from backend.risk_calculator import calculate_brain_injury_risk
from backend.concussion_assessment import get_assessment_questions, evaluate_assessment, get_memory_test_words, evaluate_memory_test

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


class RiskCalculationRequest(BaseModel):
    session_id: str
    selected_impact_ids: List[int]
    puncher_weight_kg: float


class AssessmentRequest(BaseModel):
    red_flags: List[Dict[str, Any]]
    symptoms: List[Dict[str, Any]]
    orientation: List[Dict[str, Any]]


class MemoryTestRequest(BaseModel):
    recalled_words: List[str]
    original_words: List[str]
    baseline_score: Optional[int] = None


@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("frontend/index.html", "r") as f:
        content = f.read()
    return HTMLResponse(content=content, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/favicon.ico")
async def favicon():
    if os.path.exists("generated-icon.png"):
        return FileResponse("generated-icon.png", media_type="image/png")
    return Response(status_code=204)


@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    if not file.filename.endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a video file.")
    
    session_id = str(uuid.uuid4())[:8]
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{session_id}{file_extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        result = analyze_video(filepath)
        analysis_results[result['session_id']] = result
        
        os.remove(filepath)
        
        return {
            "success": True,
            "session_id": result['session_id'],
            "fps": result['fps'],
            "duration": result['duration'],
            "total_frames": result['total_frames'],
            "impact_count": result['impact_count'],
            "impacts": result['impacts']
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
    
    selected_impacts = [
        impact for impact in session['impacts'] 
        if impact['id'] in request.selected_impact_ids
    ]
    
    if not selected_impacts:
        raise HTTPException(status_code=400, detail="No impacts selected")
    
    risk_result = calculate_brain_injury_risk(selected_impacts, request.puncher_weight_kg)
    
    return risk_result


@app.get("/api/concussion-assessment")
async def get_concussion_questions():
    return get_assessment_questions()


@app.post("/api/concussion-assessment/evaluate")
async def evaluate_concussion(request: AssessmentRequest):
    responses = {
        "red_flags": request.red_flags,
        "symptoms": request.symptoms,
        "orientation": request.orientation
    }
    
    result = evaluate_assessment(responses)
    return result


@app.get("/api/memory-test/words")
async def get_memory_words():
    return get_memory_test_words()


@app.post("/api/memory-test/evaluate")
async def evaluate_memory(request: MemoryTestRequest):
    result = evaluate_memory_test(
        request.recalled_words,
        request.original_words,
        request.baseline_score
    )
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
