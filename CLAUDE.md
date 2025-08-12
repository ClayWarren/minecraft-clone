# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting the Application
```bash
# Quick start (recommended) - starts both server and client
./start.sh

# Manual start
npm start                    # Start multiplayer server only
python3 -m http.server 3000  # Start client server only
```

### Dependencies
```bash
npm install                  # Install WebSocket dependency (ws)
```

### Game Access
- Single Player: http://localhost:3000
- Multiplayer: http://localhost:3000?multiplayer=true

## Architecture Overview

### Core System Design
This is a **dual-architecture system** with both client-side and server-side implementations of the same game logic:

**Client-Side (`game.js`)**:
- Three.js WebGL rendering engine
- Complete standalone game for single-player mode
- WebSocket client for multiplayer networking
- All game systems duplicated for offline functionality

**Server-Side (`server.js`)**:
- Authoritative multiplayer server using WebSocket (ws library)
- Complete game logic duplication for validation
- World persistence and chunk streaming
- Anti-cheat protection through server-side validation

### Key Classes and Systems

**MinecraftClone Class (Client)**:
- Main game controller with Three.js scene management
- Handles both single-player and multiplayer modes via `this.isMultiplayer` flag
- Physics engine with AABB collision detection
- Chunk-based world rendering with merged meshes for performance

**MinecraftServer Class (Server)**:
- Authoritative game state management
- Real-time player synchronization
- World generation using Perlin noise for biomes and caves
- 20 TPS game loop for physics and weather updates

### World Generation System
- **Chunk-based**: 16x16 block chunks for infinite world expansion
- **Biome System**: 6 biomes (Plains, Desert, Forest, Ocean, Tundra, Mountains) with Perlin noise distribution
- **Structure Generation**: Villages, caves, ore veins with realistic depth distribution
- **Dual Implementation**: Both client and server can generate identical worlds using same algorithms

### Networking Architecture
- **State Synchronization**: All player actions validated server-side
- **Chunk Streaming**: Only sends visible chunks to reduce bandwidth
- **Anti-cheat**: Server validates all block placement, mining, and movement
- **Lag Compensation**: Client prediction with server reconciliation

### Asset-Free Design
- All textures generated procedurally using HTML5 Canvas
- No external image/sound dependencies
- Emoji-based UI icons
- Self-contained deployment

### Game Systems Integration
- **Crafting**: Tool progression from wood → stone → iron → diamond
- **Mining**: Block hardness system with proper tool requirements
- **Tool Durability**: Realistic wear and breakage mechanics
- **Weather/Day-Night**: Synchronized between all players in multiplayer
- **Water Physics**: Flow simulation with source block mechanics

## Development Notes

### Multiplayer Mode Detection
The application determines game mode via URL parameter: `?multiplayer=true`

### Block Coordinate System
Uses standard Minecraft-style coordinates with chunk-relative positioning for optimization.

### Performance Considerations
- Merged mesh geometry for chunk rendering
- Particle system limits to prevent performance degradation
- Fog culling for distant terrain
- Chunk-based loading/unloading

### Tool/Block Properties
Both client and server maintain identical property maps for blocks and tools to ensure consistency across single-player and multiplayer modes.