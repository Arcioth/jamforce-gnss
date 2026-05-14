// Constants
const radarCanvas = document.getElementById('radarCanvas');
const radarCtx = radarCanvas.getContext('2d');
const splashScreen = document.getElementById('splash-screen');

// App State
let isConsolePaused = false;
let map, marker;
let telemetryCharts = {};
let snrHistoryChart;
let lastLat = 0, lastLon = 0;
let rawDataLog = [];
let alerts = [];
let lastFixStatus = 0; // 0 = NO FIX, >0 = FIX
let currentCity = "--";
let lastGeocodeTime = 0;
let radarBlips = []; // Array to hold blips for fading

// Translations
const translations = {
  "en": {
    "nav_dashboard": "Dashboard",
    "nav_map": "Map",
    "nav_gnss": "GNSS Stream",
    "nav_telemetry": "Telemetry",
    "nav_alerts": "Alerts",
    "nav_settings": "Settings",
    "device_info": "DEVICE INFO",
    "device_name": "DEVICE NAME:",
    "device_id": "DEVICE ID:",
    "device_rate": "DEVICE RATE:",
    "oakge_rate": "OAKGE RATE:",
    "link_rate": "LINK RATE:",
    "fix_type": "FIX TYPE:",
    "manchratics": "MANCHRATICS:",
    "signal_accel": "SIGNAL ACCEL:",
    "signal_quality": "SIGNAL QUALITY:",
    "system_overview": "SYSTEM OVERVIEW",
    "custom_mapping": "CUSTOM MAPPING",
    "satellite": "SATELLITE",
    "sats_in_view": "SATELLITES IN VIEW:",
    "accuracy": "ACCURACY:",
    "constellation_signals": "CONSTELLATION SIGNALS (AVG SNR)",
    "system_events": "SYSTEM EVENTS",
    "dop": "DILUTION OF PRECISION",
    "latitude": "Latitude:",
    "longitude": "Longitude:",
    "altitude": "Altitude:",
    "snr_history": "OVERALL SNR HISTORY",
    "live_map": "LIVE TRACKING MAP",
    "raw_stream": "RAW NMEA DATA STREAM",
    "constellation_telemetry": "CONSTELLATION TELEMETRY (SNR)",
    "alert_history": "ALERT HISTORY",
    "system_actions": "SYSTEM ACTIONS",
    "pause_stream": "Pause Data Stream",
    "clear_logs": "Clear Data Logs",
    "download_log": "Download Raw Log",
    "language": "LANGUAGE",
    "device_online": "DEVICE GGSFTP-08: ONLINE",
    "fix_none": "NO FIX",
    "fix_3d": "3D FIX",
    "fix_dgps": "DGPS/RTK FIX",
    "poor": "POOR",
    "excellent": "EXCELLENT"
  },
  "tr": {
    "nav_dashboard": "Gösterge Paneli",
    "nav_map": "Harita",
    "nav_gnss": "GNSS Akışı",
    "nav_telemetry": "Telemetri",
    "nav_alerts": "Uyarılar",
    "nav_settings": "Ayarlar",
    "device_info": "CİHAZ BİLGİSİ",
    "device_name": "CİHAZ ADI:",
    "device_id": "CİHAZ KİMLİĞİ:",
    "device_rate": "CİHAZ HIZI:",
    "oakge_rate": "OAKGE HIZI:",
    "link_rate": "BAĞLANTI HIZI:",
    "fix_type": "KONUM TİPİ:",
    "manchratics": "MANCHRATICS:",
    "signal_accel": "SİNYAL İVMESİ:",
    "signal_quality": "SİNYAL KALİTESİ:",
    "system_overview": "SİSTEM GENEL BAKIŞ",
    "custom_mapping": "ÖZEL HARİTALAMA",
    "satellite": "UYDU",
    "sats_in_view": "GÖRÜNEN UYDULAR:",
    "accuracy": "DOĞRULUK:",
    "constellation_signals": "TAKIMYILDIZ SİNYALLERİ (ORT. SNR)",
    "system_events": "SİSTEM OLAYLARI",
    "dop": "KONUM HASSASİYETİ (DOP)",
    "latitude": "Enlem:",
    "longitude": "Boylam:",
    "altitude": "Rakım:",
    "snr_history": "GENEL SNR GEÇMİŞİ",
    "live_map": "CANLI TAKİP HARİTASI",
    "raw_stream": "HAM NMEA VERİ AKIŞI",
    "constellation_telemetry": "TAKIMYILDIZ TELEMETRİSİ (SNR)",
    "alert_history": "UYARI GEÇMİŞİ",
    "system_actions": "SİSTEM İŞLEMLERİ",
    "pause_stream": "Akışı Duraklat",
    "clear_logs": "Kayıtları Temizle",
    "download_log": "Ham Günlüğü İndir",
    "language": "DİL",
    "device_online": "CİHAZ GGSFTP-08: ÇEVRİMİÇİ",
    "fix_none": "KONUM YOK",
    "fix_3d": "3D KONUM",
    "fix_dgps": "DGPS/RTK KONUM",
    "poor": "ZAYIF",
    "excellent": "MÜKEMMEL"
  }
};

