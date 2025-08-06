import { WebSocketServer, WebSocket } from 'ws';
import { RedisService } from './redis';

export class WebSocketService {
  private wss: WebSocketServer;
  private redis: RedisService;
  private clients: Set<WebSocket> = new Set();

  constructor(wss: WebSocketServer, redis: RedisService) {
    this.wss = wss;
    this.redis = redis;
  }

  initialize(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');
      this.clients.add(ws);

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
          ws.send(JSON.stringify({ error: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      this.sendInitialData(ws);
    });

    this.subscribeToRedis();
    this.startLiveDataSync();
  }

  private async sendInitialData(ws: WebSocket): Promise<void> {
    try {
      const liveData = await this.redis.getAllLiveData();
      ws.send(JSON.stringify({
        type: 'initial-data',
        data: liveData
      }));
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'get-live-data':
        const data = await this.redis.getLiveData(message.key);
        ws.send(JSON.stringify({
          type: 'live-data-response',
          key: message.key,
          data
        }));
        break;
      
      case 'subscribe':
        ws.send(JSON.stringify({
          type: 'subscribed',
          channel: message.channel
        }));
        break;
        
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  }

  private subscribeToRedis(): void {
    this.redis.subscribeLiveData((channel: string, message: string) => {
      try {
        this.broadcast({
          type: 'live-data-update',
          channel,
          data: JSON.parse(message)
        });
      } catch (error) {
        console.error('Error parsing Redis message:', error, 'Message:', message);
      }
    });
  }

  private startLiveDataSync(): void {
    setInterval(async () => {
      try {
        const timestamp = new Date().toISOString();
        const sampleData = {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          requests: Math.floor(Math.random() * 1000)
        };
        
        await this.redis.setLiveData('live:metrics', sampleData);
      } catch (error) {
        console.error('Error syncing live data:', error);
      }
    }, 1000); // Every second
  }

  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}