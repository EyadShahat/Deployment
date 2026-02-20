import React from "react";
import { useNotTube } from "../state/NotTubeState.jsx";

export default function NotTubeLogin() {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [error, setError] = React.useState("");
  const { login } = useNotTube();

  const canSubmit = identifier.trim() && password.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    try {
      await login(identifier.trim(), password.trim());
      window.location.hash = "#/home";
    } catch (err) {
      setError(err.message || "Login failed");
    }
  }

  return (
    <div className="page">
      <style>{`
        :root { --fg:#0b0b0b; --muted:#6b7280; --line:#e5e7eb; --bg:#ffffff; --accent:#111827; }
        * { box-sizing: border-box; }
        html, body, #root { height: 100%; background: #fff; }

        .page { min-height: 100vh; color: var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }

        /* top bar */
        .topbar {
          position: sticky; top: 0; z-index: 5;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px;
          background: #fff;
        }
        .topbar::after {
          content:""; position:absolute; left:0; bottom:0;
          width:100vw; border-bottom:2px solid var(--line);
        }
        .toplink {
          color:#3f3f46; background:none; border:0; padding:0; font:inherit; cursor:pointer;
          display:inline-flex; align-items:center; gap:8px; text-decoration:none;
        }
        .topbtn:hover, .toplink:hover { color:#111827; }

        /* stage */
        .stage {
          display:flex; align-items:center; justify-content:center;
          max-width:1440px; margin:0 auto; min-height:calc(100vh - 56px);
          padding: clamp(16px, 4vw, 48px);
        }

        /* container for logo + form */
        .stack {
          display:flex; flex-direction:column; align-items:center; width:100%;
          max-width:600px; gap: clamp(20px, 4vw, 32px);
        }

        .logoRow { display:flex; align-items:center; gap:10px; justify-content:center; }
        .brand { font-size: clamp(28px, 3.2vw, 40px); font-weight:700; }

        .title { font-size: clamp(26px, 3vw, 36px); font-weight:700; }

        /* form */
        .form { width:100%; display:flex; flex-direction:column; gap:18px; margin-top: 8px; }
        .field { display:flex; flex-direction:column; gap:8px; }
        .label { font-size:14px; font-weight:600; color:#3f3f46; }
        .input {
          height:48px; border:1px solid #d4d4d8; border-radius:10px;
          padding:0 14px; font-size:15px; outline:none;
        }
        .input:focus { box-shadow:0 0 0 6px #eef0f2; }

        .pwRow { display:flex; align-items:center; justify-content:space-between; }

        /* buttons */
        .actions { display:flex; flex-direction:column; gap:12px; margin-top:12px; }
        .btn {
          width:100%; height:48px; border-radius:12px; font-weight:700; font-size:16px;
          border:1px solid transparent; transition:background .15s, box-shadow .15s;
        }
        .btnPrimary { background:#111827; color:white; }
        .btnPrimary:hover { box-shadow:0 4px 10px rgba(0,0,0,0.15); }
        .btnPrimary[disabled] { background:#d1d5db; cursor:not-allowed; }
        .btnGhost { background:#e5e7eb; color:#0a0a0a; }
        .btnGhost:hover { background:#d4d4d8; }
      `}</style>

      <header className="topbar">
        <a className="toplink" href="#/signup">Create an account</a>
      </header>

      <div className="stage">
        <div className="stack">
          {/* logo */}
          <div className="logoRow">
            <LogoMark />
            <div className="brand">NotTube</div>
          </div>

          <h1 className="title">Log in</h1>
          {error && <div style={{ color: "#b91c1c" }}>{error}</div>}

          <form className="form" onSubmit={handleSubmit}>
            {/* email or username */}
            <div className="field">
              <label htmlFor="identifier" className="label">Email address/username</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e)=>setIdentifier(e.target.value)}
                placeholder="you@example.com or username"
                className="input"
                required
              />
            </div>

            {/* password */}
            <div className="field">
              <div className="pwRow">
                <label htmlFor="password" className="label">Password</label>
                <button type="button" className="toplink" onClick={()=>setShowPw(s=>!s)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                required
              />
            </div>

            {/* buttons */}
            <div className="actions">
              <button type="submit" className="btn btnPrimary" disabled={!canSubmit}>Log in</button>
              <a href="#/signup" className="btn btnGhost" style={{textAlign:"center", lineHeight:"48px", textDecoration:"none"}}>Sign Up</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* logo icon */
function LogoMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ height: 36, width: 36 }}>
      <rect x="6" y="18" width="38" height="28" rx="6" fill="currentColor"/>
      <polygon points="50,24 58,20 58,44 50,40" fill="currentColor"/>
      <polygon points="24,24 24,40 38,32" fill="white"/>
    </svg>
  );
}
