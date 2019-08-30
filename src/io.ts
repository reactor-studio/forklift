import _ from 'lodash';
import tv4 from 'tv4';
import { Request, Response, NextFunction } from 'express';
import { IoReqError, IoResError, ErrorDetails } from './io-error';
import { Status, statusOptions } from './status';

const jsonContentType = 'application/json';
const supportedContentTypes = [jsonContentType, '*/*', '*'];

export class IO {
  static set(
    target: object,
    data: any,
    status: Status = Status.OK,
    path: string = null,
  ): object {
    if (path) {
      _.set(target, `locals.io.data.${path}`, data);
    } else {
      _.set(target, 'locals.io.data', data);
    }
    return _.set(target, 'locals.io.status', status);
  }

  static get(target: object, localsKey = ''): any {
    const data = _.get(target, 'locals.io.data');
    if (localsKey) {
      return _.get(data, localsKey);
    }

    return data;
  }

  static getStatus(target: object): any {
    return _.get(target, 'locals.io.status');
  }

  /**
   * Sets the IO object with the status CREATED on the
   * given express object (req/res).
   *
   * @param target The express request or response.
   * @param data The IO data to set.
   */
  static setCreated(target: object, data: any): object {
    return IO.set(target, data, Status.CREATED);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to NO_CONTENT.
   *
   * @param target The express request or response.
   */
  static setEmpty(target: object): object {
    return IO.set(target, null, Status.NO_CONTENT);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to BAD_REQUEST.
   *
   * @param target The express request or response.
   */
  static setBadRequest(target: object): object {
    return IO.set(target, null, Status.BAD_REQUEST);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to UNAUTHORIZED.
   *
   * @param target The express request or response.
   */
  static setUnauthorized(target: object): object {
    return IO.set(target, null, Status.UNAUTHORIZED);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to FORBIDDEN.
   *
   * @param target The express request or response.
   */
  static setForbidden(target: object): object {
    return IO.set(target, null, Status.FORBIDDEN);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to NOT_FOUND.
   *
   * @param target The express request or response.
   */
  static setNotFound(target: object): object {
    return IO.set(target, null, Status.NOT_FOUND);
  }

  static prepareResponse(res: Response): boolean {
    const ioStatus = IO.getStatus(res) || Status.NO_CONTENT;
    const status = statusOptions[ioStatus];
    res.status(status.code);

    return status.shouldSerializeData;
  }

  static setResponseHeaders(res: Response): Response {
    return res.set('Content-Type', jsonContentType);
  }

  static validateResource(resource: any, schema: tv4.JsonSchema): ErrorDetails {
    const isBodyRespectingSchema = (): tv4.SingleResult =>
      tv4.validateResult(resource, schema);
    const errorObject = isBodyRespectingSchema();
    if (errorObject.error) {
      const message = _.get(errorObject, 'error.subErrors')
        ? `It can be any of these errors [${_.map(
            errorObject.error.subErrors,
            subError => subError.message,
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

  private reqSchema: tv4.JsonSchema;

  private resSchema: tv4.JsonSchema;

  private options: object;

  constructor(
    reqSchema: tv4.JsonSchema,
    options: object,
    resSchema: tv4.JsonSchema,
  ) {
    this.reqSchema = reqSchema;
    this.resSchema = resSchema;
    this.options = options;
  }

  private validateRequestHeaders(req: Request): void {
    if (req.headers['content-type'].indexOf('application/json') < 0) {
      const message = 'Please use application-json as Content-Type';
      throw new IoReqError(message);
    }

    const acceptHeader = req.get('Accept') || '';
    const contentTypes = [];
    const customContentTypes = _.get(this.options, 'contentTypes', []);
    // Remove (optional) quality value from each accepted type.
    // https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.9
    acceptHeader
      .split(',')
      .forEach(type => contentTypes.push(type.split(';')[0]));

    customContentTypes.forEach(type => contentTypes.push(type));

    const acceptedContentTypes = _.intersection(
      contentTypes,
      supportedContentTypes,
    );

    if (_.isEmpty(acceptedContentTypes)) {
      const message = `${'Client does not accept JSON responses. ' +
        'Did you set the correct "Accept" header?'}${JSON.stringify(
        contentTypes,
      )}`;
      throw new IoReqError(message);
    }
  }

  private validateRequest(req: Request): void {
    this.validateRequestHeaders(req);
    if (this.reqSchema) {
      const errorDetails = IO.validateResource(req.body, this.reqSchema);
      if (errorDetails) {
        throw new IoReqError(errorDetails.why, errorDetails);
      }
    }
  }

  private validateResponse(data: object): void {
    if (this.resSchema) {
      const errorDetails = IO.validateResource(data, this.resSchema);
      if (errorDetails) {
        throw new IoResError(errorDetails.why, errorDetails);
      }
    }
  }

  processRequest() {
    return (req: Request, _res: Response, next: NextFunction): void => {
      this.validateRequest(req);
      IO.set(req, req.body);
      next();
    };
  }

  sendResponse() {
    return (_req: Request, res: Response, next: NextFunction): void => {
      try {
        const shouldSerializeData = IO.prepareResponse(res);
        if (!shouldSerializeData) {
          res.end();
          return null;
        }
        const data = IO.get(res);
        if (_.isEmpty(data)) {
          return next(new IoResError('No data to serialize'));
        }
        this.validateResponse(data);
        res.json(data);
        return null;
      } catch (error) {
        return next(error);
      }
    };
  }
}
