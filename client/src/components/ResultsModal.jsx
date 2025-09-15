// src/components/ResultsModal.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InsightCards, { SummaryTagsCard, InsightsByThemeCard } from "./InsightCards";
import { DelightNotes, DelightChart } from "./UserDelightSection";
import Button from "@mui/material/Button";
import { X } from "lucide-react";
import { DialogContent, DialogTitle, Box } from "@mui/material";
import { handleExportPDF } from "../services/pdfExport";

export default function ResultsModal({
  open,
  onClose,
  reportData = {},
  isLoading = false,
  onBackToInput,
  onStartOver,
}) {
  const [visible, setVisible] = useState(false);
  const [exportMode, setExportMode] = useState(false); // expands lists during export

  const panelRef = useRef(null);     // outer panel
  const contentRef = useRef(null);   // scrollable content
  const closeBtnRef = useRef(null);

  // ---- portal root ----
  const portalRoot = useMemo(() => {
    if (typeof window === "undefined") return null;
    let el = document.getElementById("modal-root");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("id", "modal-root");
      document.body.appendChild(el);
    }
    return el;
  }, []);

  // ---- mount / unmount animation ----
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => { cancelAnimationFrame(id); setVisible(false); };
  }, [open]);

  // ---- esc to close ----
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ---- lock body scroll ----
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ---- focus trap basics ----
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
  }, [open]);

  const handleBackdropMouseDown = (e) => { if (e.target === e.currentTarget) onClose(); };
  const handleClose = () => { setVisible(false); setTimeout(onClose, 180); };

  // ---- Export inside modal (captures the scrollable content only) ----
  const onExport = async () => {
    if (!contentRef.current) return;
    contentRef.current.scrollTop = 0;
    setExportMode(true);                       
    // wait 2 frames so charts/layout settle
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    try {
      await handleExportPDF({ node: contentRef.current });
    } finally {
      setExportMode(false);
    }
  };

  if (!open || !portalRoot) return null;

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="results-title"
      onMouseDown={handleBackdropMouseDown}
      className={[
        "fixed inset-0 z-[70] flex items-center justify-center",
        "bg-slate-900/30 backdrop-blur-sm",
        "transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{ overscrollBehavior: "contain" }}
    >
      <div
        ref={panelRef}
        className={[
          "w-[96vw] max-w-[1100px] max-h-[85vh]",
          "bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-2xl",
          "flex flex-col overflow-hidden",
          "transform transition-all duration-200",
          visible ? "opacity-100 translate-y-0 sm:scale-100" : "opacity-0 translate-y-1 sm:scale-95",
        ].join(" ")}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div>
            <DialogTitle id="results-title" className="text-lg font-semibold text-slate-900">
              Analysis Results
            </DialogTitle>
            <p className="text-xs text-slate-600">Top insight, tag distribution, themes & delight moments</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" color="primary" size="small" onClick={onExport}>
              Export PDF
            </Button>
            <Button variant="outlined" color="secondary" size="small" onClick={onBackToInput}>
              Back to Input
            </Button>
            <Button variant="contained" color="primary" size="small" onClick={onStartOver}>
              Start Over
            </Button>
            <Button
              ref={closeBtnRef}
              variant="text"
              color="inherit"
              size="small"
              onClick={handleClose}
              startIcon={<X size={18} />}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <DialogContent ref={contentRef} dividers sx={{ flex: 1, overflow: "auto", p: 3 }}>
          <Box mb={4}>
            <InsightCards reportData={reportData} isLoading={isLoading} isEmpty={false} onlyTop />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 3,
            }}
          >
            <SummaryTagsCard data={reportData?.pie_data} isLoading={isLoading} expandAll={exportMode} />
            <DelightChart data={reportData?.delight_distribution } expandAll={exportMode} />
            <InsightsByThemeCard insights={reportData?.insights} isLoading={isLoading} expandAll={exportMode} />
            <DelightNotes highlights={reportData?.delight_by_theme || { Notes: reportData?.positive_highlights || [] }} expandAll={exportMode} />
          </Box>
        </DialogContent>
      </div>
    </div>
  );

  return createPortal(dialog, portalRoot);
}
