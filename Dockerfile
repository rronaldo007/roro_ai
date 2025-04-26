# syntax=docker/dockerfile:1
FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      default-libmysqlclient-dev \
      pkg-config \
      netcat-openbsd && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# bring in both your code *and* the wait script
COPY . .

# collect static
RUN python manage.py collectstatic --noinput
# Add to your Dockerfile
RUN apt-get update && apt-get install -y nodejs npm
RUN python manage.py tailwind install
RUN python manage.py tailwind build

EXPOSE 8000

# default, but will be overridden by docker-compose
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "roro_ai.wsgi:application", "--workers", "3"]

