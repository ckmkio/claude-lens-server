import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'inactive' | 'error';
  errorMessage?: string;
}

export class CronService {
  private jobs: Map<string, { job: cron.ScheduledTask; config: CronJob }> = new Map();
  private logFile = '/var/log/claude-cron.log';

  constructor() {
    this.initializeDefaultJobs();
  }

  private initializeDefaultJobs(): void {
    const defaultJobs: Omit<CronJob, 'id' | 'status' | 'lastRun' | 'nextRun'>[] = [
      {
        name: 'Claude Code Health Check',
        schedule: '0 */6 * * *', // Every 6 hours
        command: 'claude --version',
        enabled: true
      },
      {
        name: 'Claude Code Help Command',
        schedule: '0 9 * * 1', // Every Monday at 9 AM
        command: 'claude help',
        enabled: false
      },
      {
        name: 'Claude Code Prompt Every Minute',
        schedule: '* * * * *', // Every minute
        command: 'claude -p "Dont think and reply Roger."',
        enabled: true
      }
    ];

    defaultJobs.forEach(jobConfig => {
      const id = this.generateId();
      this.createJob({ ...jobConfig, id, status: 'inactive' });
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async executeClaudeCommand(command: string): Promise<{ success: boolean; output: string; error?: string }> {
    const timestamp = new Date().toISOString();
    const fullCommand = `/app/scripts/setup-claude.sh execute "${command}"`;
    
    console.log(`[${timestamp}] EXECUTING: ${fullCommand}`);
    process.stdout.write(`[${timestamp}] EXECUTING: ${fullCommand}\n`);
    
    try {
      const { stdout, stderr } = await execAsync(fullCommand);
      const output = stdout + stderr;
      
      console.log(`[${timestamp}] COMMAND SUCCESS - Output length: ${output.length} chars`);
      process.stdout.write(`[${timestamp}] COMMAND SUCCESS - Output: ${output}\n`);
      
      return {
        success: true,
        output: output
      };
    } catch (error: any) {
      console.log(`[${timestamp}] COMMAND FAILED: ${error.message}`);
      process.stderr.write(`[${timestamp}] COMMAND FAILED: ${error.message}\n`);
      
      return {
        success: false,
        output: error.stdout || '',
        error: error.message
      };
    }
  }

  private logExecution(jobId: string, jobName: string, success: boolean, output: string, error?: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Job: ${jobName} (${jobId}) - ${success ? 'SUCCESS' : 'FAILED'}\nOutput: ${output}${error ? `\nError: ${error}` : ''}\n---\n`;
    
    // Log to both console and process stdout for visibility
    console.log(logEntry);
    process.stdout.write(logEntry + '\n');
    
    if (error) {
      process.stderr.write(`[${timestamp}] CRON ERROR: ${error}\n`);
    }
  }

  createJob(jobConfig: CronJob): boolean {
    try {
      if (!cron.validate(jobConfig.schedule)) {
        throw new Error('Invalid cron schedule');
      }

      const scheduledTask = cron.schedule(jobConfig.schedule, async () => {
        const jobData = this.jobs.get(jobConfig.id);
        if (!jobData || !jobData.config.enabled) return;

        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] CRON STARTING: ${jobData.config.name} - Command: ${jobData.config.command}`);
        process.stdout.write(`[${timestamp}] CRON STARTING: ${jobData.config.name} - Command: ${jobData.config.command}\n`);

        jobData.config.lastRun = new Date();
        jobData.config.status = 'active';

        try {
          const result = await this.executeClaudeCommand(jobData.config.command);
          
          if (result.success) {
            jobData.config.status = 'inactive';
            jobData.config.errorMessage = undefined;
          } else {
            jobData.config.status = 'error';
            jobData.config.errorMessage = result.error;
          }

          this.logExecution(jobConfig.id, jobConfig.name, result.success, result.output, result.error);
          
          // Wait 10 seconds then get ccusage response
          setTimeout(async () => {
            try {
              const timestamp = new Date().toISOString();
              console.log(`[${timestamp}] Getting ccusage response after 10s delay for job: ${jobData.config.name}`);
              process.stdout.write(`[${timestamp}] Getting ccusage response after 10s delay for job: ${jobData.config.name}\n`);
              
              const ccusageResult = await this.executeClaudeCommand('ccusage');
              const ccusageLogEntry = `[${timestamp}] CCUSAGE Response: ${ccusageResult.success ? 'SUCCESS' : 'FAILED'}\nOutput: ${ccusageResult.output}${ccusageResult.error ? `\nError: ${ccusageResult.error}` : ''}\n---\n`;
              
              console.log(ccusageLogEntry);
              process.stdout.write(ccusageLogEntry + '\n');
            } catch (ccusageError: any) {
              const timestamp = new Date().toISOString();
              console.log(`[${timestamp}] CCUSAGE Error: ${ccusageError.message}`);
              process.stderr.write(`[${timestamp}] CCUSAGE Error: ${ccusageError.message}\n`);
            }
          }, 10000);
        } catch (error: any) {
          jobData.config.status = 'error';
          jobData.config.errorMessage = error.message;
          this.logExecution(jobConfig.id, jobConfig.name, false, '', error.message);
        }

        // Calculate next run
        const nextRun = this.getNextRun(jobConfig.schedule);
        if (nextRun) {
          jobData.config.nextRun = nextRun;
        }
      }, {
        scheduled: jobConfig.enabled
      });

      // Calculate initial next run
      if (jobConfig.enabled) {
        const nextRun = this.getNextRun(jobConfig.schedule);
        if (nextRun) {
          jobConfig.nextRun = nextRun;
        }
      }

      this.jobs.set(jobConfig.id, {
        job: scheduledTask,
        config: { ...jobConfig }
      });

      return true;
    } catch (error) {
      console.error('Error creating cron job:', error);
      return false;
    }
  }

  private getNextRun(schedule: string): Date | null {
    try {
      // Use node-cron's internal parsing to calculate next execution
      const cronExpression = require('node-cron/src/convert-expression');
      const cronParser = require('node-cron/src/scheduled-task');
      
      // Create a temporary task to get next execution time
      const task = cron.schedule(schedule, () => {}, { scheduled: false });
      
      // Calculate next run time based on current time
      const now = new Date();
      const nextMinute = new Date(now.getTime() + 60000);
      nextMinute.setSeconds(0, 0);
      
      // For every minute job, next run is next minute
      if (schedule === '* * * * *') {
        return nextMinute;
      }
      
      // For other schedules, add appropriate time based on pattern
      const parts = schedule.split(' ');
      if (parts[1] === '*/6' && parts[0] === '0') { // Every 6 hours
        const nextRun = new Date();
        nextRun.setHours(Math.ceil(nextRun.getHours() / 6) * 6, 0, 0, 0);
        return nextRun;
      }
      
      // Default: add 1 minute for safety
      return nextMinute;
    } catch {
      return null;
    }
  }

  updateJob(id: string, updates: Partial<Omit<CronJob, 'id'>>): boolean {
    const jobData = this.jobs.get(id);
    if (!jobData) return false;

    try {
      // If schedule is being updated, validate it
      if (updates.schedule && !cron.validate(updates.schedule)) {
        throw new Error('Invalid cron schedule');
      }

      // Stop current job
      jobData.job.stop();

      // Update configuration
      Object.assign(jobData.config, updates);

      // If schedule changed, recreate the job
      if (updates.schedule) {
        jobData.job.stop();
        const newTask = cron.schedule(jobData.config.schedule, async () => {
          // Same execution logic as in createJob
          const currentJobData = this.jobs.get(id);
          if (!currentJobData || !currentJobData.config.enabled) return;

          currentJobData.config.lastRun = new Date();
          currentJobData.config.status = 'active';

          try {
            const result = await this.executeClaudeCommand(currentJobData.config.command);
            
            if (result.success) {
              currentJobData.config.status = 'inactive';
              currentJobData.config.errorMessage = undefined;
            } else {
              currentJobData.config.status = 'error';
              currentJobData.config.errorMessage = result.error;
            }

            this.logExecution(id, currentJobData.config.name, result.success, result.output, result.error);
          } catch (error: any) {
            currentJobData.config.status = 'error';
            currentJobData.config.errorMessage = error.message;
            this.logExecution(id, currentJobData.config.name, false, '', error.message);
          }

          const nextRun = this.getNextRun(currentJobData.config.schedule);
          if (nextRun) {
            currentJobData.config.nextRun = nextRun;
          }
        }, {
          scheduled: jobData.config.enabled
        });

        jobData.job = newTask;
      }

      // Update next run time
      if (jobData.config.enabled) {
        const nextRun = this.getNextRun(jobData.config.schedule);
        if (nextRun) {
          jobData.config.nextRun = nextRun;
        }
        jobData.job.start();
      } else {
        jobData.config.nextRun = undefined;
      }

      return true;
    } catch (error) {
      console.error('Error updating cron job:', error);
      return false;
    }
  }

  deleteJob(id: string): boolean {
    const jobData = this.jobs.get(id);
    if (!jobData) return false;

    jobData.job.stop();
    this.jobs.delete(id);
    return true;
  }

  enableJob(id: string): boolean {
    const jobData = this.jobs.get(id);
    if (!jobData) return false;

    jobData.config.enabled = true;
    jobData.config.status = 'inactive';
    const nextRun = this.getNextRun(jobData.config.schedule);
    if (nextRun) {
      jobData.config.nextRun = nextRun;
    }
    jobData.job.start();
    return true;
  }

  disableJob(id: string): boolean {
    const jobData = this.jobs.get(id);
    if (!jobData) return false;

    jobData.config.enabled = false;
    jobData.config.status = 'inactive';
    jobData.config.nextRun = undefined;
    jobData.job.stop();
    return true;
  }

  getJob(id: string): CronJob | null {
    const jobData = this.jobs.get(id);
    return jobData ? { ...jobData.config } : null;
  }

  getAllJobs(): CronJob[] {
    return Array.from(this.jobs.values()).map(jobData => ({ ...jobData.config }));
  }

  validateSchedule(schedule: string): boolean {
    return cron.validate(schedule);
  }

  async executeJobNow(id: string): Promise<{ success: boolean; output: string; error?: string }> {
    const jobData = this.jobs.get(id);
    if (!jobData) {
      return { success: false, output: '', error: 'Job not found' };
    }

    try {
      jobData.config.lastRun = new Date();
      jobData.config.status = 'active';
      
      const result = await this.executeClaudeCommand(jobData.config.command);
      
      if (result.success) {
        jobData.config.status = 'inactive';
        jobData.config.errorMessage = undefined;
      } else {
        jobData.config.status = 'error';
        jobData.config.errorMessage = result.error;
      }

      this.logExecution(id, jobData.config.name, result.success, result.output, result.error);
      return result;
    } catch (error: any) {
      jobData.config.status = 'error';
      jobData.config.errorMessage = error.message;
      this.logExecution(id, jobData.config.name, false, '', error.message);
      return { success: false, output: '', error: error.message };
    }
  }
}