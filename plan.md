# Build Plan — Social Network MVP

## Phase 1: Skeleton + Deploy (target: 20 min)
- [ ] FastAPI /health route
- [ ] React placeholder "Social" homepage  
- [ ] Supabase project created, .env set
- [ ] .gitignore covers .env, node_modules, __pycache__
- [ ] Deployed to Railway — live URL exists
- [ ] vite.config.js allowedHosts set

## Phase 2: Auth + Profiles (target: 30 min)
- [ ] Supabase tables: profiles, posts, follows, likes
- [ ] POST /auth/signup — creates user + profile row
- [ ] POST /auth/login — returns token
- [ ] GET /profile/{user_id} — public profile view
- [ ] PATCH /profile — update own bio/display name
- [ ] Frontend: signup/login form, profile page

## Phase 3: Posts + Feed (target: 25 min)
- [ ] POST /posts — create post (auth required)
- [ ] GET /feed — all posts from all users, newest first
- [ ] DELETE /posts/{id} — delete own post
- [ ] Frontend: post composer, feed of cards, delete own posts
- [ ] Each post shows author name, content, timestamp

## Phase 4: Follows + Likes (target: 15 min)
- [ ] POST /follow/{user_id} — follow a user
- [ ] DELETE /follow/{user_id} — unfollow
- [ ] GET /feed switches to followed users only if following anyone
- [ ] POST /likes/{post_id} — toggle like
- [ ] Show like count on each post

## Phase 5: Polish (remaining time)
- [ ] Loading states
- [ ] Empty states ("No posts yet", "Follow someone to see their posts")
- [ ] Click username to view their profile
- [ ] Show follower/following counts on profile

## Deferred
- Comments (add if Phase 4 finishes early)
- Avatar image upload
- Notifications
- Search users

## Supabase tables
profiles: id (references auth.users), display_name, bio, created_at
posts: id, user_id, content, created_at
follows: follower_id, following_id, created_at (composite PK)
likes: user_id, post_id, created_at (composite PK)

## RLS
profiles: anyone can read, owner can update
posts: anyone can read, owner can insert/delete
follows: authenticated users manage their own
likes: authenticated users manage their own