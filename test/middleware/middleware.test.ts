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

  it('should handle unhandled exceptions in handlers with asyncMiddleware', async () => {
    function sleep(ms: number): Promise<void> {
      return new Promise((resolve: Function): number =>
        setTimeout(resolve, ms),
      );
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
});
