import { Pool } from 'pg';
import { Sequelize } from "sequelize";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

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

export const pgPool = new Pool({
  // --- Connection String ---
  connectionString: SUPABASE_PG_POOLER,

  // --- Pool Sizing ---
  min: 2,
  max: 20, 

  // --- Timeouts ---
  connectionTimeoutMillis: 2000,   // 2 sec
  idleTimeoutMillis: 30000,   // 30 sec
  
  // --- Security & Maintenance ---
  ssl: IS_PRODUCTION ? { rejectUnauthorized: false } : false,
  maxUses: 7500 
});

export const checkpointer = new PostgresSaver(pgPool);

export async function createPersistenceTables() {
  try {
    // This creates the 'checkpoints' and 'writes' tables if they are missing.
    // It uses "CREATE TABLE IF NOT EXISTS", so it is safe to run on every restart.
    await checkpointer.setup();
    console.log("✅ Supabase persistence tables ready.");
  } catch (error) {
    console.error("❌ Failed to setup persistence tables:", error.message);
  }
}