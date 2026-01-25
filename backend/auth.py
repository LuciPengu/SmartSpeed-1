import os
import secrets
import hashlib
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

sessions: Dict[str, Dict[str, Any]] = {}

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

def create_session(user_data: Dict[str, Any]) -> str:
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        'user': user_data,
        'expires_at': datetime.now() + timedelta(days=7),
        'created_at': datetime.now()
    }
    return session_id

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    session = sessions.get(session_id)
    if session:
        if session.get('expires_at', datetime.min) > datetime.now():
            return session
        else:
            del sessions[session_id]
    return None

def get_user_from_session(session_id: str) -> Optional[Dict[str, Any]]:
    session = get_session(session_id)
    if session:
        return session.get('user')
    return None

def delete_session(session_id: str) -> bool:
    if session_id in sessions:
        del sessions[session_id]
        return True
    return False
