# Use official Python base image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend files (model files, app.py, etc.)
COPY . .

# Expose the Flask default port
EXPOSE 5000

# Run the Flask app
CMD ["python", "app.py"]
