from app.ai.grievance_ai import (
    classify_category,
    classify_urgency,
    lexical_embedding,
    normalize_hinglish,
)


def test_hinglish_normalization_maps_student_language() -> None:
    normalized, language = normalize_hinglish("Paani nahi aa raha in BH-3")

    assert language == "hinglish"
    assert "no water" in normalized


def test_category_classification_identifies_water() -> None:
    category, confidence = classify_category("water not coming in bathroom")

    assert category == "Water"
    assert confidence > 0.5


def test_category_classification_handles_hostel_hinglish_examples() -> None:
    examples = [
        ("Bijli chali gayi aur fan band hai whole floor", "Electricity"),
        ("Mess ka khana kharab hai and smells bad", "Mess"),
        ("Wifi nahi chal raha, bar bar disconnect ho raha hai", "Internet"),
        ("Toilet jam hai aur badbu aa rahi hai", "Hygiene"),
    ]

    for text, expected in examples:
        normalized, _ = normalize_hinglish(text)
        category, confidence = classify_category(normalized)

        assert category == expected
        assert confidence >= 0.7


def test_urgency_classification_identifies_critical_safety() -> None:
    urgency, score, confidence = classify_urgency("electric spark near room switch emergency")

    assert urgency == "CRITICAL"
    assert score >= 90
    assert confidence > 0.5


def test_urgency_uses_duration_and_impact_pressure() -> None:
    normalized, _ = normalize_hinglish("Paani nahi aa raha whole floor since morning")
    urgency, score, confidence = classify_urgency(normalized)

    assert urgency == "HIGH"
    assert score >= 80
    assert confidence >= 0.8


def test_lexical_embedding_is_nonzero_and_stable() -> None:
    first = lexical_embedding("water not coming", 32)
    second = lexical_embedding("water not coming", 32)

    assert first == second
    assert any(value != 0 for value in first)


def test_lexical_embedding_groups_equivalent_hostel_phrasing() -> None:
    from app.ai.grievance_ai import cosine_similarity

    first, _ = normalize_hinglish("Paani nahi aa raha bathroom")
    second, _ = normalize_hinglish("Water supply not coming in washroom")
    unrelated, _ = normalize_hinglish("Wifi is slow in my room")

    related_score = cosine_similarity(lexical_embedding(first, 384), lexical_embedding(second, 384))
    unrelated_score = cosine_similarity(
        lexical_embedding(first, 384),
        lexical_embedding(unrelated, 384),
    )

    assert related_score > 0.52
    assert related_score > unrelated_score
