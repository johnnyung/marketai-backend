import 'dotenv/config';
import newsEmbeddingService from '../../services/newsEmbeddingService.js';

async function run() {
  try {
    console.log("🔐 Testing Security & Embeddings...");
    await newsEmbeddingService.processEntry(0, "Test market data");
    const vector = await newsEmbeddingService.generateEmbedding("Test");
    if(!vector || vector.length === 0) throw new Error("Vector gen failed");
    console.log("✅ Security & AI Verified");
  } catch (e: any) {
    console.error("❌ Security/AI Failed:", e.message);
    process.exit(1);
  }
}
run();
