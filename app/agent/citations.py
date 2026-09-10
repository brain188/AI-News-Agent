import re
import uuid

CITATION_PATTERN = re.compile(r"^CITED:\s*(.*)$", re.IGNORECASE | re.MULTILINE)


def extract(answer: str, retrieved: set[uuid.UUID]) -> tuple[str, list[uuid.UUID]]:
    """Split the citation line off an answer and validate the ids it names."""
    match = CITATION_PATTERN.search(answer)
    if not match:
        return answer.strip(), []

    cited: list[uuid.UUID] = []
    for token in match.group(1).split(","):
        token = token.strip()
        if not token or token.lower() == "none":
            continue
        try:
            parsed = uuid.UUID(token)
        except ValueError:
            continue
        # Only keep ids the tools actually returned, never invented ones.
        if parsed in retrieved and parsed not in cited:
            cited.append(parsed)

    body = CITATION_PATTERN.sub("", answer).strip()
    return body, cited
