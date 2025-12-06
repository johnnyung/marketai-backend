import { pool } from '../db/index.js';
import evolutionLoopController from './metaLearning/evolutionLoopController.js';
import Anthropic from '@anthropic-ai/sdk';
import metaCortexService from './metaCortexService.js';
import documentationService from './documentationService.js';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface UpgradeItem {
  title: string;
  category: string;
  priority: string;
  complexity: string;
  expected_accuracy_gain: number;
  required_data: string[];
  required_schema_changes: string[];
  risk_if_ignored: string;
}

// Standardized Interface
interface EvolutionPlanResult {
  generated_at: string;
  health_score: number;
  upgrades: UpgradeItem[];
  learning_biases: Record<string, number>;
}

class EvolutionEngine {

  async generateEvolutionPlan(): Promise<EvolutionPlanResult> {
    console.log("      🧬 Evolution Engine: Architecting Future Upgrades...");

    // Run Learning Loop
    const learningResult = await evolutionLoopController.runDailyCycle();

    try {
        // 1. GET SYSTEM DIAGNOSTICS
        const health = await metaCortexService.runDiagnostics();
        
        // 2. AI ARCHITECT PROMPT
        const prompt = `
            ACT AS: Chief Technology Officer.
            HEALTH: ${health.health_score}%
            WEAKNESSES: ${JSON.stringify(health.weak_signals)}
            
            TASK: Design 3 upgrade tasks to fix weaknesses.
            
            OUTPUT JSON:
            {
                "blueprint": [
                    {
                        "title": "Upgrade Name",
                        "category": "NEW_ENGINE",
                        "priority": "HIGH",
                        "complexity": "MEDIUM",
                        "expected_accuracy_gain": 5,
                        "required_data": [],
                        "required_schema_changes": [],
                        "risk_if_ignored": "Drift"
                    }
                ]
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const json = extractJSON(text);
        const blueprint = json.blueprint || [];

        // 3. SAVE PLAN
        await pool.query(`
            INSERT INTO system_evolution_plans (current_health_score, upgrades, status)
            VALUES ($1, $2, 'PENDING')
        `, [health.health_score, JSON.stringify(blueprint)]);

        const plan: EvolutionPlanResult = {
            health_score: health.health_score,
            generated_at: new Date().toISOString(),
            upgrades: blueprint,
            learning_biases: learningResult.newWeights
        };

        // 4. WRITE DOCS
        await documentationService.logUpgradeProposal({ blueprint, health_snapshot: health.health_score });

        return plan;

    } catch (e: any) {
        console.error("Evolution Planning Failed:", e.message);
        return {
            health_score: 0,
            generated_at: new Date().toISOString(),
            upgrades: [],
            learning_biases: learningResult.newWeights
        };
    }
  }

  async getLatestPlan(): Promise<EvolutionPlanResult> {
      const res = await pool.query(`
        SELECT * FROM system_evolution_plans
        ORDER BY generated_at DESC LIMIT 1
      `);
      
      const weights = await evolutionLoopController.getActiveBiases();
      
      if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
              generated_at: row.generated_at.toISOString(),
              health_score: row.current_health_score,
              upgrades: typeof row.upgrades === 'string' ? JSON.parse(row.upgrades) : row.upgrades,
              learning_biases: weights
          };
      }

      // Default Empty State (Prevents null errors)
      return {
          generated_at: new Date(0).toISOString(), // Epoc 0 to force regen
          health_score: 0,
          upgrades: [],
          learning_biases: weights
      };
  }
  
  async getActiveBiases() {
      return await evolutionLoopController.getActiveBiases();
  }
}

export default new EvolutionEngine();
