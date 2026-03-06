"use client";

import { Navbar } from "@/components/navbar";
import { EmptyState } from "@/components/empty-state";
import { DocumentViewer } from "@/components/document-viewer";
import { ChatPanel } from "@/components/chat-panel";
import { useDocumentStore } from "@/store/use-document-store";
import { useState, useEffect } from "react";
import { ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";

type ChatState = "collapsed" | "half" | "full";

export default function Home() {
  const { fileUrl, messages } = useDocumentStore();
  const hasDocument = !!fileUrl;
  const [chatState, setChatState] = useState<ChatState>("collapsed");

  // Auto-expand to half when new messages arrive if it's currently collapsed
  useEffect(() => {
    if (messages.length > 0 && chatState === "collapsed") {
      setChatState("half");
    }
  }, [messages.length]);

  // Calculate height based on state
  const getChatHeight = () => {
    switch (chatState) {
      case "full": return "100%";
      case "half": return "50%";
      case "collapsed": return "0px";
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] flex flex-col bg-[#0a0a0a] overflow-hidden">
      <Navbar />

      <main className="flex-1 relative w-full h-[calc(100dvh-4rem)] flex flex-col mt-16">
        {!hasDocument ? (
          <EmptyState />
        ) : (
          <>
            {/* Document Viewer — Always active in background */}
            <div
              className="absolute inset-0 transition-all duration-300 ease-in-out"
              style={{ bottom: chatState === "half" ? "50%" : "32px" }}
            >
              <DocumentViewer />
            </div>

            {/* Draggable/Toggle Bar anchored to the top of the chat area */}
            <div
              className="absolute left-0 right-0 z-20 flex items-center justify-between px-4 h-8 bg-[#111] border-y border-[#222] transition-all duration-300 ease-in-out"
              style={{
                bottom: chatState === "full" ? "calc(100% - 32px)" : getChatHeight()
              }}
            >
              <span className="text-xs font-medium text-[#888]">
                {chatState === "collapsed" ? "Chat Collapsed" : "Chat with Buddy"}
              </span>

              <div className="flex items-center gap-1">
                {/* Fullscreen Toggle */}
                {chatState !== "collapsed" && (
                  <button
                    onClick={() => setChatState(chatState === "full" ? "half" : "full")}
                    className="p-1.5 hover:bg-[#222] rounded-md transition-colors text-[#666] hover:text-[#f1f1f1]"
                    title={chatState === "full" ? "Exit Fullscreen" : "Fullscreen Chat"}
                  >
                    {chatState === "full" ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Collapse/Expand Toggle */}
                <button
                  onClick={() => setChatState(chatState === "collapsed" ? "half" : "collapsed")}
                  className="p-1.5 hover:bg-[#222] rounded-md transition-colors text-[#666] hover:text-[#f1f1f1]"
                  title={chatState === "collapsed" ? "Open Chat" : "Collapse Chat"}
                >
                  {chatState === "collapsed" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Chat Panel Container */}
            <div
              className="absolute bottom-0 left-0 right-0 z-10 transition-all duration-300 ease-in-out bg-[#0a0a0a]"
              style={{
                height: chatState === "full" ? "calc(100% - 32px)" : getChatHeight()
              }}
            >
              <ChatPanel />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
