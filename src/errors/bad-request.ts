import ForkliftError from './forklift-error';

export default class BadRequestError extends ForkliftError {
  constructor(message: string) {
    super(message, 400, 'Bad request');
  }
}
