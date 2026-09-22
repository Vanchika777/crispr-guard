"""
CRISPR-Guard FastAPI Application
=================================
REST API server for CRISPR-Cas9 off-target risk prediction.

Endpoints:
  POST /api/v1/predict   — Main prediction endpoint
  GET  /api/v1/health    — Health check
  GET  /api/v1/examples  — Sample gRNA sequences for testing

Startup:
  - Loads trained PyTorch model weights from 'crispr_guard_model.pt'
  - Falls back to auto-generated mock weights if trained file is absent
  - Initializes GenomeScanner singleton

CORS is enabled for http://localhost:3000 (Next.js dev server).
"""

import os
import logging
import time
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Optional

import torch
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from .model import CRISPRGuardNet, load_model, create_mock_weights
from .utils import (
    validate_grna_sequence,
    SequenceValidationError,
    encode_batch,
    compute_safety_score,
    classify_risk,
    compute_gc_content,
    count_mismatches,
)
from .off_target_search import get_scanner, OffTargetSite

# ── Logging Configuration ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("crispr_guard")

# ── File Paths ────────────────────────────────────────────────────────────────

APP_DIR = Path(__file__).parent
TRAINED_WEIGHTS_PATH = APP_DIR.parent / "crispr_guard_model.pt"
MOCK_WEIGHTS_PATH = APP_DIR / "mock_weights.pt"

# ── Global Model State ────────────────────────────────────────────────────────

_model: Optional[CRISPRGuardNet] = None
_device: str = "cpu"


def _load_or_create_model() -> CRISPRGuardNet:
    """
    Load trained model weights or fall back to mock weights.

    Priority:
      1. Trained weights at crispr_guard_model.pt (from Colab training)
      2. Existing mock weights at mock_weights.pt
      3. Newly generated mock weights (random initialization)

    Returns:
        CRISPRGuardNet model ready for inference.
    """
    if TRAINED_WEIGHTS_PATH.exists():
        logger.info(f"✅ Loading trained model weights: {TRAINED_WEIGHTS_PATH}")
        try:
            model = load_model(str(TRAINED_WEIGHTS_PATH), device=_device)
            logger.info("✅ Trained model loaded successfully.")
            return model
        except Exception as e:
            logger.warning(f"⚠️  Failed to load trained weights ({e}). Falling back to mock.")

    if MOCK_WEIGHTS_PATH.exists():
        logger.info(f"🔧 Loading existing mock weights: {MOCK_WEIGHTS_PATH}")
        try:
            model = load_model(str(MOCK_WEIGHTS_PATH), device=_device)
            logger.info("🔧 Mock model loaded from existing file.")
            return model
        except Exception as e:
            logger.warning(f"⚠️  Failed to load mock weights ({e}). Regenerating.")

    logger.warning("⚠️  No weights found. Auto-generating mock weights for development.")
    model = create_mock_weights(str(MOCK_WEIGHTS_PATH))
    logger.info(f"🔧 Mock weights saved to: {MOCK_WEIGHTS_PATH}")
    return model


# ── Lifespan (Startup / Shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan handler for startup and shutdown events."""
    global _model, _device

    # Startup
    logger.info("🧬 CRISPR-Guard API starting up...")
    _device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"🖥️  Using device: {_device.upper()}")

    _model = _load_or_create_model()
    _model.to(_device)
    _model.eval()

    # Initialize genome scanner
    get_scanner()
    logger.info("🔬 Genome scanner initialized.")
    logger.info("✅ CRISPR-Guard API ready.")

    yield

    # Shutdown
    logger.info("🛑 CRISPR-Guard API shutting down.")


# ── FastAPI Application ────────────────────────────────────────────────────────

