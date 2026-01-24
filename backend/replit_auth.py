import os
import secrets
import hashlib
import base64
import httpx
import jwt
from typing import Optional, Dict, Any
from urllib.parse import urlencode
from datetime import datetime, timedelta

REPL_ID = os.environ.get('REPL_ID', '')
ISSUER_URL = os.environ.get('ISSUER_URL', 'https://replit.com/oidc')
SESSION_SECRET = os.environ.get('SESSION_SECRET', secrets.token_hex(32))

sessions: Dict[str, Dict[str, Any]] = {}

def generate_pkce_pair():
    code_verifier = secrets.token_urlsafe(64)[:128]
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip('=')
    return code_verifier, code_challenge

def get_auth_url(redirect_uri: str, state: str) -> tuple[str, str]:
    code_verifier, code_challenge = generate_pkce_pair()
    
    params = {
        'client_id': REPL_ID,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': 'openid profile email offline_access',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
        'prompt': 'login consent'
    }
    
    auth_url = f"{ISSUER_URL}/auth?{urlencode(params)}"
    return auth_url, code_verifier

async def exchange_code_for_token(code: str, redirect_uri: str, code_verifier: str) -> Optional[Dict[str, Any]]:
    token_url = f"{ISSUER_URL}/token"
    
    data = {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirect_uri,
        'client_id': REPL_ID,
        'code_verifier': code_verifier
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Token exchange failed: {response.text}")
            return None

def decode_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    try:
        claims = jwt.decode(id_token, options={"verify_signature": False})
        return claims
    except Exception as e:
        print(f"Failed to decode ID token: {e}")
        return None

def create_session(user_claims: Dict[str, Any], tokens: Dict[str, Any]) -> str:
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {
        'user': {
            'id': user_claims.get('sub'),
            'email': user_claims.get('email'),
            'first_name': user_claims.get('first_name'),
            'last_name': user_claims.get('last_name'),
            'profile_image_url': user_claims.get('profile_image_url')
        },
        'access_token': tokens.get('access_token'),
        'refresh_token': tokens.get('refresh_token'),
        'expires_at': datetime.now() + timedelta(seconds=tokens.get('expires_in', 3600)),
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

def get_logout_url(post_logout_redirect_uri: str) -> str:
    params = {
        'client_id': REPL_ID,
        'post_logout_redirect_uri': post_logout_redirect_uri
    }
    return f"{ISSUER_URL}/session/end?{urlencode(params)}"

auth_states: Dict[str, Dict[str, str]] = {}

def store_auth_state(state: str, code_verifier: str, redirect_uri: str):
    auth_states[state] = {
        'code_verifier': code_verifier,
        'redirect_uri': redirect_uri,
        'created_at': datetime.now().isoformat()
    }

def get_auth_state(state: str) -> Optional[Dict[str, str]]:
    return auth_states.pop(state, None)
