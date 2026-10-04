FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/seed_uploads && cp -a /app/uploads/. /app/seed_uploads/
ENV UPLOAD_DIR=/app/uploads
CMD ["sh", "-c", "cp -n /app/seed_uploads/* /app/uploads/ 2>/dev/null || true; python -m alembic upgrade head && python -m scripts.import_seed && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
