import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import get_settings

_hasher = PasswordHasher()
ALGO = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(user_id: str, role: str) -> str:
    s = get_settings()
    exp = datetime.now(UTC) + timedelta(minutes=s.jwt_access_ttl_min)
    return jwt.encode({"sub": user_id, "role": role, "exp": exp, "typ": "access"}, s.jwt_secret, algorithm=ALGO)


def decode_access_token(token: str) -> dict[str, str] | None:
    try:
        data = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None
    return data if data.get("typ") == "access" else None


def new_refresh_token() -> tuple[str, str, datetime]:
    """Kembalikan (token mentah, hash, waktu kedaluwarsa). Hanya hash yang disimpan."""
    raw = secrets.token_urlsafe(48)
    exp = datetime.now(UTC) + timedelta(days=get_settings().jwt_refresh_ttl_days)
    return raw, hash_token(raw), exp


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def random_code(length: int, alphabet: str) -> str:
    return "".join(secrets.choice(alphabet) for _ in range(length))
