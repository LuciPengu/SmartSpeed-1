# Hitsmart Strike Calculator

## Overview
An AI-powered combat sports safety platform built as a React SPA with FastAPI backend. Analyzes sparring footage using client-side MediaPipe to detect punch impacts, assess brain injury risk, and provide SCAT5-based concussion screening. Includes educational concussion science course and sparring session tracker.

## Architecture
- **Frontend**: React SPA with Vite, React Router, dark theme with emerald green (#10b981) accents
- **Video Analysis**: Client-side MediaPipe JavaScript (PoseLandmarker) - runs entirely in browser
- **Backend**: FastAPI (Python) for auth, Stripe payments, AI summaries, session storage
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Payments**: Stripe subscription ($9.99/mo) + one-time course purchase ($29.99)
- **Deployment**: Vite builds to `client/dist/`, FastAPI serves the built app in production

## Project Structure
```
├── client/                        # React SPA (Vite)
│   ├── src/
│   │   ├── App.jsx               # Root with React Router
│   │   ├── main.jsx              # Entry point
│   │   ├── pages/
│   │   │   ├── CalculatorPage.jsx    # Strike Calculator with MediaPipe
│   │   │   ├── ArticlesPage.jsx      # Free educational articles
│   │   │   ├── CoursePage.jsx        # 9-lesson concussion course (paywall)
│   │   │   └── SparringPage.jsx      # Sparring session tracker
│   │   ├── components/
│   │   │   ├── Layout.jsx            # App shell with sidebar navigation
│   │   │   ├── AuthModal.jsx         # Login/register modal
│   │   │   ├── OnboardingModal.jsx   # Multi-step onboarding flow
│   │   │   ├── SubscriptionModal.jsx # Stripe subscription prompt
│   │   │   └── ShareCard.jsx         # Social media punch card generator
│   │   ├── hooks/
│   │   │   └── useMediaPipe.js       # MediaPipe PoseLandmarker hook
│   │   ├── utils/
│   │   │   ├── api.js                # Backend API client
│   │   │   ├── riskCalculator.js     # Brain injury risk calculations
│   │   │   ├── forceCalculator.js    # Punch force estimation
│   │   │   └── concussionAssessment.js  # SCAT5 assessment data
│   │   └── context/
│   │       ├── AuthContext.jsx       # Auth state management
│   │       └── ToastContext.jsx      # Toast notification system
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── main.py              # FastAPI server (API + React serving)
│   ├── database.py          # PostgreSQL models (User, InjurySession, ImpactRecord)
│   ├── auth.py              # Email/password auth with session management
│   ├── ai_summary.py        # GPT-4o streaming AI summary via Replicate
│   ├── risk_calculator.py   # Server-side risk calculation
│   ├── concussion_assessment.py  # SCAT5 protocol data
│   └── video_analyzer.py    # Legacy server-side video processing
├── static/                   # Backend static assets
└── replit.md
```

## Features
1. **Strike Calculator**: Upload sparring video, client-side MediaPipe detects punches, estimates force/speed based on fighter skill/weight
2. **Fighter Configuration**: Skill level (Beginner/Amateur/Professional/Elite), weight, throwing intensity
3. **Optional SCAT5 Screener**: Users can skip concussion assessment and just see punch forces
4. **Shareable Punch Cards**: Canvas-based social media cards with download/share
5. **Free Articles**: 5 educational articles on brain health (no paywall)
6. **Concussion Science Course**: 9-lesson course ($29.99 one-time, includes 1 month free subscription)
7. **Sparring Tracker**: Log and track sparring sessions over time
8. **AI Summary**: Streaming GPT-4o analysis of impacts with follow-up chat
9. **Auth & History**: Email/password login, session history in PostgreSQL
10. **Stripe Integration**: $9.99/mo subscription for video analysis, $29.99 course purchase

## UI Theme
- Dark background with glassmorphism panels
- Emerald green accents (#10b981)
- Montserrat font
- Multi-step onboarding shows free features first (Sparring Tracker, Articles) before paid

## Development
- **Workflow**: Backend runs on port 5001, Vite dev server on port 5000 with proxy to backend
- **Command**: `BACKEND_PORT=5001 python -m uvicorn backend.main:app --host 0.0.0.0 --port 5001 --reload & cd client && npm run dev`

## Production Deployment
- **Build**: `cd client && npm install && npm run build`
- **Run**: `BACKEND_PORT=5000 python -m uvicorn backend.main:app --host 0.0.0.0 --port 5000`
- FastAPI serves React dist files and handles API routes
- Deployment target: autoscale

## API Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/user` - Get current user
- `GET /api/auth/logout` - Logout
- `POST /api/calculate-risk` - Calculate brain injury risk
- `GET /api/concussion-assessment` - Get SCAT5 questions
- `POST /api/concussion-assessment/evaluate` - Evaluate assessment
- `POST /api/ai-summary/stream` - Stream AI analysis (SSE)
- `POST /api/sessions/save` - Save session to history
- `GET /api/sessions/{user_id}` - Get user's history
- `POST /api/create-subscription` - Create Stripe subscription
- `POST /api/create-course-checkout` - Create course purchase session
- `POST /api/stripe-webhook` - Stripe webhook handler
- `GET /api/subscription-status` - Check subscription status

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `REPLICATE_API_TOKEN` - API key for GPT-4o summaries
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Recent Changes (February 2026)
- **React SPA Conversion**: Rebuilt entire frontend as React app with Vite
- **Client-side MediaPipe**: Video analysis now runs in browser (no server upload)
- **Onboarding Reorder**: Free features shown first to improve conversion
- **Optional SCAT5**: Concussion screener is skippable at every step
- **Social Punch Cards**: Canvas-based shareable impact summaries
- **Production Static Serving**: FastAPI catch-all serves all dist files including favicons
