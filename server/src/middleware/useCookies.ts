import { Middleware } from "ts-http";

declare module "ts-http" {
  export interface Context {
    cookies: string[];
  }
}

const useCookies: Middleware<null> = function useCookies(next) {
  return async function cookiesMiddleware(ctx) {
    ctx.cookies = [];
    await next(ctx);
    if (ctx.res.headersSent) {
      return;
    }
    if (ctx.cookies.length > 0) {
      ctx.res.setHeader("Set-Cookie", ctx.cookies);
    }
  };
};

export default useCookies;
