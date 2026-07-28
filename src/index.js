import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { Router } from "express";

import { signup, login, me } from "./routes/auth.js";
import { setup, migrate } from "./routes/setup.js";
import vehicleRoutes from "./routes/vehicles.js";
import uploadRoutes from "./routes/upload.js";
import voteRoutes from "./routes/vote.js";
import garajeRoutes from "./routes/garaje.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// Auth routes (functions -> Router)
const authRouter = Router();
authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.get("/me", me);
app.use("/api/auth", authRouter);

app.use("/api/vehicles", vehicleRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/vote", voteRoutes);
app.use("/api/garaje", garajeRoutes);

// Setup (create tables)
app.get("/api/setup", setup);
app.get("/api/migrate", migrate);

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[Blacklist API] Running on http://localhost:${PORT}`);
});
