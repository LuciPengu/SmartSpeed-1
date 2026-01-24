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
1. **Fighter Configuration**: Configure both fighters with:
   - Skill level (Beginner, Amateur, Professional, Elite)
   - Weight in kg (used for force calculations)
2. **Video Upload**: Users can upload sparring videos (MP4, AVI, MOV, MKV)
3. **Punch Detection**: Uses YOLOv8 + MediaPipe for pose estimation and punch impact detection
4. **Skill-Based Speed/Power Ranges**: Estimates punch metrics based on fighter skill:
   - Beginner: 12-18 mph
   - Amateur: 18-26 mph
   - Professional: 24-35 mph
   - Elite: 32-48 mph
   - Force calculated using F = ma with 4% effective body mass
5. **Frame Selection**: Users can review detected impacts with estimated speed/power ranges
6. **Brain Injury Risk**: Calculates estimated injury risk based on:
   - Motion intensity from video analysis
   - Skill-based speed ranges
   - Fighter weight for force calculations
   - Cumulative impact effects
7. **Concussion Screening**: SCAT5-based assessment including:
   - Red flag symptoms
   - 22 symptom evaluation
   - Orientation questions
   - Memory questions

## UI Theme
High-tech green glassy aesthetic with:
- Dark background with subtle gradient
- Glassmorphism panels with backdrop blur
- Neon green/teal accents (#00ff9d, #00d4aa)
- Scanline effects for futuristic look
- Glow effects on interactive elements

## Recent Changes (January 2026)
- Added fighter configuration UI with skill levels and weights
- Implemented skill-based speed/power range estimation instead of raw velocity
- Redesigned UI with high-tech green glassy theme
- Reduced deployment size to ~1.5GB using CPU-only PyTorch

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
