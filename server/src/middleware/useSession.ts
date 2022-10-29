import { createHmac, randomBytes } from "crypto";
import Redis from "ioredis";
import { Context, Handler, Middleware } from "ts-http";
import redisClient from "../util/redisClient.js";
import cookie, { CookieSerializeOptions } from "cookie";

declare module "ts-http" {
  interface Context {
    session: Session | undefined;
    sessionID: string;
  }
}

interface SessionOptions {
  idleTimeout: number;
  absoluteTimeout: number;
  client: Redis;
  secret: string;
  cookie: CookieSerializeOptions;
}

interface Session {
  encryptedSessionID: string;
  absoluteTimeout: number;
  userID: string;
}

const useSession: Middleware<SessionOptions> = function useSession(
  next,
  opts: SessionOptions
) {
  return async function sessionMiddleware(ctx) {
    const rawCookie = ctx.req.headers.cookie;
    if (!rawCookie) {
      await createSession(ctx, opts, next);
      return;
    }
    const sessionID = cookie.parse(rawCookie)["sessionID"];
    if (!sessionID) {
      await createSession(ctx, opts, next);
      return;
    }
    const encryptedSessionID = createHmac("sha256", opts.secret)
      .update(sessionID)
      .digest("hex");
    let sessionJSON: string | null;
    try {
      sessionJSON = await redisClient.get(`session:${encryptedSessionID}`);
    } catch (error) {
      console.error("redis failed get operation: ", error);
      ctx.res.statusCode = 501;
      ctx.res.end();
      return;
    }
    if (!sessionJSON) {
      console.error("session id is invalid");
      await createSession(ctx, opts, next);
      return;
    }
    const session = JSON.parse(sessionJSON) as Session;
    if (Date.now() > session.absoluteTimeout) {
      await createSession(ctx, opts, next);
      return;
    }
    ctx.session = { ...session };
    ctx.sessionID = sessionID;
    await next(ctx);
    try {
      await redisClient.setex(
        `session:${ctx.session.encryptedSessionID}`,
        Math.floor(opts.idleTimeout / 1000),
        JSON.stringify(ctx.session)
      );
      ctx.cookies.push(
        cookie.serialize("sessionID", ctx.sessionID, opts.cookie)
      );
    } catch (error) {
      console.error("redis failed setex operation: ", error);
    }
  };
};

export default useSession;

async function generateSessionID(secret: string): Promise<{
  sessionID: string;
  encryptedSessionID: string;
}> {
  return new Promise((resolve, reject) => {
    randomBytes(16, (err, buf) => {
      if (err) {
        reject(err);
        return;
      }
      const sessionID = buf.toString("hex");
      const encryptedSessionID = createHmac("sha256", secret)
        .update(sessionID)
        .digest("hex");
      resolve({ sessionID, encryptedSessionID });
      return;
    });
  });
}

async function createSession(
  ctx: Context,
  opts: SessionOptions,
  next: Handler
) {
  try {
    const { sessionID, encryptedSessionID } = await generateSessionID(
      opts.secret
    );

    ctx.session = {
      encryptedSessionID,
      absoluteTimeout: Date.now() + opts.absoluteTimeout,
      userID: "",
    };
    ctx.sessionID = sessionID;
  } catch (error) {
    console.error("unable to create new session: ", error);
    ctx.res.statusCode = 501;
    ctx.res.end();
    return;
  }
  await next(ctx);
  try {
    await redisClient.setex(
      `session:${ctx.session.encryptedSessionID}`,
      Math.floor(opts.idleTimeout / 1000),
      JSON.stringify(ctx.session)
    );
    ctx.cookies.push(cookie.serialize("sessionID", ctx.sessionID, opts.cookie));
  } catch (error) {
    console.error("redis failed setex operation: ", error);
  }
}
