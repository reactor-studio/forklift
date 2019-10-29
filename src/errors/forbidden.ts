import ForkliftError from './forklift-error';

export default class ForbiddenError extends ForkliftError {
  constructor(message: string) {
    super(message, 403, 'Forbidden');
  }
}
