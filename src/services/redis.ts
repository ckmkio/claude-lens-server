import { createClient, RedisClientType } from 'redis';

export class RedisService {
  private client: RedisClientType;
  private subscriber: RedisClientType;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    this.subscriber = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
  }

  async connect(): Promise<void> {
    await Promise.all([
      this.client.connect(),
      this.subscriber.connect()
    ]);
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.client.disconnect(),
      this.subscriber.disconnect()
    ]);
  }

  async setLiveData(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString()
    });
    
    await this.client.setEx(key, 300, jsonData); // 5 minute TTL
    await this.client.publish('live-data', JSON.stringify({ key, data: jsonData }));
  }

  async getLiveData(key: string): Promise<any> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getAllLiveData(): Promise<Record<string, any>> {
    const keys = await this.client.keys('live:*');
    const result: Record<string, any> = {};
    
    for (const key of keys) {
      const data = await this.getLiveData(key);
      if (data) {
        result[key] = data;
      }
    }
    
    return result;
  }

  async subscribeLiveData(callback: (channel: string, message: string) => void): Promise<void> {
    await this.subscriber.subscribe('live-data', (message: string, channel: string) => {
      callback(channel, message);
    });
  }

  getClient(): RedisClientType {
    return this.client;
  }
}