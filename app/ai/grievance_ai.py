from dataclasses import dataclass
from functools import lru_cache
from hashlib import blake2b
from math import sqrt
import re
from typing import Any

from app.core.config import get_settings
from app.observability.logger import get_logger


logger = get_logger(__name__)

WeightedPattern = tuple[str, float]

HINGLISH_TERMS = {
    "mess ka khana kharab": "stale mess food",
    "mess ka food kharab": "stale mess food",
    "paani nahi aa raha": "no water",
    "pani nahi aa raha": "no water",
    "water nahi aa raha": "no water",
    "paani nahi aara": "no water",
    "pani nahi aara": "no water",
    "paani band": "water stopped",
    "pani band": "water stopped",
    "bijli chali gayi": "power outage",
    "light chali gayi": "power outage",
    "light nahi aa rahi": "power outage",
    "fan band": "fan not working",
    "fan nahi chal raha": "fan not working",
    "geyser band": "geyser not working",
    "geyser nahi chal raha": "geyser not working",
    "flush nahi ho raha": "flush not working",
    "toilet jam": "blocked toilet",
    "washroom ganda": "dirty washroom",
    "bathroom ganda": "dirty bathroom",
    "badbu aa rahi": "bad smell",
    "badbu aa raha": "bad smell",
    "khana kharab": "stale food",
    "khana ganda": "bad food",
    "mess ka khana": "mess food",
    "net nahi chal raha": "internet not working",
    "wifi nahi chal raha": "wifi not working",
    "current lag raha": "electric shock",
    "current aa raha": "electric shock",
    "karant lag raha": "electric shock",
    "darwaza nahi band ho raha": "door not closing",
    "tala kharab": "lock broken",
    "bahut zyada": "very high",
    "bar bar": "repeatedly",
    "poora hostel": "whole hostel",
    "poori floor": "whole floor",
    "poora floor": "whole floor",
    "pure hostel": "whole hostel",
    "puri wing": "whole wing",
    "paani": "water",
    "pani": "water",
    "nahi": "not",
    "nahin": "not",
    "matlab": "means",
    "aa raha": "coming",
    "aa rahi": "coming",
    "aara": "coming",
    "bijli": "electricity",
    "light": "electricity",
    "khana": "food",
    "ganda": "dirty",
    "gandi": "dirty",
    "safai": "cleaning",
    "kamra": "room",
    "mein": "in",
    "me": "in",
    "aur": "and",
    "band": "not working",
    "kharaab": "broken",
    "kharab": "broken",
    "badbu": "bad smell",
    "machhar": "mosquito",
    "cockroach": "cockroach",
    "awaz": "noise",
    "shor": "noise",
    "darwaza": "door",
    "tala": "lock",
    "saare": "all",
    "sab": "all",
}

HINGLISH_HINTS = {
    "paani",
    "pani",
    "nahi",
    "nahin",
    "aara",
    "bijli",
    "khana",
    "ganda",
    "gandi",
    "safai",
    "kamra",
    "mein",
    "aur",
    "kharaab",
    "kharab",
    "badbu",
    "machhar",
    "awaz",
    "shor",
    "darwaza",
    "tala",
    "saare",
    "sab",
    "chali",
    "gayi",
    "lag",
    "hai",
    "hain",
    "raha",
    "rahi",
    "rahe",
    "se",
    "ka",
    "ki",
    "ke",
    "wala",
    "wali",
    "jaldi",
}

