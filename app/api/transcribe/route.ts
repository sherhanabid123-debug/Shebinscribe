
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";

// Configure for long running processes and large files
export const maxDuration = 60;

// Initialize Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "dummy_key"
});

export async function POST(request: Request) {
    let tempFilePath = "";
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log("Processing with Groq:", file.name, file.type, file.size);

        // Groq SDK requires a file path or stream for audio.transcriptions.create
        // We need to write the file to a temp path first.
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create a unique temp file
        const tempDir = os.tmpdir();
        const fileName = `upload_${Date.now()}_${file.name}`;
        tempFilePath = path.join(tempDir, fileName);

        await fs.promises.writeFile(tempFilePath, buffer);

        // 1. Transcribe with Whisper (Groq)
        console.log("Step 1: Transcribing with Whisper-Large-V3...");
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-large-v3",
            language: "kn", // Hint Kannada
            response_format: "text"
        });

        console.log("Raw Transcription:", transcription);

        // 2. Translate/Refine with Llama 3 (Groq)
        console.log("Step 2: Translating with Llama-3...");
        const systemPrompt = `You are a highly specialized multilingual speech-to-text engine optimized for Indian languages.
        
Task:
- The user will provide a raw Kannada text transcript.
- Translate it into accurate, fluent English text.
- Preserve the original meaning, intent, and tone.
- Do NOT transliterate Kannada words into English script unless they are proper nouns.
- Translate idioms, colloquial phrases, and regional expressions into natural English equivalents.
- Maintain correct grammar, punctuation, and sentence structure.

Formatting Rules:
- Output ONLY the final English translation.
- No "Here is the translation" or intro text.
- No timestamps.`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Raw Transcript:\n${transcription}` }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        const finalEnglishText = completion.choices[0]?.message?.content || "";
        console.log("Groq Output:", finalEnglishText);

        return NextResponse.json({
            text: finalEnglishText
        });

    } catch (error) {
        console.error("Error processing with Groq:", error);
        // @ts-expect-error handling unknown error type
        const msg = error?.message || "Unknown error";

        if (msg.includes("401")) {
            return NextResponse.json({ error: "Invalid Groq API Key. Please check .env.local" }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal Server Error: " + msg }, { status: 500 });
    } finally {
        // Cleanup temp file
        if (tempFilePath) {
            try {
                await fs.promises.unlink(tempFilePath);
            } catch (e) {
                console.error("Failed to delete temp file:", e);
            }
        }
    }
}
