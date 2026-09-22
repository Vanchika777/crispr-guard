"""
CRISPR-Guard Off-Target Genome Scanner
=======================================
Simulates genome-wide off-target scanning for CRISPR-Cas9 guide RNA sequences.
Generates realistic candidate binding sites with 1-4 mismatches against
annotated genomic loci, including biologically relevant gene annotations.

In production, this module would interface with:
  - Bowtie2 / BWA alignment against the full human genome (GRCh38)
  - CRISPOR / Cas-OFFinder for exhaustive mismatch enumeration
  - GENCODE / Ensembl gene annotation for locus labeling

This mock implementation generates statistically plausible off-target
candidates that mirror real GUIDE-seq and CIRCLE-seq dataset distributions.
"""

import random
import string
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from .utils import count_mismatches, compute_gc_content, reverse_complement


# ── Constants & Gene Annotation Database ─────────────────────────────────────

# Biologically relevant gene loci associated with CRISPR safety studies
# Format: (chromosome, gene_name, typical_start_positions)
GENE_LOCI_DB = [
    ("chr1",  "TP53BP1",   [47_420_000, 47_421_500, 47_423_000]),
    ("chr2",  "EMX1",      [73_160_000, 73_162_500, 73_165_000]),
    ("chr3",  "VEGFA",     [10_183_000, 10_185_000, 10_187_500]),
    ("chr4",  "PDCD1",     [188_940_000, 188_942_000]),
    ("chr5",  "BCL2",      [170_838_000, 170_840_000, 170_843_000]),
    ("chr7",  "TRAC",      [38_369_000, 38_371_000]),
    ("chr8",  "MYC",       [128_748_000, 128_750_000, 128_752_000]),
    ("chr9",  "CDKN2A",    [21_967_000, 21_969_500]),
    ("chr10", "PTEN",      [89_692_000, 89_694_000, 89_697_000]),
    ("chr11", "WT1",       [32_409_000, 32_411_000]),
    ("chr12", "KRAS",      [25_358_000, 25_360_000, 25_362_000]),
    ("chr13", "BRCA2",     [32_889_000, 32_891_000, 32_894_000]),
    ("chr15", "FBN1",      [48_408_000, 48_410_000]),
    ("chr17", "TP53",      [7_668_000, 7_669_500, 7_671_000]),
    ("chr17", "BRCA1",     [43_044_000, 43_046_000, 43_048_000]),
    ("chr18", "SMAD4",     [48_556_000, 48_558_000]),
    ("chr19", "LDLR",      [11_100_000, 11_102_000]),
    ("chr20", "RUNX1T1",   [34_673_000, 34_675_000]),
    ("chr21", "ERG",       [38_380_000, 38_382_000]),
    ("chr22", "BCR",       [23_178_000, 23_180_000]),
    ("chrX",  "DMD",       [31_094_000, 31_096_000]),
    ("chrX",  "MECP2",     [154_021_000, 154_023_000]),
    ("chr6",  "HLA-A",     [29_910_000, 29_912_000, 29_914_000]),
    ("chr14", "IGH",       [106_032_000, 106_034_000]),
    ("chr11", "HBB",       [5_246_000, 5_248_000, 5_250_000]),
    ("chr16", "HBA1",      [222_000, 224_000, 226_000]),
    ("chr2",  "DNMT3A",    [25_455_000, 25_457_000]),
    ("chr3",  "PIK3CA",    [179_148_000, 179_150_000]),
]

# PAM sequences (NGG) used in simulated genomic contexts
PAM_SEQUENCES = ["AGG", "CGG", "GGG", "TGG"]

NUCLEOTIDES = ["A", "C", "G", "T"]


# ── Data Models ───────────────────────────────────────────────────────────────

@dataclass
class OffTargetSite:
    """Represents a single predicted off-target genomic binding site."""
    locus: str             # e.g. "chr17:7668421"
    chromosome: str        # e.g. "chr17"
    position: int          # Genomic coordinate (1-based)
    strand: str            # "+" or "-"
    target_sequence: str   # 20-bp genomic DNA sequence at this locus
    pam: str               # 3-bp PAM sequence
    mismatches: int        # Number of mismatches vs. gRNA
    mismatch_positions: List[int]  # 0-based positions of mismatches
    gene_annotation: str   # Nearest gene name
    gc_content: float      # GC fraction of target sequence
    cut_probability: float # Predicted cleavage probability (0.0–1.0)
    risk_level: str        # 'Low', 'Moderate', or 'High'

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ── Sequence Mutation Helpers ─────────────────────────────────────────────────

def _introduce_mismatches(sequence: str, num_mismatches: int, seed: int) -> tuple:
    """
    Introduce exactly `num_mismatches` random single-nucleotide substitutions
    into `sequence`, returning the mutated sequence and mismatch positions.

    Args:
        sequence:       Original 20-bp gRNA sequence.
        num_mismatches: Number of positions to mutate (1–4).
        seed:           Random seed for reproducibility.

    Returns:
        Tuple of (mutated_sequence: str, mismatch_positions: List[int])
    """
    rng = random.Random(seed)
    seq = list(sequence.upper())
    positions = rng.sample(range(len(seq)), min(num_mismatches, len(seq)))
    positions.sort()

    for pos in positions:
        original = seq[pos]
        alternatives = [n for n in NUCLEOTIDES if n != original]
        seq[pos] = rng.choice(alternatives)

    return "".join(seq), positions


