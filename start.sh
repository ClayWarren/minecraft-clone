#!/bin/bash

# Minecraft Clone - TypeScript Edition Setup
echo "🎮 Starting Minecraft Clone (TypeScript Edition)..."

# Kill any existing processes on the ports
echo "🔄 Cleaning up existing processes..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start the multiplayer server (TypeScript)
echo "🌐 Starting multiplayer server (TypeScript) on port 8080..."
npm run server &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Start the Vite development server
echo "🖥️  Starting Vite development server on port 3000..."
npm run dev &
CLIENT_PID=$!

echo ""
echo "✅ Minecraft Clone is ready!"
echo ""
echo "🎯 Game URLs:"
echo "   Single Player: http://localhost:3000"
echo "   Multiplayer:   http://localhost:3000?multiplayer=true"
echo ""
echo "📋 Modern Features:"
echo "   ✅ TypeScript + ECS Architecture"
echo "   ✅ Vite Development Server with Hot Reload"
echo "   ✅ Three.js WebGL Rendering Engine"
echo "   ✅ Modern Physics System"
echo "   ✅ Modular Component-Based Design"
echo "   ✅ Type-Safe Game Development"
echo "   ✅ No More 4000-Line Monolith!"
echo "   🚧 World Generation (Coming Soon)"
echo "   🚧 Multiplayer Support (Coming Soon)"
echo "   🚧 Crafting System (Coming Soon)"
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