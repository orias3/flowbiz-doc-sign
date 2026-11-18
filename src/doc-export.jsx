// PDF export without opening a document.
//
// pagesToPdf() is the exact capture + content-aware pagination the editor's
// download button has always used (moved here unchanged so both paths share
// it). StaticDocPages renders a document the way the editor shows it when
// downloading (template content + filled fields, no edit chrome), off-screen,
// so the library can export one or many documents directly.

import { zipSync } from 'fflate';
import { flushSync } from 'react-dom';

const PW = 794, PH = 1123;

// pageEls: elements carrying data-page-idx (the `.page` nodes).
export async function pagesToPdf(pageEls) {
  if (typeof window.html2canvas !== "function") throw new Error("html2canvas_missing");
  const jsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  const pdf = new jsPDFCtor({ unit: "px", format: [PW, PH], hotfixes: ["px_scaling"] });

  const els = Array.from(pageEls);
  els.sort((a, b) => Number(a.dataset.pageIdx || 0) - Number(b.dataset.pageIdx || 0));

  let firstPageAdded = false;
  const SCALE = 2;                       // canvas oversampling
  const CANVAS_PAGE_HEIGHT = PH * SCALE; // how tall one A4 page is in canvas pixels

  for (let pi = 0; pi < els.length; pi++) {
    const original = els[pi];
    // Clone off-screen at natural A4 size — avoids messing with the visible
    // editor (no flicker, no layout shift) and forces 1:1 capture.
    const clone = original.cloneNode(true);
    clone.style.transform = "none";
    clone.style.zoom = "1";
    clone.style.position = "absolute";
    clone.style.top = "0";
    clone.style.left = "0";
    clone.style.width = `${PW}px`;
    clone.style.minHeight = `${PH}px`;
    clone.style.height = "auto";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    // Remove edit-only affordances from the clone before capturing.
    clone.querySelectorAll(".field-tools, .field-resize, .field-tag").forEach((el) => el.remove());
    clone.querySelectorAll(".field.placeholder:not(.filled)").forEach((el) => {
      el.style.border = "none";
      el.style.background = "transparent";
    });
    clone.querySelectorAll(".field-label").forEach((el) => { el.style.display = "none"; });

    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.top = "-99999px";
    wrap.style.left = "0";
    wrap.style.zIndex = "-1";
    wrap.style.background = "#fff";
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    try {
      const totalH = Math.max(PH, clone.scrollHeight);

      // ── Content-aware pagination ──
      // Collect "atomic" blocks that must not be split across a page break,
      // measured in DOM px relative to the clone's top. We then pick page
      // cut points that fall in the gaps between these blocks, so a page
      // break never slices through the middle of a milestone/card/row.
      const cloneTop = clone.getBoundingClientRect().top;
      const AVOID_SEL = [
        ".qblk-milestone", ".qblk-callout", ".qblk-labeled", ".qblk-heading",
        ".quote-info-box", ".quote-price-box", ".quote-refund", ".quote-signoff",
        // Whole framed boxes first — when a container (like the accounting
        // table) fits on a page, the break must move above ALL of it, not
        // just between its rows: a box split across pages loses its border
        // and reads as a rendering glitch. Rows stay listed as a fallback
        // for boxes taller than a page.
        ".quote-acct", ".quote-contact", ".quote-features", ".quote-cards",
        ".quote-acct-row", ".quote-card", ".quote-checkmarks",
        ".sc-section", ".sc-qa", ".sc-rating-row", ".sc-offers", ".sc-check",
        ".bt-summary-row", ".bt-signatory", ".bt-decision",
        "tr", "h1", "h2", "li",
      ].join(",");
      // Headings must not be orphaned at the bottom of a page: extend their
      // protected range downward so the cut can't fall right after them and
      // strand a title away from its content.
      const HEADING_SEL = "h1,h2,.quote-h2,.qblk-heading,.qblk-subheading";
      const avoid = [];
      clone.querySelectorAll(AVOID_SEL).forEach((el) => {
        const r = el.getBoundingClientRect();
        const top = r.top - cloneTop;
        const isHeading = el.matches(HEADING_SEL);
        const bottom = r.bottom - cloneTop + (isHeading ? 110 : 0);
        const h = bottom - top;
        // Only keep blocks that could fit within a single page; a block
        // taller than a page must be split (nothing we can do), and its
        // smaller children (li / rows) still guide the break.
        if (h > 0 && h <= PH - 24) avoid.push({ top, bottom });
      });

      // Build page ranges [startPx, endPx) that respect the atomic blocks.
      const ranges = [];
      const MIN_ADVANCE = 60; // never emit a page shorter than this
      let y = 0;
      let guard = 0;
      while (y < totalH - 1 && guard++ < 100) {
        let cut = y + PH;
        if (cut >= totalH) {
          cut = totalH;
        } else {
          // Pull the cut up above any block that straddles the ideal break.
          let best = cut;
          for (const b of avoid) {
            if (b.top < cut - 0.5 && b.bottom > cut + 0.5 && b.top < best) {
              best = b.top;
            }
          }
          if (best > y + MIN_ADVANCE) cut = best; // else hard split (unavoidable)
        }
        if (cut <= y + MIN_ADVANCE) cut = Math.min(y + PH, totalH); // guarantee progress
        ranges.push([y, cut]);
        y = cut;
      }
      if (ranges.length === 0) ranges.push([0, totalH]);

      const canvas = await window.html2canvas(clone, {
        scale: SCALE,
        backgroundColor: "#fff",
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: PW,
        height: totalH,
        windowWidth: PW,
        windowHeight: totalH,
      });

      // Each range becomes one A4 page: draw its slice at the top of a
      // full-height A4 canvas (1:1), leaving white space below if the
      // page ended early to keep a block whole.
      for (const [startPx, endPx] of ranges) {
        const srcY = Math.round(startPx * SCALE);
        const srcH = Math.min(Math.round((endPx - startPx) * SCALE), canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = CANVAS_PAGE_HEIGHT;
        const sctx = sliceCanvas.getContext("2d");
        sctx.fillStyle = "#fff";
        sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        if (srcH > 0) {
          sctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        }
        const dataUrl = sliceCanvas.toDataURL("image/jpeg", 0.92);
        if (firstPageAdded) pdf.addPage([PW, PH]);
        pdf.addImage(dataUrl, "JPEG", 0, 0, PW, PH);
        firstPageAdded = true;
      }
    } finally {
      document.body.removeChild(wrap);
    }
  }
  return pdf;
}

// A filled field as the editor renders it (same classes, so same CSS).
// Empty fields are invisible in a download anyway, so they are skipped.
function StaticField({ field }) {
  if (!field || !field.value) return null;
  const isSystem = field.assignee === "system";
  const stampSrc = field.type === "stamp" && typeof field.value === "string" && field.value.startsWith("data:")
    ? field.value
    : "assets/stamp.png";
  return (
    <div className={"field filled placeholder " + (field.assignee === "them" ? "counterparty " : "") + (isSystem ? "system " : "")}
      style={{ left: field.x, top: field.y, width: field.w, height: field.h }}>
      {field.type === "signature" && <div className="field-signature"><img src={field.value} alt="signature" /></div>}
      {field.type === "stamp" && <div className="field-stamp"><img src={stampSrc} alt="stamp" /></div>}
      {field.type === "date" && <div className="field-text field-date">{field.value}</div>}
      {field.type === "text" && <div className={"field-text " + (isSystem ? "field-system" : "")}>{field.value}</div>}
    </div>
  );
}

export function StaticDocPages({ doc }) {
  const template = window.DOC_TEMPLATES[doc.template];
  const uploadedPages = doc.uploadedPages;
  const pages = uploadedPages ? uploadedPages.length : (template ? template.pages : 1);
  return (
    <>
      {Array.from({ length: pages }).map((_, pi) => (
        <div key={pi} className="page" data-page-idx={pi}>
          {uploadedPages
            ? <img src={uploadedPages[pi]} className="page-uploaded" alt="" />
            : (template ? template.render(pi, doc) : <div className="page-content"><p>{doc.uploadedFileName || doc.name}</p></div>)}
          <div className="page-watermark">עמוד {pi + 1} מתוך {pages} · נחתם דרך FlowBiz Sign</div>
          {(doc.fields || []).filter((f) => f && f.page === pi).map((f) => <StaticField key={f.id} field={f} />)}
        </div>
      ))}
    </>
  );
}

async function waitForAssets(root) {
  try { await document.fonts.ready; } catch {}
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((im) => (im.complete ? null : new Promise((r) => { im.onload = im.onerror = r; }))));
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}

