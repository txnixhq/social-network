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
    token = ctx["token"]

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles?id=neq.{current_id}&select=id,display_name,bio",
            headers=auth_headers(token),
        )

    if r.status_code != 200:
        return {"data": None, "error": r.text}
    return {"data": r.json(), "error": None}


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

class CreatePostRequest(BaseModel):
    content: str


@app.post("/posts")
async def create_post(body: CreatePostRequest, authorization: str = Header(None)):
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/posts",
            headers={**auth_headers(token), "Prefer": "return=representation"},
            json={"user_id": user_id, "content": body.content},
        )

    if r.status_code not in (200, 201):
        return {"data": None, "error": r.text}
    data = r.json()
    return {"data": data[0] if data else {}, "error": None}


@app.delete("/posts/{post_id}")
async def delete_post(post_id: str, authorization: str = Header(None)):
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SUPABASE_URL}/rest/v1/posts?id=eq.{post_id}&user_id=eq.{user_id}",
            headers=auth_headers(token),
        )

    if r.status_code not in (200, 204):
        return {"data": None, "error": r.text}
    return {"data": {"deleted": True}, "error": None}


# ---------------------------------------------------------------------------
# Feed
# ---------------------------------------------------------------------------

@app.get("/feed")
async def get_feed(authorization: str = Header(None)):
    # Auth is optional — liked_by_me requires it
    current_id = None
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        async with httpx.AsyncClient() as client:
            ur = await client.get(f"{SUPABASE_URL}/auth/v1/user", headers=auth_headers(token))
        if ur.status_code == 200:
            current_id = ur.json().get("id")

    h = auth_headers(token) if token else anon_headers()

    # Determine which posts to show based on follows
    following_ids: list[str] = []
    if current_id:
        async with httpx.AsyncClient() as client:
            follows_r = await client.get(
                f"{SUPABASE_URL}/rest/v1/follows?follower_id=eq.{current_id}&select=following_id",
                headers=h,
            )
        if follows_r.status_code == 200:
            following_ids = [f["following_id"] for f in follows_r.json()]

    discovery_mode = len(following_ids) == 0
    posts_filter = "" if discovery_mode else f"&user_id=in.({','.join(following_ids)})"

    async with httpx.AsyncClient() as client:
        posts_r, likes_r, profiles_r = await asyncio.gather(
            client.get(
                f"{SUPABASE_URL}/rest/v1/posts"
                f"?select=id,content,created_at,user_id"
                f"{posts_filter}"
                f"&order=created_at.desc",
                headers=h,
            ),
            client.get(
                f"{SUPABASE_URL}/rest/v1/likes?select=post_id,user_id",
                headers=h,
            ),
            client.get(
                f"{SUPABASE_URL}/rest/v1/profiles?select=id,display_name",
                headers=h,
            ),
        )

    if posts_r.status_code != 200:
        return {"data": None, "error": posts_r.text}

    posts = posts_r.json()
    likes = likes_r.json() if likes_r.status_code == 200 else []
    profiles = profiles_r.json() if profiles_r.status_code == 200 else []

    profile_map: dict[str, str] = {p["id"]: p["display_name"] for p in profiles}

    like_counts: dict[str, int] = {}
    liked_by_me: set[str] = set()
    for like in likes:
        pid = like["post_id"]
        like_counts[pid] = like_counts.get(pid, 0) + 1
        if current_id and like["user_id"] == current_id:
            liked_by_me.add(pid)

    for post in posts:
        pid = post["id"]
        post["like_count"] = like_counts.get(pid, 0)
        post["liked_by_me"] = pid in liked_by_me
        post["display_name"] = profile_map.get(post["user_id"], "Unknown")

    return {"data": {"posts": posts, "discovery_mode": discovery_mode}, "error": None}


# ---------------------------------------------------------------------------
# Likes
# ---------------------------------------------------------------------------

@app.post("/likes/{post_id}")
async def toggle_like(post_id: str, authorization: str = Header(None)):
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    async with httpx.AsyncClient() as client:
        # Check if like already exists
        check = await client.get(
            f"{SUPABASE_URL}/rest/v1/likes?user_id=eq.{user_id}&post_id=eq.{post_id}&select=user_id",
            headers=auth_headers(token),
        )
        existing = check.json() if check.status_code == 200 else []

        if existing:
            r = await client.delete(
                f"{SUPABASE_URL}/rest/v1/likes?user_id=eq.{user_id}&post_id=eq.{post_id}",
                headers=auth_headers(token),
            )
            liked = False
        else:
            r = await client.post(
                f"{SUPABASE_URL}/rest/v1/likes",
                headers={**auth_headers(token), "Prefer": "return=representation"},
                json={"user_id": user_id, "post_id": post_id},
            )
            liked = True

    if r.status_code not in (200, 201, 204):
        return {"data": None, "error": r.text}
    return {"data": {"liked": liked}, "error": None}


# ---------------------------------------------------------------------------
# Follows
# ---------------------------------------------------------------------------

@app.get("/follows")
async def get_follows(authorization: str = Header(None)):
    """Returns the list of user_ids the current user is following."""
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/follows?follower_id=eq.{user_id}&select=following_id",
            headers=auth_headers(token),
        )

    if r.status_code != 200:
        return {"data": None, "error": r.text}
    following_ids = [f["following_id"] for f in r.json()]
    return {"data": following_ids, "error": None}


@app.post("/follow/{target_id}")
async def follow_user(target_id: str, authorization: str = Header(None)):
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    if user_id == target_id:
        return {"data": None, "error": "Cannot follow yourself"}

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{SUPABASE_URL}/rest/v1/follows",
            headers={**auth_headers(token), "Prefer": "return=representation"},
            json={"follower_id": user_id, "following_id": target_id},
        )

    if r.status_code not in (200, 201):
        return {"data": None, "error": r.text}
    return {"data": {"following": True}, "error": None}


@app.delete("/follow/{target_id}")
async def unfollow_user(target_id: str, authorization: str = Header(None)):
    ctx = await get_current_user(authorization)
    user_id = ctx["user"]["id"]
    token = ctx["token"]

    async with httpx.AsyncClient() as client:
        r = await client.delete(
            f"{SUPABASE_URL}/rest/v1/follows?follower_id=eq.{user_id}&following_id=eq.{target_id}",
            headers=auth_headers(token),
        )

    if r.status_code not in (200, 204):
        return {"data": None, "error": r.text}
    return {"data": {"following": False}, "error": None}
