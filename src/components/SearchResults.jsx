import React from "react";
import ShellLayout from "./ShellLayout.jsx";
import { useNotTube } from "../state/NotTubeState.jsx";

export default function SearchResults({ q = "" }) {
  const [term, setTerm] = React.useState(decodeURIComponent(q || ""));
  const { videos, refreshVideos } = useNotTube();

  React.useEffect(() => { refreshVideos(); }, [refreshVideos]);

  const { videos: videoResults, channels } = React.useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return { videos, channels: [] };
    const vidsMatched = videos.filter(v =>
      (v.title || "").toLowerCase().includes(t) ||
      (v.channelName || v.channel || "").toLowerCase().includes(t) ||
      (v.description || "").toLowerCase().includes(t)
    );
    const matchedIds = new Set(vidsMatched.map((v) => String(v.id)));
    const vidsOthers = videos.filter((v) => !matchedIds.has(String(v.id)));
    const vids = [...vidsMatched, ...vidsOthers];
    const chans = Array.from(
      new Map(
        videos
          .map((v) => [v.channelName || v.channel, v])
          .filter(([name]) => name && name.toLowerCase().includes(t))
      ).values()
    );
    return { videos: vids, channels: chans };
  }, [term, videos]);

  const goSearch = () => {
    const t = term.trim();
    window.location.hash = t ? `#/search?q=${encodeURIComponent(t)}` : "#/home";
  };

  return (
    <ShellLayout>
      <style>{`
        .bar { position:sticky; top:0; z-index:2; background:#f9fafb; padding:10px 0 14px; }
        .searchLine { display:flex; gap:12px; }
        .searchWrap { flex:1; display:flex; align-items:center; background:#fff; border:1px solid #d1d5db; border-radius:999px; height:44px; overflow:hidden; }
        .inp { flex:1; height:100%; border:0; outline:none; background:transparent; padding:0 14px; font-size:15px; }
        .btn { height:44px; padding:0 16px; border-radius:999px; border:1px solid #d1d5db; background:#fff; font-weight:700; cursor:pointer; }
        .list { display:flex; flex-direction:column; gap:14px; margin-top:12px; }
        .item { display:grid; grid-template-columns: 320px 1fr; gap:12px; border:1px solid #e5e7eb; background:#fff; border-radius:12px; overflow:hidden; text-decoration:none; color:inherit; }
        .thumb { aspect-ratio:16/9; background:#d1d5db; overflow:hidden; border-radius:10px; }
        .thumbMedia { width:100%; height:100%; object-fit:cover; display:block; }
        .meta { padding:10px; }
        .ttl { font-weight:800; font-size:16px; margin-bottom:6px; line-height:1.25; }
        .by { color:#6b7280; font-size:12.5px; }
        .desc { color:#374151; font-size:13px; margin-top:6px; line-height:1.3; }
        .channelCard { display:flex; align-items:center; gap:14px; border:1px solid #e5e7eb; background:#fff; border-radius:12px; padding:12px; text-decoration:none; color:inherit; }
        .channelAvatar { width:64px; height:64px; border-radius:999px; background:#111827 center/cover no-repeat; flex:0 0 auto; }
        .channelName { font-weight:800; font-size:16px; }
        .channelMeta { color:#6b7280; font-size:12.5px; margin-top:2px; }
        .channelDesc { color:#374151; font-size:13px; margin-top:6px; line-height:1.3; }
        @media (max-width: 900px){ .item { grid-template-columns: 1fr; } }
        .empty { padding:24px; border:1px dashed #e5e7eb; border-radius:12px; background:#fff; }
      `}</style>

      <div className="bar">
        <div className="searchLine">
          <div className="searchWrap" role="search">
            <input
              className="inp"
              value={term}
              onChange={(e)=>setTerm(e.target.value)}
              placeholder="Search"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  goSearch();
                }
              }}
            />
            <button className="btn" type="button" onClick={goSearch}>Search</button>
          </div>
        </div>
      </div>

      {term.trim() && videoResults.length === 0 && channels.length === 0 && (
        <div className="empty">No results for <strong>{term}</strong>.</div>
      )}

      {channels.length > 0 && (
        <div className="list">
          {channels.map((v) => (
            <a key={v.channelName || v.channel} href={`#/channel/${encodeURIComponent((v.channelName || v.channel || "").replace(/\s+/g, "-").toLowerCase())}`} className="channelCard">
              <div className="channelAvatar" style={v.avatarUrl ? { backgroundImage:`url(${v.avatarUrl})` } : undefined}>
                {!v.avatarUrl && (
                  <span style={{ width:"100%", textAlign:"center", display:"block", color:"#fff", fontWeight:700 }}>
                    {(v.channelName || v.channel || "C").slice(0,1).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <div className="channelName">{v.channelName || v.channel || "Channel"}</div>
                <div className="channelMeta">
                  {v.owner?.bio || ""}
                </div>
                <div className="channelMeta">
                  {(v.owner?.subscriptions?.length || 0)} subscribers • {(v.channelVideoCount ?? 0)} videos
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <div className="list">
        {videoResults.map(v => (
          <a key={v.id} href={`#/video/${v.id}`} className="item">
            <div className="thumb">
              {v.thumb ? (
                <img className="thumbMedia" src={v.thumb} alt="" />
              ) : (
                <video className="thumbMedia" src={v.src} muted playsInline preload="metadata" />
              )}
            </div>
            <div className="meta">
              <div className="ttl">{v.title}</div>
              <div className="by">
                {v.channelName || v.channel} • {v.views || 0} views
              </div>
              {v.description && <div className="desc">{v.description}</div>}
            </div>
          </a>
        ))}
      </div>
    </ShellLayout>
  );
}
