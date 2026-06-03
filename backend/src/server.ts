import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import openapi from "../openapi.json" with { type: "json" };

import { subscribeToRoom, unsubscribeSocket } from "./sockets/roomSocket.js";
import { getActiveRoom, saveAnswer, markRoomDirty } from "./services/room.service.js";
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173",
  "*",
]);

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isHttp = url.protocol === "http:" || url.protocol === "https:";
    return isLocalhost && isHttp;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

// Routes mounting
app.use("/api", authRoutes);
app.use("/api", roomRoutes);

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => {
  res.json({
    message: "Backend working!",
  });
});

// Swagger and Docs endpoints
app.get("/docs", (req, res) => {
  res.json(openapi);
});
app.use("/docs/ui", swaggerUi.serve, swaggerUi.setup(openapi));

// HTTP and WS Server Setup
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let payload: any;
    try {
      payload = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (!payload || typeof payload !== "object") {
      return;
    }

    if (payload.type === "subscribe" && typeof payload.code === "string") {
      subscribeToRoom(payload.code, ws);
    } else if (payload.type === "submit_answer") {
      const { code, participantId, roomQuestionId, selectedOptionId, timeTakenSeconds } = payload;
      if (!code || !participantId || !roomQuestionId) {
        return;
      }

      try {
        const room = await getActiveRoom(code);
        if (!room || room.status !== "LIVE") return;

        await saveAnswer({
          roomId: room.id,
          participantId,
          roomQuestionId,
          selectedOptionId,
          timeTakenSeconds,
        });

        markRoomDirty(code);
      } catch (err) {
        console.error("WS submit_answer error:", err);
      }
    }
  });

  ws.on("close", () => {
    unsubscribeSocket(ws);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
