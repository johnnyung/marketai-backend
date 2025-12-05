import React, { useState } from 'react';
import { Plus, Trash, Play } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function PortfolioAnalyzer() {
  const [positions, setPositions] = useState<{ticker: string, shares: number, entry: number}[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newEntry, setNewEntry] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const addPosition = () => {
    if (newTicker && newShares) {
        setPositions([...positions, { ticker: newTicker.toUpperCase(), shares: Number(newShares), entry: Number(newEntry) || 0 }]);
        setNewTicker(''); setNewShares(''); setNewEntry('');
    }
  };

  const removePosition = (idx: number) => {
      const next = [...positions];
      next.splice(idx, 1);
      setPositions(next);
  };

  const runAnalysis = async () => {
      setLoading(true);
      try {
          const res = await fetch(`${API_URL}/portfolio/analyze`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': localStorage.getItem('token') || ''
              },
              body: JSON.stringify({ positions: positions.map(p => ({ ticker: p.ticker, shares: p.shares, entry_price: p.entry })) })
          });
          const json = await res.json();
          setResults(json);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6">Portfolio Analyzer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* INPUT FORM */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                    <h2 className="font-bold mb-4 text-lg">Add Positions</h2>
                    <div className="space-y-3">
                        <input
                            className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white"
                            placeholder="Ticker (e.g. AAPL)"
                            value={newTicker} onChange={e => setNewTicker(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white"
                                placeholder="Shares" type="number"
                                value={newShares} onChange={e => setNewShares(e.target.value)}
                            />
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white"
                                placeholder="Avg Cost" type="number"
                                value={newEntry} onChange={e => setNewEntry(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={addPosition}
                            className="w-full bg-gray-700 hover:bg-gray-600 p-3 rounded font-bold flex items-center justify-center gap-2"
                        >
                            <Plus size={16}/> Add Position
                        </button>
                    </div>

                    <div className="mt-6 space-y-2">
                        {positions.map((p, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-800 p-3 rounded">
                                <div><span className="font-bold">{p.ticker}</span> <span className="text-gray-400 text-sm">{p.shares} shares @ ${p.entry}</span></div>
                                <button onClick={() => removePosition(i)} className="text-red-400 hover:text-red-300"><Trash size={16}/></button>
                            </div>
                        ))}
                        {positions.length === 0 && <div className="text-gray-500 text-sm text-center">No positions added.</div>}
                    </div>

                    <button
                        onClick={runAnalysis}
                        disabled={positions.length === 0 || loading}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 p-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? 'Analyzing...' : <><Play size={20}/> Analyze Portfolio</>}
                    </button>
                </div>
            </div>

            {/* RESULTS */}
            <div className="lg:col-span-2">
                {results ? (
                    <div className="space-y-6">
                        {/* SUMMARY */}
                        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 grid grid-cols-3 gap-4">
                            <div>
                                <div className="text-gray-400 text-sm">Total Value</div>
                                <div className="text-2xl font-mono font-bold">${results.summary.total_value.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-sm">Health Score</div>
                                <div className={`text-2xl font-bold ${results.summary.health_score > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {results.summary.health_score}/100
                                </div>
                            </div>
                            <div>
                                <div className="text-gray-400 text-sm">Risk Level</div>
                                <div className="text-2xl font-bold text-white">{results.summary.risk_level}</div>
                            </div>
                        </div>

                        {/* POSITIONS */}
                        <div className="space-y-4">
                            {results.positions.map((pos: any, i: number) => (
                                <div key={i} className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <div className="flex items-baseline gap-3">
                                            <h3 className="text-xl font-bold">{pos.ticker}</h3>
                                            <span className={`text-sm px-2 rounded ${pos.signal === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                                {pos.recommendation}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-400 mt-1">
                                            Score: {pos.score} | P/L: <span className={pos.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}>${pos.unrealized_pnl.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-8 text-sm">
                                        <div>
                                            <div className="text-gray-500">Target</div>
                                            <div className="font-mono text-green-400">${pos.trade_plan?.target || '---'}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-500">Stop</div>
                                            <div className="font-mono text-red-400">${pos.trade_plan?.stop_loss || '---'}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">
                        Add positions and run analysis to see results.
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
