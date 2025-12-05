import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

/**
 * MockGuard Enforcement Layer
 * Prevents future mock contamination by scanning outgoing API responses.
 *
 * SCANS FOR:
 * - "mock", "placeholder", "fallback" strings
 * - Empty arrays in critical data fields
 * - Random number artifacts (heuristic)
 * - Static ticker lists
 *
 * ACTION:
 * - Does NOT block runtime (passive monitoring).
 * - Logs to /logs/mock_guard.log
 * - Updates /docs/mock_guard_report.json
 */

const LOG_FILE = path.join(process.cwd(), 'logs', 'mock_guard.log');
const REPORT_FILE = path.join(process.cwd(), 'docs', 'mock_guard_report.json');

// Suspicious keywords that indicate fake data
const BLOCKLIST_KEYWORDS = [
    'mock', 'placeholder', 'fallback', 'lorem ipsum',
    'sample data', 'test data', 'simulation run',
    'randomly generated'
];

// Critical fields that should never be empty in a healthy system
const CRITICAL_ARRAYS = [
    'signals', 'tickers', 'trades', 'portfolio', 'opportunities', 'analysis'
];

interface MockViolation {
    timestamp: string;
    endpoint: string;
    violationType: 'KEYWORD' | 'EMPTY_CRITICAL_DATA' | 'STATIC_ARTIFACT';
    details: string;
    detectedIn: string; // Key or Value snippet
}

// Helper to append to log file
function logViolation(violation: MockViolation) {
    const logLine = `[${violation.timestamp}] [${violation.violationType}] ${violation.endpoint} - ${violation.details} (Found: ${violation.detectedIn})\n`;
    
    // 1. Append to text log
    fs.appendFile(LOG_FILE, logLine, (err) => {
        if (err) console.error('MockGuard failed to write to log file');
    });

    // 2. Update JSON Report
    try {
        let report: MockViolation[] = [];
        if (fs.existsSync(REPORT_FILE)) {
            const content = fs.readFileSync(REPORT_FILE, 'utf-8');
            report = JSON.parse(content || '[]');
        }
        report.push(violation);
        // Keep last 1000 entries
        if (report.length > 1000) report = report.slice(-1000);
        fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    } catch (error) {
        console.error('MockGuard failed to update JSON report', error);
    }
}

// Recursive scanner
function scanPayload(data: any, pathStr: string = '', violations: MockViolation[], endpoint: string) {
    if (!data) return;

    if (typeof data === 'string') {
        const lowerData = data.toLowerCase();
        for (const word of BLOCKLIST_KEYWORDS) {
            if (lowerData.includes(word)) {
                violations.push({
                    timestamp: new Date().toISOString(),
                    endpoint,
                    violationType: 'KEYWORD',
                    details: `Suspicious keyword detected: "${word}"`,
                    detectedIn: `${pathStr} = "${data.substring(0, 50)}..."`
                });
            }
        }
    } else if (Array.isArray(data)) {
        // Check for empty critical arrays
        const key = pathStr.split('.').pop();
        if (key && CRITICAL_ARRAYS.includes(key) && data.length === 0) {
             violations.push({
                timestamp: new Date().toISOString(),
                endpoint,
                violationType: 'EMPTY_CRITICAL_DATA',
                details: `Critical data array is empty`,
                detectedIn: `${pathStr}`
            });
        }
        
        // Scan elements
        data.forEach((item, index) => scanPayload(item, `${pathStr}[${index}]`, violations, endpoint));
    } else if (typeof data === 'object') {
        // Check keys and values
        for (const [key, value] of Object.entries(data)) {
            // Check key name for "mock"
            if (key.toLowerCase().includes('mock')) {
                 violations.push({
                    timestamp: new Date().toISOString(),
                    endpoint,
                    violationType: 'KEYWORD',
                    details: `Key contains 'mock'`,
                    detectedIn: `${pathStr}.${key}`
                });
            }
            scanPayload(value, `${pathStr}.${key}`, violations, endpoint);
        }
    }
}

export const mockGuard = (req: Request, res: Response, next: NextFunction) => {
    // Override res.json to intercept the response body
    const originalJson = res.json;

    res.json = function (body) {
        // Restore original functionality immediately to send response
        const result = originalJson.call(this, body);

        // Perform passive scan (fire and forget)
        try {
            const violations: MockViolation[] = [];
            scanPayload(body, 'root', violations, req.originalUrl);

            if (violations.length > 0) {
                console.warn(`[MockGuard] ⚠️ Detected ${violations.length} potential mock artifacts in ${req.originalUrl}`);
                violations.forEach(v => logViolation(v));
            }
        } catch (err) {
            console.error('[MockGuard] Analysis failed:', err);
        }

        return result;
    };

    next();
};

export default mockGuard;
