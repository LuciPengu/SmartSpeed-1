import os
import secrets
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(32)
    password_hash = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return password_hash, salt

def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    computed_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(computed_hash, stored_hash)

def create_session(db, user_data: Dict[str, Any]) -> str:
    from backend.database import OAuthSession
    
    session_id = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(days=7)
    
    oauth_session = OAuthSession(
        session_id=session_id,
        user_id=user_data['id'],
        expires_at=expires_at,
        created_at=datetime.now()
    )
    db.add(oauth_session)
    db.commit()
    
    return session_id

def get_session(db, session_id: str) -> Optional[Dict[str, Any]]:
    from backend.database import OAuthSession, User
    
    if not db or not session_id:
        return None
    
    try:
        oauth_session = db.query(OAuthSession).filter(
            OAuthSession.session_id == session_id
        ).first()
        
        if oauth_session:
            if oauth_session.expires_at and oauth_session.expires_at > datetime.now():
                user = db.query(User).filter(User.id == oauth_session.user_id).first()
                if user:
                    return {
                        'user': {
                            'id': user.id,
                            'email': user.email,
                            'first_name': user.first_name,
                            'last_name': user.last_name,
                            'profile_image_url': user.profile_image_url
                        },
                        'expires_at': oauth_session.expires_at
                    }
            else:
                db.delete(oauth_session)
                db.commit()
    except Exception as e:
        print(f"Error getting session: {e}")
    
    return None

def get_user_from_session(db, session_id: str) -> Optional[Dict[str, Any]]:
    session = get_session(db, session_id)
    if session:
        return session.get('user')
    return None

def delete_session(db, session_id: str) -> bool:
    from backend.database import OAuthSession
    
    if not db or not session_id:
        return False
    
    try:
        result = db.query(OAuthSession).filter(
            OAuthSession.session_id == session_id
        ).delete()
        db.commit()
        return result > 0
    except Exception as e:
        print(f"Error deleting session: {e}")
        return False
