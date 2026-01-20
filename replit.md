# Punch Impact Analyzer

## Overview
A web application that analyzes sparring/boxing footage to detect punch impacts, assess brain injury risk based on punch metrics and fighter weight, and provides a SCAT5-based concussion screening assessment with baseline memory comparison.

## Project Structure
```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server with all endpoints
│   ├── video_analyzer.py    # Video processing and punch detection
│   ├── risk_calculator.py   # Brain injury risk calculation
│   └── concussion_assessment.py  # SCAT5 screening + memory baseline
├── frontend/
│   └── index.html           # Main web interface
├── static/
│   ├── css/styles.css       # Application styling
│   ├── js/app.js            # Frontend JavaScript
│   ├── frames/              # Saved impact frame images
│   └── uploads/             # Temporary video uploads
├── pose_landmarker_heavy.task  # MediaPipe pose model
└── punchfinder.py           # Original standalone punch detection script
```

## Features & Flow
The application follows a single linear flow (7 steps):

1. **Step 1 - Video Upload**: Users upload sparring videos (MP4, AVI, MOV, MKV)
2. **Step 2 - Review Impacts**: YOLOv8 + MediaPipe detects punch impacts; user selects clean punches
3. **Step 3 - Risk Assessment**: Calculates brain injury risk based on:
   - Punch velocity and acceleration
   - Power index (V × A)
   - Puncher's weight
   - Cumulative impact effects
4. **Step 4 - SCAT5 Screening**: Simplified concussion assessment including:
   - Red flag symptoms (emergency indicators)
   - 22 symptom evaluation (0-6 severity scale)
   - Self-validated orientation questions (month, date, day, year)
5. **Step 5 - SCAT5 Results**: Display urgency level, symptom summary, and recommendations
6. **Step 6 - Memory Baseline Test**: Post-SCAT5 memory testing with:
   - 5-word recall test (10-second study, then recall)
   - Comparison against stored baseline (localStorage)
   - Option to create baseline when healthy
   - Color-coded results (good/caution/concern)
7. **Step 7 - Final Results**: Complete summary of punch analysis, SCAT5, and memory comparison

## API Endpoints
- `GET /` - Main web interface
- `POST /api/upload` - Upload and analyze video
- `GET /api/session/{id}` - Get analysis results
- `POST /api/calculate-risk` - Calculate brain injury risk
- `GET /api/concussion-assessment` - Get SCAT5 questions
- `POST /api/concussion-assessment/evaluate` - Evaluate SCAT5 responses
- `GET /api/memory-test/words` - Get random 5-word list for memory test
- `POST /api/memory-test/evaluate` - Evaluate memory recall vs baseline

## Dependencies
- FastAPI, Uvicorn, python-multipart
- OpenCV, MediaPipe, NumPy
- Ultralytics (YOLOv8)

## Running
The application runs on port 5000 using:
```
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```

## Technical Notes
- Detection threshold: 0.35 with scale-invariant normalization using opponent's torso height
- MediaPipe processes clean frames before any visual overlays (critical for accurate detection)
- Memory baseline stored in browser localStorage for persistence across sessions
