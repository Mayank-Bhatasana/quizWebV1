import crypto from "crypto";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const GUEST_COOKIE_NAME = "quiz_guest";
export const AUTH_COOKIE_NAME = "quiz_auth";
export const ROOM_CODE_LENGTH = 6;
export const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const AUTH_RATE_WINDOW_MS = 1000 * 60 * 10;
export const AUTH_RATE_MAX_LOGIN = 20;
export const AUTH_RATE_MAX_REGISTER = 8;
const AUTH_SIGNING_SECRET = process.env.AUTH_SIGNING_SECRET ?? "dev-change-me";

export const authRateLimiter = new Map<string, { count: number; resetAt: number }>();

export const parseCookies = (cookieHeader?: string) => {
  if (!cookieHeader) return {} as Record<string, string>;
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

export const generateGuestToken = () => crypto.randomBytes(32).toString("base64url");

export const generateRoomCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

export const setGuestCookie = (res: Response, token: string) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${GUEST_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""}`;
  res.setHeader("Set-Cookie", cookie);
};

export const appendSetCookie = (res: Response, cookieValue: string) => {
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

export const setAuthCookie = (res: Response, token: string, expiresAt: number) => {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? "; Secure" : ""}`;
  appendSetCookie(res, cookie);
};

export const clearAuthCookie = (res: Response) => {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`;
  appendSetCookie(res, cookie);
};

export const createAuthToken = (payload: { userId: string; profileId: string; email: string }) => {
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

export const verifyAuthToken = (token: string) => {
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

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const hasStrongPassword = (password: string) => {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return password.length >= 8 && hasUpper && hasLower && hasDigit && hasSpecial;
};

export const checkAuthRateLimit = (
  req: Request,
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

export const getAuthSession = (req: Request) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME];
  if (!token) return null;
  return verifyAuthToken(token);
};

export const requireAuth = (req: Request, res: Response) => {
  const session = getAuthSession(req);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
};

export const ensureUserProfile = async (user: { id: string; email: string }) => {
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

export const hashPassword = (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
};

export const verifyPassword = (password: string, passwordHash: string) => {
  const [algorithm, salt, storedDigest] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !salt || !storedDigest) return false;

  const digestBuffer = Buffer.from(storedDigest, "hex");
  const calculated = crypto.scryptSync(password, salt, digestBuffer.length);
  return crypto.timingSafeEqual(digestBuffer, calculated);
};
