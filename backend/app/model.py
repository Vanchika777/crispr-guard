"""
CRISPR-Guard PyTorch Model Architecture
=======================================
Hybrid 1D CNN + Transformer Encoder for CRISPR-Cas9 off-target prediction.
Binary classification: outputs cleavage probability [0.0, 1.0].

Architecture:
  Input: One-hot encoded gRNA/DNA pair → shape (batch, 8, 20)
    - 4 channels for gRNA nucleotides
    - 4 channels for DNA target nucleotides
  Conv Block 1: Conv1d(8→64, kernel=3, padding=1) → BatchNorm → ReLU → Dropout
  Conv Block 2: Conv1d(64→128, kernel=3, padding=1) → BatchNorm → ReLU → Dropout
  Positional Encoding: Sine-cosine embeddings over sequence length
  Transformer Encoder: 2 heads, d_model=128, dim_feedforward=256, 2 layers
  Classifier: Linear(128→64) → ReLU → Linear(64→1) → Sigmoid
"""

import torch
import torch.nn as nn
import math


class PositionalEncoding(nn.Module):
    """Sine-cosine positional encoding for the Transformer block."""

    def __init__(self, d_model: int, max_len: int = 20, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)

        # Precompute positional encoding matrix: shape (max_len, d_model)
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2, dtype=torch.float)
            * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        # Shape: (1, max_len, d_model) for broadcasting over batch
        pe = pe.unsqueeze(0)
        self.register_buffer("pe", pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape (batch, seq_len, d_model)
        Returns:
            Tensor of same shape with positional encodings added.
        """
        x = x + self.pe[:, : x.size(1), :]
        return self.dropout(x)


class ConvBlock(nn.Module):
    """1D Convolutional block: Conv1d → BatchNorm1d → ReLU → Dropout."""

    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: int = 3,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv1d(
                in_channels,
                out_channels,
                kernel_size=kernel_size,
                padding=kernel_size // 2,
            ),
            nn.BatchNorm1d(out_channels),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.block(x)


class CRISPRGuardNet(nn.Module):
    """
    Hybrid 1D-CNN + TransformerEncoder model for CRISPR-Cas9 off-target prediction.

    Combines local feature extraction (CNN) with global sequence context
    (Transformer) to model complex guide RNA / target DNA interactions.

    Input Shape:  (batch_size, 8, 20)  — 8-channel one-hot pair encoding
    Output Shape: (batch_size, 1)      — cleavage probability sigmoid
    """

    def __init__(
        self,
        in_channels: int = 8,
        cnn_channels_1: int = 64,
        cnn_channels_2: int = 128,
        d_model: int = 128,
        nhead: int = 2,
        num_encoder_layers: int = 2,
        dim_feedforward: int = 256,
        dropout: float = 0.2,
        seq_len: int = 20,
    ):
        super().__init__()

        # ── Convolutional Feature Extractor ──────────────────────────────────
        self.conv1 = ConvBlock(in_channels, cnn_channels_1, kernel_size=3, dropout=dropout)
        self.conv2 = ConvBlock(cnn_channels_1, cnn_channels_2, kernel_size=3, dropout=dropout)

        # ── Positional Encoding ───────────────────────────────────────────────
        self.positional_encoding = PositionalEncoding(
            d_model=d_model, max_len=seq_len, dropout=dropout
        )

        # ── Transformer Encoder ───────────────────────────────────────────────
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=dim_feedforward,
            dropout=dropout,
            batch_first=True,  # Input shape: (batch, seq, features)
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer, num_layers=num_encoder_layers
        )

        # ── Global Average Pooling over sequence dimension ─────────────────────
        self.global_avg_pool = nn.AdaptiveAvgPool1d(1)

        # ── Classification Head ────────────────────────────────────────────────
        self.classifier = nn.Sequential(
            nn.Linear(d_model, 64),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )

        self._init_weights()

    def _init_weights(self):
        """Kaiming He initialization for Conv layers; Xavier for Linear layers."""
        for module in self.modules():
            if isinstance(module, nn.Conv1d):
                nn.init.kaiming_normal_(module.weight, mode="fan_out", nonlinearity="relu")
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)
            elif isinstance(module, nn.BatchNorm1d):
                nn.init.ones_(module.weight)
                nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass through the hybrid CNN-Transformer network.

        Args:
            x: Input tensor of shape (batch, 8, 20)
               — 8 channels from concatenated one-hot gRNA + DNA pair

        Returns:
            Tensor of shape (batch, 1) with cleavage probabilities in [0, 1]
        """
        # 1. CNN feature extraction: (batch, 8, 20) → (batch, 128, 20)
        x = self.conv1(x)
        x = self.conv2(x)

        # 2. Reshape for Transformer: (batch, 128, 20) → (batch, 20, 128)
        x = x.permute(0, 2, 1)

        # 3. Add positional encodings
        x = self.positional_encoding(x)

        # 4. Transformer encoder: (batch, 20, 128) → (batch, 20, 128)
        x = self.transformer_encoder(x)

        # 5. Permute back and apply global average pooling: (batch, 128, 20) → (batch, 128, 1)
        x = x.permute(0, 2, 1)
        x = self.global_avg_pool(x)

        # 6. Flatten: (batch, 128, 1) → (batch, 128)
        x = x.squeeze(-1)

        # 7. Classification head: (batch, 128) → (batch, 1)
        x = self.classifier(x)

        return x


def load_model(weights_path: str, device: str = "cpu") -> CRISPRGuardNet:
    """
    Load CRISPRGuardNet from saved state_dict weights.

    Args:
        weights_path: Path to the .pt weights file.
        device: Target device ('cpu' or 'cuda').

    Returns:
        Loaded CRISPRGuardNet model in evaluation mode.
    """
    model = CRISPRGuardNet()
    state_dict = torch.load(weights_path, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    return model


def create_mock_weights(save_path: str) -> CRISPRGuardNet:
    """
    Create and save a randomly initialized model as fallback mock weights.
    This prevents server startup crashes when trained weights don't exist.

    Args:
        save_path: Path where mock_weights.pt will be saved.

    Returns:
        Initialized CRISPRGuardNet model in evaluation mode.
    """
    model = CRISPRGuardNet()
    torch.save(model.state_dict(), save_path)
    model.eval()
    return model
