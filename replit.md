# Punch Impact Analyzer

## Overview
A web application that analyzes sparring/boxing footage to detect punch impacts, assess brain injury risk based on punch metrics and fighter weight, and provides a SCAT5-based concussion screening assessment.

## Project Structure
```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server with all endpoints
│   ├── video_analyzer.py    # Video processing and punch detection
│   ├── risk_calculator.py   # Brain injury risk calculation
│   └── concussion_assessment.py  # SCAT5 screening protocol
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

## Features
1. **Video Upload**: Users can upload sparring videos (MP4, AVI, MOV, MKV)
2. **Punch Detection**: Uses YOLOv8 + MediaPipe for pose estimation and punch impact detection
3. **Frame Selection**: Users can review detected impacts and select "clean" punches
4. **Brain Injury Risk**: Calculates estimated injury risk based on:
   - Punch velocity and acceleration
   - Power index (V × A)
   - Puncher's weight
   - Cumulative impact effects
5. **Concussion Screening**: SCAT5-based assessment including:
   - Red flag symptoms
   - 22 symptom evaluation
   - Orientation questions
   - Memory questions

## API Endpoints
- `GET /` - Main web interface
- `POST /api/upload` - Upload and analyze video
- `GET /api/session/{id}` - Get analysis results
- `POST /api/calculate-risk` - Calculate brain injury risk
- `GET /api/concussion-assessment` - Get assessment questions
- `POST /api/concussion-assessment/evaluate` - Evaluate assessment responses

## Dependencies
- FastAPI, Uvicorn, python-multipart
- OpenCV, MediaPipe, NumPy
- Ultralytics (YOLOv8)

## Running
The application runs on port 5000 using:
```
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```
