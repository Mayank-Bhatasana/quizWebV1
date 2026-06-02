import crypto from "crypto";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { prisma } from "./lib/prisma.js";
import openapi from "../openapi.json" with { type: "json" };
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
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



const server = createServer(app);
const wss = new WebSocketServer({ server });
const roomSubscribers = new Map<string, Set<WebSocket>>();

const subscribeToRoom = (code: string, ws: WebSocket) => {
  const roomCode = code.trim().toUpperCase();
  if (!roomCode) return;

  let subscribers = roomSubscribers.get(roomCode);
  if (!subscribers) {
    subscribers = new Set<WebSocket>();
    roomSubscribers.set(roomCode, subscribers);
  }

  subscribers.add(ws);
};

const unsubscribeSocket = (ws: WebSocket) => {
  for (const [roomCode, subscribers] of roomSubscribers.entries()) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      roomSubscribers.delete(roomCode);
    }
  }
};

const publishToRoom = (code: string, payload: unknown) => {
  const roomCode = code.trim().toUpperCase();
  if (!roomCode) return;

  const subscribers = roomSubscribers.get(roomCode);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};

const emojiPool = ["🧠", "⚡", "🌟", "🎯", "🧩", "🚀", "🍀", "🔥"];
const bgPool = [
  "bg-violet-200",
  "bg-sky-200",
  "bg-emerald-200",
  "bg-orange-200",
  "bg-pink-200",
  "bg-indigo-200",
  "bg-cyan-200",
  "bg-amber-200",
  "bg-rose-200",
  "bg-lime-200",
  "bg-teal-200",
];

function getAvatarForName(id: string, name: string) {
  let hash = 0;
  const str = id + name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const emojiIndex = Math.abs(hash) % emojiPool.length;
  const bgIndex = Math.abs(hash + 1) % bgPool.length;
  return {
    emoji: emojiPool[emojiIndex],
    bg: bgPool[bgIndex],
  };
}

async function saveAnswer({
  roomId,
  participantId,
  roomQuestionId,
  selectedOptionId,
  timeTakenSeconds,
}: {
  roomId: string;
  participantId: string;
  roomQuestionId: string;
  selectedOptionId?: string | null;
  timeTakenSeconds?: number | null;
}) {
  const roomQuestion = await prisma.roomQuestion.findUnique({
    where: { id: roomQuestionId },
  });
  if (!roomQuestion || roomQuestion.roomId !== roomId) {
    throw new Error("Room question not found");
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
      throw new Error("Invalid selected option");
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
      timeTakenSeconds: typeof timeTakenSeconds === "number" && Number.isInteger(timeTakenSeconds)
        ? timeTakenSeconds
        : null,
    },
    create: {
      roomId,
      roomQuestionId,
      participantId,
      selectedOptionId: selectedOptionId ?? null,
      isCorrect,
      timeTakenSeconds: typeof timeTakenSeconds === "number" && Number.isInteger(timeTakenSeconds)
        ? timeTakenSeconds
        : null,
    },
  });

  return answer;
}

async function computeLeaderboard(roomId: string) {
  const participants = await prisma.roomParticipant.findMany({
    where: { roomId, isHost: false },
    include: {
      profile: true,
      answers: {
        include: {
          roomQuestion: true,
        },
      },
    },
  });

  const totalQuestions = await prisma.roomQuestion.count({
    where: { roomId },
  });

  const entries = participants.map((p) => {
    const correct = p.answers.filter((a) => a.isCorrect).length;
    const score = p.answers.reduce((sum, a) => sum + (a.isCorrect ? a.roomQuestion.points * 100 : 0), 0);
    const timeSeconds = p.answers.reduce((sum, a) => sum + (a.timeTakenSeconds ?? 0), 0);
    const avatarInfo = getAvatarForName(p.profileId, p.displayName);

    return {
      id: p.profileId,
      name: p.displayName,
      avatar: avatarInfo.emoji,
      avatarBg: avatarInfo.bg,
      score,
      correct,
      total: totalQuestions,
      timeSeconds,
    };
  });

  return entries.sort((a, b) => b.score - a.score || a.timeSeconds - b.timeSeconds);
}

const dirtyRooms = new Set<string>();

const broadcastLeaderboard = async (roomCode: string) => {
  try {
    const room = await prisma.quizRoom.findUnique({
      where: { code: roomCode.toUpperCase() },
    });
    if (!room) return;

    const scoreboard = await computeLeaderboard(room.id);

    publishToRoom(roomCode, {
      type: "leaderboard_updated",
      roomId: room.id,
      scoreboard,
    });
  } catch (error) {
    console.error(`Error broadcasting leaderboard for room ${roomCode}:`, error);
  }
};

setInterval(async () => {
  if (dirtyRooms.size === 0) return;

  const codesToProcess = Array.from(dirtyRooms);
  dirtyRooms.clear();

  for (const code of codesToProcess) {
    await broadcastLeaderboard(code);
  }
}, 1000);

