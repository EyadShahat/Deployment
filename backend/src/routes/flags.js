import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRequired, requireAdmin } from "../middleware/auth.js";
import Flag from "../models/Flag.js";
import Video from "../models/Video.js";
import Comment from "../models/Comment.js";

const router = express.Router();

const createSchema = z.object({
  type: z.enum(["video", "account", "comment"]),
  targetId: z.string().min(1),
  reason: z.string().min(3),
  message: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(["open", "in_review", "resolved"]).optional(),
  resolution: z.string().optional(),
  outcome: z.enum(["accepted", "denied"]).optional(),
});

const appealSchema = z.object({
  appealMessage: z.string().min(1),
});

router.post("/", authRequired, asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const flag = await Flag.create({
    ...body,
    message: body.message || "",
    createdBy: req.user._id,
  });

  // Apply immediate effect: hide or flag target
  if (body.type === "video") {
    const Video = (await import("../models/Video.js")).default;
    await Video.findByIdAndUpdate(body.targetId, { hidden: true });
  } else if (body.type === "comment") {
    const Comment = (await import("../models/Comment.js")).default;
    await Comment.findByIdAndUpdate(body.targetId, { hidden: true });
  } else if (body.type === "account") {
    const User = (await import("../models/User.js")).default;
    await User.findByIdAndUpdate(body.targetId, { accountStatus: "flagged" });
    const Video = (await import("../models/Video.js")).default;
    await Video.updateMany({ owner: body.targetId }, { hidden: true });
  }

  res.status(201).json({ flag });
}));

router.get("/", authRequired, requireAdmin, asyncHandler(async (_req, res) => {
  const flags = await Flag.find().sort({ createdAt: -1 }).lean();
  res.json({ flags });
}));

router.get("/mine", authRequired, asyncHandler(async (req, res) => {
  const flags = await Flag.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ flags });
}));

router.get("/for-me", authRequired, asyncHandler(async (req, res) => {
  const videos = await Video.find({ owner: req.user._id }).select("_id").lean();
  const comments = await Comment.find({ user: req.user._id }).select("_id").lean();
  const videoIds = videos.map(v => String(v._id));
  const commentIds = comments.map(c => String(c._id));
  const accountId = String(req.user._id);

  const flags = await Flag.find({
    $or: [
      { type: "video", targetId: { $in: videoIds } },
      { type: "comment", targetId: { $in: commentIds } },
      { type: "account", targetId: accountId },
    ],
  }).sort({ createdAt: -1 }).lean();

  res.json({ flags });
}));

router.patch("/:id", authRequired, requireAdmin, asyncHandler(async (req, res) => {
  const body = updateSchema.parse(req.body);
  const flag = await Flag.findById(req.params.id);
  if (!flag) return res.status(404).json({ error: "Flag not found" });

  Object.assign(flag, body);
  if (body.outcome && !body.status) {
    flag.status = "resolved";
  }
  await flag.save();

  // if admin resolved, update target visibility/status
  try {
    if (flag.type === "video" && body.outcome) {
      const Video = (await import("../models/Video.js")).default;
      const vid = await Video.findById(flag.targetId);
      if (vid) {
        vid.hidden = body.outcome === "denied";
        await vid.save();
      }
    }
    if (flag.type === "comment" && body.outcome) {
      const Comment = (await import("../models/Comment.js")).default;
      const c = await Comment.findById(flag.targetId);
      if (c) {
        c.hidden = body.outcome === "denied";
        await c.save();
      }
    }
    if (flag.type === "account" && body.outcome) {
      const User = (await import("../models/User.js")).default;
      const u = await User.findById(flag.targetId);
      if (u && u.role !== "admin") {
        const unban = body.outcome === "denied";
        u.accountStatus = unban ? "active" : "flagged";
        await u.save();
        const Video = (await import("../models/Video.js")).default;
        await Video.updateMany({ owner: flag.targetId }, { hidden: !unban });
      }
    }
    // If resolved without specifying an outcome, default to unban/unhide
    if (flag.type === "account" && !body.outcome && body.status === "resolved") {
      const User = (await import("../models/User.js")).default;
      const u = await User.findById(flag.targetId);
      if (u && u.role !== "admin") {
        u.accountStatus = "active";
        await u.save();
        const Video = (await import("../models/Video.js")).default;
        await Video.updateMany({ owner: flag.targetId }, { hidden: false });
      }
    }
  } catch (err) {
    console.error("Failed to update target state after flag resolution", err);
  }

  res.json({ flag });
}));

router.post("/:id/appeal", authRequired, asyncHandler(async (req, res) => {
  const { appealMessage } = appealSchema.parse(req.body);
  const flag = await Flag.findById(req.params.id);
  if (!flag) return res.status(404).json({ error: "Flag not found" });
  if (String(flag.createdBy) !== String(req.user._id)) return res.status(403).json({ error: "Not allowed" });
  if (flag.appealMessage) return res.status(400).json({ error: "Appeal already submitted" });

  flag.appealMessage = appealMessage;
  if (flag.status === "resolved") flag.status = "open";
  await flag.save();
  res.json({ flag });
}));

export default router;
