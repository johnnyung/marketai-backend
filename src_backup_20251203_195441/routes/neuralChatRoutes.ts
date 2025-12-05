import express from 'express';
import neuralChatService from '../services/neuralChatService.js';

const router = express.Router();

router.post('/ask', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: "Query required" });
    
    const response = await neuralChatService.generateResponse(query);
    res.json({ success: true, data: response });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
