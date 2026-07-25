/**
 * In-memory single-use nonce store to prevent replay attacks.
 * Stores consumed nonces with automatic expiration cleanup.
 */
class NonceStore {
  private consumedNonces = new Map<string, number>();

  /**
   * Consumes a nonce.
   * Returns true if the nonce was valid and not previously consumed.
   * Returns false if the nonce was already consumed (replay attack).
   *
   * @param nonce Nonce string to consume
   * @param ttlMs Time-to-live for nonce tracking (default 10 minutes)
   */
  public consume(nonce: string, ttlMs: number = 10 * 60 * 1000): boolean {
    this.cleanExpired();

    if (this.consumedNonces.has(nonce)) {
      return false; // Already consumed -> replay attempt
    }

    const expiresAt = Date.now() + ttlMs;
    this.consumedNonces.set(nonce, expiresAt);
    return true;
  }

  /**
   * Checks whether a nonce has already been consumed.
   */
  public isConsumed(nonce: string): boolean {
    this.cleanExpired();
    return this.consumedNonces.has(nonce);
  }

  /**
   * Clears all stored nonces (testing helper).
   */
  public clear(): void {
    this.consumedNonces.clear();
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [nonce, expiresAt] of this.consumedNonces.entries()) {
      if (now > expiresAt) {
        this.consumedNonces.delete(nonce);
      }
    }
  }
}

export const nonceStore = new NonceStore();
