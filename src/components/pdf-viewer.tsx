"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/** Robust inline PDF viewer for cross-platform support (especially mobile) */
export default function PdfViewer({ fileUrl }: { fileUrl: string }) {
    const [numPages, setNumPages] = useState<number>();
    const [width, setWidth] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                setWidth(entries[0].contentRect.width);
            }
        });
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }

    return (
        <div ref={containerRef} className="w-full h-full overflow-auto bg-[#1a1a1a] flex flex-col items-center py-4">
            <Document
                file={fileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={<div className="text-[#888] py-10">Loading PDF...</div>}
                error={<div className="text-[#ef4444] py-10">Failed to load PDF.</div>}
            >
                {Array.from(new Array(numPages || 0), (_, index) => (
                    <div key={`page_${index + 1}`} className="mb-4 shadow-xl">
                        <Page
                            pageNumber={index + 1}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            width={width ? Math.min(width - 32, 1000) : undefined}
                            className="bg-white"
                        />
                    </div>
                ))}
            </Document>
        </div>
    );
}
