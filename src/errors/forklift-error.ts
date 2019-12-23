export default class ForkliftError extends Error {
  readonly status: number;

  readonly name: string;

  readonly stack: string;

  /**
   * Custom error type which one should extend in order to support custom error types,
   * which include custom names and response statuses. The extended error is expected
   * to provide the params in the constructor.
   * @param message
   * @param status
   * @param name
   */
  constructor(message: string, status: number, name: string) {
    super(message);
    this.message = message;
    this.status = status;
    this.name = name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJson = (showTrace = false): object => {
    return {
      status: this.status,
      title: this.name,
      message: this.message,
      meta: showTrace
        ? {
            trace: this.stack,
          }
        : null,
    };
  };
}
