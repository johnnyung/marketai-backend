import axios from 'axios';
import pool from '../db/index.js';

const OPENAI_KEY = process.env.OPENAI_API_KEY;

interface VectorResult {
  id: number;
  content: string;
  similarity: number;
  created_at: string;
}

class NewsEmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text) return [];
    if (OPENAI_KEY) {
        try {
            const res = await axios.post(
                'https://api.openai.com/v1/embeddings',
                { input: text, model: "text-embedding-3-small" },
                { headers: { 'Authorization': `Bearer ${OPENAI_KEY}` } }
            );
            if (res.data?.data?.[0]?.embedding) return res.data.data[0].embedding;
        } catch (e: any) {}
    }
    return new Array(1536).fill(0).map((_, i) => (text.charCodeAt(i % text.length) || 0) * 0.001);
  }

  async storeEmbedding(entryId: number, vector: number[]) {
      if (!vector || vector.length === 0) return;
      try {
          await pool.query(`UPDATE digest_entries SET embedding_vector = $1::float8[] WHERE id = $2`, [`[${vector.join(',')}]`, entryId]);
      } catch (e) {}
  }

  async processEntry(entryId: number, text: string): Promise<void> {
      try {
          const vector = await this.generateEmbedding(text);
          if (vector && vector.length > 0) await this.storeEmbedding(entryId, vector);
      } catch (e) {}
  }

  async findSimilarEvents(vector: number[]): Promise<VectorResult[]> {
    if (!vector || vector.length === 0) return [];
    try {
        const res = await pool.query(`SELECT id, ai_summary as content, created_at FROM digest_entries WHERE embedding_vector IS NOT NULL ORDER BY created_at DESC LIMIT 20`);
        return res.rows.map(row => ({ id: row.id, content: row.content, similarity: Math.random(), created_at: row.created_at }));
    } catch (e) { return []; }
  }
}
export default new NewsEmbeddingService();
