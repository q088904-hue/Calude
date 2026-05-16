"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { isPptx } from "@/lib/pptx";

interface PreviewPanelProps {
  file: File;
  preview: string;
  onAnalyze: () => void;
  onReset: () => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

function prettyFormat(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) return "PPTX";
  if (name.endsWith(".ppt")) return "PPT";
  if (name.endsWith(".pdf")) return "PDF";
  if (name.endsWith(".webp")) return "WEBP";
  if (name.endsWith(".png")) return "PNG";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "JPG";
  if (file.type && file.type.includes("/")) {
    return file.type.split("/")[1].toUpperCase();
  }
  return "FILE";
}

export default function PreviewPanel({
  file,
  preview,
  onAnalyze,
  onReset,
}: PreviewPanelProps) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isPresentation = isPptx(file);
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  const formatLabel = prettyFormat(file);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease }}
      className="section-container max-w-[800px] mx-auto py-16 md:py-20"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-secondary border border-border-subtle mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
            Ready for Analysis
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease }}
          className="text-headline text-text-primary mb-3"
        >
          Preview your design
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease }}
          className="text-base text-text-secondary"
        >
          Confirm this is the file you want analyzed.
        </motion.p>
      </div>

      {/* Preview Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease }}
        className="card-elevated overflow-hidden"
      >
        {/* Image */}
        <div className="relative bg-surface-secondary flex items-center justify-center min-h-[280px] max-h-[480px] overflow-hidden">
          {isPdf ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] flex items-center justify-center shadow-sm border border-border-subtle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 2H14L20 8V22H4V2Z"
                    stroke="var(--brand-red)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M14 2V8H20" stroke="var(--brand-red)" strokeWidth="1.5" />
                  <path d="M8 13H16M8 16H13" stroke="var(--brand-red)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-text-secondary">
                PDF Document
              </span>
            </div>
          ) : preview ? (
            <>
              <Image
                src={preview}
                alt="Design preview"
                width={800}
                height={500}
                className="w-full h-auto max-h-[480px] object-contain"
                unoptimized
              />
              {isPresentation && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-[0.08em]">
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="1.5"
                      y="1.5"
                      width="11"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M4 5H10M4 7.5H10M4 10H8"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Slide 1
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] flex items-center justify-center shadow-sm border border-border-subtle">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="var(--brand-red)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7 9H17M7 12H17M7 15H13"
                    stroke="var(--brand-red)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-text-secondary">
                {formatLabel} Document
              </span>
            </div>
          )}
        </div>

        {/* File metadata bar */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect
                  x="1.5"
                  y="1.5"
                  width="11"
                  height="11"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-text-tertiary"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary truncate max-w-[240px] md:max-w-[400px]">
                {file.name}
              </p>
              <p className="text-[11px] text-text-tertiary font-mono">
                {fileSizeMB} MB &middot; {formatLabel}
              </p>
            </div>
          </div>

          <button
            onClick={onReset}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-tertiary hover:text-text-primary hover:bg-surface-secondary transition-all duration-200"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7C2.5 4.51472 4.51472 2.5 7 2.5C9.48528 2.5 11.5 4.51472 11.5 7C11.5 9.48528 9.48528 11.5 7 11.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <path
                d="M2.5 4.5V7H5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="hidden sm:inline">Replace</span>
          </button>
        </div>
      </motion.div>

      {/* Analyze CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease }}
        className="mt-8 flex justify-center"
      >
        <button
          onClick={onAnalyze}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-brand-red text-white rounded-[14px] font-semibold text-[15px]
            hover:bg-brand-red-dark active:scale-[0.98] transition-all duration-200
            shadow-[var(--shadow-red)]
            hover:shadow-[var(--shadow-red-hover)]"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            className="transition-transform duration-300 group-hover:rotate-12"
          >
            <path
              d="M9 1L10.5 6.5L16 5L12 9L16 13L10.5 11.5L9 17L7.5 11.5L2 13L6 9L2 5L7.5 6.5L9 1Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          Run Deep Analysis
          <span className="absolute inset-0 rounded-[14px] bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </motion.div>
    </motion.div>
  );
}
