import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve root from src/utils/ -> ../../
const root = path.resolve(__dirname, '../../');

console.log(`[ENV_LOADER] Loading env from: ${root}`);

// Load .env (Defaults)
dotenv.config({ path: path.join(root, '.env') });

// Load .env.local (Overrides - mostly for Local Dev)
dotenv.config({ path: path.join(root, '.env.local') });

export const ENV_LOADED = !!process.env.FMP_API_KEY;
export const FMP_KEY = process.env.FMP_API_KEY || '';

if (ENV_LOADED) {
    console.log(`[ENV_LOADER] Success: FMP_API_KEY found (${FMP_KEY.substring(0,5)}...)`);
} else {
    console.error('[ENV_LOADER] Error: FMP_API_KEY missing in process.env');
}
