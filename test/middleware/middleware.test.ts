import request from 'supertest';
import express from 'express';
import { errorMiddleware, asyncMiddleware } from '../../src/middleware';
import { NotFoundError } from '../../src/errors';

describe('Forklift error middleware', () => {
  it('should handle forklift errors and have meta by default', async () => {
    const testController = {
      get: () => (): Promise<void> => {
        throw new NotFoundError('Hey! Not found!');
      },
    };

    const app = express();
    app.get('/get', testController.get());
    app.use(errorMiddleware());

    const response = await request(app).get('/get');

    expect(response.body.meta).toBeDefined();
    expect(response.body.meta.trace).toBeDefined();
    expect(response.body.title).toBe('Not Found');
  });

  it('should disable meta trace log', async () => {
    const testController = {
      get: () => (): Promise<void> => {
        throw new NotFoundError('Hey! Not found!');
      },
    };

    const app = express();
    app.get('/get', testController.get());
    app.use(errorMiddleware(false));

    const response = await request(app).get('/get');

    expect(response.body.meta).toBeNull();
    expect(response.body).toMatchSnapshot();
    expect(response.body.title).toBe('Not Found');
  });

  it('should handle generic errors gracefully', async () => {
    const testController = {
      get: () => (): Promise<void> => {
        throw new Error('Hey! Not found!');
      },
    };

    const app = express();
    app.get('/get', testController.get());
    app.use(errorMiddleware());

    const response = await request(app).get('/get');

    expect(response.body.stack).toBeDefined();
    expect(response.body.name).toBe('Error');
  });

  it('should use toJSON if available', async () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, new.target.prototype);
      }

      toJSON() {
        return { message: 'Yiha' };
      }
    }

    const testController = {
      get: () => (): Promise<void> => {
        throw new CustomError('Hey! Not found!');
      },
    };

    const app = express();
    app.get('/get', testController.get());
    app.use(errorMiddleware());

    const response = await request(app).get('/get');

    expect(response.body.message).toBe('Yiha');
  });

  it('should handle unhandled exceptions in handlers with asyncMiddleware', async () => {
    function sleep(ms: number): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    const testController = {
      get: (): ((
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => Promise<void>) =>
        asyncMiddleware(async () => {
          await sleep(100);
          throw new Error('Error');
        }),
    };
    const app = express();
    app.get('/get', testController.get());
    app.use(errorMiddleware(false));

    const response = await request(app).get('/get');

    expect(response.body).toMatchSnapshot();
  });

  it('should call next method if no exception occurred', async () => {
    const nextToCall = jest.fn((_req: any, _res: any, next: any): void => {
      next();
    });

    const testController = {
      get: (): ((
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => Promise<void>) =>
        asyncMiddleware(async (_req, _res, next) => {
          expect(next).toBeDefined();
          next();
        }),
    };
    const app = express();
    app.get('/get', testController.get(), nextToCall);
    app.use(errorMiddleware(false));

    await request(app).get('/get');

    expect(nextToCall).toHaveBeenCalled();
  });
});
