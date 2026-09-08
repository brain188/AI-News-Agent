import uuid

from app.agent import citations


def test_extracts_only_retrieved_ids():
    """Ids the tools never returned must not reach the client."""
    real = uuid.uuid4()
    fake = uuid.uuid4()
    answer = f"Some answer.\n\nCITED: {real}, {fake}"

    body, cited = citations.extract(answer, {real})

    assert cited == [real]
    assert "CITED:" not in body


def test_handles_missing_citation_line():
    """An answer without a citation line returns no citations."""
    body, cited = citations.extract("Just an answer.", {uuid.uuid4()})

    assert cited == []
    assert body == "Just an answer."


def test_handles_none_marker():
    """CITED: none means the model used no stored articles."""
    _, cited = citations.extract("Answer.\n\nCITED: none", {uuid.uuid4()})

    assert cited == []