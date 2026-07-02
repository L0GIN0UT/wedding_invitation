FROM python:3.11-slim

WORKDIR /app

COPY File_storage/requirements.txt ./File_storage/
RUN pip install --no-cache-dir -r File_storage/requirements.txt

COPY conf/ /app/conf/
# Только код приложения; data/ — через volume ./File_storage/data:/app/File_storage/data
COPY File_storage/app/ /app/File_storage/app/

ENV PYTHONPATH=/app

EXPOSE 8001

WORKDIR /app/File_storage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
