import os
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Text, ForeignKey, JSON, Boolean
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from datetime import datetime

DATABASE_URL = os.environ.get("DATABASE_URL")

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=True)
    password_salt = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, default='none')
    trial_ends_at = Column(DateTime, nullable=True)
    
    course_purchased = Column(Boolean, default=False)
    course_purchased_at = Column(DateTime, nullable=True)
    free_month_granted = Column(Boolean, default=False)
    free_month_ends_at = Column(DateTime, nullable=True)
    
    injury_sessions = relationship("InjurySession", back_populates="user", cascade="all, delete-orphan")

class InjurySession(Base):
    __tablename__ = 'injury_sessions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    session_id = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.now)
    
    fighter1_skill = Column(String, default='professional')
    fighter1_weight = Column(Float, default=75.0)
    fighter2_skill = Column(String, default='professional')
    fighter2_weight = Column(Float, default=75.0)
    
    overall_risk = Column(String, nullable=True)
    risk_percentage = Column(Float, nullable=True)
    total_force = Column(Float, nullable=True)
    impact_count = Column(Integer, default=0)
    
    ai_summary = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    
    assessment_result = Column(JSON, nullable=True)
    
    user = relationship("User", back_populates="injury_sessions")
    impacts = relationship("ImpactRecord", back_populates="session", cascade="all, delete-orphan")

class ImpactRecord(Base):
    __tablename__ = 'impact_records'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey('injury_sessions.id'), nullable=False)
    
    frame = Column(Integer)
    time = Column(Float)
    hand = Column(String)
    fighter = Column(Integer)
    
    speed_min = Column(Float)
    speed_max = Column(Float)
    power_min = Column(Float)
    power_max = Column(Float)
    motion_intensity = Column(Float)
    
    risk_level = Column(String)
    injury_probability = Column(Float)
    g_force = Column(Float)
    
    session = relationship("InjurySession", back_populates="impacts")

class OAuthSession(Base):
    __tablename__ = 'oauth_sessions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    
    user = relationship("User")

engine = None
SessionLocal = None

def init_db():
    global engine, SessionLocal
    if DATABASE_URL:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
        return True
    return False

def get_db():
    if SessionLocal is None:
        init_db()
    if SessionLocal:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    else:
        yield None
