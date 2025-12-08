import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRequired } from "../middleware/auth.js";
import Comment from "../models/Comment.js";
import Video from "../models/Video.js";
import User from "../models/User.js";

const router = express.Router();
const commentSchema = z.object({ text: z.string().min(1) });

router.get("/video/:videoId", asyncHandler(async (req, res) => {
  const comments = await Comment.find({ video: req.params.videoId, hidden: { $ne: true } })
    .sort({ createdAt: 1 })
    .populate("user", "email name avatarUrl accountStatus role")
    .lean();
  res.json({ comments });
}));

router.post("/video/:videoId", authRequired, asyncHandler(async (req, res) => {
  const body = commentSchema.parse(req.body);
  const video = await Video.findById(req.params.videoId);
  if (!video) return res.status(404).json({ error: "Video not found" });
  const dbUser = await User.findById(req.user._id);
  if (dbUser.accountStatus === "flagged") return res.status(403).json({ error: "Account is flagged and cannot comment" });

  const comment = await Comment.create({
    video: video._id,
    user: req.user._id,
    text: body.text,
  });

  const populated = await comment.populate("user", "email name avatarUrl accountStatus role");
  res.status(201).json({ comment: populated });
}));

router.delete("/:id", authRequired, asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: "Comment not found" });

  const isOwner = String(comment.user) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  let isVideoOwner = false;

  if (!isOwner && !isAdmin) {
    const video = await Video.findById(comment.video).select("owner");
    if (video && String(video.owner) === String(req.user._id)) {
      isVideoOwner = true;
    }
    if (!isVideoOwner) return res.status(403).json({ error: "Not allowed" });
  }

  await comment.deleteOne();
  res.json({ ok: true });
}));

// hide comment (admin)
router.post("/:id/hide", authRequired, asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Not allowed" });
  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json({ error: "Comment not found" });
  comment.hidden = true;
  await comment.save();
  res.json({ ok: true });
}));

export default router;
