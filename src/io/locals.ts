/*
  Functions in this module simplify interaction between middleware functions
  and request/response.locals. Sole purpose of `locals` is storing and
  sharing intermediate data between middleware.
*/
import _ from 'lodash';

/**
 * Read data stored inside particular `namespace` of `obj.locals`.
 */
export function getLocals(
  obj: object,
  namespace: string,
  defaultValue: object = undefined,
): any {
  return _.get(obj, `locals.${namespace}`, defaultValue);
}

/**
 *  Store `data` inside `obj.locals[namespace]`.
 *
 * `obj` can be any object, but is usually either request or response.
 * `namespace` groups all data belonging to one middleware - for example,
 *  authentication middleware might save user id to `req.locals.auth.userId`.
 */
export function setLocals(obj: object, namespace: string, data: any): any {
  if (!_.has(obj, 'locals')) {
    _.set(obj, 'locals', {});
  }
  if (data === undefined) {
    _.unset(obj, `locals.${namespace}`);
    return obj;
  }
  if (_.isObject(_.get(obj, `locals.${namespace}`))) {
    const namespaceData = {};
    _.set(namespaceData, `locals.${namespace}`, data);
    return _.merge(obj, namespaceData);
  }
  return _.set(obj, `locals.${namespace}`, data);
}
