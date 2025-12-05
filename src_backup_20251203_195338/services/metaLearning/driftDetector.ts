export const driftDetector = {
    detect(currentWeights: any, newWeights: any) {
        const drift: any = {};
        for (const k in newWeights) {
            if (Math.abs(currentWeights[k] - newWeights[k]) > 0.2) {
                drift[k] = 'HIGH_DRIFT';
            }
        }
        return drift;
    }
};
