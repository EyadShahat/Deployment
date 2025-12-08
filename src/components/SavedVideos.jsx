import React from "react";
import ShellLayout from "./ShellLayout.jsx";
import { useNotTube } from "../state/NotTubeState.jsx";

export default function SavedVideos() {
  const { savedIds, videos } = useNotTube();
  const items = videos.filter((v) => savedIds.includes(String(v.id)));

  const [category, setCategory] = React.useState("all");
  const [newCategory, setNewCategory] = React.useState("");
  const [assignments, setAssignments] = React.useState({});
  const [categories, setCategories] = React.useState(["all"]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("nt_saved_categories");
      if (raw) {
        const parsed = JSON.parse(raw);
        setAssignments(parsed.assignments || {});
        const unique = Array.from(new Set(["all", ...(parsed.categories || [])]));
        setCategories(unique);
      }
    } catch { /* ignore */ }
  }, []);

  const saveState = (nextAssignments, nextCategories) => {
    setAssignments(nextAssignments);
    setCategories(nextCategories);
    try {
      localStorage.setItem("nt_saved_categories", JSON.stringify({
        assignments: nextAssignments,
        categories: nextCategories.filter((c) => c !== "all"),
      }));
    } catch { /* ignore */ }
  };

  const handleAddCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.includes(name)) {
      setNewCategory("");
      setCategory(name);
      return;
    }
    const nextCategories = [...categories, name];
    saveState(assignments, nextCategories);
    setNewCategory("");
    setCategory(name);
  };

  const handleAssign = (vid, cat) => {
    const next = { ...assignments, [vid]: cat === "all" ? "" : cat };
    saveState(next, categories.includes(cat) ? categories : [...categories, cat]);
  };

  const filtered = items.filter((v) => {
    if (category === "all") return true;
    return (assignments[v.id] || "") === category;
  });

  return (
    <ShellLayout active="saved">
      <style>{`
        .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:16px; }
        .card { text-decoration:none; color:inherit; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff; display:flex; flex-direction:column; }
        .thumb { aspect-ratio:16/9; background:#d1d5db; overflow:hidden; position:relative; }
        .thumbMedia { width:100%; height:100%; object-fit:cover; display:block; }
        .len { position:absolute; right:8px; bottom:8px; background:rgba(17,24,39,.8); color:#fff; font-size:12px; padding:2px 6px; border-radius:6px; }
        .meta { padding:10px; display:flex; gap:10px; align-items:flex-start; }
        .ava { width:34px; height:34px; border-radius:999px; background:#0f172a center/cover no-repeat; flex:0 0 auto; }
        .ttl { font-weight:700; font-size:14px; line-height:1.3; }
        .by { color:#6b7280; font-size:12.5px; margin-top:2px; display:flex; gap:6px; align-items:center; }
        .empty { color:#6b7280; }
        .toolbar { display:flex; gap:10px; align-items:center; margin-bottom:10px; flex-wrap:wrap; }
        .select { height:36px; border:1px solid #d1d5db; border-radius:10px; padding:0 10px; }
        .input { height:36px; border:1px solid #d1d5db; border-radius:10px; padding:0 10px; }
        .btn { height:36px; border-radius:10px; border:1px solid #111827; background:#111827; color:#fff; padding:0 12px; font-weight:700; cursor:pointer; }
        .catSelect { margin-left:auto; }
      `}</style>

      <h2 style={{margin:"0 0 12px"}}>Saved videos</h2>
      <div className="toolbar">
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select className="select" value={category} onChange={(e)=>setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All saved" : c}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginLeft:"auto" }}>
          <input
            className="input"
            value={newCategory}
            onChange={(e)=>setNewCategory(e.target.value)}
            placeholder="New category"
          />
          <button className="btn" type="button" onClick={handleAddCategory}>Add category</button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty">No saved videos yet.</div>
      ) : (
        <div className="grid">
          {filtered.map(v=>(
            <a key={v.id} href={`#/video/${v.id}`} className="card">
              <div className="thumb">
                {v.thumb ? (
                  <img className="thumbMedia" src={v.thumb} alt="" />
                ) : (
                  <video className="thumbMedia" src={v.src} muted playsInline preload="metadata" />
                )}
                <span className="len">{v.length || "0:00"}</span>
              </div>
              <div className="meta">
                <div className="ava" style={v.avatarUrl ? { backgroundImage:`url(${v.avatarUrl})` } : undefined} />
                <div>
                  <div className="ttl">{v.title}</div>
                  <div className="by">
                    <span>{v.channelName || v.channel}</span>
                    <span>•</span>
                    <span>{v.views || 0} views</span>
                    {v.createdAt && <><span>•</span><span>{new Date(v.createdAt).toLocaleDateString()}</span></>}
                  </div>
                  <div style={{ marginTop:6 }}>
                    <select
                      className="select"
                      value={assignments[v.id] || "all"}
                      onChange={(e)=>handleAssign(v.id, e.target.value)}
                    >
                      <option value="all">No category</option>
                      {categories.filter((c)=>c!=="all").map((c)=>(
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </ShellLayout>
  );
}
