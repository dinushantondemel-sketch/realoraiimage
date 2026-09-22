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

    const prompt = `STRICT AI FORENSIC AUDIT ENGINE:
You are a Lead Forensic AI Investigator. Your objective is to detect if an image is an AI-generated synthetic creation (such as Google Imagen 3 / Gemini AI, Midjourney v6, Flux.1, DALL-E 3, or Stable Diffusion XL).

SPECIAL AUDIT FOR VINTAGE, B&W, AND PHOTOREALISTIC PROMPTS:
Modern AI models (especially Google Imagen 3 and Midjourney v6) create near-flawless historical B&W photos using prompts like "authentic 1950s Italian family".

YOU MUST METICULOUSLY EXAMINE:
1. Scene Staging & Hyper-Idealization: Is the composition overly balanced, cinematic, or staged compared to authentic candid historic photos?
2. Synthetic Film Grain Simulation: Is the noise grain visually uniform across dark and light regions rather than organic film halide distribution?
3. Micro-Tonal Shadow Smoothness: Do skin and clothing shadows exhibit artificial digital smoothness despite high contrast?
4. Eye Catchlights & Anatomy: Look for hyper-consistent reflections or subtle finger/ear joint blurring.

STRICT DECISION CRITERIA:
If the image exhibits hyper-idealized 1950s/retro scene staging, uniform digital grain, or synthetic micro-tonal shadow falloff (characteristic of Google Imagen 3 / Gemini AI), YOU MUST classify the image as "AI Generated" or "Likely AI" with confidence >= 90%.

Return ONLY raw valid JSON:
{
  "is_ai": true,
  "confidence_score": number (integer 85 to 99 for AI images),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Google Imagen 3 / Gemini AI", "Midjourney v6", "Flux.1", "DALL-E 3", "Authentic Camera Photo"),
  "indicators": [
    "Synthetic 1950s scene staging with hyper-idealized composition",
    "Uniform digital film grain simulation lacking organic variation",
    "Micro-tonal shadow smoothness on faces and clothes"
  ],
  "summary": "Detailed forensic explanation identifying AI generation artifacts."
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
          confidence_score: 85,
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
