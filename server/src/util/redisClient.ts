import Redis from "ioredis";

const redisURL = process.env["REDIS_URL"];
if (!redisURL) {
  console.error("redis url is not defined");
  process.exit(1);
}

const redisClient = new Redis(redisURL);

export default redisClient;
