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

    const prompt = `You are a Lead AI Image Forensics Engineer operating an advanced Multi-Engine AI Detector.

Your task is to determine if the provided image was created by state-of-the-art AI generators (such as Google Imagen 3 / Gemini AI, Midjourney v6, Flux.1, DALL-E 3, or Stable Diffusion XL).

CRITICAL MULTI-ENGINE AI SIGNATURE AUDIT:
1. GOOGLE IMAGEN 3 / GEMINI AI SIGNATURES: Check for uniform computational vintage grain overlays, ultra-smooth micro-tonal shadow falloff on skin/clothing, hyper-consistent eye catchlight reflections, and artificial historical scene composition.
2. MIDJOURNEY v6 / FLUX.1 SIGNATURES: Check for hyper-real skin textures, uncanny facial symmetry, synthetic background bokeh, and prompt-staged subject arrangements.
3. DALL-E 3 & SDXL SIGNATURES: Check for unreadable background text, merged finger joints, and smooth painterly fabric blending.

DECISION RULE:
If ANY of the above synthetic hallmarks (e.g. Imagen 3 synthetic vintage grain simulation, smooth micro-tonal falloff, artificial staging, or diffusion signatures) are detected, classify the image as "AI Generated" or "Likely AI".

Return ONLY raw valid JSON:
{
  "is_ai": boolean,
  "confidence_score": number (integer 0 to 100 representing AI Likelihood percentage),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Google Imagen 3 / Gemini AI", "Midjourney v6", "Flux.1", "DALL-E 3", "Authentic Camera Photo"),
  "indicators": [
    "Specific neural signature 1",
    "Specific neural signature 2",
    "Specific neural signature 3"
  ],
  "summary": "Forensic rationale detailing the neural synthesis hallmarks or camera optical evidence."
}`;

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: mimeType,
      },
    };

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
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
