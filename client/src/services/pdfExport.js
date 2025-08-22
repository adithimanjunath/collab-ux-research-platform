// src/services/pdfExport.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const handleExportPDF = async ({ node }) => {
  const source = node instanceof HTMLElement ? node : null;
  if (!source || !document.body.contains(source)) {
    console.warn("handleExportPDF: invalid or detached node");
    return;
  }

  // 1) Measure Recharts sizes from the LIVE source DOM (not the clone)
  const sourceRCs = Array.from(
    source.querySelectorAll(".recharts-responsive-container")
  );
  const measured = sourceRCs.map((rc) => {
    const rect = rc.getBoundingClientRect();
    // sensible minimums so small charts don’t collapse
    const w = Math.max(Math.floor(rect.width) || rc.offsetWidth || 700, 600);
    const h = Math.max(Math.floor(rect.height) || rc.offsetHeight || 320, 260);
    return { w, h };
  });

  // 2) Build an off-screen sandbox + clone (so height isn’t limited by 85vh)
  const sandbox = document.createElement("div");
  sandbox.style.position = "absolute";
  sandbox.style.left = "-99999px";
  sandbox.style.top = "0";
  sandbox.style.width = `${source.offsetWidth || 1100}px`;
  sandbox.style.pointerEvents = "none";
  document.body.appendChild(sandbox);

  const clone = source.cloneNode(true);
  clone.style.maxHeight = "none";
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  sandbox.appendChild(clone);

  // Remove sticky in the clone
  clone.querySelectorAll("*").forEach((el) => {
    const cs = window.getComputedStyle(el);
    if (cs.position === "sticky") {
      el.style.position = "static";
      el.style.top = "auto";
    }
  });

  // 3) Apply the measured sizes to the clone’s charts (by index)
  const cloneRCs = Array.from(
    clone.querySelectorAll(".recharts-responsive-container")
  );

  const revertFns = [];
  cloneRCs.forEach((rc, i) => {
    const { w, h } = measured[i] || measured[measured.length - 1] || { w: 700, h: 320 };

    const prev = { width: rc.style.width, height: rc.style.height };
    rc.style.width = w + "px";
    rc.style.height = h + "px";
    revertFns.push(() => {
      rc.style.width = prev.width;
      rc.style.height = prev.height;
    });

    const wrapper = rc.querySelector(".recharts-wrapper");
    if (wrapper) {
      const pw = { width: wrapper.style.width, height: wrapper.style.height };
      wrapper.style.width = w + "px";
      wrapper.style.height = h + "px";
      revertFns.push(() => {
        wrapper.style.width = pw.width;
        wrapper.style.height = pw.height;
      });
    }

    const svg = rc.querySelector("svg");
    if (svg) {
      const ps = {
        w: svg.getAttribute("width"),
        h: svg.getAttribute("height"),
        sw: svg.style.width,
        sh: svg.style.height,
      };
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.style.width = w + "px";
      svg.style.height = h + "px";
      revertFns.push(() => {
        if (ps.w) svg.setAttribute("width", ps.w); else svg.removeAttribute("width");
        if (ps.h) svg.setAttribute("height", ps.h); else svg.removeAttribute("height");
        svg.style.width = ps.sw || "";
        svg.style.height = ps.sh || "";
      });
    }
  });

  // Hide any default Recharts tooltips in the clone
  clone.querySelectorAll(".recharts-default-tooltip").forEach((t) => (t.style.display = "none"));

  // Let layout settle
  await new Promise((r) => setTimeout(r, 40));

  // 4) Capture the CLONE
  const canvas = await html2canvas(clone, {
    scale: Math.max(2, window.devicePixelRatio || 1),
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  // Cleanup
  revertFns.forEach((fn) => fn());
  document.body.removeChild(sandbox);

  // 5) Paginate into A4 PDF
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();

  const img = canvas.toDataURL("image/png");
  const imgH = (canvas.height * pdfW) / canvas.width;

  let remaining = imgH;
  let y = 0;

  pdf.addImage(img, "PNG", 0, y, pdfW, imgH);
  remaining -= pdfH;

  while (remaining > 0) {
    y = remaining - imgH; // shift up to reveal next slice
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, y, pdfW, imgH);
    remaining -= pdfH;
  }

  pdf.save("UX_Research_Report.pdf");
};
