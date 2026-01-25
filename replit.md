# Hitsmart Strike Calculator

## Overview
A web application that analyzes sparring/boxing footage to detect punch impacts, assess brain injury risk based on punch metrics and fighter weight, and provides a SCAT5-based concussion screening assessment.

## Project Structure
```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server with all endpoints
│   ├── video_analyzer.py    # Video processing and punch detection
│   ├── risk_calculator.py   # Brain injury risk calculation
│   ├── concussion_assessment.py  # SCAT5 screening protocol
│   ├── database.py          # PostgreSQL models (User, InjurySession, ImpactRecord, OAuthSession)
│   ├── replit_auth.py       # Replit OAuth 2.0 with PKCE flow
│   └── ai_summary.py        # Replicate/GPT-4o streaming AI summary
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
8. **AI Summary**: Streaming AI-powered analysis using GPT-4o via Replicate:
   - Real-time streaming summary of punch impacts
   - Personalized injury risk insights
   - Recovery recommendations
9. **User Login & History**: Replit OAuth authentication:
   - Secure OAuth 2.0 with PKCE flow
   - Supports Google, GitHub, Apple, and email/password login via Replit
   - Save analysis sessions to PostgreSQL database
   - View past injury history
   - Track cumulative exposure over time

## UI Theme
Modern glassware aesthetic with:
- Black background
- Glassmorphism panels with backdrop blur
- Emerald green accents (#10b981)
- Montserrat font throughout
- Clean, professional design

## Recent Changes (January 2026)
- Added throwing intensity percentage slider for each fighter (affects speed/power calculations)
- Speed and power only shown in final analysis phase (not frame selection)
- Only selected frames displayed in analysis results
- Sign-in required before starting video analysis
- Renamed to "Hitsmart Strike Calculator"
- Black background with modern glassware UI
- Added fighter configuration UI with skill levels and weights
- Implemented skill-based speed/power range estimation instead of raw velocity
- Reduced deployment size to ~1.5GB using CPU-only PyTorch
- Added streaming AI summary using GPT-4o via Replicate API
- Migrated to Replit OAuth with PKCE flow for secure authentication
- OAuth supports Google, GitHub, Apple, and email/password login
- New history modal to view past analysis sessions

## API Endpoints
- `GET /` - Main web interface
- `POST /api/upload` - Upload and analyze video
- `GET /api/session/{id}` - Get analysis results
- `POST /api/calculate-risk` - Calculate brain injury risk
- `GET /api/concussion-assessment` - Get assessment questions
- `POST /api/concussion-assessment/evaluate` - Evaluate assessment responses
- `POST /api/ai-summary/stream` - Stream AI analysis (SSE)
- `POST /api/ai-summary` - Get AI summary (non-streaming)
- `GET /api/auth/login` - Initiate Replit OAuth login (redirects to Replit)
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/user` - Get current authenticated user
- `GET /api/auth/logout` - Logout and clear session
- `POST /api/sessions/save` - Save session to history
- `GET /api/sessions/{user_id}` - Get user's session history
- `GET /api/sessions/{user_id}/{session_id}` - Get session details

## Dependencies
- FastAPI, Uvicorn, python-multipart
- OpenCV, MediaPipe, NumPy
- Ultralytics (YOLOv8)
- Replicate (GPT-4o for AI summaries)
- SQLAlchemy, psycopg2-binary (PostgreSQL database)
- sse-starlette (Server-Sent Events for streaming)
- httpx (async HTTP client for OAuth)
- PyJWT (JWT token decoding)

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `REPLICATE_API_TOKEN` - API key for Replicate/GPT-4o integration

## Running
The application runs on port 5000 using:
```
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```
