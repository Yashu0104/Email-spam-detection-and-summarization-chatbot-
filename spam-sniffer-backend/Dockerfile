# spam-sniffer-backend/Dockerfile
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the requirements.txt and install dependencies
COPY requirements.txt ./ 
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application to the container
COPY . .

# Expose the application port
EXPOSE 5000

# Start the Flask application
CMD ["python", "app.py"]
