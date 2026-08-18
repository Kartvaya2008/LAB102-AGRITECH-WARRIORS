import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Download,
  Loader2,
} from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export default function PDFViewer({
  file,
  activePage = 1,
  onPageChange,
  title = "PDF Document",
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(activePage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sync internal page state with activePage prop changes
  useEffect(() => {
    if (activePage && activePage >= 1 && (!totalPages || activePage <= totalPages)) {
      setCurrentPage(activePage);
    }
  }, [activePage, totalPages]);

  // Load PDF Document
  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setTotalPages(0);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError("");

    const loadDocument = async () => {
      try {
        let pdfData;
        if (file instanceof File || file instanceof Blob) {
          pdfData = await file.arrayBuffer();
        } else if (typeof file === "string") {
          pdfData = file;
        } else if (file instanceof ArrayBuffer) {
          pdfData = file;
        } else {
          throw new Error("Invalid PDF file format");
        }

        const loadingTask = pdfjsLib.getDocument({
          data: pdfData instanceof ArrayBuffer ? new Uint8Array(pdfData) : undefined,
          url: typeof pdfData === "string" ? pdfData : undefined,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(activePage || 1);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading PDF via PDF.js:", err);
          setError("Failed to load PDF document. " + (err?.message || ""));
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Render current page onto Canvas
  const renderPage = useCallback(
    async (pageNum) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        // Cancel ongoing render task if any
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // High-DPI screen support for crisp text
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Error rendering PDF page:", err);
        }
      }
    },
    [pdfDoc, scale]
  );

  useEffect(() => {
    if (pdfDoc && currentPage >= 1 && currentPage <= totalPages) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, renderPage, totalPages]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      if (onPageChange) {
        onPageChange(newPage);
      }
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleFitWidth = () => {
    if (containerRef.current && pdfDoc) {
      pdfDoc.getPage(currentPage).then((page) => {
        const defaultViewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        if (containerWidth > 0 && defaultViewport.width > 0) {
          const fittedScale = containerWidth / defaultViewport.width;
          setScale(Math.max(0.6, Math.min(fittedScale, 2.5)));
        }
      });
    }
  };

  const handleDownload = () => {
    if (file instanceof File || file instanceof Blob) {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = (file instanceof File ? file.name : "document.pdf") || "document.pdf";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col h-[800px] overflow-hidden"
    >
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        {/* Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="text-purple-400 shrink-0" size={20} />
          <h3 className="font-bold text-sm md:text-base text-slate-200 truncate max-w-[200px] md:max-w-sm">
            {title}
          </h3>
        </div>

        {/* Middle: Page Controls */}
        <div className="flex items-center gap-1.5 bg-slate-850 px-2 py-1 rounded-2xl border border-slate-750">
          <button
            disabled={currentPage <= 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-1.5 rounded-xl hover:bg-slate-750 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Previous Page"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-300">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  handlePageChange(val);
                }
              }}
              className="w-10 bg-slate-800 text-center rounded-lg py-0.5 px-1 text-purple-400 font-bold border border-slate-700 outline-none"
            />
            <span className="text-slate-500">/ {totalPages || "?"}</span>
          </div>

          <button
            disabled={currentPage >= totalPages || loading}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-1.5 rounded-xl hover:bg-slate-750 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Next Page"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right: Zoom & Utilities */}
        <div className="flex items-center gap-1 bg-slate-850 px-2 py-1 rounded-2xl border border-slate-750">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl hover:bg-slate-750 text-slate-300 hover:text-white transition-all"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>

          <span className="text-xs font-semibold text-slate-400 px-1 min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl hover:bg-slate-750 text-slate-300 hover:text-white transition-all"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={handleFitWidth}
            className="p-1.5 rounded-xl hover:bg-slate-750 text-slate-300 hover:text-white transition-all"
            title="Fit Width"
          >
            <Maximize2 size={16} />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-xl hover:bg-slate-750 text-purple-400 hover:text-purple-300 transition-all"
            title="Download PDF"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Canvas PDF Display Area */}
      <div className="flex-grow overflow-auto p-4 flex items-center justify-center bg-slate-950/80 rounded-2xl mt-3 border border-slate-850">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400 py-20">
            <Loader2 className="animate-spin text-purple-400" size={36} />
            <p className="text-sm font-medium">Rendering PDF pages...</p>
          </div>
        ) : error ? (
          <div className="text-center p-6 text-red-400 bg-red-500/10 border border-red-500/30 rounded-2xl max-w-md">
            <p className="font-semibold text-sm">{error}</p>
          </div>
        ) : (
          <div className="inline-block shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-white">
            <canvas ref={canvasRef} className="block max-w-none" />
          </div>
        )}
      </div>
    </div>
  );
}
