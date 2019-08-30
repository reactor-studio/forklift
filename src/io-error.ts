type Name = 'IoReqError' | 'IoResError';

export interface ErrorDetails {
  why: string;
  where: string;
  how: string;
}

abstract class IoError extends Error {
  readonly name: Name;

  readonly message: string;

  readonly status: number;

  readonly title: string;

  readonly details: object;

  constructor(
    message: string,
    name: Name,
    status: number,
    title: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = name;
    this.message = message;
    this.status = status;
    this.title = title;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class IoReqError extends IoError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'IoReqError', 400, 'Bad request', details);
  }
}

export class IoResError extends IoError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'IoResError', 500, 'Response data is invalid', details);
  }
}

interface IoErrorJson {
  status: number;
  title: string;
  detail: string;
  meta: { trace: object };
}

export const ioErrorAdapter = {
  toJson(err: Error): IoErrorJson {
    let error = null;
    if (err.name === 'IoReqError' || err.name === 'IoResError') {
      error = {
        status: (err as IoError).status,
        title: (err as IoError).title,
        detail: (err as IoError).details,
        meta: {
          trace: err,
        },
      };
    }

    return error;
  },
};
