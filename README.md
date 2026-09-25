# 🧬 CRISPR-Guard

> **An AI-powered platform for genome-wide CRISPR-Cas9 off-target risk prediction & interactive visualization.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![React](https://img.shields.io/badge/react-18.0-61dafb.svg)
![PyTorch](https://img.shields.io/badge/pytorch-2.3+-ee4c2c.svg)

---

## 📌 Project Overview

In CRISPR-Cas9 genome editing, a 20-nucleotide guide RNA (gRNA) directs the Cas9 endonuclease to cut target DNA adjacent to a Protospacer Adjacent Motif (PAM: `NGG`). However, Cas9 can accidentally cut unintended genomic sites containing 1 to 4 nucleotide mismatches, potentially triggering harmful mutations or deactivating tumor suppressor genes.

**CRISPR-Guard** serves as an *in silico* safety shield. It evaluates off-target cleavage risks using a hybrid deep learning model and visualizes genomic risk profiles through an intuitive web interface.

---

## ✨ Key Features

- **Deep Learning Engine (`CRISPRGuardNet`):** Combines 1D-CNN feature extractors with a Transformer Encoder (8x20 one-hot tensor input) to accurately compute off-target cleavage probability ($P_{\text{cut}}$).
- **Off-Target Scanner:** Exhaustively searches candidate loci for 1–4 nucleotide mismatches against target gRNAs across human gene profiles (*TP53*, *EMX1*, *VEGFA*, *KRAS*, *HBB*).
- **Interactive UI Dashboard:** Built with React 18 & Vite, featuring:
  - Sequence mismatch color-coded highlighting
  - Radial Safety Gauge score indicator
  - 23-Chromosome Genomic Distribution map
  - Sortable mismatch data table

---

## 🛠️ Architecture & Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons |
| **Backend API** | Python 3.11, FastAPI, Uvicorn, BioPython, NumPy |
| **ML Framework** | PyTorch, Scikit-Learn |
| **Training Pipeline** | PyTorch, Google Colab GPU |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
..\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
