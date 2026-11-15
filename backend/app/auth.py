"""Small SQLite + signed-token login (standard library only)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
TOKEN_TTL = 60 * 60 * 24 * 7  # 7 days


class AuthError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


class AuthStore:
    def __init__(self, db_path: Path, secret: str = ""):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self.secret = (secret or self._persisted_secret(db_path.parent)).encode()
        with self._db() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS users (
                email TEXT PRIMARY KEY, name TEXT NOT NULL,
                salt BLOB NOT NULL, hash BLOB NOT NULL, created REAL NOT NULL)""")

    @staticmethod
    def _persisted_secret(folder: Path) -> str:
        """No FF_SECRET set: create one once and keep it, so tokens survive restarts."""
        p = folder / ".secret"
        if not p.exists():
            p.write_text(secrets.token_hex(32))
        return p.read_text().strip()

    def _db(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path)

    @staticmethod
    def _hash(password: str, salt: bytes) -> bytes:
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)

    def _token(self, email: str) -> str:
        payload = base64.urlsafe_b64encode(json.dumps({"e": email, "x": int(time.time()) + TOKEN_TTL}).encode())
        sig = base64.urlsafe_b64encode(hmac.new(self.secret, payload, hashlib.sha256).digest())
        return f"{payload.decode()}.{sig.decode()}"

    def verify(self, token: str) -> dict:
        try:
            payload, sig = token.split(".")
            good = base64.urlsafe_b64encode(hmac.new(self.secret, payload.encode(), hashlib.sha256).digest()).decode()
            if not hmac.compare_digest(sig, good):
                raise ValueError
            data = json.loads(base64.urlsafe_b64decode(payload))
            if data["x"] < time.time():
                raise ValueError
        except Exception:
            raise AuthError("Please log in again.", 401)
        with self._db() as db:
            row = db.execute("SELECT name, email FROM users WHERE email=?", (data["e"],)).fetchone()
        if not row:
            raise AuthError("Please log in again.", 401)
        return {"name": row[0], "email": row[1]}

    def signup(self, name: str, email: str, password: str) -> dict:
        name, email = name.strip(), email.strip().lower()
        if len(name) < 2:
            raise AuthError("Please enter your name (at least 2 characters).")
        if not EMAIL_RE.match(email):
            raise AuthError("Enter a valid email like name@example.com.")
        if len(password) < 8:
            raise AuthError("Password must be at least 8 characters.")
        salt = os.urandom(16)
        try:
            with self._db() as db:
                db.execute("INSERT INTO users VALUES (?,?,?,?,?)",
                           (email, name, salt, self._hash(password, salt), time.time()))
        except sqlite3.IntegrityError:
            raise AuthError("An account with this email already exists. Try logging in.", 409)
        return {"token": self._token(email), "user": {"name": name, "email": email}}

    def login(self, email: str, password: str) -> dict:
        email = email.strip().lower()
        with self._db() as db:
            row = db.execute("SELECT name, salt, hash FROM users WHERE email=?", (email,)).fetchone()
        if not row or not hmac.compare_digest(row[2], self._hash(password, row[1])):
            raise AuthError("Incorrect email or password.", 401)
        return {"token": self._token(email), "user": {"name": row[0], "email": email}}
