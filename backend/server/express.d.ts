import 'express';

declare global {
  namespace Express {
    interface Request {
      /** Added by the csurf middleware registered in server/index.ts. */
      csrfToken: () => string;
    }
  }
}

export {};
