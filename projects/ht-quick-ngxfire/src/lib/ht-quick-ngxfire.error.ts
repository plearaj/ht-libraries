/**
 * Custom error class for ht-quick-ngxfire library
 */
export class HtQuickNgxFireError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'HtQuickNgxFireError';
  }
}
