import _ from 'lodash';
import { Response } from 'jest-express/lib/response';
import { Request } from 'jest-express/lib/request';
import { IO, Status } from '../../src';

describe('io static function', () => {
  test('set sets provided data', () => {
    const target = { test: true };
    IO.set(target, { another: false });
    expect(_.get(target, 'locals.io.data')).toEqual({ another: false });
  });

  test('set sets provided status', () => {
    const target = { test: true };
    IO.set(target, {}, Status.NOT_FOUND);
    expect(_.get(target, 'locals.io.status')).toBe('not-found');
  });

  test('set sets default status to ok', () => {
    const target = { test: true };
    IO.set(target, {});
    expect(_.get(target, 'locals.io.status')).toBe('ok');
  });

  test('get returns the right value', () => {
    const target = {};
    _.set(target, 'locals.io.data', { data: true });
    expect(IO.get(target)).toEqual({ data: true });
  });

  test('get with local key returns data within local key', () => {
    const target = {};
    _.set(target, 'locals.io.data.some.key', { data: true });
    expect(IO.get(target, 'some.key')).toEqual({ data: true });
  });

  test('getStatus returns status', () => {
    const target = {};
    _.set(target, 'locals.io.status', 'ok');
    expect(IO.getStatus(target)).toBe('ok');
  });

  test('setCreated sets status created', () => {
    const target = {};
    IO.setCreated(target, 'data');
    expect(_.get(target, 'locals.io.status')).toBe('created');
  });

  test('setEmpty clears data and sets status no-content', () => {
    const target = {};
    _.set(target, 'locals.io.data', { data: true });
    IO.setEmpty(target);
    expect(_.get(target, 'locals.io.data')).toBeNull();
    expect(_.get(target, 'locals.io.status')).toBe('no-content');
  });

  test('setBadRequest clears data & sets bad-request status', () => {
    const target = {};
    _.set(target, 'locals.io.data', { data: true });
    IO.setBadRequest(target);
    expect(_.get(target, 'locals.io.data')).toBeNull();
    expect(_.get(target, 'locals.io.status')).toBe('bad-request');
  });

  test('setUnauthorized clears data & sets unauthorized status', () => {
    const target = {};
    _.set(target, 'locals.io.data', { data: true });
    IO.setUnauthorized(target);
    expect(_.get(target, 'locals.io.data')).toBeNull();
    expect(_.get(target, 'locals.io.status')).toBe('unauthorized');
  });

  test('setForbidden clears data & sets forbidden status', () => {
    const target = {};
    _.set(target, 'locals.io.data', { data: true });
    IO.setForbidden(target);
    expect(_.get(target, 'locals.io.data')).toBeNull();
    expect(_.get(target, 'locals.io.status')).toBe('forbidden');
  });

  test('setNotFound clears data & sets not-found status', () => {
    const target = {};
    _.set(target, 'locals.io.data', { data: true });
    IO.setNotFound(target);
    expect(_.get(target, 'locals.io.data')).toBeNull();
    expect(_.get(target, 'locals.io.status')).toBe('not-found');
  });
});

