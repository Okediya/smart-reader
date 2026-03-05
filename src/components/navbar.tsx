"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Settings, FileText } from "lucide-react";
import { useDocumentStore } from "@/store/use-document-store";
import { toast } from "sonner";

const ACCEPTED_TYPES: Record<string, string[]> = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "text/csv": [".csv"],
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
};

export function Navbar() {
    const { fileName, removeFile, isProcessing, setFile, setIsProcessing, setProcessingProgress, setExtractedText, setExtractedHtml } =
        useDocumentStore();

    const processFile = useCallback(
        async (file: File) => {
            setFile(file);
            setIsProcessing(true);
            setProcessingProgress(0);

            try {
                const formData = new FormData();
                formData.append("file", file);

                setProcessingProgress(20);

                // Upload file to be served at a stable URL (for native viewing)
                const fileForm = new FormData();
                fileForm.append("file", file);
                fetch("/api/file", { method: "POST", body: fileForm }).catch(() => { });

                setProcessingProgress(30);

                const response = await fetch("/api/extract", {
                    method: "POST",
                    body: formData,
                });

                setProcessingProgress(70);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to extract text");
                }

                const data = await response.json();
                setExtractedText(data.text);
                setExtractedHtml(data.html || null);
                setProcessingProgress(100);
                toast.success("Document loaded successfully");
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "Failed to process document"
                );
                removeFile();
            } finally {
                setIsProcessing(false);
            }
        },
        [setFile, setIsProcessing, setProcessingProgress, setExtractedText, setExtractedHtml, removeFile]
    );

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                processFile(acceptedFiles[0]);
            }
        },
        [processFile]
    );

    const { getRootProps, getInputProps, open } = useDropzone({
        onDrop,
        accept: ACCEPTED_TYPES,
        maxFiles: 1,
        noClick: true,
        noKeyboard: true,
    });

    return (
        <>
            <nav
                {...getRootProps()}
                className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0a0a0a] border-b border-[#222] flex items-center justify-between px-4 md:px-6"
            >
                <input {...getInputProps()} />

                {/* Logo */}
                <div className="flex items-center gap-2 shrink-0">
                    <FileText className="w-6 h-6 text-[#ef4444]" />
                    <span className="text-lg font-bold">
                        <span className="text-[#ef4444]">Smart</span>
                        <span className="text-[#f1f1f1]"> Reader</span>
                    </span>
                </div>

                {/* Current file */}
                <div className="flex items-center gap-3 mx-4 flex-1 min-w-0 justify-center">
                    {fileName && (
                        <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg px-3 py-1.5 max-w-[300px]">
                            <FileText className="w-4 h-4 text-[#ef4444] shrink-0" />
                            <span className="text-sm text-[#f1f1f1] truncate">{fileName}</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile();
                                    toast.success("Document removed");
                                }}
                                className="text-[#888] hover:text-[#ef4444] transition-colors shrink-0"
                                title="Remove document"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            open();
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-[#ef4444] hover:bg-[#dc2626] text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Upload Document</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