let currentLang = 'en';

function setLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    // Refresh translation dependent buttons & status
    const isPaused = isConsolePaused;
    document.getElementById('btn-pause').textContent = isPaused ? (lang === 'tr' ? 'Akışı Devam Ettir' : 'Resume Data Stream') : translations[lang].pause_stream;
    
    // Update Fix Texts on screen
    updateFixTexts(lastFixStatus);
}

function t(key) {
    return translations[currentLang][key] || key;
}

// Constellation Colors
const CONST_COLORS = {
    'GPS': '#3b82f6',
    'GLONASS': '#ef4444',
    'Galileo': '#10b981',
    'BeiDou': '#f59e0b',
    'QZSS': '#d946ef',
    'Unknown': '#94a3b8'
};

// Initialize Map
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM & CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style='background-color:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px #3b82f6;'></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    marker = L.marker([0, 0], {icon: icon}).addTo(map);
}

// Initialize Telemetry Charts
function initTelemetryCharts() {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = '-apple-system, sans-serif';

    const constellations = ['GPS', 'GLONASS', 'Galileo', 'BeiDou', 'QZSS'];

    constellations.forEach(constellation => {
        const ctx = document.getElementById(`chart-${constellation}`).getContext('2d');
        telemetryCharts[constellation] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'SNR',
                    data: [],
                    backgroundColor: CONST_COLORS[constellation],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 },
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 60, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    });
}

// Initialize SNR History Chart
function initHistoryChart() {
    const ctx = document.getElementById('snrHistoryChart').getContext('2d');
    snrHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Avg SNR',
                data: [],
                borderColor: '#eab308',
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 60, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// Add Alert
function addAlert(message, type) {
    const timeStr = new Date().toISOString().substring(11, 16);
    const alertObj = { msg: message, type: type, time: timeStr };
    alerts.unshift(alertObj);
    if(alerts.length > 50) alerts.pop();
    renderAlerts();
}

function renderAlerts() {
    const dashAlerts = document.getElementById('dashboard-alerts');
    const fullAlerts = document.getElementById('full-alerts-list');
    
    dashAlerts.innerHTML = '';
    fullAlerts.innerHTML = '';

    alerts.forEach((a, i) => {
        const html = `
            <div class="alert-item ${a.type}">
                <span class="alert-text">${a.type.toUpperCase()}: ${a.msg}</span>
                <span class="alert-time">[${a.time}]</span>
            </div>`;
        
        if(i < 5) dashAlerts.innerHTML += html;
        fullAlerts.innerHTML += html;
    });
}

// Draw Radar (Animation Loop)
function animateRadar() {
    requestAnimationFrame(animateRadar);

    const width = radarCanvas.width;
    const height = radarCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 20;

    radarCtx.clearRect(0, 0, width, height);

    // Grid
    radarCtx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
    radarCtx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
        radarCtx.beginPath();
        radarCtx.arc(cx, cy, radius * (i / 4), 0, 2 * Math.PI);
        radarCtx.stroke();
    }
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        radarCtx.beginPath();
        radarCtx.moveTo(cx, cy);
        radarCtx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        radarCtx.stroke();
    }

    const now = Date.now();
    // Keep blips updated within the last 2 seconds
    radarBlips = radarBlips.filter(b => now - b.timestamp < 2000);

    // Update UI with the smoothed satellite count
    document.getElementById('sats-val').textContent = radarBlips.length;
    document.getElementById('sats-large').textContent = radarBlips.length;

    radarBlips.forEach(sat => {
        const age = now - sat.timestamp;
        let opacity = 1.0 - (age / 2000);
        if (opacity < 0) opacity = 0;

        const azRad = (sat.az - 90) * (Math.PI / 180);
        const r = radius * (1 - (sat.el / 90)); 
        const x = cx + r * Math.cos(azRad);
        const y = cy + r * Math.sin(azRad);

        radarCtx.globalAlpha = opacity;
        radarCtx.fillStyle = CONST_COLORS[sat.type] || '#ffffff';
        radarCtx.beginPath();
        radarCtx.arc(x, y, 4, 0, 2 * Math.PI);
        radarCtx.fill();

        radarCtx.strokeStyle = radarCtx.fillStyle;
        radarCtx.beginPath();
        radarCtx.moveTo(x - 8, y); radarCtx.lineTo(x + 8, y);
        radarCtx.moveTo(x, y - 8); radarCtx.lineTo(x, y + 8);
        radarCtx.stroke();
    });

    radarCtx.globalAlpha = 1.0; // reset for next drawing operations
}