app = FastAPI(
    title="CRISPR-Guard API",
    description=(
        "Hybrid AI platform for predicting CRISPR-Cas9 off-target gene editing risks. "
        "Combines 1D CNN + Transformer sequence models with genome-wide mismatch scanning."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS — allow frontend dev and production origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────────

class PredictRequest(BaseModel):
    """Request body for the /predict endpoint."""
    grna_sequence: str = Field(
        ...,
        min_length=20,
        max_length=20,
        description="20-nucleotide guide RNA sequence (only A, C, G, T characters).",
        examples=["GAGTCCGAGCAGAAGAAGAA"],
    )
    max_mismatches: int = Field(
        default=4,
        ge=1,
        le=4,
        description="Maximum number of mismatches to scan for (1–4).",
    )

    @field_validator("grna_sequence")
    @classmethod
    def validate_sequence(cls, v: str) -> str:
        try:
            return validate_grna_sequence(v)
        except SequenceValidationError as e:
            raise ValueError(str(e))


class MismatchPosition(BaseModel):
    index: int
    grna_base: str
    target_base: str


class OffTargetResult(BaseModel):
    locus: str
    chromosome: str
    position: int
    strand: str
    target_sequence: str
    pam: str
    mismatches: int
    mismatch_positions: List[int]
    gene_annotation: str
    gc_content: float
    cut_probability: float
    risk_level: str


class MismatchDistribution(BaseModel):
    one_mismatch: int = Field(alias="1_mismatch")
    two_mismatches: int = Field(alias="2_mismatches")
    three_mismatches: int = Field(alias="3_mismatches")
    four_mismatches: int = Field(alias="4_mismatches")

    model_config = {"populate_by_name": True}


class ChromosomePin(BaseModel):
    chromosome: str
    position: int
    risk_level: str
    gene: str
    probability: float
    locus: str


class PredictResponse(BaseModel):
    grna_sequence: str
    safety_score: float
    overall_risk: str
    total_off_targets: int
    high_risk_count: int
    moderate_risk_count: int
    low_risk_count: int
    mismatch_distribution: dict
    chromosomal_map: List[ChromosomePin]
    off_target_sites: List[OffTargetResult]
    ai_summary: str
    processing_time_ms: float


# ── Inference Engine ──────────────────────────────────────────────────────────

def _run_batch_inference(
    grna: str,
    sites: List[OffTargetSite],
) -> List[float]:
    """
    Run the PyTorch model on all off-target candidate sites.

    Args:
        grna:  Reference gRNA sequence.
        sites: List of OffTargetSite candidates.

    Returns:
        List of float probabilities from the model, same length as sites.
    """
    if not sites or _model is None:
        return []

    pairs = [(grna, site.target_sequence) for site in sites]

    try:
        batch_tensor = encode_batch(pairs)           # (N, 8, 20)
        batch_tensor = batch_tensor.to(_device)

        with torch.no_grad():
            outputs = _model(batch_tensor)           # (N, 1)
            probs = outputs.squeeze(-1).cpu().numpy().tolist()  # [N]

        return [float(p) for p in probs]

    except Exception as e:
        logger.error(f"Inference error: {e}")
        # Fall back to heuristic probabilities if model fails
        return [site.cut_probability for site in sites]


def _generate_ai_summary(
    grna: str,
    safety_score: float,
    total_sites: int,
    high_count: int,
    moderate_count: int,
) -> str:
    """
    Generate a plain-language biological safety summary for the analysis result.

    Args:
        grna:          The analyzed gRNA sequence.
        safety_score:  Overall safety percentage.
        total_sites:   Total off-target sites found.
        high_count:    Number of high-risk sites.
        moderate_count: Number of moderate-risk sites.

    Returns:
        Plain-English summary paragraph.
    """
    if safety_score >= 90:
        risk_descriptor = "highly favorable"
        recommendation = (
            "This guide RNA demonstrates excellent specificity with minimal predicted off-target activity. "
            "The low number of potential cleavage sites suggests strong genomic specificity suitable for "
            "therapeutic applications."
        )
    elif safety_score >= 75:
        risk_descriptor = "acceptable"
        recommendation = (
            "This guide RNA shows moderate specificity. While the overall safety profile is satisfactory, "
            f"the presence of {moderate_count} moderate-risk site(s) warrants validation experiments "
            "such as GUIDE-seq or CIRCLE-seq before clinical use."
        )
    elif safety_score >= 55:
        risk_descriptor = "concerning"
        recommendation = (
            f"This guide RNA presents a {risk_descriptor} safety profile. With {high_count} high-risk "
            f"and {moderate_count} moderate-risk off-target site(s) detected, alternative guide RNA "
            "designs or high-fidelity Cas9 variants (eSpCas9, HiFi Cas9) are strongly recommended."
        )
    else:
        risk_descriptor = "high-risk"
        recommendation = (
            f"⚠️ This guide RNA exhibits a {risk_descriptor} safety profile with {high_count} predicted "
            "high-risk off-target cleavage sites. This guide RNA is NOT recommended for therapeutic "
            "applications without extensive redesign. Consider using Cas12a or paired nickase approaches."
        )

    return (
        f"Analysis of gRNA [{grna}] identified {total_sites} potential off-target genomic sites. "
        f"The computed Overall Safety Score is {safety_score:.1f}% — {risk_descriptor}. "
        f"{recommendation} "
        f"Findings: {high_count} high-risk, {moderate_count} moderate-risk, "
        f"{total_sites - high_count - moderate_count} low-risk predicted off-target sites."
    )


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """Health check endpoint confirming API and model status."""
    return {
        "status": "healthy",
        "model_loaded": _model is not None,
        "device": _device,
        "version": "1.0.0",
    }


@app.get("/api/v1/examples", tags=["System"])
async def get_example_sequences():
    """Return example gRNA sequences for testing the prediction endpoint."""
    return {
        "examples": [
            {
                "name": "EMX1 Site 1 (Human EMX1 gene)",
                "grna_sequence": "GAGTCCGAGCAGAAGAAGAA",
                "description": "Validated CRISPR target in the human EMX1 locus",
            },
            {
                "name": "VEGFA Site 3 (Vascular Endothelial Growth Factor)",
                "grna_sequence": "GGTGAGTGAGTGTGTGCGTG",
                "description": "Benchmark off-target site from Tsai et al. GUIDE-seq",
            },
            {
                "name": "HBB (Beta-Globin, Sickle Cell)",
                "grna_sequence": "CTTGCCCCACAGGGCAGTAA",
                "description": "Therapeutic target for sickle cell disease correction",
            },
            {
                "name": "TRAC (T-cell Receptor Alpha Chain)",
                "grna_sequence": "TGTGCTAGACATGAGGTCTA",
                "description": "CAR-T cell engineering target at TCR alpha locus",
            },
        ]
    }


@app.post("/api/v1/predict", response_model=PredictResponse, tags=["Prediction"])
async def predict_off_targets(request: PredictRequest):
    """
    Predict CRISPR-Cas9 off-target risk for a given guide RNA sequence.

    Pipeline:
      1. Validate gRNA input
      2. Scan mock genome for candidate off-target sites (1–4 mismatches)
      3. Run PyTorch model inference on all candidates
      4. Compute overall Safety Score and risk classification
      5. Return structured JSON with all site details and summary
    """
    start_time = time.perf_counter()
    grna = request.grna_sequence

    logger.info(f"🔬 Prediction request: gRNA={grna}, max_mm={request.max_mismatches}")

    # 1. Genome scan
    scanner = get_scanner()
    raw_sites = scanner.scan(
        grna_sequence=grna,
        max_mismatches=request.max_mismatches,
    )
    logger.info(f"   Found {len(raw_sites)} candidate off-target sites.")

    # 2. Run PyTorch inference on all candidates
    model_probs = _run_batch_inference(grna, raw_sites)

    # 3. Update site probabilities with model predictions (blend heuristic + model)
    updated_sites = []
    for i, site in enumerate(raw_sites):
        if i < len(model_probs):
            # Blend: 60% model prediction + 40% heuristic (mismatch-based)
            blended_prob = 0.6 * model_probs[i] + 0.4 * site.cut_probability
            blended_prob = round(max(0.01, min(0.99, blended_prob)), 4)
        else:
            blended_prob = site.cut_probability

        updated_sites.append(OffTargetSite(
            locus=site.locus,
            chromosome=site.chromosome,
            position=site.position,
            strand=site.strand,
            target_sequence=site.target_sequence,
            pam=site.pam,
            mismatches=site.mismatches,
            mismatch_positions=site.mismatch_positions,
            gene_annotation=site.gene_annotation,
            gc_content=site.gc_content,
            cut_probability=blended_prob,
            risk_level=classify_risk(blended_prob),
        ))

    # Re-sort by updated probability
    updated_sites.sort(key=lambda s: s.cut_probability, reverse=True)

    # 4. Compute aggregate statistics
    all_probs = [s.cut_probability for s in updated_sites]
    safety_score = compute_safety_score(all_probs)

    high_count = sum(1 for s in updated_sites if s.risk_level == "High")
    moderate_count = sum(1 for s in updated_sites if s.risk_level == "Moderate")
    low_count = sum(1 for s in updated_sites if s.risk_level == "Low")

    # Overall risk from aggregate
    if high_count >= 2 or safety_score < 55:
        overall_risk = "High"
    elif high_count >= 1 or moderate_count >= 3 or safety_score < 75:
        overall_risk = "Moderate"
    else:
        overall_risk = "Low"

    # 5. Mismatch distribution
    mm_dist = scanner.get_mismatch_distribution(updated_sites)
    mismatch_distribution = {
        "1_mismatch": mm_dist.get("1 Mismatch", 0),
        "2_mismatches": mm_dist.get("2 Mismatches", 0),
        "3_mismatches": mm_dist.get("3 Mismatches", 0),
        "4_mismatches": mm_dist.get("4 Mismatches", 0),
    }

    # 6. Chromosomal map
    chromosomal_map = scanner.get_chromosomal_map(updated_sites)

    # 7. AI summary
    ai_summary = _generate_ai_summary(
        grna, safety_score, len(updated_sites), high_count, moderate_count
    )

    elapsed_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"   ✅ Prediction complete: safety={safety_score}%, "
        f"sites={len(updated_sites)}, time={elapsed_ms:.1f}ms"
    )

    # 8. Build response
    off_target_results = [
        OffTargetResult(
            locus=s.locus,
            chromosome=s.chromosome,
            position=s.position,
            strand=s.strand,
            target_sequence=s.target_sequence,
            pam=s.pam,
            mismatches=s.mismatches,
            mismatch_positions=s.mismatch_positions,
            gene_annotation=s.gene_annotation,
            gc_content=s.gc_content,
            cut_probability=s.cut_probability,
            risk_level=s.risk_level,
        )
        for s in updated_sites
    ]

    chromosomal_pins = [
        ChromosomePin(
            chromosome=pin["chromosome"],
            position=pin["position"],
            risk_level=pin["risk_level"],
            gene=pin["gene"],
            probability=pin["probability"],
            locus=pin["locus"],
        )
        for pin in chromosomal_map
    ]

    return PredictResponse(
        grna_sequence=grna,
        safety_score=safety_score,
        overall_risk=overall_risk,
        total_off_targets=len(updated_sites),
        high_risk_count=high_count,
        moderate_risk_count=moderate_count,
        low_risk_count=low_count,
        mismatch_distribution=mismatch_distribution,
        chromosomal_map=chromosomal_pins,
        off_target_sites=off_target_results,
        ai_summary=ai_summary,
        processing_time_ms=round(elapsed_ms, 2),
    )


# ── Global Error Handlers ─────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error. Please check server logs.", "status_code": 500},
    )


# ── Root Redirect ─────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return {"message": "CRISPR-Guard API v1.0.0 — Visit /docs for interactive API documentation."}
