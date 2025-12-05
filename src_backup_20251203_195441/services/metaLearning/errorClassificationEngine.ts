export const errorClassificationEngine = {
    classify(losses: any[]) {
        return { timing_errors: 0, direction_errors: losses.length, sizing_errors: 0 };
    }
};
