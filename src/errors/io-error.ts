import { ForkliftError } from '.';

type Name = 'InputError' | 'OutputError';

export interface ErrorDetails {
  why: string;
  where: string;
  how: string;
}

export default abstract class IoError extends ForkliftError {
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
    super(message, status, name);
    this.name = name;
    this.message = message;
    this.status = status;
    this.title = title;
    this.details = details;
  }

  toJson = (showTrace = false): object => {
    return {
      status: this.status,
      title: this.name,
      message: this.message,
      details: this.details,
      meta: showTrace
        ? {
            trace: this.stack,
          }
        : null,
    };
  };
}
