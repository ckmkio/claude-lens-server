import { Router } from 'express';
import { RedisService } from '../services/redis';

export function ApiRoutes(redis: RedisService): Router {
  const router = Router();

  router.get('/metrics', async (req, res) => {
    try {
      const data = await redis.getAllLiveData();
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  router.get('/metrics/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const data = await redis.getLiveData(`live:${key}`);
      res.json({ key, data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metric' });
    }
  });

  router.post('/metrics/:key', async (req, res) => {
    try {
      const { key } = req.params;
      const data = req.body;
      await redis.setLiveData(`live:${key}`, data);
      res.json({ success: true, key, data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set metric' });
    }
  });

  return router;
}