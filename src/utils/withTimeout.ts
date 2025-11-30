export async function withTimeout<T>(
  promise: Promise<T>,
  label: string = 'Operation',
  ms: number = 6000
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error(`⏱️  TIMEOUT: ${label} exceeded ${ms}ms`);
      reject(new Error(`TIMEOUT: ${label} exceeded ${ms}ms`));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}
