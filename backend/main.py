import asyncio
import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://social-network-production-d62b.up.railway.app",
        "https://ravishing-peace-production-10af.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def anon_headers() -> dict:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }


def auth_headers(token: str) -> dict:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


async def get_current_user(authorization: str) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1]
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=auth_headers(token),
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"user": r.json(), "token": token}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"data": {"status": "ok"}, "error": None}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/signup")
async def signup(body: SignupRequest):
    async with httpx.AsyncClient() as client:
        # Create Supabase Auth user
        r = await client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers=anon_headers(),
            json={"email": body.email, "password": body.password},
        )
        if r.status_code not in (200, 201):
            return {"data": None, "error": r.json().get("msg") or r.text}

        auth_data = r.json()
        user_id = auth_data.get("user", {}).get("id") or auth_data.get("id")
        token = (auth_data.get("session") or {}).get("access_token") or auth_data.get("access_token")

        if not user_id:
            return {"data": None, "error": "Signup failed — no user id returned"}

        # Insert profile row using the user's own token so RLS passes
        profile_headers = auth_headers(token) if token else anon_headers()
        pr = await client.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers={**profile_headers, "Prefer": "return=representation"},
            json={"id": user_id, "display_name": body.display_name, "bio": ""},
        )

    return {"data": {"user": auth_data, "profile_created": pr.status_code in (200, 201)}, "error": None}


@app.post("/auth/login")
async def login(body: LoginRequest):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=anon_headers(),
            json={"email": body.email, "password": body.password},
        )
    if r.status_code != 200:
        return {"data": None, "error": r.json().get("error_description") or r.text}
    return {"data": r.json(), "error": None}


# ---------------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------------

@app.get("/profile/{user_id}")
async def get_profile(user_id: str):
    async with httpx.AsyncClient() as client:
        profile_r, posts_r, followers_r, following_r = await _fetch_profile_stats(client, user_id)

    if profile_r.status_code != 200 or not profile_r.json():
        return {"data": None, "error": "Profile not found"}

    profile = profile_r.json()[0]
    profile["post_count"] = int(posts_r.headers.get("content-range", "0/0").split("/")[-1] or 0)
    profile["follower_count"] = int(followers_r.headers.get("content-range", "0/0").split("/")[-1] or 0)
    profile["following_count"] = int(following_r.headers.get("content-range", "0/0").split("/")[-1] or 0)

    return {"data": profile, "error": None}


async def _fetch_profile_stats(client: httpx.AsyncClient, user_id: str):
    h = {**anon_headers(), "Prefer": "count=exact", "Range": "0-0"}
    return await asyncio.gather(
        client.get(f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=*", headers=anon_headers()),
        client.get(f"{SUPABASE_URL}/rest/v1/posts?user_id=eq.{user_id}&select=id", headers=h),
        client.get(f"{SUPABASE_URL}/rest/v1/follows?following_id=eq.{user_id}&select=follower_id", headers=h),
        client.get(f"{SUPABASE_URL}/rest/v1/follows?follower_id=eq.{user_id}&select=following_id", headers=h),
    )


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    bio: str | None = None


@app.patch("/profile")
async def update_profile(
    body: UpdateProfileRequest,
    authorization: str = Header(None),
):
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    patch = {k: v for k, v in body.model_dump().items() if v is not None}
    if not patch:
        return {"data": None, "error": "Nothing to update"}

    async with httpx.AsyncClient() as client:
        r = await client.patch(
            f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
            headers={**auth_headers(token), "Prefer": "return=representation"},
            json=patch,
        )

    if r.status_code not in (200, 204):
        return {"data": None, "error": r.text}
    data = r.json()
    return {"data": data[0] if data else {}, "error": None}


# ---------------------------------------------------------------------------
# User discovery
# ---------------------------------------------------------------------------

@app.get("/users")
async def list_users(authorization: str = Header(None)):
    ctx = await get_current_user(authorization)
    current_id = ctx["user"]["id"]

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=neq.{current_id}&select=id,display_name,bio",
            headers=anon_headers(),
        )

    if r.status_code != 200:
        return {"data": None, "error": r.text}
    return {"data": r.json(), "error": None}


