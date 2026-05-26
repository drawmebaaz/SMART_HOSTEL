from dataclasses import dataclass
from functools import lru_cache
from hashlib import blake2b
from math import sqrt
import re
from typing import Any

from app.core.config import get_settings
from app.observability.logger import get_logger


logger = get_logger(__name__)

HINGLISH_TERMS = {
    "paani": "water",
    "pani": "water",
    "nahi": "not",
    "nahin": "not",
    "aa": "coming",
    "aara": "coming",
    "aa raha": "coming",
    "bijli": "electricity",
    "light": "electricity",
    "khana": "food",
    "mess ka": "mess",
    "ganda": "dirty",
    "safai": "cleaning",
    "kamra": "room",
    "room me": "room in",
    "band": "not working",
    "kharaab": "broken",
    "kharab": "broken",
    "badbu": "bad smell",
    "machhar": "mosquito",
    "awaz": "noise",
    "shor": "noise",
    "darwaza": "door",
    "tala": "lock",
}

CATEGORY_KEYWORDS = {
    "Water": ["water", "tap", "flush", "leak", "bathroom", "washroom", "geyser", "drain"],
    "Electricity": ["electricity", "power", "voltage", "switch", "fan", "light", "socket", "spark"],
    "Internet": ["wifi", "internet", "network", "router", "lan", "speed", "connection"],
    "Hygiene": ["dirty", "cleaning", "garbage", "smell", "pest", "mosquito", "sanitation"],
    "Mess": ["food", "mess", "dining", "meal", "breakfast", "lunch", "dinner", "hygiene"],
    "Infrastructure": ["broken", "building", "room", "bed", "chair", "window", "door", "wall"],
    "Noise": ["noise", "loud", "music", "shouting", "disturbance", "construction"],
    "Safety": [
        "security",
        "unsafe",
        "theft",
        "fire",
        "spark",
        "lock",
        "stranger",
        "unknown",
        "person",
        "entry",
        "late night",
        "emergency",
    ],
    "Administration": ["warden", "staff", "fee", "permission", "delay", "office", "admin"],
}

URGENCY_TERMS = {
    "CRITICAL": ["fire", "spark", "shock", "theft", "stranger", "unsafe", "emergency", "injury"],
    "HIGH": ["no water", "not coming", "power cut", "flood", "blocked", "cannot", "since morning"],
    "MEDIUM": ["slow", "irregular", "leak", "dirty", "broken", "delay", "bad smell"],
    "LOW": ["slightly", "sometimes", "minor", "request", "improve"],
}


@dataclass(frozen=True)
class TextAnalysis:
    original_text: str
    normalized_text: str
    language: str
    category: str
    category_confidence: float
    urgency: str
    urgency_score: float
    urgency_confidence: float


@dataclass(frozen=True)
class EmbeddingResult:
    vector: list[float] | None
    model: str | None
    status: str
    warning: str | None = None


class GrievanceAI:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._model: Any | None = None
        self._model_load_failed = False

    def analyze(self, text: str) -> TextAnalysis:
        normalized, language = normalize_hinglish(text)
        category, category_confidence = classify_category(normalized)
        urgency, urgency_score, urgency_confidence = classify_urgency(normalized)
        return TextAnalysis(
            original_text=text,
            normalized_text=normalized,
            language=language,
            category=category,
            category_confidence=category_confidence,
            urgency=urgency,
            urgency_score=urgency_score,
            urgency_confidence=urgency_confidence,
        )

    def embed(self, normalized_text: str) -> EmbeddingResult:
        if not self.settings.enable_transformer_embeddings:
            return EmbeddingResult(
                vector=lexical_embedding(normalized_text, self.settings.embedding_dimension),
                model="local-hybrid-lexical",
                status="local_hybrid",
                warning=None,
            )
        if self._model_load_failed:
            return EmbeddingResult(
                vector=lexical_embedding(normalized_text, self.settings.embedding_dimension),
                model="lexical-fallback",
                status="lexical_fallback",
                warning=None,
            )
        try:
            vector = self._embed_cached(normalized_text)
            return EmbeddingResult(
                vector=vector,
                model=self.settings.embedding_model_name,
                status="available",
            )
        except Exception as exc:
            self._model_load_failed = True
            logger.warning("embedding_model_fallback", error=str(exc))
            return EmbeddingResult(
                vector=lexical_embedding(normalized_text, self.settings.embedding_dimension),
                model="lexical-fallback",
                status="lexical_fallback",
                warning=None,
            )

    @lru_cache(maxsize=2048)
    def _embed_cached(self, normalized_text: str) -> list[float]:
        model = self._get_model()
        vector = model.encode(normalized_text, convert_to_numpy=True)
        return [float(value) for value in vector.tolist()]

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            logger.info("embedding_model_loading", model=self.settings.embedding_model_name)
            self._model = SentenceTransformer(self.settings.embedding_model_name, device="cpu")
        return self._model


def normalize_hinglish(text: str) -> tuple[str, str]:
    value = re.sub(r"\s+", " ", text.strip().lower())
    replacements = 0
    for source, target in sorted(HINGLISH_TERMS.items(), key=lambda item: len(item[0]), reverse=True):
        value, count = re.subn(rf"\b{re.escape(source)}\b", target, value)
        replacements += count
    language = "hinglish" if replacements else "english"
    return value, language


def classify_category(normalized_text: str) -> tuple[str, float]:
    scores: dict[str, int] = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        scores[category] = sum(1 for keyword in keywords if keyword in normalized_text)
    category, score = max(scores.items(), key=lambda item: item[1])
    if score == 0:
        return "Administration", 0.35
    return category, min(0.95, 0.45 + score * 0.12)


def classify_urgency(normalized_text: str) -> tuple[str, float, float]:
    scores = {
        urgency: sum(1 for term in terms if term in normalized_text)
        for urgency, terms in URGENCY_TERMS.items()
    }
    urgency, hits = max(scores.items(), key=lambda item: item[1])
    if hits == 0:
        urgency = "MEDIUM"
        hits = 1
    base_score = {"LOW": 20.0, "MEDIUM": 45.0, "HIGH": 70.0, "CRITICAL": 92.0}[urgency]
    urgency_score = min(100.0, base_score + max(0, hits - 1) * 4)
    confidence = min(0.95, 0.5 + hits * 0.12)
    return urgency, urgency_score, confidence


def cosine_similarity(left: list[float] | None, right: list[float] | None) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = sqrt(sum(a * a for a in left))
    right_norm = sqrt(sum(b * b for b in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return numerator / (left_norm * right_norm)


def lexical_embedding(text: str, dimension: int) -> list[float]:
    vector = [0.0] * dimension
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    for token in tokens:
        digest = blake2b(token.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % dimension
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[bucket] += sign
    norm = sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


_ai_instance: GrievanceAI | None = None


def get_grievance_ai() -> GrievanceAI:
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = GrievanceAI()
    return _ai_instance
