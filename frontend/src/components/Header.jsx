import { Dna, Shield, Github, BookOpen, Activity } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-sage bg-cream/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-forest shadow-sm">
              <Dna className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-forest text-lg tracking-tight">
                CRISPR<span className="text-sage-dark">-Guard</span>
              </span>
              <span className="text-forest/50 text-[10px] font-medium uppercase tracking-widest">
                Genomic Intelligence Platform
              </span>
            </div>
          </div>

          {/* Center Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { icon: Activity, label: "Analysis" },
              { icon: Shield, label: "Safety DB" },
              { icon: BookOpen, label: "Documentation" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-forest/70 hover:text-forest hover:bg-mint text-sm font-medium transition-all duration-150"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-mint border border-sage px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-sage-dark animate-pulse-slow" />
              <span className="text-forest text-xs font-semibold">API Online</span>
            </div>

            {/* Version badge */}
            <span className="hidden lg:block bg-butter text-forest text-[10px] font-bold px-2.5 py-1 rounded-full border border-butter-dark tracking-wide">
              v1.0 BETA
            </span>

            {/* GitHub */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-forest/60 hover:text-forest hover:bg-mint transition-colors duration-150"
              title="View source on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
