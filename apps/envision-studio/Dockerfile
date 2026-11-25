FROM python:3.12-slim
WORKDIR /studio
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -r /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ENVISION_DATA=/data
EXPOSE 8766
CMD ["python", "server.py"]
