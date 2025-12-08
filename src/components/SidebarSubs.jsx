import React from "react";
import { useNotTube } from "../state/NotTubeState.jsx";

export default function SidebarSubs() {
  const { subs, videos, user } = useNotTube();
  if (!subs || subs.length === 0) return null;

  const byName = new Map();
  videos.forEach((v) => {
    const name = v.channelName || v.channel;
    if (!name) return;
    const ava = v.avatarUrl || v.owner?.avatarUrl;
    if (!byName.has(name) && ava) {
      byName.set(name, ava);
    }
  });

  return (
    <div className="sb-subs">
      <style>{`
        .sb-subs { margin: 14px 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; }
        .sb-title { font-weight: 800; font-size: 13px; color:#111827; margin: 0 4px 8px; }
        .sb-list { display:flex; flex-direction:column; gap:8px; max-height: 220px; overflow:auto; padding-right: 4px; }
        .sb-row { display:flex; align-items:center; gap:10px; padding:8px 8px; border-radius:10px; text-decoration:none; color:inherit; }
        .sb-row:hover { background:#f3f4f6; }
        .sb-ava { width:28px; height:28px; border-radius:999px; background:#0f172a center/cover no-repeat; flex:0 0 auto; }
        .sb-name { font-size:14px; font-weight:600; flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sb-open { opacity:.7; }
      `}</style>

      <div className="sb-title">Subscribed channels</div>
      <div className="sb-list">
        {subs.map((name) => (
          <a
            key={name}
            className="sb-row"
            href={`#/channel/${toSlug(name)}`}
            title={name}
          >
            <div
              className="sb-ava"
              style={{
                backgroundImage: (byName.get(name) || (user?.name === name ? user?.avatarUrl : "")) ? `url(${byName.get(name) || user?.avatarUrl})` : undefined,
              }}
            />
            <div className="sb-name">{name}</div>
            <div className="sb-open" aria-hidden>↗</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function toSlug(s){ return encodeURIComponent(s.replace(/\s+/g, "-").toLowerCase()); }
