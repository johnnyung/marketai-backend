// src/jobs/tipRefreshJob.ts
// Simple job runner for aggressive AI Tip refresh

import aiTipGenerator from "../services/aiTipGenerator.js";

async function run() {
  console.log("🕒 Tip Refresh Job — start");
  const { insertedTips, updatedTips } =
    await aiTipGenerator.generateComprehensiveTips();

  console.log(
    `🧠 Tip Refresh Job — done. Inserted=${insertedTips.length}, Updated=${updatedTips.length}`
  );
}

run()
  .catch((err) => {
    console.error("❌ Tip Refresh Job failed", err);
    process.exit(1);
  })
  .finally(() => {
    // just exit
    process.exit(0);
  });
