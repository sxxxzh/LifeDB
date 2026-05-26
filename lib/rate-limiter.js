class RateLimiter {
  constructor(maxQPS = 10) {
    this.interval = Math.max(100, 1000 / maxQPS);
    this.lastRequest = 0;
    this.requestsThisSecond = 0;
    this.secondStart = 0;
    this.maxQPS = maxQPS;
  }

  async throttle() {
    const now = Date.now();

    if (!this.secondStart || now - this.secondStart >= 1000) {
      this.secondStart = now;
      this.requestsThisSecond = 0;
    }

    if (this.requestsThisSecond >= this.maxQPS) {
      const wait = this.secondStart + 1000 - now;
      if (wait > 0) {
        await new Promise(resolve => setTimeout(resolve, wait));
      }
      this.secondStart = Date.now();
      this.requestsThisSecond = 0;
    }

    const timeSinceLast = now - this.lastRequest;
    if (timeSinceLast < this.interval) {
      await new Promise(resolve => setTimeout(resolve, this.interval - timeSinceLast));
    }

    this.lastRequest = Date.now();
    this.requestsThisSecond++;
  }
}

module.exports = { RateLimiter };
