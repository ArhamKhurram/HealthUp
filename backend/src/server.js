// Server bootstrap: loads env, connects DB pool, and starts HTTP listener.
require("dotenv").config();

const app = require("./app");
const { getPool } = require("./config/db");

const port = process.env.PORT || 5000;

getPool()
  .then(() => {
    app.listen(port, () => {
      console.log(`HealthUp API listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to SQL Server", error);
    process.exit(1);
  });
