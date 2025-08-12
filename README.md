# Minecraft Clone - Complete Multiplayer Edition

A complete web-based Minecraft clone with full multiplayer support, built with Three.js featuring procedural world generation, realistic graphics, comprehensive game systems, and real-time multiplayer networking.

## Features

### 🎮 Core Gameplay
- **First-person 3D movement** with pointer lock controls
- **Procedural terrain generation** with 6 unique biomes
- **Realistic mining system** with tool requirements and durability
- **Complete crafting system** with tool progression (wood → diamond)
- **Inventory management** with visual hotbar system
- **15+ different block types** with procedural textures

### 🌍 Multiplayer Features
- **Real-time multiplayer** with authoritative server
- **Chunk-based world streaming** for optimal performance  
- **Server-side world persistence** with automatic saving
- **Anti-cheat protection** with server validation
- **Player management** with join/leave notifications
- **Lag compensation** with client prediction

### 🎨 Block Types & Biomes
- **6 Unique Biomes**: Plains, Desert, Forest, Ocean, Tundra, Mountains
- **15+ Block Types**: Grass, Dirt, Stone, Wood, Sand, Water, Snow, Ice, Leaves, Planks, Sandstone
- **Ore Generation**: Coal, Iron, Diamond with realistic depth distribution
- **Procedural Textures**: All blocks use canvas-generated textures
- **Animated Textures**: Flowing water and bubbling lava effects
- **Village Generation**: Houses, shops, farms with biome-appropriate materials

### 🎨 Graphics & Effects
- **WebGL rendering** with hardware acceleration
- **Day/night cycle** with dynamic sun/moon lighting
- **Weather system** with rain, snow, storms, and lightning
- **Particle effects** for block breaking and ambient atmosphere
- **Block breaking animation** with progressive crack overlays
- **Water physics** with realistic flow and source mechanics
- **Fog effects** that change with time and weather
- **Optimized chunk rendering** for smooth performance

## 🚀 Quick Start

### Requirements
- **Node.js** (for multiplayer server)
- **Python 3** (for client server)
- **Modern web browser** with WebGL support

