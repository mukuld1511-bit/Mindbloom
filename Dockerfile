FROM python:3.11-slim

# Install system dependencies and Node.js (v20)
RUN apt-get update && apt-get install -y curl build-essential && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Node dependencies and install
COPY package*.json ./
RUN npm ci

# Copy Python dependencies and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
# Install spaCy English model required by ContentProcessor
RUN python -m spacy download en_core_web_sm

# Copy the entire application
COPY . .

# Build the Vite frontend and the Node.js server proxy
RUN npm run build

# Expose the server port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the Node.js proxy (which in turn spawns the Python FastAPI backend)
CMD ["npm", "start"]
