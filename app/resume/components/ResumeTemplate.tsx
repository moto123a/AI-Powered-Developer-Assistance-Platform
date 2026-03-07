"use client";
import React, { useState, useEffect } from 'react';

export default function ResumeTemplate({ data, styles }: any) {
  // Only render on client — prevents SSR hydration mismatch
  // and means body{color:white} from globals.css never touches this
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !data?.personalInfo) {
    return (
      <div style={{
        width: '794px', minHeight: '1123px',
        backgroundColor: '#ffffff', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#9ca3af', fontFamily: 'Georgia, serif',
      }}>
        Loading...
      </div>
    );
  }

  const fontFamilyMap: Record<string, string> = {
    mono:  '"Courier New", Courier, monospace',
    sans:  '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  };

  const ff = fontFamilyMap[styles?.fontFamily] || fontFamilyMap['serif'];
  const ac = styles?.accentColor || '#1e40af';
  const fs = Number(styles?.fontSize) || 11;

  // Every element gets explicit color + fontFamily so nothing is inherited
  const t = (size = fs, color = '#111827', extra: React.CSSProperties = {}): React.CSSProperties => ({
    margin: 0,
    padding: 0,
    fontFamily: ff,
    fontSize: `${size}px`,
    color,
    lineHeight: 1.5,
    ...extra,
  });

  const liStyle: React.CSSProperties = {
    fontFamily: ff,
    fontSize: `${fs}px`,
    color: '#1f2937',
    lineHeight: 1.6,
    marginBottom: '2px',
    listStyleType: 'disc',
    listStylePosition: 'outside',
    display: 'list-item',
  };

  const bullets = (arr: any) =>
    (Array.isArray(arr) ? arr : [arr])
      .filter(Boolean)
      .map((b: string, j: number) => <li key={j} style={liStyle}>{b}</li>);

  return (
    <div
      id="resume-to-print"
      style={{
        fontFamily: ff,
        fontSize: `${fs}px`,
        lineHeight: 1.5,
        backgroundColor: '#ffffff',
        color: '#111827',
        width: '794px',
        minHeight: '1123px',
        padding: '48px 52px',
        boxSizing: 'border-box',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ textAlign: 'center', borderBottom: `3px solid ${ac}`, paddingBottom: '14px', marginBottom: '18px' }}>
        <div style={t(24, ac, { fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', display: 'block' })}>
          {data.personalInfo.name}
        </div>
        <div style={t(9.5, '#374151', { marginTop: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' })}>
          {data.personalInfo.headline}
        </div>
        <div style={t(9.5, '#6b7280', { marginTop: '5px', display: 'block' })}>
          {[data.personalInfo.email, data.personalInfo.phone, data.personalInfo.location].filter(Boolean).join('  ·  ')}
        </div>
      </div>

      {/* ── SUMMARY ── */}
      {data.summary && (
        <Sec ac={ac} ff={ff} title="Professional Summary">
          <div style={t(fs, '#1f2937', { textAlign: 'justify', lineHeight: 1.6, marginTop: '5px' })}>
            {data.summary}
          </div>
        </Sec>
      )}

      {/* ── SKILLS ── */}
      {data.skillCategories?.length > 0 && (
        <Sec ac={ac} ff={ff} title="Technical Skills">
          {data.skillCategories.map((cat: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? '5px' : '3px' }}>
              <span style={t(fs, '#111827', { fontWeight: 700 })}>{cat.name}: </span>
              <span style={t(fs, '#374151')}>{cat.skills}</span>
            </div>
          ))}
        </Sec>
      )}

      {/* ── EXPERIENCE ── */}
      {data.experience?.length > 0 && (
        <Sec ac={ac} ff={ff} title="Work Experience">
          {data.experience.map((exp: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? '5px' : '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={t(fs + 0.5, '#111827', { fontWeight: 700 })}>
                  {exp.company}{exp.role ? ` — ${exp.role}` : ''}
                </span>
                <span style={t(9, '#6b7280', { whiteSpace: 'nowrap', marginLeft: '10px' })}>
                  {exp.period}
                </span>
              </div>
              {exp.location && (
                <div style={t(9, '#9ca3af', { fontStyle: 'italic', marginTop: '1px', marginBottom: '3px' })}>
                  {exp.location}
                </div>
              )}
              <ul style={{ margin: '4px 0 0', paddingLeft: '18px', listStyle: 'disc' }}>
                {bullets(exp.bullets)}
              </ul>
            </div>
          ))}
        </Sec>
      )}

      {/* ── PROJECTS ── */}
      {data.projects?.length > 0 && (
        <Sec ac={ac} ff={ff} title="Projects">
          {data.projects.map((proj: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? '5px' : '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={t(fs + 0.5, ac, { fontWeight: 700 })}>{proj.title || proj.name}</span>
                {proj.period && <span style={t(9, '#6b7280')}>{proj.period}</span>}
              </div>
              {proj.tech && (
                <div style={t(9, '#6b7280', { fontStyle: 'italic', marginTop: '1px', marginBottom: '3px' })}>
                  {proj.tech}
                </div>
              )}
              {proj.bullets?.length > 0 && (
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px', listStyle: 'disc' }}>
                  {bullets(proj.bullets)}
                </ul>
              )}
            </div>
          ))}
        </Sec>
      )}

      {/* ── EDUCATION ── */}
      {data.education?.length > 0 && (
        <Sec ac={ac} ff={ff} title="Education">
          {data.education.map((edu: any, i: number) => (
            <div key={i} style={{ marginTop: i === 0 ? '5px' : '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={t(fs + 0.5, '#111827', { fontWeight: 700 })}>{edu.school || edu.institution}</div>
                <div style={t(fs, '#374151', { marginTop: '2px' })}>
                  {edu.degree}{edu.gpa ? ` — GPA: ${edu.gpa}` : ''}
                </div>
              </div>
              <span style={t(9, '#6b7280', { whiteSpace: 'nowrap', marginLeft: '10px' })}>
                {edu.period || edu.year}
              </span>
            </div>
          ))}
        </Sec>
      )}

      {/* ── CERTIFICATIONS ── */}
      {data.certifications?.length > 0 && (
        <Sec ac={ac} ff={ff} title="Certifications">
          <ul style={{ margin: '5px 0 0', paddingLeft: '18px', listStyle: 'disc' }}>
            {data.certifications.map((cert: any, i: number) => (
              <li key={i} style={liStyle}>
                {typeof cert === 'string'
                  ? cert
                  : `${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}${cert.year ? ` (${cert.year})` : ''}`}
              </li>
            ))}
          </ul>
        </Sec>
      )}
    </div>
  );
}

function Sec({ ac, ff, title, children }: { ac: string; ff: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontFamily: ff,
        fontSize: '10px',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: ac,
        borderBottom: `1.5px solid ${ac}`,
        paddingBottom: '2px',
        marginBottom: '4px',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}