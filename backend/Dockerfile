FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install MediaPipe for client-side computer vision support
# This is a placeholder for future native dependencies if needed

# Copy application code
COPY . .

# Make wait-for-it.sh executable
COPY wait-for-it.sh .
RUN chmod +x wait-for-it.sh

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]