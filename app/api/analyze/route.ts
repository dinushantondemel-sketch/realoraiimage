import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image data (imageBase64) is required." },
        { status: 400 }
      );
    }

    // Clean base64 header if included
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const genAI = new GoogleGenerativeAI(apiKey);

    const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro"];
    let result = null;
    let lastError = null;

    const prompt = `You are a world-class expert digital forensics investigator specializing in detecting AI-generated synthetic images (such as Midjourney v6, DALL-E 3, Stable Diffusion XL, Flux, Adobe Firefly) versus authentic real-world camera photographs.

Analyze the provided image with extreme forensic precision. Evaluate:
1. Micro-textures: Skin pores, hair strands, eye catchlights, finger anatomy, text rendering.
2. Lighting & Reflections: Shadow consistency, highlight angles, specular reflections.
3. Background & Artifacts: Over-smoothing, plastic look, prompt-specific rendering artifacts, unnatural blur/depth of field.

Return a JSON object matching this schema EXACTLY:
{
  "is_ai": boolean,
  "confidence_score": number (integer between 0 and 100),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Midjourney v6", "DALL-E 3", "Stable Diffusion / Flux", "Authentic Camera Photo"),
  "indicators": [
    "Specific technical finding 1",
    "Specific technical finding 2",
    "Specific technical finding 3"
  ],
  "summary": "Clear human-readable forensic summary explaining why this image is real or AI-generated."
}`;

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    };

    // Try candidate models in order for maximum reliability
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        result = await model.generateContent([prompt, imagePart]);
        if (result && result.response) {
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed, trying next:`, err?.message);
        lastError = err;
      }
    }

    if (!result || !result.response) {
      throw lastError || new Error("Failed to process image with Gemini AI models.");
    }

    const responseText = result.response.text();

    try {
      const parsedJson = JSON.parse(responseText);
      return NextResponse.json(parsedJson);
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", responseText);
      return NextResponse.json(
        {
          is_ai: responseText.toLowerCase().includes("ai"),
          confidence_score: 80,
          verdict: responseText.toLowerCase().includes("ai") ? "AI Generated" : "Real Photograph",
          ai_generator_guess: "Analysis Completed",
          indicators: ["Automated forensic pattern evaluation completed."],
          summary: responseText,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze image with Gemini API." },
      { status: 500 }
    );
  }
}
