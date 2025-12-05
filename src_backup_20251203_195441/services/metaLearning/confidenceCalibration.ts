export const confidenceCalibration = {
    calibrate(avgConfidence: number, actualWinRate: number) {
        const drift = avgConfidence - actualWinRate;
        // If drift > 0, we are overconfident. Reduce.
        // If drift < 0, we are underconfident. Boost.
        return 1.0 - (drift / 200); // Dampened factor
    }
};
