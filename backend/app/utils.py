"""
CRISPR-Guard Utility Functions
==============================
DNA sequence one-hot encoding, PAM validation, and sequence preprocessing
helpers for the CRISPR-Cas9 off-target prediction pipeline.
"""

import re
import numpy as np
import torch
from typing import Tuple, Optional


# ── Constants ─────────────────────────────────────────────────────────────────

VALID_NUCLEOTIDES = set("ACGT")
GRNA_LENGTH = 20

# One-hot encoding map: A=0, C=1, G=2, T=3
NUCLEOTIDE_INDEX = {"A": 0, "C": 1, "G": 2, "T": 3}

# IUPAC ambiguity codes mapped to canonical bases for fuzzy matching
IUPAC_MAP = {
    "R": ["A", "G"],
    "Y": ["C", "T"],
    "S": ["G", "C"],
    "W": ["A", "T"],
    "K": ["G", "T"],
    "M": ["A", "C"],
    "B": ["C", "G", "T"],
    "D": ["A", "G", "T"],
    "H": ["A", "C", "T"],
    "V": ["A", "C", "G"],
    "N": ["A", "C", "G", "T"],
}


# ── Validation Functions ──────────────────────────────────────────────────────

class SequenceValidationError(ValueError):
    """Raised when a gRNA or target DNA sequence fails validation."""
    pass


def validate_grna_sequence(grna: str) -> str:
    """
    Validate a guide RNA sequence for CRISPR-Cas9 analysis.

    Rules:
      - Must be exactly 20 nucleotides long.
      - Must contain only A, C, G, T characters (case insensitive).
      - Whitespace is stripped automatically.

    Args:
        grna: Input gRNA sequence string.

    Returns:
        Uppercased, stripped, validated gRNA string.

    Raises:
        SequenceValidationError: If the sequence is invalid.
    """
    grna = grna.strip().upper()

    if not grna:
        raise SequenceValidationError("gRNA sequence cannot be empty.")

    if len(grna) != GRNA_LENGTH:
        raise SequenceValidationError(
            f"gRNA sequence must be exactly {GRNA_LENGTH} nucleotides. "
            f"Received {len(grna)} characters: '{grna}'"
        )

    invalid_chars = set(grna) - VALID_NUCLEOTIDES
    if invalid_chars:
        raise SequenceValidationError(
            f"gRNA sequence contains invalid characters: {sorted(invalid_chars)}. "
            f"Only A, C, G, T are permitted."
        )

    return grna


def validate_pam(pam: str) -> bool:
    """
    Validate a PAM sequence for SpCas9 (NGG PAM).

    Args:
        pam: 3-character PAM sequence string.

    Returns:
        True if PAM matches NGG pattern, False otherwise.
    """
    pam = pam.strip().upper()
    if len(pam) != 3:
        return False
    # SpCas9 PAM: NGG (any nucleotide followed by two Gs)
    return bool(re.match(r"^[ACGT]GG$", pam))


def has_valid_ngg_pam(sequence: str) -> bool:
    """
    Check whether the 3 characters immediately following a 20-bp protospacer
    form an NGG PAM. Expects a 23-bp or longer sequence.

    Args:
        sequence: DNA sequence (≥23 bp) with gRNA region + PAM.

    Returns:
        True if bases 21-23 constitute an NGG PAM.
    """
    if len(sequence) < 23:
        return False
    pam = sequence[20:23].upper()
    return validate_pam(pam)


# ── One-Hot Encoding ──────────────────────────────────────────────────────────

def nucleotide_to_onehot(nucleotide: str) -> np.ndarray:
    """
    Convert a single nucleotide character to a 4-element one-hot vector.

    Encoding: A=[1,0,0,0], C=[0,1,0,0], G=[0,0,1,0], T=[0,0,0,1]

    Args:
        nucleotide: Single character ('A', 'C', 'G', or 'T').

    Returns:
        NumPy array of shape (4,) with one-hot encoding.

    Raises:
        ValueError: If nucleotide is not in {A, C, G, T}.
    """
    if nucleotide not in NUCLEOTIDE_INDEX:
        raise ValueError(f"Unknown nucleotide: '{nucleotide}'. Must be A, C, G, or T.")
    vec = np.zeros(4, dtype=np.float32)
    vec[NUCLEOTIDE_INDEX[nucleotide]] = 1.0
    return vec


def sequence_to_matrix(sequence: str) -> np.ndarray:
    """
    Convert a DNA sequence string to a 4×L one-hot matrix.

    Each column represents one nucleotide position; each row represents
    one nucleotide type (A, C, G, T).

    Args:
        sequence: DNA sequence string of length L (only ACGT characters).

    Returns:
        NumPy array of shape (4, L) — float32.
    """
    sequence = sequence.upper()
    L = len(sequence)
    matrix = np.zeros((4, L), dtype=np.float32)
    for i, nuc in enumerate(sequence):
        if nuc in NUCLEOTIDE_INDEX:
            matrix[NUCLEOTIDE_INDEX[nuc], i] = 1.0
        # Ambiguous bases default to all-zeros column (unknown)
    return matrix


