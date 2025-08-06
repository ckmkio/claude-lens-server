import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { RedisService } from './services/redis';
import { WebSocketService } from './services/websocket';
import { CronService } from './services/cron';
import { ApiRoutes } from './routes/api';
import { CronRoutes } from './routes/cron';

dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const redisService = new RedisService();
const cronService = new CronService();
const wss = new WebSocketServer({ server });
const wsService = new WebSocketService(wss, redisService);

app.use('/api', ApiRoutes(redisService));
app.use('/api/cron', CronRoutes(cronService));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await redisService.connect();
    console.log('Connected to Redis');

    wsService.initialize();
    console.log('WebSocket service initialized');

    console.log('Cron service initialized');

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redisService.disconnect();
  process.exit(0);
});

startServer();