export class IoError extends Error {
  constructor(message) {
    super(message);
    this.name = 'IoError';
    this.message = message;
    this.status = 400;
    this.title = 'Bad request';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class IoResError extends IoError {
  constructor(message) {
    super(message);
    this.name = 'IoResError';
    this.status = 500;
    this.title = 'Response data is invalid';
  }
}

export const ioErrorAdapter = {
  toJson(err) {
    let error = null;
    if (err.name === 'IoError' || err.name === 'IoResError') {
      error = {
        status: err.status,
        title: err.title,
        detail: err.message,
        meta: {
          trace: err,
        },
      };
    }

    return error;
  },
};
