# BOBAO — Bob Agent Orchestration

Monitor and orchestrate [IBM Bob CLI](https://github.com/IBM/bob-cli) agent sessions.

Tracks projects, sessions, and streams live logs with blocked-state detection (prompts, confirmations, errors).

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
just dev
```

Open [http://localhost:4000](http://localhost:4000).

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your IBM Cloud API key
```

See [SECURITY.md](SECURITY.md) for credential management guidelines.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Runtime**: Node.js ≥18

## Project Structure

```
├── app/                # App Router pages & API
│   ├── api/
│   │   ├── projects/   # CRUD projects
│   │   └── sessions/   # Session management, log streaming, input
│   └── projects/       # Project & session views
├── components/         # React components
│   ├── LiveLogPanel    # SSE-based live log streaming
│   ├── LogPanel        # Static log display
│   └── ...
├── lib/                # Core logic
│   ├── types.ts        # Project, Session, LogLine types
│   ├── live-store.ts   # In-memory store (projects, sessions)
│   ├── live-bob-provider.ts  # Process spawner & SSE streaming
│   └── session-provider.ts   # Provider interface & composition
├── bob-sessions/       # Bob CLI session logs
├── justfile            # Task runner
├── .bobignore          # Bob AI security patterns
└── .env.example        # Environment variable template
```

## Features

- **Project management** — Create and track coding projects with status (active/blocked/idle)
- **Session tracking** — Monitor agent sessions with real-time status updates
- **Live log streaming** — SSE-powered log streaming from spawned Bob CLI processes
- **Blocked-state detection** — Auto-detects prompts, confirmations, and error states
- **Input forwarding** — Send responses to blocked agent sessions

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a new project |
| POST | `/api/sessions` | Create a new session |
| POST | `/api/sessions/[id]/spawn` | Spawn Bob CLI process |
| GET | `/api/sessions/[id]/stream` | SSE log stream |
| POST | `/api/sessions/[id]/input` | Send input to process |

## Commands

```bash
just dev          # Start dev server on port 4000
just build        # Production build
just start        # Run production server
just typecheck    # Type-check without emitting
```

## Security

This project uses IBM Hackathon security patterns. See [SECURITY.md](SECURITY.md) for guidelines on credential management and safe AI assistant usage.
