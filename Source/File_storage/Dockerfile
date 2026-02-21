FROM python:3.11-slim

WORKDIR /app

COPY File_storage/requirements.txt ./File_storage/
RUN pip install --no-cache-dir -r File_storage/requirements.txt

COPY conf/ /app/conf/
COPY File_storage/ /app/File_storage/

ENV PYTHONPATH=/app

EXPOSE 8001

WORKDIR /app/File_storage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
