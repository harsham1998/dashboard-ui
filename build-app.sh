#!/bin/bash

# Build macOS Application Bundle
# This creates a standalone .app that can be added to Login Items

APP_NAME="Dashboard Wallpaper"
APP_DIR="${HOME}/Applications/${APP_NAME}.app"
CONTENTS_DIR="${APP_DIR}/Contents"
MACOS_DIR="${CONTENTS_DIR}/MacOS"
RESOURCES_DIR="${CONTENTS_DIR}/Resources"

echo "Building ${APP_NAME}.app..."

# Create user Applications directory if it doesn't exist
mkdir -p "${HOME}/Applications"

# Remove existing app if it exists
rm -rf "${APP_DIR}"

# Create app directory structure
mkdir -p "${MACOS_DIR}"
mkdir -p "${RESOURCES_DIR}"

# Copy the entire project to Resources
cp -R . "${RESOURCES_DIR}/dashboard-electron"

# Install npm dependencies in the app bundle
cd "${RESOURCES_DIR}/dashboard-electron"
npm install

# Create the executable script
tee "${MACOS_DIR}/Dashboard Wallpaper" > /dev/null << 'EOF'
#!/bin/bash
# Set up PATH for login items
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/../Resources/dashboard-electron"
/usr/local/bin/npm start 2>/dev/null || /opt/homebrew/bin/npm start 2>/dev/null || npm start
EOF

# Make it executable
chmod +x "${MACOS_DIR}/Dashboard Wallpaper"

# Create Info.plist
tee "${CONTENTS_DIR}/Info.plist" > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Dashboard Wallpaper</string>
    <key>CFBundleIdentifier</key>
    <string>com.dashboard.electron</string>
    <key>CFBundleName</key>
    <string>Dashboard Wallpaper</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.12</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

# Copy icon if it exists
if [ -f "assets/icon.png" ]; then
    cp "assets/icon.png" "${RESOURCES_DIR}/icon.png"
fi

echo "✅ Application bundle created at ${APP_DIR}"
echo "📱 You can now add it to System Preferences > Users & Groups > Login Items"
echo "🗂️  Or drag it to Applications folder and add to Login Items"