CATEGORY_PATTERNS: dict[str, tuple[WeightedPattern, ...]] = {
    "Water": (
        ("no water", 8.0),
        ("water stopped", 7.0),
        ("water not coming", 7.0),
        ("water supply", 5.5),
        ("low water pressure", 5.0),
        ("tap", 3.0),
        ("flush not working", 4.5),
        ("flush", 2.5),
        ("geyser not working", 3.5),
        ("geyser", 2.5),
        ("leakage", 3.5),
        ("leak", 3.0),
        ("drain", 2.5),
        ("bathroom", 1.4),
        ("washroom", 1.4),
        ("water", 3.0),
    ),
    "Electricity": (
        ("power outage", 8.0),
        ("power cut", 7.0),
        ("no electricity", 7.0),
        ("electricity not working", 6.5),
        ("fan not working", 5.5),
        ("light not working", 5.0),
        ("socket", 3.8),
        ("switch", 3.2),
        ("voltage", 3.5),
        ("spark", 3.5),
        ("fan", 2.4),
        ("electricity", 3.2),
        ("power", 3.0),
    ),
    "Internet": (
        ("wifi not working", 8.0),
        ("internet not working", 8.0),
        ("network not working", 7.0),
        ("wifi disconnect", 6.0),
        ("internet disconnect", 6.0),
        ("slow internet", 5.0),
        ("slow wifi", 5.0),
        ("router", 3.5),
        ("lan", 3.0),
        ("network", 3.0),
        ("connection", 2.4),
        ("wifi", 3.5),
        ("internet", 3.5),
    ),
    "Hygiene": (
        ("blocked toilet", 7.0),
        ("dirty washroom", 7.0),
        ("dirty bathroom", 7.0),
        ("bad smell", 6.0),
        ("garbage", 5.5),
        ("overflowing", 5.0),
        ("cleaning", 4.0),
        ("dirty", 3.5),
        ("pest", 3.5),
        ("mosquito", 4.0),
        ("cockroach", 4.0),
        ("sanitation", 4.0),
        ("toilet", 3.2),
        ("washroom", 1.8),
        ("bathroom", 1.8),
    ),
    "Mess": (
        ("stale food", 8.0),
        ("bad food", 7.0),
        ("spoiled food", 7.0),
        ("uncooked food", 6.5),
        ("mess food", 6.0),
        ("food quality", 5.0),
        ("mess", 4.2),
        ("food", 3.5),
        ("dining", 2.5),
        ("meal", 2.5),
        ("breakfast", 2.5),
        ("lunch", 2.5),
        ("dinner", 2.5),
        ("canteen", 2.5),
    ),
    "Infrastructure": (
        ("door not closing", 6.5),
        ("lock broken", 5.5),
        ("broken bed", 6.0),
        ("broken chair", 5.5),
        ("broken window", 5.5),
        ("ceiling", 3.5),
        ("wall", 3.0),
        ("building", 3.0),
        ("furniture", 3.0),
        ("mattress", 3.0),
        ("room", 2.2),
        ("bed", 2.5),
        ("chair", 2.5),
        ("window", 2.5),
        ("door", 2.5),
        ("broken", 2.5),
    ),
    "Noise": (
        ("loud music", 6.0),
        ("construction noise", 6.0),
        ("shouting", 4.5),
        ("disturbance", 4.0),
        ("noise", 4.0),
        ("loud", 3.0),
        ("music", 2.5),
        ("construction", 2.5),
    ),
    "Safety": (
        ("fire", 9.0),
        ("electric shock", 8.5),
        ("security guard", 4.0),
        ("security", 4.0),
        ("unsafe", 5.0),
        ("theft", 7.5),
        ("stranger", 7.0),
        ("unknown person", 7.0),
        ("harassment", 8.5),
        ("injury", 8.0),
        ("gas leak", 9.0),
        ("lock broken", 4.0),
        ("late night entry", 5.5),
        ("emergency", 6.0),
    ),
    "Administration": (
        ("warden", 4.0),
        ("staff", 3.5),
        ("fee", 4.0),
        ("permission", 4.0),
        ("office", 3.0),
        ("admin", 3.0),
        ("delay", 2.5),
        ("not responding", 4.5),
        ("complaint not resolved", 5.0),
    ),
}

URGENCY_PATTERNS: dict[str, tuple[WeightedPattern, ...]] = {
    "CRITICAL": (
        ("fire", 10.0),
        ("gas leak", 10.0),
        ("electric shock", 9.0),
        ("spark", 8.0),
        ("smoke", 8.0),
        ("injury", 8.0),
        ("harassment", 9.0),
        ("theft", 8.0),
        ("stranger", 7.5),
        ("unsafe", 6.5),
        ("emergency", 7.0),
    ),
    "HIGH": (
        ("no water", 8.0),
        ("water stopped", 7.0),
        ("power outage", 8.0),
        ("power cut", 7.5),
        ("no electricity", 7.5),
        ("blocked toilet", 7.0),
        ("overflowing", 6.0),
        ("flood", 7.0),
        ("cannot use", 5.0),
        ("not usable", 5.0),
        ("not coming", 4.0),
        ("not working", 3.8),
        ("whole hostel", 6.0),
        ("whole floor", 5.0),
        ("whole wing", 5.0),
    ),
    "MEDIUM": (
        ("slow", 4.0),
        ("irregular", 4.0),
        ("repeatedly", 3.5),
        ("leak", 4.5),
        ("dirty", 4.0),
        ("bad smell", 4.5),
        ("broken", 4.0),
        ("delay", 3.5),
        ("disconnect", 4.0),
        ("low pressure", 4.0),
    ),
    "LOW": (
        ("slightly", 4.0),
        ("sometimes", 3.5),
        ("minor", 4.0),
        ("request", 3.5),
        ("suggestion", 4.0),
        ("improve", 3.0),
    ),
}