describe('io function', () => {
  let io: IO;
  let req: Request;
  let res: Response;

  const reqBodySchema = {
    type: 'object',
    properties: {
      firstProperty: {
        type: 'string',
        description: "The response's first property.",
      },
      objectProperty: {
        type: 'object',
        properties: {
          nestedProperty: {
            type: 'string',
          },
        },
        required: ['nestedProperty'],
      },
    },
    required: ['firstProperty', 'objectProperty'],
  };

  const reqQuerySchema = {
    type: 'object',
    properties: {
      queryProperty: {
        type: 'string',
        description: "The response's first property.",
      },
    },
    required: ['queryProperty'],
  };

  const resBodySchema = {
    type: 'object',
    properties: {
      firstProperty: {
        type: 'string',
        description: "The response's first property.",
      },
    },
    required: ['firstProperty'],
  };

  beforeEach(() => {
    req = new Request();
    res = new Response();
    io = new IO({ reqBodySchema, resBodySchema });
  });

  afterEach(() => {
    req.resetMocked();
    res.resetMocked();
  });

  test('prepareResponse sets correct status code', () => {
    _.set(res, 'locals.io.status', Status.NOT_FOUND);
    IO.prepareResponse(res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('prepareResponse throws on wrong status', () => {
    _.set(res, 'locals.io.status', {});
    expect(() => IO.prepareResponse(res as any)).toThrow();
  });

  test('prepareResponse supports custom status', () => {
    _.set(res, 'locals.io.status', { code: 409 });
    IO.prepareResponse(res as any);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('prepareResponse supports custom status & serialization options', () => {
    _.set(res, 'locals.io.status', { code: 409, json: true });
    const response = IO.prepareResponse(res as any);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(response).toEqual(true);
  });

  test('setResponseHeaders sets application/json to content-type', () => {
    IO.setResponseHeaders(res as any);
    expect(res.getHeader('Content-Type')).toEqual('application/json');
  });

  test('constructor sets correct request schema', () => {
    expect((io as any).reqBodySchema).toEqual(reqBodySchema);
  });

  test('validateResource returns error details on request not respecting schema', () => {
    req.setBody({ firstProperty: 'abc', objectProperty: {} });
    expect(IO.validateResource(req.body, reqBodySchema)).toMatchSnapshot();
  });

  test('validateResource returns null on request respecting schema', () => {
    req.setBody({
      firstProperty: 'abc',
      objectProperty: { nestedProperty: 'bcd' },
    });
    expect(IO.validateResource(req.body, reqBodySchema)).toBeNull();
  });

  test('validateRequestHeaders throws on empty accept header', () => {
    req.headers['content-type'] = 'application/json';
    expect(() =>
      (io as any).validateRequestHeaders(req),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Client does not accept JSON responses. Did you set the correct \\"Accept\\" header?[\\"\\"]"`,
    );
  });

  test('processRequest doesnt throw on undefined schema', () => {
    const ioTest = new IO();

    req.setHeaders('Accept', 'application/json');
    req.setHeaders('content-type', 'application/json');

    expect(() =>
      ioTest.processRequest()(req as any, res as any, (err) => err),
    ).not.toThrow();
  });

  test('validateRequest throws on invalid body', () => {
    const next = (err: Error) => {
      throw err;
    };
    req.setHeaders('Accept', 'application/json');
    req.setHeaders('content-type', 'application/json');
    req.setBody({ firstProperty: 'abc', objectProperty: {} });
    expect(() =>
      io.processRequest()(req as any, res as any, next as any),
    ).toThrowErrorMatchingSnapshot();
  });

  test('processRequest throws on wrong content-type', () => {
    const next = (err: Error): void => {
      throw err;
    };
    req.setHeaders('content-type', 'text/plain');
    expect(() =>
      io.processRequest()(req as any, res as any, next as any),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Please use application-json as Content-Type header"`,
    );
  });

  test('processRequest throws correct error on missing content-type', () => {
    const next = (err: Error): void => {
      throw err;
    };
    expect(() =>
      io.processRequest()(req as any, res as any, next as any),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Please use application-json as Content-Type header"`,
    );
  });

  test('sendResponse ends response on non-serializable data', () => {
    IO.set(res as any, {}, Status.NOT_FOUND);
    io.sendResponse()(req as any, res as any, null);
    expect(res.end).toHaveBeenCalled();
  });

  test('sendResponse throws on empty data to be serialized', () => {
    const next = (err: Error): void => {
      throw err;
    };
    IO.set(res as any, null, Status.OK);
    expect(() =>
      io.sendResponse()(req as any, res as any, next as any),
    ).toThrowErrorMatchingInlineSnapshot(`"No data to serialize"`);
  });

  test('sendResponse sends json response', () => {
    IO.set(res, { firstProperty: 'test!' });
    io.sendResponse()(req as any, res as any, () => null);
    expect(res.json).toHaveBeenCalled();
  });

  test('sendResponse forwards the io error', () => {
    const next = (err: Error) => err;

    IO.set(res, { BADProperty: 'test!' });
    expect(
      (io.sendResponse()(req as any, res as any, next as any) as any).toJson(),
    ).toMatchSnapshot();
  });

  test('sendResponse doesnt call next if skipNextOnSuccess is provided', () => {
    const next = jest.fn();

    IO.set(res, { firstProperty: 'test!' });
    io.sendResponse({ skipNextOnSuccess: true })(
      req as any,
      res as any,
      next as any,
    ) as any;

    expect(next).not.toHaveBeenCalled();
  });

  test('processRequest throws when query is not matching schema', () => {
    const next = (err: Error): void => {
      throw err;
    };
    const testIo = new IO({ reqQuerySchema });
    req.setHeaders('Accept', 'application/json');
    req.setHeaders('content-type', 'application/json');

    expect(() =>
      testIo.processRequest()(req as any, res as any, next as any),
    ).toThrowErrorMatchingSnapshot();
  });

  test('processRequest does not throw when query is matching schema', () => {
    const testIo = new IO({ reqQuerySchema });
    req.setHeaders('Accept', 'application/json');
    req.setHeaders('content-type', 'application/json');
    req.setQuery('queryProperty', 'yes');

    expect(() =>
      testIo.processRequest()(req as any, res as any, (err) => err),
    ).not.toThrow();
  });
});
