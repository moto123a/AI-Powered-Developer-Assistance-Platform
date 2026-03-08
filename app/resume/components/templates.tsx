import React from "react";

/* ================================================================ */
/*  TEMPLATE DEFINITIONS                                             */
/* ================================================================ */

export type TemplateId =
  | "recommended"
  | "modern"
  | "twocolumn"
  | "bold"
  | "compact"
  | "sidebar"
  | "grayheader"
  | "elegant";

export const TEMPLATE_LIST: { id: TemplateId; name: string; desc: string }[] = [
  { id: "recommended", name: "Recommended", desc: "Clean single-column classic" },
  { id: "modern",      name: "Modern",      desc: "Minimal with thin lines" },
  { id: "twocolumn",   name: "Two Column",  desc: "Side-by-side layout" },
  { id: "bold",        name: "Bold Header", desc: "Color block header" },
  { id: "compact",     name: "Compact",     desc: "Dense, space-saving" },
  { id: "sidebar",     name: "Sidebar",     desc: "Left accent sidebar" },
  { id: "grayheader",  name: "Executive",   desc: "Gray professional header" },
  { id: "elegant",     name: "Elegant",     desc: "Serif, refined look" },
];

type StyleCtx = {
  ff: string; ac: string; fs: number; lh: number; sg: number;
  pagePad: string; data: any; sectionOrder: string[];
};

/* ---- Shared helpers ---- */
const linkLine = (d: any) => {
  const parts: string[] = [];
  if (d.linkedin) parts.push(d.linkedin);
  if (d.github) parts.push(d.github);
  if (d.portfolio) parts.push(d.portfolio);
  (d.customLinks || []).forEach((l: any) => { if (l.url) parts.push(l.url); });
  return parts;
};

const contactLine = (d: any) =>
  [d.email, d.phone, d.location].filter(Boolean).join("  ·  ");

/* ================================================================ */
/*  PREVIEW RENDERERS (React JSX)                                    */
/* ================================================================ */

