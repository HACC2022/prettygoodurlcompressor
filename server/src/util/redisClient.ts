import { createClient } from "redis";

const redisURL = process.env["REDIS_URL"];
if (!redisURL) {
  throw new Error("redis url is not defined");
}

const redisClient = createClient({ url: redisURL });

redisClient.on("error", (err) => {
  console.error("redis client error: ", err);
});

try {
  await redisClient.connect();
} catch (error) {
  throw new Error("redis client failed to connect");
}

export default redisClient;
