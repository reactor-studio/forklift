import ForkliftError from './forklift-error';

export default class NotFoundError extends ForkliftError {
  constructor(message: string) {
    super(message, 404, 'Not Found');
  }
}
