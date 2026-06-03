import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import {
  checkAuthRateLimit,
  emailRegex,
  hasStrongPassword,
  hashPassword,
  ensureUserProfile,
  createAuthToken,
  setAuthCookie,
  verifyPassword,
  requireAuth,
  clearAuthCookie,
  parseCookies,
  GUEST_COOKIE_NAME,
  generateGuestToken,
  setGuestCookie,
  AUTH_RATE_MAX_REGISTER,
  AUTH_RATE_MAX_LOGIN,
} from "../utils/auth.js";

const router: Router = Router();

/**
 * POST /api/auth/register
 * Creates a user account and profile.
 */
router.post("/auth/register", async (req, res) => {
  const rateLimit = checkAuthRateLimit(req, "register", AUTH_RATE_MAX_REGISTER);
  if (rateLimit.limited) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds ?? 60));
    res.status(429).json({ error: "Too many register attempts. Please try again later." });
    return;
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const avatarUrl =
    typeof req.body?.avatarUrl === "string" && req.body.avatarUrl.trim()
      ? req.body.avatarUrl.trim()
      : null;

  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Please enter a valid email" });
    return;
  }

  if (!username || username.length < 2) {
    res.status(400).json({ error: "Username must be at least 2 characters" });
    return;
  }

  if (!hasStrongPassword(password)) {
    res.status(400).json({ error: "Password must have 8+ chars, uppercase, lowercase, number, and symbol" });
    return;
  }

  if (!email || !username || password.length < 8) {
    res.status(400).json({ error: "email, username and password (min 8 chars) are required" });
    return;
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

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user account.
 */
router.post("/auth/login", async (req, res) => {
  const rateLimit = checkAuthRateLimit(req, "login", AUTH_RATE_MAX_LOGIN);
  if (rateLimit.limited) {
    res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds ?? 60));
    res.status(429).json({ error: "Too many login attempts. Please try again later." });
    return;
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const profile = user.profile ?? (await ensureUserProfile(user));
  const auth = createAuthToken({
    userId: user.id,
    profileId: profile.id,
    email: user.email,
  });
  setAuthCookie(res, auth.token, auth.expiresAt);

  res.json({
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
router.get("/auth/me", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    clearAuthCookie(res);
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await ensureUserProfile(user);

  res.json({
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
router.post("/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

/**
 * POST /api/guest
 * Creates or restores a guest profile using an httpOnly cookie.
 */
router.post("/guest", async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[GUEST_COOKIE_NAME];

  if (existingToken) {
    const existingProfile = await prisma.profile.findUnique({
      where: { guestToken: existingToken },
    });
    if (existingProfile) {
      res.json({ profile: existingProfile });
      return;
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
    res.status(400).json({ error: "displayName is required" });
    return;
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
  res.json({ profile });
});

export default router;