export function renderPreview(templateId: TemplateId, ctx: StyleCtx): React.ReactNode {
  const { ff, ac, fs, lh, sg, pagePad, data, sectionOrder } = ctx;

  const rs = (size = fs, color = "#111827", extra: React.CSSProperties = {}): React.CSSProperties => ({
    margin: 0, padding: 0, fontFamily: ff, fontSize: `${size}px`, color, lineHeight: lh, ...extra,
  });
  const liSt: React.CSSProperties = { fontFamily: ff, fontSize: `${fs}px`, color: "#1f2937", lineHeight: lh, marginBottom: 2, listStyleType: "disc", listStylePosition: "outside", display: "list-item" };
  const bul = (arr: unknown) => (Array.isArray(arr) ? arr : [arr]).filter(Boolean).map((b, j) => <li key={j} style={liSt}>{String(b)}</li>);

  const SH = ({ title, style }: { title: string; style?: React.CSSProperties }) => (
    <div style={{ marginBottom: 6, ...style }}>
      <div style={{ fontFamily: ff, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.07em", color: ac, marginBottom: 3 }}>{title}</div>
      <div style={{ height: 1.5, backgroundColor: ac, width: "100%" }} />
    </div>
  );

  const SH_THIN = ({ title }: { title: string }) => (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontFamily: ff, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: ac, paddingBottom: 3, borderBottom: `1px solid ${ac}40` }}>{title}</div>
    </div>
  );

  const links = linkLine(data.personalInfo || {});
  const contact = contactLine(data.personalInfo || {});

  /* ---- Section renderers ---- */
  const renderSummary = () => data.summary ? <div style={{ marginBottom: sg }}><SH title="Professional Summary" /><div style={rs(fs, "#1f2937", { textAlign: "justify" })}>{data.summary}</div></div> : null;

  const renderSkills = () => (data.skillCategories?.length ?? 0) > 0 ? <div style={{ marginBottom: sg }}><SH title="Technical Skills" />{data.skillCategories.map((cat: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 3 }}><span style={rs(fs, "#111827", { fontWeight: 700 })}>{cat.name}: </span><span style={rs(fs, "#374151")}>{cat.skills}</span></div>))}</div> : null;

  const renderExperience = () => (data.experience?.length ?? 0) > 0 ? <div style={{ marginBottom: sg }}><SH title="Work Experience" />{data.experience.map((exp: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={rs(fs + 0.5, "#111827", { fontWeight: 700 })}>{exp.company}{exp.role ? ` — ${exp.role}` : ""}</span><span style={rs(9, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{exp.period}</span></div>{exp.location && <div style={rs(9, "#9ca3af", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{exp.location}</div>}<ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>{bul(exp.bullets)}</ul></div>))}</div> : null;

  const renderProjects = () => (data.projects?.length ?? 0) > 0 ? <div style={{ marginBottom: sg }}><SH title="Projects" />{data.projects.map((proj: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 10 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={rs(fs + 0.5, ac, { fontWeight: 700 })}>{proj.title || proj.name}</span>{proj.period && <span style={rs(9, "#6b7280")}>{proj.period}</span>}</div>{proj.tech && <div style={rs(9, "#6b7280", { fontStyle: "italic", marginTop: 1, marginBottom: 3 })}>{proj.tech}</div>}{(proj.bullets?.length ?? 0) > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 18, listStyle: "disc" }}>{bul(proj.bullets)}</ul>}</div>))}</div> : null;

  const renderEducation = () => (data.education?.length ?? 0) > 0 ? <div style={{ marginBottom: sg }}><SH title="Education" />{data.education.map((edu: any, i: number) => (<div key={i} style={{ marginTop: i === 0 ? 0 : 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div><div style={rs(fs + 0.5, "#111827", { fontWeight: 700 })}>{edu.school || edu.institution}</div><div style={rs(fs, "#374151", { marginTop: 2 })}>{edu.degree}{edu.gpa ? ` — GPA: ${edu.gpa}` : ""}</div></div><span style={rs(9, "#6b7280", { whiteSpace: "nowrap", marginLeft: 10 })}>{edu.period || edu.year}</span></div>))}</div> : null;

  const renderCertifications = () => {
    const valid = (data.certifications || []).filter((c: any) => typeof c === "string" ? c.trim() : c?.name?.trim());
    return valid.length > 0 ? <div style={{ marginBottom: sg }}><SH title="Certifications" /><ul style={{ margin: "5px 0 0", paddingLeft: 18, listStyle: "disc" }}>{valid.map((cert: any, i: number) => (<li key={i} style={liSt}>{typeof cert === "string" ? cert : `${cert.name ?? ""}${cert.issuer ? ` — ${cert.issuer}` : ""}${cert.year ? ` (${cert.year})` : ""}`}</li>))}</ul></div> : null;
  };

  const sectionMap: Record<string, () => React.ReactNode> = {
    summary: renderSummary, skills: renderSkills, experience: renderExperience,
    projects: renderProjects, education: renderEducation, certifications: renderCertifications,
  };

  const renderSections = () => sectionOrder.map(id => <React.Fragment key={id}>{sectionMap[id]?.()}</React.Fragment>);

  /* ---- Links row ---- */
  const LinksRow = () => links.length > 0 ? (
    <div style={rs(8.5, "#6b7280", { marginTop: 3, display: "block" })}>
      {links.join("  ·  ")}
    </div>
  ) : null;

  /* ================================================================ */
  /*  TEMPLATE: RECOMMENDED (classic single-column)                    */
  /* ================================================================ */
  if (templateId === "recommended") {
    return (
      <div style={{ padding: pagePad }}>
        <div style={{ textAlign: "center", paddingBottom: 14, marginBottom: 6 }}>
          <div style={rs(24, ac, { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", display: "block" })}>{data.personalInfo?.name || "Your Name"}</div>
          <div style={rs(9.5, "#374151", { marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", display: "block" })}>{data.personalInfo?.headline || "Your Headline"}</div>
          <div style={rs(9.5, "#6b7280", { marginTop: 5, display: "block" })}>{contact || "email · phone · location"}</div>
          <LinksRow />
        </div>
        <div style={{ height: 3, backgroundColor: ac, width: "100%", marginBottom: 18 }} />
        {renderSections()}
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: MODERN (minimal thin lines)                            */
  /* ================================================================ */
  if (templateId === "modern") {
    return (
      <div style={{ padding: pagePad }}>
        <div style={{ marginBottom: 20 }}>
          <div style={rs(28, "#111827", { fontWeight: 300, letterSpacing: "0.05em", textTransform: "uppercase" })}>{data.personalInfo?.name || "Your Name"}</div>
          <div style={rs(11, ac, { marginTop: 4, fontWeight: 600, letterSpacing: "0.04em" })}>{data.personalInfo?.headline || "Your Headline"}</div>
          <div style={{ height: 1, backgroundColor: "#e5e7eb", width: "100%", margin: "10px 0" }} />
          <div style={rs(9, "#6b7280")}>{contact}</div>
          <LinksRow />
        </div>
        {renderSections()}
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: TWO COLUMN                                             */
  /* ================================================================ */
  if (templateId === "twocolumn") {
    const leftSections = ["skills", "education", "certifications"];
    const rightSections = sectionOrder.filter(s => !leftSections.includes(s));
    const leftContent = leftSections.map(id => <React.Fragment key={id}>{sectionMap[id]?.()}</React.Fragment>);
    const rightContent = rightSections.map(id => <React.Fragment key={id}>{sectionMap[id]?.()}</React.Fragment>);

    return (
      <div>
        {/* Header */}
        <div style={{ padding: "28px 36px", backgroundColor: ac, color: "white" }}>
          <div style={{ fontFamily: ff, fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em" }}>{data.personalInfo?.name || "Your Name"}</div>
          <div style={{ fontFamily: ff, fontSize: 10, fontWeight: 600, marginTop: 4, opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.08em" }}>{data.personalInfo?.headline || "Your Headline"}</div>
          <div style={{ fontFamily: ff, fontSize: 9, marginTop: 6, opacity: 0.8 }}>{contact}</div>
          {links.length > 0 && <div style={{ fontFamily: ff, fontSize: 8, marginTop: 3, opacity: 0.7 }}>{links.join("  ·  ")}</div>}
        </div>
        {/* Two columns */}
        <div style={{ display: "flex", padding: "20px 0" }}>
          <div style={{ width: "35%", padding: "0 20px 0 36px", borderRight: `1px solid ${ac}30` }}>
            {leftContent}
          </div>
          <div style={{ width: "65%", padding: "0 36px 0 20px" }}>
            {rightContent}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: BOLD HEADER                                            */
  /* ================================================================ */
  if (templateId === "bold") {
    return (
      <div>
        <div style={{ backgroundColor: ac, padding: "36px 48px", color: "white", textAlign: "center" }}>
          <div style={{ fontFamily: ff, fontSize: 28, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em" }}>{data.personalInfo?.name || "Your Name"}</div>
          <div style={{ fontFamily: ff, fontSize: 11, fontWeight: 500, marginTop: 6, opacity: 0.9, letterSpacing: "0.06em", textTransform: "uppercase" }}>{data.personalInfo?.headline || "Your Headline"}</div>
          <div style={{ fontFamily: ff, fontSize: 9, marginTop: 8, opacity: 0.8 }}>{contact}</div>
          {links.length > 0 && <div style={{ fontFamily: ff, fontSize: 8, marginTop: 4, opacity: 0.7 }}>{links.join("  |  ")}</div>}
        </div>
        <div style={{ padding: "24px 48px" }}>
          {renderSections()}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: COMPACT                                                */
  /* ================================================================ */
  if (templateId === "compact") {
    const cfs = Math.max(fs - 1, 8);
    const cliSt: React.CSSProperties = { ...liSt, fontSize: `${cfs}px`, lineHeight: 1.35, marginBottom: 1 };
    return (
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `2px solid ${ac}`, paddingBottom: 8, marginBottom: 12 }}>
          <div>
            <div style={rs(20, "#111827", { fontWeight: 900, textTransform: "uppercase" })}>{data.personalInfo?.name || "Your Name"}</div>
            <div style={rs(9, ac, { fontWeight: 600, marginTop: 2 })}>{data.personalInfo?.headline || "Headline"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={rs(8, "#6b7280")}>{data.personalInfo?.email} · {data.personalInfo?.phone}</div>
            <div style={rs(8, "#6b7280")}>{data.personalInfo?.location}</div>
            {links.length > 0 && <div style={rs(7.5, "#9ca3af")}>{links.join(" · ")}</div>}
          </div>
        </div>
        {renderSections()}
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: SIDEBAR (left accent bar)                              */
  /* ================================================================ */
  if (templateId === "sidebar") {
    return (
      <div style={{ display: "flex", minHeight: "100%" }}>
        {/* Left bar */}
        <div style={{ width: 6, backgroundColor: ac, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: pagePad }}>
          <div style={{ marginBottom: 16 }}>
            <div style={rs(26, ac, { fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em" })}>{data.personalInfo?.name || "Your Name"}</div>
            <div style={rs(10, "#475569", { marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" })}>{data.personalInfo?.headline || "Your Headline"}</div>
            <div style={{ height: 1, backgroundColor: "#e2e8f0", margin: "10px 0" }} />
            <div style={rs(9, "#6b7280")}>{contact}</div>
            <LinksRow />
          </div>
          {renderSections()}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: EXECUTIVE (gray header)                                */
  /* ================================================================ */
  if (templateId === "grayheader") {
    return (
      <div>
        <div style={{ backgroundColor: "#1e293b", padding: "32px 48px", color: "white" }}>
          <div style={{ fontFamily: ff, fontSize: 24, fontWeight: 800, letterSpacing: "0.01em" }}>{data.personalInfo?.name || "Your Name"}</div>
          <div style={{ fontFamily: ff, fontSize: 10, fontWeight: 500, marginTop: 5, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{data.personalInfo?.headline || "Your Headline"}</div>
          <div style={{ fontFamily: ff, fontSize: 9, marginTop: 8, color: "#cbd5e1" }}>{contact}</div>
          {links.length > 0 && <div style={{ fontFamily: ff, fontSize: 8, marginTop: 4, color: "#64748b" }}>{links.join("  ·  ")}</div>}
        </div>
        <div style={{ padding: "24px 48px" }}>
          {renderSections()}
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  TEMPLATE: ELEGANT (refined serif)                                */
  /* ================================================================ */
  if (templateId === "elegant") {
    return (
      <div style={{ padding: pagePad }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={rs(22, "#111827", { fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" })}>{data.personalInfo?.name || "Your Name"}</div>
          <div style={{ width: 60, height: 2, backgroundColor: ac, margin: "8px auto" }} />
          <div style={rs(9.5, "#475569", { marginTop: 4, fontWeight: 500, fontStyle: "italic" })}>{data.personalInfo?.headline || "Your Headline"}</div>
          <div style={rs(9, "#6b7280", { marginTop: 6 })}>{contact}</div>
          <LinksRow />
        </div>
        {renderSections()}
      </div>
    );
  }

  /* Fallback */
  return <div style={{ padding: pagePad }}>{renderSections()}</div>;
}

/* ================================================================ */
/*  PRINT HTML RENDERER                                              */
/* ================================================================ */
export function buildPrintHTML(templateId: TemplateId, ctx: StyleCtx & { fontUrl?: string; paperSize: string }): string {
  const { ff, ac, fs, lh, sg, pagePad, data, sectionOrder, fontUrl, paperSize } = ctx;

  const fontLink = fontUrl ? `<link rel="stylesheet" href="${fontUrl}">` : "";
  const pageCSS = paperSize === "letter" ? "size:letter portrait;" : "size:A4 portrait;";

  const li = `font-family:${ff};font-size:${fs}px;color:#1f2937;line-height:${lh};margin-bottom:2px;list-style-type:disc;list-style-position:outside;display:list-item;`;
  const sh = (t: string) => `<div style="margin-bottom:6px;"><div style="font-family:${ff};font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.07em;color:${ac};margin-bottom:3px;">${t}</div><div style="height:1.5px;background-color:${ac};width:100%;"></div></div>`;
  const tx = (s: number, c: string, x = "") => `font-family:${ff};font-size:${s}px;color:${c};line-height:${lh};margin:0;padding:0;${x}`;
  const blts = (arr: any) => (Array.isArray(arr) ? arr : [arr]).filter(Boolean).map((b: string) => `<li style="${li}">${b}</li>`).join("");

  const links = linkLine(data.personalInfo || {});
  const contact = contactLine(data.personalInfo || {});
  const linksHtml = links.length > 0 ? `<div style="${tx(8.5, "#6b7280", "margin-top:3px;")}">${links.join("  ·  ")}</div>` : "";

  const sectionHTML: Record<string, string> = {
    summary: data.summary ? `<div style="margin-bottom:${sg}px;">${sh("Professional Summary")}<div style="${tx(fs, "#1f2937", "text-align:justify;")}">${data.summary}</div></div>` : "",
    skills: (data.skillCategories?.length ?? 0) > 0 ? `<div style="margin-bottom:${sg}px;">${sh("Technical Skills")}${data.skillCategories.map((c: any, i: number) => `<div style="margin-top:${i ? 3 : 0}px;"><span style="${tx(fs, "#111827", "font-weight:700;")}">${c.name}:</span> <span style="${tx(fs, "#374151")}">${c.skills}</span></div>`).join("")}</div>` : "",
    experience: (data.experience?.length ?? 0) > 0 ? `<div style="margin-bottom:${sg}px;">${sh("Work Experience")}${data.experience.map((e: any, i: number) => `<div style="margin-top:${i ? 14 : 0}px;"><div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="${tx(fs + .5, "#111827", "font-weight:700;")}">${e.company}${e.role ? ` — ${e.role}` : ""}</span><span style="${tx(9, "#6b7280", "white-space:nowrap;margin-left:10px;")}">${e.period ?? ""}</span></div>${e.location ? `<div style="${tx(9, "#9ca3af", "font-style:italic;margin-top:1px;margin-bottom:3px;")}">${e.location}</div>` : ""}<ul style="margin-top:4px;padding-left:18px;list-style:disc;">${blts(e.bullets)}</ul></div>`).join("")}</div>` : "",
    projects: (data.projects?.length ?? 0) > 0 ? `<div style="margin-bottom:${sg}px;">${sh("Projects")}${data.projects.map((p: any, i: number) => `<div style="margin-top:${i ? 10 : 0}px;"><div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="${tx(fs + .5, ac, "font-weight:700;")}">${p.title || p.name || ""}</span>${p.period ? `<span style="${tx(9, "#6b7280")}">${p.period}</span>` : ""}</div>${p.tech ? `<div style="${tx(9, "#6b7280", "font-style:italic;margin-top:1px;margin-bottom:3px;")}">${p.tech}</div>` : ""}${(p.bullets?.length ?? 0) > 0 ? `<ul style="margin-top:4px;padding-left:18px;list-style:disc;">${blts(p.bullets)}</ul>` : ""}</div>`).join("")}</div>` : "",
    education: (data.education?.length ?? 0) > 0 ? `<div style="margin-bottom:${sg}px;">${sh("Education")}${data.education.map((e: any, i: number) => `<div style="margin-top:${i ? 10 : 0}px;display:flex;justify-content:space-between;align-items:flex-start;"><div><div style="${tx(fs + .5, "#111827", "font-weight:700;")}">${e.school || e.institution || ""}</div><div style="${tx(fs, "#374151", "margin-top:2px;")}">${e.degree ?? ""}${e.gpa ? ` — GPA: ${e.gpa}` : ""}</div></div><span style="${tx(9, "#6b7280", "white-space:nowrap;margin-left:10px;")}">${e.period || e.year || ""}</span></div>`).join("")}</div>` : "",
    certifications: (data.certifications?.length ?? 0) > 0 ? `<div style="margin-bottom:${sg}px;">${sh("Certifications")}<ul style="margin-top:5px;padding-left:18px;list-style:disc;">${data.certifications.filter(Boolean).map((c: any) => `<li style="${li}">${typeof c === "string" ? c : `${c.name ?? ""}${c.issuer ? ` — ${c.issuer}` : ""}${c.year ? ` (${c.year})` : ""}`}</li>`).join("")}</ul></div>` : "",
  };

  const sectionsHtml = sectionOrder.map(id => sectionHTML[id] || "").join("");

  const base = `<!DOCTYPE html><html><head><meta charset="utf-8">${fontLink}<style>*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important;}body{background:#fff;color:#111827;font-family:${ff};font-size:${fs}px;line-height:${lh};}ul{list-style:disc;padding-left:18px;}@page{${pageCSS}margin:14mm 16mm;}</style></head><body>`;

  /* ---- Template-specific print layouts ---- */
  if (templateId === "recommended") {
    return `${base}<div style="padding:${pagePad};"><div style="text-align:center;padding-bottom:14px;margin-bottom:6px;"><div style="${tx(24, ac, "font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;")}">${data.personalInfo?.name ?? ""}</div><div style="${tx(9.5, "#374151", "font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-top:4px;")}">${data.personalInfo?.headline ?? ""}</div><div style="${tx(9.5, "#6b7280", "margin-top:5px;")}">${contact}</div>${linksHtml}</div><div style="height:3px;background:${ac};width:100%;margin-bottom:18px;"></div>${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "modern") {
    return `${base}<div style="padding:${pagePad};"><div style="margin-bottom:20px;"><div style="${tx(28, "#111827", "font-weight:300;letter-spacing:0.05em;text-transform:uppercase;")}">${data.personalInfo?.name ?? ""}</div><div style="${tx(11, ac, "margin-top:4px;font-weight:600;letter-spacing:0.04em;")}">${data.personalInfo?.headline ?? ""}</div><div style="height:1px;background:#e5e7eb;width:100%;margin:10px 0;"></div><div style="${tx(9, "#6b7280")}">${contact}</div>${linksHtml}</div>${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "bold") {
    return `${base}<div style="background:${ac};padding:36px 48px;color:white;text-align:center;"><div style="font-family:${ff};font-size:28px;font-weight:900;text-transform:uppercase;">${data.personalInfo?.name ?? ""}</div><div style="font-family:${ff};font-size:11px;font-weight:500;margin-top:6px;opacity:0.9;text-transform:uppercase;letter-spacing:0.06em;">${data.personalInfo?.headline ?? ""}</div><div style="font-family:${ff};font-size:9px;margin-top:8px;opacity:0.8;">${contact}</div>${links.length > 0 ? `<div style="font-family:${ff};font-size:8px;margin-top:4px;opacity:0.7;">${links.join("  |  ")}</div>` : ""}</div><div style="padding:24px 48px;">${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "grayheader") {
    return `${base}<div style="background:#1e293b;padding:32px 48px;color:white;"><div style="font-family:${ff};font-size:24px;font-weight:800;">${data.personalInfo?.name ?? ""}</div><div style="font-family:${ff};font-size:10px;font-weight:500;margin-top:5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">${data.personalInfo?.headline ?? ""}</div><div style="font-family:${ff};font-size:9px;margin-top:8px;color:#cbd5e1;">${contact}</div>${links.length > 0 ? `<div style="font-family:${ff};font-size:8px;margin-top:4px;color:#64748b;">${links.join("  ·  ")}</div>` : ""}</div><div style="padding:24px 48px;">${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "elegant") {
    return `${base}<div style="padding:${pagePad};"><div style="text-align:center;margin-bottom:20px;"><div style="${tx(22, "#111827", "font-weight:700;letter-spacing:0.1em;text-transform:uppercase;")}">${data.personalInfo?.name ?? ""}</div><div style="width:60px;height:2px;background:${ac};margin:8px auto;"></div><div style="${tx(9.5, "#475569", "margin-top:4px;font-weight:500;font-style:italic;")}">${data.personalInfo?.headline ?? ""}</div><div style="${tx(9, "#6b7280", "margin-top:6px;")}">${contact}</div>${linksHtml}</div>${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "twocolumn") {
    const leftIds = ["skills", "education", "certifications"];
    const rightIds = sectionOrder.filter(s => !leftIds.includes(s));
    const leftHtml = leftIds.map(id => sectionHTML[id] || "").join("");
    const rightHtml = rightIds.map(id => sectionHTML[id] || "").join("");
    return `${base}<div style="background:${ac};padding:28px 36px;color:white;"><div style="font-family:${ff};font-size:24px;font-weight:900;text-transform:uppercase;">${data.personalInfo?.name ?? ""}</div><div style="font-family:${ff};font-size:10px;font-weight:600;margin-top:4px;opacity:0.9;text-transform:uppercase;letter-spacing:0.08em;">${data.personalInfo?.headline ?? ""}</div><div style="font-family:${ff};font-size:9px;margin-top:6px;opacity:0.8;">${contact}</div>${links.length > 0 ? `<div style="font-family:${ff};font-size:8px;margin-top:3px;opacity:0.7;">${links.join("  ·  ")}</div>` : ""}</div><div style="display:flex;padding:20px 0;"><div style="width:35%;padding:0 20px 0 36px;border-right:1px solid ${ac}30;">${leftHtml}</div><div style="width:65%;padding:0 36px 0 20px;">${rightHtml}</div></div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "sidebar") {
    return `${base}<div style="display:flex;min-height:100%;"><div style="width:6px;background:${ac};flex-shrink:0;"></div><div style="flex:1;padding:${pagePad};"><div style="margin-bottom:16px;"><div style="${tx(26, ac, "font-weight:900;text-transform:uppercase;letter-spacing:-0.01em;")}">${data.personalInfo?.name ?? ""}</div><div style="${tx(10, "#475569", "margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;")}">${data.personalInfo?.headline ?? ""}</div><div style="height:1px;background:#e2e8f0;margin:10px 0;"></div><div style="${tx(9, "#6b7280")}">${contact}</div>${linksHtml}</div>${sectionsHtml}</div></div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  if (templateId === "compact") {
    return `${base}<div style="padding:28px 36px;"><div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid ${ac};padding-bottom:8px;margin-bottom:12px;"><div><div style="${tx(20, "#111827", "font-weight:900;text-transform:uppercase;")}">${data.personalInfo?.name ?? ""}</div><div style="${tx(9, ac, "font-weight:600;margin-top:2px;")}">${data.personalInfo?.headline ?? ""}</div></div><div style="text-align:right;"><div style="${tx(8, "#6b7280")}">${data.personalInfo?.email} · ${data.personalInfo?.phone}</div><div style="${tx(8, "#6b7280")}">${data.personalInfo?.location}</div>${links.length > 0 ? `<div style="${tx(7.5, "#9ca3af")}">${links.join(" · ")}</div>` : ""}</div></div>${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
  }

  /* Fallback */
  return `${base}<div style="padding:${pagePad};">${sectionsHtml}</div><script>window.onload=function(){window.print();}<\/script></body></html>`;
}