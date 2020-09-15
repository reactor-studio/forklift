import _ from 'lodash';
import tv4 from 'tv4';
import { Request, Response, NextFunction } from 'express';
import { InputError, OutputError } from '../errors';
import { ErrorDetails } from '../errors/io-error';
import { Status, statusOptions } from './status';

const jsonContentType = 'application/json';
const supportedContentTypes = [jsonContentType, '*/*', '*'];

type Options = {
  contentTypes: string[];
};

type Configuration = {
  reqBodySchema?: tv4.JsonSchema;
  reqQuerySchema?: tv4.JsonSchema;
  resBodySchema?: tv4.JsonSchema;
  options?: Options;
};

type SendResponseOptions = {
  skipNextOnSuccess?: boolean;
};

export class IO {
  /**
   * Wrapper for lodash's `set` function. Sets the data and/or status in the
   * `target` object at provided `path`. Data is by default set at path
   * `locals.io.data`, and equivalent getter function provided by `IO` expects
   * data at the same path.
   * @param target target object
   * @param data data to set
   * @param status data status to set
   * @param path path to set data to
   */
  static set(
    target: any,
    data: any,
    status: Status = Status.OK,
    path: string = null,
  ): any {
    if (path) {
      _.set(target, `locals.io.data.${path}`, data);
    } else {
      _.set(target, 'locals.io.data', data);
    }
    return _.set(target, 'locals.io.status', status);
  }

  /**
   * Get the data at the `locals.io.data` path, where data is set by the
   * equivalent setter function or by a custom path.
   * @param target target object
   * @param localsKey custom locals path
   */
  static get(target: any, localsKey = ''): any {
    const data = _.get(target, 'locals.io.data');
    if (localsKey) {
      return _.get(data, localsKey);
    }

    return data;
  }

  /**
   * Get the status at the "locals.io.status" path, where data is set by the
   * equivalent setter function.
   * @param target target object
   */
  static getStatus(target: any): any {
    return _.get(target, 'locals.io.status');
  }

