export const withTimeout = <T>(promise: Promise<T>, ms: number, engineName: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout: ${engineName} took >${ms}ms`)), ms)
        )
    ]);
};
