from app.ai.grievance_ai import classify_category, classify_urgency, lexical_embedding, normalize_hinglish


def test_hinglish_normalization_maps_student_language() -> None:
    normalized, language = normalize_hinglish("Paani nahi aa raha in BH-3")

    assert language == "hinglish"
    assert "water" in normalized
    assert "not" in normalized


def test_category_classification_identifies_water() -> None:
    category, confidence = classify_category("water not coming in bathroom")

    assert category == "Water"
    assert confidence > 0.5


def test_urgency_classification_identifies_critical_safety() -> None:
    urgency, score, confidence = classify_urgency("electric spark near room switch emergency")

    assert urgency == "CRITICAL"
    assert score >= 90
    assert confidence > 0.5


def test_lexical_embedding_is_nonzero_and_stable() -> None:
    first = lexical_embedding("water not coming", 32)
    second = lexical_embedding("water not coming", 32)

    assert first == second
    assert any(value != 0 for value in first)
