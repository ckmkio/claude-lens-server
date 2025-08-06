#!/bin/bash

echo "Starting Docker container initialization..."

# Make scripts executable
chmod +x /app/scripts/setup-claude.sh

# Setup Claude Code on first run
echo "Initializing Claude Code..."
/app/scripts/setup-claude.sh setup

# The setup script will handle the first-time login process
# This script will wait for user authentication to complete

echo "Container initialization complete."
echo "Starting services via supervisor..."

# Start supervisor which will manage Redis, cron, and the Express app
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf