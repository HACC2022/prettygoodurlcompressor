import { makeListener, makeRouter, Handler, Routes, listenHTTP } from "ts-http";
import useCookies from "./middleware/useCookies.js";
import useSession from "./middleware/useSession.js";
import redisClient from "./util/redisClient.js";

const handler: Handler = async function (ctx) {
  ctx.reply = JSON.stringify({ hello: "world" });
};

const handlers: Routes = {
  "/": handler,
};

const defaultRoute: Handler = async function (ctx) {
  ctx.status = 404;
};

const SESSION_SECRET = process.env["SESSION_SECRET"];
if (!SESSION_SECRET) {
  console.error("missing environment variable 'SESSION_SECRET'");
  process.exit(1);
}
const router = makeRouter(handlers, defaultRoute);
const wrappedRouter = useCookies(
  useSession(router, {
    idleTimeout: 1000 * 60 * 30,
    absoluteTimeout: 1000 * 60 * 60 * 4,
    client: redisClient,
    secret: SESSION_SECRET,
    cookie: {
      httpOnly: true,
      maxAge: 60 * 30,
      sameSite: "lax",
      secure: process.env["NODE_ENV"] !== "development",
    },
  }),
  null
);
const listener = makeListener(wrappedRouter);

listenHTTP(listener, 3000n);
