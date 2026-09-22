"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  Eye,
  Lock,
  Zap,
  Info,
} from "lucide-react";

interface AnalysisResult {
  is_ai: boolean;
  confidence_score: number;
  verdict: "AI Generated" | "Likely AI" | "Likely Real" | "Real Photograph";
  ai_generator_guess: string;
  indicators: string[];
  summary: string;
}

const DAILY_LIMIT = 5;

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("Analyzing image structure...");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Daily Limit State
  const [scansToday, setScansToday] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and check daily limit from LocalStorage
  useEffect(() => {
    checkDailyLimit();
  }, []);

  const checkDailyLimit = () => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const storedData = localStorage.getItem("realorai_usage");

    if (storedData) {
      try {
        const { date, count } = JSON.parse(storedData);
        if (date === todayStr) {
          setScansToday(count);
        } else {
          // Reset for new day
          localStorage.setItem("realorai_usage", JSON.stringify({ date: todayStr, count: 0 }));
          setScansToday(0);
        }
      } catch (e) {
        setScansToday(0);
      }
    } else {
      localStorage.setItem("realorai_usage", JSON.stringify({ date: todayStr, count: 0 }));
      setScansToday(0);
    }
  };

  const incrementDailyUsage = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newCount = scansToday + 1;
    setScansToday(newCount);
    localStorage.setItem("realorai_usage", JSON.stringify({ date: todayStr, count: newCount }));
  };

  const handleFileSelect = (file: File) => {
    if (scansToday >= DAILY_LIMIT) {
      setError(`You have reached your free limit of ${DAILY_LIMIT} scans for today. Please come back tomorrow!`);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image size exceeds 10MB. Please select a smaller file.");
      return;
    }

    setError(null);
    setResult(null);
    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (scansToday >= DAILY_LIMIT) {
      setError(`You have reached your free limit of ${DAILY_LIMIT} scans for today. Please come back tomorrow!`);
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const runAnalysis = async () => {
    if (!selectedImage) return;

    if (scansToday >= DAILY_LIMIT) {
      setError(`You have reached your daily free quota of ${DAILY_LIMIT} image scans. Come back tomorrow!`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const steps = [
      "Extracting image metadata...",
      "Analyzing micro-textures & skin details...",
      "Evaluating lighting, shadows & reflections...",
      "Detecting AI generator artifacts (Midjourney/DALL-E/Flux)...",
      "Generating forensic summary with Gemini AI...",
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 1200);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: mimeType,
        }),
      });

      clearInterval(interval);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }

      setResult(data);
      incrementDailyUsage();
    } catch (err: any) {
      clearInterval(interval);
      setError(err?.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!result) return;
    const reportText = `[RealOrAIImage.com Analysis Report]
Verdict: ${result.verdict}
AI Confidence: ${result.confidence_score}%
Model Guess: ${result.ai_generator_guess}
Summary: ${result.summary}`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    setSelectedImage(null);
    setResult(null);
    setError(null);
  };

  const remainingScans = Math.max(0, DAILY_LIMIT - scansToday);

  return (
    <main className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Background Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-purple-900/20 via-blue-900/20 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                RealOrAI<span className="text-purple-400">Image</span>
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                .com
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Daily Quota Counter Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Daily Free Scans: <strong className="text-white">{remainingScans}/{DAILY_LIMIT}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Top Banner Ad Container (Place AdSense Code Here) */}
      <div className="w-full max-w-5xl mx-auto px-4 pt-6">
        <div className="w-full h-16 sm:h-20 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest">
          <span>Advertisement Space</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-purple-300 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>100% Free AI Detector for Midjourney, DALL-E 3, Stable Diffusion & Flux</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Is it a <span className="text-emerald-400">Real Photo</span> or{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              AI Generated?
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-400 font-normal leading-relaxed">
            Upload any image to run an instant deep learning vision scan. Powered by Gemini AI.
          </p>
        </div>

        {/* Daily Quota Reached Banner */}
        {scansToday >= DAILY_LIMIT && (
          <div className="w-full mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-semibold">Daily Free Limit Reached (5/5 Scans Used)</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  You have used all 5 free scans for today. Your limit will automatically reset tomorrow!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload & Workspace Card */}
        <div className="w-full glow-card rounded-2xl p-6 sm:p-8 glow-purple transition-all duration-300 border border-slate-800">
          {!selectedImage ? (
            /* Dropzone UI */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => {
                if (scansToday < DAILY_LIMIT) {
                  fileInputRef.current?.click();
                }
              }}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 flex flex-col items-center justify-center ${
                scansToday >= DAILY_LIMIT
                  ? "border-slate-800 bg-slate-950/40 opacity-60 cursor-not-allowed"
                  : "border-slate-700/80 hover:border-purple-500/80 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer group"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                disabled={scansToday >= DAILY_LIMIT}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>

              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                Drop your image here, or browse
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Supports PNG, JPG, or WEBP up to 10MB
              </p>

              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-md ${
                  scansToday >= DAILY_LIMIT
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                {scansToday >= DAILY_LIMIT ? "Limit Reached Today" : "Select Photo"}
              </div>
            </div>
          ) : (
            /* Selected Image Preview & Controls */
            <div className="flex flex-col gap-6">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[250px] max-h-[450px]">
                {/* Image Container */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Selected preview"
                  className="max-h-[420px] w-auto object-contain rounded-lg"
                />

                {/* Laser Scanning Animation */}
                {loading && (
                  <div className="absolute inset-0 bg-purple-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_15px_#a855f7] animate-scan" />
                    <div className="bg-slate-900/90 border border-purple-500/30 px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3">
                      <RefreshCw className="w-7 h-7 text-purple-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white">
                          Analyzing Image
                        </p>
                        <p className="text-xs text-purple-300 mt-1 animate-pulse">
                          {loadingStep}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">
                    {fileName}
                  </span>
                  <span className="text-slate-500">({fileSize})</span>
                </div>

                {!loading && (
                  <button
                    onClick={resetAll}
                    className="text-slate-400 hover:text-red-400 font-medium transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Change Image
                  </button>
                )}
              </div>

              {/* Action Button */}
              {!result && !loading && (
                <button
                  onClick={runAnalysis}
                  disabled={scansToday >= DAILY_LIMIT}
                  className={`w-full py-4 rounded-xl font-bold text-base shadow-xl transition-all transform flex items-center justify-center gap-2 ${
                    scansToday >= DAILY_LIMIT
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-600/25 hover:-translate-y-0.5"
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-purple-200" />
                  {scansToday >= DAILY_LIMIT
                    ? "Daily Limit Reached (5/5 Scans Used)"
                    : "Analyze Image with Gemini Vision AI"}
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Notice</p>
                <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Analysis Results Display */}
          {result && (
            <div className="mt-8 pt-8 border-t border-slate-800/80 animate-fadeIn">
              {/* Verdict Header */}
              <div className="flex flex-col md:flex-row items-stretch gap-6 mb-6">
                {/* Left: Verdict Box */}
                <div
                  className={`flex-1 p-6 rounded-2xl border flex flex-col justify-center ${
                    result.is_ai
                      ? "bg-gradient-to-br from-purple-950/60 via-slate-900 to-pink-950/40 border-purple-500/40"
                      : "bg-gradient-to-br from-emerald-950/60 via-slate-900 to-teal-950/40 border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {result.is_ai ? (
                      <AlertTriangle className="w-7 h-7 text-purple-400" />
                    ) : (
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    )}
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                      Forensic Verdict
                    </span>
                  </div>

                  <h2
                    className={`text-3xl font-extrabold tracking-tight ${
                      result.is_ai ? "text-purple-300" : "text-emerald-300"
                    }`}
                  >
                    {result.verdict}
                  </h2>

                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-slate-400" />
                    Predicted Origin:{" "}
                    <span className="font-semibold text-slate-200">
                      {result.ai_generator_guess}
                    </span>
                  </p>
                </div>

                {/* Right: Confidence Score Gauge */}
                <div className="w-full md:w-64 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    {result.is_ai ? "AI Probability Score" : "Camera Match Score"}
                  </span>
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className={result.is_ai ? "text-purple-500" : "text-emerald-500"}
                        strokeDasharray={`${result.is_ai ? result.confidence_score : 100 - result.confidence_score}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-white">
                        {result.is_ai ? `${result.confidence_score}%` : `${100 - result.confidence_score}%`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {result.is_ai ? "AI Likelihood" : "Real Camera"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer Notice for Ultra-Realistic AI Models */}
              {!result.is_ai && (
                <div className="mb-6 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>
                    <strong>Forensic Disclaimer:</strong> Ultra-realistic state-of-the-art AI generators (e.g., Flux.1 Pro, Midjourney v6 B&W renders) with zero visual glitches may exhibit high camera match scores.
                  </span>
                </div>
              )}

              {/* In-Content Ad Placement */}
              <div className="w-full my-6 h-20 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest">
                <span>Advertisement Space</span>
              </div>

              {/* Technical Indicators List */}
              <div className="mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-purple-400" />
                  Key Forensic Findings
                </h3>
                <div className="space-y-2">
                  {result.indicators && result.indicators.length > 0 ? (
                    result.indicators.map((indicator, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-sm text-slate-300 flex items-start gap-3"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                        <span>{indicator}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      Standard visual patterns detected.
                    </p>
                  )}
                </div>
              </div>

              {/* Summary Paragraph */}
              <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800/80 mb-8">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Analysis Summary
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={resetAll}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Analyze Another Image
                </button>

                <button
                  onClick={handleCopyReport}
                  className="px-5 py-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Forensic Report
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-12">
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">
              Multi-Model Detection
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects visual artifacts from Midjourney v6, DALL-E 3, Stable Diffusion XL, Flux, and Adobe Firefly.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">
              Gemini Vision AI
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Powered by Google Gemini 2.5 Flash multimodal vision engine for deep forensic texture analysis.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/60">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="font-semibold text-white text-base mb-1">
              Privacy Protected
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uploaded images are analyzed in-memory and immediately discarded. Your data is never stored.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-slate-500">
          <p>© 2026 realoraiimage.com — AI vs Real Photo Forensic Engine</p>
        </div>
      </footer>
    </main>
  );
}
