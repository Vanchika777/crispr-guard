import { Info, Target, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import clsx from "clsx";

export default function RiskSummaryCard({
  summary,
  totalSites,
  highCount,
  moderateCount,
  lowCount,
  processingTime,
  grna,
  overallRisk,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div className="card card-hover border border-butter-dark bg-butter min-h-[280px]">
        <div className="h-4 w-40 skeleton mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full skeleton" />
          <div className="h-3 w-5/6 skeleton" />
          <div className="h-3 w-4/6 skeleton" />
        </div>
      </div>
    );
  }

  const riskIcon =
    overallRisk === "High" ? XCircle :
    overallRisk === "Moderate" ? AlertTriangle :
    CheckCircle2;

  const RiskIcon = riskIcon;
  const riskColor =
    overallRisk === "High" ? "text-crimson" :
    overallRisk === "Moderate" ? "text-amber-warn" :
    "text-forest";

  return (
    <div className="card card-hover bg-butter border border-butter-dark flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center">
            <Info className="w-3.5 h-3.5 text-forest" />
          </div>
          <h3 className="section-title text-sm">AI Risk Summary</h3>
        </div>
        <div className={clsx("flex items-center gap-1", riskColor)}>
          <RiskIcon className="w-4 h-4" />
          <span className="font-bold text-xs uppercase tracking-wide">{overallRisk} Risk</span>
        </div>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-3 gap-2">
        {/* High */}
        <div className="flex flex-col items-center p-2.5 bg-crimson-50 border border-crimson-100 rounded-xl">
          <XCircle className="w-4 h-4 text-crimson mb-1" />
          <span className="font-extrabold text-xl text-crimson leading-none">{highCount}</span>
          <span className="text-[9px] text-crimson/70 uppercase tracking-wider font-semibold mt-0.5">
            High Risk
          </span>
        </div>

        {/* Moderate */}
        <div className="flex flex-col items-center p-2.5 bg-amber-light/60 border border-amber-warn/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-warn mb-1" />
          <span className="font-extrabold text-xl text-amber-warn leading-none">{moderateCount}</span>
          <span className="text-[9px] text-amber-warn/70 uppercase tracking-wider font-semibold mt-0.5">
            Moderate
          </span>
        </div>

        {/* Low */}
        <div className="flex flex-col items-center p-2.5 bg-mint border border-sage rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-sage-dark mb-1" />
          <span className="font-extrabold text-xl text-forest leading-none">{lowCount}</span>
          <span className="text-[9px] text-forest/50 uppercase tracking-wider font-semibold mt-0.5">
            Low Risk
          </span>
        </div>
      </div>

      {/* gRNA label */}
      <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-butter-dark">
        <Target className="w-3.5 h-3.5 text-forest/60 flex-shrink-0" />
        <span className="text-xs text-forest/60 font-medium flex-shrink-0">Analyzed gRNA:</span>
        <span className="font-mono text-xs text-forest font-bold tracking-widest truncate">
          {grna}
        </span>
      </div>

      {/* AI Summary Text */}
      <div className="flex-1">
        <p className="text-sm text-forest leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between pt-3 border-t border-butter-dark text-xs text-forest/50">
        <div className="flex items-center gap-1.5">
          <Target className="w-3 h-3" />
          <span>
            <span className="font-bold text-forest">{totalSites}</span> sites scanned
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>
            <span className="font-bold text-forest">{processingTime ? processingTime.toFixed(0) : 0}</span>ms
          </span>
        </div>
      </div>
    </div>
  );
}
