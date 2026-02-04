
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyDIg1RHR-8tFHyrrmAfqmNw3pK6NRA9JEI");

async function listModels() {
    try {
        // For Node.js SDK, listing models is done via the model manager if exposed, 
        // or we just try a known one. But actually the SDK doesn't expose listModels directly easily in 0.1.0?
        // Let's try to just hit the generic endpoint or use the getGenerativeModel info if possible.
        // Actually the newer SDKs do have it.

        // But failing that, let's try 'gemini-pro' (text) just to check auth works.
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello?");
        console.log("Auth works! Gemini Pro responded:", result.response.text());
    } catch (error) {
        console.error("Error listing/testing:", error);
    }
}

listModels();
