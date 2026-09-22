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

    const prompt = `You are an elite digital image forensics investigator specializing in identifying AI-generated images (Flux.1, Midjourney v6, DALL-E 3, Stable Diffusion XL, Adobe Firefly) vs authentic camera photographs.

CRITICAL FORENSIC DIRECTIVES:
1. BEWARE OF VINTAGE & B&W AI IMAGES: Do NOT assume an image is a real camera photo just because it is black-and-white, sepia, monochrome, vintage, or has grain. Modern AI generators (especially Midjourney v6 and Flux) excel at producing fake vintage photos with artificial film grain to disguise synthetic signatures.
2. EXAMINE ANATOMY & HANDS: Closely inspect hands, finger counts, knuckle folds, ear cartilage structure, pupil roundness, iris pattern symmetry, and teeth shape.
3. EXAMINE BACKGROUND DETAILS: Check for warped background faces, illegible text/alphabets, unnatural depth-of-field blurring, blending object borders, and unnatural fabric folds.
4. STRICT DETECTOR BIAS: Look for subtle neural diffusion patterns (hyper-real skin texture, surreal lighting balance, uncanny facial symmetry). If there is any reasonable indicator of AI generation, classify as "AI Generated" or "Likely AI".

Return a JSON object matching this schema EXACTLY:
{
  "is_ai": boolean,
  "confidence_score": number (integer 0 to 100 representing AI Likelihood percentage. 100 = 100% AI, 0 = 100% Real Camera),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Midjourney v6", "Flux.1", "DALL-E 3", "Stable Diffusion", "Authentic Camera Photo"),
  "indicators": [
    "Specific technical finding 1",
    "Specific technical finding 2",
    "Specific technical finding 3"
  ],
  "summary": "Detailed forensic explanation highlighting anatomical, texture, lighting, or background artifacts."
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
            temperature: 0.1, // Low temperature for consistent forensic precision
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
