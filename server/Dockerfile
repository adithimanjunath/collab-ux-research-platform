FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get upgrade -y && apt-get clean
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "app:app"]
