import asyncio
import json
import logging
from contextlib import asynccontextmanager

import pynmea2
import serial
import serial.tools.list_ports
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gnss-monitor")

# Global state
connected_clients = set()
gnss_data = {
    "lat": 0.0,
    "lon": 0.0,
    "alt": 0.0,
    "fix": 0,
    "sats": 0,
    "hdop": 0.0,
    "vdop": 0.0,
    "pdop": 0.0,
    "satellites": {} # constellation -> [{prn, elevation, azimuth, snr}]
}
raw_buffer = []

BAUD_RATE = 9600

def get_gnss_port():
    known_vids = [
        0x1546, # U-Blox
        0x0483, # STMicroelectronics MCU
        0x10c4, # Silicon Labs
        0x1a86, # CP210x
        0x0403, # FTDI
    ]
    
    ports = list(serial.tools.list_ports.comports())
    
    # 1. Match by known VID
    for port in ports:
        if port.vid in known_vids:
            return port.device
            
    # 2. Match by description
    for port in ports:
        desc = port.description.lower() if port.description else ""
        if "gnss" in desc or "u-blox" in desc or "mcu" in desc:
            return port.device
            
    # 3. Fallback to typical USB serial names
    for port in ports:
        if "ACM" in port.device or "USB" in port.device:
            return port.device
            
    return "/dev/ttyACM0"

def parse_nmea(line):
    global gnss_data
    try:
        if line.startswith("$"):
            msg = pynmea2.parse(line)
            
            # GGA - Global Positioning System Fix Data
            if isinstance(msg, pynmea2.GGA):
                gnss_data["lat"] = msg.latitude
                gnss_data["lon"] = msg.longitude
                gnss_data["alt"] = msg.altitude
                gnss_data["fix"] = msg.gps_qual
                gnss_data["sats"] = int(msg.num_sats) if msg.num_sats else 0
                
            # GSA - GNSS DOP and Active Satellites
            elif isinstance(msg, pynmea2.GSA):
                gnss_data["hdop"] = float(msg.hdop) if msg.hdop else 0.0
                gnss_data["vdop"] = float(msg.vdop) if msg.vdop else 0.0
                gnss_data["pdop"] = float(msg.pdop) if msg.pdop else 0.0
                
            # GSV - GNSS Satellites in View
            # Talker IDs: GP (GPS), GL (GLONASS), GA (Galileo), GB (BeiDou)
            elif isinstance(msg, pynmea2.GSV):
                talker = line[1:3]
                constellation = {
                    "GP": "GPS",
                    "GL": "GLONASS",
                    "GA": "Galileo",
                    "GB": "BeiDou",
                    "GQ": "QZSS"
                }.get(talker, "Unknown")
                
                if str(msg.msg_num) == "1":
                    # Reset this constellation's data on first message
                    gnss_data["satellites"][constellation] = []
                
                if constellation not in gnss_data["satellites"]:
                    gnss_data["satellites"][constellation] = []
                
                # Each GSV message can contain up to 4 satellites
                for i in range(1, 5):
                    prn = getattr(msg, f"sv_prn_num_{i}", None)
                    el = getattr(msg, f"elevation_deg_{i}", None)
                    az = getattr(msg, f"azimuth_{i}", None)
                    snr = getattr(msg, f"snr_{i}", None)
                    
                    if prn:
                        gnss_data["satellites"][constellation].append({
                            "prn": prn,
                            "el": el,
                            "az": az,
                            "snr": int(snr) if snr else 0
                        })
                        
    except pynmea2.ParseError:
        pass
    except Exception as e:
        logger.error(f"Error parsing NMEA ({line[1:6] if len(line) > 6 else 'Unknown'}): {e}")

async def serial_reader_task():
    port_name = get_gnss_port()
    logger.info(f"Attempting to connect to {port_name}...")
    try:
        # We run this in a thread since pyserial is blocking, but for simplicity
        # we can use a small timeout and asyncio.sleep
        ser = serial.Serial(port_name, BAUD_RATE, timeout=0.1)
        logger.info(f"Connected to {port_name}")
        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('ascii', errors='replace').strip()
                if line:
                    parse_nmea(line)
                    raw_data = {"type": "raw", "data": line}
                    parsed_data = {"type": "parsed", "data": gnss_data}
                    
                    # Broadcast
                    if connected_clients:
                        message = json.dumps([raw_data, parsed_data])
                        await asyncio.gather(
                            *[client.send_text(message) for client in connected_clients],
                            return_exceptions=True
                        )
            await asyncio.sleep(0.01)
    except serial.SerialException as e:
        logger.error(f"Serial port error: {e}")
        # Could attempt reconnect here
    except Exception as e:
        logger.error(f"Unexpected error in serial reader: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(serial_reader_task())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(lifespan=lifespan)

# Setup Templates and Static files
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            # We don't really expect client messages, just keep alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)