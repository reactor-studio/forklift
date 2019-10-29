import ForkliftError from './forklift-error';

export default class ConflictError extends ForkliftError {
  constructor(message: string) {
    super(message, 409, 'Conflict');
  }
}
