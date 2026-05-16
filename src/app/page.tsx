"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { AppState, AnalysisResult } from "@/lib/types";
import Navbar from "@/components/Navbar";
import HeroLanding from "@/components/HeroLanding";
import UploadSection from "@/components/UploadSection";
import PreviewPanel from "@/components/PreviewPanel";
import LoadingState from "@/components/LoadingState";
import ResultsContainer from "@/components/results/ResultsContainer";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(() => {
    setAppState("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleFileSelected = useCallback(
    (file: File, previewUrl: string) => {
      setSelectedFile(file);
      setPreview(previewUrl);
      setAppState("preview");
      setError(null);
    },
    []
  );

  const handleAnalyze = useCallback(async () => {
    if (!preview) return;

    setAppState("analyzing");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      setAppState("results");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try again.");
      setAppState("preview");
    }
  }, [preview]);

  const handleReset = useCallback(() => {
    setAppState("upload");
    setSelectedFile(null);
    setPreview("");
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleHome = useCallback(() => {
    setAppState("landing");
    setSelectedFile(null);
    setPreview("");
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const showBackButton = appState === "upload" || appState === "preview";
  const canGoHome = appState !== "landing";

  return (
    <>
      <Navbar
        showBack={showBackButton}
        onBack={
          appState === "preview"
            ? () => setAppState("upload")
            : appState === "upload"
              ? () => setAppState("landing")
              : undefined
        }
        canGoHome={canGoHome}
        onHome={handleHome}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {appState === "landing" && (
            <HeroLanding key="landing" onStart={handleStart} />
          )}

          {appState === "upload" && (
            <UploadSection
              key="upload"
              onFileSelected={handleFileSelected}
            />
          )}

          {appState === "preview" && selectedFile && (
            <PreviewPanel
              key="preview"
              file={selectedFile}
              preview={preview}
              onAnalyze={handleAnalyze}
              onReset={handleReset}
            />
          )}

          {appState === "analyzing" && <LoadingState key="analyzing" />}

          {appState === "results" && result && (
            <ResultsContainer
              key="results"
              result={result}
              onReset={handleReset}
              onHome={handleHome}
            />
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-brand-red text-white rounded-xl text-[13px] font-medium shadow-[var(--shadow-red)]">
              {error}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer — minimal, quiet */}
      <footer className="border-t border-border-subtle py-8 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-text-tertiary tracking-wide">
            &copy; {new Date().getFullYear()} Datamatics Design Intelligence
          </p>
          <p className="text-[11px] text-text-tertiary font-mono tracking-wider">
            AI-Powered Analysis Engine &middot; v1.0
          </p>
        </div>
      </footer>
    </>
  );
}
