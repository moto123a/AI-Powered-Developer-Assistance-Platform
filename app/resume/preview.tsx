"use client";
import React, { useRef, useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  TEMPLATE_LIST, renderPreview,
  type TemplateId,
} from "./components/templates";

const PAPER: Record<string, { w: number; h: number; label: string }> = {
  a4:     { w: 794, h: 1123, label: "A4"     },
  letter: { w: 816, h: 1056, label: "Letter" },
};

const T = {
  bg:           "#f8f7f5",
  bgPanel:      "#ffffff",
  border:       "#e8e4df",
  textSecondary:"#6b6460",
  textTertiary: "#a09893",
  accent:       "#2d5be3",
  accentLight:  "rgba(45,91,227,0.08)",
  success:      "#15803d",
  successLight: "rgba(21,128,61,0.08)",
  shadow:       "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:     "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
  radius:       "8px",
};

function Tooltip({ children, tip, side = "top" }: {
  children: React.ReactNode; tip: string; side?: "top" | "bottom" | "right";
}) {
  const [show, setShow] = useState(false);
  const pos = side === "top"
    ? { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : side === "bottom"
    ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : { left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)" };
  return (
    <div style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute", ...pos, zIndex: 9999, pointerEvents: "none",
          background: "#1a1714", color: "#fff", fontSize: 11, fontWeight: 600,
          padding: "4px 10px", borderRadius: 6, whiteSpace: "nowrap",
          boxShadow: T.shadowMd,
        }}>
          {tip}
        </div>
      )}
    </div>
  );
}

interface ResumePreviewProps {
  paper: { w: number; h: number; label: string };
  paperSize: "a4" | "letter";
  templateId: TemplateId;
  styleCtx: {
    ff: string;
    ac: string;
    fs: number;
    lh: number;
    sg: number;
    pagePad: string;
    data: any;
    sectionOrder: string[];
  };
  fontObj: { key: string; label: string; family: string; cat: string; url?: string };
  onShowShortcuts: () => void;
}

const PAGE_GAP = 24;

/* Parse the vertical padding from pagePad string e.g. "48px 52px" → 48 */
function parseVerticalPad(pagePad: string): number {
  const val = parseInt(pagePad.split(" ")[0], 10);
  return isNaN(val) ? 48 : val;
}

