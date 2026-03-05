# Smart Reader

AI-powered document reader and chat interface. Upload PDF, DOCX, PPTX, TXT and more, then chat with your documents using Llama 3.3 via Groq.

## Features

- **Multi-format support** -- PDF, DOCX, PPTX, TXT, MD, CSV, and images
- **AI-powered chat** -- Ask questions about your documents using Llama 3.3 70B (via Groq)
- **Streaming responses** -- Real-time AI responses with markdown rendering
- **Beautiful dark UI** -- Premium black/red/white theme, smooth animations
- **Drag and drop** -- Upload files by dragging anywhere on the page
- **Resizable panels** -- Drag the chat panel to any size between 20% and 80%
- **Copy and regenerate** -- Copy AI responses or regenerate them with one click
- **Privacy first** -- API key stored in your browser only, never sent to our servers
- **Responsive** -- Works on desktop and mobile

## Screenshots

_Add screenshots here_

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI | Groq (Llama 3.3 70B) via @ai-sdk/groq |
| State | Zustand |
| UI | shadcn/ui + Lucide Icons |
| File Parsing | pdf-parse, mammoth, JSZip |
| Animations | Framer Motion |

## Getting Started

### Prerequisites

- Node.js 18+
- A free Groq API key

### Get a Groq API Key

1. Go to [console.groq.com](https://console.groq.com/)
2. Sign up or log in
3. Navigate to **API Keys** and create a new key
4. Copy the key (starts with `gsk_`)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/smart-reader.git
cd smart-reader

# Install dependencies
npm install

# Copy environment file (optional -- API key is entered via UI)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. Click **Upload Document** or drag a file onto the page
2. Wait for text extraction to complete
3. Click the **gear icon** and enter your Groq API key
4. Start chatting with your document in the bottom panel
5. Drag the resize handle to adjust the chat panel size

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/smart-reader)

Click the button above to deploy your own instance. No server-side API key needed -- users enter their own key in the browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | No | Optional server-side default key. Users provide their own via the Settings modal. |

## Project Structure

```
smart-reader/
  src/
    app/
      api/
        chat/route.ts       # AI chat streaming endpoint
        extract/route.ts    # Text extraction endpoint
      globals.css           # Theme and global styles
      layout.tsx            # Root layout with metadata
      page.tsx              # Main page with resizable panels
    components/
      chat-message.tsx      # Chat bubble with markdown + actions
      chat-panel.tsx        # Chat interface with input and streaming
      document-viewer.tsx   # Multi-format document renderer
      empty-state.tsx       # Upload hero when no document
      navbar.tsx            # Top navigation bar
      settings-modal.tsx    # API key settings dialog
    lib/
      utils.ts              # Utility functions (cn)
    store/
      use-document-store.ts # Zustand state management
```

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

Built with Next.js, Groq, and Llama 3.3.
