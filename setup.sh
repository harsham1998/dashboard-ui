#!/bin/bash

# Dashboard UI Setup Script
echo "🚀 Setting up Dashboard UI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create desktop shortcut (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🖥️  Creating desktop shortcut..."
    
    # Create app bundle structure
    mkdir -p "Dashboard.app/Contents/MacOS"
    
    # Create launcher script
    cat > "Dashboard.app/Contents/MacOS/Dashboard" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")/../../.."
npm start
EOF
    
    chmod +x "Dashboard.app/Contents/MacOS/Dashboard"
    
    # Create Info.plist
    cat > "Dashboard.app/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Dashboard</string>
    <key>CFBundleIdentifier</key>
    <string>com.dashboard.app</string>
    <key>CFBundleName</key>
    <string>Dashboard</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
</dict>
</plist>
EOF
    
    echo "✅ Desktop shortcut created: Dashboard.app"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run: npm start"
echo "   2. Set up Firebase (if not already done)"
echo "   3. Configure Siri Shortcuts (optional)"
echo ""
echo "🔗 Useful links:"
echo "   • Firebase Console: https://console.firebase.google.com/project/dashboard-app-fcd42"
echo "   • API Repository: https://github.com/harsham1998/dashboard-flask-api"
echo "   • Documentation: See README.md"
echo ""
echo "✨ Happy productivity!"