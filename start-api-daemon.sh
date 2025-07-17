#!/bin/bash

# Dashboard API Daemon Starter
echo "🚀 Starting Dashboard API Daemon..."

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Set up environment
export NODE_ENV=production
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Function to start the API server
start_api() {
    echo "📡 Starting API server on port 3001..."
    nohup node api-server.js > api-server.log 2>&1 &
    API_PID=$!
    echo $API_PID > api-server.pid
    echo "✅ API server started with PID: $API_PID"
    echo "📋 Log file: $SCRIPT_DIR/api-server.log"
    echo "🔍 Check status: ps -p $API_PID"
}

# Function to stop the API server
stop_api() {
    if [ -f api-server.pid ]; then
        PID=$(cat api-server.pid)
        if ps -p $PID > /dev/null; then
            echo "🔴 Stopping API server (PID: $PID)..."
            kill $PID
            rm -f api-server.pid
            echo "✅ API server stopped"
        else
            echo "⚠️  API server not running"
            rm -f api-server.pid
        fi
    else
        echo "⚠️  PID file not found"
    fi
}

# Function to check status
check_status() {
    if [ -f api-server.pid ]; then
        PID=$(cat api-server.pid)
        if ps -p $PID > /dev/null; then
            echo "✅ API server is running (PID: $PID)"
            echo "📡 URL: http://localhost:3001"
            echo "🎤 Siri endpoint: http://localhost:3001/siri/add-task"
            return 0
        else
            echo "❌ API server is not running (stale PID file)"
            rm -f api-server.pid
            return 1
        fi
    else
        echo "❌ API server is not running"
        return 1
    fi
}

# Function to restart
restart_api() {
    stop_api
    sleep 2
    start_api
}

# Function to get network IP
get_network_ip() {
    IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    if [ ! -z "$IP" ]; then
        echo "🌐 Network IP: $IP"
        echo "📱 iPhone URL: http://$IP:3001/siri/add-task"
    else
        echo "⚠️  Could not determine network IP"
    fi
}

# Main script logic
case "${1:-start}" in
    start)
        if check_status >/dev/null 2>&1; then
            echo "⚠️  API server is already running"
            check_status
        else
            start_api
            sleep 2
            get_network_ip
        fi
        ;;
    stop)
        stop_api
        ;;
    restart)
        restart_api
        sleep 2
        get_network_ip
        ;;
    status)
        check_status
        get_network_ip
        ;;
    logs)
        if [ -f api-server.log ]; then
            tail -f api-server.log
        else
            echo "❌ Log file not found"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the API daemon"
        echo "  stop    - Stop the API daemon"
        echo "  restart - Restart the API daemon"
        echo "  status  - Check if daemon is running"
        echo "  logs    - View API server logs"
        exit 1
        ;;
esac