import jwt
import os
import json
import secrets
from datetime import datetime, timedelta, timezone

# Génère une clé aléatoire sécurisée (64 caractères hexadécimaux = 256 bits)
JWT_SECRET = secrets.token_hex(32)
JWT_ALGO = "HS256"
ACCESS_TTL = timedelta(minutes=30)
USED_TOKENS_FILE = "used_tokens.json"

# Tokens JWT déjà utilisés (persistés dans un fichier)
if os.path.exists(USED_TOKENS_FILE):
    with open(USED_TOKENS_FILE, "r") as f:
        USED_TOKENS = set(json.load(f))
else:
    USED_TOKENS = set()


def make_token(username: str) -> str:
    """Génère un token JWT pour un utilisateur donné"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "iat": int(now.timestamp()),
        "exp": int((now + ACCESS_TTL).timestamp())
    }
    print(f"[DEBUG] Génération du token pour {username} : {payload}")
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def verify_token(req):
    """Vérifie la validité d'un token dans une requête Flask"""
    auth = req.headers.get("Authorization", "")
    print(f"[DEBUG] Header Authorization reçu : {auth}")
    if not auth.startswith("Bearer "):
        print("[DEBUG] Pas de Bearer dans l'en-tête Authorization")
        return None, None

    token = auth.split(" ", 1)[1].strip()

    if token in USED_TOKENS:
        print("[DEBUG] Token déjà utilisé")
        return None, token

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        print(f"[DEBUG] Token décodé avec succès : {payload}")
        return payload, token
    except jwt.ExpiredSignatureError:
        print("[DEBUG] Token expiré")
        return None, token
    except jwt.InvalidTokenError:
        print("[DEBUG] Token invalide")
        return None, token


def mark_token_as_used(token: str):
    """Ajoute un token à la liste des tokens déjà utilisés et le sauvegarde"""
    USED_TOKENS.add(token)
    save_used_tokens()


def save_used_tokens():
    with open(USED_TOKENS_FILE, "w") as f:
        json.dump(list(USED_TOKENS), f)
