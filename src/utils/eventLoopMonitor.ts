export function startEventLoopMonitor() {
  let lastCheck = Date.now();
  
  setInterval(() => {
    const now = Date.now();
    const lag = now - lastCheck - 1000; // Expected 1000ms interval
    
    if (lag > 250) {
      console.warn(`⚠️  EVENT LOOP LAG: ${lag}ms (System under load)`);
    }
    
    lastCheck = now;
  }, 1000);
  
  console.log("   👀 Event Loop Monitor Active");
}