def encode_sequence(grna: str, target: str) -> torch.Tensor:
    """
    Encode a gRNA / DNA target pair into a stacked one-hot tensor.

    The gRNA and target are independently one-hot encoded (4×20 each)
    and concatenated along the channel dimension to produce an 8×20 tensor,
    which is the primary input format for CRISPRGuardNet.

    Args:
        grna:   Validated 20-bp gRNA sequence (ACGT only).
        target: 20-bp genomic target DNA sequence (ACGT only, may include
                mismatches relative to gRNA).

    Returns:
        PyTorch tensor of shape (8, 20) — float32.

    Example:
        >>> grna   = "GAGTCCGAGCAGAAGAAGAA"
        >>> target = "GAGTCaGAGCAGAAGAAGAA"  # lowercase = mismatch at pos 5
        >>> tensor = encode_sequence(grna, target.upper())
        >>> tensor.shape
        torch.Size([8, 20])
    """
    if len(grna) != GRNA_LENGTH or len(target) != GRNA_LENGTH:
        raise ValueError(
            f"Both gRNA and target must be exactly {GRNA_LENGTH} bp. "
            f"Got gRNA={len(grna)}, target={len(target)}."
        )

    grna_matrix = sequence_to_matrix(grna)    # shape: (4, 20)
    target_matrix = sequence_to_matrix(target) # shape: (4, 20)

    # Stack along channel axis: (8, 20)
    combined = np.concatenate([grna_matrix, target_matrix], axis=0)
    return torch.tensor(combined, dtype=torch.float32)


def encode_batch(pairs: list) -> torch.Tensor:
    """
    Encode a list of (gRNA, target) pairs into a batched tensor.

    Args:
        pairs: List of (grna_str, target_str) tuples, each 20 bp.

    Returns:
        PyTorch tensor of shape (N, 8, 20) — float32.
    """
    tensors = [encode_sequence(grna, target) for grna, target in pairs]
    return torch.stack(tensors, dim=0)  # shape: (N, 8, 20)


# ── Mismatch Utilities ────────────────────────────────────────────────────────

def count_mismatches(seq1: str, seq2: str) -> int:
    """
    Count the number of positional mismatches between two equal-length strings.

    Args:
        seq1: First DNA sequence string.
        seq2: Second DNA sequence string.

    Returns:
        Integer count of positions where seq1[i] != seq2[i].

    Raises:
        ValueError: If sequences are not the same length.
    """
    if len(seq1) != len(seq2):
        raise ValueError(
            f"Sequences must be the same length. Got {len(seq1)} and {len(seq2)}."
        )
    return sum(a != b for a, b in zip(seq1.upper(), seq2.upper()))


def highlight_mismatches(grna: str, target: str) -> list:
    """
    Identify mismatch positions between gRNA and a target sequence.

    Args:
        grna:   Reference gRNA sequence.
        target: Target DNA sequence to compare.

    Returns:
        List of integer indices (0-based) where mismatches occur.
    """
    return [i for i, (a, b) in enumerate(zip(grna.upper(), target.upper())) if a != b]


def compute_gc_content(sequence: str) -> float:
    """
    Compute the GC content fraction of a DNA sequence.

    Args:
        sequence: DNA sequence string.

    Returns:
        Float in [0.0, 1.0] representing fraction of G+C bases.
    """
    seq = sequence.upper()
    if not seq:
        return 0.0
    gc = sum(1 for nuc in seq if nuc in ("G", "C"))
    return gc / len(seq)


def reverse_complement(sequence: str) -> str:
    """
    Compute the reverse complement of a DNA sequence.

    Args:
        sequence: Input DNA sequence (ACGT).

    Returns:
        Reverse complement string.
    """
    complement_map = {"A": "T", "T": "A", "C": "G", "G": "C"}
    return "".join(complement_map.get(nuc, "N") for nuc in reversed(sequence.upper()))


# ── Safety Scoring ────────────────────────────────────────────────────────────

def classify_risk(probability: float) -> str:
    """
    Classify a cleavage probability into a risk category.

    Thresholds (based on CRISPR off-target literature):
      Low:      probability < 0.30
      Moderate: 0.30 ≤ probability < 0.65
      High:     probability ≥ 0.65

    Args:
        probability: Float in [0.0, 1.0].

    Returns:
        Risk category string: 'Low', 'Moderate', or 'High'.
    """
    if probability >= 0.65:
        return "High"
    elif probability >= 0.30:
        return "Moderate"
    else:
        return "Low"


def compute_safety_score(off_target_probabilities: list) -> float:
    """
    Compute an overall safety score percentage from a list of off-target probabilities.

    Formula: Safety = (1 - weighted_mean_risk) × 100
    Where weighted_mean_risk = mean of all probabilities, with higher-probability
    sites contributing more to the risk calculation.

    Args:
        off_target_probabilities: List of floats in [0.0, 1.0].

    Returns:
        Safety score as float in [0.0, 100.0]. Higher is safer.
    """
    if not off_target_probabilities:
        return 100.0

    probs = np.array(off_target_probabilities, dtype=np.float32)

    # Weighted mean: weight each probability by itself to penalize high-risk sites
    weights = probs + 0.1  # Avoid zero weights
    weighted_mean = float(np.average(probs, weights=weights))

    safety = (1.0 - weighted_mean) * 100.0
    return round(max(0.0, min(100.0, safety)), 1)
