#!/bin/bash

# Minecraft Clone - Complete Multiplayer Setup
echo "🎮 Starting Minecraft Clone..."

# Kill any existing processes on the ports
echo "🔄 Cleaning up existing processes..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start the multiplayer server
echo "🌐 Starting multiplayer server on port 8080..."
node server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Start the client server
echo "🖥️  Starting client server on port 3000..."
python3 -m http.server 3000 &
CLIENT_PID=$!

echo ""
echo "✅ Minecraft Clone is ready!"
echo ""
echo "🎯 Game URLs:"
echo "   Single Player: http://localhost:3000"
echo "   Multiplayer:   http://localhost:3000?multiplayer=true"
echo ""
echo "📋 Features Available:"
echo "   ✅ Complete world generation (biomes, caves, villages)"
echo "   ✅ Full crafting system with tool progression"
echo "   ✅ Realistic mining with tool durability"
echo "   ✅ Water physics and flowing mechanics"
echo "   ✅ Day/night cycle with dynamic lighting"
echo "   ✅ Weather system (rain, snow, storms)"
echo "   ✅ Particle effects and block breaking animation"
echo "   ✅ Multiplayer support with real-time sync"
echo "   ✅ Chunk-based world streaming"
echo "   ✅ Server-side world persistence"
echo ""
echo "🎮 Controls:"
echo "   WASD - Move"
echo "   Mouse - Look around"
echo "   Left Click - Mine blocks"
echo "   Right Click - Place blocks"
echo "   C - Open crafting menu"
echo "   1-9 - Select hotbar items"
echo "   ESC - Release cursor"
echo ""
echo "Press Ctrl+C to stop all servers"

# Handle cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $SERVER_PID 2>/dev/null || true
    kill $CLIENT_PID 2>/dev/null || true
    echo "✅ Shutdown complete"
    exit 0
}

trap cleanup SIGINT
trap cleanup SIGTERM

# Wait for both processes
wait