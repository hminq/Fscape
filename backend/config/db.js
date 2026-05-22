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
const cleanEnv = (value) => {
  if (value === undefined || value === null) return undefined
  const text = String(value).trim()
  if (!text || text === "null" || text === "undefined") return undefined
  return text
}

const databaseUrl = cleanEnv(process.env.DATABASE_URL)
const dbName = cleanEnv(process.env.DB_NAME) || cleanEnv(process.env.POSTGRES_DB)
const dbUser = cleanEnv(process.env.DB_USER) || cleanEnv(process.env.POSTGRES_USER)
const dbPassword = cleanEnv(process.env.DB_PASSWORD) || cleanEnv(process.env.POSTGRES_PASSWORD)
const dbHost = cleanEnv(process.env.DB_HOST) || (cleanEnv(process.env.POSTGRES_DB) ? "db" : "localhost")
const dbPort = cleanEnv(process.env.DB_PORT) || 5432

if (!databaseUrl && (!dbName || !dbUser)) {
  throw new Error("Database configuration missing. Set DATABASE_URL or DB_NAME/DB_USER/DB_PASSWORD.")
}

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
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
