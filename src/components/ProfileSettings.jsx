import React from "react";
import ShellLayout from "./ShellLayout.jsx";
import { useNotTube } from "../state/NotTubeState.jsx";
import { AVATARS } from "../data/avatars.js";
import { apiRequest } from "../api/client.js";

export default function ProfileSettings() {
  const { user, updateProfile, changePassword, refreshVideos, videos } = useNotTube();
  const [displayName, setDisplayName] = React.useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl || "");
  const [bio, setBio] = React.useState(user?.bio || "");
  const [headerUrl, setHeaderUrl] = React.useState(user?.headerUrl || "");
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(null);
  const [subscriberCount, setSubscriberCount] = React.useState(null);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [pwStatus, setPwStatus] = React.useState("");
  const [avatarDrag, setAvatarDrag] = React.useState(false);
  const [headerDrag, setHeaderDrag] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(user?.name || "");
    setAvatarUrl(user?.avatarUrl || "");
    setBio(user?.bio || "");
    setHeaderUrl(user?.headerUrl || "");
  }, [user?.name, user?.headerUrl]);

  React.useEffect(() => { refreshVideos().catch(() => {}); }, [refreshVideos]);

  React.useEffect(() => {
    const channel = user?.name;
    if (!channel) return;
    apiRequest(`/users/subscribers/count?channel=${encodeURIComponent(channel)}`)
      .then((data) => setSubscriberCount(typeof data.count === "number" ? data.count : null))
      .catch(() => setSubscriberCount(null));
  }, [user?.name]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ name: displayName.trim() || user.name, avatarUrl: avatarUrl.trim(), headerUrl: headerUrl.trim(), bio });
    setSaving(false);
    setSavedAt(new Date());
  }

  const handleFileToDataUrl = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result?.toString() || "");
    reader.readAsDataURL(file);
  };

  const onAvatarDrop = (e) => {
    e.preventDefault();
    setAvatarDrag(false);
    const file = e.dataTransfer.files?.[0];
    handleFileToDataUrl(file, setAvatarUrl);
  };

  const onHeaderDrop = (e) => {
    e.preventDefault();
    setHeaderDrag(false);
    const file = e.dataTransfer.files?.[0];
    handleFileToDataUrl(file, setHeaderUrl);
  };

  async function handlePassword(e) {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setPwStatus("Saving...");
    try {
      await changePassword({ currentPassword, newPassword });
      setPwStatus("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwStatus(err?.message || "Error updating password");
    }
  }

  const myVideoCount = videos.filter((v) => String(v.owner) === String(user?.id)).length;

  return (
    <ShellLayout active="profile">
      <style>{`
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:16px; }
        .grid { display:grid; grid-template-columns: 1fr 320px; gap:18px; align-items:start; }
        .field { display:flex; flex-direction:column; gap:6px; }
        .label { font-size:13px; font-weight:600; color:#374151; }
        .input, .textarea {
          width:100%; height:44px; border:1px solid #d1d5db; border-radius:10px; padding:0 12px; font-size:14px; outline:none;
        }
        .textarea { height:auto; min-height:88px; padding:10px 12px; resize:vertical; }
        .btn { height:44px; border-radius:12px; border:1px solid transparent; background:#111827; color:#fff; font-weight:700; cursor:pointer; }
        .btn[disabled]{ background:#cbd5e1; cursor:not-allowed; }
        .muted { color:#6b7280; font-size:12px; }
        .row { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        .avatar { width:88px; height:88px; border-radius:999px; background:#e5e7eb center/cover no-repeat; border:1px solid #e5e7eb; }
        .stack { display:flex; gap:12px; align-items:center; }
        .headerPreview { width:100%; height:120px; border-radius:12px; background:#eef0f2 center/cover no-repeat; border:1px dashed #cbd5e1; margin-bottom:12px; }
        .drop { border:1px dashed #cbd5e1; border-radius:10px; padding:12px; text-align:center; color:#6b7280; margin-top:10px; }
        .drop.drag { background:#e0f2fe; border-color:#38bdf8; color:#0ea5e9; }
        @media (max-width: 900px){ .grid{ grid-template-columns: 1fr; } }
      `}</style>

      <h2 style={{margin:"0 0 12px"}}>Profile settings</h2>

      <div className="grid">
        {/* left column */}
        <section className="card">
          <div className="headerPreview" style={headerUrl ? { backgroundImage:`url(${headerUrl})` } : undefined} />
          <div
            className={`drop ${headerDrag ? "drag" : ""}`}
            onDragOver={(e)=>{e.preventDefault(); setHeaderDrag(true);}}
            onDragLeave={()=>setHeaderDrag(false)}
            onDrop={onHeaderDrop}
          >
            Drag & drop a header image here or
            <label style={{ color:"#0ea5e9", cursor:"pointer", marginLeft:4 }}>
              browse
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={(e)=>handleFileToDataUrl(e.target.files?.[0], setHeaderUrl)} />
            </label>
          </div>
          <div className="stack" style={{marginBottom:14}}>
            <div className="avatar" style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined} />
            <div>
              <div style={{fontWeight:700}}>Profile photo</div>
              <div className="muted">(Mock) Avatar preview only</div>
              <div className="muted">
                {subscriberCount === null ? "Subscribers: —" : `Subscribers: ${subscriberCount}`} • {myVideoCount} videos
              </div>
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label className="label" htmlFor="displayName">Display name</label>
              <input id="displayName" className="input" value={displayName}
                     onChange={(e)=>setDisplayName(e.target.value)} placeholder="Your name"/>
            </div>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" className="input" value={user?.email || ""} disabled />
            </div>
          </div>

          <div className="field" style={{marginTop:12}}>
            <label className="label">Choose an avatar</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(80px, 1fr))", gap:10 }}>
              {AVATARS.map((url) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setAvatarUrl(url)}
                  style={{
                    border: avatarUrl === url ? "2px solid #111827" : "1px solid #d1d5db",
                    borderRadius: 10,
                    padding: 6,
                    background: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ width:"100%", aspectRatio:"1/1", borderRadius:8, background:`url(${url}) center/cover no-repeat` }} />
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginTop:12 }}>
            <label className="label" htmlFor="headerUrl">Header image URL</label>
            <input
              id="headerUrl"
              className="input"
              value={headerUrl}
              onChange={(e)=>setHeaderUrl(e.target.value)}
              placeholder="https://example.com/header.jpg"
            />
            <div className="muted">Shown at the top of your channel page.</div>
          </div>

          <div className="field" style={{marginTop:12}}>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea id="bio" className="textarea" value={bio}
                      onChange={(e)=>setBio(e.target.value)} placeholder="Tell people about yourself"/>
          </div>

          <div
            className={`drop ${avatarDrag ? "drag" : ""}`}
            onDragOver={(e)=>{e.preventDefault(); setAvatarDrag(true);}}
            onDragLeave={()=>setAvatarDrag(false)}
            onDrop={onAvatarDrop}
            style={{ marginTop:12 }}
          >
            Drag & drop an avatar image or
            <label style={{ color:"#0ea5e9", cursor:"pointer", marginLeft:4 }}>
              browse
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={(e)=>handleFileToDataUrl(e.target.files?.[0], setAvatarUrl)} />
            </label>
          </div>
        </section>

        {/* right column */}
        <aside className="card">
          <div className="muted">Update password</div>
          <div className="field" style={{ marginTop:10 }}>
            <label className="label" htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type="password"
              className="input"
              value={currentPassword}
              onChange={(e)=>setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginTop:10 }}>
            <label className="label" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              className="input"
              value={newPassword}
              onChange={(e)=>setNewPassword(e.target.value)}
            />
          </div>
          <button className="btn" style={{ marginTop:12, width:"100%" }} type="button" onClick={handlePassword}>
            Change password
          </button>
          {pwStatus && <div className="muted" style={{ marginTop:8 }}>{pwStatus}</div>}

          <div style={{height:16}} />
          <button className="btn" type="button" disabled={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save profile"}
          </button>
          {savedAt && (
            <div className="muted" style={{marginTop:8}}>
              Saved at {savedAt.toLocaleTimeString()}
            </div>
          )}
        </aside>
      </div>
    </ShellLayout>
  );
}
