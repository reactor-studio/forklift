import _ from 'lodash';
import tv4 from 'tv4';
import { Status } from './status';
import { IoError, IoResError } from './io-error';

const jsonContentType = 'application/json';
const supportedContentTypes = [jsonContentType, '*/*', '*'];

export const statusOptions = {
  [Status.OK]: {
    code: 200,
    shouldSerializeData: true,
  },
  [Status.CREATED]: {
    code: 201,
    shouldSerializeData: true,
  },
  [Status.NO_CONTENT]: {
    code: 204,
    shouldSerializeData: false,
  },
  [Status.BAD_REQUEST]: {
    code: 400,
    shouldSerializeData: false,
  },
  [Status.UNAUTHORIZED]: {
    code: 401,
    shouldSerializeData: false,
  },
  [Status.FORBIDDEN]: {
    code: 403,
    shouldSerializeData: false,
  },
  [Status.NOT_FOUND]: {
    code: 404,
    shouldSerializeData: false,
  },
};

export class IO {
  static set(target, data, status = Status.OK, path = null) {
    if (path) {
      _.set(target, `locals.io.data.${path}`, data);
    } else {
      _.set(target, 'locals.io.data', data);
    }
    _.set(target, 'locals.io.status', status);
  }

  static get(target, localsKey = '') {
    const data = _.get(target, 'locals.io.data');
    if (localsKey) {
      return _.get(data, localsKey);
    }

    return data;
  }

  static getStatus(target) {
    return _.get(target, 'locals.io.status');
  }

  /**
   * Sets the IO object with the status CREATED on the
   * given express object (req/res).
   *
   * @param target The express request or response.
   * @param data The IO data to set.
   */
  static setCreated(target, data) {
    IO.set(target, data, Status.CREATED);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to NO_CONTENT.
   *
   * @param target The express request or response.
   */
  static setEmpty(target) {
    IO.set(target, null, Status.NO_CONTENT);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to BAD_REQUEST.
   *
   * @param target The express request or response.
   */
  static setBadRequest(target) {
    IO.set(target, null, Status.BAD_REQUEST);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to UNAUTHORIZED.
   *
   * @param target The express request or response.
   */
  static setUnauthorized(target) {
    IO.set(target, null, Status.UNAUTHORIZED);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to FORBIDDEN.
   *
   * @param target The express request or response.
   */
  static setForbidden(target) {
    IO.set(target, null, Status.FORBIDDEN);
  }

  /**
   * Sets an empty response on the given express object (req/res).
   * This method will clear any existing IO data, and set the status
   * to NOT_FOUND.
   *
   * @param target The express request or response.
   */
  static setNotFound(target) {
    IO.set(target, null, Status.NOT_FOUND);
  }

  static prepareResponse(res) {
    const ioStatus = IO.getStatus(res) || Status.NO_CONTENT;
    const status = statusOptions[ioStatus];
    res.status(status.code);

    return status.shouldSerializeData;
  }

  static setResponseHeaders(res) {
    res.set('Content-Type', jsonContentType);
  }

  static validateResource(resource, schema) {
    const isBodyRespectingSchema = () => tv4.validateResult(resource, schema);
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

  constructor(reqSchema, options, resSchema) {
    this.reqSchema = reqSchema;
    this.resSchema = resSchema;
    this.options = options;
  }

  validateRequestHeaders(req) {
    if (req.headers['content-type'].indexOf('application/json') < 0) {
      const message = 'Please use application-json as Content-Type';
      throw new IoError(message);
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
      throw new IoError(message);
    }
  }

  validateRequest(req) {
    this.validateRequestHeaders(req);
    if (this.reqSchema) {
      const errorDetails = IO.validateResource(req.body, this.reqSchema);
      if (errorDetails) {
        throw new IoError(errorDetails);
      }
    }
  }

  validateResponse(data) {
    if (this.resSchema) {
      const errorDetails = IO.validateResource(data, this.resSchema);
      if (errorDetails) {
        throw new IoResError(errorDetails);
      }
    }
  }

  processRequest() {
    return (req, res, next) => {
      this.validateRequest(req);
      IO.set(req, req.body);
      next();
    };
  }

  sendResponse() {
    return (req, res, next) => {
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