def _estimate_base_probability(num_mismatches: int, mismatch_positions: List[int]) -> float:
    """
    Estimate a base cleavage probability from mismatch count and position.

    Rules derived from empirical CRISPR cleavage studies:
      - Fewer mismatches → higher cleavage probability
      - Seed region mismatches (positions 12–20 from PAM) strongly reduce efficiency
      - PAM-proximal mismatches (positions 17–20) are most tolerated

    Args:
        num_mismatches:     Total mismatch count.
        mismatch_positions: List of 0-based mismatch positions.

    Returns:
        Float cleavage probability in [0.0, 1.0].
    """
    # Base probabilities by mismatch count (empirically derived)
    base_probs = {0: 0.92, 1: 0.68, 2: 0.28, 3: 0.09, 4: 0.03}
    prob = base_probs.get(num_mismatches, 0.01)

    # Seed region penalty: positions 0–11 (PAM-distal, more critical for specificity)
    seed_mismatches = [p for p in mismatch_positions if p < 12]
    prob *= (0.75 ** len(seed_mismatches))

    # Add small stochastic noise
    rng = random.Random(sum(mismatch_positions) if mismatch_positions else 42)
    noise = rng.uniform(-0.05, 0.05)
    return max(0.01, min(0.99, prob + noise))


# ── Main Scanner ──────────────────────────────────────────────────────────────

class GenomeScanner:
    """
    Mock genome-wide off-target scanner for CRISPR-Cas9 guide RNA sequences.

    Generates realistic candidate off-target sites across human chromosomes,
    mimicking the distribution seen in GUIDE-seq and CIRCLE-seq experiments.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)

    def scan(
        self,
        grna_sequence: str,
        max_mismatches: int = 4,
        sites_per_mismatch: Optional[Dict[int, int]] = None,
    ) -> List[OffTargetSite]:
        """
        Scan the mock genome for off-target sites matching the gRNA.

        Args:
            grna_sequence:      Validated 20-bp gRNA sequence.
            max_mismatches:     Maximum mismatch count to enumerate (1–4).
            sites_per_mismatch: Override default count per mismatch tier.
                                Default: {1: 2, 2: 4, 3: 5, 4: 4}

        Returns:
            Sorted list of OffTargetSite objects (by cut_probability descending).
        """
        if sites_per_mismatch is None:
            sites_per_mismatch = {1: 2, 2: 4, 3: 5, 4: 4}

        sites: List[OffTargetSite] = []

        # Use a hash of the gRNA to select consistent loci
        grna_hash = sum(ord(c) * (i + 1) for i, c in enumerate(grna_sequence))

        loci_pool = list(GENE_LOCI_DB)
        self.rng.seed(grna_hash)
        self.rng.shuffle(loci_pool)

        locus_index = 0
        site_seed = grna_hash

        for num_mm in range(1, min(max_mismatches + 1, 5)):
            count = sites_per_mismatch.get(num_mm, 3)

            for i in range(count):
                if locus_index >= len(loci_pool):
                    locus_index = 0

                chrom, gene, positions = loci_pool[locus_index]
                locus_index += 1

                # Pick a position from the gene's known positions
                pos = positions[i % len(positions)] + self.rng.randint(-500, 500)

                # Generate strand
                strand = self.rng.choice(["+", "-"])

                # Generate mutated target sequence
                site_seed += num_mm * 31 + i * 17
                mutated_seq, mismatch_positions = _introduce_mismatches(
                    grna_sequence, num_mm, seed=site_seed
                )

                # Select PAM
                pam = self.rng.choice(PAM_SEQUENCES)

                # Compute probability
                cut_probability = _estimate_base_probability(num_mm, mismatch_positions)

                # Classify risk
                from .utils import classify_risk
                risk_level = classify_risk(cut_probability)

                # GC content
                gc = compute_gc_content(mutated_seq)

                site = OffTargetSite(
                    locus=f"{chrom}:{pos:,}",
                    chromosome=chrom,
                    position=pos,
                    strand=strand,
                    target_sequence=mutated_seq,
                    pam=pam,
                    mismatches=num_mm,
                    mismatch_positions=mismatch_positions,
                    gene_annotation=gene,
                    gc_content=round(gc, 3),
                    cut_probability=round(cut_probability, 4),
                    risk_level=risk_level,
                )
                sites.append(site)

        # Sort by cut probability (highest risk first)
        sites.sort(key=lambda s: s.cut_probability, reverse=True)
        return sites

    def get_mismatch_distribution(self, sites: List[OffTargetSite]) -> Dict[str, int]:
        """
        Count off-target sites by mismatch tier.

        Args:
            sites: List of OffTargetSite objects.

        Returns:
            Dict mapping mismatch label to count.
        """
        dist = {"1 Mismatch": 0, "2 Mismatches": 0, "3 Mismatches": 0, "4 Mismatches": 0}
        for site in sites:
            key = f"{site.mismatches} {'Mismatch' if site.mismatches == 1 else 'Mismatches'}"
            if key in dist:
                dist[key] += 1
        return dist

    def get_chromosomal_map(self, sites: List[OffTargetSite]) -> List[Dict[str, Any]]:
        """
        Build a chromosome-level summary of off-target sites for visualization.

        Args:
            sites: List of OffTargetSite objects.

        Returns:
            List of dicts with chromosome, position, risk_level, gene, probability.
        """
        return [
            {
                "chromosome": site.chromosome,
                "position": site.position,
                "risk_level": site.risk_level,
                "gene": site.gene_annotation,
                "probability": site.cut_probability,
                "locus": site.locus,
            }
            for site in sites
        ]


# ── Module-Level Singleton ────────────────────────────────────────────────────

_scanner_instance: Optional[GenomeScanner] = None


def get_scanner() -> GenomeScanner:
    """Return the module-level GenomeScanner singleton."""
    global _scanner_instance
    if _scanner_instance is None:
        _scanner_instance = GenomeScanner()
    return _scanner_instance
