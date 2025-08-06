# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
npm install

# Build the TypeScript project
npm run build

# Start the application
npm start

# Development mode with hot reload
npm run dev

# Lint the codebase
npm run lint

# Run tests
npm test
```

## Docker Commands

```bash
# Build and run the complete service
docker-compose up --build

# View logs
docker-compose logs -f

# Access the running container for Claude Code authentication
docker exec -it <container-id> /bin/bash
```

## Architecture Overview

This is a Claude Code token usage synchronization service built with:

- **Express.js 5** - Main API server with TypeScript
- **WebSocket Server** - Real-time bidirectional communication
- **Redis** - Live data storage with automatic TTL (5 minutes)
- **Supervisor** - Process management for production deployment

### Key Components

- `src/index.ts` - Main server entry point with service orchestration
- `src/routes/api.ts` - REST API endpoints for metrics and live data
- `src/routes/cron.ts` - Cron job management endpoints  
- `src/services/redis.ts` - Redis client wrapper with live data methods
- `src/services/websocket.ts` - WebSocket service for real-time sync
- `src/services/cron.ts` - Cron job scheduling and management

### Service Architecture

The application follows a layered service architecture:
1. Express.js API layer handling HTTP requests
2. WebSocket service managing real-time connections
3. Redis service for data persistence and pub/sub
4. Cron service for scheduled token sync tasks
5. Integration with Claude Code CLI and ccusage tools

### API Endpoints Structure

- `/health` - Health check endpoint
- `/api/metrics` - Live metrics management (GET/POST all or by key)
- `/api/cron` - Cron job management (CRUD operations)
- WebSocket at root for real-time token usage sync

## TypeScript Configuration

- Target: ES2020
- Output directory: `./dist`
- Source directory: `./src`
- Strict mode enabled
- Source maps and declarations generated

## Environment Variables

Key environment variables used:
- `PORT` - API server port (default: 3000)
- `REDIS_HOST` - Redis hostname (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `NODE_ENV` - Environment mode

## Redis Data Pattern

Live data is stored with `live:` prefix and 5-minute TTL. The service uses pub/sub for real-time synchronization across WebSocket connections.

## Authentication Setup

On first run, the Claude Code CLI needs authentication inside the Docker container:
```bash
docker exec -it <container-id> /bin/bash
claude auth login
```

## Integration Points

- **Claude Code CLI** - Automated token usage tracking and reporting
- **ccusage** - Live token usage sync before Claude Code prompts  
- **WebSocket clients** - Real-time token usage synchronization
- **Redis** - Centralized live data storage for multi-device sync