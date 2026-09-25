import { useState, useCallback } from "react";
import {
  Search,
  ChevronRight,
  Dna,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FlaskConical,
} from "lucide-react";
import clsx from "clsx";

// ── Preset Sequences ───────────────────────────────────────────────────────────

const PRESETS = [
  {
    name: "EMX1",
    label: "EMX1 Site 1",
    sequence: "GAGTCCGAGCAGAAGAAGAA",
    color: "bg-mint border-sage text-forest",
  },
  {
    name: "VEGFA",
    label: "VEGFA Site 3",
    sequence: "GGTGAGTGAGTGTGTGCGTG",
    color: "bg-butter border-butter-dark text-forest",
  },
  {
    name: "HBB",
    label: "HBB β-Globin",
    sequence: "CTTGCCCCACAGGGCAGTAA",
    color: "bg-skyblue border-skyblue-dark text-forest",
  },
  {
    name: "TRAC",
    label: "TRAC CAR-T",
    sequence: "TGTGCTAGACATGAGGTCTA",
    color: "bg-peach-light border-peach-dark text-forest",
  },
];

const VALID_CHARS = new Set(["A", "C", "G", "T"]);

// ── Component ──────────────────────────────────────────────────────────────────

export default function SequenceInput({ onResult, isLoading, setIsLoading }) {
  const [sequence, setSequence] = useState("GAGTCCGAGCAGAAGAAGAA");
  const [error, setError] = useState(null);
  const [isValid, setIsValid] = useState(true);

  const validateSequence = useCallback((seq) => {
    const upper = seq.toUpperCase().trim();
    if (upper.length === 0) return "Please enter a guide RNA sequence.";
    if (upper.length !== 20)
      return `Sequence must be exactly 20 bp. Current: ${upper.length} bp.`;
    const invalid = [...new Set(upper.split(""))].filter(
      (c) => !VALID_CHARS.has(c),
    );
    if (invalid.length > 0)
      return `Invalid characters detected: ${invalid.join(", ")}. Only A, C, G, T are allowed.`;
    return null;
  }, []);

  const handleInput = (value) => {
    const upper = value.toUpperCase().replace(/[^ACGT]/gi, "");
    setSequence(upper);
    const err = validateSequence(upper);
    setError(err);
    setIsValid(!err && upper.length === 20);
  };

  const handleSubmit = async () => {
    const validationError = validateSequence(sequence);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const API_URL =
        import.meta.env.VITE_API_URL || "https://crispr-guard.onrender.com";
      const response = await fetch(`${API_URL}/api/v1/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grna_sequence: sequence }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      onResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred.";
      setError(
        message.includes("fetch")
          ? "Cannot connect to CRISPR-Guard API. Ensure the backend is running at localhost:8000."
          : message,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (preset) => {
    setSequence(preset.sequence);
    setError(null);
    setIsValid(true);
  };

  // Nucleotide color coding
  const colorMap = {
    A: "text-emerald-600",
    T: "text-blue-600",
    G: "text-amber-600",
    C: "text-rose-600",
  };

  return (
    <section className="w-full card card-hover animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-forest/10">
          <Dna className="w-4 h-4 text-forest" />
        </div>
        <div>
          <h2 className="section-title">Guide RNA Sequence Input</h2>
          <p className="section-subtitle">
            Enter a 20-nucleotide gRNA sequence for off-target risk analysis
          </p>
        </div>
      </div>

      {/* Sequence Input + Visual */}
      <div className="mb-4">
        {/* Colored nucleotide preview */}
        <div className="mb-2 px-1 h-6 flex items-center gap-0.5 font-mono text-sm tracking-widest overflow-hidden">
          {sequence.split("").map((char, i) => (
            <span
              key={i}
              className={clsx(
                "font-bold transition-colors",
                colorMap[char.toUpperCase()] || "text-forest/30",
              )}
            >
              {char || "·"}
            </span>
          ))}
          {sequence.length < 20 &&
            Array.from({ length: 20 - sequence.length }).map((_, i) => (
              <span key={`dot-${i}`} className="text-sage/50">
                ·
              </span>
            ))}
        </div>

        {/* Text Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-forest/40" />
          <input
            id="grna-sequence-input"
            type="text"
            value={sequence}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSubmit()}
            placeholder="Enter 20-nucleotide gRNA sequence (e.g. GAGTCCGAGCAGAAGAAGAA)"
            maxLength={20}
            className={clsx(
              "input-field pl-10 pr-20 font-mono uppercase text-base tracking-widest",
              error &&
                "border-crimson focus:border-crimson focus:ring-crimson/20",
              isValid && sequence.length === 20 && "border-sage-dark",
            )}
            aria-label="Guide RNA sequence input"
            aria-describedby="sequence-helper"
            aria-invalid={!!error}
          />

          {/* Character counter */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span
              className={clsx(
                "text-xs font-mono font-bold tabular-nums",
                sequence.length === 20
                  ? "text-sage-dark"
                  : sequence.length > 20
                    ? "text-crimson"
                    : "text-forest/40",
              )}
            >
              {sequence.length}/20
            </span>
            {isValid && sequence.length === 20 && (
              <CheckCircle2 className="w-4 h-4 text-sage-dark" />
            )}
          </div>
        </div>

        {/* Helper / Error */}
        <div
          id="sequence-helper"
          className={clsx(
            "mt-2 flex items-start gap-1.5 text-xs min-h-[1.25rem]",
            error ? "text-crimson" : "text-forest/50",
          )}
        >
          {error ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </>
          ) : (
            <span>
              Accepts 20-nucleotide sequences using ACGT alphabet only. PAM
              (NGG) is added automatically.
            </span>
          )}
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="mb-5">
        <p className="text-xs text-forest/50 font-medium mb-2 uppercase tracking-wider flex items-center gap-1">
          <FlaskConical className="w-3 h-3" />
          Load Example Sequences
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              id={`preset-${preset.name.toLowerCase()}`}
              onClick={() => loadPreset(preset)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold",
                "transition-all duration-150 hover:scale-105 active:scale-95",
                preset.color,
              )}
              title={`Load ${preset.label}: ${preset.sequence}`}
            >
              <Dna className="w-3 h-3" />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        id="submit-analysis"
        onClick={handleSubmit}
        disabled={isLoading || !isValid || sequence.length !== 20}
        className={clsx(
          "w-full btn-primary flex items-center justify-center gap-2 text-base",
          (isLoading || !isValid || sequence.length !== 20) &&
            "opacity-50 cursor-not-allowed hover:bg-forest active:scale-100",
        )}
        aria-busy={isLoading}
        aria-label="Run off-target analysis"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Scanning Genome...</span>
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            <span>Analyze Off-Target Risks</span>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-sage">
        <p className="text-xs text-forest/50 font-medium">Nucleotide key:</p>
        {[
          { base: "A", color: "text-emerald-600", label: "Adenine" },
          { base: "T", color: "text-blue-600", label: "Thymine" },
          { base: "G", color: "text-amber-600", label: "Guanine" },
          { base: "C", color: "text-rose-600", label: "Cytosine" },
        ].map(({ base, color, label }) => (
          <span
            key={base}
            className="flex items-center gap-1 text-xs text-forest/60"
          >
            <span className={clsx("font-mono font-bold text-sm", color)}>
              {base}
            </span>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