export default function ResumePreview({
  paper,
  paperSize,
  templateId,
  styleCtx,
  fontObj,
  onShowShortcuts,
}: ResumePreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sourceRef  = useRef<HTMLDivElement>(null);

  const [scale,         setScale]         = useState(0.75);
  const [contentHeight, setContentHeight] = useState(paper.h);

  /* Scale to fit available width */
  useEffect(() => {
    const calc = () => {
      if (!wrapperRef.current) return;
      const available = wrapperRef.current.getBoundingClientRect().width - 80;
      setScale(Math.min(available / paper.w, 1));
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [paper.w]);

  /* Measure rendered content height */
  useEffect(() => {
    if (!sourceRef.current) return;
    const ro = new ResizeObserver(() => {
      if (sourceRef.current) setContentHeight(sourceRef.current.scrollHeight);
    });
    ro.observe(sourceRef.current);
    return () => ro.disconnect();
  }, [styleCtx, templateId]);

  const pageCount      = Math.max(1, Math.ceil(contentHeight / paper.h));
  const totalUnscaledH = pageCount * paper.h + (pageCount - 1) * PAGE_GAP;

  /* The vertical padding defined in styleCtx.pagePad */
  const verticalPad = parseVerticalPad(styleCtx.pagePad);

  return (
    <div
      ref={wrapperRef}
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        background: "#e8e5e0",
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Live preview badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px 0" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7, padding: "5px 14px",
          borderRadius: 20, background: T.bgPanel, border: `1.5px solid ${T.border}`,
          fontSize: 11, color: T.textSecondary, fontWeight: 600, boxShadow: T.shadow,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", background: T.success,
            boxShadow: `0 0 0 3px ${T.successLight}`, animation: "pulse 2s infinite",
          }} />
          Live Preview
        </div>
      </div>

      {/* Page stack */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: 60 }}>
        <div style={{
          width:           paper.w,
          height:          totalUnscaledH,
          transform:       `scale(${scale})`,
          transformOrigin: "top center",
          marginBottom:    `${-totalUnscaledH * (1 - scale)}px`,
        }}>
          {/* Hidden measurement div */}
          <div
            ref={sourceRef}
            aria-hidden="true"
            style={{
              position:      "absolute",
              top:           0,
              left:          0,
              width:         paper.w,
              visibility:    "hidden",
              pointerEvents: "none",
              zIndex:        -1,
            }}
          >
            {renderPreview(templateId, styleCtx)}
          </div>

          {/* N page windows */}
          <div style={{ display: "flex", flexDirection: "column", gap: PAGE_GAP }}>
            {Array.from({ length: pageCount }, (_, pageIndex) => (
              <PageWindow
                key={pageIndex}
                pageIndex={pageIndex}
                pageWidth={paper.w}
                pageHeight={paper.h}
                templateId={templateId}
                styleCtx={styleCtx}
                verticalPad={verticalPad}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        position: "sticky", bottom: 14,
        display: "flex", justifyContent: "flex-end",
        paddingRight: 14, zIndex: 20, pointerEvents: "none",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          padding: "6px 14px", borderRadius: 20,
          background: T.bgPanel, border: `1.5px solid ${T.border}`,
          fontSize: 10, color: T.textTertiary, fontWeight: 600,
          boxShadow: T.shadowMd, pointerEvents: "all",
        }}>
          <span>{Math.round(scale * 100)}%</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{paperSize.toUpperCase()}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{TEMPLATE_LIST.find(t => t.id === templateId)?.name}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <span>{fontObj.label}</span>
          <span style={{ width: 1, height: 14, background: T.border }} />
          <Tooltip tip="Keyboard shortcuts (⌘/)" side="top">
            <button
              onClick={onShowShortcuts}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                border: "none", background: "none", cursor: "pointer",
                color: T.textTertiary, padding: 0, fontSize: 10, fontWeight: 600,
              }}
            >
              <Keyboard size={11} /> Shortcuts
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PAGE WINDOW

   KEY FIX:
   After clipping each page with overflow:hidden, we render two
   white overlay bars — one at the top and one at the bottom of
   each page — matching the template's vertical padding (verticalPad).

   This means:
   - Content that would bleed into the top margin area is hidden
     by the top white bar
   - Content that would bleed into the bottom margin area is hidden
     by the bottom white bar
   - The visual result looks like a real printed page with proper
     top and bottom margins
   - The gap between pages (the grey canvas background) is visible
     because it sits OUTSIDE the page window divs
════════════════════════════════════════════════════════════════ */
interface PageWindowProps {
  pageIndex:   number;
  pageWidth:   number;
  pageHeight:  number;
  templateId:  TemplateId;
  styleCtx:    any;
  verticalPad: number;
}

function PageWindow({
  pageIndex, pageWidth, pageHeight, templateId, styleCtx, verticalPad,
}: PageWindowProps) {
  return (
    <div
      style={{
        width:        pageWidth,
        height:       pageHeight,
        overflow:     "hidden",
        position:     "relative",
        flexShrink:   0,
        background:   "#ffffff",
        borderRadius: 2,
        boxShadow:    "0 4px 24px rgba(0,0,0,0.13), 0 1.5px 6px rgba(0,0,0,0.07)",
      }}
    >
      {/* Resume content shifted to show the correct page slice */}
      <div
        style={{
          position:  "absolute",
          top:       0,
          left:      0,
          width:     pageWidth,
          transform: `translateY(${-pageIndex * pageHeight}px)`,
          overflow:  "visible",
        }}
      >
        {renderPreview(templateId, styleCtx)}
      </div>

      {/*
        TOP MARGIN OVERLAY — white bar covering the top verticalPad px.
        On page 0 this is just cosmetic (content starts at 0 anyway).
        On page 1+ this hides any content that bleeds into the top margin
        from the previous page's overflow.
      */}
      {pageIndex > 0 && (
        <div
          style={{
            position:   "absolute",
            top:        0,
            left:       0,
            width:      "100%",
            height:     verticalPad,
            background: "#ffffff",
            zIndex:     10,
          }}
        />
      )}

      {/*
        BOTTOM MARGIN OVERLAY — white bar covering the bottom verticalPad px.
        This hides any content that bleeds into the bottom margin area,
        so it appears cleanly cut off with proper margin spacing.
      */}
      <div
        style={{
          position:   "absolute",
          bottom:     0,
          left:       0,
          width:      "100%",
          height:     verticalPad,
          background: "#ffffff",
          zIndex:     10,
        }}
      />
    </div>
  );
}