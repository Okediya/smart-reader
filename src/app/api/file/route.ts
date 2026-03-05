import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Store the current file path in memory for this server instance
let currentFilePath: string | null = null;
let currentFileName: string | null = null;
let currentMimeType: string | null = null;

/**
 * POST /api/file
 * Stores the uploaded file temporarily so it can be served at a public URL
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Clean up previous file
        if (currentFilePath) {
            try { await unlink(currentFilePath); } catch { /* ignore */ }
        }

        // Write to temp directory
        const buffer = Buffer.from(await file.arrayBuffer());
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = join(tmpdir(), `smart-reader-${Date.now()}-${safeName}`);
        await writeFile(filePath, buffer);

        currentFilePath = filePath;
        currentFileName = file.name;
        currentMimeType = file.type || "application/octet-stream";

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("File store error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to store file" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/file
 * Serves the currently stored file with proper headers
 */
export async function GET() {
    try {
        if (!currentFilePath || !currentFileName) {
            return NextResponse.json({ error: "No file stored" }, { status: 404 });
        }

        const fileBuffer = await readFile(currentFilePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": currentMimeType || "application/octet-stream",
                "Content-Disposition": `inline; filename="${currentFileName}"`,
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("File serve error:", error);
        return NextResponse.json(
            { error: "File not found or expired" },
            { status: 404 }
        );
    }
}
