#!/bin/bash

echo "⚙️ Creating LaunchAgent for Dashboard API..."

# Create LaunchAgent directory if it doesn't exist
mkdir -p ~/Library/LaunchAgents

# Create the plist file
cat > ~/Library/LaunchAgents/com.dashboard.api.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dashboard.api</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$(pwd)/api-server.js</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>$(pwd)</string>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>KeepAlive</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>$(pwd)/api-daemon.log</string>
    
    <key>StandardErrorPath</key>
    <string>$(pwd)/api-daemon-error.log</string>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
    
    <!-- Prevent sleep from stopping the service -->
    <key>LaunchOnlyOnce</key>
    <false/>
    
    <!-- Restart if it crashes -->
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
EOF

echo "✅ LaunchAgent created: ~/Library/LaunchAgents/com.dashboard.api.plist"

# Load the LaunchAgent
echo "🔄 Loading LaunchAgent..."
launchctl unload ~/Library/LaunchAgents/com.dashboard.api.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.dashboard.api.plist

if [ $? -eq 0 ]; then
    echo "✅ LaunchAgent loaded successfully!"
    echo ""
    echo "🎯 Your Dashboard API will now:"
    echo "   • Start automatically when you log in"
    echo "   • Keep running even during system sleep"
    echo "   • Restart automatically if it crashes"
    echo "   • Run on http://localhost:3001"
    echo ""
    echo "📱 Commands:"
    echo "   Check status: launchctl list | grep dashboard"
    echo "   Stop service: launchctl unload ~/Library/LaunchAgents/com.dashboard.api.plist"
    echo "   Start service: launchctl load ~/Library/LaunchAgents/com.dashboard.api.plist"
    echo ""
    echo "📋 Logs:"
    echo "   Output: $(pwd)/api-daemon.log"
    echo "   Errors: $(pwd)/api-daemon-error.log"
else
    echo "❌ Failed to load LaunchAgent"
    echo "💡 Try running: sudo launchctl load ~/Library/LaunchAgents/com.dashboard.api.plist"
fi