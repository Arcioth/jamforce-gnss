#!/bin/bash
# System-wide wrapper for JamForce GNSS Monitor

# Ensure any orphaned backend processes are killed
pkill -f "uvicorn app:app" || true

# The Rust binary expects to be run from the directory containing launch.sh
cd /opt/jamforce-gnss

# Wayland/Hyprland fallbacks (though also hardcoded in Rust now)
export WEBKIT_DISABLE_DMABUF_RENDERER=1

# Run the Tauri application (which spawns the backend)
exec ./app "$@"
