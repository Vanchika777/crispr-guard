import { useEffect, useRef } from "react";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import clsx from "clsx";

const CIRCLE_R = 78;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R; // ≈ 490

function getRiskConfig(risk, score) {
  if (risk === "High" || score < 55) {
    return {
      label: "HIGH RISK",
      color: "#8B2626",
      strokeClass: "gauge-circle-danger",
      bgClass: "bg-crimson-50",
      borderClass: "border-crimson-100",
      textClass: "text-crimson",
      Icon: ShieldAlert,
      gradient: ["#8B2626", "#C0392B"],
    };
  }
  if (risk === "Moderate" || score < 75) {
    return {
      label: "MODERATE",
      color: "#EB7D00",
      strokeClass: "gauge-circle-warn",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-100",
      textClass: "text-amber-warn",
      Icon: Shield,
      gradient: ["#EB7D00", "#F4A01D"],
    };
  }
  return {
    label: "SAFE",
    color: "#2C5745",
    strokeClass: "gauge-circle-safe",
    bgClass: "bg-mint",
    borderClass: "border-sage",
    textClass: "text-forest",
    Icon: ShieldCheck,
    gradient: ["#2C5745", "#A5D6A7"],
  };
}

export default function SafetyGauge({ score, risk, isLoading }) {
  const circleRef = useRef(null);
  const config = getRiskConfig(risk, score);

  const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - score / 100);

  useEffect(() => {
    if (circleRef.current) {
      // Start from full offset (empty), animate to final value
      circleRef.current.style.strokeDashoffset = `${CIRCLE_CIRCUMFERENCE}`;
      // Force reflow
      void circleRef.current.getBoundingClientRect();
      circleRef.current.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)";
      circleRef.current.style.strokeDashoffset = `${dashOffset}`;
    }
  }, [score, dashOffset]);

  if (isLoading) {
    return (
      <div className="card card-hover flex flex-col items-center justify-center min-h-[280px] gap-4">
        <div className="w-36 h-36 rounded-full skeleton" />
        <div className="h-4 w-24 skeleton" />
        <div className="h-3 w-16 skeleton" />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "card card-hover flex flex-col items-center justify-center gap-4",
        config.bgClass,
        "border",
        config.borderClass
      )}
    >
      {/* Title */}
      <div className="flex items-center gap-2 self-start">
        <config.Icon className={clsx("w-4 h-4", config.textClass)} />
        <h3 className="section-title text-sm">Overall Safety Score</h3>
      </div>

      {/* SVG Gauge */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="drop-shadow-sm"
          aria-label={`Safety score: ${score}%`}
          role="img"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.gradient[0]} />
              <stop offset="100%" stopColor={config.gradient[1]} />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx="100"
            cy="100"
            r={CIRCLE_R}
            className="gauge-circle-bg"
            strokeWidth="16"
            fill="none"
          />

          {/* Progress arc */}
          <circle
            ref={circleRef}
            cx="100"
            cy="100"
            r={CIRCLE_R}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeDashoffset={CIRCLE_CIRCUMFERENCE}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />

          {/* Score text */}
          <text
            x="100"
            y="95"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={config.color}
            fontFamily="Inter, sans-serif"
            fontWeight="800"
            fontSize="34"
          >
            {score.toFixed(1)}%
          </text>
          <text
            x="100"
            y="122"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={config.color}
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            fontSize="11"
            letterSpacing="3"
          >
            {config.label}
          </text>
        </svg>
      </div>

      {/* Sub-metrics */}
      <div className="w-full grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Score", value: `${score.toFixed(1)}%`, color: config.textClass },
          { label: "Risk", value: risk, color: config.textClass },
          {
            label: "Grade",
            value: score >= 90 ? "A+" : score >= 75 ? "B" : score >= 55 ? "C" : "F",
            color: config.textClass,
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <span className={clsx("font-bold text-sm", color)}>{value}</span>
            <span className="text-forest/50 text-[10px] uppercase tracking-wider font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar mini */}
      <div className="w-full">
        <div className="flex justify-between text-[10px] text-forest/50 mb-1.5 font-medium">
          <span>DANGER</span>
          <span>SAFE</span>
        </div>
        <div className="h-2 w-full bg-cream rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${score}%`,
              background: `linear-gradient(90deg, ${config.gradient[0]}, ${config.gradient[1]})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
