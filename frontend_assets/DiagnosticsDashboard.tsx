import React, { useState, useEffect } from 'react';

// Types
interface IngestStatus {
  source: string;
  lastRun: string;
  count: number;
  status: 'OK' | 'ERROR' | 'PENDING';
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function DiagnosticsDashboard() {
  const [ingestStats, setIngestStats] = useState<IngestStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [fmpHealth, setFmpHealth] = useState<any>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

  // API Calls
  const runIngest = async (endpoint: string, label: string) => {
    addLog(`Triggering ${label}...`);
    try {
      const res = await fetch(`${API_URL}/ingest/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': localStorage.getItem('token') || '' }
      });
      const data = await res.json();
      
      if (data.success) {
        addLog(`✅ ${label}: Processed ${data.recordsProcessed} items`);
        updateStat(label, data.recordsProcessed, 'OK');
      } else {
        addLog(`❌ ${label} Failed: ${data.error}`);
        updateStat(label, 0, 'ERROR');
      }
    } catch (e: any) {
      addLog(`❌ Network Error: ${e.message}`);
    }
  };

  const checkFmp = async () => {
    addLog('Checking FMP Connection...');
    try {
      const res = await fetch(`${API_URL}/health/fmp`);
      const data = await res.json();
      setFmpHealth(data);
      addLog(data.ok ? '🟢 FMP Online' : '🔴 FMP Offline');
    } catch (e) {
      addLog('🔴 FMP Check Failed');
    }
  };

  const updateStat = (source: string, count: number, status: 'OK' | 'ERROR') => {
    setIngestStats(prev => {
      const filtered = prev.filter(p => p.source !== source);
      return [...filtered, { source, count, status, lastRun: new Date().toLocaleTimeString() }];
    });
  };

  // UI Components
  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6">System Diagnostics & Ingestion</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Ingestion Control */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl mb-4 font-semibold text-blue-400">Data Pipelines</h2>
          <div className="space-y-2">
            <IngestBtn label="Market News" onClick={() => runIngest('news', 'News')} />
            <IngestBtn label="Insider Trades" onClick={() => runIngest('insider', 'Insider')} />
            <IngestBtn label="Institutional" onClick={() => runIngest('institutional', 'Institutional')} />
            <IngestBtn label="Economic Macro" onClick={() => runIngest('economic', 'Macro')} />
            <IngestBtn label="Options Flow" onClick={() => runIngest('options', 'Options')} />
            <div className="h-px bg-gray-700 my-2"></div>
            <IngestBtn label="Social (Reddit/X)" onClick={() => runIngest('reddit', 'Social')} />
            <IngestBtn label="SEC Filings" onClick={() => runIngest('sec', 'SEC')} />
          </div>
        </div>

        {/* 2. Status Matrix */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl mb-4 font-semibold text-green-400">System Health</h2>
          
          {/* FMP Status */}
          <div className="mb-4 p-3 bg-gray-900 rounded">
            <div className="flex justify-between items-center">
              <span>FMP API Connection</span>
              <button onClick={checkFmp} className="text-xs bg-blue-600 px-2 py-1 rounded">Test</button>
            </div>
            <div className="mt-2 text-sm text-gray-400">
              Status: {fmpHealth?.ok ? <span className="text-green-400">CONNECTED</span> : <span className="text-red-400">DISCONNECTED</span>} <br/>
              Key Prefix: {fmpHealth?.keyPrefix || '---'} <br/>
              Last Endpoint: {fmpHealth?.endpoint || 'None'}
            </div>
          </div>

          {/* Recent Stats */}
          <div className="space-y-2">
            {ingestStats.map(s => (
              <div key={s.source} className="flex justify-between text-sm border-b border-gray-700 pb-1">
                <span>{s.source}</span>
                <span className={s.status === 'OK' ? 'text-green-400' : 'text-red-400'}>
                  {s.count} items ({s.lastRun})
                </span>
              </div>
            ))}
            {ingestStats.length === 0 && <div className="text-gray-500 text-sm italic">No ingestion run yet.</div>}
          </div>
        </div>

        {/* 3. Live Logs */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 md:col-span-1">
          <h2 className="text-xl mb-4 font-semibold text-yellow-400">Live Logs</h2>
          <div className="h-64 overflow-y-auto font-mono text-xs bg-black p-3 rounded border border-gray-700">
            {logs.map((l, i) => (
              <div key={i} className="mb-1 text-gray-300">{l}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

const IngestBtn = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition flex justify-between items-center"
  >
    <span>{label}</span>
    <span className="text-xs text-gray-400">Run ➜</span>
  </button>
);
