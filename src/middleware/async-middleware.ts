import { Request, Response, NextFunction } from 'express';

/**
 * Function that takes another function and wraps it in a promise. The function
 * that is provided is usually an express route handler, so this function
 * resolves in whatever value the route handler returns. If the handler
 * provides a rejected promise, it will be caught and sent to the next function
 * to be handled inside an error handling middleware. This wrapper is useful
 * when using async/await since in those cases default error middleware won't
 * catch rejected promises and you are required to wrap your logic inside try
 * catch blocks.
 */

export const asyncMiddleware = (
  fn: (req: Request, res: Response, next?: NextFunction) => Promise<void>,
) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await fn(req, res, next);
  } catch (err) {
    next(err);
    return;
  }
  next();
};
