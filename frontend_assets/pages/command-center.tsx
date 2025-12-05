import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Play, Activity, Database, Globe, Shield, Cpu } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function CommandCenter() {
  const [status, setStatus] = useState('IDLE'); // IDLE, INGESTING, ANALYZING, COMPLETE, ERROR
  const [logs, setLogs] = useState<string[]>([]);
  const [macroSummary, setMacroSummary] = useState<any>(null);
  const [topPicksPreview, setTopPicksPreview] = useState<any[]>([]);

  // Source States
  const [sources, setSources] = useState({
    fmp: { status: 'idle', label: 'FMP Stable Feed' },
    news: { status: 'idle', label: 'Global News' },
    gov: { status: 'idle', label: 'Gov & Senate' },
    crypto: { status: 'idle', label: 'Crypto/Whales' },
    social: { status: 'idle', label: 'Social Sentiment' },
    macro: { status: 'idle', label: 'Macro Indicators' }
  });

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const runPipeline = async () => {
    if (status === 'INGESTING' || status === 'ANALYZING') return;
    
    try {
      // STEP 1: INGESTION
      setStatus('INGESTING');
      addLog('🚀 Starting Master Ingestion Cycle...');
      
      // Visual update
      setSources(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => next[k].status = 'ingesting');
        return next;
      });

      const ingestRes = await fetch(`${API_URL}/ingest/run-all`, { method: 'POST' });
      const ingestData = await ingestRes.json();
      
      if (ingestData.success) {
         addLog(`✅ Ingestion Complete. Processed batch.`);
         setSources(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(k => next[k].status = 'complete');
            return next;
         });
      } else {
         throw new Error(ingestData.error || 'Ingestion failed');
      }

      // STEP 2: ANALYSIS
      setStatus('ANALYZING');
      addLog('🧠 Running Deep Brain Analysis...');
      
      const analyzeRes = await fetch(`${API_URL}/analysis/analyze`, { method: 'POST' });
      const analyzeData = await analyzeRes.json();

      if (analyzeData.success) {
          setMacroSummary(analyzeData.macro_summary);
          setTopPicksPreview(analyzeData.top_opportunities);
          addLog('✅ Analysis Complete. Signals Updated.');
          setStatus('COMPLETE');
      } else {
          throw new Error(analyzeData.error);
      }

    } catch (e: any) {
      setStatus('ERROR');
      addLog(`❌ Pipeline Failed: ${e.message}`);
      setSources(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => next[k].status = 'error');
        return next;
      });
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'ingesting': return 'bg-yellow-900/50 border-yellow-500 text-yellow-200 animate-pulse';
      case 'analyzing': return 'bg-blue-900/50 border-blue-500 text-blue-200 animate-pulse';
      case 'complete': return 'bg-green-900/50 border-green-500 text-green-200';
      case 'error': return 'bg-red-900/50 border-red-500 text-red-200';
      default: return 'bg-gray-800 border-gray-700 text-gray-400';
    }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white font-sans">
      {/* HEADER & ACTION */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
            <p className="text-gray-400">MarketAI Neural Pipeline Control</p>
        </div>
        <button
            onClick={runPipeline}
            disabled={status === 'INGESTING' || status === 'ANALYZING'}
            className={`px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-3 transition-all ${
                status === 'INGESTING' || status === 'ANALYZING'
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]'
            }`}
        >
            {status === 'IDLE' || status === 'COMPLETE' || status === 'ERROR' ? <Play size={24} /> : <Activity className="animate-spin" size={24} />}
            {status === 'IDLE' ? 'RUN FULL BRAIN CYCLE' : status}
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div className="flex gap-2 mb-8">
        <div className={`h-2 rounded flex-1 transition-all ${status === 'INGESTING' || status === 'ANALYZING' || status === 'COMPLETE' ? 'bg-yellow-500' : 'bg-gray-800'}`}></div>
        <div className={`h-2 rounded flex-1 transition-all ${status === 'ANALYZING' || status === 'COMPLETE' ? 'bg-blue-500' : 'bg-gray-800'}`}></div>
        <div className={`h-2 rounded flex-1 transition-all ${status === 'COMPLETE' ? 'bg-green-500' : 'bg-gray-800'}`}></div>
      </div>

      {/* LIVE SOURCES GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {Object.values(sources).map((s, i) => (
            <div key={i} className={`p-4 rounded-lg border transition-all ${getStatusColor(s.status)}`}>
                <div className="flex justify-between items-start mb-2">
                    <Database size={18} />
                    <div className="h-2 w-2 rounded-full bg-current"></div>
                </div>
                <h3 className="font-semibold text-sm">{s.label}</h3>
                <p className="text-xs opacity-70 mt-1">{s.status.toUpperCase()}</p>
            </div>
        ))}
      </div>

      {/* INTELLIGENCE PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MACRO */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Globe className="text-purple-400"/> Macro Regime</h2>
            {macroSummary ? (
                <div>
                    <div className="text-2xl font-mono text-purple-300 mb-2">{macroSummary.regime}</div>
                    <p className="text-gray-400 text-sm mb-4">{macroSummary.summary || 'Loading summary...'}</p>
                    <div className="flex gap-2">
                        <span className="px-2 py-1 bg-gray-800 rounded text-xs">Score: {macroSummary.score}</span>
                        <span className="px-2 py-1 bg-gray-800 rounded text-xs">GDP: {macroSummary.details?.growth?.gdp || 0}%</span>
                    </div>
                </div>
            ) : (
                <div className="text-gray-600 italic">Run pipeline to generate macro analysis.</div>
            )}
        </div>

        {/* CATALYST */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Shield className="text-orange-400"/> Active Catalysts</h2>
            <div className="space-y-3">
                <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-orange-500">
                    <h4 className="font-bold text-sm">Earnings Season</h4>
                    <p className="text-xs text-gray-400">High volatility expected in Tech sector.</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-bold text-sm">Fed Rate Decision</h4>
                    <p className="text-xs text-gray-400">Upcoming FOMC meeting next week.</p>
                </div>
            </div>
        </div>

        {/* TOP PICKS */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Cpu className="text-green-400"/> Top Opportunities</h2>
            {topPicksPreview.length > 0 ? (
                <div className="space-y-2">
                    {topPicksPreview.map((pick, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer">
                            <div>
                                <span className="font-bold text-green-400">{pick.ticker}</span>
                                <span className="text-xs text-gray-400 ml-2">{pick.company_name}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-sm">{pick.score}/100</div>
                                <div className="text-[10px] text-gray-500">{pick.signal}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-gray-600 italic">Run pipeline to generate picks.</div>
            )}
        </div>

      </div>
      
      {/* LOGS */}
      <div className="mt-8 p-4 bg-gray-900 rounded-lg font-mono text-xs h-48 overflow-y-auto border border-gray-800">
        {logs.map((l, i) => <div key={i} className="text-gray-400 mb-1">{l}</div>)}
        {logs.length === 0 && <span className="text-gray-600">System Ready. Waiting for command.</span>}
      </div>
    </div>
  );
}
