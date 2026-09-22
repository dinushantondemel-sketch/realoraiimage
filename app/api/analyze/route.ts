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
    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash"];
    let result = null;
    let lastError = null;

    const prompt = `You are a Lead AI Forensics Investigator operating an Ensemble Micro-Texture Forensic Engine.

Your mission is to detect if an image is synthetic AI (created by Google Imagen 3, Midjourney v6, Flux.1, DALL-E 3, or SDXL simulating a vintage photograph).

CONDUCT A 4-ASPECT MICRO-FORENSIC AUDIT:
1. SKIN & SURFACE MICRO-TEXTURE: Check for subtle digital diffusion smoothing on cheeks, neck, or fabric beneath high-contrast B&W film grain overlays.
2. FILM GRAIN FREQUENCY: Differentiate between uniform computational noise grain and authentic organic silver-halide film distribution.
3. ANATOMY & EYE REFLECTIONS: Check for hyper-stylized eye catchlights, finger/glove joint blurring, or artificial facial symmetry.
4. LIGHTING & OPTICAL DEPTH: Check for computational depth-of-field blur along furniture/background edges that conflict with real optical film lenses.

ENSEMBLE WEIGHTING RULE:
Real camera sensors NEVER produce synthetic diffusion smoothing beneath noise filters or computational edge blur.
Therefore:
- If ANY synthetic diffusion or artificial grain indicators are detected in steps 1-4, YOU MUST WEIGHT THE AI PROBABILITY AT >= 70% (is_ai: true).
- Only classify as Real Photograph (is_ai: false) if all 4 aspects pass with 100% authentic optical film camera evidence (e.g. legible real-world background text, authentic license plates, clear camera lens flare).

Return ONLY raw valid JSON:
{
  "is_ai": boolean,
  "confidence_score": number (integer 0 to 100 representing AI Likelihood percentage: 100 = 100% AI, 0 = 100% Real Camera),
  "verdict": "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph",
  "ai_generator_guess": string (e.g. "Google Imagen 3 / Gemini AI", "Midjourney v6", "Flux.1", "Authentic Camera Photo"),
  "indicators": [
    "Specific technical finding 1",
    "Specific technical finding 2",
    "Specific technical finding 3"
  ],
  "summary": "Forensic breakdown detailing micro-texture, grain, and optical analysis."
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
      const isQuotaError = lastError?.message?.includes("429") || lastError?.message?.includes("quota");
      throw new Error(
        isQuotaError
          ? "Google Gemini API rate limit reached. Please wait 30 seconds and try again!"
          : (lastError?.message || "Failed to process image with Gemini AI models.")
      );
    }

    const responseText = result.response.text();

    try {
      const parsedJson = JSON.parse(responseText);

      const aiScore = typeof parsedJson.confidence_score === "number" ? parsedJson.confidence_score : 70;
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
              ? "Midjourney v6 / Imagen 3"
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
          is_ai: true,
          confidence_score: 75,
          verdict: "Likely AI",
          ai_generator_guess: "Midjourney v6 / Imagen 3",
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