async function updateLocationString(lat, lon) {
    const now = Date.now();
    // Only geocode if we haven't done it recently to avoid rate limiting
    if (now - lastGeocodeTime < 60000) return; 
    lastGeocodeTime = now;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
            const country = data.address.country_code ? data.address.country_code.toUpperCase() : "";
            currentCity = city ? `${city}, ${country}` : country;
        }
    } catch (e) {
        console.error("Geocoding failed", e);
    }
}

function updateFixTexts(fixValue) {
    let fixKey = "fix_none";
    let fixClass = "fix-bad";
    if (fixValue === 1) { fixKey = "fix_3d"; fixClass = "fix-ok"; }
    else if (fixValue === 2 || fixValue === 4 || fixValue === 5) { fixKey = "fix_dgps"; fixClass = "fix-dgps"; }
    
    document.getElementById('info-fix').textContent = t(fixKey);
    document.getElementById('radar-fix').textContent = t(fixKey);
}

// Update UI
let lastHistoryUpdate = 0;

function updateUI(parsed) {
    // Top Info + Fix Alert Logic
    updateFixTexts(parsed.fix);
    
    if(parsed.fix > 0 && lastFixStatus === 0) {
        addAlert(currentLang === 'tr' ? 'GNSS KONUMU BULUNDU' : 'GNSS FIX ACQUIRED', 'warning'); 
        document.getElementById('info-quality').textContent = t("excellent");
        document.getElementById('radar-quality').textContent = t("excellent");
    } else if (parsed.fix === 0 && lastFixStatus > 0) {
        addAlert(currentLang === 'tr' ? 'GNSS KONUMU KAYBEDİLDİ' : 'GNSS FIX LOST', 'error');
        document.getElementById('info-quality').textContent = t("poor");
        document.getElementById('radar-quality').textContent = t("poor");
    }
    lastFixStatus = parsed.fix;

    // DOP / Positioning
    document.getElementById('metric-hdop').textContent = parsed.hdop.toFixed(2);
    document.getElementById('metric-vdop').textContent = parsed.vdop.toFixed(2);
    document.getElementById('metric-pdop').textContent = parsed.pdop.toFixed(2);
    document.getElementById('radar-hdop').textContent = parsed.hdop.toFixed(2) + " m";
    
    if (parsed.lat && parsed.lon) {
        document.getElementById('metric-lat').textContent = parsed.lat.toFixed(6);
        document.getElementById('metric-lon').textContent = parsed.lon.toFixed(6);
        document.getElementById('metric-alt').textContent = parsed.alt ? parsed.alt.toFixed(1) + ' m' : '0.0 m';
        
        // Map Update
        const pos = [parsed.lat, parsed.lon];
        marker.setLatLng(pos);
        const dist = Math.abs(parsed.lat - lastLat) + Math.abs(parsed.lon - lastLon);
        if (lastLat === 0 || dist > 0.0001) {
            map.setView(pos, map.getZoom() < 10 ? 15 : map.getZoom());
            updateLocationString(parsed.lat, parsed.lon);
        }
        lastLat = parsed.lat;
        lastLon = parsed.lon;
    }

    // Satellites
    if (parsed.satellites) {
        const now = Date.now();
        const constellations = ['GPS', 'GLONASS', 'Galileo', 'BeiDou', 'QZSS'];
        
        // 1. Update global radarBlips
        constellations.forEach(constellation => {
            const sats = parsed.satellites[constellation] || [];
            sats.forEach(sat => {
                if (sat.az !== null && sat.el !== null && sat.snr > 0) {
                    const existing = radarBlips.find(b => b.prn === sat.prn && b.type === constellation);
                    if (existing) {
                        existing.az = parseFloat(sat.az);
                        existing.el = parseFloat(sat.el);
                        existing.snr = sat.snr;
                        existing.timestamp = now;
                    } else {
                        radarBlips.push({ prn: sat.prn, az: parseFloat(sat.az), el: parseFloat(sat.el), type: constellation, snr: sat.snr, timestamp: now });
                    }
                }
            });
        });

        // Ensure we are working with the latest filtered list (animateRadar also does this, but doing it here guarantees immediate correctness for SNR)
        radarBlips = radarBlips.filter(b => now - b.timestamp < 2000);

        let globalSnrSum = 0;
        let globalSnrCount = 0;
        const constellationMap = { 'GPS': 'gps', 'GLONASS': 'glo', 'Galileo': 'gal', 'BeiDou': 'bds', 'QZSS': 'qzs' };

        // 2. Render UI from smoothed radarBlips
        constellations.forEach(constellation => {
            const activeSats = radarBlips.filter(b => b.type === constellation);
            let cSnrSum = 0;
            const labels = [];
            const data = [];
            
            activeSats.forEach(sat => {
                cSnrSum += sat.snr;
                globalSnrSum += sat.snr;
                globalSnrCount++;
                labels.push(constellation.charAt(0) + sat.prn);
                data.push(sat.snr);
            });

            // Update Telemetry Chart
            if (telemetryCharts[constellation]) {
                telemetryCharts[constellation].data.labels = labels;
                telemetryCharts[constellation].data.datasets[0].data = data;
                telemetryCharts[constellation].update();
            }

            // Update Dashboard Signal Bar
            const avg = activeSats.length > 0 ? Math.round(cSnrSum / activeSats.length) : 0;
            const barId = constellationMap[constellation];
            document.getElementById(`val-${barId}`).textContent = avg;
            document.getElementById(`fill-${barId}`).style.width = Math.min(100, (avg / 60) * 100) + '%';
        });

        // Radar stats are now updated smoothly by the animateRadar loop

        // Update History
        if (now - lastHistoryUpdate > 2000) { // update history every 2s
            const globalAvg = globalSnrCount > 0 ? Math.round(globalSnrSum / globalSnrCount) : 0;
            const timeStr = new Date(now).toISOString().substring(11, 19);
            
            snrHistoryChart.data.labels.push(timeStr);
            snrHistoryChart.data.datasets[0].data.push(globalAvg);
            
            if(snrHistoryChart.data.labels.length > 20) {
                snrHistoryChart.data.labels.shift();
                snrHistoryChart.data.datasets[0].data.shift();
            }
            snrHistoryChart.update();
            lastHistoryUpdate = now;
        }
    }
}

