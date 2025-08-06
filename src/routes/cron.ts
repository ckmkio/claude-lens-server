import { Router, Request, Response } from 'express';
import { CronService, CronJob } from '../services/cron';

export function CronRoutes(cronService: CronService): Router {
  const router = Router();

  // Get all cron jobs
  router.get('/', (req: Request, res: Response) => {
    try {
      const jobs = cronService.getAllJobs();
      res.json({ jobs });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get cron jobs', message: error.message });
    }
  });

  // Get specific cron job
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = cronService.getJob(id);
      
      if (!job) {
        return res.status(404).json({ error: 'Cron job not found' });
      }
      
      res.json({ job });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to get cron job', message: error.message });
    }
  });

  // Create new cron job
  router.post('/', (req: Request, res: Response) => {
    try {
      const { name, schedule, command, enabled = true } = req.body;

      if (!name || !schedule || !command) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          required: ['name', 'schedule', 'command'] 
        });
      }

      if (!cronService.validateSchedule(schedule)) {
        return res.status(400).json({ 
          error: 'Invalid cron schedule format',
          example: '0 */6 * * * (every 6 hours)'
        });
      }

      const jobId = Math.random().toString(36).substr(2, 9);
      const jobConfig: CronJob = {
        id: jobId,
        name,
        schedule,
        command,
        enabled,
        status: 'inactive'
      };

      const success = cronService.createJob(jobConfig);
      
      if (success) {
        const createdJob = cronService.getJob(jobId);
        res.status(201).json({ success: true, job: createdJob });
      } else {
        res.status(500).json({ error: 'Failed to create cron job' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create cron job', message: error.message });
    }
  });

  // Update cron job
  router.put('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.schedule && !cronService.validateSchedule(updates.schedule)) {
        return res.status(400).json({ 
          error: 'Invalid cron schedule format',
          example: '0 */6 * * * (every 6 hours)'
        });
      }

      const success = cronService.updateJob(id, updates);
      
      if (success) {
        const updatedJob = cronService.getJob(id);
        res.json({ success: true, job: updatedJob });
      } else {
        res.status(404).json({ error: 'Cron job not found or update failed' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update cron job', message: error.message });
    }
  });

  // Delete cron job
  router.delete('/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = cronService.deleteJob(id);
      
      if (success) {
        res.json({ success: true, message: 'Cron job deleted' });
      } else {
        res.status(404).json({ error: 'Cron job not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete cron job', message: error.message });
    }
  });

  // Enable cron job
  router.post('/:id/enable', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = cronService.enableJob(id);
      
      if (success) {
        const job = cronService.getJob(id);
        res.json({ success: true, job });
      } else {
        res.status(404).json({ error: 'Cron job not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to enable cron job', message: error.message });
    }
  });

  // Disable cron job
  router.post('/:id/disable', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = cronService.disableJob(id);
      
      if (success) {
        const job = cronService.getJob(id);
        res.json({ success: true, job });
      } else {
        res.status(404).json({ error: 'Cron job not found' });
      }
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to disable cron job', message: error.message });
    }
  });

  // Execute cron job immediately
  router.post('/:id/execute', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await cronService.executeJobNow(id);
      
      res.json({
        success: result.success,
        output: result.output,
        error: result.error,
        executedAt: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to execute cron job', message: error.message });
    }
  });

  // Validate cron schedule
  router.post('/validate-schedule', (req: Request, res: Response) => {
    try {
      const { schedule } = req.body;
      
      if (!schedule) {
        return res.status(400).json({ error: 'Schedule is required' });
      }

      const isValid = cronService.validateSchedule(schedule);
      res.json({ 
        valid: isValid,
        schedule,
        example: '0 */6 * * * (every 6 hours)'
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to validate schedule', message: error.message });
    }
  });

  return router;
}