  /**
   * Sets the `IO` object with the status CREATED on the
   * given express object (req/res).
   *
   * @param target The express request or response.
   * @param data The IO data to set.
   */
  static setCreated(target: any, data: any): any {
    return IO.set(target, data, Status.CREATED);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing `IO` data, and set the status
   * to NO_CONTENT.
   *
   * @param target The express request or response.
   */
  static setEmpty(target: any): any {
    return IO.set(target, null, Status.NO_CONTENT);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing `IO` data, and set the status
   * to BAD_REQUEST.
   *
   * @param target The express request or response.
   */
  static setBadRequest(target: any): any {
    return IO.set(target, null, Status.BAD_REQUEST);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing `IO` data, and set the status
   * to UNAUTHORIZED.
   *
   * @param target The express request or response.
   */
  static setUnauthorized(target: any): any {
    return IO.set(target, null, Status.UNAUTHORIZED);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing `IO` data, and set the status
   * to FORBIDDEN.
   *
   * @param target The express request or response.
   */
  static setForbidden(target: any): any {
    return IO.set(target, null, Status.FORBIDDEN);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing `IO` data, and set the status
   * to NOT_FOUND.
   *
   * @param target The express request or response.
   */
  static setNotFound(target: any): any {
    return IO.set(target, null, Status.NOT_FOUND);
  }

  /**
   * Prepares the response by using previously set status in the locals path
   * to the express.js response object.
   * @param res response object
   */
  static prepareResponse(res: Response): boolean {
    const ioStatus = IO.getStatus(res as any) || Status.NO_CONTENT;
    const status = statusOptions[ioStatus];
    res.status(status.code);

    return status.shouldSerializeData;
  }

  /**
   * Sets response object's content type header to "application/json".
   * @param res response object
   */
  static setResponseHeaders(res: Response): Response {
    return res.set('Content-Type', jsonContentType);
  }

  /**
   * Validate a resource with a JSON schema using a validator.
   * @param resource target object
   * @param schema JSON schema
   * @returns {null|object} null if schmea is valid, error details object otherwise
   */
  static validateResource(resource: any, schema: tv4.JsonSchema): ErrorDetails {
    const isBodyRespectingSchema = (): tv4.SingleResult =>
      tv4.validateResult(resource, schema);
    const errorObject = isBodyRespectingSchema();
    if (errorObject.error) {
      const message = _.get(errorObject, 'error.subErrors')
        ? `It can be any of these errors [${_.map(
            errorObject.error.subErrors,
            (subError) => subError.message,
          )}]`
        : errorObject.error.message;
      const errorDetails = {
        why: 'Resource does not respect the schema',
        where: `${errorObject.error.dataPath}`,
        how: message,
      };
      return errorDetails;
    }
    return null;
  }

  private reqBodySchema: tv4.JsonSchema;

  private reqQuerySchema: tv4.JsonSchema;

  private resBodySchema: tv4.JsonSchema;

  private options: Options;

  constructor(configuration?: Configuration) {
    this.reqBodySchema = configuration?.reqBodySchema;
    this.reqQuerySchema = configuration?.reqQuerySchema;
    this.resBodySchema = configuration?.resBodySchema;
    this.options = configuration?.options;
  }

  private validateRequestHeaders(req: Request): void {
    if (
      _.isEmpty(req.headers) ||
      req.headers['content-type'].indexOf('application/json') < 0
    ) {
      const message = 'Please use application-json as Content-Type header';
      throw new InputError(message);
    }

    const acceptHeader = req.get('Accept') || '';
    const contentTypes = [];
    const customContentTypes = _.get(this.options, 'contentTypes', []);
    // Remove (optional) quality value from each accepted type.
    // https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.9
    acceptHeader
      .split(',')
      .forEach((type) => contentTypes.push(type.split(';')[0]));

    customContentTypes.forEach((type) => contentTypes.push(type));

    const acceptedContentTypes = _.intersection(
      contentTypes,
      supportedContentTypes,
    );

    if (_.isEmpty(acceptedContentTypes)) {
      const message = `${
        'Client does not accept JSON responses. ' +
        'Did you set the correct "Accept" header?'
      }${JSON.stringify(contentTypes)}`;
      throw new InputError(message);
    }
  }

  private validateRequest(req: Request): void {
    this.validateRequestHeaders(req);
    if (this.reqBodySchema) {
      const errorDetails = IO.validateResource(req.body, this.reqBodySchema);
      if (errorDetails) {
        throw new InputError(errorDetails.why, errorDetails);
      }
    }
    if (this.reqQuerySchema) {
      const errorDetails = IO.validateResource(req.query, this.reqQuerySchema);
      if (errorDetails) {
        throw new InputError(errorDetails.why, errorDetails);
      }
    }
  }

  private validateResponse(data: Response): void {
    if (this.resBodySchema) {
      const errorDetails = IO.validateResource(data, this.resBodySchema);
      if (errorDetails) {
        throw new OutputError(errorDetails.why, errorDetails);
      }
    }
  }

  /**
   * Middleware method that is used to validate request with the JSON Schema
   * provided to the `IO` object on instantiation.
   * Requires the request to have correct `Accept` header, expecting a JSON
   * or any type of response.
   * @throws {InputError} request body or headers are not valid
   * @returns middleware handler
   */
  processRequest() {
    return (req: Request, _res: Response, next: NextFunction): void => {
      this.validateRequest(req);
      IO.set(req as any, req.body);
      next();
    };
  }

  /**
   * Middleware method that is used for finishing up the response pipeline
   * by either calling response end function or serializing it into JSON.
   * It sets status provided by the `IO`'s `set` function or its' derivative.
   * @returns middleware handler
   */
  sendResponse(options?: SendResponseOptions) {
    return (_req: Request, res: Response, next: NextFunction): void => {
      try {
        const shouldSerializeData = IO.prepareResponse(res);
        if (!shouldSerializeData) {
          res.end();
          return null;
        }
        const data = IO.get(res as any);
        if (_.isEmpty(data)) {
          return next(new OutputError('No data to serialize'));
        }
        this.validateResponse(data);
        res.json(data);
        if (options?.skipNextOnSuccess) {
          return null;
        }
        return next();
      } catch (error) {
        return next(error);
      }
    };
  }
}
