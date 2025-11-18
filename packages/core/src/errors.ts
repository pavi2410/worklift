/**
 * Error thrown when an external command fails
 * These errors should not show stacktraces as they're user errors, not build system errors
 */
export class ExternalCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number
  ) {
    super(message);
    this.name = "ExternalCommandError";
  }
}
