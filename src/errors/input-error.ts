import IoError, { ErrorDetails } from './io-error';

export default class InputError extends IoError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'InputError', 400, 'Bad request', details);
  }
}
