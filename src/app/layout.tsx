import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Reader - AI-Powered Document Reader & Chat",
  description:
    "Upload PDF, DOCX, PPTX and more, then chat with your documents using Llama 3.3 AI. Beautiful dark interface with instant text extraction and intelligent answers.",
  keywords: [
    "document reader",
    "AI chat",
    "PDF reader",
    "Llama 3.3",
    "Groq",
    "document analysis",
    "smart reader",
  ],
  openGraph: {
    title: "Smart Reader - AI-Powered Document Reader & Chat",
    description:
      "Upload documents and chat with them using Llama 3.3 AI. Supports PDF, DOCX, PPTX, TXT.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0a0a0a] text-[#f1f1f1]">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#111111",
              border: "1px solid #222222",
              color: "#f1f1f1",
            },
          }}
          theme="dark"
        />
      </body>
    </html>
  );
}