IMPACT_PATTERNS: tuple[WeightedPattern, ...] = (
    ("whole hostel", 10.0),
    ("entire hostel", 10.0),
    ("whole floor", 7.0),
    ("whole wing", 7.0),
    ("multiple students", 7.0),
    ("many students", 6.0),
    ("all rooms", 6.0),
    ("common area", 4.0),
)

LEXICAL_CONCEPTS: dict[str, tuple[WeightedPattern, ...]] = {
    "water_outage": (
        ("no water", 5.0),
        ("water stopped", 5.0),
        ("water not coming", 5.0),
        ("water supply not coming", 5.0),
        ("water supply", 2.0),
        ("tap dry", 4.0),
    ),
    "washroom_area": (
        ("washroom", 2.5),
        ("bathroom", 2.5),
        ("toilet", 2.5),
        ("flush", 2.0),
    ),
    "power_outage": (
        ("power outage", 5.0),
        ("power cut", 5.0),
        ("no electricity", 5.0),
        ("electricity not working", 4.5),
    ),
    "internet_outage": (
        ("wifi not working", 5.0),
        ("internet not working", 5.0),
        ("network not working", 4.5),
        ("wifi disconnect", 4.0),
        ("internet disconnect", 4.0),
    ),
    "food_quality": (
        ("stale food", 5.0),
        ("stale mess food", 5.0),
        ("bad food", 4.5),
        ("mess food", 3.0),
        ("food quality", 3.0),
    ),
    "safety_risk": (
        ("fire", 5.0),
        ("electric shock", 5.0),
        ("spark", 4.5),
        ("theft", 4.5),
        ("stranger", 4.0),
        ("unsafe", 4.0),
    ),
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
    original = text.strip().lower()
    value = re.sub(r"[^a-z0-9:/.\-\s]", " ", original)
    value = re.sub(r"\s+", " ", value)

    replacements_by_length = sorted(
        HINGLISH_TERMS.items(),
        key=lambda item: len(item[0]),
        reverse=True,
    )
    for source, target in replacements_by_length:
        value = re.sub(_term_pattern(source), target, value)

    value = re.sub(r"\b(can't|cant)\b", "cannot", value)
    value = re.sub(r"\b(pls|plz)\b", "please", value)
    value = re.sub(r"\b(raha|rahi|rahe|hai|hain|tha|thi|ho|hota|hoti|ka|ki|ke)\b", " ", value)
    value = re.sub(r"\s+", " ", value).strip()

    language = "hinglish" if _has_hinglish_hint(original) else "english"
    return value, language


def classify_category(normalized_text: str) -> tuple[str, float]:
    scores = {
        category: _score_patterns(normalized_text, patterns)[0]
        for category, patterns in CATEGORY_PATTERNS.items()
    }
    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    category, score = ranked[0]
    runner_up = ranked[1][1] if len(ranked) > 1 else 0.0
    if score == 0:
        return "Administration", 0.35

    margin = score - runner_up
    confidence = 0.38 + score * 0.055 + max(margin, 0.0) * 0.035
    if margin < 1.0 and score < 6.0:
        confidence = min(confidence, 0.58)
    return category, round(min(0.96, confidence), 3)


def classify_urgency(normalized_text: str) -> tuple[str, float, float]:
    urgency_scores = {
        urgency: _score_patterns(normalized_text, patterns)[0]
        for urgency, patterns in URGENCY_PATTERNS.items()
    }
    impact_score, _ = _score_patterns(normalized_text, IMPACT_PATTERNS)
    duration_score = _duration_pressure(normalized_text)

    if urgency_scores["CRITICAL"] >= 7.0:
        urgency = "CRITICAL"
        evidence = urgency_scores["CRITICAL"] + min(impact_score, 6.0)
    elif urgency_scores["HIGH"] + impact_score + duration_score >= 7.0:
        urgency = "HIGH"
        evidence = urgency_scores["HIGH"] + impact_score + duration_score
    elif urgency_scores["MEDIUM"] >= 3.0 or urgency_scores["HIGH"] >= 3.0:
        urgency = "MEDIUM"
        evidence = max(urgency_scores["MEDIUM"], urgency_scores["HIGH"]) + min(duration_score, 4.0)
    elif urgency_scores["LOW"] >= 3.0:
        urgency = "LOW"
        evidence = urgency_scores["LOW"]
    else:
        urgency = "MEDIUM"
        evidence = 1.0

    base_score = {"LOW": 20.0, "MEDIUM": 45.0, "HIGH": 70.0, "CRITICAL": 92.0}[urgency]
    urgency_score = min(100.0, base_score + evidence * 1.6)
    confidence = min(0.96, 0.42 + evidence * 0.045)
    return urgency, round(urgency_score, 1), round(confidence, 3)


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
    for feature, weight in _lexical_features(text):
        digest = blake2b(feature.encode("utf-8"), digest_size=8).digest()
        bucket = int.from_bytes(digest[:4], "big") % dimension
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[bucket] += sign * weight
    norm = sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def _has_hinglish_hint(text: str) -> bool:
    return any(re.search(_term_pattern(term), text) for term in HINGLISH_HINTS)


def _term_pattern(term: str) -> str:
    escaped = re.escape(term).replace(r"\ ", r"\s+")
    return rf"(?<![a-z0-9]){escaped}(?![a-z0-9])"


def _score_patterns(text: str, patterns: tuple[WeightedPattern, ...]) -> tuple[float, int]:
    score = 0.0
    matches = 0
    for pattern, weight in patterns:
        if re.search(_term_pattern(pattern), text):
            score += weight
            matches += 1
    return score, matches


def _duration_pressure(text: str) -> float:
    score = 0.0
    if re.search(r"\bsince\s+(morning|evening|night|yesterday|last night)\b", text):
        score += 5.0
    for amount, unit in re.findall(r"\b(\d+)\s*(hour|hours|hr|hrs|day|days)\b", text):
        value = int(amount)
        if unit.startswith("day"):
            score += 8.0 if value == 1 else 12.0
        elif value >= 6:
            score += 6.0
        elif value >= 2:
            score += 3.0
    return min(score, 12.0)


def _lexical_features(text: str) -> list[tuple[str, float]]:
    tokens = [
        token
        for token in re.findall(r"[a-z0-9]+", text.lower())
        if token not in {"the", "a", "an", "is", "are", "was", "were", "in", "of", "to", "and"}
    ]
    features: list[tuple[str, float]] = [(f"word:{token}", 1.0) for token in tokens]

    for size, weight in ((2, 1.5), (3, 1.8)):
        for index in range(0, max(0, len(tokens) - size + 1)):
            phrase = " ".join(tokens[index : index + size])
            features.append((f"phrase:{phrase}", weight))

    category, confidence = classify_category(text)
    if confidence >= 0.55:
        features.append((f"category:{category.lower()}", 1.4))

    urgency, _, confidence = classify_urgency(text)
    if confidence >= 0.55:
        features.append((f"urgency:{urgency.lower()}", 0.8))

    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern, weight in patterns:
            if re.search(_term_pattern(pattern), text):
                features.append((f"signal:{category.lower()}:{pattern}", min(3.0, weight / 2.2)))

    for pattern, weight in IMPACT_PATTERNS:
        if re.search(_term_pattern(pattern), text):
            features.append((f"impact:{pattern}", min(2.5, weight / 4.0)))

    for concept, patterns in LEXICAL_CONCEPTS.items():
        concept_score, _ = _score_patterns(text, patterns)
        if concept_score:
            features.append((f"concept:{concept}", min(5.0, concept_score)))

    return features


_ai_instance: GrievanceAI | None = None


def get_grievance_ai() -> GrievanceAI:
    global _ai_instance
    if _ai_instance is None:
        _ai_instance = GrievanceAI()
    return _ai_instance
