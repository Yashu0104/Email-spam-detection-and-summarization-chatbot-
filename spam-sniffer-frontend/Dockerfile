# Use official Node.js 18 image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Install OpenSSL dependencies (if you're facing OpenSSL errors)
RUN apt-get update && apt-get install -y openssl

# Copy package.json and package-lock.json (if present) into the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files into the container
COPY . .

# Build the React app for production
RUN npm run build

# Expose the default port the app will run on
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
