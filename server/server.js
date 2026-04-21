import "dotenv/config";

import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

import { connectToDatabase } from "./db/connect.js";
import adminRouter from "./routes/admin.js";
import authRouter from "./routes/auth.js";
import eventsRouter from "./routes/events.js";
import rsvpRouter from "./routes/rsvp.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../client/dist");
const port = Number(process.env.PORT || 3001);
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

const setStaticAssetHeaders = (response, filePath) => {
  if (filePath.includes(`${path.sep}assets${path.sep}`)) {
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  response.setHeader("Cache-Control", "no-cache");
};

const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(
  cors({
    origin: isProduction ? true : clientOrigin,
    credentials: true
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/rsvps", rsvpRouter);
app.use("/api/admin", adminRouter);

app.use(
  express.static(clientDistPath, {
    index: false,
    setHeaders: setStaticAssetHeaders
  })
);

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) {
    next();
    return;
  }

  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

app.use(errorHandler);

export const startServer = async () => {
  await connectToDatabase();

  return app.listen(port, () => {
    logger.info(`BBQ On Ingraham server listening on port ${port}`);
  });
};

if (process.env.VITEST !== "true") {
  startServer().catch((error) => {
    logger.error("Failed to start server", error);
    process.exitCode = 1;
  });
}

export { app };
