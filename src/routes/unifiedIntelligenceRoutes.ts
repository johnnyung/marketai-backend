// src/routes/unifiedIntelligenceRoutes.ts
import express from 'express';
import unifiedIntelligenceEngine from '../services/unifiedIntelligenceEngine.js';
import { pool } from '../db/index.js';

const router = express.Router();

// Get latest unified alerts
router.get('/alerts', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const alerts = await unifiedIntelligenceEngine.getLatestAlerts(Number(limit));
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active critical alerts
router.get('/alerts/critical', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM v_active_critical_alerts
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual trigger: Run unified analysis
router.post('/analyze', async (req, res) => {
  try {
    const alerts = await unifiedIntelligenceEngine.generateUnifiedAnalysis();
    
    res.json({
      success: true,
      data: alerts,
      message: `Generated ${alerts.length} intelligence alerts`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get combined signal strength
router.get('/signal-strength', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM get_combined_signal_strength()');
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Acknowledge alert
router.post('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    
    await pool.query(`
      UPDATE unified_intelligence_alerts
      SET acknowledged = true,
          acknowledged_at = NOW(),
          acknowledged_by = $1
      WHERE id = $2
    `, [username || 'system', id]);
    
    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get alert performance stats
router.get('/performance', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_alert_performance');
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
