"use client";

import { Navbar } from "@/components/navbar";
import { EmptyState } from "@/components/empty-state";
import { DocumentViewer } from "@/components/document-viewer";
import { ChatPanel } from "@/components/chat-panel";
import { useDocumentStore } from "@/store/use-document-store";
import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function Home() {
  const { fileUrl, messages } = useDocumentStore();
  const hasDocument = !!fileUrl;
  const [chatExpanded, setChatExpanded] = useState(false);

  // Auto-expand when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setChatExpanded(true);
    }
  }, [messages.length]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />

      <main className="flex-1 pt-16 overflow-hidden flex flex-col">
        {!hasDocument ? (
          <EmptyState />
        ) : (
          <>
            {/* Document Viewer — takes remaining space */}
            <div
              className="min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
              style={{ flex: chatExpanded ? "1 1 55%" : "1 1 100%" }}
            >
              <DocumentViewer />
            </div>

            {/* Chat toggle bar */}
            <button
              onClick={() => setChatExpanded(!chatExpanded)}
              className="shrink-0 flex items-center justify-center gap-2 h-8 bg-[#111] border-y border-[#222] hover:bg-[#1a1a1a] transition-colors cursor-pointer group"
            >
              {chatExpanded ? (
                <ChevronDown className="w-4 h-4 text-[#666] group-hover:text-[#ef4444] transition-colors" />
              ) : (
                <ChevronUp className="w-4 h-4 text-[#666] group-hover:text-[#ef4444] transition-colors" />
              )}
              <span className="text-xs text-[#666] group-hover:text-[#aaa] transition-colors">
                {chatExpanded ? "Collapse chat" : "Expand chat"}
              </span>
            </button>

            {/* Chat Panel — collapsible */}
            <div
              className="min-h-0 overflow-hidden transition-all duration-300 ease-in-out"
              style={{ flex: chatExpanded ? "1 1 45%" : "0 0 0px" }}
            >
              <ChatPanel />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
