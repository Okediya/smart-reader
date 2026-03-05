import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/extract
 * Receives a file upload and extracts text content based on file type.
 * Supports: PDF, DOCX, TXT, MD, CSV
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        const extension = fileName.split(".").pop() || "";
        const buffer = Buffer.from(await file.arrayBuffer());

        let text = "";
        let html: string | undefined = undefined;

        switch (extension) {
            case "pdf":
                text = await extractPdf(buffer);
                break;
            case "docx":
                const docxRes = await extractDocx(buffer);
                text = docxRes.text;
                html = docxRes.html;
                break;
            case "txt":
            case "md":
            case "csv":
                text = buffer.toString("utf-8");
                break;
            default:
                return NextResponse.json(
                    { error: `Unsupported file type: .${extension}` },
                    { status: 400 }
                );
        }

        // Trim to avoid excessive whitespace and limit length for context window
        text = text.trim();
        if (!text) {
            return NextResponse.json(
                { error: "Could not extract any text from this file" },
                { status: 400 }
            );
        }

        // Limit to ~100k characters to stay within context limits
        if (text.length > 100000) {
            text = text.slice(0, 100000) + "\n\n[Document truncated — showing first 100,000 characters]";
        }

        return NextResponse.json({ text, charCount: text.length, html });
    } catch (error) {
        console.error("Text extraction error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to extract text from document",
            },
            { status: 500 }
        );
    }
}

/** Extract text from PDF using pdfjs-dist */
async function extractPdf(buffer: Buffer): Promise<string> {
    // Dynamically import to avoid Next.js server bundling issues with pdfjs-dist worker
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js");

    // Convert Buffer to Uint8Array for pdf.js
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
    const pdfDocument = await loadingTask.promise;

    let fullText = "";
    const numPages = pdfDocument.numPages;

    for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();

        // Extract text items and join them with spaces
        const pageText = textContent.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((item: any) => item.str)
            .join(" ");

        fullText += pageText + "\n\n";
    }

    return fullText.trim();
}

/** Extract text and HTML from DOCX using mammoth */
async function extractDocx(buffer: Buffer): Promise<{ text: string; html: string }> {
    const mammoth = await import("mammoth");
    const textResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });
    return { text: textResult.value, html: htmlResult.value };
}

/** Extract text and rich HTML from PPTX by parsing the XML inside the zip */
async function extractPptx(buffer: Buffer): Promise<{ text: string; html: string }> {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const slideFiles: string[] = [];

    // Find all slide XML files
    zip.forEach((relativePath) => {
        if (relativePath.match(/^ppt\/slides\/slide\d+\.xml$/)) {
            slideFiles.push(relativePath);
        }
    });

    // Sort slides by number
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
        return numA - numB;
    });

    // Extract all images from media folder as base64 data URIs
    const imageMap: Record<string, string> = {};
    const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith("ppt/media/"));
    for (const mediaPath of mediaFiles) {
        try {
            const data = await zip.file(mediaPath)?.async("base64");
            if (data) {
                const ext = mediaPath.split(".").pop()?.toLowerCase() || "png";
                const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg"
                    : ext === "png" ? "image/png"
                        : ext === "gif" ? "image/gif"
                            : ext === "svg" ? "image/svg+xml"
                                : ext === "emf" ? "image/emf"
                                    : ext === "wmf" ? "image/wmf"
                                        : "image/png";
                imageMap[mediaPath] = `data:${mime};base64,${data}`;
            }
        } catch { /* skip unreadable media */ }
    }

    const textParts: string[] = [];
    const htmlParts: string[] = [];

    for (const slidePath of slideFiles) {
        const slideXml = await zip.file(slidePath)?.async("string");
        if (!slideXml) continue;

        const slideNum = slidePath.match(/slide(\d+)/)?.[1] || "?";

        // Parse relationship file for this slide to map rId -> media file
        const relPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
        const relXml = await zip.file(relPath)?.async("string");
        const relMap: Record<string, string> = {};
        if (relXml) {
            const relMatches = relXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g);
            for (const m of relMatches) {
                // Resolve relative path
                const target = m[2].startsWith("../") ? "ppt/" + m[2].slice(3) : m[2];
                relMap[m[1]] = target;
            }
        }

        // Extract paragraphs from <a:p> elements (text shapes)
        const paragraphs: string[] = [];
        const paraMatches = slideXml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g);
        for (const pm of paraMatches) {
            const paraXml = pm[1];
            // Extract all <a:t> text runs within this paragraph
            const runs: string[] = [];
            const textMatches = paraXml.matchAll(/<a:t>([^<]*)<\/a:t>/g);
            for (const tm of textMatches) {
                const decoded = tm[1]
                    .replace(/&amp;/g, "&")
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&quot;/g, '"')
                    .replace(/&apos;/g, "'");
                runs.push(decoded);
            }
            const line = runs.join("").trim();
            if (line) paragraphs.push(line);
        }

        // Find embedded images in the slide (blip references)
        const slideImages: string[] = [];
        const blipMatches = slideXml.matchAll(/r:embed="([^"]+)"/g);
        for (const bm of blipMatches) {
            const rId = bm[1];
            const mediaFile = relMap[rId];
            if (mediaFile && imageMap[mediaFile]) {
                slideImages.push(imageMap[mediaFile]);
            }
        }

        // Build text for AI context
        const slideText = paragraphs.join("\n");
        if (slideText || slideImages.length > 0) {
            textParts.push(`--- Slide ${slideNum} ---\n${slideText}`);
        }

        // Separate title (first paragraph) from body
        const title = paragraphs[0] || `Slide ${slideNum}`;
        const bodyParagraphs = paragraphs.slice(1);

        // Build HTML for the slide
        const imagesHtml = slideImages.map(src =>
            `<div style="margin: 12px 0; text-align: center;">
                <img src="${src}" style="max-width: 100%; max-height: 300px; border-radius: 4px; object-fit: contain;" />
            </div>`
        ).join("");

        const bodyHtml = bodyParagraphs.length > 0
            ? `<ul style="margin: 0; padding-left: 1.5rem; list-style: disc;">
                ${bodyParagraphs.map(p => `<li style="margin-bottom: 6px; line-height: 1.6;">${p}</li>`).join("")}
               </ul>`
            : "";

        htmlParts.push(`
            <div style="
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.12);
                margin-bottom: 24px;
                overflow: hidden;
            ">
                <!-- Slide header bar -->
                <div style="
                    background: #374151;
                    color: #9ca3af;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 6px 16px;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                ">Slide ${slideNum}</div>

                <!-- Slide content area (16:9 aspect) -->
                <div style="
                    aspect-ratio: 16/9;
                    padding: 32px 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    color: #1f2937;
                    overflow: hidden;
                ">
                    <h2 style="
                        margin: 0 0 16px 0;
                        font-size: 1.6rem;
                        font-weight: 700;
                        color: #111827;
                        line-height: 1.3;
                    ">${title}</h2>
                    ${bodyHtml}
                    ${imagesHtml}
                </div>
            </div>
        `);
    }

    return {
        text: textParts.join("\n\n"),
        html: `<div style="padding: 24px; background: #e5e7eb; min-height: 100%; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto;">${htmlParts.join("\n")}</div>`
    };
}

// Configure for large file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};