// Render a document off-screen and return its jsPDF.
export async function renderDocToPdf(doc) {
  const host = document.createElement("div");
  // Off-screen but laid out at full A4 width (the PDF clones each page).
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:794px;pointer-events:none;";
  document.body.appendChild(host);
  const root = window.ReactDOM.createRoot(host);
  try {
    flushSync(() => root.render(<StaticDocPages doc={doc} />));
    await new Promise((r) => setTimeout(r, 0));
    await waitForAssets(host);
    return await pagesToPdf(host.querySelectorAll("[data-page-idx]"));
  } finally {
    root.unmount();
    host.remove();
  }
}

export function safeFileName(name) {
  const clean = String(name || "מסמך").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").replace(/\s+/g, " ").trim();
  return (clean || "מסמך").slice(0, 120);
}

// File name for an export: transfers and quotes lead with their number, so
// several documents for the same recipient sort and read clearly.
export function exportName(d) {
  const num = d && d.template === "bank_transfer" ? d.bankTransferData && d.bankTransferData.resolutionNumber
    : d && d.template === "flowbiz_quote" ? d.quoteData && d.quoteData.quoteNumber : "";
  const name = (d && d.name) || "מסמך";
  return num ? `${num} · ${name}` : name;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// One doc -> its PDF; several -> one ZIP of PDFs. onProgress(done, total).
// Returns { ok, failed: [names] }.
export async function downloadDocs(docs, onProgress) {
  const list = (docs || []).filter(Boolean);
  if (!list.length) return { ok: 0, failed: [] };
  if (list.length === 1) {
    const pdf = await renderDocToPdf(list[0]);
    pdf.save(safeFileName(exportName(list[0])) + ".pdf");
    onProgress && onProgress(1, 1);
    return { ok: 1, failed: [] };
  }
  const files = {};
  const used = new Set();
  const failed = [];
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    try {
      const pdf = await renderDocToPdf(d);
      let base = safeFileName(exportName(d));
      let fname = base + ".pdf", n = 2;
      while (used.has(fname)) fname = `${base} (${n++}).pdf`;
      used.add(fname);
      files[fname] = new Uint8Array(pdf.output("arraybuffer"));
    } catch (e) {
      console.error("export failed", d && d.id, e);
      failed.push(d.name || d.id);
    }
    onProgress && onProgress(i + 1, list.length);
  }
  const count = Object.keys(files).length;
  if (count) {
    const zip = zipSync(files, { level: 0 }); // PDFs are already compressed
    const t = new Date();
    const p = (x) => String(x).padStart(2, "0");
    saveBlob(new Blob([zip], { type: "application/zip" }), `FlowBiz-מסמכים-${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}.zip`);
  }
  return { ok: count, failed };
}

Object.assign(window, { pagesToPdf, renderDocToPdf, downloadDocs, StaticDocPages });
