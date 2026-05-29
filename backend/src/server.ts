import crypto from "crypto";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { prisma } from "./lib/prisma.js";
import openapi from "../openapi.json" with { type: "json" };

const app = express();

const allowedOrigins = ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

const GUEST_COOKIE_NAME = "quiz_guest";
const ROOM_CODE_LENGTH = 6;

const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return {} as Record<string, string>;
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const generateGuestToken = () => crypto.randomBytes(32).toString("base64url");

const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

const setGuestCookie = (res: express.Response, token: string) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${GUEST_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${
    isProd ? "; Secure" : ""
  }`;
  res.setHeader("Set-Cookie", cookie);
};

/**
 * GET /
 * Health check endpoint.
 */
app.get("/", (req, res) => {
  res.json({
    message: "Backend working!",
  });
});

/**
 * GET /docs
 * Returns the OpenAPI spec.
 */
app.get("/docs", (req, res) => {
  res.json(openapi);
});

/**
 * GET /docs/ui
 * Swagger UI for the OpenAPI spec.
 */
app.use("/docs/ui", swaggerUi.serve, swaggerUi.setup(openapi));

/**
 * POST /api/guest
 * Creates or restores a guest profile using an httpOnly cookie.
 * Body: { displayName: string }
 */
app.post("/api/guest", async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[GUEST_COOKIE_NAME];

  if (existingToken) {
    const existingProfile = await prisma.profile.findUnique({
      where: { guestToken: existingToken },
    });
    if (existingProfile) {
      return res.json({ profile: existingProfile });
    }
  }

  const displayName =
    typeof req.body?.displayName === "string"
      ? req.body.displayName.trim()
      : "";
  if (!displayName) {
    return res.status(400).json({ error: "displayName is required" });
  }

  const guestToken = generateGuestToken();
  const profile = await prisma.profile.create({
    data: {
      username: displayName,
      isTemporary: true,
      guestToken,
    },
  });

  setGuestCookie(res, guestToken);
  return res.json({ profile });
});

/**
 * POST /api/questions
 * Creates a question with options.
 * Body: { createdById: string, text: string, explanation?: string, options: { text: string, isCorrect?: boolean, sortOrder?: number }[] }
 */
app.post("/api/questions", async (req, res) => {
  const { createdById, text, explanation, options } = req.body ?? {};
  if (
    !createdById ||
    typeof text !== "string" ||
    !Array.isArray(options) ||
    options.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "createdById, text, options are required" });
  }

  const normalizedOptions = options.map((option: any, index: number) => ({
    text: String(option.text ?? "").trim(),
    isCorrect: Boolean(option.isCorrect),
    sortOrder: Number.isInteger(option.sortOrder) ? option.sortOrder : index,
  }));

  if (normalizedOptions.some((option) => !option.text)) {
    return res.status(400).json({ error: "option text is required" });
  }

  const question = await prisma.question.create({
    data: {
      createdById,
      text: text.trim(),
      explanation: typeof explanation === "string" ? explanation : null,
      options: {
        create: normalizedOptions,
      },
    },
    include: { options: true },
  });

  return res.json({ question });
});

/**
 * POST /api/rooms
 * Creates a room with ordered questions and points.
 * Body: { hostProfileId: string, questions: { questionId: string, points?: number, orderIndex?: number }[] }
 */
app.post("/api/rooms", async (req, res) => {
  const { hostProfileId, questions } = req.body ?? {};
  if (!hostProfileId || !Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ error: "hostProfileId and questions are required" });
  }

  let code = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.quizRoom.findUnique({ where: { code } });
    if (!existing) break;
    code = generateRoomCode();
    attempts += 1;
  }

  const room = await prisma.quizRoom.create({
    data: {
      hostId: hostProfileId,
      code,
      participants: {
        create: {
          profileId: hostProfileId,
          displayName: "Host",
          isHost: true,
        },
      },
      questions: {
        create: questions.map((item: any, index: number) => ({
          questionId: item.questionId,
          orderIndex: Number.isInteger(item.orderIndex)
            ? item.orderIndex
            : index,
          points: Number.isInteger(item.points) ? item.points : 1,
        })),
      },
    },
    include: { questions: true, participants: true },
  });

  return res.json({ room });
});

/**
 * POST /api/rooms/:code/join
 * Joins a room with a profile and display name.
 * Body: { profileId: string, displayName: string }
 */
app.post("/api/rooms/:code/join", async (req, res) => {
  const { code } = req.params;
  const { profileId, displayName } = req.body ?? {};
  if (!profileId || typeof displayName !== "string" || !displayName.trim()) {
    return res
      .status(400)
      .json({ error: "profileId and displayName are required" });
  }

  const room = await prisma.quizRoom.findUnique({ where: { code } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const participant = await prisma.roomParticipant.upsert({
    where: {
      roomId_profileId: {
        roomId: room.id,
        profileId,
      },
    },
    update: {
      displayName: displayName.trim(),
    },
    create: {
      roomId: room.id,
      profileId,
      displayName: displayName.trim(),
      isHost: false,
    },
  });

  return res.json({ roomId: room.id, participant });
});

/**
 * POST /api/rooms/:roomId/answer
 * Submits an answer for a room question.
 * Body: { participantId: string, roomQuestionId: string, selectedOptionId?: string, timeTakenSeconds?: number }
 */
app.post("/api/rooms/:roomId/answer", async (req, res) => {
  const { roomId } = req.params;
  const { participantId, roomQuestionId, selectedOptionId, timeTakenSeconds } =
    req.body ?? {};

  if (!participantId || !roomQuestionId) {
    return res
      .status(400)
      .json({ error: "participantId and roomQuestionId are required" });
  }

  const roomQuestion = await prisma.roomQuestion.findUnique({
    where: { id: roomQuestionId },
  });
  if (!roomQuestion || roomQuestion.roomId !== roomId) {
    return res.status(404).json({ error: "Room question not found" });
  }

  let isCorrect = false;
  if (selectedOptionId) {
    const option = await prisma.questionOption.findFirst({
      where: {
        id: selectedOptionId,
        questionId: roomQuestion.questionId,
      },
    });
    if (!option) {
      return res.status(400).json({ error: "Invalid selected option" });
    }
    isCorrect = option.isCorrect;
  }

  const answer = await prisma.participantAnswer.upsert({
    where: {
      roomQuestionId_participantId: {
        roomQuestionId,
        participantId,
      },
    },
    update: {
      selectedOptionId: selectedOptionId ?? null,
      isCorrect,
      timeTakenSeconds: Number.isInteger(timeTakenSeconds)
        ? timeTakenSeconds
        : null,
    },
    create: {
      roomId,
      roomQuestionId,
      participantId,
      selectedOptionId: selectedOptionId ?? null,
      isCorrect,
      timeTakenSeconds: Number.isInteger(timeTakenSeconds)
        ? timeTakenSeconds
        : null,
    },
  });

  return res.json({ answer });
});

/**
 * GET /api/rooms/:roomId/scoreboard
 * Returns total scores per participant for a room.
 */
app.get("/api/rooms/:roomId/scoreboard", async (req, res) => {
  const { roomId } = req.params;
  const answers = await prisma.participantAnswer.findMany({
    where: { roomId },
    include: {
      roomQuestion: true,
      participant: true,
    },
  });

  const scores = new Map<
    string,
    { participantId: string; displayName: string; score: number }
  >();
  for (const answer of answers) {
    const participantId = answer.participantId;
    const entry = scores.get(participantId) ?? {
      participantId,
      displayName: answer.participant.displayName,
      score: 0,
    };

    if (answer.isCorrect) {
      entry.score += answer.roomQuestion.points;
    }

    scores.set(participantId, entry);
  }

  const scoreboard = Array.from(scores.values()).sort(
    (a, b) => b.score - a.score,
  );
  return res.json({ scoreboard });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
