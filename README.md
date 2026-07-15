# 🎥 Connect: AI-Enhanced Video Conferencing Platform

[![CI/CD Pipeline](https://github.com/ashwathjelloji2468-gif/AI-enhanced-zoom-/actions/workflows/ci.yml/badge.svg)](https://github.com/ashwathjelloji2468-gif/AI-enhanced-zoom-/actions/workflows/ci.yml)

Connect is a high-fidelity, premium video conferencing platform built to mirror the seamless experience of Zoom, augmented with real-time AI summaries, secure peer signaling, and interactive social streams. 

The application is structured as a modern, decoupled monorepo leveraging Next.js for high-performance frontend interfaces and Express/Socket.io for synchronized WebRTC state orchestration.

---

## 🚀 Key Features

*   **⚡ WebRTC Video Rooms (LiveKit)**: High-definition, low-latency video and audio streams featuring grid gallery views, speaker focus layout, spotlight views, and horizontal thumbnail lists.
*   **💬 Real-Time Direct Messaging**: Self-contained DM chat channels between contacts, synchronized in real-time via Socket.io channels and persisted locally.
*   **✨ Interactive Floating Reactions**: Wavy, drifting live emoji reactions (👍, 👏, 🎉, ❤️, ✋, 👎, 😮, 😂, 🔥, 💡, 💯, 🚀) that float upwards with custom keyframe animations and randomized offsets.
*   **🤖 AI Meeting Summaries**: Cloud recording integration that triggers background worker jobs to process transcription logs and generate key decisions and action items via Anthropic & OpenAI API models.
*   **🔁 CI/CD Pipeline (GitHub Actions)**: Automatic build verification, Next.js linter validation, TypeScript compilation type-checks, and Prisma DB Client generation on every commit and pull request.
*   **🔒 Secure JWT Authentication**: Robust cookie-based access token lifecycle (15m expiry) and database-persisted session-refresh token validation.
*   **🛠️ Modern Responsive UI**: Curated dark modes, glassmorphism panel slideouts, hover transition lifts, and accessible layouts built on Radix UI, Base UI, and Tailwind.

---

## 🏗️ Architecture Overview

```
                                  +-------------------+
                                  |   Next.js Client  |
                                  |   (React Web UI)  |
                                  +---------+---------+
                                            |
                         +------------------+------------------+
                         | (WebRTC)         | (WebSockets)     | (REST APIs)
                         v                  v                  v
                +--------+-------+  +-------+--------+  +------+------+
                | LiveKit Server |  | Express Socket |  |  Postgres  |
                | (Media Stream) |  |   (Signaling)  |  |  (Prisma)   |
                +----------------+  +-------+--------+  +-------------+
                                            |
                                            | (Jobs Queue)
                                            v
                                    +-------+--------+
                                    |  BullMQ Worker | <---> Redis Cache
                                    |  (AI Summaries) |
                                    +----------------+
```

---

## 📂 Project Structure

```
├── backend/                      # Express & Socket.io Signaling Engine
│   ├── src/
│   │   ├── socket/               # signaling, media states, chat & reaction channels
│   │   ├── worker.ts             # BullMQ AI summarization queue listener
│   │   └── index.ts              # main server entry point
│   ├── prisma/                   # database migration configurations & schema definition
│   └── package.json
│
├── frontend/                     # Next.js UI Portal & API Client
│   ├── src/
│   │   ├── app/                  # pages, settings, meetings, and contact layout views
│   │   ├── components/ui/        # Radix-accessible UI elements (dialog, inputs, dropdowns)
│   │   └── lib/                  # prisma singleton clients, utils & validation schemas
│   ├── docker/                   # Postgres DB & Redis container compositions
│   └── package.json
```

---

## 🛠️ Local Development Quick Start

Follow these steps to get the environment running on your local machine:

### 1. Prerequisites
Ensure you have **Node.js (v18+)**, **Docker Desktop**, and **Git** installed.

### 2. Clone the Repository
```bash
git clone https://github.com/ashwathjelloji2468-gif/AI-enhanced-zoom-.git
cd AI-enhanced-zoom-
```

### 3. Spin up Database & Caches (Docker Compose)
Start the PostgreSQL database and Redis server.
```bash
cd frontend/docker
docker-compose up -d db redis
```

### 4. Setup the LiveKit WebRTC Server
To enable video and audio streams, spin up the LiveKit container. Binding `--node-ip 127.0.0.1` ensures WebRTC PeerConnection channels resolve correctly on macOS host loopbacks:
```bash
docker run -d --name livekit-server \
  -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server --dev --keys "devkey: secret" --node-ip 127.0.0.1
```

### 5. Install Dependencies & Initialize DB Schema
Run Prisma database syncs in both directories:
```bash
# In the root /
cd backend && npm install && npx prisma db push
cd ../frontend && npm install && npx prisma db push
```

### 6. Run the Services
Open three separate terminal windows in the root of the project to launch the servers:

*   **Terminal 1: Node Socket signaling engine**
    ```bash
    cd backend && npm run dev
    ```
*   **Terminal 2: Background AI worker**
    ```bash
    cd backend && npm run dev:worker
    ```
*   **Terminal 3: Next.js Frontend app**
    ```bash
    cd frontend && npm run dev
    ```

Once running, navigate to **[http://localhost:3000](http://localhost:3000)** to sign up, check contacts, schedule syncs, and join video conferences!

---

## ⚙️ Environment Configuration

### Frontend Config (`frontend/.env`)
```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5433/zoomclone"
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"
PORT=3000
NEXT_PUBLIC_SOCKET_URL="http://localhost:5001"
NEXT_PUBLIC_LIVEKIT_URL="ws://localhost:7880"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
```

### Backend Config (`backend/.env`)
```env
PORT=5001
DATABASE_URL="postgresql://<user>:<password>@localhost:5433/zoomclone"
REDIS_URL="redis://localhost:6380"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
NEXT_PUBLIC_LIVEKIT_URL="ws://localhost:7880"
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

---

## 📈 Security & Optimizations
*   **No-Transaction API Routes**: Replaced Prisma database transaction wrappers with sequential writes on key API routes to completely bypass timeout limitations under high developer server usage.
*   **ICE Candidate Tuning**: Bound local loops (`127.0.0.1`) on the container signaling server to prevent browser `PC connection` WebRTC timeouts under virtualized macOS Docker bridges.
*   **Hydration Mismatch Guards**: Implemented browser window lifecycle checks around stateful browser utilities (like `localStorage` on contacts syncs) to preserve React hydration invariants during server-side renders (SSR).
