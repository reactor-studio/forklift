export enum Status {
  OK = 'ok',
  CREATED = 'created',
  NO_CONTENT = 'no-content',
  BAD_REQUEST = 'bad-request',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not-found',
}

export type StatusOptions = {
  code: number;
  json: boolean;
};

export const statusOptions: { [key: string]: StatusOptions } = {
  [Status.OK]: {
    code: 200,
    json: true,
  },
  [Status.CREATED]: {
    code: 201,
    json: true,
  },
  [Status.NO_CONTENT]: {
    code: 204,
    json: false,
  },
  [Status.BAD_REQUEST]: {
    code: 400,
    json: false,
  },
  [Status.UNAUTHORIZED]: {
    code: 401,
    json: false,
  },
  [Status.FORBIDDEN]: {
    code: 403,
    json: false,
  },
  [Status.NOT_FOUND]: {
    code: 404,
    json: false,
  },
};
