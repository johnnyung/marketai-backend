#!/bin/bash
# Run from cron: 0 2 * * * /path/to/run_nightly_review.sh
cd "$(dirname "$0")"
echo "Starting MarketAI Nightly Review: $(date)" >> review.log
npx tsx src/scripts/runPredictionReviewJob.ts >> review.log 2>&1
