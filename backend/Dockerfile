FROM python:3.10-slim

# Install system dependencies (FFmpeg required for moviepy/whisper)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user (required by HF Spaces)
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /home/user/app

# Copy requirements first (Docker layer caching)
COPY --chown=user requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY --chown=user . .

# Create necessary directories
RUN mkdir -p uploads audio transcripts pdfs chroma_db

# Hugging Face Spaces REQUIRES port 7860
EXPOSE 7860

# Run FastAPI on port 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
