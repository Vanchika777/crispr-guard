import { useState } from "react";
import {
  Dna,
  Sparkles,
  Activity,
  Target,
  BookOpen,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Header from "./components/Header.jsx";
import SequenceInput from "./components/SequenceInput.jsx";
import SafetyGauge from "./components/SafetyGauge.jsx";
import RiskSummaryCard from "./components/RiskSummaryCard.jsx";
import MismatchChart from "./components/MismatchChart.jsx";
import ChromosomeTrack from "./components/ChromosomeTrack.jsx";
import ResultsTable from "./components/ResultsTable.jsx";

// ── Hero / Landing Banner ──────────────────────────────────────────────────────

function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-cream border border-sage mb-8 p-8 md:p-10">
      {/* Decorative DNA helix background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-sage opacity-40"
            style={{
              left: `${10 + i * 16}%`,
              top: `${20 + (i % 2) * 50}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
        <div className="absolute right-6 top-6 opacity-5">
          <Dna className="w-64 h-64 text-forest" />
        </div>
      </div>

      <div className="relative z-10 max-w-3xl">
        {/* Tag pill */}
        <div className="inline-flex items-center gap-1.5 bg-butter border border-butter-dark text-forest text-[10px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
          <Sparkles className="w-3 h-3" />
          AI-Powered Genomic Risk Intelligence
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-forest tracking-tight mb-3 leading-tight">
          CRISPR-Guard:{" "}
          <span className="relative">
            Off-Target
            <span className="absolute -bottom-1 left-0 right-0 h-1 bg-sage rounded-full opacity-60" />
          </span>{" "}
          Genomic Intelligence
        </h1>

        <p className="text-forest/70 text-base md:text-lg font-medium mb-6 leading-relaxed max-w-2xl">
          Predict CRISPR-Cas9 off-target gene editing risks using our hybrid{" "}
          <span className="font-bold text-forest">1D CNN + Transformer</span> model. Enter your guide
          RNA sequence below for a complete genomic safety assessment.
        </p>

        {/* Feature highlights */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: Activity, label: "Real-time inference", color: "bg-mint border-sage" },
            { icon: Target, label: "Genome-wide scan (0–4 MM)", color: "bg-butter border-butter-dark" },
            { icon: TrendingUp, label: "ROC-AUC validated model", color: "bg-skyblue border-skyblue-dark" },
            { icon: BookOpen, label: "GUIDE-seq benchmarked", color: "bg-peach-light border-peach-dark" },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-forest text-xs font-semibold ${color}`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-mint border-2 border-sage flex items-center justify-center mb-6">
        <Dna className="w-10 h-10 text-sage-dark animate-spin-slow" />
      </div>
      <h3 className="font-bold text-forest text-xl mb-2">Ready to Analyze</h3>
      <p className="text-forest/50 text-sm max-w-sm leading-relaxed">
        Enter a 20-nucleotide guide RNA sequence above and click{" "}
        <span className="font-semibold text-forest">Analyze Off-Target Risks</span> to see a complete
        genomic safety assessment.
      </p>
      <div className="mt-6 flex gap-2 text-xs text-forest/40">
        <span>Powered by PyTorch 1D-CNN + Transformer</span>
        <span>·</span>
        <span>SpCas9 NGG PAM</span>
        <span>·</span>
        <span>GRCh38 mock genome</span>
      </div>
    </div>
  );
}

// ── Loading Overlay ────────────────────────────────────────────────────────────

function LoadingBanner() {
  return (
    <div className="relative card border border-sage overflow-hidden py-8">
      <div className="absolute inset-0 bg-gradient-to-r from-mint via-cream to-mint animate-pulse" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-forest animate-pulse" />
          </div>
          <span className="font-bold text-forest text-lg">Scanning Genome...</span>
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-forest/40 animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-forest/60 max-w-xs text-center">
          Running mismatch enumeration and PyTorch inference across genome candidates...
        </p>
      </div>
    </div>
  );
}

// ── API Error Banner ───────────────────────────────────────────────────────────

function ErrorBanner({ message }) {
  return (
    <div className="card bg-crimson-50 border border-crimson-100 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-crimson flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-bold text-crimson text-sm">Analysis Failed</p>
        <p className="text-crimson/80 text-xs mt-1 leading-relaxed">{message}</p>
        <p className="text-crimson/60 text-xs mt-2">
          Make sure the CRISPR-Guard API is running:{" "}
          <code className="font-mono bg-crimson-light px-1 rounded">
            cd backend && uvicorn app.main:app --reload
          </code>
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard App Component ──────────────────────────────────────────────

export default function App() {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleResult = (data) => {
    setResult(data);
    setError(null);
    // Smooth scroll to results
    setTimeout(() => {
      document.getElementById("results-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleSetLoading = (v) => {
    setIsLoading(v);
    if (v) setError(null);
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Banner */}
        <HeroBanner />

        {/* ── Input Section ──────────────────────────────────────── */}
        <section className="mb-8 animate-in" id="input-section">
          <SequenceInput
            onResult={handleResult}
            isLoading={isLoading}
            setIsLoading={handleSetLoading}
          />
        </section>

        {/* ── Error State ────────────────────────────────────────── */}
        {error && (
          <div className="mb-8 animate-in">
            <ErrorBanner message={error} />
          </div>
        )}

        {/* ── Results Section ────────────────────────────────────── */}
        <section id="results-section">
          {isLoading && (
            <div className="mb-8 animate-in">
              <LoadingBanner />
            </div>
          )}

          {!result && !isLoading && !error && <EmptyState />}

          {result && !isLoading && (
            <div className="space-y-6 animate-in">
              {/* ── Row 1: Safety Gauge | Mismatch Chart | Risk Summary ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Safety Score Gauge */}
                <SafetyGauge
                  score={result.safety_score}
                  risk={result.overall_risk}
                  isLoading={isLoading}
                />

                {/* Mismatch Bar Chart */}
                <MismatchChart
                  distribution={result.mismatch_distribution}
                  isLoading={isLoading}
                />

                {/* AI Risk Summary */}
                <RiskSummaryCard
                  summary={result.ai_summary}
                  totalSites={result.total_off_targets}
                  highCount={result.high_risk_count}
                  moderateCount={result.moderate_risk_count}
                  lowCount={result.low_risk_count}
                  processingTime={result.processing_time_ms}
                  grna={result.grna_sequence}
                  overallRisk={result.overall_risk}
                  isLoading={isLoading}
                />
              </div>

              {/* ── Row 2: Chromosomal Track Map ──────────────────── */}
              <div id="chromosome-map">
                <ChromosomeTrack
                  pins={result.chromosomal_map}
                  isLoading={isLoading}
                />
              </div>

              {/* ── Row 3: Off-Target Sites Table ─────────────────── */}
              <div id="results-table">
                <ResultsTable
                  sites={result.off_target_sites}
                  grna={result.grna_sequence}
                  isLoading={isLoading}
                />
              </div>

              {/* ── Footer Info Strip ──────────────────────────────── */}
              <div className="card bg-butter border border-butter-dark flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between py-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-forest/60" />
                  <p className="text-xs text-forest/70 leading-relaxed">
                    <span className="font-bold text-forest">CRISPR-Guard</span> uses a hybrid 1D-CNN +
                    Transformer model trained on GUIDE-seq benchmark datasets. Results are{" "}
                    <span className="font-semibold">computational predictions</span> — always
                    validate with wet-lab assays (GUIDE-seq, CIRCLE-seq) before therapeutic use.
                  </p>
                </div>
                <div className="flex-shrink-0 text-xs text-forest/40 font-mono whitespace-nowrap">
                  Processed in {result.processing_time_ms ? result.processing_time_ms.toFixed(0) : 0}ms
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
