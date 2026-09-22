import { useState } from "react";
import { MapPin } from "lucide-react";
import clsx from "clsx";

// Human chromosome sizes (Mbp) — approximate GRCh38
const CHROMOSOME_SIZES = {
  chr1: 249, chr2: 243, chr3: 198, chr4: 191, chr5: 182,
  chr6: 171, chr7: 160, chr8: 146, chr9: 138, chr10: 134,
  chr11: 135, chr12: 133, chr13: 115, chr14: 108, chr15: 102,
  chr16: 90,  chr17: 83,  chr18: 80,  chr19: 58,  chr20: 64,
  chr21: 47,  chr22: 51,  chrX: 156,
};

const CHROMOSOMES = Object.keys(CHROMOSOME_SIZES);
const MAX_SIZE = Math.max(...Object.values(CHROMOSOME_SIZES));

function getPinStyle(risk) {
  if (risk === "High") {
    return {
      bg: "bg-crimson",
      shadow: "shadow-crimson",
      border: "border-crimson-100",
      label: "text-crimson",
      glow: "0 0 8px 3px rgba(139,38,38,0.55)",
    };
  }
  if (risk === "Moderate") {
    return {
      bg: "bg-amber-warn",
      shadow: "",
      border: "border-amber-light",
      label: "text-amber-warn",
      glow: "0 0 6px 2px rgba(235,125,0,0.45)",
    };
  }
  return {
    bg: "bg-sage",
    shadow: "shadow-sage",
    border: "border-sage-light",
    label: "text-forest",
    glow: "0 0 6px 2px rgba(165,214,167,0.5)",
  };
}

function Tooltip({ pin }) {
  const style = getPinStyle(pin.risk_level);
  return (
    <div
      className={clsx(
        "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2",
        "bg-mint border border-sage rounded-xl px-3 py-2 shadow-card-hover",
        "text-xs text-forest whitespace-nowrap pointer-events-none",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200"
      )}
    >
      <p className="font-bold">{pin.locus}</p>
      <p className="font-mono">{pin.gene}</p>
      <p>
        Prob:{" "}
        <span className={clsx("font-bold", style.label)}>
          {(pin.probability * 100).toFixed(1)}%
        </span>
      </p>
      <p className={clsx("font-semibold", style.label)}>{pin.risk_level} Risk</p>
      {/* Tooltip arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-sage" />
    </div>
  );
}

function ChromosomeRow({ chrom, pins }) {
  const [hoveredPin, setHoveredPin] = useState(null);
  const chromSize = CHROMOSOME_SIZES[chrom];
  const widthPct = (chromSize / MAX_SIZE) * 100;
  const label = chrom.replace("chr", "");

  return (
    <div className="flex items-center gap-2 py-0.5 group/row">
      {/* Chromosome label */}
      <span className="text-[10px] font-bold text-forest/60 w-8 text-right flex-shrink-0 font-mono">
        {label}
      </span>

      {/* Track bar */}
      <div className="flex-1 h-7 relative">
        {/* Track body */}
        <div
          className="absolute inset-y-1 left-0 rounded-full"
          style={{
            width: `${widthPct}%`,
            background:
              "linear-gradient(90deg, #C8E6C9 0%, #A5D6A7 40%, #C8E6C9 100%)",
            border: "1px solid #A5D6A7",
          }}
        />

        {/* Centromere mark */}
        <div
          className="absolute inset-y-0 w-0.5 bg-forest/20 rounded-full"
          style={{ left: `${widthPct * 0.4}%` }}
        />

        {/* Off-target pins */}
        {pins.map((pin, idx) => {
          const pinPos = (pin.position / (chromSize * 1_000_000)) * widthPct;
          const style = getPinStyle(pin.risk_level);

          return (
            <div
              key={idx}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer z-10"
              style={{ left: `${Math.min(pinPos, widthPct - 1)}%` }}
              onMouseEnter={() => setHoveredPin(idx)}
              onMouseLeave={() => setHoveredPin(null)}
              title={`${pin.locus} | ${pin.gene} | ${pin.risk_level} Risk`}
            >
              {/* Glow pulse ring */}
              <div
                className={clsx(
                  "absolute inset-0 rounded-full animate-pulse-slow opacity-60",
                  style.bg
                )}
                style={{
                  transform: "scale(2.2)",
                  filter: "blur(2px)",
                  opacity: hoveredPin === idx ? 0.7 : 0.3,
                }}
              />

              {/* Pin dot */}
              <div
                className={clsx(
                  "relative w-3 h-3 rounded-full border flex-shrink-0",
                  pin.risk_level === "High"
                    ? "w-3.5 h-3.5"
                    : "w-2.5 h-2.5",
                  style.bg,
                  style.border
                )}
                style={{ boxShadow: style.glow }}
              />

              {/* Hover tooltip */}
              {hoveredPin === idx && <Tooltip pin={pin} />}
            </div>
          );
        })}
      </div>

      {/* Count badge */}
      {pins.length > 0 && (
        <span className="text-[10px] font-bold text-forest/50 w-5 flex-shrink-0 text-center">
          {pins.length}
        </span>
      )}
    </div>
  );
}

export default function ChromosomeTrack({ pins = [], isLoading }) {
  // Group pins by chromosome
  const pinsByChrom = {};
  for (const chrom of CHROMOSOMES) {
    pinsByChrom[chrom] = pins.filter((p) => p.chromosome === chrom);
  }

  const totalPins = pins.length;
  const highCount = pins.filter((p) => p.risk_level === "High").length;

  if (isLoading) {
    return (
      <div className="card card-hover">
        <div className="h-4 w-56 skeleton mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-3 skeleton" />
              <div
                className="h-5 skeleton rounded-full"
                style={{ width: `${40 + Math.random() * 50}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card card-hover">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-forest" />
          </div>
          <div>
            <h3 className="section-title text-sm">Chromosomal Risk Map</h3>
            <p className="section-subtitle text-[11px]">
              Predicted off-target cleavage sites across the human genome
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-semibold text-forest/70">
          {[
            { label: "High Risk", color: "#8B2626" },
            { label: "Moderate", color: "#EB7D00" },
            { label: "Low Risk", color: "#A5D6A7" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/50"
                style={{ backgroundColor: color }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 mb-4 pb-3 border-b border-sage">
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="w-3 h-3 text-crimson" />
          <span className="text-forest/60">Total sites:</span>
          <span className="font-bold text-forest">{totalPins}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-2 h-2 rounded-full bg-crimson" />
          <span className="text-forest/60">High risk:</span>
          <span className="font-bold text-crimson">{highCount}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-forest/60">Chromosomes affected:</span>
          <span className="font-bold text-forest">
            {Object.values(pinsByChrom).filter((p) => p.length > 0).length}
          </span>
        </div>
      </div>

      {/* Chromosome Tracks */}
      <div className="grid grid-cols-1 gap-0.5">
        {CHROMOSOMES.map((chrom) => (
          <ChromosomeRow
            key={chrom}
            chrom={chrom}
            pins={pinsByChrom[chrom] || []}
          />
        ))}
      </div>

      {/* Axis */}
      <div className="mt-2 flex items-center gap-2 pl-10">
        <div className="flex-1 flex items-center">
          <div className="flex-1 h-px bg-sage/60" />
        </div>
        <div className="flex justify-between w-full pl-2">
          {["0", "50 Mbp", "100 Mbp", "150 Mbp", "200 Mbp", "249 Mbp"].map(
            (label) => (
              <span key={label} className="text-[9px] text-forest/40 font-mono">
                {label}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
