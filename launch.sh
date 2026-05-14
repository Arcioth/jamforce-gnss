#!/bin/bash
# GNSS Monitor Launcher
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating..."
    python3 -m venv venv
    ./venv/bin/pip install fastapi uvicorn pyserial pynmea2 websockets jinja2
fi

echo "Starting GNSS Monitor Backend on port 8000..."
./venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
