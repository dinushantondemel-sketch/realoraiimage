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

    const prompt = `You are a World-Class Digital Image Forensics Expert.
Analyze the provided image objectively to determine if it is an AUTHENTIC REAL CAMERA PHOTOGRAPH or an AI-GENERATED SYNTHETIC IMAGE (Midjourney, DALL-E 3, Flux, Stable Diffusion, Imagen 3).

EVALUATION METHODOLOGY:
1. REAL CAMERA SIGNATURES: Legible real-world signage text, clear license plates/alphanumerics, authentic camera lens flare, natural sensor noise, camera optics depth-of-field, realistic human anatomy & skin pores.
2. AI SYNTHETIC SIGNATURES: Garbled/unreadable background text, impossible finger count, warped geometry, unnatural skin smoothing, hyper-idealized scene staging.

UNBIASED CLASSIFICATION RULE:
- If the image displays legible real-world background text, clear license plates, authentic camera sensor noise, and real anatomy, YOU MUST classify it as "Real Photograph" or "Likely Real" with low AI confidence.
- If the image displays clear neural rendering glitches, warped text, or synthetic diffusion composition, YOU MUST classify it as "AI Generated" or "Likely AI" with high AI confidence.

Return ONLY raw valid JSON:
{
  "is_ai": boolean,
  "confidence_score": number (integer 0 to 100 representing AI Likelihood percentage: 100 = 100% AI, 0 = 100% Real Camera),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Midjourney v6", "DALL-E 3", "Flux.1", "Google Imagen 3", "Authentic Camera Photo"),
  "indicators": [
    "Specific technical finding 1",
    "Specific technical finding 2",
    "Specific technical finding 3"
  ],
  "summary": "Objective forensic breakdown."
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

      const aiScore = typeof parsedJson.confidence_score === "number" ? parsedJson.confidence_score : 50;
      const isAi = typeof parsedJson.is_ai === "boolean" ? parsedJson.is_ai : aiScore >= 50;

      const normalizedResult = {
        is_ai: isAi,
        confidence_score: aiScore,
        verdict: isAi
          ? aiScore >= 75
            ? "AI Generated"
            : "Likely AI"
          : aiScore <= 25
          ? "Real Photograph"
          : "Likely Real",
        ai_generator_guess: isAi
          ? (!parsedJson.ai_generator_guess || parsedJson.ai_generator_guess.toLowerCase().includes("camera")
              ? "AI Generator (Midjourney / Flux / Imagen)"
              : parsedJson.ai_generator_guess)
          : "Authentic Camera Photo",
        indicators: parsedJson.indicators || ["Automated forensic pattern evaluation completed."],
        summary: parsedJson.summary || responseText,
      };

      return NextResponse.json(normalizedResult);
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", responseText);
      return NextResponse.json(
        {
          is_ai: false,
          confidence_score: 10,
          verdict: "Real Photograph",
          ai_generator_guess: "Authentic Camera Photo",
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
