import React from "react";
import ShellLayout from "./ShellLayout.jsx";
import { useNotTube } from "../state/NotTubeState.jsx";

export default function HomePage() {
  const [q, setQ] = React.useState("");
  const { videos, refreshVideos } = useNotTube();

  React.useEffect(() => { refreshVideos(); }, [refreshVideos]);

  function goSearch() {
    const term = q.trim();
    window.location.hash = term ? `#/search?q=${encodeURIComponent(term)}` : "#/home";
  }

  return (
    <ShellLayout active="home">
      <style>{`
        :root { --fg:#0b0b0b; --muted:#6b7280; --line:#e5e7eb; --bg:#f9fafb; }
        * { box-sizing: border-box; }
        .topbar { position: sticky; top: 0; z-index: 10; display:flex; align-items:center; gap:12px; padding:10px 12px; background: var(--bg); border-bottom:1px solid #e5e7eb; border-radius:12px; margin-bottom:10px; }
        .searchWrap { display:flex; align-items:center; flex:1; background:#fff; border:1px solid #d1d5db; border-radius:16px; height:44px; overflow:hidden; padding:0 10px; gap:8px; }
        .searchIcon { font-size:18px; opacity:0.6; }
        .searchInput { flex:1; height:100%; border:0; outline:none; background:transparent; color:#111; padding:0 4px; font-size:14px; }
        .searchBtn { height:32px; border:0; background:#111827; color:#fff; cursor:pointer; padding:0 12px; border-radius:12px; font-weight:700; }
        .createBtn { height:40px; padding:0 14px; border-radius:999px; border:1px solid #d1d5db; background:#fff; color:#111; font-weight:700; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; }
        .avatarBtn { width:36px; height:36px; border-radius:999px; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; }
        .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: clamp(10px, 1.6vw, 16px); align-items:start; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden; text-decoration:none; color:inherit; }
        .thumb { aspect-ratio:16/9; background:#d1d5db; position:relative; width:100%; overflow:hidden; border-radius:10px; }
        .thumbMedia { width:100%; height:100%; object-fit:cover; display:block; }
        .time { position:absolute; right:8px; bottom:8px; background:rgba(15,23,42,.9); color:#fff; font-size:12px; padding:2px 6px; border-radius:6px; }
        .meta { display:flex; gap:10px; padding:10px; }
        .avatar { width:34px; height:34px; border-radius:999px; background:#111827 center/cover no-repeat; flex:0 0 auto; }
        .title { font-weight:700; font-size:14px; line-height:1.3; }
        .byline { color:var(--muted); font-size:12px; margin-top:4px; }
        .dot { width:4px; height:4px; background:#cbd5e1; border-radius:999px; display:inline-block; margin:0 6px; transform:translateY(-2px); }
        .strip { margin-top: clamp(16px, 2vw, 22px); background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding: 14px; }
        .stripHeader { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .stripTitle { display:flex; align-items:center; gap:8px; font-weight:800; }
        .more { font-size:13px; color:#111827; background:#f3f4f6; border:1px solid #e5e7eb; height:36px; padding:0 10px; border-radius:10px; }
        .row { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: clamp(10px, 1.6vw, 16px); }
      `}</style>

      {/* TOP BAR with NO <form> */}
      <div className="topbar" role="banner">
        <div className="searchWrap" role="search">
          <span className="searchIcon" aria-hidden>🔍</span>
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
          <button
            className="searchBtn"
            type="button"
            aria-label="Search"
            onClick={goSearch}
          >
            Search
          </button>
        </div>
        <a className="createBtn" href="#/upload" role="button">Create</a>
        
      </div>

      {/* grid */}
      <section className="grid" aria-label="Videos">
        {videos.slice(0, 6).map((v) => (
          <a key={v.id} href={`#/video/${v.id}`} className="card">
            <div className="thumb">
              {v.thumb ? (
                <img className="thumbMedia" src={v.thumb} alt="" />
              ) : (
                <video className="thumbMedia" src={v.src} muted playsInline preload="metadata" />
              )}
              <span className="time">{v.length}</span>
            </div>
            <div className="meta">
              <div className="avatar" style={v.avatarUrl ? { backgroundImage:`url(${v.avatarUrl})` } : undefined} />
              <div>
                <div className="title">{v.title}</div>
                <div className="byline">
                  {v.channelName || v.channel}<span className="dot" />{v.views || 0} views<span className="dot" />{new Date(v.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>
          </a>
        ))}
      </section>

    </ShellLayout>
  );
}
