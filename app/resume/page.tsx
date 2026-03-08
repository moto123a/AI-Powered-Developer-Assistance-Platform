"use client";
import React, { useState, useEffect, useRef } from "react";
import { MASTER_RESUME } from "../../data/masterResume";
import {
  Sparkles, Download, RotateCcw, User, Palette, Save, FileText,
  Plus, Trash2, Award, Briefcase, GraduationCap, Code, Wrench,
  ChevronUp, ChevronDown, GripVertical, Layers, Link as LinkIcon,
} from "lucide-react";
import {
  TEMPLATE_LIST, renderPreview, buildPrintHTML,
  type TemplateId,
} from "./components/templates";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8082";

type SectionId = "summary" | "skills" | "experience" | "projects" | "education" | "certifications";
const DEFAULT_SECTION_ORDER: SectionId[] = ["summary", "skills", "experience", "projects", "education", "certifications"];
const SECTION_META: Record<SectionId, { label: string; Icon: any; color: string }> = {
  summary: { label: "Summary", Icon: FileText, color: "#60a5fa" },
  skills: { label: "Skills", Icon: Wrench, color: "#f59e0b" },
  experience: { label: "Experience", Icon: Briefcase, color: "#3b82f6" },
  projects: { label: "Projects", Icon: Code, color: "#a78bfa" },
  education: { label: "Education", Icon: GraduationCap, color: "#34d399" },
  certifications: { label: "Certifications", Icon: Award, color: "#f472b6" },
};

