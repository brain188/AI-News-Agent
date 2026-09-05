FROM python:3.12-slim

# uv ships as a static binary; copy it from the official image.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Don't buffer logs; don't write .pyc into the image layer.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app/ ./app/

# Put the project venv on PATH so uvicorn resolves without `uv run`.
ENV PATH="/app/.venv/bin:$PATH"

# Run as an unprivileged user rather than root.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]