### Easy Setup (Recommended)
1. **Clone this repository:**
   ```bash
   git clone <repository-url>
   cd minecraft-clone
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start everything:**
   ```bash
   ./start.sh
   ```
4. **Play the game:**
   - Single Player: http://localhost:3000
   - Multiplayer: http://localhost:3000?multiplayer=true

### Manual Setup
1. **Start multiplayer server:**
   ```bash
   node server.js
   ```
2. **Start client server:**
   ```bash
   python3 -m http.server 3000
   ```
3. **Open browser** and choose game mode

### 🎮 Game Modes

#### Single Player
- Complete offline experience
- All features available
- World saves locally in browser

#### Multiplayer 
- Real-time collaborative building
- Shared world with persistence
- Up to multiple players simultaneously
- Server-side world generation and validation

## Controls

### Movement
- **WASD** - Move forward/backward/left/right
- **Mouse** - Look around (first-person view)
- **Space** - Jump
- **Click anywhere** - Lock cursor to start playing
- **ESC** - Unlock cursor (to access browser/close game)

### 🔨 Building & Mining
- **Left Click** - Start mining block (hold until progress bar completes)
- **Right Click** - Place selected block from hotbar
- **Mining requires proper tools** - Stone needs pickaxe, wood needs axe
- **Tool durability** - Tools break after realistic usage
- **Block hardness** - Different blocks take different time to mine

### 🎒 Inventory & Crafting
- **1-9 Keys** - Select hotbar slot directly
- **Mouse Scroll Wheel** - Cycle through hotbar slots
- **C Key** - Open crafting menu with all recipes
- **Visual hotbar** - shows selected item, quantities, and tool durability
- **Complete crafting tree** - Wood → Planks → Sticks → Tools
- **Tool progression** - Wooden → Stone → Iron → Diamond tools

## 🌍 World Generation

### Infinite World System
- **Chunk-based generation** - Infinite world expansion
- **6 unique biomes** with realistic distribution
- **Biome-specific features:**
  - **Plains** - Grass plains with scattered trees and villages
  - **Desert** - Sand dunes with sandstone villages and rare water
  - **Forest** - Dense tree coverage with wooden structures
  - **Ocean** - Large water bodies with underwater terrain
  - **Tundra** - Snow-covered landscape with ice formations
  - **Mountains** - Stone peaks with exposed ore veins
- **Underground cave systems** - 3D noise-generated caverns
- **Village generation** - Houses, shops, farms, and wells

### ⚙️ Technical Systems
- **Authoritative server** - All game logic validated server-side
- **Chunk streaming** - Only loads visible world sections
- **Real-time synchronization** - All player actions synced instantly  
- **Anti-cheat protection** - Server validates all movements and actions
- **World persistence** - Automatic saving and loading of world state
- **Lag compensation** - Smooth movement with network prediction

## 🎯 Game Progression

### Starting Resources
- **Basic blocks:** 64 Grass, Dirt, Stone + 32 Wood, Sand
- **Unlimited bedrock** for testing/creative building
- **No tools** - Must craft your first wooden pickaxe

### Crafting Progression
1. **Wood → Planks** (1 wood = 4 planks)
2. **Planks → Sticks** (2 planks = 4 sticks)  
3. **Planks + Sticks → Wooden Tools** (basic tools)
4. **Mine stone → Craft Stone Tools** (2x efficiency)
5. **Mine iron ore → Smelt → Iron Tools** (3x efficiency)
6. **Mine diamonds → Diamond Tools** (4x efficiency, highest durability)

### Mining Requirements
- **Stone/Coal:** Wooden pickaxe or better
- **Iron Ore:** Stone pickaxe or better  
- **Diamond Ore:** Iron pickaxe or better
- **Wood blocks:** Any axe for faster mining
- **Dirt/Sand:** Any shovel for faster mining

## Browser Compatibility

### Recommended Browsers
- **Chrome/Chromium** - Best performance
- **Firefox** - Good performance
- **Safari** - Good performance on macOS
- **Edge** - Good performance on Windows

### Performance Notes
- **M2 MacBook Pro optimized** - excellent performance
- **8GB RAM friendly** - efficient memory usage
- **WebGL required** - all modern browsers support this
- **Mobile devices** - works but controls are optimized for desktop

## Architecture

### Technology Stack
- **Three.js** - 3D graphics library
- **WebGL** - Hardware-accelerated rendering
- **Vanilla JavaScript** - No framework dependencies
- **HTML5 Canvas** - Rendering surface
- **CSS3** - UI styling

### File Structure
```
minecraft-clone/
├── index.html          # Main HTML structure and game mode selection UI
├── game.js             # Core game logic, Three.js rendering, and multiplayer client
├── server.js           # Complete multiplayer server with all game systems
├── start.sh            # Easy startup script for both server and client
├── package.json        # Node.js dependencies and scripts
├── package-lock.json   # Dependency lock file
├── node_modules/       # Node.js dependencies (ws for WebSocket)
├── README.md           # Complete documentation
├── .claude/            # Claude Code settings
├── .venv/              # Python virtual environment
└── path/               # Additional virtual environment directory
```

## ✅ Completed Features

### Core Systems
- ✅ **Complete multiplayer networking** with authoritative server
- ✅ **Full crafting system** with realistic tool progression
- ✅ **Advanced world generation** with biomes, caves, villages
- ✅ **Day/night cycle** with dynamic lighting and sky colors
- ✅ **Weather system** with rain, snow, storms, and lightning
- ✅ **Water physics** with realistic flow mechanics
- ✅ **Particle effects** for immersive block breaking
- ✅ **Tool durability** and mining requirements
- ✅ **Chunk-based world streaming** for infinite worlds
- ✅ **World persistence** with automatic save/load

### Visual Effects
- ✅ **Procedural block textures** (grass, stone, ores, etc.)
- ✅ **Animated textures** for water and lava
- ✅ **Block breaking animation** with progressive cracks
- ✅ **Weather particles** (rain drops, snow flakes)
- ✅ **Dynamic fog** that changes with weather and time
- ✅ **Realistic lighting** with sun/moon positioning

### Multiplayer Features
- ✅ **Real-time player synchronization**
- ✅ **Server-side physics validation**
- ✅ **Anti-cheat protection**
- ✅ **Lag compensation and prediction**
- ✅ **Player management** (join/leave notifications)
- ✅ **Shared world state** with persistence

## Development

### Local Development
1. **Edit files** in any text editor
2. **Refresh browser** to see changes
3. **Use browser dev tools** for debugging
4. **No build process** required - direct file editing

### Adding Features
- **Block types:** Add to `materials` object in `game.js`
- **UI elements:** Modify `index.html` and CSS
- **Game mechanics:** Extend functions in `game.js`
- **Graphics:** Use Three.js documentation for advanced features

## 🚀 Performance & Optimization

### Client Optimization
- **Chunk-based rendering** - Only renders visible world sections
- **Merged mesh geometry** - Efficient block rendering
- **Particle system optimization** - Limited particle count
- **Texture atlas system** - Reduced GPU texture switches
- **Fog culling** - Distant objects not rendered

### Server Optimization  
- **20 TPS game loop** - Smooth server-side physics
- **Chunk streaming** - Only sends visible chunks to players
- **Delta compression** - Only sends changed data
- **Efficient collision detection** - AABB-based physics
- **Memory management** - Automatic cleanup of unused chunks

### Network Optimization
- **Message queuing** - Reliable delivery of critical updates
- **Rate limiting** - Prevents spam and reduces bandwidth
- **State compression** - Minimal data transfer
- **Client prediction** - Smooth movement with lag compensation

## Troubleshooting

### Common Issues
- **Black screen:** Check browser console for WebGL errors
- **Poor performance:** Close other applications, use Chrome
- **Controls not working:** Make sure you clicked to lock the cursor
- **Blocks not placing:** Check if you have blocks in inventory

### System Requirements
- **WebGL 1.0 support** (all modern browsers)
- **4GB+ RAM** recommended
- **Dedicated GPU** helpful but not required
- **Modern CPU** - M2 MacBook Pro is perfect

## License
Open source - feel free to modify and expand!

---

**Have fun building! 🎮⛏️🏗️**