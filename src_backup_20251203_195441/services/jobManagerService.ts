import { EventEmitter } from 'events';

interface JobStatus {
  id: string;
  type: 'ANALYSIS' | 'HUNTER' | 'CORRELATION' | 'INGESTION';
  state: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime: number;
}

class JobManagerService extends EventEmitter {
  private jobs: Map<string, JobStatus> = new Map();

  constructor() {
    super();
    // Initialize default states
    this.jobs.set('ANALYSIS', { id: 'ANALYSIS', type: 'ANALYSIS', state: 'idle', progress: 0, message: 'Ready', startTime: 0 });
    this.jobs.set('HUNTER', { id: 'HUNTER', type: 'HUNTER', state: 'idle', progress: 0, message: 'Ready', startTime: 0 });
    this.jobs.set('CORRELATION', { id: 'CORRELATION', type: 'CORRELATION', state: 'idle', progress: 0, message: 'Ready', startTime: 0 });
  }

  getJob(type: string) {
    return this.jobs.get(type);
  }

  startJob(type: string, message: string = 'Starting...') {
    const job = this.jobs.get(type);
    if (job && job.state === 'running') {
        // Check for stale locks (> 5 mins)
        if (Date.now() - job.startTime > 300000) {
            console.log(`⚠️ Resetting stale job: ${type}`);
        } else {
            throw new Error(`Job ${type} is already running.`);
        }
    }
    
    this.jobs.set(type, {
        id: type,
        type: type as any,
        state: 'running',
        progress: 0,
        message,
        startTime: Date.now()
    });
  }

  updateJob(type: string, progress: number, message: string) {
    const job = this.jobs.get(type);
    if (job) {
        this.jobs.set(type, { ...job, progress, message });
    }
  }

  completeJob(type: string, message: string = 'Complete') {
    const job = this.jobs.get(type);
    if (job) {
        this.jobs.set(type, { ...job, state: 'completed', progress: 100, message });
        // Reset to idle after 10 seconds so user can run again
        setTimeout(() => {
            this.jobs.set(type, { ...job, state: 'idle', progress: 0, message: 'Ready' });
        }, 10000);
    }
  }

  failJob(type: string, error: string) {
    const job = this.jobs.get(type);
    if (job) {
        this.jobs.set(type, { ...job, state: 'failed', message: `Error: ${error}` });
        setTimeout(() => {
            this.jobs.set(type, { ...job, state: 'idle', message: 'Ready (Last Failed)' });
        }, 10000);
    }
  }
}

export default new JobManagerService();