const markRoomDirty = (roomCode: string) => {
  dirtyRooms.add(roomCode.trim().toUpperCase());
};

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
        const room = await prisma.quizRoom.findUnique({
          where: { code: code.toUpperCase() }
        });
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
app.get("/health", (req, res) => res.json({ status: "ok" }));

const GUEST_COOKIE_NAME = "quiz_guest";
const AUTH_COOKIE_NAME = "quiz_auth";
const ROOM_CODE_LENGTH = 6;
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const AUTH_RATE_WINDOW_MS = 1000 * 60 * 10;
const AUTH_RATE_MAX_LOGIN = 20;
const AUTH_RATE_MAX_REGISTER = 8;
const AUTH_SIGNING_SECRET = process.env.AUTH_SIGNING_SECRET ?? "dev-change-me";

const authRateLimiter = new Map<string, { count: number; resetAt: number }>();

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
  const cookie = `${GUEST_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""
    }`;
  res.setHeader("Set-Cookie", cookie);
};

const appendSetCookie = (res: express.Response, cookieValue: string) => {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", [cookieValue]);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookieValue]);
    return;
  }

  res.setHeader("Set-Cookie", [String(existing), cookieValue]);
};

const setAuthCookie = (res: express.Response, token: string, expiresAt: number) => {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`;
  appendSetCookie(res, cookie);
};

const clearAuthCookie = (res: express.Response) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`;
  appendSetCookie(res, cookie);
};

const createAuthToken = (payload: { userId: string; profileId: string; email: string }) => {
  const expiresAt = Date.now() + AUTH_TOKEN_TTL_MS;
  const encodedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: expiresAt,
    }),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", AUTH_SIGNING_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  };
};

const verifyAuthToken = (token: string) => {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = crypto
    .createHmac("sha256", AUTH_SIGNING_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as {
      userId: string;
      profileId: string;
      email: string;
      exp: number;
    };

    if (!parsed.userId || !parsed.profileId || !parsed.email || !parsed.exp) {
      return null;
    }

    if (Date.now() >= parsed.exp) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasStrongPassword = (password: string) => {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return password.length >= 8 && hasUpper && hasLower && hasDigit && hasSpecial;
};

const checkAuthRateLimit = (
  req: express.Request,
  key: "login" | "register",
  maxRequests: number,
) => {
  const now = Date.now();
  const bucketKey = `${key}:${req.ip ?? "unknown"}`;
  const current = authRateLimiter.get(bucketKey);
  if (!current || current.resetAt <= now) {
    authRateLimiter.set(bucketKey, {
      count: 1,
      resetAt: now + AUTH_RATE_WINDOW_MS,
    });
    return { limited: false };
  }

  if (current.count >= maxRequests) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      ),
    };
  }

  current.count += 1;
  authRateLimiter.set(bucketKey, current);
  return { limited: false };
};

const getAuthSession = (req: express.Request) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;
  return verifyAuthToken(token);
};

const requireAuth = (req: express.Request, res: express.Response) => {
  const session = getAuthSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
};

const ensureUserProfile = async (user: { id: string; email: string }) => {
  const existing = await prisma.profile.findUnique({
    where: { userId: user.id },
  });
  if (existing) return existing;

  return prisma.profile.create({
    data: {
      userId: user.id,
      username: user.email.split("@")[0] ?? "User",
      isTemporary: false,
    },
  });
};

const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
};

const verifyPassword = (password: string, passwordHash: string) => {
  const [algorithm, salt, storedDigest] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedDigest) return false;

  const digestBuffer = Buffer.from(storedDigest, "hex");
  const calculated = crypto.scryptSync(password, salt, digestBuffer.length);
  return crypto.timingSafeEqual(digestBuffer, calculated);
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
 * POST /api/auth/register
 * Creates a user account and profile.
 * Body: { email: string, password: string, username: string, avatarUrl?: string }
 */
app.post("/api/auth/register", async (req, res) => {
  const rateLimit = checkAuthRateLimit(req, "register", AUTH_RATE_MAX_REGISTER);
  if (rateLimit.limited) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds ?? 60));
    return res.status(429).json({ error: "Too many register attempts. Please try again later." });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const avatarUrl =
    typeof req.body?.avatarUrl === "string" && req.body.avatarUrl.trim()
      ? req.body.avatarUrl.trim()
      : null;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email" });
  }

  if (!username || username.length < 2) {
    return res.status(400).json({ error: "Username must be at least 2 characters" });
  }

  if (!hasStrongPassword(password)) {
    return res.status(400).json({ error: "Password must have 8+ chars, uppercase, lowercase, number, and symbol" });
  }

  if (!email || !username || password.length < 8) {
    return res.status(400).json({ error: "email, username and password (min 8 chars) are required" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        profile: {
          create: {
            username,
            avatarUrl,
            isTemporary: false,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const profile = user.profile ?? (await ensureUserProfile(user));
    const auth = createAuthToken({
      userId: user.id,
      profileId: profile.id,
      email: user.email,
    });
    setAuthCookie(res, auth.token, auth.expiresAt);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user account.
 * Body: { email: string, password: string }
 */
app.post("/api/auth/login", async (req, res) => {
  const rateLimit = checkAuthRateLimit(req, "login", AUTH_RATE_MAX_LOGIN);
  if (rateLimit.limited) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds ?? 60));
    return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const profile = user.profile ?? (await ensureUserProfile(user));
  const auth = createAuthToken({
    userId: user.id,
    profileId: profile.id,
    email: user.email,
  });
  setAuthCookie(res, auth.token, auth.expiresAt);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user profile from cookie session.
 */
app.get("/api/auth/me", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ error: "Unauthorized" });
  }

  const profile = await ensureUserProfile(user);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  });
});

