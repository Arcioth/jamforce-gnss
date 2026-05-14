#!/bin/bash
# GNSS Monitor Launcher
cd "$(dirname "$0")"

# Check if we are running from a system-wide AUR installation (/opt/)
if [[ "$PWD" == "/opt/jamforce-gnss" ]]; then
    echo "Running from system installation (/opt/). Using system Python..."
    # The AUR package should provide these dependencies globally
    exec uvicorn app:app --host 0.0.0.0 --port 8000
else
    # Local Development Mode
    if [ ! -d "venv" ]; then
        echo "Virtual environment not found. Creating..."
        python3 -m venv venv
        ./venv/bin/pip install fastapi uvicorn pyserial pynmea2 websockets jinja2
    fi
    echo "Starting GNSS Monitor Backend on port 8000..."
    exec ./venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
fi
