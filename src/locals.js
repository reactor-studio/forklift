/*
  Functions in this module simplify interaction between middleware functions
  and request/response.locals. Sole purpose of `locals` is storing and
  sharing intermediate data between middleware.
*/
import _ from 'lodash';

/*
 * Read data stored inside particular `namespace` of `obj.locals`.
 */
export function getLocals(obj, namespace, defaultValue = undefined) {
  return _.get(obj, `locals.${namespace}`, defaultValue);
}

/*
 * Store `data` inside `obj.locals[namespace]`.
 *
 * `obj` can be any object, but is usually either request or response.
 * `namespace` groups all data belonging to one middleware - for example,
 * authentication middleware might save user id to `req.locals.auth.userId`.
 */
export function setLocals(obj, namespace, data) {
  if (!obj.locals) {
    // eslint-disable-next-line no-param-reassign
    obj.locals = {};
  }
  if (data === undefined) return _.unset(obj, `locals.${namespace}`);
  if (_.isObject(_.get(obj, `locals.${namespace}`))) {
    const namespaceData = {};
    _.set(namespaceData, `locals.${namespace}`, data);
    return _.merge(obj, namespaceData);
  }
  return _.set(obj, `locals.${namespace}`, data);
}