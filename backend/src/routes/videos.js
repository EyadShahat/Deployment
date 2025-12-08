import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRequired } from "../middleware/auth.js";
import Video from "../models/Video.js";
import User from "../models/User.js";

const router = express.Router();

const videoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  src: z.string().url("src must be a valid URL"),
  length: z.string().optional(),
  thumb: z.string().optional(),
  channelName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

function canEdit(user, video) {
  if (!user || !video) return false;
  return user.role === "admin" || String(video.owner) === String(user._id);
}

router.get("/", asyncHandler(async (req, res) => {
  const { search } = req.query;
  const baseQuery = search
    ? { title: { $regex: search, $options: "i" } }
    : {};
  const query = { ...baseQuery, hidden: { $ne: true } };

  const videos = await Video.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("owner", "avatarUrl name")
    .lean();

  const normalized = videos.map((v) => ({
    ...v,
    avatarUrl: v.avatarUrl || v.owner?.avatarUrl || "",
    channelName: v.channelName || v.owner?.name || "Channel",
  }));

  res.json({ videos: normalized });
}));

router.get("/mine", authRequired, asyncHandler(async (req, res) => {
  const videos = await Video.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ videos });
}));

router.post("/", authRequired, asyncHandler(async (req, res) => {
  const body = videoSchema.parse(req.body);
  if (req.user.accountStatus === "flagged") return res.status(403).json({ error: "Account is flagged and cannot upload" });
  const video = await Video.create({
    ...body,
    length: body.length || "0:00",
    thumb: body.thumb || "",
    channelName: req.user.name || body.channelName || "You",
    avatarUrl: req.user.avatarUrl || "",
    owner: req.user._id,
  });
  res.status(201).json({ video });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id).populate("owner", "avatarUrl name").lean();
  if (!video) return res.status(404).json({ error: "Video not found" });
  const merged = {
    ...video,
    avatarUrl: video.avatarUrl || video.owner?.avatarUrl || "",
    channelName: video.channelName || video.owner?.name || "Channel",
  };
  res.json({ video: merged });
}));

router.put("/:id", authRequired, asyncHandler(async (req, res) => {
  const body = videoSchema.partial().parse(req.body);
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found" });
  if (!canEdit(req.user, video)) return res.status(403).json({ error: "Not allowed" });

  Object.assign(video, body);
  await video.save();
  res.json({ video });
}));

router.delete("/:id", authRequired, asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found" });
  if (!canEdit(req.user, video)) return res.status(403).json({ error: "Not allowed" });

  await video.deleteOne();
  res.json({ ok: true });
}));

router.post("/:id/like", authRequired, asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found" });

  const user = await User.findById(req.user._id);
  const vidId = String(video._id);
  const already = user.likedVideos.map(String).includes(vidId);

  if (already) {
    user.likedVideos = user.likedVideos.filter((v) => String(v) !== vidId);
    video.likes = video.likes.filter((u) => String(u) !== String(user._id));
  } else {
    user.likedVideos.push(video._id);
    video.likes.push(user._id);
  }

  await user.save();
  await video.save();
  res.json({ liked: !already, likesCount: video.likes.length });
}));

router.post("/:id/save", authRequired, asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found" });

  const user = await User.findById(req.user._id);
  const vidId = String(video._id);
  const already = user.savedVideos.map(String).includes(vidId);

  if (already) {
    user.savedVideos = user.savedVideos.filter((v) => String(v) !== vidId);
  } else {
    user.savedVideos.push(video._id);
  }

  await user.save();
  res.json({ saved: !already });
}));

router.post("/:id/watch", authRequired, asyncHandler(async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: "Video not found" });

  const user = await User.findById(req.user._id);
  const vidId = String(video._id);
  const already = user.watchedVideos.map(String).includes(vidId);

  if (!already) {
    user.watchedVideos.push(video._id);
    video.views += 1;
    await user.save();
    await video.save();
  }

  res.json({ watched: true, views: video.views });
}));

export default router;
