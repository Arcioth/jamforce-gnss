# Maintainer: Arcioth <arcioth@example.com>
pkgname=jamforce-gnss
pkgver=1.0.0
pkgrel=2
pkgdesc="JamForce GNSS Monitor for Taoglas - Tactical Multi-Constellation Dashboard"
arch=('x86_64')
url="https://github.com/Arcioth/jamforce-gnss"
license=('MIT')
depends=('python' 'webkit2gtk-4.1' 'gtk3')
makedepends=('cargo' 'npm' 'nodejs')
source=("git+https://github.com/Arcioth/jamforce-gnss.git")
md5sums=('SKIP')

build() {
    cd "$pkgname"
    # Install node dependencies
    npm install
    
    # Build Tauri frontend and Rust backend
    npx tauri build
}

package() {
    cd "$pkgname"

    # Create installation directories
    install -d "$pkgdir/opt/$pkgname"
    install -d "$pkgdir/usr/bin"
    install -d "$pkgdir/usr/share/applications"
    install -d "$pkgdir/usr/share/icons/hicolor/128x128/apps"

    # Install the compiled Tauri binary
    install -Dm755 src-tauri/target/release/app "$pkgdir/opt/$pkgname/app"

    # Install the Python backend, UI assets, and shell script
    cp -r app.py launch.sh static templates "$pkgdir/opt/$pkgname/"
    chmod +x "$pkgdir/opt/$pkgname/launch.sh"

    # Setup Python Virtual Environment for AUR Installation
    python3 -m venv "$pkgdir/opt/$pkgname/venv"
    "$pkgdir/opt/$pkgname/venv/bin/pip" install fastapi uvicorn pyserial pynmea2 websockets jinja2

    # Install the global wrapper script
    install -Dm755 jamforce-gnss.sh "$pkgdir/usr/bin/jamforce-gnss"

    # Install desktop entry and icon
    install -Dm644 src-tauri/icons/128x128.png "$pkgdir/usr/share/icons/hicolor/128x128/apps/jamforce-gnss.png"
    
    cat <<EOF > "$pkgdir/usr/share/applications/jamforce-gnss.desktop"
[Desktop Entry]
Name=JamForce GNSS Monitor
Comment=Tactical Taoglas GNSS Tracker
Exec=jamforce-gnss
Icon=jamforce-gnss
Terminal=false
Type=Application
Categories=Utility;HardwareSettings;
EOF
}
