"use client";
import React, { useState, useEffect, useRef } from "react";
import { MASTER_RESUME } from "../../data/masterResume";
import { Sparkles, Download, RotateCcw, User, Palette, Save, FileText } from "lucide-react";

const A4_W = 794;
const A4_H = 1123;

export default function ResumePage() {
  const [activeTab, setActiveTab]     = useState("edit");
  const [jd, setJd]                   = useState("");
  const [resumeData, setResumeData]   = useState<any>(MASTER_RESUME);
  const [loading, setLoading]         = useState(false);
  const [accentColor, setAccentColor] = useState("#1e40af");
  const [fontSize, setFontSize]       = useState(11);
  const [fontKey, setFontKey]         = useState("serif");

  const fontMap: Record<string, string> = {
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    sans:  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    mono:  '"Courier New", Courier, monospace',
  };
  const ff = fontMap[fontKey];
  const ac = accentColor;
  const fs = fontSize;

  const previewRef        = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);

  useEffect(() => {
    const calc = () => {
      if (!previewRef.current) return;
      const { width } = previewRef.current.getBoundingClientRect();
      setScale(Math.min((width - 80) / A4_W, 1));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const updateInfo = (field: string, value: string) =>
    setResumeData((p: any) => ({ ...p, personalInfo: { ...p.personalInfo, [field]: value } }));

  const handleTailor = async () => {
    if (!jd) return alert("Paste a Job Description first!");
    setLoading(true);
    try {
      const r = await fetch("https://ai-powered-developer-assistance-platform-backend.onrender.com/api/v1/resume/tailor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd, masterResume: resumeData }),
      });
      if (!r.ok) throw new Error();
      setResumeData(await r.json());
      setActiveTab("edit");
    } catch { alert("Error: AI Tailoring failed. Check Render backend status."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://ai-powered-developer-assistance-platform-backend.onrender.com/api/v1/resume/save", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: resumeData.personalInfo.name,
          headline: resumeData.personalInfo.headline,
          email:    resumeData.personalInfo.email,
          phone:    resumeData.personalInfo.phone,
          summary:  resumeData.summary,
          skills:      JSON.stringify(resumeData.skillCategories || []),
          experience:  JSON.stringify(resumeData.experience || []),
          projects:    JSON.stringify(resumeData.projects || []),
          accentColor: ac, fontSize: fs,
        }),
      });
      if (r.ok) alert("Saved!");
    } catch { alert("Save failed."); }
    finally { setLoading(false); }
  };

  // Builds the pure resume HTML string (used by both print and iframe)
  const buildResumeHTML = () => {
    const li = `font-family:${ff};font-size:${fs}px;color:#1f2937;line-height:1.6;margin-bottom:2px;list-style-type:disc;list-style-position:outside;display:list-item;`;
    // Section heading uses a colored div for the line (not border-bottom) so it prints in color
    const sh = (title: string) => `
      <div style="margin-bottom:6px;">
        <div style="font-family:${ff};font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.07em;color:${ac};margin-bottom:3px;">${title}</div>
        <div style="height:1.5px;background-color:${ac};width:100%;"></div>
      </div>`;
    const tx = (size: number, color: string, extra = "") =>
      `font-family:${ff};font-size:${size}px;color:${color};line-height:1.5;margin:0;padding:0;${extra}`;
    const blts = (arr: any) =>
      (Array.isArray(arr) ? arr : [arr]).filter(Boolean)
        .map((b: string) => `<li style="${li}">${b}</li>`).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}
  body{background:#fff;color:#111827;font-family:${ff};font-size:${fs}px;line-height:1.5;}
  ul{list-style:disc;padding-left:18px;}
  li{display:list-item;list-style-type:disc;}
  [style*="border-bottom"]{border-color:inherit!important;}
  @page{size:A4 portrait;margin:14mm 16mm;}
</style></head><body>

<div style="text-align:center;padding-bottom:14px;margin-bottom:6px;">
  <div style="${tx(24,ac,"font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;display:block;")}">
    ${resumeData.personalInfo?.name ?? ""}
  </div>
  <div style="${tx(9.5,"#374151","font-weight:700;text-transform:uppercase;letter-spacing:0.08em;display:block;margin-top:4px;")}">
    ${resumeData.personalInfo?.headline ?? ""}
  </div>
  <div style="${tx(9.5,"#6b7280","display:block;margin-top:5px;")}">
    ${[resumeData.personalInfo?.email,resumeData.personalInfo?.phone,resumeData.personalInfo?.location].filter(Boolean).join("  ·  ")}
  </div>
</div>
<div style="height:3px;background-color:${ac};width:100%;margin-bottom:18px;"></div>

${resumeData.summary ? `
<div style="margin-bottom:16px;">
  ${sh("Professional Summary")}
  <div style="${tx(fs,"#1f2937","text-align:justify;line-height:1.6;")}">
    ${resumeData.summary}
  </div>
</div>` : ""}

${(resumeData.skillCategories?.length??0)>0 ? `
<div style="margin-bottom:16px;">
  ${sh("Technical Skills")}
  ${resumeData.skillCategories.map((c:any,i:number)=>`
    <div style="margin-top:${i===0?0:3}px;">
      <span style="${tx(fs,"#111827","font-weight:700;")}"> ${c.name}:</span>
      <span style="${tx(fs,"#374151")}"> ${c.skills}</span>
    </div>`).join("")}
</div>` : ""}

${(resumeData.experience?.length??0)>0 ? `
<div style="margin-bottom:16px;">
  ${sh("Work Experience")}
  ${resumeData.experience.map((e:any,i:number)=>`
    <div style="margin-top:${i===0?0:14}px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="${tx(fs+0.5,"#111827","font-weight:700;")}">
          ${e.company}${e.role?` — ${e.role}`:""}
        </span>
        <span style="${tx(9,"#6b7280","white-space:nowrap;margin-left:10px;")}">
          ${e.period??""}
        </span>
      </div>
      ${e.location?`<div style="${tx(9,"#9ca3af","font-style:italic;margin-top:1px;margin-bottom:3px;")}">
        ${e.location}</div>`:""}
      <ul style="margin-top:4px;padding-left:18px;list-style:disc;">${blts(e.bullets)}</ul>
    </div>`).join("")}
</div>` : ""}

${(resumeData.projects?.length??0)>0 ? `
<div style="margin-bottom:16px;">
  ${sh("Projects")}
  ${resumeData.projects.map((p:any,i:number)=>`
    <div style="margin-top:${i===0?0:10}px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span style="${tx(fs+0.5,ac,"font-weight:700;")}">
          ${p.title||p.name||""}
        </span>
        ${p.period?`<span style="${tx(9,"#6b7280")}">${p.period}</span>`:""}
      </div>
      ${p.tech?`<div style="${tx(9,"#6b7280","font-style:italic;margin-top:1px;margin-bottom:3px;")}">
        ${p.tech}</div>`:""}
      ${(p.bullets?.length??0)>0?`<ul style="margin-top:4px;padding-left:18px;list-style:disc;">${blts(p.bullets)}</ul>`:""}
    </div>`).join("")}
</div>` : ""}

${(resumeData.education?.length??0)>0 ? `
<div style="margin-bottom:16px;">
  ${sh("Education")}
  ${resumeData.education.map((e:any,i:number)=>`
    <div style="margin-top:${i===0?0:10};display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="${tx(fs+0.5,"#111827","font-weight:700;")}">
          ${e.school||e.institution||""}
        </div>
        <div style="${tx(fs,"#374151","margin-top:2px;")}">
          ${e.degree??""}${e.gpa?` — GPA: ${e.gpa}`:""}
        </div>
      </div>
      <span style="${tx(9,"#6b7280","white-space:nowrap;margin-left:10px;")}">
        ${e.period||e.year||""}
      </span>
    </div>`).join("")}
</div>` : ""}

${(resumeData.certifications?.length??0)>0 ? `
<div style="margin-bottom:16px;">
  ${sh("Certifications")}
  <ul style="margin-top:5px;padding-left:18px;list-style:disc;">
    ${resumeData.certifications.map((c:any)=>
      `<li style="${li}">${typeof c==="string"?c:`${c.name??""}${c.issuer?` — ${c.issuer}`:""}${c.year?` (${c.year})`:""}`}</li>`
    ).join("")}
  </ul>
</div>` : ""}

<script>window.onload=function(){window.print();}<\/script></body></html>`;
  };

  const handlePrint = () => {
    const html = buildResumeHTML();
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.target   = "_blank";
    a.rel      = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const rs = (size = fs, color = "#111827", extra: React.CSSProperties = {}): React.CSSProperties => ({
    margin: 0, padding: 0, fontFamily: ff, fontSize: `${size}px`, color, lineHeight: 1.5, ...extra,
  });
  const liSt: React.CSSProperties = {
    fontFamily: ff, fontSize: `${fs}px`, color: "#1f2937",
    lineHeight: 1.6, marginBottom: 2,
    listStyleType: "disc", listStylePosition: "outside", display: "list-item",
  };
  const bul = (arr: unknown) =>
    (Array.isArray(arr) ? arr : [arr]).filter(Boolean)
      .map((b, j) => <li key={j} style={liSt}>{String(b)}</li>);
  const SH = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontFamily: ff, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: ac, marginBottom: 3 }}>
        {title}
      </div>
      <div style={{ height: 1.5, backgroundColor: ac, width: "100%" }} />
    </div>
  );

  const inp: React.CSSProperties = { width: "100%", background: "#161b27", border: "1px solid #1e2d40", borderRadius: 7, padding: "7px 10px", color: "white", fontSize: 12, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700, display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: "#0f1117", color: "white", fontFamily: "system-ui,sans-serif" }}>

      {/* RAIL */}
      <div style={{ width: 60, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20, paddingBottom: 20, gap: 6, borderRight: "1px solid #1e2433", backgroundColor: "#0a0d14" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "white" }}>R</div>
        </div>
        {[{ id: "edit", Icon: User }, { id: "tailor", Icon: Sparkles }, { id: "style", Icon: Palette }].map(({ id, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: activeTab === id ? "#2563eb" : "transparent", color: activeTab === id ? "white" : "#64748b" }}>
            <Icon size={17} />
          </button>
        ))}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {[
            { Icon: Save,      color: "#10b981", fn: handleSave },
            { Icon: Download,  color: "#94a3b8", fn: handlePrint },
            { Icon: RotateCcw, color: "#f87171", fn: () => { if (confirm("Reset?")) setResumeData(MASTER_RESUME); } },
          ].map(({ Icon, color, fn }, i) => (
            <button key={i} onClick={fn} style={{ padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color }}>
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>

      {/* SIDEBAR */}
      <div style={{ width: 300, flexShrink: 0, borderRight: "1px solid #1e2433", backgroundColor: "#0d1017", overflowY: "auto", padding: "20px 16px" }}>
        {activeTab === "edit" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, color: "#60a5fa", fontWeight: 700, fontSize: 14 }}><FileText size={16} /> Profile Editor</div>
          {([
            { label: "Full Name", field: "name",     val: resumeData.personalInfo?.name },
            { label: "Headline",  field: "headline", val: resumeData.personalInfo?.headline },
            { label: "Email",     field: "email",    val: resumeData.personalInfo?.email },
            { label: "Phone",     field: "phone",    val: resumeData.personalInfo?.phone },
            { label: "Location",  field: "location", val: resumeData.personalInfo?.location },
          ]).map(({ label, field, val }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <label style={lbl}>{label}</label>
              <input value={val || ""} onChange={e => updateInfo(field, e.target.value)} style={inp}
                onFocus={e => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#1e2d40")} />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Summary</label>
            <textarea value={resumeData.summary || ""} onChange={e => setResumeData((p: any) => ({ ...p, summary: e.target.value }))}
              rows={7} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = "#3b82f6")}
              onBlur={e  => (e.currentTarget.style.borderColor = "#1e2d40")} />
          </div>
        </>}

        {activeTab === "tailor" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#a78bfa", fontWeight: 700, fontSize: 14 }}><Sparkles size={16} /> AI Engine</div>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>Paste a Job Description. Groq Llama-3 rewrites your resume to match keywords.</p>
          <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste Job Description here..."
            style={{ ...inp, minHeight: 300, resize: "vertical", lineHeight: 1.6 }}
            onFocus={e => (e.currentTarget.style.borderColor = "#8b5cf6")}
            onBlur={e  => (e.currentTarget.style.borderColor = "#1e2d40")} />
          <button onClick={handleTailor} disabled={loading} style={{ marginTop: 12, width: "100%", padding: 11, borderRadius: 9, fontWeight: 700, fontSize: 13, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#1e2433" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {loading ? "Analyzing…" : <><Sparkles size={14} /> Analyse & Tailor</>}
          </button>
        </>}

        {activeTab === "style" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, color: "#34d399", fontWeight: 700, fontSize: 14 }}><Palette size={16} /> Design</div>
          <div style={{ marginBottom: 22 }}>
            <label style={lbl}>Accent Color</label>
            <div style={{ display: "flex", gap: 7, marginBottom: 10, flexWrap: "wrap" }}>
              {["#1e40af","#b91c1c","#065f46","#7c3aed","#000000","#c2410c","#0e7490"].map(c => (
                <button key={c} onClick={() => setAccentColor(c)} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: ac === c ? "2.5px solid white" : "2.5px solid transparent", cursor: "pointer", boxSizing: "border-box", transform: ac === c ? "scale(1.2)" : "scale(1)", transition: "transform 0.15s" }} />
              ))}
            </div>
            <input type="color" value={ac} onChange={e => setAccentColor(e.target.value)}
              style={{ width: "100%", height: 34, background: "transparent", border: "1px solid #1e2d40", borderRadius: 7, cursor: "pointer", padding: 2 }} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: 8 }}>Font Size: <span style={{ color: "white" }}>{fs}px</span></label>
            <input type="range" min="8" max="13" step="1" value={fs} onChange={e => setFontSize(parseInt(e.target.value))} style={{ width: "100%" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569", marginTop: 3 }}><span>8px</span><span>13px</span></div>
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: 8 }}>Font Family</label>
            {[
              { val: "serif", label: "Serif",     sub: "Classic" },
              { val: "sans",  label: "Sans-Serif", sub: "Modern" },
              { val: "mono",  label: "Monospace",  sub: "Technical" },
            ].map(f => (
              <button key={f.val} onClick={() => setFontKey(f.val)} style={{ width: "100%", padding: "9px 12px", marginBottom: 5, borderRadius: 7, border: fontKey === f.val ? "1px solid #3b82f6" : "1px solid #1e2d40", background: fontKey === f.val ? "#1e3a5f" : "#161b27", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "white", fontSize: 12, fontWeight: 600 }}>{f.label}</span>
                <span style={{ color: "#64748b", fontSize: 10 }}>{f.sub}</span>
              </button>
            ))}
          </div>
        </>}
      </div>

      {/* PREVIEW */}
      <div ref={previewRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", backgroundColor: "#181d2a", position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle,#ffffff07 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0 48px", position: "relative", zIndex: 1 }}>
          <div style={{ width: A4_W, transform: `scale(${scale})`, transformOrigin: "top center", marginBottom: `${-(A4_H * (1 - scale))}px` }}>
            <div style={{ width: A4_W, minHeight: A4_H, backgroundColor: "#ffffff",
              backgroundImage: `repeating-linear-gradient(to bottom,#ffffff 0px,#ffffff ${A4_H-2}px,#94a3b8 ${A4_H-2}px,#94a3b8 ${A4_H}px,#181d2a ${A4_H}px,#181d2a ${A4_H+24}px,#ffffff ${A4_H+24}px)`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)", borderRadius: 2 }}>
              <div style={{ padding: "48px 52px" }}>

                <div style={{ textAlign: "center", paddingBottom: 14, marginBottom: 6 }}>
                  <div style={rs(24, ac, { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", display: "block" })}>{resumeData.personalInfo?.name}</div>
                  <div style={rs(9.5, "#374151", { marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" })}>{resumeData.personalInfo?.headline}</div>
                  <div style={rs(9.5, "#6b7280", { marginTop: 5, display: "block" })}>{[resumeData.personalInfo?.email, resumeData.personalInfo?.phone, resumeData.personalInfo?.location].filter(Boolean).join("  ·  ")}</div>
                </div>
                <div style={{ height: 3, backgroundColor: ac, width: "100%", marginBottom: 18 }} />

                {resumeData.summary && <div style={{ marginBottom: 16 }}><SH title="Professional Summary" /><div style={rs(fs, "#1f2937", { textAlign: "justify", lineHeight: 1.6 })}>{resumeData.summary}</div></div>}

                {(resumeData.skillCategories?.length ?? 0) > 0 && <div style={{ marginBottom: 16 }}><SH title="Technical Skills" />{resumeData.skillCategories.map((cat: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 3 }}><span style={rs(fs, "#111827", { fontWeight: 700 })}>{cat.name}: </span><span style={rs(fs, "#374151")}>{cat.skills}</span></div>))}</div>}

                {(resumeData.experience?.length ?? 0) > 0 && <div style={{ marginBottom: 16 }}><SH title="Work Experience" />{resumeData.experience.map((exp: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={rs(fs + 0.5, "#111827", { fontWeight: 700 })}>{exp.company}{exp.role ? ` — ${exp.role}` : ""}</span><span style={rs(9, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{exp.period}</span></div>{exp.location && <div style={rs(9, "#9ca3af", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{exp.location}</div>}<ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>{bul(exp.bullets)}</ul></div>))}</div>}

                {(resumeData.projects?.length ?? 0) > 0 && <div style={{ marginBottom: 16 }}><SH title="Projects" />{resumeData.projects.map((proj: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={rs(fs + 0.5, ac, { fontWeight: 700 })}>{proj.title || proj.name}</span>{proj.period && <span style={rs(9, "#6b7280")}>{proj.period}</span>}</div>{proj.tech && <div style={rs(9, "#6b7280", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{proj.tech}</div>}{(proj.bullets?.length ?? 0) > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>{bul(proj.bullets)}</ul>}</div>))}</div>}

                {(resumeData.education?.length ?? 0) > 0 && <div style={{ marginBottom: 16 }}><SH title="Education" />{resumeData.education.map((edu: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div><div style={rs(fs + 0.5, "#111827", { fontWeight: 700 })}>{edu.school || edu.institution}</div><div style={rs(fs, "#374151", { marginTop: 2 })}>{edu.degree}{edu.gpa ? ` — GPA: ${edu.gpa}` : ""}</div></div><span style={rs(9, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{edu.period || edu.year}</span></div>))}</div>}

                {(resumeData.certifications?.length ?? 0) > 0 && <div style={{ marginBottom: 16 }}><SH title="Certifications" /><ul style={{ margin: "5px 0 0", paddingLeft: 18, listStyle: "disc" }}>{resumeData.certifications.map((cert: any, i: number) => (<li key={i} style={liSt}>{typeof cert === "string" ? cert : `${cert.name ?? ""}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`}</li>))}</ul></div>}

              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "fixed", bottom: 20, right: 24, zIndex: 10, background: "#0a0d14e0", border: "1px solid #1e2433", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#94a3b8", backdropFilter: "blur(8px)" }}>
          {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
}