// CJ Dropshipping enforces a hard 1 request/second limit per account across
// all endpoints (auth included). Every user-facing request in this backend
// shares one CJ account, so without serialization, two concurrent visitors
// will trip CJ's QPS limit and see spurious 429s. This queue spaces outbound
// CJ calls at least MIN_INTERVAL_MS apart, in call order.

const MIN_INTERVAL_MS = Number(process.env.CJ_MIN_INTERVAL_MS) || 1000;

let queue = Promise.resolve();
let lastCallAt = 0;

function throttledCjCall(fn) {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return fn();
  });

  // Keep the queue alive even if this call fails, but don't let this
  // handler's own rejection propagate into the shared chain.
  queue = run.catch(() => {});

  return run;
}

module.exports = { throttledCjCall };
