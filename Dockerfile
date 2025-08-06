FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    redis \
    supervisor \
    && rm -rf /var/cache/apk/*

# Install Claude Code and ccusage via npm
RUN npm install -g @anthropic-ai/claude-code ccusage

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/

# Make scripts executable
RUN chmod +x /app/scripts/*.sh

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /tmp/redis

# Copy configuration files
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port
EXPOSE 3000

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]