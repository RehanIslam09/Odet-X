/**
 * Lightweight, process-local rate limiter for Socket.IO events per socket.
 * Prevents malicious clients from causing database query amplification or CPU floods.
 */
export class SocketRateLimiter {
  private eventCounts = new Map<string, { count: number; resetAt: number }>();

  /**
   * Checks if an event rate limit is exceeded for a socket and event category.
   * Returns true if allowed, false if limit exceeded.
   */
  public checkLimit(
    socketId: string,
    eventCategory: string,
    maxAllowed: number,
    windowMs: number,
  ): boolean {
    const key = `${socketId}:${eventCategory}`;
    const now = Date.now();

    const record = this.eventCounts.get(key);

    if (!record || now >= record.resetAt) {
      this.eventCounts.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (record.count >= maxAllowed) {
      return false;
    }

    record.count += 1;
    return true;
  }

  /**
   * Removes rate limit records for a disconnected socket.
   */
  public removeSocket(socketId: string): void {
    for (const key of this.eventCounts.keys()) {
      if (key.startsWith(`${socketId}:`)) {
        this.eventCounts.delete(key);
      }
    }
  }

  /**
   * Resets all rate limit state (for testing or shutdown).
   */
  public clear(): void {
    this.eventCounts.clear();
  }
}

export const socketRateLimiter = new SocketRateLimiter();
