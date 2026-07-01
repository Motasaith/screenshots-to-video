# 🐳 Dockerizing & Deploying AI Video Studio on Another Laptop

This guide walks you through **building the Docker image**, **running the full
stack locally**, and **deploying it on a completely different laptop** so it
works exactly like it does on your machine.

---

## 0. What gets containerized

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `app` | Built from `Dockerfile` | 3000 → 3000 | Vite frontend + Hono API + render worker |

The **database is your existing remote/cloud MySQL** — just set
`DATABASE_URL` in `.env.docker` and the app connects to it directly.
No local DB container is needed.

Everything runs inside Docker — **no Node.js or ffmpeg install
required on the target laptop.**

---

## 1. Prerequisites (on BOTH laptops)

Install **Docker Desktop**:

- **Windows / Mac:** <https://www.docker.com/products/docker-desktop>
- **Linux:** <https://docs.docker.com/engine/install/>

Verify it works:

```bash
docker --version
docker compose version
```

> On Windows, make sure Docker Desktop's **WSL 2 backend** is enabled
> (Settings → General → "Use the WSL 2 based engine").

---

## 2. Prepare your environment file

A template is provided at `.env.docker`. Fill in the real values for
your API keys, OAuth credentials, and **your remote database URL**.

```bash
# On your dev laptop, edit the template
cp .env.docker .env          # or just edit .env.docker directly
```

Key things to fill in:

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | Your remote/cloud MySQL connection string |
| `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same place as above |
| `APP_ID` / `APP_SECRET` | Your app's internal credentials (any random string works for local) |
| `R2_*` | Cloudflare R2 dashboard |
| `LLM_API_KEY` | <https://ollama.com/settings/keys> |
| `ELEVENLABS_API_KEY` | <https://elevenlabs.io> |
| `PEXELS_API_KEY` | <https://www.pexels.com/api/> |

### ⚠️ Google OAuth redirect URI

In Google Cloud Console, add **both** of these to your OAuth client's
"Authorized redirect URIs":

```
http://localhost:3000/api/oauth/callback
http://<TARGET_LAPTOP_IP>:3000/api/oauth/callback
```

Find the target laptop's IP with `ipconfig` (Windows) or `ifconfig`
(Linux/Mac). Example: `http://192.168.1.50:3000/api/oauth/callback`.

---

## 3. Build & run on YOUR laptop (verify it works)

From the project root:

```bash
# Build and start everything (first run takes ~3-5 min)
docker compose up --build
```

You'll see logs like:

```
db       | ... ready for connections
app      | Server running on http://localhost:3000/
```

Open <http://localhost:3000> — the app should work exactly like `npm run dev`.

### Apply database schema (one-time, if not already done)

If your remote database is empty, push the Drizzle schema:

```bash
# In a second terminal, while `docker compose up` is running:
docker compose exec app npx drizzle-kit push
```

> `drizzle-kit` is a devDependency, so it's available inside the container.
> If it's missing, run `docker compose exec app npm i drizzle-kit && npx drizzle-kit push`.
>
> If your remote DB already has the schema (you've been using it in dev),
> skip this step.

---

## 4. Deploy on ANOTHER laptop

You have **two options** — pick whichever is easier.

---

### Option A — Copy the source & build on the target laptop (recommended)

This is the simplest and most reliable approach.

#### Step 1: Install Docker Desktop on the target laptop
(See Section 1 above.)

#### Step 2: Copy the project folder

Copy the **entire project folder** to the target laptop via:
- USB drive / external SSD
- Network share (`\\your-laptop\shared-folder`)
- `scp` / `rsync`
- Zip + cloud storage

> **Do NOT copy `node_modules` or `dist`** — they'll be rebuilt inside Docker.
> The `.dockerignore` file already excludes them.

#### Step 3: Fill in `.env.docker` on the target laptop

Use the same values as your dev laptop (or create new API keys if you prefer).
Make sure the Google OAuth redirect URI includes the target laptop's IP
(see Section 2).

#### Step 4: Build & run

```bash
cd ai_video_05
docker compose up --build
```

#### Step 5: Apply database schema (skip if your remote DB is already set up)

```bash
docker compose exec app npx drizzle-kit push
```

#### Step 6: Access the app

- **On the target laptop:** <http://localhost:3000>
- **From another device on the same network:** `http://<target-laptop-ip>:3000>`

---

### Option B — Build the image once, export it, load on the target

Use this if the target laptop is slow and you don't want to rebuild.

#### Step 1: Build & save the image (on your dev laptop)

```bash
# Build the image
docker compose build

# Save it to a .tar file (~1-2 GB)
docker save ai_video_05-app -o aivideo-app.tar
```

#### Step 2: Copy to the target laptop

Copy these files via USB / network:
- `aivideo-app.tar`
- The **entire project folder** (minus `node_modules` and `dist`)
- `.env.docker` (with filled-in values)

#### Step 3: Load the image on the target laptop

```bash
docker load -i aivideo-app.tar
```

#### Step 4: Run

```bash
cd ai_video_05
# Uses the pre-built image (no --build needed)
docker compose up
```

#### Step 5: Apply database schema (skip if your remote DB is already set up)

```bash
docker compose exec app npx drizzle-kit push
```

---

## 5. Useful commands

```bash
# Start in background (detached)
docker compose up -d

# View live logs
docker compose logs -f app

# Stop everything (keeps data)
docker compose down

# Stop & DELETE all data (fresh start)
docker compose down -v

# Rebuild after code changes
docker compose up --build

# Run a one-off command inside the app container
docker compose exec app sh

# Apply DB schema changes
docker compose exec app npx drizzle-kit push
```

---

## 6. Troubleshooting

### "Missing required environment variable: APP_ID"
→ `.env.docker` is missing values. Every variable listed in `.env.docker`
must be set (even with a dummy value for local testing).

### Google OAuth login fails / redirect error
→ The redirect URI isn't in Google Cloud Console. Add
`http://<target-ip>:3000/api/oauth/callback` to the authorized redirect URIs.

### Port 3000 already in use
→ Change the host port in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"   # access at http://localhost:3001
```

### Kokoro TTS model download fails on first use
→ The model (~80 MB) downloads from HuggingFace on first TTS request.
Make sure the target laptop has internet access. The download is cached
in the `kokoro_cache` Docker volume so it only happens once.

### ffmpeg errors during video rendering
→ The Dockerfile installs system `ffmpeg` AND bundles `ffmpeg-static`.
If you see "font not found" errors, the `fonts-dejavu-core` and
`fonts-liberation` packages in the Dockerfile should cover it. For
custom fonts, add them to `api/lib/fonts/` and rebuild.

### `drizzle-kit push` fails to connect
→ Check that your remote `DATABASE_URL` in `.env.docker` is correct and
reachable from inside the container:
```bash
docker compose exec app sh
curl -v telnet://your-remote-host:3306   # test connectivity
```

---

## 7. File summary

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: deps → build → slim runtime with ffmpeg |
| `docker-compose.yml` | Runs the app container; app connects to your remote DB via `DATABASE_URL` |
| `.env.docker` | All environment variables (secrets, API keys, remote DB URL) |
| `.dockerignore` | Excludes node_modules, dist, .env, etc. from the build context |
| `DEPLOYMENT_GUIDE.md` | This file |