import _ from 'lodash';
import tv4 from 'tv4';
import { Status } from './status';
import { IoError } from './io-error';

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
  [Status.NOT_FOUND]: {
    code: 404,
    shouldSerializeData: false,
  },
};

export default class IO {
  static set(target, data, status = Status.OK) {
    _.set(target, 'locals.io.data', data);
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

  static prepareResponse(res) {
    const ioStatus = IO.getStatus(res) || Status.NO_CONTENT;
    const status = statusOptions[ioStatus];
    res.status(status.code);

    return status.shouldSerializeData;
  }

  static setResponseHeaders(res) {
    res.set('Content-Type', jsonContentType);
  }

  constructor(schema, options) {
    this.schema = schema;
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

  validateResource(req) {
    const isBodyRespectingSchema = () =>
      tv4.validateResult(req.body, this.schema);
    const errorObject = isBodyRespectingSchema();
    if (errorObject.error) {
      const message = _.get(errorObject, 'error.subErrors')
        ? `It can be any of these errors [${_.map(
            errorObject.error.subErrors,
            subError => subError.message,
          )}]`
        : errorObject.error.message;
      const errorDetails = {
        why: 'Body does not respect the schema',
        where: `request/body${errorObject.error.dataPath}`,
        how: message,
      };
      throw new IoError(errorDetails);
    }
  }

  validateRequest(req) {
    this.validateRequestHeaders(req);
    this.validateResource(req);
  }

  processRequest() {
    return (req, res, next) => {
      this.validateRequest(req);
      IO.set(req, req.body);
      next();
    };
  }

  // eslint-disable-next-line class-methods-use-this
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
          return next(new IoError('No data to serialize'));
        }

        res.json(data);
        return null;
      } catch (error) {
        return next(error);
      }
    };
  }
}
