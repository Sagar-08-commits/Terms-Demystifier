# Use the official Node.js image from Docker Hub
FROM node:20-slim

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies (CHANGE THIS LINE)
RUN npm install
# Changed from: RUN npm install --production
# The --production flag prevents devDependencies from being installed.
# Since dotenv is used at runtime (even if conditionally, or for local testing),
# it needs to be installed.

# Copy the rest of your application code, including start.sh
COPY . .

# Make start.sh executable
RUN chmod +x start.sh

# Command to run the application (use the shell script)
CMD ["./start.sh"]