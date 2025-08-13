FROM python:3.10

WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get upgrade -y && apt-get clean
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5050
CMD ["gunicorn", "-k", "eventlet", "-w", "1", "-b" , "0.0.0.0:5050" , "app:app"]
