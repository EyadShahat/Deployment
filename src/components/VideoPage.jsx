import React from "react";
import ShellLayout from "./ShellLayout.jsx";
import { useNotTube } from "../state/NotTubeState.jsx";
import { apiRequest } from "../api/client.js";

export default function VideoPage({ id }) {
  const {
    toggleLike,
    toggleSave,
    markWatched,
    likedIds,
    savedIds,
    subs,
    toggleSubscribe,
    videos,
    refreshVideos,
    user,
    createFlag,
  } = useNotTube();

  const [video, setVideo] = React.useState(() => videos.find((v) => String(v.id) === String(id)));
  const [comments, setComments] = React.useState([]);
  const [draft, setDraft] = React.useState("");
  const [selectedAccount, setSelectedAccount] = React.useState(null);
  const [accountInfo, setAccountInfo] = React.useState(null);
  const [flaggedComments, setFlaggedComments] = React.useState(new Set());
  const [subscriberCount, setSubscriberCount] = React.useState(null);
  const isAdmin = user?.role === "admin";

  React.useEffect(() => {
    // When the route id or videos list changes, sync the local video state.
    const found = videos.find((v) => String(v.id) === String(id));
    if (found) setVideo(found);
  }, [id, videos]);

  React.useEffect(() => {
    if (!video) {
      refreshVideos().then((list) => {
        const found = list.find((v) => String(v.id) === String(id));
        if (found) setVideo(found);
      });
      return;
    }
    if (video?.id) {
      markWatched(video.id);
      loadComments(video.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, video?.id, refreshVideos]);

  React.useEffect(() => {
    const channel = video?.channelName || video?.channel;
    if (!channel) {
      setSubscriberCount(null);
      return;
    }
    apiRequest(`/users/subscribers/count?channel=${encodeURIComponent(channel)}`)
      .then((res) => setSubscriberCount(res.count ?? null))
      .catch(() => setSubscriberCount(null));
  }, [video?.channelName, video?.channel]);

  async function loadComments(vid) {
    const res = await apiRequest(`/comments/video/${vid}`);
    setComments(res.comments || []);
  }

  async function addComment(e) {
    e.preventDefault();
    const txt = draft.trim();
    if (!txt || !video) return;
    if (user?.accountStatus === "flagged") {
      alert("Your account is flagged and cannot comment until resolved.");
      return;
    }
    await apiRequest(`/comments/video/${video.id}`, { method: "POST", body: { text: txt } });
    setDraft("");
    loadComments(video.id);
  }

  async function openAccountInfo(userId) {
    if (!userId) return;
    setSelectedAccount(userId);
    const res = await apiRequest(`/users/${userId}`);
    setAccountInfo(res.user);
  }

  async function flagComment(id) {
    await createFlag({ type:"comment", targetId:id, reason:"Inappropriate", message:"Flagged by admin" });
    setFlaggedComments(prev => new Set([...prev, id]));
    loadComments(video.id);
  }

  async function deleteComment(id) {
    await apiRequest(`/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c._id !== id));
  }

  if (!video) {
    return (
      <ShellLayout>
        <div style={{ padding: 16 }}>
          <a href="#/home">&lt; Back</a>
          <h2 style={{ marginTop: 8 }}>Video not found.</h2>
        </div>
      </ShellLayout>
    );
  }

  const isLiked = likedIds.includes(String(video.id));
  const isSaved = savedIds.includes(String(video.id));
  const isSubd  = subs.includes(video.channelName || video.channel);
  const src = video.src || "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  const uploaderId = video.owner;
  const accountFlagged = user?.accountStatus === "flagged";
  const isUploader = user && uploaderId && String(user.id) === String(uploaderId);

  const [q, setQ] = React.useState("");
  const goSearch = () => {
    const t = q.trim();
    window.location.hash = t ? `#/search?q=${encodeURIComponent(t)}` : "#/home";
  };

  const playerRef = React.useRef(null);
  const playerWrapRef = React.useRef(null);

  const enterFullscreen = async () => {
    const wrap = playerWrapRef.current;
    const vid  = playerRef.current;
    if (!wrap || !vid) return;

    if (vid.webkitEnterFullscreen) {
      try { vid.webkitEnterFullscreen(); } catch {}
      return;
    }
    if (!document.fullscreenElement) {
      await wrap.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const [openDesc, setOpenDesc] = React.useState(false);
  const descText = video.description || "No description provided.";

  const upNext = videos.filter((v) => String(v.id) !== String(id)).slice(0, 10);

  return (
    <ShellLayout>
      <style>{`
        :root { --bg:#f9fafb; --muted:#6b7280; --line:#e5e7eb; }
        .topbar { position: sticky; top: 0; z-index: 10; display:flex; align-items:center; gap:12px; padding:10px 12px; background: var(--bg); border-bottom:1px solid var(--line); border-radius:12px; margin-bottom:10px; }
        .searchWrap { display:flex; align-items:center; flex:1; background:#fff; border:1px solid #d1d5db; border-radius:999px; height:40px; overflow:hidden; }
        .searchInput { flex:1; height:100%; border:0; outline:none; background:transparent; color:#111; padding:0 14px; font-size:14px; }
        .searchBtn { width:44px; height:40px; border:0; background:#f3f4f6; color:#111; cursor:pointer; }
        .createBtn { height:40px; padding:0 14px; border-radius:999px; border:1px solid #d1d5db; background:#fff; color:#111; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; }
        .avatarBtn { width:36px; height:36px; border-radius:999px; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; }

        .layout { display:grid; grid-template-columns: 1fr 360px; gap:16px; }
        @media (max-width: 1024px){ .layout { grid-template-columns: 1fr; } }

        .playerWrap { position:relative; width:100%; aspect-ratio:16/9; background:#000; border-radius:14px; overflow:hidden; }
        .player { width:100%; height:100%; object-fit:cover; background:#000; display:block; }
        .fsBtn { position:absolute; right:10px; bottom:10px; height:36px; padding:0 12px; border-radius:10px; border:1px solid rgba(255,255,255,.3); background:rgba(17,24,39,.7); color:#fff; font-weight:700; cursor:pointer; }

        .vtitle { font-size:28px; font-weight:900; letter-spacing:-.01em; margin:10px 0; }
        .vmeta { color:#6b7280; font-size:13px; margin-top:-6px; margin-bottom:6px; }
        .chRow { display:flex; align-items:center; gap:12px; }
        .ava { width:44px; height:44px; background:#0f172a center/cover no-repeat; border-radius:999px; }
        .chName { font-weight:800; }
        .meta { color:#6b7280; font-size:13px; }
        .actions { margin-left:auto; display:flex; gap:10px; }
        .btn { height:36px; padding:0 14px; border:1px solid #e5e7eb; background:#fff; border-radius:999px; font-weight:700; cursor:pointer; }
        .btn.primary { background:#111827; color:#fff; border-color:#111827; }

        .descBox { margin-top:10px; border:1px solid var(--line); background:#fff; border-radius:12px; padding:12px; }
        .descText { color:#111; font-size:14px; line-height:1.45; white-space:pre-wrap; }
        .descClamp { display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
        .descToggle { margin-top:8px; font-weight:700; cursor:pointer; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; }

        .rail { display:flex; flex-direction:column; gap:12px; }
        .mini { display:grid; grid-template-columns: 160px 1fr; gap:8px; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff; text-decoration:none; color:inherit; }
        .mini .thumb { aspect-ratio:16/9; background:#d1d5db; overflow:hidden; }
        .thumbMedia { width:100%; height:100%; object-fit:cover; display:block; }
        .mini .ttl { font-weight:700; padding:8px 8px 0; }
        .mini .by { padding:0 8px 8px; color:#6b7280; font-size:12.5px; }

        .commentBox { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; margin-top:10px; }
        .commentForm { display:flex; gap:10px; margin-bottom:10px; }
        .commentInput { flex:1; height:40px; border:1px solid #e5e7eb; border-radius:10px; padding:0 12px; outline:none; }
        .commentBtn { height:40px; border-radius:10px; border:0; background:#111827; color:#fff; font-weight:700; padding:0 14px; }
        .adminCard { margin-top:12px; padding:12px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; }
      `}</style>

      {/* TOP BAR */}
      <div className="topbar" role="banner">
        <div className="searchWrap" role="search">
          <input
            className="searchInput"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                goSearch();
              }
            }}
          />
          <button className="searchBtn" type="button" aria-label="Search" onClick={goSearch}>Search</button>
        </div>
        <a className="createBtn" href="#/upload" role="button">Create</a>
        
      </div>

      <div className="layout">
        <section>
          {/* real player */}
          <div ref={playerWrapRef} className="playerWrap">
            <video
              ref={playerRef}
              className="player"
              src={src}
              controls
              playsInline
            />
            <button className="fsBtn" type="button" onClick={enterFullscreen}>
              Fullscreen
            </button>
          </div>

          <h1 className="vtitle">{video.title}</h1>
          <div className="vmeta">{video.views || 0} views</div>

          <div className="chRow">
            <div className="ava" style={video.avatarUrl ? { backgroundImage:`url(${video.avatarUrl})` } : undefined} />
            <div>
              <a
                href={`#/channel/${slugify(video.channelName || video.channel || "channel")}`}
                className="chName"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                {video.channelName || video.channel || "Channel"}
              </a>
              <div className="meta">
                {subscriberCount === null ? "—" : `${subscriberCount} subscribers`}
              </div>
            </div>

            <div className="actions">
              <button className={`btn ${isLiked ? "primary" : ""}`} onClick={() => toggleLike(video.id)}>
                {isLiked ? "Liked ✓" : "Like"}
              </button>
              <button className={`btn ${isSubd ? "primary" : ""}`} onClick={() => toggleSubscribe(video.channelName || video.channel || "Channel")}>
                {isSubd ? "Subscribed ✓" : "Subscribe"}
              </button>
              <button className={`btn ${isSaved ? "primary" : ""}`} onClick={() => toggleSave(video.id)}>
                {isSaved ? "Saved ✓" : "Save"}
              </button>
            </div>
          </div>

          {/* description */}
          <div className="descBox">
            <div className={`descText ${openDesc ? "" : "descClamp"}`}>
              {descText}
            </div>
            {descText && descText.length > 0 && (
              <button className="descToggle" type="button" onClick={()=>setOpenDesc(s=>!s)}>
                {openDesc ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          <div style={{ height: 12 }} />
          <h3 style={{ margin: "8px 0 6px" }}>{comments.length} Comments</h3>

          <form className="commentForm" onSubmit={addComment}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment..."
              className="commentInput"
            />
            <button className="commentBtn" disabled={!draft.trim()} type="submit">
              Post
            </button>
          </form>

          <div className="commentBox">
            {comments.map((c) => (
              <div key={c._id} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"6px 0", borderBottom:"1px solid #e5e7eb" }}>
                <div>
                  <strong
                    style={{ cursor: "pointer" }}
                    onClick={() => openAccountInfo(c.user?._id)}
                  >
                    {c.user?.name || c.user?.email || "User"}
                  </strong> — {c.text}
                  {isAdmin && (
                    <div style={{ fontSize:12, color:"#6b7280" }}>
                      {c.user?.email} {c.user?.accountStatus === "flagged" ? "(flagged)" : ""}
                    </div>
                  )}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {isUploader && (
                    <button
                      type="button"
                      className="btn"
                      style={{
                        height:28,
                        padding:"0 10px",
                        fontSize:12,
                        background:"#fee2e2",
                        color:"#991b1b",
                        borderColor:"#fecaca",
                      }}
                      onClick={() => deleteComment(c._id)}
                    >
                      Delete
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn"
                      style={{
                        height:28,
                        padding:"0 10px",
                        fontSize:12,
                        background: flaggedComments.has(c._id) ? "#16a34a" : undefined,
                        color: flaggedComments.has(c._id) ? "#fff" : undefined,
                        borderColor: flaggedComments.has(c._id) ? "#16a34a" : undefined,
                      }}
                      onClick={() => flagComment(c._id)}
                    >
                      {flaggedComments.has(c._id) ? "Flagged" : "Flag"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {accountInfo && selectedAccount && (
            <div className="adminCard">
              <div style={{ fontWeight:700, marginBottom:6 }}>Account info</div>
              <div>Name: {accountInfo.name}</div>
              <div>Status: {accountInfo.accountStatus}</div>
              <div>Role: {accountInfo.role}</div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
                {accountInfo.avatarUrl && <img src={accountInfo.avatarUrl} alt="" style={{ width:48, height:48, borderRadius:"50%" }} />}
                {accountInfo.bio && <div style={{ color:"#374151", fontSize:13 }}>{accountInfo.bio}</div>}
              </div>
              {isAdmin && accountInfo.role !== "admin" && (
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop:8, height:32, padding:"0 12px" }}
                  onClick={() => createFlag({ type:"account", targetId:selectedAccount, reason:"Policy violation", message:"Flagged by admin" }).then(()=>alert("Account flagged"))}
                >
                  Flag account
                </button>
              )}
            </div>
          )}
        </section>

        <aside className="rail">
          {upNext.map((v) => (
            <a key={v.id} className="mini" href={`#/video/${v.id}`}>
              <div className="thumb">
                {v.thumb ? (
                  <img className="thumbMedia" src={v.thumb} alt="" />
                ) : (
                  <video className="thumbMedia" src={v.src} muted playsInline preload="metadata" />
                )}
              </div>
              <div>
                <div className="ttl">{v.title}</div>
                <div className="by">
                  {v.channelName || v.channel} • {v.views || 0}
                </div>
              </div>
            </a>
          ))}
        </aside>
      </div>
    </ShellLayout>
  );
}

function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, "-");
}
