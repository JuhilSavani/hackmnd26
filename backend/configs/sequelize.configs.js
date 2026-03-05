import { Sequelize } from "sequelize";

const IS_PRODUCTION = process.env.NODE_ENV !== "development";
const SUPABASE_PG_POOLER = process.env.SUPABASE_PG_POOLER;

export const sequelize = new Sequelize(
  SUPABASE_PG_POOLER,
  {
    dialect: "postgres",
    pool: { max: 20, min: 2, acquire: 30000, idle: 2000, maxUses: 7500 },
    dialectOptions: {
      ssl: IS_PRODUCTION ? {
        require: true,             // force SSL usage
        rejectUnauthorized: false, // skip cert validation
      } : false,
    },
    logging: IS_PRODUCTION ? false : console.log, // show queries in dev
  }
);

export const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Postgres connected successfully!");

    if (!IS_PRODUCTION) {
      await sequelize.sync({ alter: true });
      console.log("🛠️ Database synced (dev mode).");
    }
  } catch (error) {
    console.error("❌ Unable to connect to Postgres:", error.message);
  }
};