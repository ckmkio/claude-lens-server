# Claude Code Token Usage Sync Service

A Docker-based backend service for synchronizing Claude Code token usage in real-time between multiple devices. Uses Redis for live data storage, WebSocket for real-time synchronization, and Express.js for API control of cron jobs, backend configuration, and other settings.

## Features

- **Real-time Token Sync** - Live synchronization of Claude Code token usage across devices
- **Express.js 5 API** - RESTful API for controlling cron jobs and backend configuration
- **WebSocket Support** - Real-time bidirectional communication between server and clients
- **Redis Storage** - Fast, reliable live data storage with automatic TTL management
- **Claude Code Integration** - Automated token usage tracking and reporting
- **ccusage Integration** - Live token usage sync when sending first prompt to Claude Code
- **Cron Job Management** - API-controlled scheduled task execution
- **Multi-device Support** - Centralized token usage monitoring across multiple devices
- **Process Management** - Supervisor for reliable service orchestration
- **TypeScript** - Full TypeScript support for better development experience

## Quick Start

1. Build and run the container:
```bash
docker-compose up --build
```

2. On first startup, complete the Claude Code authentication:
```bash
# Access the running container
docker exec -it <container-id> /bin/bash

# Login to Claude Code
claude auth login
```

3. The API will be available at `http://localhost:3000`

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /api/status` - Get service status and configuration

### Token Usage Management
- `GET /api/usage` - Get token usage data for all devices
- `GET /api/usage/:deviceId` - Get token usage for specific device
- `POST /api/usage/:deviceId` - Update token usage for device
- `PUT /api/usage/sync` - Force sync token usage across all devices
- `POST /api/usage/ccusage` - Trigger ccusage sync before Claude Code prompt

### Cron Job Management
- `GET /api/cron/jobs` - List all scheduled cron jobs
- `POST /api/cron/jobs` - Create new cron job
- `PUT /api/cron/jobs/:id` - Update existing cron job
- `DELETE /api/cron/jobs/:id` - Delete cron job
- `POST /api/cron/jobs/:id/execute` - Manually execute cron job

### Configuration
- `GET /api/config` - Get backend configuration
- `PUT /api/config` - Update backend configuration
- `GET /api/config/redis` - Get Redis connection settings
- `PUT /api/config/redis` - Update Redis settings

### Live Data
- `GET /api/metrics` - Get all live metrics data
- `GET /api/metrics/:key` - Get specific metric
- `POST /api/metrics/:key` - Set metric data
- `DELETE /api/metrics/:key` - Delete metric

## WebSocket Connection

Connect to `ws://localhost:3000` for real-time data synchronization.

### WebSocket Events
- `token_usage_update` - Real-time token usage updates
- `device_connected` - Device connection notifications
- `device_disconnected` - Device disconnection notifications
- `sync_status` - Synchronization status updates
- `cron_job_executed` - Cron job execution notifications

### Example WebSocket Client
```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.on('message', (data) => {
  const event = JSON.parse(data);
  console.log('Received:', event.type, event.payload);
});

// Send token usage update
ws.send(JSON.stringify({
  type: 'update_usage',
  deviceId: 'device-123',
  tokens: 1500
}));
```

## Configuration

### Environment Variables
- `PORT` - API server port (default: 3000)
- `REDIS_HOST` - Redis server hostname (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis authentication password
- `REDIS_DB` - Redis database number (default: 0)
- `WEBSOCKET_PORT` - WebSocket server port (default: same as API)
- `CLAUDE_API_KEY` - Claude Code API key
- `SYNC_INTERVAL` - Token sync interval in seconds (default: 30)
- `CCUSAGE_PATH` - Path to ccusage executable (default: /usr/local/bin/ccusage)
- `CLAUDE_CODE_PATH` - Path to Claude Code executable (default: /usr/local/bin/claude)

### Configuration File
Copy `.env.example` to `.env` and modify as needed:
```bash
cp .env.example .env
```

## Cron Job Management

### Default Schedule
The service includes default cron jobs for token usage collection and synchronization. View and modify through the API endpoints.

### Custom Cron Jobs
Add custom scheduled tasks using the API:
```bash
curl -X POST http://localhost:3000/api/cron/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "token_sync",
    "schedule": "*/5 * * * *",
    "command": "claude usage sync",
    "enabled": true
  }'
```

### ccusage Integration
The service automatically runs `ccusage` before sending the first prompt to Claude Code to ensure accurate token usage tracking:
```bash
# Example ccusage sync before Claude Code execution
ccusage sync
claude code "Your prompt here"
```

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start Redis (if not using Docker)
redis-server

# Run in development mode
npm run dev

# Run tests
npm test
```

### Docker Development
```bash
# Build and run in development mode
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose logs -f
```

## Monitoring & Logs

### Log Files
- Application logs: `/var/log/supervisor/`
- Cron execution logs: `/var/log/cron.log`
- Claude Code execution logs: `/var/log/claude-execution.log`
- WebSocket connection logs: `/var/log/websocket.log`

### Health Monitoring
Monitor service health through:
- HTTP endpoint: `GET /health`
- WebSocket ping/pong
- Redis connection status
- Supervisor process status

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │◄──►│  WebSocket API  │◄──►│  Redis Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  Express API    │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Cron Jobs     │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  Claude Code    │
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │    ccusage      │
                       └─────────────────┘
```

## License

[Add your license here]