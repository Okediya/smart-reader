"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, Copy, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import type { ChatMessage as ChatMessageType } from "@/store/use-document-store";

interface ChatMessageProps {
    message: ChatMessageType;
    onRegenerate?: () => void;
    isStreaming?: boolean;
}

export function ChatMessage({ message, onRegenerate, isStreaming }: ChatMessageProps) {
    const isUser = message.role === "user";

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        toast.success("Copied to clipboard");
    };

    return (
        <div
            className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}
        >
            {/* Avatar */}
            <div
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isUser
                        ? "bg-[#ef4444]/10 border border-[#ef4444]/20"
                        : "bg-[#1a1a1a] border border-[#222]"
                    }`}
            >
                {isUser ? (
                    <User className="w-4 h-4 text-[#ef4444]" />
                ) : (
                    <BookOpen className="w-4 h-4 text-[#ef4444]" />
                )}
            </div>

            {/* Message content */}
            <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser
                        ? "bg-[#ef4444] text-white rounded-tr-md"
                        : "bg-[#111] border border-[#222] text-[#f1f1f1] rounded-tl-md"
                    }`}
            >
                {isUser ? (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                ) : (
                    <div className="prose-chat text-[#f1f1f1]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>
                    </div>
                )}

                {/* Action buttons for AI messages */}
                {!isUser && !isStreaming && message.content && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#222]">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#f1f1f1] transition-colors px-2 py-1 rounded hover:bg-[#1a1a1a]"
                        >
                            <Copy className="w-3 h-3" />
                            Copy
                        </button>
                        {onRegenerate && (
                            <button
                                onClick={onRegenerate}
                                className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#f1f1f1] transition-colors px-2 py-1 rounded hover:bg-[#1a1a1a]"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Regenerate
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
