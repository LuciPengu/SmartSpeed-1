# Hitsmart Strike Calculator

## Overview
A web application that analyzes sparring/boxing footage to detect punch impacts, assess brain injury risk based on punch metrics and fighter weight, and provides a SCAT5-based concussion screening assessment. Now includes a comprehensive educational course on concussion science alongside the calculator.

## Project Structure
```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server with all endpoints
│   ├── video_analyzer.py    # Video processing and punch detection
│   ├── risk_calculator.py   # Brain injury risk calculation
│   ├── concussion_assessment.py  # SCAT5 screening protocol
│   ├── database.py          # PostgreSQL models (User, InjurySession, ImpactRecord)
│   ├── auth.py              # Email/password authentication with session management
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
9. **User Login & History**: Custom email/password authentication:
   - Secure PBKDF2-HMAC-SHA256 password hashing with random salt
   - Session-based auth with 7-day cookie expiration
   - Save analysis sessions to PostgreSQL database
   - View past injury history with full concussion screening details
   - Track cumulative exposure over time
10. **Concussion Science Course**: Comprehensive 9-lesson educational course ($29.99 one-time purchase):
    - Lesson 1: What is a Concussion (physics, energy crisis, invisible injury, TBI classification, long-term risks)
    - Lesson 2: Setting Expectations (second impact syndrome, nocebo effect, fear avoidance)
    - Lesson 3: Understanding & Managing (ripple effects, leaky gut, hormones, emotional brakes)
    - Lesson 4: Nervous System (sympathetic storm, calm guide, vagal exercises)
    - Lesson 5: Aerobic Exercise (BDNF, 3-point rule, 6-step return-to-sport ladder)
    - Lesson 6: Diet & Nutrition (omega-3, creatine, magnesium, progress killers)
    - Lesson 7: Sleep (glymphatic clearance, sleep blueprint, four Ps)
    - Lesson 8: Neck (cervical thresholds, cervicogenic symptoms, treatment)
    - Lesson 9: Visual / Vestibular (VOMS, expose and recover, frequency-based rehab)
    - Educational images from Concussion Alliance, Complete Concussions, Cognitive FX USA
    - Based on 2022 Amsterdam Consensus, Canadian Guideline on Concussion in Sport (2024), and peer-reviewed research
    - Course purchase includes 1 month FREE Strike Calculator subscription bonus

## UI Theme
Modern glassware aesthetic with:
- Black background
- Glassmorphism panels with backdrop blur
- Emerald green accents (#10b981)
- Montserrat font throughout
- Clean, professional design

## Recent Changes (February 2026)
- **Restructured Concussion Science Course** (Latest):
  - Reorganized to 9 comprehensive lessons based on attached course document
  - Lesson 1: What is a Concussion (physics, energy crisis, invisible injury)
  - Lesson 2: Setting Expectations (second impact syndrome, nocebo effect, fear avoidance)
  - Lesson 3: Understanding & Managing (ripple effects, leaky gut, hormones, emotional brakes)
  - Lesson 4: Nervous System (sympathetic storm, calm guide, vagal exercises)
  - Lesson 5: Aerobic Exercise (BDNF, 3-point rule, 6-step return-to-sport ladder)
  - Lesson 6: Diet & Nutrition (omega-3, creatine, magnesium, progress killers)
  - Lesson 7: Sleep (glymphatic clearance, sleep blueprint, four Ps)
  - Lesson 8: Neck (cervical thresholds, cervicogenic symptoms, treatment)
  - Lesson 9: Visual / Vestibular (VOMS, expose and recover, frequency-based rehab)
  - Based on Amsterdam 2022 Consensus and Canadian Guideline on Concussion in Sport (2024)
- **Production Error Fix**:
  - Added global exception handler to ensure all errors return JSON instead of HTML error pages
- **Stripe Subscription Integration**:
  - Monthly subscription ($9.99/month) with 7-day free trial required for video analysis
  - Subscription banner for non-subscribers encouraging trial signup
  - Subscription modal with feature list and pricing when trying to analyze without subscription
  - Server-side and client-side subscription gating on video uploads
  - Stripe webhook handling for subscription status updates
  - Customer portal integration for subscription management
- **Simplified UI & Toast Notifications**:
  - Removed ranking/scoring systems for cleaner UX
  - Custom toast notifications instead of browser alerts
  - Session details modal shows full concussion screening results
  - Click-outside-to-close for all modals
  - Smooth page transitions with step fade-in animations
  - Number count-up animations for all stats
- **AI Chat**: Follow-up question capability after AI summary loads - ask questions about the analysis
- **Integrated Assessment**: Concussion screening now combines both symptoms AND strike data for risk evaluation
- **Realistic Calculations**: Speed/power values vary slightly per impact (seeded randomization) to appear more calculated
- **Delayed AI Summary**: AI summary waits 1.5 seconds for page to fully load before streaming
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
- Custom email/password authentication with secure password hashing
- Session-based auth with cookie management
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
- `POST /api/auth/register` - Register new user with email/password
- `POST /api/auth/login` - Login with email/password
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
- `STRIPE_SECRET_KEY` - Stripe secret API key (sk_live_*)
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable API key (pk_live_*)

## Running
The application runs on port 5000 using:
```
python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000 --reload
```
