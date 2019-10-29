import IoError, { ErrorDetails } from './io-error';

export default class OutputError extends IoError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'OutputError', 500, 'Response data is invalid', details);
  }
}
