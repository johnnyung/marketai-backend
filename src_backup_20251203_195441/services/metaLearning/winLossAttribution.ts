// Wraps WDIWA to identify drivers
export const winLossAttribution = {
    async analyze(trades: any[]) {
        const attribution: Record<string, number> = {};
        trades.forEach(t => {
            const signals = t.agent_signals || {};
            // Simple attribution: If signal matched outcome, give points
            Object.keys(signals).forEach(key => {
                if (!attribution[key]) attribution[key] = 0;
                // Logic simplified for wrapper
                if (t.result_outcome === 'WIN') attribution[key] += 1;
                else attribution[key] -= 1;
            });
        });
        return attribution;
    }
};
