/**
 * Shared domain error types for Bitacora operations.
 */

export class BitacoraError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'BitacoraError';
    this.exitCode = exitCode;
  }
}
