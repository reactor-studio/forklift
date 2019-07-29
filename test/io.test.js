import lodash from 'lodash';
import { Response } from 'jest-express/lib/response';
import { Request } from 'jest-express/lib/request';
import { IO, Status } from '../src';

describe('io static function', () => {
  test('set sets provided data', () => {
    const target = { test: true };
    IO.set(target, { another: false });
    expect(lodash.get(target, 'locals.io.data')).toEqual({ another: false });
  });

  test('set sets provided status', () => {
    const target = { test: true };
    IO.set(target, {}, Status.NOT_FOUND);
    expect(lodash.get(target, 'locals.io.status')).toBe('not-found');
  });

  test('set sets default status to ok', () => {
    const target = { test: true };
    IO.set(target, {});
    expect(lodash.get(target, 'locals.io.status')).toBe('ok');
  });

  test('get returns the right value', () => {
    const target = {};
    lodash.set(target, 'locals.io.data', { data: true });
    expect(IO.get(target)).toEqual({ data: true });
  });

  test('get with local key returns data within local key', () => {
    const target = {};
    lodash.set(target, 'locals.io.data.some.key', { data: true });
    expect(IO.get(target, 'some.key')).toEqual({ data: true });
  });

  test('getStatus returns status', () => {
    const target = {};
    lodash.set(target, 'locals.io.status', 'ok');
    expect(IO.getStatus(target)).toBe('ok');
  });

  test('setCreated sets status created', () => {
    const target = {};
    IO.setCreated(target, 'data');
    expect(lodash.get(target, 'locals.io.status')).toBe('created');
  });

  test('setEmpty clears data and sets status no-content', () => {
    const target = {};
    lodash.set(target, 'locals.io.data', { data: true });
    IO.setEmpty(target);
    expect(lodash.get(target, 'locals.io.data')).toBeNull();
    expect(lodash.get(target, 'locals.io.status')).toBe('no-content');
  });

  test('setBadRequest clears data & sets bad-request status', () => {
    const target = {};
    lodash.set(target, 'locals.io.data', { data: true });
    IO.setBadRequest(target);
    expect(lodash.get(target, 'locals.io.data')).toBeNull();
    expect(lodash.get(target, 'locals.io.status')).toBe('bad-request');
  });

  test('setUnauthorized clears data & sets unauthorized status', () => {
    const target = {};
    lodash.set(target, 'locals.io.data', { data: true });
    IO.setUnauthorized(target);
    expect(lodash.get(target, 'locals.io.data')).toBeNull();
    expect(lodash.get(target, 'locals.io.status')).toBe('unauthorized');
  });

  test('setForbidden clears data & sets forbidden status', () => {
    const target = {};
    lodash.set(target, 'locals.io.data', { data: true });
    IO.setForbidden(target);
    expect(lodash.get(target, 'locals.io.data')).toBeNull();
    expect(lodash.get(target, 'locals.io.status')).toBe('forbidden');
  });

  test('setNotFound clears data & sets not-found status', () => {
    const target = {};
    lodash.set(target, 'locals.io.data', { data: true });
    IO.setNotFound(target);
    expect(lodash.get(target, 'locals.io.data')).toBeNull();
    expect(lodash.get(target, 'locals.io.status')).toBe('not-found');
  });
});

describe('io function', () => {
  let io;
  let req;
  let res;

  const simpleSchema = {
    type: 'object',
    properties: {
      firstField: {
        type: 'string',
        description: "The object' first field.",
      },
      secondField: {
        type: 'string',
        description: "The object's second field.",
      },
    },
    required: ['firstField', 'secondField'],
  };

  beforeEach(() => {
    req = new Request();
    res = new Response();
    io = new IO(simpleSchema, { options: 1 });
  });

  afterEach(() => {
    req.resetMocked();
    res.resetMocked();
  });

  test('prepareResponse sets correct status code', () => {
    lodash.set(res, 'locals.io.status', 'ok');
    IO.prepareResponse(res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('setResponseHeaders sets application/json to content-type', () => {
    IO.setResponseHeaders(res);
    expect(res.getHeader('Content-Type')).toEqual('application/json');
  });

  test('constructor sets correct schema', () => {
    expect(io.schema).toEqual(simpleSchema);
  });

  test('constructor sets correct options', () => {
    expect(io.options).toEqual({ options: 1 });
  });

  test('validateRequestHeaders throws on empty accept header', () => {
    req.headers['content-type'] = 'application/json';
    expect(() =>
      io.validateRequestHeaders(req),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Client does not accept JSON responses. Did you set the correct \\"Accept\\" header?[\\"\\"]"`,
    );
  });

  test('validateResource throws on request not respecting schema', () => {
    req.setBody({ firstField: 'value', secondBADField: 'value' });
    expect(() => io.validateResource(req)).toThrowErrorMatchingSnapshot();
  });

  test('validateResource does not throw on request respecting schema', () => {
    req.setBody({ firstField: 'value', secondField: 'value' });
    expect(() => io.validateResource(req)).not.toThrow();
  });

  test('processRequest throws on wrong content-type', () => {
    const next = err => {
      throw err;
    };
    req.setHeaders('content-type', 'text/plain');
    expect(() =>
      io.processRequest()(req, res, next),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Please use application-json as Content-Type"`,
    );
  });

  test('sendResponse ends response on non-serializable data', () => {
    IO.set(res, {}, null, Status.NOT_FOUND);
    io.sendResponse()(req, res, null);
    expect(res.end).toHaveBeenCalled();
  });

  test('sendResponse throws on empty data to be serialized', () => {
    const next = err => {
      throw err;
    };
    IO.set(res, null, Status.OK);
    expect(() =>
      io.sendResponse()(req, res, next),
    ).toThrowErrorMatchingInlineSnapshot(`"No data to serialize"`);
  });

  test('sendResponse sends json response', () => {
    IO.set(res, { test: 'test!' });
    io.sendResponse()(req, res, null);
    expect(res.json).toHaveBeenCalled();
  });
});