/**
 * POST /api/auth/logout
 * Clears the auth cookie session.
 */
app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
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
  const avatarUrl =
    typeof req.body?.avatarUrl === "string" && req.body.avatarUrl.trim()
      ? req.body.avatarUrl.trim()
      : null;
  if (!displayName) {
    return res.status(400).json({ error: "displayName is required" });
  }

  const guestToken = generateGuestToken();
  const profile = await prisma.profile.create({
    data: {
      username: displayName,
      isTemporary: true,
      guestToken,
      avatarUrl,
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

   if (room.status !== "LOBBY") {
    return res.status(409).json({ error: "Quiz has already started" });
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
 * GET /api/rooms/:code/participants
 * Returns all participants in a room.
 */
app.get("/api/rooms/:code/participants", async (req, res) => {
  const { code } = req.params;

  const room = await prisma.quizRoom.findUnique({ where: { code } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const participants = await prisma.roomParticipant.findMany({
    where: { roomId: room.id },
    orderBy: { joinedAt: "asc" },
    include: {
      profile: {
        select: {
          avatarUrl: true,
        },
      },
    },
  });

  const payload = participants.map((participant) => ({
    id: participant.id,
    profileId: participant.profileId,
    displayName: participant.displayName,
    isHost: participant.isHost,
    joinedAt: participant.joinedAt,
    avatarUrl: participant.profile?.avatarUrl ?? null,
  }));

  return res.json({ participants: payload });
});

/**
 * GET /api/rooms/:code
 * Returns room details and question count.
 */
app.get("/api/rooms/:code", async (req, res) => {
  const { code } = req.params;

  const room = await prisma.quizRoom.findUnique({
    where: { code },
    include: {
      questions: true,
    },
  });

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  return res.json({
    room: {
      id: room.id,
      code: room.code,
      status: room.status,
      hostId: room.hostId,
      startedAt: room.startedAt,
      questionCount: room.questions.length,
    },
  });
});

/**
 * POST /api/rooms/:code/start
 * Starts the quiz for a room (host only).
 * Body: { profileId: string }
 */
app.post("/api/rooms/:code/start", async (req, res) => {
  const { code } = req.params;
  const { profileId } = req.body ?? {};

  if (!profileId) {
    return res.status(400).json({ error: "profileId is required" });
  }

  const room = await prisma.quizRoom.findUnique({ where: { code } });
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  if (room.hostId !== profileId) {
    return res.status(403).json({ error: "Only the host can start the quiz" });
  }

  if (room.status !== "LOBBY") {
    return res.status(400).json({ error: "Room is not in LOBBY status" });
  }

  const updated = await prisma.quizRoom.update({
    where: { id: room.id },
    data: {
      status: "LIVE",
      startedAt: new Date(),
    },
  });

  publishToRoom(updated.code, {
    type: "room_started",
    room: {
      code: updated.code,
      status: updated.status,
      startedAt: updated.startedAt,
    },
  });

  return res.json({
    room: {
      id: updated.id,
      code: updated.code,
      status: updated.status,
      hostId: updated.hostId,
      startedAt: updated.startedAt,
    },
  });
});

/**
 * GET /api/room/:code/questions
 * Returns ordered room questions with options.
 */
app.get("/api/room/:code/questions", async (req, res) => {
  const { code } = req.params;

  const room = await prisma.quizRoom.findUnique({
    where: { code },
    include: {
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          question: {
            include: {
              options: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const questions = room.questions.map((roomQuestion) => ({
    id: roomQuestion.question.id,
    roomQuestionId: roomQuestion.id,
    text: roomQuestion.question.text,
    points: roomQuestion.points,
    explanation: roomQuestion.question.explanation ?? undefined,
    options: roomQuestion.question.options.map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }));

  return res.json({ questions });
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

  try {
    const room = await prisma.quizRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const answer = await saveAnswer({
      roomId,
      participantId,
      roomQuestionId,
      selectedOptionId,
      timeTakenSeconds,
    });

    markRoomDirty(room.code);
    return res.json({ answer });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || "Failed to submit answer" });
  }
});

/**
 * GET /api/rooms/:roomId/scoreboard
 * Returns total scores per participant for a room.
 */
app.get("/api/rooms/:roomId/scoreboard", async (req, res) => {
  const { roomId } = req.params;
  try {
    const scoreboard = await computeLeaderboard(roomId);
    return res.json({ scoreboard });
  } catch (error: any) {
    console.error("Scoreboard fetch error:", error);
    return res.status(500).json({ error: "Failed to load scoreboard" });
  }
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
