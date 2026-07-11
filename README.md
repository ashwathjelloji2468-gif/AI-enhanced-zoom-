# AI-Enhanced Zoom Clone

This repository contains a high-fidelity Zoom clone featuring high-definition WebRTC video conferencing, chat synchronization, and presence updates.

## Repository Structure

The project is split into two main services:

### 1. [frontend/](file:///Users/jashwath/.gemini/antigravity/scratch/ai-zoom/frontend)
* **Technology**: Next.js (App Router), Tailwind CSS, shadcn/ui, Radix UI.
* **Database & Auth**: PostgreSQL database integration via Prisma Client, and stateless JWT/refresh cookie authentication.
* **Role**: Serves the user landing pages, dashboard management interfaces, settings preferences, and hosts the LiveKit WebRTC video room clients.

### 2. [backend/](file:///Users/jashwath/.gemini/antigravity/scratch/ai-zoom/backend)
* **Technology**: Node.js, Express, Socket.io, TypeScript.
* **Role**: Orchestrates real-time state synchronization, handling room join/leave presence lists, waitroom admission triggers, remote host mute control events, and floated text/emoji chat reactions.

---

## Getting Started

Refer to the respective `README.md` and configuration files inside [frontend/](file:///Users/jashwath/.gemini/antigravity/scratch/ai-zoom/frontend) and [backend/](file:///Users/jashwath/.gemini/antigravity/scratch/ai-zoom/backend) to set up and run the services locally.
