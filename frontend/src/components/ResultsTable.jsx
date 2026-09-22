import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  Search,
  ExternalLink,
  Filter,
  Table2,
} from "lucide-react";
import clsx from "clsx";

// ── Helper Components ──────────────────────────────────────────────────────────

function RiskBadge({ risk }) {
  if (risk === "High")
    return <span className="badge-high">🔴 HIGH</span>;
  if (risk === "Moderate")
    return <span className="badge-moderate">🟡 MOD</span>;
  return <span className="badge-low">🟢 LOW</span>;
}

function ProbabilityBar({ value }) {
  const pct = (value * 100).toFixed(1);
  const color =
    value >= 0.65 ? "#8B2626" : value >= 0.30 ? "#EB7D00" : "#2C5745";
  const bg =
    value >= 0.65 ? "#F5DEDE" : value >= 0.30 ? "#FFDDB0" : "#E8F5E9";

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: bg }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="font-bold text-xs tabular-nums w-10 text-right"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

function DNAWithMismatches({ grna, target, mismatchPositions = [] }) {
  const mmSet = new Set(mismatchPositions);

  return (
    <span className="font-mono text-xs tracking-widest">
      {target.split("").map((char, i) => (
        <span
          key={i}
          className={mmSet.has(i) ? "dna-mismatch" : "dna-match"}
          title={
            mmSet.has(i)
              ? `Mismatch at pos ${i + 1}: gRNA has ${grna[i]}, target has ${char}`
              : undefined
          }
        >
          {char}
        </span>
      ))}
    </span>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronUp className="w-3 h-3 opacity-20" />;
  return dir === "asc" ? (
    <ChevronUp className="w-3 h-3 text-forest" />
  ) : (
    <ChevronDown className="w-3 h-3 text-forest" />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ResultsTable({ sites = [], grna, isLoading }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("cut_probability");
  const [sortDir, setSortDir] = useState("desc");
  const [riskFilter, setRiskFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 8;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let data = [...sites];

    // Risk filter
    if (riskFilter !== "All") {
      data = data.filter((s) => s.risk_level === riskFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (s) =>
          s.gene_annotation.toLowerCase().includes(q) ||
          s.chromosome.toLowerCase().includes(q) ||
          s.locus.toLowerCase().includes(q) ||
          s.target_sequence.toLowerCase().includes(q)
      );
    }

    // Sort
    data.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "cut_probability") cmp = a.cut_probability - b.cut_probability;
      else if (sortKey === "mismatches") cmp = a.mismatches - b.mismatches;
      else if (sortKey === "locus") cmp = a.locus.localeCompare(b.locus);
      else if (sortKey === "risk_level") {
        const ord = { High: 2, Moderate: 1, Low: 0 };
        cmp = (ord[a.risk_level] ?? 0) - (ord[b.risk_level] ?? 0);
      } else if (sortKey === "gene_annotation") {
        cmp = a.gene_annotation.localeCompare(b.gene_annotation);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return data;
  }, [sites, searchQuery, sortKey, sortDir, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="card card-hover">
        <div className="h-4 w-48 skeleton mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 skeleton rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const COLUMNS = [
    { key: "locus", label: "Genomic Locus", sortable: true },
    { key: null, label: "Target Sequence", sortable: false },
    { key: "mismatches", label: "Mismatches", sortable: true },
    { key: "cut_probability", label: "Cut Probability", sortable: true },
    { key: "gene_annotation", label: "Gene", sortable: true },
    { key: null, label: "GC%", sortable: false },
    { key: "risk_level", label: "Risk Level", sortable: true },
  ];

  return (
    <div className="card card-hover flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-forest/10 flex items-center justify-center">
            <Table2 className="w-3.5 h-3.5 text-forest" />
          </div>
          <div>
            <h3 className="section-title text-sm">Predicted Off-Target Sites</h3>
            <p className="section-subtitle text-[11px]">
              {filtered.length} site{filtered.length !== 1 ? "s" : ""} found
              {riskFilter !== "All" ? ` (filtered: ${riskFilter})` : ""}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Risk filter pills */}
          <div className="flex gap-1 bg-cream rounded-xl p-1 border border-sage">
            {["All", "High", "Moderate", "Low"].map((f) => (
              <button
                key={f}
                id={`filter-${f.toLowerCase()}`}
                onClick={() => { setRiskFilter(f); setCurrentPage(1); }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150",
                  riskFilter === f
                    ? f === "High"
                      ? "bg-crimson text-white"
                      : f === "Moderate"
                      ? "bg-amber-warn text-white"
                      : f === "Low"
                      ? "bg-sage text-forest"
                      : "bg-forest text-white"
                    : "text-forest/50 hover:text-forest hover:bg-mint"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest/40" />
            <input
              id="results-search"
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search gene, chromosome..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-sage bg-white text-xs text-forest
                         outline-none focus:border-skyblue-dark focus:ring-1 focus:ring-skyblue
                         w-48 placeholder:text-forest/30"
              aria-label="Search off-target sites"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-sage">
        <table className="w-full text-sm" aria-label="Off-target sites results table">
          <thead>
            <tr className="bg-mint border-b border-sage">
              {COLUMNS.map(({ key, label, sortable }) => (
                <th
                  key={label}
                  className={clsx(
                    "px-3 py-3 text-left text-[10px] font-bold text-forest/70 uppercase tracking-wider",
                    sortable && "cursor-pointer hover:text-forest select-none"
                  )}
                  onClick={() => sortable && key && handleSort(key)}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortable && key && (
                      <SortIcon active={sortKey === key} dir={sortDir} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sage/30">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-forest/40">
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No results match your filters.</p>
                  <p className="text-xs mt-1">Try adjusting the risk filter or search term.</p>
                </td>
              </tr>
            ) : (
              paginated.map((site, i) => (
                <tr
                  key={`${site.locus}-${i}`}
                  className={clsx(
                    "table-row-hover animate-in",
                    site.risk_level === "High" && "bg-crimson-50/30"
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  {/* Locus */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-forest font-semibold">
                        {site.locus}
                      </span>
                      <span
                        className={clsx(
                          "text-[9px] font-bold px-1 rounded",
                          site.strand === "+"
                            ? "bg-sage/60 text-forest"
                            : "bg-butter text-forest"
                        )}
                      >
                        {site.strand}
                      </span>
                    </div>
                    <span className="text-[10px] text-forest/40 font-medium block mt-0.5">
                      {site.chromosome}
                    </span>
                  </td>

                  {/* DNA Sequence with mismatch highlights */}
                  <td className="px-3 py-2.5">
                    <DNAWithMismatches
                      grna={grna}
                      target={site.target_sequence}
                      mismatchPositions={site.mismatch_positions}
                    />
                    <span className="text-[10px] text-forest/40 ml-1 font-mono">{site.pam}</span>
                  </td>

                  {/* Mismatches */}
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={clsx(
                        "font-bold text-sm tabular-nums",
                        site.mismatches === 1
                          ? "text-crimson"
                          : site.mismatches === 2
                          ? "text-amber-warn"
                          : "text-forest/60"
                      )}
                    >
                      {site.mismatches}
                    </span>
                    <span className="text-forest/30 text-[10px] ml-0.5">MM</span>
                  </td>

                  {/* Cut Probability bar */}
                  <td className="px-3 py-2.5">
                    <ProbabilityBar value={site.cut_probability} />
                  </td>

                  {/* Gene */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs text-forest italic">
                        {site.gene_annotation}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-forest/30" />
                    </div>
                  </td>

                  {/* GC Content */}
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-forest/60 font-mono tabular-nums">
                      {(site.gc_content * 100).toFixed(0)}%
                    </span>
                  </td>

                  {/* Risk Badge */}
                  <td className="px-3 py-2.5">
                    <RiskBadge risk={site.risk_level} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-forest/60">
          <span>
            Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} sites
          </span>
          <div className="flex items-center gap-1">
            <button
              id="pagination-prev"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-sage text-forest/70 hover:text-forest hover:bg-mint disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                id={`pagination-page-${page}`}
                onClick={() => setCurrentPage(page)}
                className={clsx(
                  "w-7 h-7 rounded-lg text-xs font-bold transition-all",
                  currentPage === page
                    ? "bg-forest text-white"
                    : "text-forest/60 hover:bg-mint hover:text-forest"
                )}
              >
                {page}
              </button>
            ))}
            <button
              id="pagination-next"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-sage text-forest/70 hover:text-forest hover:bg-mint disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
