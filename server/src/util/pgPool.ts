import pg from "pg";

const postgresURL = process.env["POSTGRES_URL"];
if (!postgresURL) {
  throw new Error("postgres url is not defined");
}

const pgPool = new pg.Pool({ connectionString: postgresURL });

pgPool.on("error", (err) => {
  console.error("postgres client error: ", err);
});

export default pgPool;
