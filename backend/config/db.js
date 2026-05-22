require("./env")
const { Sequelize } = require("sequelize")
// for testing
// const sequelize = process.env.NODE_ENV === "test"
//   ? new Sequelize("sqlite::memory:", { logging: false })
//   : process.env.DATABASE_URL
//     ? new Sequelize(process.env.DATABASE_URL, {
//         dialect: "postgres",
//         logging: false,
//         dialectOptions: {
//           ssl: {
//             require: true,
//             rejectUnauthorized: false
//           }
//         }
//       })
//     : new Sequelize(
//         process.env.DB_NAME,
//         process.env.DB_USER,
//         process.env.DB_PASSWORD,
//         {
//           host: process.env.DB_HOST || "localhost",
//           port: process.env.DB_PORT || 5432,
//           dialect: "postgres",
//           logging: false
//         }
//       )

// Runtime DB configuration.
const dbName = process.env.DB_NAME || process.env.POSTGRES_DB
const dbUser = process.env.DB_USER || process.env.POSTGRES_USER
const dbPassword = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD
const dbHost = process.env.DB_HOST || (process.env.POSTGRES_DB ? "db" : "localhost")
const dbPort = process.env.DB_PORT || 5432

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      logging: false,
      dialectOptions: {
        connectTimeout: 5000,
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
      dbName,
      dbUser,
      dbPassword,
      {
        host: dbHost,
        port: dbPort,
        dialect: "postgres",
        logging: false,
        dialectOptions: {
          connectTimeout: 5000
        }
      }
    )
const connectDB = async () => {
  try {
    await sequelize.authenticate()
    console.log("PostgreSQL connected")
  } catch (error) {
    console.error("Database connection failed")
    console.error(error)
    process.exit(1)
  }
}

module.exports = {
  sequelize,
  connectDB
}
