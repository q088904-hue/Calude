"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isPptx, isLegacyPpt, extractPptxPreview } from "@/lib/pptx";

interface UploadSectionProps {
  onFileSelected: (file: File, preview: string) => void;
}

const ease = [0.16, 1, 0.3, 1] as const;

// Accepted MIME types across image, document, and presentation formats
const validTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-powerpoint", // .ppt
];

// Map of extensions for files that browsers sometimes pass with empty type
const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".pdf", ".pptx", ".ppt"];

function hasValidType(file: File): boolean {
  if (file.type && validTypes.includes(file.type)) return true;
  const lower = file.name.toLowerCase();
  return validExtensions.some((ext) => lower.endsWith(ext));
}

export default function UploadSection({ onFileSelected }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!hasValidType(file)) {
        setError("Unsupported file. Please upload PNG, JPG, WebP, PDF, or PPTX.");
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        setError("File size must be under 40MB.");
        return;
      }

      // Legacy .ppt (pre-2007 binary OLE format) cannot be parsed client-side.
      // Surface a clear, helpful message rather than failing silently.
      if (isLegacyPpt(file)) {
        setError(
          "Legacy .ppt files aren't supported — please re-save as .pptx or export as PDF."
        );
        return;
      }

      // .pptx: extract a thumbnail/first-slide image client-side so both
      // preview and AI analysis have a real image to work with.
      if (isPptx(file)) {
        try {
          setIsProcessing(true);
          const { preview } = await extractPptxPreview(file);
          onFileSelected(file, preview);
        } catch (err) {
          console.error("PPTX extraction failed:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't read this presentation. Try exporting it as PDF or PNG."
          );
        } finally {
          setIsProcessing(false);
        }
        return;
      }

      // Default path: images and PDFs read as data URLs
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileSelected(file, e.target?.result as string);
      };
      reader.onerror = () => {
        setError("Couldn't read this file. Please try again.");
      };
      reader.readAsDataURL(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isProcessing) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, isProcessing]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.7, ease }}
      className="section-container max-w-[720px] mx-auto py-16 md:py-24"
    >
      {/* Section header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-secondary border border-border-subtle mb-6"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
            Step 01
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease }}
          className="text-headline text-text-primary mb-4"
        >
          Upload your design
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="text-base text-text-secondary max-w-md mx-auto leading-relaxed"
        >
          Drop any graphic design file. Our AI will perform deep strategic
          analysis across 10 dimensions.
        </motion.p>
      </div>

      {/* Drop Zone */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease }}
      >
        <label
          htmlFor="file-upload"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative group cursor-pointer block
            rounded-2xl border-2 border-dashed transition-all duration-300
            ${
              isDragging
                ? "border-brand-red bg-brand-red-glow scale-[1.01]"
                : "border-border-medium hover:border-text-tertiary bg-surface-secondary/40 hover:bg-surface-secondary/80"
            }
          `}
        >
          <div className="flex flex-col items-center justify-center py-20 px-8">
            {/* Upload icon */}
            <motion.div
              animate={
                isDragging
                  ? { scale: 1.08, y: -4 }
                  : { scale: 1, y: 0 }
              }
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={`
                w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-300
                ${
                  isDragging
                    ? "bg-brand-red text-white"
                    : "bg-surface-tertiary text-text-tertiary group-hover:text-text-secondary"
                }
              `}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 14V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M12 4V15M12 4L8 8M12 4L16 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>

            <p className="text-[15px] font-medium text-text-primary mb-1.5">
              {isDragging ? "Release to upload" : "Drop your design here"}
            </p>
            <p className="text-sm text-text-tertiary mb-8">
              or click to browse files
            </p>

            {/* File type indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] text-text-tertiary tracking-wide">
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <rect
                    x="1.5"
                    y="1.5"
                    width="11"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <circle cx="5" cy="5" r="1" fill="currentColor" />
                  <path
                    d="M1.5 10L4.5 7L6.5 9L9 6L12.5 10"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                PNG, JPG, WebP
              </span>
              <span className="w-px h-3 bg-border-subtle" />
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M3 1.5H8.5L11.5 4.5V12.5H3V1.5Z"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                  <path d="M8.5 1.5V4.5H11.5" stroke="currentColor" strokeWidth="1" />
                </svg>
                PDF
              </span>
              <span className="w-px h-3 bg-border-subtle" />
              <span className="flex items-center gap-1.5">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <rect
                    x="1.5"
                    y="1.5"
                    width="11"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <path
                    d="M4 5H10M4 7.5H10M4 10H8"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
                PPTX
              </span>
            </div>
            <p className="mt-3 text-[10.5px] text-text-tertiary/80 tracking-wider uppercase">
              Max 40 MB
            </p>
          </div>

          {/* Processing overlay for PPTX extraction */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-2xl bg-[var(--background)]/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
              >
                <div className="relative w-8 h-8">
                  <div className="absolute inset-0 rounded-full border-2 border-border-subtle" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-red animate-spin" />
                </div>
                <span className="text-[12px] font-medium text-text-secondary tracking-wide">
                  Extracting presentation preview…
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            id="file-upload"
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.pdf,.pptx,.ppt,image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint"
            onChange={handleInputChange}
            disabled={isProcessing}
            className="sr-only"
          />
        </label>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/25"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle
                cx="7"
                cy="7"
                r="6"
                stroke="var(--brand-red)"
                strokeWidth="1.2"
              />
              <path
                d="M5 5L9 9M9 5L5 9"
                stroke="var(--brand-red)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-sm text-brand-red font-medium">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
