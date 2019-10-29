import _ from 'lodash';
import { getLocals, setLocals } from '../../src';

describe('locals function', () => {
  let target: object;

  beforeEach(() => {
    target = {};
  });

  test('getLocals returns locals from right namespace', () => {
    const test = { test: 'test' };
    _.set(target, 'locals.any.namespace', test);
    expect(getLocals(target, 'any.namespace')).toEqual(test);
  });

  test('setLocals clears object on undefined data', () => {
    _.set(target, 'locals.any.namespace.name', { test: 'test' });
    setLocals(target, 'any.namespace', undefined);
    const value = _.get(target, 'locals');
    expect(value).toEqual({ any: {} });
  });

  test('setLocals merges object when it already exists', () => {
    _.set(target, 'locals.any.namespace.name', { test: 'test' });
    setLocals(target, 'any.namespace.name', { another: 'another' });
    const value = _.get(target, 'locals.any.namespace.name');
    expect(value).toEqual({ test: 'test', another: 'another' });
  });

  test('setLocals sets new locals data', () => {
    setLocals(target, 'any.namespace.name', { test: 'another' });
    const value = _.get(target, 'locals.any.namespace.name');
    expect(value).toEqual({ test: 'another' });
  });
});
