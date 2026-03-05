"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { useDocumentStore } from "@/store/use-document-store";
import { toast } from "sonner";

const ACCEPTED_TYPES: Record<string, string[]> = {
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
    "text/plain": [".txt"],
    "text/markdown": [".md"],
    "text/csv": [".csv"],
};

export function EmptyState() {
    const { setFile, setIsProcessing, setProcessingProgress, setExtractedText, removeFile } =
        useDocumentStore();

    const processFile = useCallback(
        async (file: File) => {
            // Intercept PPTX files directly
            if (file.name.toLowerCase().endsWith(".pptx") || file.name.toLowerCase().endsWith(".ppt")) {
                toast.error(
                    <div className="flex flex-col gap-1">
                        <span className="font-medium">Please convert your PPTX first.</span>
                        <span className="text-sm">PPTX files are currently processed best as PDFs. Please convert your presentation using a free tool like <a href="https://www.ilovepdf.com/powerpoint_to_pdf" target="_blank" rel="noopener noreferrer" className="underline text-[#ef4444] hover:text-[#dc2626]">iLovePDF here</a>, then upload the resulting PDF.</span>
                    </div>,
                    { duration: 8000 }
                );
                return;
            }

            setFile(file);
            setIsProcessing(true);
            setProcessingProgress(0);

            try {
                const formData = new FormData();
                formData.append("file", file);
                setProcessingProgress(30);

                const response = await fetch("/api/extract", {
                    method: "POST",
                    body: formData,
                });

                setProcessingProgress(70);

                if (!response.ok) {
                    let errorMessage = "Failed to extract text";
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorMessage;
                    } catch (e) {
                        // Handle case where Vercel returns HTML (e.g. 413 Payload Too Large or 504 Gateway Timeout)
                        if (response.status === 413) {
                            errorMessage = "File is too large for the Vercel server. Please upload a smaller file.";
                        } else if (response.status === 504) {
                            errorMessage = "The extraction timed out on the server. Please try a smaller file.";
                        } else {
                            errorMessage = `Server error ${response.status}: Failed to process document`;
                        }
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                setExtractedText(data.text);
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
        [setFile, setIsProcessing, setProcessingProgress, setExtractedText, removeFile]
    );

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                processFile(acceptedFiles[0]);
            }
        },
        [processFile]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_TYPES,
        maxFiles: 1,
    });

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-lg w-full text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 rounded-2xl bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-[#ef4444]" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-[#f1f1f1] mb-3">
                    <span className="text-[#ef4444]">Smart</span> Reader
                </h1>
                <p className="text-[#888] mb-8 text-base leading-relaxed">
                    Upload PDF, PPTX, DOCX and more, then chat instantly with Buddy.
                    <br />
                    Your documents, understood by AI.
                </p>

                {/* Upload Zone */}
                <div
                    {...getRootProps()}
                    className={`
            relative cursor-pointer border-2 border-dashed rounded-2xl p-10 transition-all duration-200
            ${isDragActive
                            ? "border-[#ef4444] bg-[#ef4444]/5 scale-[1.02]"
                            : "border-[#333] hover:border-[#ef4444]/50 hover:bg-[#111]"
                        }
          `}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center gap-4">
                        <div
                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${isDragActive ? "bg-[#ef4444]/20" : "bg-[#1a1a1a]"
                                }`}
                        >
                            <Upload
                                className={`w-7 h-7 transition-colors ${isDragActive ? "text-[#ef4444]" : "text-[#888]"
                                    }`}
                            />
                        </div>

                        <div>
                            <p className="text-[#f1f1f1] font-medium mb-1">
                                {isDragActive ? "Drop your file here" : "Drag and drop your document"}
                            </p>
                            <p className="text-sm text-[#666]">
                                or click to browse -- PDF, DOCX, PPTX, TXT supported
                            </p>
                        </div>
                    </div>
                </div>

                {/* Supported formats */}
                <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                    {["PDF", "DOCX", "PPTX", "TXT", "MD", "CSV"].map((fmt) => (
                        <span
                            key={fmt}
                            className="text-xs px-2.5 py-1 rounded-md bg-[#111] border border-[#222] text-[#888]"
                        >
                            {fmt}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
