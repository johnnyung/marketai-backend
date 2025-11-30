#!/bin/bash
echo "🚀 RUNNING FULL MODULAR TEST SUITE (v113.0-F2)..."

npx tsx src/scripts/audit/test_1_engine_activation.ts
npx tsx src/scripts/audit/test_2_route_wiring.ts
npx tsx src/scripts/audit/test_3_db_schema.ts
npx tsx src/scripts/audit/test_4_ingestion_health.ts
npx tsx src/scripts/audit/test_5_portfolio_ai.ts
npx tsx src/scripts/audit/test_6_catalyst_hunter.ts
npx tsx src/scripts/audit/test_7_universe_expansion.ts
npx tsx src/scripts/audit/test_8_ui_routes.ts
npx tsx src/scripts/audit/test_9_mobile_ui.ts

echo "🏁 ALL TESTS COMPLETE."