function appendConsole(text) {
    if (isConsolePaused) return;
    rawDataLog.push(text);
    if(rawDataLog.length > 5000) rawDataLog.shift();

    const consoleEl = document.getElementById('console');
    const line = document.createElement('div');
    line.className = 'line';
    line.textContent = text;
    consoleEl.appendChild(line);

    if (consoleEl.scrollHeight - consoleEl.scrollTop < consoleEl.clientHeight + 100) {
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }
    if (consoleEl.children.length > 150) {
        consoleEl.removeChild(consoleEl.firstChild);
    }
}

// Websocket
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.onmessage = (event) => {
        const messages = JSON.parse(event.data);
        for (const msg of messages) {
            if (msg.type === 'raw') appendConsole(msg.data);
            else if (msg.type === 'parsed') updateUI(msg.data);
        }
    };
    ws.onclose = () => setTimeout(connectWebSocket, 2000);
}

// Tabs Logic
function initTabs() {
    const items = document.querySelectorAll('.nav-item');
    const contents = document.querySelectorAll('.tab-content');

    items.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all
            items.forEach(i => i.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked
            item.classList.add('active');
            const target = document.getElementById(item.getAttribute('data-target'));
            target.classList.add('active');

            // Handle specific tab resizes
            if(item.getAttribute('data-target') === 'tab-map') {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    });
}

// Boot
window.onload = () => {
    setTimeout(() => {
        splashScreen.style.opacity = '0';
        setTimeout(() => splashScreen.style.display = 'none', 1500);
    }, 2500);

    setInterval(() => {
        const now = new Date();
        const utcStr = now.toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
        const pad = (n) => n.toString().padStart(2, '0');
        const localStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} LOCAL | ${currentCity}`;
        
        document.getElementById('time-local').textContent = localStr;
        document.getElementById('time-utc').textContent = utcStr;
    }, 1000);

    initTabs();
    initMap();
    initTelemetryCharts();
    initHistoryChart();
    animateRadar(); 
    addAlert('SYSTEM INITIALIZED', 'warning');
    connectWebSocket();
    setLanguage('en');

    // Language Toggles
    const btnEn = document.getElementById('btn-lang-en');
    const btnTr = document.getElementById('btn-lang-tr');

    btnEn.addEventListener('click', () => {
        setLanguage('en');
        btnEn.classList.add('active');
        btnTr.classList.remove('active');
    });

    btnTr.addEventListener('click', () => {
        setLanguage('tr');
        btnTr.classList.add('active');
        btnEn.classList.remove('active');
    });

    // Settings actions
    document.getElementById('btn-pause').addEventListener('click', (e) => {
        isConsolePaused = !isConsolePaused;
        e.target.textContent = isConsolePaused ? (currentLang === 'tr' ? 'Akışı Devam Ettir' : 'Resume Data Stream') : t("pause_stream");
        e.target.classList.toggle('active');
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        document.getElementById('console').innerHTML = '';
        rawDataLog = [];
    });

    document.getElementById('btn-download').addEventListener('click', () => {
        const blob = new Blob([rawDataLog.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gnss_log_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });
};