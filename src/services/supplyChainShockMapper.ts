import pool from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface ShockMap {
  origin_event: string;
  shock_type: 'SHORTAGE' | 'GLUT' | 'LOGISTICS' | 'TARIFF' | 'DISRUPTION';
  upstream_impact: string[];   // Suppliers/Raw Materials
  downstream_impact: string[]; // Buyers/Consumers
  substitutes: string[];       // Alternatives
  confidence: number;
}

class SupplyChainShockMapper {

  // Legacy Regex Map (Fast Filter)
  private STATIC_MAP = [
      { keywords: ['semiconductor', 'chip'], type: 'SHORTAGE', up: ['ASML'], down: ['AAPL', 'TSLA'] },
      { keywords: ['oil', 'pipeline'], type: 'SHORTAGE', up: ['XOM'], down: ['DAL', 'FDX'] }
  ];

  async mapImpact(eventText: string): Promise<ShockMap | null> {
    // 1. Try Fast Regex First (Speed)
    const text = eventText.toLowerCase();
    for (const logic of this.STATIC_MAP) {
        if (logic.keywords.some(k => text.includes(k))) {
            return {
                origin_event: eventText.substring(0, 50) + '...',
                shock_type: logic.type as any,
                upstream_impact: logic.up,
                downstream_impact: logic.down,
                substitutes: [],
                confidence: 60 // Moderate confidence for static
            };
        }
    }

    // 2. AI Causal Inference (Deep Brain)
    // If no static match, ask the Brain to map the supply chain dynamically
    if (text.includes('shortage') || text.includes('halt') || text.includes('disruption') || text.includes('strike') || text.includes('embargo')) {
        return await this.inferSupplyChain(eventText);
    }

    return null;
  }

  private async inferSupplyChain(event: string): Promise<ShockMap | null> {
      // console.log(`      ⛓️  AI Mapping Supply Chain for: "${event.substring(0,40)}..."`);
      
      const prompt = `
        ACT AS: Global Supply Chain Expert.
        EVENT: "${event}"
        
        TASK: Map the immediate Upstream (Suppliers) and Downstream (Customers) impacts.
        Identify specific public tickers where possible.
        
        OUTPUT JSON ONLY:
        {
            "shock_type": "SHORTAGE/GLUT/LOGISTICS/DISRUPTION",
            "upstream_impact": ["Ticker1", "Ticker2"],
            "downstream_impact": ["Ticker3", "Ticker4"],
            "substitutes": ["Ticker5"],
            "confidence": 85
        }
      `;

      try {
          const msg = await anthropic.messages.create({
              model: 'claude-3-haiku-20240307',
              max_tokens: 400,
              messages: [{ role: 'user', content: prompt }]
          });

          const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
          const json = extractJSON(responseText);

          if (json.shock_type) {
              return {
                  origin_event: event.substring(0, 100),
                  shock_type: json.shock_type,
                  upstream_impact: json.upstream_impact || [],
                  downstream_impact: json.downstream_impact || [],
                  substitutes: json.substitutes || [],
                  confidence: json.confidence || 70
              };
          }
      } catch (e) {}
      
      return null;
  }
}

export default new SupplyChainShockMapper();
