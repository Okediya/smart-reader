"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageSquare, Lock } from "lucide-react";
import { useDocumentStore } from "@/store/use-document-store";
import { ChatMessage } from "./chat-message";
import { toast } from "sonner";

/**
 * Chat Panel component.
 * Manually reads Vercel AI SDK text streams ("0:" prefix format).
 */
export function ChatPanel() {
    const {
        messages,
        extractedText,
        isStreaming,
        addMessage,
        updateLastAssistantMessage,
        removeLastAssistantMessage,
        setIsStreaming,
    } = useDocumentStore();

    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const hasDocument = !!extractedText;

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input on mount
    useEffect(() => {
        if (hasDocument) {
            inputRef.current?.focus();
        }
    }, [hasDocument]);

    // Parse Vercel AI SDK StreamData chunks (e.g. `0:"Hello "\n0:"world"`)
    const parseAiSdkChunk = (chunkText: string): string => {
        let extracted = "";
        const lines = chunkText.split("\n");
        for (const line of lines) {
            if (line.startsWith('0:"')) {
                try {
                    // Extract the JSON string part and parse it: `0:"Hello"` -> `"Hello"` -> `Hello`
                    const jsonStr = line.substring(2);
                    const parsed = JSON.parse(jsonStr);
                    if (typeof parsed === "string") {
                        extracted += parsed;
                    }
                } catch (e) {
                    console.warn("Failed to parse chunk line:", line);
                }
            }
        }
        return extracted;
    };

    const sendMessage = useCallback(
        async (messageContent?: string) => {
            const content = messageContent || input.trim();
            if (!content) return;
            if (isStreaming) return;
            if (!extractedText) {
                toast.error("Document text not available yet. Please wait for processing to finish or re-upload the file.");
                return;
            }

            setInput("");

            const userMessage = { id: `user-${Date.now()}`, role: "user" as const, content };
            addMessage(userMessage);

            const assistantMessage = { id: `assistant-${Date.now()}`, role: "assistant" as const, content: "" };
            addMessage(assistantMessage);

            setIsStreaming(true);

            try {
                const chatHistory = [...messages, userMessage].map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: chatHistory, extractedText }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || "Failed to get AI response");
                }

                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let fullContent = "";

                if (reader) {
                    console.log("[Chat] Stream reader started");
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            console.log("[Chat] Stream reader done");
                            break;
                        }

                        console.log("[Chat] Raw chunk received, byte length:", value?.length);
                        const chunk = decoder.decode(value, { stream: true });
                        console.log("[Chat] Decoded chunk string:", chunk);

                        // The backend now sends raw text chunks, no need to parse 0:"..." json
                        fullContent += chunk;
                        updateLastAssistantMessage(fullContent);
                    }
                    console.log("[Chat] Final full content length:", fullContent.length);
                } else {
                    console.warn("[Chat] reader is undefined");
                }
            } catch (error) {
                console.error("[Chat] Error:", error);
                toast.error(error instanceof Error ? error.message : "Failed to get AI response");
                const lastMsg = messages[messages.length - 1];
                if (!lastMsg || lastMsg.content === "") {
                    removeLastAssistantMessage();
                }
            } finally {
                setIsStreaming(false);
            }
        },
        [input, isStreaming, extractedText, messages, addMessage, updateLastAssistantMessage, removeLastAssistantMessage, setIsStreaming]
    );

    const handleRegenerate = useCallback(
        async (messageIndex: number) => {
            if (isStreaming) return;
            const userMessages = messages.slice(0, messageIndex).filter((m) => m.role === "user");
            const lastUserMessage = userMessages[userMessages.length - 1];
            if (!lastUserMessage) return;

            removeLastAssistantMessage();
            await sendMessage(lastUserMessage.content);
        },
        [isStreaming, messages, removeLastAssistantMessage, sendMessage]
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {/* Chat header */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#222]">
                <MessageSquare className="w-4 h-4 text-[#ef4444]" />
                <span className="text-sm font-medium text-[#f1f1f1]">Chat with your document</span>
                {!hasDocument && (
                    <span className="text-xs text-[#888] ml-auto flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Upload a file first
                    </span>
                )}
            </div>

            {/* Messages area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                {messages.length === 0 && hasDocument && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#222] flex items-center justify-center mb-3">
                            <MessageSquare className="w-6 h-6 text-[#ef4444]" />
                        </div>
                        <p className="text-sm text-[#888] max-w-sm">
                            Ask anything about your document. Buddy has full context of the content
                            and will provide precise answers.
                        </p>
                    </div>
                )}

                {messages.map((message, index) => (
                    <ChatMessage
                        key={message.id}
                        message={message as any}
                        isStreaming={isStreaming && index === messages.length - 1 && message.role === "assistant"}
                        onRegenerate={
                            message.role === "assistant" && index === messages.length - 1
                                ? () => handleRegenerate(index)
                                : undefined
                        }
                    />
                ))}

                {/* Streaming indicator */}
                {isStreaming && messages[messages.length - 1]?.content === "" && (
                    <div className="flex items-center gap-2 px-4 py-2">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-[#ef4444] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 bg-[#ef4444] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 bg-[#ef4444] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-[#888]">Thinking...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="shrink-0 p-3 border-t border-[#222]">
                <div className="flex items-end gap-2 bg-[#111] border border-[#222] rounded-xl px-3 py-2 focus-within:border-[#ef4444] transition-colors">
                    <textarea
                        ref={inputRef}
                        name="prompt"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={hasDocument ? "Ask about your document..." : "Upload a document first"}
                        disabled={!hasDocument || isStreaming}
                        rows={1}
                        className="flex-1 bg-transparent text-sm text-[#f1f1f1] placeholder:text-[#555] resize-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-h-32"
                        style={{ height: "auto", minHeight: "24px" }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = Math.min(target.scrollHeight, 128) + "px";
                        }}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || !hasDocument || isStreaming}
                        className="shrink-0 p-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:bg-[#333] disabled:text-[#666] text-white rounded-lg transition-colors disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-[10px] text-[#555] mt-1.5 text-center">
                    Press Enter to send, Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
