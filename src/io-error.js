export class IoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IoError';
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ioErrorAdapter = {
  toJson(err) {
    let error = null;
    if (err.name === 'IoError') {
      error = {
        status: 400,
        title: 'Bad request',
        detail: err.message,
        meta: {
          trace: err,
        },
      };
    }

    return error;
  },
};
