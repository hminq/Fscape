require("./env");
const { Sequelize } = require("sequelize");
const { getRuntimeConfig } = require("./runtimeConfig");

const { database } = getRuntimeConfig();

const sequelize = database.mode === "url"
  ? new Sequelize(database.url, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        connectTimeout: 5000,
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
    })
  : database.mode === "sqlite"
    ? new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
      })
    : new Sequelize(
        database.databaseName,
        database.username,
        database.password,
        {
          host: database.host,
          port: database.port,
          dialect: "postgres",
          logging: false,
          dialectOptions: {
            connectTimeout: 5000,
          },
        }
      );

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected");
  } catch (error) {
    console.error("Database connection failed");
    console.error(error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  connectDB,
};
