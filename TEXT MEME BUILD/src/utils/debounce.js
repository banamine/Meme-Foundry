/**
 * Meme Foundry - Debounce & Throttle Utilities
 * Performance optimization helpers
 */

/**
 * Creates a debounced function that delays invoking func
 * until after wait milliseconds have elapsed since the last time
 * the debounced function was invoked.
 */
export function debounce(func, wait = 250, options = {}) {
  const {
    leading = false,
    trailing = true,
    maxWait = null
  } = options;

  let timeout;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs;
  let lastThis;
  let result;

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== null && timeSinceLastInvoke >= maxWait)
    );
  }

  function invokeFunc(time) {
    lastInvokeTime = time;
    result = func.apply(lastThis, lastArgs);
    lastThis = lastArgs = null;
    return result;
  }

  function trailingEdge(time) {
    timeout = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }

    lastThis = lastArgs = null;
    return result;
  }

  function debounced(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeout === null) {
        if (leading) {
          return invokeFunc(time);
        }
      }

      if (maxWait !== null) {
        timeout = setTimeout(trailingEdge, Math.min(wait, maxWait - (time - lastInvokeTime)));
      } else {
        timeout = setTimeout(trailingEdge, wait);
      }
    }

    if (timeout === null) {
      timeout = setTimeout(trailingEdge, wait);
    }

    return result;
  }

  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastThis = lastArgs = null;
    lastCallTime = 0;
    lastInvokeTime = 0;
  };

  debounced.flush = () => {
    if (timeout !== null) {
      const time = Date.now();
      return trailingEdge(time);
    }
    return result;
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func
 * at most once per every wait milliseconds.
 */
export function throttle(func, wait = 250, options = {}) {
  return debounce(func, wait, {
    leading: true,
    trailing: options.trailing !== false,
    maxWait: wait
  });
}

/**
 * Creates a function that delays execution until the next
 * animation frame.
 */
export function rafThrottle(func) {
  let rafId;
  let lastArgs;
  let lastThis;

  function throttled(...args) {
    lastArgs = args;
    lastThis = this;

    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      func.apply(lastThis, lastArgs);
      lastThis = lastArgs = null;
    });
  }

  throttled.cancel = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

/**
 * Creates a function that only executes once.
 */
export function once(func) {
  let called = false;
  let result;

  return function(...args) {
    if (called) return result;
    called = true;
    result = func.apply(this, args);
    return result;
  };
}

/**
 * Creates a function that delays execution by specified time.
 */
export function delay(func, wait = 0) {
  return function(...args) {
    setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Creates a function that batches calls and executes them
 * with all accumulated arguments.
 */
export function batch(func, wait = 250) {
  let timeout;
  let batchArgs = [];

  function batched(...args) {
    batchArgs.push(args);

    if (!timeout) {
      timeout = setTimeout(() => {
        const allArgs = batchArgs;
        batchArgs = [];
        timeout = null;
        func(allArgs);
      }, wait);
    }
  }

  batched.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      batchArgs = [];
    }
  };

  return batched;
}

/**
 * Creates a rate-limited function that allows execution
 * at most count times per interval.
 */
export function rateLimit(func, count, interval = 1000) {
  const calls = [];
  let timeout;

  function limited(...args) {
    const now = Date.now();
    
    // Remove expired calls
    while (calls.length > 0 && calls[0] <= now - interval) {
      calls.shift();
    }

    if (calls.length < count) {
      calls.push(now);
      return func.apply(this, args);
    }

    // Schedule for later
    const nextSlot = calls[0] + interval;
    const delay = nextSlot - now;

    if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null;
        limited.apply(this, args);
      }, delay);
    }
  }

  limited.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return limited;
}

/**
 * Creates a function that invokes func after the first call
 * and then ignores subsequent calls for the cooldown period.
 */
export function cooldown(func, wait = 1000) {
  let lastCall = 0;

  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Idle callback wrapper (executes when browser is idle)
 */
export function idleDebounce(func, timeout = 2000) {
  let id;

  function debounced(...args) {
    if (id) {
      cancelIdleCallback(id);
    }

    id = requestIdleCallback(() => {
      func.apply(this, args);
    }, { timeout });
  }

  debounced.cancel = () => {
    if (id) {
      cancelIdleCallback(id);
      id = null;
    }
  };

  return debounced;
}

// requestIdleCallback polyfill
function requestIdleCallback(callback, options = {}) {
  if (window.requestIdleCallback) {
    return window.requestIdleCallback(callback, options);
  }
  
  const start = Date.now();
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
    });
  }, 1);
}

function cancelIdleCallback(id) {
  if (window.cancelIdleCallback) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}