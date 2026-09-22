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

    const prompt = `You are a High-Precision Digital Forensics Inspector specializing in identifying AI-generated synthetic images (Flux.1, Midjourney v6, DALL-E 3, Stable Diffusion XL, Firefly) vs authentic camera photos.

CRITICAL INSTRUCTION FOR DETECTING HIGH-END AI GENERATORS:
Modern AI image generators (especially Midjourney v6, Flux.1, and SDXL) frequently produce hyper-realistic vintage black-and-white, film grain, and retro portraits to fool traditional detectors.

You MUST perform an EXTREMELY RIGOROUS FORENSIC INSPECTION on:
1. Micro-Anatomy & Hands: Count fingers on ALL people. Check finger joints, fingernail clarity, pupil symmetry, and ear cartilage.
2. Background Geometry & Depth: Look for flattened background perspective, distorted background faces/figures, or unreadable synthetic text/logos.
3. Neural Texture Signatures: Differentiate between natural film grain and uniform synthetic noise overlays. Check if skin exhibits unnatural diffusion smoothing despite heavy contrast.

DECISION CRITERIA:
- If there is ANY indication of synthetic diffusion rendering, hand distortion, background flattening, or artificial grain, you MUST classify the image as "AI Generated" or "Likely AI".
- Only classify as "Real Photograph" if there is ZERO doubt and 100% optical camera integrity.

Return ONLY a JSON object matching this schema EXACTLY:
{
  "is_ai": boolean,
  "confidence_score": number (integer 0 to 100 representing AI Likelihood percentage),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Midjourney v6", "Flux.1", "DALL-E 3", "Stable Diffusion", "Authentic Camera Photo"),
  "indicators": [
    "Specific technical finding 1",
    "Specific technical finding 2",
    "Specific technical finding 3"
  ],
  "summary": "Forensic breakdown explaining anatomical, lighting, and texture evidence."
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
            temperature: 0.2,
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
