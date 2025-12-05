import express from 'express';
import metaCortexService from '../services/metaCortexService.js';
import evolutionEngine from '../services/evolutionEngine.js';
import selfImprovementService from '../services/selfImprovementService.js';

const router = express.Router();

router.get('/diagnostics', async (req, res) => {
  try {
    const report = await metaCortexService.runDiagnostics();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/evolution-plan', async (req, res) => {
  try {
    let plan = await evolutionEngine.getLatestPlan();
    
    // 24-hour TTL check
    if (Date.now() - new Date(plan.generated_at).getTime() > 86400000) {
         plan = await evolutionEngine.generateEvolutionPlan();
    }

    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/evolution-plan/generate', async (req, res) => {
    try {
        const plan = await evolutionEngine.generateEvolutionPlan();
        res.json({ success: true, data: plan });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/self-improvement-dashboard', async (req, res) => {
    try {
        const dashboard = await selfImprovementService.getDashboard();
        res.json({ success: true, data: dashboard });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
