import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, ShieldAlert, Lock } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function TopOpportunities() {
  const [activeTab, setActiveTab] = useState('STOCKS');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPicks = async (type: string) => {
    setLoading(true);
    try {
        // Using standard endpoint with query params (Backend Phase 45 will handle params properly)
        // For now, it returns the main list, but UI is ready for segmentation
        const res = await fetch(`${API_URL}/ai-tips/top3?category=${type.toLowerCase()}`, {
             headers: { 'Authorization': localStorage.getItem('token') || '' }
        });
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchPicks(activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'STOCKS', label: 'Top Stocks', icon: <TrendingUp size={16} /> },
    { id: 'CRYPTO', label: 'Crypto Assets', icon: <ArrowRight size={16} /> }, // Icon placeholder
    { id: 'RISK', label: 'High Risk', icon: <ShieldAlert size={16} /> },
    { id: 'INSIDER', label: 'Insider Plays', icon: <Lock size={16} /> },
  ];

  return (
    <div className="p-6 bg-black min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6">Top Opportunities</h1>
        
        {/* TABS */}
        <div className="flex gap-2 mb-8 border-b border-gray-800 pb-1">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 flex items-center gap-2 font-medium transition-all rounded-t-lg ${
                        activeTab === tab.id
                        ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* CONTENT */}
        {loading ? (
            <div className="text-center py-20 text-gray-500 animate-pulse">Analyzing Market Data...</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.map((item, idx) => (
                    <OpportunityCard key={idx} data={item} />
                ))}
                {data.length === 0 && <div className="text-gray-500">No opportunities found for this category.</div>}
            </div>
        )}
    </div>
  );
}

function OpportunityCard({ data }: { data: any }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all group">
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white">{data.ticker}</h3>
                        <p className="text-xs text-gray-400">{data.sector}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono text-green-400">${data.current_price}</div>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded ${data.score > 70 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                            SCORE: {data.score}
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Conviction</span>
                        <span className="text-white font-medium">{data.conviction}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Primary Driver</span>
                        <span className="text-blue-300 font-medium">{data.reason}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Target (T1)</span>
                        <span className="text-green-400 font-mono">${data.trade_plan?.target || '---'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Stop Loss</span>
                        <span className="text-red-400 font-mono">${data.trade_plan?.stop_loss || '---'}</span>
                    </div>
                </div>

                <p className="text-xs text-gray-400 italic border-t border-gray-800 pt-3">
                    {data.explanation}
                </p>
            </div>
            <div className="bg-gray-800 p-3 text-center text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                VIEW FULL ANALYSIS
            </div>
        </div>
    );
}
