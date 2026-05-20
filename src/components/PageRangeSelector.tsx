"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface PageRangeSelectorProps {
  fileIndex: number;
  base64Data: string;
  onRangeChange: (
    fileIndex: number,
    range: { startPage: number; endPage: number } | null
  ) => void;
}

export default function PageRangeSelector({
  fileIndex,
  base64Data,
  onRangeChange,
}: PageRangeSelectorProps) {
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch page count on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchPageCount() {
      setLoading(true);
      setFetchError(null);

      try {
        const res = await fetch("/api/pdf-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data,
            mimeType: "application/pdf",
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(
            data?.error || `Failed to fetch PDF metadata (${res.status})`
          );
        }

        const data = await res.json();

        if (!cancelled) {
          setTotalPages(data.pageCount);
          setStartPage(1);
          setEndPage(data.pageCount);
          setLoading(false);
          onRangeChange(fileIndex, {
            startPage: 1,
            endPage: data.pageCount,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setFetchError(err.message || "Failed to load PDF info");
          setLoading(false);
          onRangeChange(fileIndex, null);
        }
      }
    }

    fetchPageCount();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base64Data, fileIndex]);

  // Validate and notify parent on range changes
  const validate = useCallback(
    (start: number, end: number) => {
      if (totalPages === null) return;

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        setValidationError("Page values must be whole numbers");
        onRangeChange(fileIndex, null);
        return;
      }

      if (start < 1) {
        setValidationError("Start page must be at least 1");
        onRangeChange(fileIndex, null);
        return;
      }

      if (end > totalPages) {
        setValidationError(`End page cannot exceed ${totalPages}`);
        onRangeChange(fileIndex, null);
        return;
      }

      if (start > end) {
        setValidationError("Start page must be ≤ end page");
        onRangeChange(fileIndex, null);
        return;
      }

      setValidationError(null);
      onRangeChange(fileIndex, { startPage: start, endPage: end });
    },
    [totalPages, fileIndex, onRangeChange]
  );

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setStartPage(0);
      setValidationError("Start page must be at least 1");
      onRangeChange(fileIndex, null);
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    setStartPage(num);
    validate(num, endPage);
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setEndPage(0);
      setValidationError(`End page cannot exceed ${totalPages}`);
      onRangeChange(fileIndex, null);
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    setEndPage(num);
    validate(startPage, num);
  };

  // Loading state
  if (loading) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading page info…</span>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
        <AlertTriangle className="h-3 w-3" />
        <span>{fetchError}</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
        <label className="flex items-center gap-1.5 text-xs text-zinc-600">
          <span>Pages</span>
          <input
            type="number"
            min={1}
            max={totalPages ?? undefined}
            value={startPage || ""}
            onChange={handleStartChange}
            className="w-14 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-300"
            aria-label="Start page"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="number"
            min={1}
            max={totalPages ?? undefined}
            value={endPage || ""}
            onChange={handleEndChange}
            className="w-14 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-300"
            aria-label="End page"
          />
          <span className="text-zinc-500">
            of {totalPages} page{totalPages !== 1 ? "s" : ""}
          </span>
        </label>
      </div>

      {validationError && (
        <p className="flex items-center gap-1 px-1 text-[11px] text-red-500">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {validationError}
        </p>
      )}
    </div>
  );
}