const FONTS: { key: string; label: string; family: string; category: string; url?: string }[] = [
  { key: "georgia", label: "Georgia", family: 'Georgia, Cambria, "Times New Roman", serif', category: "Serif" },
  { key: "garamond", label: "EB Garamond", family: '"EB Garamond", Georgia, serif', category: "Serif", url: "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&display=swap" },
  { key: "merriweather", label: "Merriweather", family: '"Merriweather", Georgia, serif', category: "Serif", url: "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap" },
  { key: "lora", label: "Lora", family: '"Lora", Georgia, serif', category: "Serif", url: "https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap" },
  { key: "playfair", label: "Playfair Display", family: '"Playfair Display", Georgia, serif', category: "Serif", url: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap" },
  { key: "libre", label: "Libre Baskerville", family: '"Libre Baskerville", Georgia, serif', category: "Serif", url: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap" },
  { key: "crimson", label: "Crimson Text", family: '"Crimson Text", Georgia, serif', category: "Serif", url: "https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600;700&display=swap" },
  { key: "system", label: "System UI", family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', category: "Sans" },
  { key: "inter", label: "Inter", family: '"Inter", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" },
  { key: "roboto", label: "Roboto", family: '"Roboto", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" },
  { key: "opensans", label: "Open Sans", family: '"Open Sans", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap" },
  { key: "lato", label: "Lato", family: '"Lato", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" },
  { key: "poppins", label: "Poppins", family: '"Poppins", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" },
  { key: "montserrat", label: "Montserrat", family: '"Montserrat", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap" },
  { key: "raleway", label: "Raleway", family: '"Raleway", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700;900&display=swap" },
  { key: "nunito", label: "Nunito", family: '"Nunito", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&display=swap" },
  { key: "source", label: "Source Sans 3", family: '"Source Sans 3", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" },
  { key: "cabin", label: "Cabin", family: '"Cabin", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap" },
  { key: "dmSans", label: "DM Sans", family: '"DM Sans", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" },
  { key: "rubik", label: "Rubik", family: '"Rubik", sans-serif', category: "Sans", url: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" },
  { key: "courier", label: "Courier New", family: '"Courier New", Courier, monospace', category: "Mono" },
  { key: "firacode", label: "Fira Code", family: '"Fira Code", monospace', category: "Mono", url: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap" },
  { key: "jetbrains", label: "JetBrains Mono", family: '"JetBrains Mono", monospace', category: "Mono", url: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" },
  { key: "ibmplex", label: "IBM Plex Mono", family: '"IBM Plex Mono", monospace', category: "Mono", url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap" },
];

const COLOR_PRESETS = ["#1e40af","#1d4ed8","#2563eb","#0ea5e9","#0e7490","#0d9488","#059669","#065f46","#15803d","#4d7c0f","#854d0e","#c2410c","#dc2626","#b91c1c","#be123c","#db2777","#c026d3","#9333ea","#7c3aed","#4f46e5","#475569","#334155","#1e293b","#000000"];
const PAPER_SIZES: Record<string, { w: number; h: number; label: string }> = {
  a4: { w: 794, h: 1123, label: "A4" }, letter: { w: 816, h: 1056, label: "Letter" },
};

export default function ResumePage() {
  const [activeTab, setActiveTab] = useState("edit");
  const [editSection, setEditSection] = useState<"personal" | "order" | SectionId>("personal");
  const [jd, setJd] = useState("");
  const [resumeData, setResumeData] = useState<any>(MASTER_RESUME);
  const [loading, setLoading] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);

  const [accentColor, setAccentColor] = useState("#1e40af");
  const [fontSize, setFontSize] = useState(11);
  const [fontKey, setFontKey] = useState("georgia");
  const [lineHeight, setLineHeight] = useState(1.5);
  const [sectionGap, setSectionGap] = useState(16);
  const [marginPreset, setMarginPreset] = useState<"normal" | "narrow" | "wide">("normal");
  const [paperSize, setPaperSize] = useState<"a4" | "letter">("a4");
  const [fontFilter, setFontFilter] = useState<"all" | "Serif" | "Sans" | "Mono">("all");
  const [templateId, setTemplateId] = useState<TemplateId>("recommended");

  const fontObj = FONTS.find(f => f.key === fontKey) || FONTS[0];
  const ff = fontObj.family;
  const ac = accentColor;
  const fs = fontSize;
  const paper = PAPER_SIZES[paperSize];
  const margins: Record<string, string> = { normal: "48px 52px", narrow: "32px 36px", wide: "56px 64px" };
  const pagePad = margins[marginPreset];

  useEffect(() => {
    if (fontObj.url) {
      const id = `gfont-${fontObj.key}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link"); link.id = id; link.rel = "stylesheet"; link.href = fontObj.url;
        document.head.appendChild(link);
      }
    }
  }, [fontObj]);

  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.85);
  useEffect(() => {
    const calc = () => { if (!previewRef.current) return; setScale(Math.min((previewRef.current.getBoundingClientRect().width - 80) / paper.w, 1)); };
    calc(); window.addEventListener("resize", calc); return () => window.removeEventListener("resize", calc);
  }, [paper.w]);

  useEffect(() => { fetch(`${API_BASE}/api/v1/resume/status`).catch(() => {}); }, []);

  const moveSection = (idx: number, dir: -1 | 1) => {
    const n = idx + dir; if (n < 0 || n >= sectionOrder.length) return;
    setSectionOrder(p => { const a = [...p]; [a[idx], a[n]] = [a[n], a[idx]]; return a; });
  };

  const set = (fn: (d: any) => any) => setResumeData((p: any) => fn({ ...p }));
  const updateInfo = (field: string, value: string) => set(d => ({ ...d, personalInfo: { ...d.personalInfo, [field]: value } }));

  /* CRUD helpers */
  const addExperience = () => set(d => ({ ...d, experience: [...(d.experience || []), { company: "", role: "", location: "", period: "", bullets: [""] }] }));
  const removeExperience = (i: number) => set(d => ({ ...d, experience: d.experience.filter((_: any, x: number) => x !== i) }));
  const updateExperience = (i: number, f: string, v: any) => set(d => { const a = [...d.experience]; a[i] = { ...a[i], [f]: v }; return { ...d, experience: a }; });
  const addBullet = (s: string, i: number) => set(d => { const a = [...d[s]]; a[i] = { ...a[i], bullets: [...(a[i].bullets || []), ""] }; return { ...d, [s]: a }; });
  const updateBullet = (s: string, i: number, bi: number, v: string) => set(d => { const a = [...d[s]]; const b = [...a[i].bullets]; b[bi] = v; a[i] = { ...a[i], bullets: b }; return { ...d, [s]: a }; });
  const removeBullet = (s: string, i: number, bi: number) => set(d => { const a = [...d[s]]; a[i] = { ...a[i], bullets: a[i].bullets.filter((_: any, x: number) => x !== bi) }; return { ...d, [s]: a }; });
  const addProject = () => set(d => ({ ...d, projects: [...(d.projects || []), { title: "", tech: "", period: "", bullets: [""] }] }));
  const removeProject = (i: number) => set(d => ({ ...d, projects: d.projects.filter((_: any, x: number) => x !== i) }));
  const updateProject = (i: number, f: string, v: any) => set(d => { const a = [...d.projects]; a[i] = { ...a[i], [f]: v }; return { ...d, projects: a }; });
  const addEducation = () => set(d => ({ ...d, education: [...(d.education || []), { school: "", degree: "", period: "", gpa: "" }] }));
  const removeEducation = (i: number) => set(d => ({ ...d, education: d.education.filter((_: any, x: number) => x !== i) }));
  const updateEducation = (i: number, f: string, v: string) => set(d => { const a = [...d.education]; a[i] = { ...a[i], [f]: v }; return { ...d, education: a }; });
  const addSkillCategory = () => set(d => ({ ...d, skillCategories: [...(d.skillCategories || []), { name: "", skills: "" }] }));
  const removeSkillCategory = (i: number) => set(d => ({ ...d, skillCategories: d.skillCategories.filter((_: any, x: number) => x !== i) }));
  const updateSkillCategory = (i: number, f: string, v: string) => set(d => { const a = [...d.skillCategories]; a[i] = { ...a[i], [f]: v }; return { ...d, skillCategories: a }; });
  const addCertification = () => set(d => ({ ...d, certifications: [...(d.certifications || []), ""] }));
  const removeCertification = (i: number) => set(d => ({ ...d, certifications: d.certifications.filter((_: any, x: number) => x !== i) }));
  const updateCertification = (i: number, v: string) => set(d => { const a = [...d.certifications]; a[i] = v; return { ...d, certifications: a }; });

  /* Custom links CRUD */
  const addCustomLink = () => set(d => ({ ...d, personalInfo: { ...d.personalInfo, customLinks: [...(d.personalInfo?.customLinks || []), { label: "", url: "" }] } }));
  const removeCustomLink = (i: number) => set(d => ({ ...d, personalInfo: { ...d.personalInfo, customLinks: d.personalInfo.customLinks.filter((_: any, x: number) => x !== i) } }));
  const updateCustomLink = (i: number, f: string, v: string) => set(d => { const a = [...(d.personalInfo?.customLinks || [])]; a[i] = { ...a[i], [f]: v }; return { ...d, personalInfo: { ...d.personalInfo, customLinks: a } }; });

  /* AI Tailor (UNTOUCHED) */
  const handleTailor = async () => {
    if (!jd) return alert("Paste a Job Description first!");
    setLoading(true);
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 120000);
      const r = await fetch(`${API_BASE}/api/v1/resume/tailor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jd, masterResume: resumeData }), signal: c.signal });
      clearTimeout(t); if (!r.ok) throw new Error(); setResumeData(await r.json()); setActiveTab("edit");
    } catch (e: any) { alert(e.name === "AbortError" ? "Backend waking up — try in 30s." : "AI Tailoring failed — try in 30s."); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const c = new AbortController(); const t = setTimeout(() => c.abort(), 120000);
      const r = await fetch(`${API_BASE}/api/v1/resume/save`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: resumeData.personalInfo?.name, headline: resumeData.personalInfo?.headline, email: resumeData.personalInfo?.email, phone: resumeData.personalInfo?.phone, summary: resumeData.summary, skills: JSON.stringify(resumeData.skillCategories || []), experience: JSON.stringify(resumeData.experience || []), projects: JSON.stringify(resumeData.projects || []), accentColor: ac, fontSize: fs }), signal: c.signal });
      clearTimeout(t); if (r.ok) alert("Saved!");
    } catch { alert("Save failed."); } finally { setLoading(false); }
  };

  const handlePrint = () => {
    const html = buildPrintHTML(templateId, { ff, ac, fs, lh: lineHeight, sg: sectionGap, pagePad, data: resumeData, sectionOrder, fontUrl: fontObj.url, paperSize });
    const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  /* Form styles */
  const inp: React.CSSProperties = { width: "100%", background: "#161b27", border: "1px solid #1e2d40", borderRadius: 7, padding: "7px 10px", color: "white", fontSize: 12, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", fontWeight: 700, display: "block", marginBottom: 4 };
  const cardStyle: React.CSSProperties = { background: "#0f1420", border: "1px solid #1e2d40", borderRadius: 10, padding: 14, marginBottom: 10 };
  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 };
  const sliderLbl = (t: string, v: string) => <label style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, display: "block", marginBottom: 6 }}>{t}: <span style={{ color: "white" }}>{v}</span></label>;
  const navBtn = (label: string, id: string, Icon: any, color: string) => (
    <button key={id} onClick={() => setEditSection(id as any)} style={{ width: "100%", padding: "8px 12px", marginBottom: 3, borderRadius: 8, border: editSection === id ? `1px solid ${color}` : "1px solid transparent", background: editSection === id ? `${color}15` : "transparent", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, color: editSection === id ? color : "#94a3b8", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}><Icon size={14} /> {label}</button>
  );
  const addBtn = (l: string, fn: () => void) => <button onClick={fn} style={{ width: "100%", padding: "8px 12px", marginTop: 8, borderRadius: 8, border: "1px dashed #334155", background: "transparent", cursor: "pointer", color: "#3b82f6", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Plus size={14} /> {l}</button>;
  const delBtn = (fn: () => void) => <button onClick={fn} style={{ padding: 4, background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0 }}><Trash2 size={14} /></button>;
  const bulletAddBtn = (fn: () => void) => <button onClick={fn} style={{ padding: "4px 10px", background: "transparent", border: "1px dashed #334155", borderRadius: 6, color: "#3b82f6", fontSize: 11, cursor: "pointer", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> Add Bullet</button>;

  const styleCtx = { ff, ac, fs, lh: lineHeight, sg: sectionGap, pagePad, data: resumeData, sectionOrder };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", backgroundColor: "#0f1117", color: "white", fontFamily: "system-ui,sans-serif" }}>

      {/* RAIL */}
      <div style={{ width: 60, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 20, paddingBottom: 20, gap: 6, borderRight: "1px solid #1e2433", backgroundColor: "#0a0d14" }}>
        <div style={{ marginBottom: 14 }}><div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "white" }}>R</div></div>
        {[{ id: "edit", Icon: User }, { id: "tailor", Icon: Sparkles }, { id: "style", Icon: Palette }].map(({ id, Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: activeTab === id ? "#2563eb" : "transparent", color: activeTab === id ? "white" : "#64748b" }}><Icon size={17} /></button>
        ))}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {[{ Icon: Save, color: "#10b981", fn: handleSave }, { Icon: Download, color: "#94a3b8", fn: handlePrint }, { Icon: RotateCcw, color: "#f87171", fn: () => { if (confirm("Reset all?")) { setResumeData(MASTER_RESUME); setSectionOrder(DEFAULT_SECTION_ORDER); } } }].map(({ Icon, color, fn }, i) => (
            <button key={i} onClick={fn} style={{ padding: 10, borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color }}><Icon size={17} /></button>
          ))}
        </div>
      </div>

      {/* SIDEBAR */}
      <div style={{ width: 320, flexShrink: 0, borderRight: "1px solid #1e2433", backgroundColor: "#0d1017", overflowY: "auto", padding: "16px 14px" }}>

        {activeTab === "edit" && <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#475569", fontWeight: 700, marginBottom: 8, paddingLeft: 4 }}>Sections</div>
            {navBtn("Personal Info", "personal", User, "#60a5fa")}
            {sectionOrder.map(id => { const m = SECTION_META[id]; return navBtn(m.label, id, m.Icon, m.color); })}
            {navBtn("Reorder Sections", "order", Layers, "#94a3b8")}
          </div>
          <div style={{ height: 1, background: "#1e2d40", marginBottom: 14 }} />

          {/* PERSONAL INFO + LINKS */}
          {editSection === "personal" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><User size={15} /> Personal Info</div>
            {[{ l: "Full Name", f: "name", p: "John Doe" }, { l: "Headline", f: "headline", p: "Software Engineer | React" }, { l: "Email", f: "email", p: "john@example.com" }, { l: "Phone", f: "phone", p: "+1 (555) 000-0000" }, { l: "Location", f: "location", p: "New York, NY" }].map(({ l, f, p }) => (
              <div key={f} style={{ marginBottom: 12 }}><label style={lbl}>{l}</label><input value={resumeData.personalInfo?.[f] || ""} onChange={e => updateInfo(f, e.target.value)} style={inp} placeholder={p} /></div>
            ))}

            <div style={{ height: 1, background: "#1e2d40", margin: "16px 0" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#3b82f6", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><LinkIcon size={14} /> Links</div>
            {[{ l: "LinkedIn", f: "linkedin", p: "linkedin.com/in/yourprofile" }, { l: "GitHub", f: "github", p: "github.com/yourusername" }, { l: "Portfolio", f: "portfolio", p: "yourportfolio.com" }].map(({ l, f, p }) => (
              <div key={f} style={{ marginBottom: 10 }}><label style={lbl}>{l}</label><input value={resumeData.personalInfo?.[f] || ""} onChange={e => updateInfo(f, e.target.value)} style={inp} placeholder={p} /></div>
            ))}

            {/* Custom links */}
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 12, marginBottom: 6 }}>Custom Links</div>
            {(resumeData.personalInfo?.customLinks || []).map((link: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <input value={link.label || ""} onChange={e => updateCustomLink(i, "label", e.target.value)} style={{ ...inp, width: "35%" }} placeholder="Label" />
                <input value={link.url || ""} onChange={e => updateCustomLink(i, "url", e.target.value)} style={{ ...inp, width: "65%" }} placeholder="https://..." />
                {delBtn(() => removeCustomLink(i))}
              </div>
            ))}
            {addBtn("Add Custom Link", addCustomLink)}
          </>}

          {editSection === "summary" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><FileText size={15} /> Summary</div>
            <textarea value={resumeData.summary || ""} onChange={e => set(d => ({ ...d, summary: e.target.value }))} rows={12} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} placeholder="Professional summary..." />
          </>}

          {editSection === "experience" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={15} /> Experience</div>
            {(resumeData.experience || []).map((exp: any, i: number) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ color: "#60a5fa", fontSize: 12, fontWeight: 700 }}>{exp.company || `#${i + 1}`}</span>{delBtn(() => removeExperience(i))}</div>
                <div style={row2}><div><label style={lbl}>Company</label><input value={exp.company || ""} onChange={e => updateExperience(i, "company", e.target.value)} style={inp} /></div><div><label style={lbl}>Role</label><input value={exp.role || ""} onChange={e => updateExperience(i, "role", e.target.value)} style={inp} /></div></div>
                <div style={{ ...row2, marginTop: 8 }}><div><label style={lbl}>Location</label><input value={exp.location || ""} onChange={e => updateExperience(i, "location", e.target.value)} style={inp} /></div><div><label style={lbl}>Period</label><input value={exp.period || ""} onChange={e => updateExperience(i, "period", e.target.value)} style={inp} /></div></div>
                <div style={{ marginTop: 10 }}><label style={lbl}>Bullets</label>{(exp.bullets || []).map((b: string, bi: number) => (<div key={bi} style={{ display: "flex", gap: 4, marginBottom: 4 }}><textarea value={b} onChange={e => updateBullet("experience", i, bi, e.target.value)} rows={2} style={{ ...inp, resize: "vertical", fontSize: 11 }} />{delBtn(() => removeBullet("experience", i, bi))}</div>))}{bulletAddBtn(() => addBullet("experience", i))}</div>
              </div>
            ))}
            {addBtn("Add Experience", addExperience)}
          </>}

          {editSection === "projects" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Code size={15} /> Projects</div>
            {(resumeData.projects || []).map((p: any, i: number) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ color: "#a78bfa", fontSize: 12, fontWeight: 700 }}>{p.title || `#${i + 1}`}</span>{delBtn(() => removeProject(i))}</div>
                <div style={row2}><div><label style={lbl}>Title</label><input value={p.title || p.name || ""} onChange={e => updateProject(i, "title", e.target.value)} style={inp} /></div><div><label style={lbl}>Period</label><input value={p.period || ""} onChange={e => updateProject(i, "period", e.target.value)} style={inp} /></div></div>
                <div style={{ marginTop: 8 }}><label style={lbl}>Tech</label><input value={p.tech || ""} onChange={e => updateProject(i, "tech", e.target.value)} style={inp} /></div>
                <div style={{ marginTop: 10 }}><label style={lbl}>Bullets</label>{(p.bullets || []).map((b: string, bi: number) => (<div key={bi} style={{ display: "flex", gap: 4, marginBottom: 4 }}><textarea value={b} onChange={e => updateBullet("projects", i, bi, e.target.value)} rows={2} style={{ ...inp, resize: "vertical", fontSize: 11 }} />{delBtn(() => removeBullet("projects", i, bi))}</div>))}{bulletAddBtn(() => addBullet("projects", i))}</div>
              </div>
            ))}
            {addBtn("Add Project", addProject)}
          </>}

          {editSection === "education" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><GraduationCap size={15} /> Education</div>
            {(resumeData.education || []).map((e: any, i: number) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>{e.school || `#${i + 1}`}</span>{delBtn(() => removeEducation(i))}</div>
                <div style={{ marginBottom: 8 }}><label style={lbl}>School</label><input value={e.school || e.institution || ""} onChange={ev => updateEducation(i, "school", ev.target.value)} style={inp} /></div>
                <div style={row2}><div><label style={lbl}>Degree</label><input value={e.degree || ""} onChange={ev => updateEducation(i, "degree", ev.target.value)} style={inp} /></div><div><label style={lbl}>Period</label><input value={e.period || e.year || ""} onChange={ev => updateEducation(i, "period", ev.target.value)} style={inp} /></div></div>
                <div style={{ marginTop: 8 }}><label style={lbl}>GPA</label><input value={e.gpa || ""} onChange={ev => updateEducation(i, "gpa", ev.target.value)} style={inp} /></div>
              </div>
            ))}
            {addBtn("Add Education", addEducation)}
          </>}

          {editSection === "skills" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Wrench size={15} /> Skills</div>
            {(resumeData.skillCategories || []).map((c: any, i: number) => (
              <div key={i} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>{c.name || `#${i + 1}`}</span>{delBtn(() => removeSkillCategory(i))}</div>
                <div style={{ marginBottom: 8 }}><label style={lbl}>Category</label><input value={c.name || ""} onChange={e => updateSkillCategory(i, "name", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Skills</label><textarea value={c.skills || ""} onChange={e => updateSkillCategory(i, "skills", e.target.value)} rows={2} style={{ ...inp, resize: "vertical", fontSize: 11 }} /></div>
              </div>
            ))}
            {addBtn("Add Category", addSkillCategory)}
          </>}

          {editSection === "certifications" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f472b6", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Award size={15} /> Certifications</div>
            {(resumeData.certifications || []).map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}><input value={typeof c === "string" ? c : c?.name || ""} onChange={e => updateCertification(i, e.target.value)} style={inp} placeholder="Name — Issuer (Year)" />{delBtn(() => removeCertification(i))}</div>
            ))}
            {addBtn("Add Certification", addCertification)}
          </>}

          {editSection === "order" && <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}><Layers size={15} /> Reorder Sections</div>
            {sectionOrder.map((id, idx) => { const m = SECTION_META[id]; return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 4, background: "#161b27", border: "1px solid #1e2d40", borderRadius: 8 }}>
                <GripVertical size={14} style={{ color: "#475569" }} /><m.Icon size={14} style={{ color: m.color }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{m.label}</span>
                <button onClick={() => moveSection(idx, -1)} disabled={idx === 0} style={{ padding: 3, background: "transparent", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "#334155" : "#94a3b8" }}><ChevronUp size={16} /></button>
                <button onClick={() => moveSection(idx, 1)} disabled={idx === sectionOrder.length - 1} style={{ padding: 3, background: "transparent", border: "none", cursor: idx === sectionOrder.length - 1 ? "default" : "pointer", color: idx === sectionOrder.length - 1 ? "#334155" : "#94a3b8" }}><ChevronDown size={16} /></button>
              </div>
            ); })}
          </>}
        </>}

        {/* TAILOR (UNTOUCHED) */}
        {activeTab === "tailor" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, color: "#a78bfa", fontWeight: 700, fontSize: 14 }}><Sparkles size={16} /> AI Engine</div>
          <p style={{ fontSize: 11, color: "#64748b", marginBottom: 14, lineHeight: 1.6 }}>Paste a Job Description. Groq Llama-3 rewrites your resume to match keywords.</p>
          <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste Job Description here..." style={{ ...inp, minHeight: 300, resize: "vertical", lineHeight: 1.6 }} />
          <button onClick={handleTailor} disabled={loading} style={{ marginTop: 12, width: "100%", padding: 11, borderRadius: 9, fontWeight: 700, fontSize: 13, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "#1e2433" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {loading ? "Analyzing…" : <><Sparkles size={14} /> Analyse & Tailor</>}
          </button>
        </>}

        {/* STYLE TAB */}
        {activeTab === "style" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, color: "#34d399", fontWeight: 700, fontSize: 14 }}><Palette size={16} /> Design Studio</div>

          {/* Template Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Template</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {TEMPLATE_LIST.map(t => (
                <button key={t.id} onClick={() => setTemplateId(t.id)} style={{
                  padding: "10px 8px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                  border: templateId === t.id ? "2px solid #3b82f6" : "1px solid #1e2d40",
                  background: templateId === t.id ? "#1e3a5f" : "#161b27",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: templateId === t.id ? "#60a5fa" : "#e2e8f0" }}>{t.name}</div>
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Accent Color</label>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => setAccentColor(c)} style={{ width: 22, height: 22, borderRadius: "50%", background: c, border: ac === c ? "2.5px solid white" : "2px solid transparent", cursor: "pointer", transform: ac === c ? "scale(1.25)" : "scale(1)", transition: "transform 0.15s" }} />
              ))}
            </div>
            <input type="color" value={ac} onChange={e => setAccentColor(e.target.value)} style={{ width: "100%", height: 30, background: "transparent", border: "1px solid #1e2d40", borderRadius: 7, cursor: "pointer", padding: 2 }} />
          </div>

          {/* Font */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Font Family</label>
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {(["all", "Serif", "Sans", "Mono"] as const).map(cat => (
                <button key={cat} onClick={() => setFontFilter(cat)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer", border: "none", background: fontFilter === cat ? "#2563eb" : "#1e2d40", color: fontFilter === cat ? "white" : "#94a3b8" }}>{cat === "all" ? "All" : cat}</button>
              ))}
            </div>
            <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 8, border: "1px solid #1e2d40" }}>
              {FONTS.filter(f => fontFilter === "all" || f.category === fontFilter).map(f => (
                <button key={f.key} onClick={() => setFontKey(f.key)} style={{ width: "100%", padding: "7px 12px", border: "none", borderBottom: "1px solid #1e2d40", background: fontKey === f.key ? "#1e3a5f" : "transparent", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: fontKey === f.key ? "#60a5fa" : "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{f.label}</span>
                  <span style={{ color: "#475569", fontSize: 9, textTransform: "uppercase" }}>{f.category}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ marginBottom: 18 }}>{sliderLbl("Font Size", `${fs}px`)}<input type="range" min="8" max="14" step="0.5" value={fs} onChange={e => setFontSize(parseFloat(e.target.value))} style={{ width: "100%" }} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569" }}><span>8</span><span>14</span></div></div>
          <div style={{ marginBottom: 18 }}>{sliderLbl("Line Spacing", `${lineHeight}×`)}<input type="range" min="1.2" max="2.0" step="0.05" value={lineHeight} onChange={e => setLineHeight(parseFloat(e.target.value))} style={{ width: "100%" }} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569" }}><span>Tight</span><span>Loose</span></div></div>
          <div style={{ marginBottom: 18 }}>{sliderLbl("Section Gap", `${sectionGap}px`)}<input type="range" min="8" max="28" step="2" value={sectionGap} onChange={e => setSectionGap(parseInt(e.target.value))} style={{ width: "100%" }} /><div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#475569" }}><span>Compact</span><span>Spacious</span></div></div>

          {/* Margins */}
          <div style={{ marginBottom: 18 }}><label style={lbl}>Margins</label><div style={{ display: "flex", gap: 6 }}>
            {(["narrow", "normal", "wide"] as const).map(m => (
              <button key={m} onClick={() => setMarginPreset(m)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: marginPreset === m ? "1px solid #3b82f6" : "1px solid #1e2d40", background: marginPreset === m ? "#1e3a5f" : "#161b27", color: marginPreset === m ? "#60a5fa" : "#94a3b8", textTransform: "capitalize" }}>{m}</button>
            ))}
          </div></div>

          {/* Paper */}
          <div style={{ marginBottom: 18 }}><label style={lbl}>Paper</label><div style={{ display: "flex", gap: 6 }}>
            {(["a4", "letter"] as const).map(k => (
              <button key={k} onClick={() => setPaperSize(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", border: paperSize === k ? "1px solid #3b82f6" : "1px solid #1e2d40", background: paperSize === k ? "#1e3a5f" : "#161b27", color: paperSize === k ? "#60a5fa" : "#94a3b8", textTransform: "uppercase" }}>{k}</button>
            ))}
          </div></div>
        </>}
      </div>

      {/* PREVIEW */}
      <div ref={previewRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", backgroundColor: "#181d2a", position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle,#ffffff07 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0 48px", position: "relative", zIndex: 1 }}>
          <div style={{ width: paper.w, transform: `scale(${scale})`, transformOrigin: "top center", marginBottom: `${-(paper.h * (1 - scale))}px` }}>
            <div style={{ width: paper.w, minHeight: paper.h, backgroundColor: "#ffffff", backgroundImage: `repeating-linear-gradient(to bottom,#ffffff 0px,#ffffff ${paper.h - 2}px,#94a3b8 ${paper.h - 2}px,#94a3b8 ${paper.h}px,#181d2a ${paper.h}px,#181d2a ${paper.h + 24}px,#ffffff ${paper.h + 24}px)`, boxShadow: "0 8px 40px rgba(0,0,0,0.5)", borderRadius: 2 }}>
              {renderPreview(templateId, styleCtx)}
            </div>
          </div>
        </div>
        <div style={{ position: "fixed", bottom: 20, right: 24, zIndex: 10, background: "#0a0d14e0", border: "1px solid #1e2433", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#94a3b8", backdropFilter: "blur(8px)" }}>
          {Math.round(scale * 100)}% · {paperSize.toUpperCase()} · {TEMPLATE_LIST.find(t => t.id === templateId)?.name}
        </div>
      </div>
    </div>
  );
}