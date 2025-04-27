# Use official Python image
FROM python:3.10-slim

# Set work directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download punkt and punkt_tab manually at build time
RUN python -m nltk.downloader punkt punkt_tab

# Copy app code
COPY . .

# Expose the port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
