export const metaRiskMonitor = {
    assess(weights: any) {
        // If any weight > 1.4, risk of overfitting is HIGH
        const overfit = Object.values(weights).some((w: any) => w > 1.4);
        return { overfit_risk: overfit ? 'HIGH' : 'LOW' };
    }
};
