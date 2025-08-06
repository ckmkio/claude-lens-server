#!/bin/bash

CLAUDE_CONFIG_DIR="/root/.config/claude"
FIRST_RUN_FLAG="/app/.claude-first-run-complete"

setup_claude_code() {
    echo "Setting up Claude Code..."
    
    # Create config directory
    mkdir -p "$CLAUDE_CONFIG_DIR"
    
    # Check if this is the first run
    if [ ! -f "$FIRST_RUN_FLAG" ]; then
        echo "First run detected. Please complete the Claude Code login process."
        echo "Run the following command to login:"
        echo "claude auth login"
        echo ""
        echo "After successful login, the system will continue automatically."
        echo "Waiting for authentication..."
        
        # Wait for user to complete login
        while true; do
            if claude auth status > /dev/null 2>&1; then
                echo "Authentication successful!"
                touch "$FIRST_RUN_FLAG"
                break
            else
                echo "Still waiting for authentication... (checking every 30 seconds)"
                sleep 30
            fi
        done
    else
        echo "Claude Code already configured."
        # Verify authentication is still valid
        if ! claude auth status > /dev/null 2>&1; then
            echo "Authentication expired. Please re-authenticate:"
            echo "claude auth login"
            rm -f "$FIRST_RUN_FLAG"
            return 1
        fi
    fi
    
    return 0
}

# Execute Claude Code command
execute_claude_command() {
    local command="$1"
    local logfile="/var/log/claude-execution.log"
    
    echo "[$(date)] Executing Claude command: $command" >> "$logfile"
    
    if claude auth status > /dev/null 2>&1; then
        claude $command >> "$logfile" 2>&1
        local exit_code=$?
        echo "[$(date)] Command completed with exit code: $exit_code" >> "$logfile"
        return $exit_code
    else
        echo "[$(date)] Authentication required. Skipping command execution." >> "$logfile"
        return 1
    fi
}

# Main execution
case "$1" in
    "setup")
        setup_claude_code
        ;;
    "execute")
        shift
        execute_claude_command "$@"
        ;;
    *)
        echo "Usage: $0 {setup|execute <command>}"
        exit 1
        ;;
esac