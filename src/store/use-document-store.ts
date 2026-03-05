import { create } from "zustand";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface DocumentState {
    // File state
    file: File | null;
    fileUrl: string | null;
    fileName: string | null;
    fileType: string | null;

    // Processing state
    extractedText: string | null;
    extractedHtml: string | null;
    isProcessing: boolean;
    processingProgress: number;

    // Chat state
    messages: ChatMessage[];
    isStreaming: boolean;

    // Actions
    setFile: (file: File) => void;
    removeFile: () => void;
    setExtractedText: (text: string) => void;
    setExtractedHtml: (html: string | null) => void;
    setIsProcessing: (processing: boolean) => void;
    setProcessingProgress: (progress: number) => void;
    addMessage: (message: ChatMessage) => void;
    updateLastAssistantMessage: (content: string) => void;
    removeLastAssistantMessage: () => void;
    setIsStreaming: (streaming: boolean) => void;
    clearMessages: () => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
    file: null,
    fileUrl: null,
    fileName: null,
    fileType: null,
    extractedText: null,
    extractedHtml: null,
    isProcessing: false,
    processingProgress: 0,
    messages: [],
    isStreaming: false,

    setFile: (file: File) => {
        // Revoke previous URL if exists
        const prevUrl = get().fileUrl;
        if (prevUrl) URL.revokeObjectURL(prevUrl);

        const fileUrl = URL.createObjectURL(file);
        set({
            file,
            fileUrl,
            fileName: file.name,
            fileType: file.type || file.name.split(".").pop() || null,
        });
    },

    removeFile: () => {
        const prevUrl = get().fileUrl;
        if (prevUrl) URL.revokeObjectURL(prevUrl);

        set({
            file: null,
            fileUrl: null,
            fileName: null,
            fileType: null,
            extractedText: null,
            extractedHtml: null,
            isProcessing: false,
            processingProgress: 0,
            messages: [],
            isStreaming: false,
        });
    },

    setExtractedText: (text: string) => set({ extractedText: text }),
    setExtractedHtml: (html: string | null) => set({ extractedHtml: html }),
    setIsProcessing: (processing: boolean) => set({ isProcessing: processing }),
    setProcessingProgress: (progress: number) =>
        set({ processingProgress: progress }),

    addMessage: (message: ChatMessage) =>
        set((state) => ({ messages: [...state.messages, message] })),

    updateLastAssistantMessage: (content: string) =>
        set((state) => {
            const msgs = [...state.messages];
            const lastIdx = msgs.length - 1;
            if (lastIdx >= 0 && msgs[lastIdx].role === "assistant") {
                msgs[lastIdx] = { ...msgs[lastIdx], content };
            }
            return { messages: msgs };
        }),

    removeLastAssistantMessage: () =>
        set((state) => {
            const msgs = [...state.messages];
            if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
                msgs.pop();
            }
            return { messages: msgs };
        }),

    setIsStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
    clearMessages: () => set({ messages: [] }),
}));
