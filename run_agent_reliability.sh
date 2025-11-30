#!/bin/bash
# Run from cron: 0 4 * * 0 /path/to/run_agent_reliability.sh (Weekly)
cd "$(dirname "$0")"
echo "Starting MarketAI Agent Reliability Scan: $(date)" >> reliability.log
npx tsx src/scripts/runAgentReliabilityJob.ts >> reliability.log 2>&1
