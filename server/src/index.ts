import { makeListener, makeRouter, Handler, Routes, listenHTTP } from "ts-http";

const handler: Handler = async function (ctx) {
  ctx.reply = JSON.stringify({ hello: "world" });
};

const handlers: Routes = {
  "/": handler,
};

const defaultRoute: Handler = async function (ctx) {
  ctx.status = 404;
};

const router = makeRouter(handlers, defaultRoute);
const listener = makeListener(router);

listenHTTP(listener, 3000n);
