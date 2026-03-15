export function scheduleFrame(callback) {
  return window.requestAnimationFrame(callback);
}

export function createRafThrottle(callback) {
  let frameId = 0;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (frameId) return;
    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      const runArgs = lastArgs;
      lastArgs = null;
      callback(...runArgs);
    });
  };
}

export function debounce(callback, delay = 120) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}
