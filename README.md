<p align="center">
  <img src="static/img/logo.png" alt="JamForce Logo" width="120">
</p>

<h1 align="center">JamForce GNSS Monitor</h1>

<p align="center">
  <strong>A high-performance tactical GNSS monitoring application for Arch Linux.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-eab308?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/platform-Arch%20Linux-1793d1?style=flat-square" alt="Arch Linux">
  <img src="https://img.shields.io/badge/constellations-5-4ade80?style=flat-square" alt="Constellations">
  <img src="https://img.shields.io/badge/hardware-Taoglas-1e2023?style=flat-square" alt="Hardware">
</p>

---

JamForce GNSS Monitor is a tactical tracking application tailored for the Taoglas GGSFTP.50.7.A.08 module. Built specifically for Arch Linux using Tauri, FastAPI, and Vanilla JavaScript, it offers a real-time, multi-constellation monitoring dashboard with high-framerate radar animations and hardware-level telemetry.

## Features

### Tactical Dashboard
- **Live Reverse Geocoding** — Automatically converts raw NMEA coordinates to city/country via OpenStreetMap.
- **Animated Radar** — High-framerate Canvas radar with 2-second temporal fade mapping active satellite blips.
- **DOP Metrics** — Real-time Dilution of Precision readouts (HDOP, VDOP, PDOP) and system accuracy.
- **Hardware Integration** — Automatic Python `pyserial` port detection for MCU/GNSS USB interfaces without hardcoded paths.

### Multi-Constellation Telemetry
JamForce dynamically plots signals from 5 independent satellite networks:
- **GPS** (Blue)
- **GLONASS** (Red)
- **Galileo** (Green)
- **BeiDou** (Yellow)
- **QZSS** (Purple)

Each constellation features a dedicated Chart.js telemetry window plotting precise Signal-to-Noise Ratios (SNR), alongside a global moving average SNR history chart.

### Application Architecture
- **Tauri Webview** — Compiles into a sleek, native desktop application container.
- **FastAPI Sidecar** — Python backend serving high-throughput NMEA datastreams over asynchronous WebSockets.
- **I18n Localization** — Instantaneous switching between English and Turkish user interfaces.
- **Offline Data Logging** — Intercept, pause, clear, or download the raw NMEA hex stream directly from the console tab.

## Quick Start

### Prerequisites
Make sure you have Rust (`cargo`), `npm`, and `python` installed on your Arch Linux system:
```bash
sudo pacman -S rust python npm
```

### Build & Run
To run the JamForce Monitor in development mode (which automatically spins up the Python GNSS parser):
```bash
npx tauri dev
```
To compile a native Arch Linux release package:
```bash
npx tauri build
```