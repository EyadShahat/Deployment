import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import Video from "../models/Video.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const avatarSchema = z.string().optional().refine((val) => {
  if (!val) return true;
  if (val.startsWith("/avatars/")) return true;
  try { new URL(val); return true; } catch { return false; }
}, { message: "avatarUrl must be a full URL or start with /avatars/" });

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1).optional(),
  avatarUrl: avatarSchema,
});

const adminEmails = (process.env.ADMIN_EMAILS || "admin@nottube.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const profileSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: avatarSchema,
  bio: z.string().optional(),
});

const subscriptionSchema = z.object({
  channel: z.string().min(1),
});

function makeToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "changeme",
    { expiresIn: "7d" },
  );
}

function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl || "",
    role: user.role,
    accountStatus: user.accountStatus,
    bio: user.bio || "",
    likedVideos: user.likedVideos || [],
    savedVideos: user.savedVideos || [],
    watchedVideos: user.watchedVideos || [],
    subscriptions: user.subscriptions || [],
  };
}

async function ensureAdminRole(user) {
  const shouldBeAdmin = adminEmails.includes(user.email.toLowerCase());
  if (shouldBeAdmin && user.role !== "admin") {
    user.role = "admin";
    await user.save();
  }
  return user;
}

router.post("/signup", asyncHandler(async (req, res) => {
  const { email, password, name, avatarUrl } = credsSchema.parse(req.body);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(400).json({ error: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.toLowerCase(),
    name: name || email.split("@")[0],
    avatarUrl: avatarUrl || "",
    passwordHash,
    role: adminEmails.includes(email.toLowerCase()) ? "admin" : "user",
    likedVideos: [],
    savedVideos: [],
    watchedVideos: [],
    subscriptions: [],
  });

  const token = makeToken(user);
  res.json({ token, user: publicUser(user) });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = credsSchema.pick({ email: true, password: true }).parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  await ensureAdminRole(user);
  const token = makeToken(user);
  res.json({ token, user: publicUser(user) });
}));

router.get("/me", authRequired, asyncHandler(async (req, res) => {
  const user = await ensureAdminRole(req.user);
  res.json({ user: publicUser(user) });
}));

router.put("/profile", authRequired, asyncHandler(async (req, res) => {
  const body = profileSchema.parse(req.body);
  if (body.name) req.user.name = body.name;
  if (typeof body.avatarUrl !== "undefined") req.user.avatarUrl = body.avatarUrl;
  if (typeof body.bio !== "undefined") req.user.bio = body.bio;
  await req.user.save();

   // keep avatars in sync on existing videos/comments for this user
   try {
     await Video.updateMany(
       { owner: req.user._id },
       { avatarUrl: req.user.avatarUrl || "" },
     );
   } catch { /* ignore */ }

  res.json({ user: publicUser(req.user) });
}));

router.post("/subscriptions/toggle", authRequired, asyncHandler(async (req, res) => {
  const { channel } = subscriptionSchema.parse(req.body);
  const exists = (req.user.subscriptions || []).includes(channel);
  if (exists) {
    req.user.subscriptions = req.user.subscriptions.filter((c) => c !== channel);
  } else {
    req.user.subscriptions = [...(req.user.subscriptions || []), channel];
  }
  await req.user.save();
  res.json({ subscribed: !exists, subscriptions: req.user.subscriptions });
}));

export default router;
