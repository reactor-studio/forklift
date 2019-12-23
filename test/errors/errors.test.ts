import { ForkliftError } from '../../src/errors';

describe('Forklift error module', () => {
  it('should provide easy extension of ForkliftError', () => {
    class CustomError extends ForkliftError {
      constructor(message: string) {
        super(message, 999, 'Custom error');
      }
    }

    const test = (): void => {
      throw new CustomError('Some test message');
    };

    try {
      test();
    } catch (e) {
      expect(e.toJson(false)).toMatchSnapshot();
    }
  });
});
