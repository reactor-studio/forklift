import { Request, Response, NextFunction } from 'express';
import errorToJson from 'error-to-json';
import ForkliftError from '../errors/forklift-error';

/**
 * Error handler middleware with special handling for `ForkliftError` error type.
 * If the received `error` is extended from the `ForkliftError` parent class it will
 * call its `toJson` method and send the response with the result, using status from the
 * `error` object. Otherwise, status is by default 500 and basic error data is copied
 * to the JSON response.
 * @param showTrace flag indicating whether to include stack trace inside the error object
 */
export const errorMiddleware = (showTrace = true) => (
  err: ForkliftError | Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    next(err);
  }

  try {
    if (err instanceof ForkliftError) {
      res.status(err.status);
      res.json(err.toJson(showTrace));
    } else {
      res.status(500);
      let errorResponse = errorToJson(err);
      if (!showTrace) {
        const { name, statusCode, error } = errorResponse;
        errorResponse = { name, statusCode, error };
      }
      res.json(errorResponse);
    }
  } catch (e) {
    res.status(500);
    let trace = errorToJson(e);
    if (!showTrace) {
      const { name, message } = trace;
      trace = { name, message };
    }
    res.json({ error: 'Server error', trace });
  }
};
