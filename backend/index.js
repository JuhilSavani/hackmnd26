import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import passport from "passport";
import authRoutes from "./auth/routes.js";
import uploadRoutes from "./upload/routes.js";
import threadsRoutes from "./threads/routes.js";
import documentRoutes from "./document/routes.js";
import agentRoutes from "./agent/routes.js";
import { configPassport, authenticateJWT } from "./configs/passport.configs.js";
import { connectPostgres, createPersistenceTables } from "./configs/sequelize.configs.js";

const app = express();

// Constants
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";
const APP_ORIGIN_URL = process.env.APP_ORIGIN_URL || "http://localhost:3000"

// Configs
configPassport();
connectPostgres();
createPersistenceTables();

// Middlewares
app.use(cors({
  origin: APP_ORIGIN_URL,
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE"],
  credentials: true,
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,    // Enable standard IETF rate limit headers
  legacyHeaders: false,     // Disable legacy `X-RateLimit-*` headers
  message: 'Too many requests. Please try again after 15 minutes.',
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.url}`);
  console.log(`Cookies present:`, req.cookies ? Object.keys(req.cookies) : "None");
  next();
});

// Root Route
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>hackmnd26</title>
      </head>
      <style>
        *, *::before, *::after{
          padding: 0;
          margin: 0;
          box-sizing: border-box;
        }
        ::selection {
          background-color: rgb(252, 181, 59, 0.05); 
          color: #FCB53B;
        }
        body{
          min-height: 100vh;
          background: #191919;
          font-family: "Lucida Console", Monaco, monospace;
        }
        h1{
          padding: 1rem;
          color: #FFF287;
        }
      </style>
      <body>
        <h1>Server is up and running!</h1>
      </body>
    </html>
  `);
});

// Actual Routes
app.use("/api/auth", authRoutes);
app.use(authenticateJWT);
app.use("/api/upload", uploadRoutes);
app.use("/api/threads", threadsRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/agent", agentRoutes);

app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode at http://localhost:${PORT}`);
});