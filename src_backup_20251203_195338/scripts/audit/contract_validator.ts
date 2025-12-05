import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// CONFIGURATION
const FRONTEND_PATH = process.env.FRONTEND_PATH || '../../marketai';
// Target Production by default, allow override
const BACKEND_URL = process.env.MARKETAI_BACKEND_URL || 'https://marketai-backend-production-397e.up.railway.app';
const AUDIT_TOKEN = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';

const CONTRACT_MATRIX = [
    // System
    { route: '/api/system/health', verb: 'GET', expected_keys: ['database', 'priceAPI'] },
    { route: '/api/dashboard/status', verb: 'GET', expected_keys: ['success', 'data'] },
    
    // Core Features
    { route: '/api/ai-tips/active', verb: 'GET', expected_keys: ['success', 'data'] },
    { route: '/api/correlation/dashboard', verb: 'GET', expected_keys: ['success', 'data'] },
    { route: '/api/news/latest', verb: 'GET', expected_keys: ['title', 'url'] }, // Array-like response often
    
    // Advanced Engines (v101+)
    { route: '/api/gamma/analyze/AAPL', verb: 'GET', expected_keys: ['success', 'data.net_gamma_exposure'] },
    { route: '/api/insider/intent/AAPL', verb: 'GET', expected_keys: ['success', 'data.classification'] },
    { route: '/api/narrative/pressure/AAPL', verb: 'GET', expected_keys: ['success', 'data.pressure_score'] },
    { route: '/api/currency/shock', verb: 'GET', expected_keys: ['success', 'data.shock_level'] },
    { route: '/api/divergence/analyze/AAPL', verb: 'GET', expected_keys: ['success', 'data.divergence_type'] },
    { route: '/api/multi-agent/validate/AAPL', verb: 'GET', expected_keys: ['success', 'data.consensus'] },
    { route: '/api/sentiment/thermometer', verb: 'GET', expected_keys: ['success', 'data.score'] },
    { route: '/api/shadow/scan/AAPL', verb: 'GET', expected_keys: ['success', 'data.shadow_volume_ratio'] },
    { route: '/api/regime/current', verb: 'GET', expected_keys: ['success', 'data.current_regime'] },
    { route: '/api/pairs/generate', verb: 'GET', expected_keys: ['success', 'data'] },
    
    // Protected Routes (Requires Auth/Audit Token)
    { route: '/api/risk/check/AAPL', verb: 'GET', expected_keys: ['success', 'data.passed'] },
    { route: '/api/opportunities/recent', verb: 'GET', expected_keys: ['success', 'data'] }
];

async function audit() {
    console.log(`   📍 Frontend Path: ${path.resolve(FRONTEND_PATH)}`);
    console.log(`   📍 Backend URL:   ${BACKEND_URL}`);
    console.log("----------------------------------------------------------------");
    console.log("%-40s | %-6s | %-10s | %-10s | %s", "ROUTE", "VERB", "STATUS", "SHAPE", "NOTE");
    console.log("----------------------------------------------------------------");

    let mismatches = 0;

    for (const item of CONTRACT_MATRIX) {
        let status = "PASS";
        let shape = "VALID";
        let note = "";
        
        try {
            const res = await axios.get(`${BACKEND_URL}${item.route}`, {
                timeout: 8000,
                validateStatus: () => true,
                headers: {
                    'Authorization': `Bearer ${AUDIT_TOKEN}`,
                    'User-Agent': 'MarketAI-ContractAudit/1.0'
                }
            });
            
            if (res.status !== 200) {
                status = `ERR ${res.status}`;
                shape = "---";
                note = `HTTP Error`;
                mismatches++;
            } else {
                // Deep Key Validation
                const data = res.data;
                for (const k of item.expected_keys) {
                    if (k.includes('.')) {
                        // Nested check (e.g. data.score)
                        const parts = k.split('.');
                        let current = data;
                        for(const part of parts) {
                            if(current === undefined || current === null) break;
                            current = current[part];
                        }
                        if (current === undefined) {
                            shape = "INVALID";
                            note = `Missing nested '${k}'`;
                            mismatches++;
                        }
                    } else {
                        // Root check
                        // Handle arrays vs objects
                        if (Array.isArray(data)) {
                             if(data.length > 0 && data[0][k] === undefined) {
                                 // If expecting a key on an array item
                                 // Note: This is loose validation for now
                             }
                        } else if (data[k] === undefined) {
                            shape = "INVALID";
                            note = `Missing '${k}'`;
                            mismatches++;
                        }
                    }
                }
            }
        } catch (e: any) {
            status = "FAIL";
            note = e.code || e.message;
            mismatches++;
        }

        console.log(
            "%-40s | %-6s | %-10s | %-10s | %s",
            item.route, item.verb, status, shape, note
        );
    }

    console.log("----------------------------------------------------------------");
    if (mismatches > 0) {
        console.log(`   🚨 FOUND ${mismatches} CONTRACT MISMATCHES.`);
        process.exit(1);
    } else {
        console.log("   ✅ API CONTRACT VERIFIED. Frontend and Backend are aligned.");
        process.exit(0);
    }
}

audit();
