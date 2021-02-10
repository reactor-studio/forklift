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
  shouldSerializeData: boolean;
};

export const statusOptions: { [key: string]: StatusOptions } = {
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
