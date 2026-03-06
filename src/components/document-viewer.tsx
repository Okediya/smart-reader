"use client";

import { useState, useEffect, useRef } from "react";
import { useDocumentStore } from "@/store/use-document-store";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("./pdf-viewer"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] text-[#888]">
            Loading PDF Viewer...
        </div>
    ),
});

/**
 * Document Viewer component.
 * Renders PDF natively via embed, images directly, and text files as preformatted text.
 * For DOCX/PPTX, uses @cyntler/react-doc-viewer for proper rendering.
 */
export function DocumentViewer() {
    const { file, fileUrl, fileName, fileType, isProcessing, processingProgress, extractedHtml, extractedText } =
        useDocumentStore();

    if (!fileUrl) return null;

    const extension = fileName?.split(".").pop()?.toLowerCase() || "";

    return (
        <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden">
            {/* Processing overlay */}
            {isProcessing && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm">
                    <div className="w-64 space-y-4 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-[#ef4444]/10 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm text-[#f1f1f1] font-medium">Processing document...</p>
                        <div className="w-full bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-[#ef4444] rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${processingProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-[#888]">Extracting text for AI analysis</p>
                    </div>
                </div>
            )}

            {/* PDF: react-pdf for mobile-friendly inline rendering */}
            {(extension === "pdf" || fileType === "application/pdf") && (
                <PdfViewer fileUrl={fileUrl} />
            )}

            {/* Images */}
            {["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension) && (
                <div className="w-full h-full flex items-center justify-center p-8 overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={fileUrl}
                        alt={fileName || "Image"}
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                </div>
            )}

            {/* Text files: TXT, MD, CSV */}
            {["txt", "md", "csv"].includes(extension) && (
                <TextFileViewer fileUrl={fileUrl} />
            )}

            {/* DOCX: native layout rendering with docx-preview */}
            {extension === "docx" && file && (
                <DocxViewer file={file} />
            )}

            {/* PPTX: native file viewer via Office Online + download */}
            {extension === "pptx" && (
                <OfficeFileViewer fileUrl={fileUrl} fileName={fileName || "presentation.pptx"} />
            )}
        </div>
    );
}

/** Renders plain text files by fetching the blob URL content */
function TextFileViewer({ fileUrl }: { fileUrl: string }) {
    const [content, setContent] = useState<string>("Loading...");

    useEffect(() => {
        fetch(fileUrl)
            .then((res) => res.text())
            .then(setContent)
            .catch(() => setContent("Failed to load file content."));
    }, [fileUrl]);

    return (
        <div className="w-full h-full overflow-auto p-6 md:p-10">
            <pre className="text-sm text-[#ddd] whitespace-pre-wrap font-mono leading-relaxed">
                {content}
            </pre>
        </div>
    );
}

/** Renders DOCX natively in the browser without server dependencies */
function DocxViewer({ file }: { file: File }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!file || !containerRef.current) return;

        let isMounted = true;

        import("docx-preview").then(({ renderAsync }) => {
            if (!isMounted || !containerRef.current) return;

            renderAsync(file, containerRef.current, undefined, {
                className: "docx",
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
                ignoreFonts: false,
                breakPages: true,
                ignoreLastRenderedPageBreak: true,
                experimental: false,
                trimXmlDeclaration: true,
                debug: false,
            }).catch(err => console.error("Error rendering docx:", err));
        });

        return () => {
            isMounted = false;
        };
    }, [file]);

    return (
        <div className="w-full h-full overflow-auto bg-[#f1f1f1] text-black">
            <div ref={containerRef} className="docx-wrapper min-h-full" />
        </div>
    );
}

/** Renders Office files (PPTX, etc.) using MS Office Online viewer when deployed, with download fallback */
function OfficeFileViewer({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [isLocal, setIsLocal] = useState(true);

    useEffect(() => {
        const host = window.location.hostname;
        const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
        setIsLocal(isLocalhost);

        if (!isLocalhost) {
            // When deployed, construct the public file URL and use Office Online viewer
            const publicFileUrl = `${window.location.origin}/api/file`;
            const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicFileUrl)}`;
            setViewerUrl(officeViewerUrl);
        }
    }, []);

    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = fileName;
        a.click();
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0a0a0a]">
            {/* If deployed: show Office Online iframe */}
            {!isLocal && viewerUrl && (
                <iframe
                    src={viewerUrl}
                    className="w-full flex-1 border-0"
                    title={fileName}
                    allowFullScreen
                />
            )}

            {/* If local: show download prompt */}
            {isLocal && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                    <div className="w-20 h-20 rounded-2xl bg-[#ef4444]/10 flex items-center justify-center">
                        <svg className="w-10 h-10 text-[#ef4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold text-[#f1f1f1]">{fileName}</h3>
                        <p className="text-sm text-[#888] max-w-md">
                            Download this file and open it in WPS Office, PowerPoint, or your preferred application to view it with full formatting.
                        </p>
                        <p className="text-xs text-[#666]">
                            When this app is deployed online, files will be viewable directly in the browser via Microsoft Office Online.
                        </p>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium px-6 py-3 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download & Open in WPS
                    </button>
                </div>
            )}
        </div>
    );
}

