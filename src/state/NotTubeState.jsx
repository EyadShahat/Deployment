import React from "react";
import { apiRequest, setAuthToken, clearAuthToken, getApiBase } from "../api/client.js";

const Ctx = React.createContext(null);

export function NotTubeProvider({ children }) {
  const [user, setUser] = React.useState(null);
  const [token, setToken] = React.useState(() => {
    try { return localStorage.getItem("nt_token") || ""; } catch { return ""; }
  });
  const [videos, setVideos] = React.useState([]);
  const [durations, setDurations] = React.useState({});
  const [flags, setFlags] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (token) {
      setAuthToken(token);
      bootstrap();
    } else {
      clearAuthToken();
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const likedIds = React.useMemo(() => (user?.likedVideos || []).map(String), [user]);
  const savedIds = React.useMemo(() => (user?.savedVideos || []).map(String), [user]);
  const watchedIds = React.useMemo(() => (user?.watchedVideos || []).map(String), [user]);
  const subs = React.useMemo(() => user?.subscriptions || [], [user]);

  async function bootstrap() {
    try {
      setLoading(true);
      if (token) {
        const me = await apiRequest("/auth/me");
        setUser(me.user);
      }
    } catch (err) {
      console.error(err);
      logout();
    } finally {
      setLoading(false);
      refreshVideos().catch(() => {});
    }
  }

  const refreshVideos = React.useCallback(async (search) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await apiRequest(`/videos${qs}`);
    const normalized = (res.videos || []).map((v) => ({ ...v, id: v._id || v.id }));
    setVideos(normalized);
    normalized.forEach((v) => {
      if ((!v.length || v.length === "0:00") && v.src) {
        ensureDuration(v.src);
      }
    });
    return normalized;
  }, []);

  const login = React.useCallback(async (identifier, password) => {
    const res = await apiRequest("/auth/login", { method: "POST", body: { identifier, password } });
    setToken(res.token);
    setUser(res.user);
    setAuthToken(res.token);
    await refreshVideos();
  }, [refreshVideos]);

  const signup = React.useCallback(async ({ email, password, name, avatarUrl }) => {
    const res = await apiRequest("/auth/signup", { method: "POST", body: { email, password, name, avatarUrl } });
    setToken(res.token);
    setUser(res.user);
    setAuthToken(res.token);
    await refreshVideos();
  }, [refreshVideos]);

  const logout = React.useCallback(() => {
    setToken("");
    setUser(null);
    clearAuthToken();
  }, []);

  const createVideo = React.useCallback(async (payload) => {
    const res = await apiRequest("/videos", { method: "POST", body: payload });
    await refreshVideos();
    return res.video?._id;
  }, [refreshVideos]);

  const updateVideo = React.useCallback(async (id, payload) => {
    await apiRequest(`/videos/${id}`, { method: "PUT", body: payload });
    await refreshVideos();
  }, [refreshVideos]);

  const deleteVideo = React.useCallback(async (id) => {
    await apiRequest(`/videos/${id}`, { method: "DELETE" });
    await refreshVideos();
  }, [refreshVideos]);

  const createFlag = React.useCallback(async ({ type, targetId, reason, message }) => {
    const res = await apiRequest("/flags", { method: "POST", body: { type, targetId, reason, message } });
    return res.flag;
  }, []);

  const loadFlags = React.useCallback(async () => {
    const res = await apiRequest("/flags");
    setFlags(res.flags || []);
    return res.flags || [];
  }, []);

  const loadMyFlags = React.useCallback(async () => {
    const res = await apiRequest("/flags/for-me");
    setFlags(res.flags || []);
    return res.flags || [];
  }, []);

  const updateFlag = React.useCallback(async (id, body) => {
    const res = await apiRequest(`/flags/${id}`, { method: "PATCH", body });
    setFlags((prev) => prev.map((f) => String(f._id || f.id) === String(id) ? res.flag : f));
    return res.flag;
  }, []);

  const appealFlag = React.useCallback(async (id, appealMessage) => {
    const res = await apiRequest(`/flags/${id}/appeal`, { method: "POST", body: { appealMessage } });
    setFlags((prev) => prev.map((f) => String(f._id || f.id) === String(id) ? res.flag : f));
    return res.flag;
  }, []);

  const toggleLike = React.useCallback(async (id) => {
    if (!user) return redirectToLogin();
    const res = await apiRequest(`/videos/${id}/like`, { method: "POST" });
    setUser((prev) => {
      if (!prev) return prev;
      const exists = prev.likedVideos?.map(String).includes(String(id));
      const likedVideos = exists
        ? prev.likedVideos.filter((v) => String(v) !== String(id))
        : [...(prev.likedVideos || []), id];
      return { ...prev, likedVideos };
    });
    // update likes count locally
    setVideos((prev) => prev.map((v) => String(v.id) === String(id) ? { ...v, likesCount: res.likesCount ?? v.likes?.length } : v));
  }, [user]);

  const toggleSave = React.useCallback(async (id) => {
    if (!user) return redirectToLogin();
    await apiRequest(`/videos/${id}/save`, { method: "POST" });
    setUser((prev) => {
      if (!prev) return prev;
      const exists = prev.savedVideos?.map(String).includes(String(id));
      const savedVideos = exists
        ? prev.savedVideos.filter((v) => String(v) !== String(id))
        : [...(prev.savedVideos || []), id];
      return { ...prev, savedVideos };
    });
  }, [user]);

  const markWatched = React.useCallback(async (id) => {
    if (!user) return redirectToLogin();
    const res = await apiRequest(`/videos/${id}/watch`, { method: "POST" });
    setUser((prev) => {
      if (!prev) return prev;
      const exists = prev.watchedVideos?.map(String).includes(String(id));
      const watchedVideos = exists ? prev.watchedVideos : [...(prev.watchedVideos || []), id];
      return { ...prev, watchedVideos };
    });
    if (res?.views) {
      setVideos((prev) => prev.map((v) => String(v.id) === String(id) ? { ...v, views: res.views } : v));
    }
  }, [user]);

  const toggleSubscribe = React.useCallback(async (channel) => {
    if (!user) return redirectToLogin();
    const res = await apiRequest("/auth/subscriptions/toggle", { method: "POST", body: { channel } });
    setUser((prev) => prev ? { ...prev, subscriptions: res.subscriptions } : prev);
  }, [user]);

  const updateProfile = React.useCallback(async (payload) => {
    const res = await apiRequest("/auth/profile", { method: "PUT", body: payload });
    setUser(res.user);
    await refreshVideos();
  }, [refreshVideos]);

  const changePassword = React.useCallback(async ({ currentPassword, newPassword }) => {
    return apiRequest("/auth/password", { method: "POST", body: { currentPassword, newPassword } });
  }, []);

  const ensureDuration = React.useCallback((src) => {
    if (!src || durations[src]) return;
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = src;
    video.onloadedmetadata = () => {
      const secs = video.duration || 0;
      const formatted = formatDuration(secs);
      setDurations((prev) => ({ ...prev, [src]: formatted }));
      setVideos((prev) => prev.map((v) => v.src === src ? { ...v, length: formatted } : v));
    };
    video.onerror = () => {
      setDurations((prev) => ({ ...prev, [src]: "0:00" }));
    };
  }, [durations]);

  function formatDuration(totalSeconds) {
    const secs = Math.floor(totalSeconds || 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function redirectToLogin() {
    window.location.hash = "#/login";
  }

  const value = React.useMemo(() => ({
    user,
    token,
    videos,
    loading,
    error,
    likedIds,
    savedIds,
    watchedIds,
    subs,
    flags,
    apiBase: getApiBase(),
    setError,
    refreshVideos,
    login,
    signup,
    logout,
    createVideo,
    updateVideo,
    deleteVideo,
    updateProfile,
    changePassword,
    createFlag,
    loadFlags,
    loadMyFlags,
    updateFlag,
    appealFlag,
    ensureDuration,
    toggleLike,
    toggleSave,
    markWatched,
    toggleSubscribe,
  }), [user, token, videos, loading, error, likedIds, savedIds, watchedIds, subs, flags]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotTube() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useNotTube must be used inside <NotTubeProvider>");
  return ctx;
}
