import pg from "pg";

const postgresURL = process.env["POSTGRES_URL"];
if (!postgresURL) {
  console.error("postgres url is not defined");
  process.exit(1);
}

const pgPool = new pg.Pool({ connectionString: postgresURL });

pgPool.on("error", (err) => {
  console.error("postgres pool error: ", err);
});

export default pgPool;
