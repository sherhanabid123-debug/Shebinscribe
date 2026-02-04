
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
// Fallback to dummy key to allow build to pass without env var
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
// Use Gemini Flash Latest (likely 1.5 or 2.0 stable free tier)
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Configure for long running processes and large files
export const maxDuration = 60; // 60 seconds (max for Hobby) - PRO deployments can go higher

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        console.log("Processing with Gemini:", file.name, file.type, file.size);

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = file.type || "audio/webm"; // Default fallback if type missing

        // Gemini Prompt with strict rules
        const prompt = `You are a highly specialized multilingual speech-to-text engine optimized for Indian languages.

Task:
- Listen to the attached audio which is in spoken Kannada.
- Transcribe it and translate it into accurate, fluent English text.
- Preserve the original meaning, intent, and tone.
- Do NOT transliterate Kannada words into English script unless they are proper nouns.
- Translate idioms, colloquial phrases, and regional expressions into natural English equivalents.
- Maintain correct grammar, punctuation, and sentence structure.

Formatting Rules:
- Output ONLY the final English translation.
- No "Here is the translation" or intro text.
- No timestamps.`;

        // Process with Gemini 1.5 Flash (Audio + Text input)
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Audio
                }
            }
        ]);

        const response = await result.response;
        const finalEnglishText = response.text();

        console.log("Gemini Output:", finalEnglishText);

        return NextResponse.json({
            text: finalEnglishText
        });

    } catch (error) {
        console.error("Error processing audio with Gemini:", error);
        // @ts-expect-error handling unknown error type
        const msg = error?.message || "Unknown error";

        // Friendly error for missing key
        if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
            return NextResponse.json({ error: "Invalid API Key. Please check .env.local" }, { status: 401 });
        }

        return NextResponse.json({ error: "Internal Server Error: " + msg }, { status: 500 });
    }
}
