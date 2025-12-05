import pool from '../db/index.js';

class LiveStatusService {
  private updateQueue: any[] = [];
  private isProcessing = false;

  constructor() {
    setInterval(() => this.processQueue(), 500);
  }

  // Standardizes status updates to prevent "Always Green" lies
  update(id: string, status: string, message: string, count: number = 0) {
    let finalStatus = status;
    
    // Smart Logic: If we scanned but found nothing new, downgrade to 'cached'
    if (status === 'new_data' && count === 0) {
        finalStatus = 'cached';
        message = 'No New Data';
    }
    
    // If we found data, ensure it's marked as new
    if (count > 0) {
        finalStatus = 'new_data';
    }

    this.updateQueue.push({ id, status: finalStatus, message, count });
  }

  private async processQueue() {
    if (this.isProcessing || this.updateQueue.length === 0) return;
    this.isProcessing = true;

    const batch = [...this.updateQueue];
    this.updateQueue = [];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const update of batch) {
        await client.query(`
          INSERT INTO system_status (source_id, status, message, count, last_updated)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (source_id) DO UPDATE SET
            status = EXCLUDED.status,
            message = EXCLUDED.message,
            count = EXCLUDED.count,
            last_updated = NOW()
        `, [update.id, update.status, update.message, update.count]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Status batch failed', e);
    } finally {
      client.release();
      this.isProcessing = false;
    }
  }
}

export default new LiveStatusService();
