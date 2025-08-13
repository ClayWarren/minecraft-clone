# Minecraft Clone - TypeScript Edition

A **modern Minecraft clone** built with **TypeScript and Entity-Component-System (ECS) architecture**. This project rebuilds the classic voxel sandbox game using modern web technologies, clean code patterns, and type safety.

## 🎯 Project Vision

Build a complete Minecraft-style game featuring:

- **Voxel world generation** with infinite terrain
- **Block building and mining** mechanics
- **Crafting and progression** systems
- **Multiplayer support** with real-time synchronization
- **Modern TypeScript codebase** with ECS architecture

## ✨ Current Status

### ✅ Completed (TypeScript ECS Foundation)

- **Modern TypeScript Architecture**: Full ECS pattern implementation
- **3D Rendering Engine**: Three.js WebGL with physics and lighting
- **Player Movement**: First-person WASD controls with mouse look
- **Physics System**: Gravity, collision detection, jumping
- **Development Workflow**: Vite hot reload, TypeScript compilation
- **Code Quality Infrastructure**: ESLint 9.33.0, Prettier 3.6.2, pre-commit hooks
- **AAA Game Development Systems**: Object pooling, fixed timestep physics, performance profiling, asset management
- **Professional Game Architecture**: State management, input buffering, instanced rendering optimizations
- **Clean Codebase**: Modular systems, type safety, no 4000-line monoliths!

### 🚧 In Development (Minecraft Features)

- **Block System**: Voxel rendering and interaction
- **World Generation**: Infinite terrain with biomes and structures
- **Mining & Building**: Block placement and destruction
- **Crafting System**: Tools, items, and progression
- **Inventory Management**: Item storage and hotbar
- **Multiplayer**: Real-time world synchronization

### 🎮 Demo Scene

Currently displays a test environment with:

- Green grass ground plane
- Various colored blocks (demonstrating entity system)
- First-person camera controls
- Physics and lighting systems
- Debug information panel

## 🚀 Quick Start

### Installation

```bash
# Clone and install
git clone <repository-url>
cd minecraft-clone
npm install

# Start development server
npm run dev

# Code quality commands
npm run lint          # Check for linting issues
npm run format        # Format all code
npm run check         # Run lint + format + tests
npm test              # Run all tests
```

### Play the Demo

1. Open http://localhost:3000
2. Click "Single Player"
3. Click anywhere to lock cursor
4. Use **WASD** to move, **Mouse** to look, **Space** to jump

## 🎮 Planned Minecraft Features

### 🌍 World & Terrain

- **Infinite World**: Chunk-based procedural generation
- **Biomes**: Plains, forests, deserts, mountains, oceans
- **Terrain Features**: Caves, villages, ore deposits
- **Day/Night Cycle**: Dynamic lighting and mob spawning

### ⛏️ Core Gameplay

- **Block Types**: Grass, dirt, stone, wood, ores, liquids
- **Mining System**: Tool requirements, block hardness, durability
- **Building**: Block placement with physics validation
- **Crafting**: Tool progression from wood → stone → iron → diamond

### 🎒 Items & Progression

- **Inventory System**: 36-slot inventory with hotbar
- **Tools & Weapons**: Pickaxes, swords, axes with durability
- **Crafting Recipes**: Workbench-based item creation
- **Resource Gathering**: Mining, logging, farming

### 🌐 Multiplayer

- **Real-time Sync**: Shared world state across players
- **Server Authority**: Anti-cheat with server-side validation
- **World Persistence**: Save/load world data
- **Player Management**: Join/leave, chat, permissions

## 🏗️ Technical Architecture

### Modern TypeScript ECS

```typescript
// Entities: Game objects
const block = new Entity('grass_block')

// Components: Data containers
block.addComponent(new TransformComponent(x, y, z))
block.addComponent(new MeshComponent(grassMesh))
block.addComponent(new BlockComponent('grass'))

// Systems: Logic processors
class BlockSystem extends System {
  update(deltaTime: number, entities: Entity[]) {
    // Handle block interactions, mining, placement
  }
}
```

### Core Systems Architecture

**Game Logic Systems:**
- **BlockSystem**: Voxel world management and interactions
- **WorldSystem**: Chunk generation, biomes, structures
- **CraftingSystem**: Recipe processing and item creation
- **InventorySystem**: Item management and UI
- **PhysicsSystem**: Player movement and collision
- **RenderSystem**: Optimized voxel rendering
- **NetworkSystem**: Multiplayer synchronization

**AAA Game Development Systems:**
- **ObjectPool**: Memory management for frequently created objects
- **GameLoop**: Fixed timestep physics with 60 FPS simulation
- **Profiler**: Real-time performance monitoring and metrics
- **GameStateManager**: Professional state machine (menu, loading, playing, etc.)
- **AssetManager**: Resource loading, caching, and lifecycle management
- **InputBuffer**: Responsive controls with complex input sequences
- **InstancedVoxelRenderer**: High-performance rendering for thousands of blocks

### File Structure

```
src/
├── types/
│   ├── blocks.ts           # Block definitions and properties
│   ├── items.ts            # Item types and recipes
│   └── world.ts            # World generation types
├── core/                   # AAA Game Development Systems
│   ├── ECS.ts             # Entity-Component-System coordinator
│   ├── ObjectPool.ts      # Memory management and object pooling
│   ├── GameLoop.ts        # Fixed timestep physics loop (60 FPS)
│   ├── Profiler.ts        # Performance monitoring and metrics
│   ├── GameStateManager.ts # Professional state machine
│   ├── AssetManager.ts    # Resource loading and caching
│   ├── InputBuffer.ts     # Responsive input system
│   └── GameDevIntegration.ts # Professional game engine example
├── rendering/
│   └── InstancedVoxelRenderer.ts # High-performance voxel rendering
├── systems/
│   ├── BlockSystem.ts      # Block interaction logic
│   ├── WorldSystem.ts      # Terrain generation
│   ├── CraftingSystem.ts   # Recipe processing
│   └── InventorySystem.ts  # Item management
├── components/
│   ├── BlockComponent.ts   # Block data and properties
│   ├── ItemComponent.ts    # Item stacks and metadata
│   └── ChunkComponent.ts   # World chunk data
└── world/
    ├── WorldGenerator.ts   # Terrain algorithms
    ├── BiomeSystem.ts      # Biome definitions
    └── ChunkManager.ts     # Chunk loading/unloading
```

## 🛠️ Development Roadmap

### Phase 1: Block System ⏳

- [ ] Block entity creation and rendering
- [ ] Block interaction (place/destroy)
- [ ] Basic material system
- [ ] Simple inventory

### Phase 2: World Generation 🗺️

- [ ] Chunk-based terrain generation
- [ ] Basic biomes (plains, forest, desert)
- [ ] Ore distribution and caves
- [ ] World persistence

### Phase 3: Gameplay Systems ⛏️

- [ ] Mining with tool requirements
- [ ] Crafting table and recipes
- [ ] Player inventory UI
- [ ] Tool durability system

### Phase 4: Advanced Features 🌟

- [ ] Multiplayer networking
- [ ] Mob spawning and AI
- [ ] Weather and day/night
- [ ] Advanced world features

## 🔧 Technology Stack

### Core Technologies
- **[TypeScript 5.9.2](https://typescriptlang.org/)** - Type-safe development
- **[Three.js 0.179.1](https://threejs.org/)** - WebGL 3D graphics
- **[Vite 7.1.2](https://vitejs.dev/)** - Fast build and dev server
- **[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)** - Multiplayer networking
- **ECS Architecture** - Scalable game entity management

### Game Development & Performance
- **Object Pooling** - Memory management for reduced garbage collection
- **Fixed Timestep Physics** - Consistent 60 FPS simulation across all devices
- **Performance Profiling** - Real-time monitoring of frame times and memory usage
- **Professional State Management** - Menu, loading, playing, paused states
- **Asset Management** - Efficient loading, caching, and cleanup of game resources
- **Input Buffering** - Responsive controls with complex input sequences
- **Instanced Rendering** - High-performance rendering for thousands of voxel blocks

### Code Quality & Testing
- **[ESLint 9.33.0](https://eslint.org/)** - Modern flat config with TypeScript support
- **[Prettier 3.6.2](https://prettier.io/)** - Consistent code formatting
- **[Vitest](https://vitest.dev/)** - Fast unit and integration testing (214+ tests)
- **[Husky 9.1.7](https://typicode.github.io/husky/)** - Pre-commit hooks for quality gates

## 🎮 Why TypeScript + ECS?

### Problems with Original Monolithic Code

- **4000+ line single file** - impossible to maintain
- **No type safety** - runtime errors and bugs
- **Coupled systems** - changes break multiple features
- **No testing** - difficult to verify functionality

### Benefits of TypeScript ECS

- **Modular systems** - easy to add/remove features
- **Type safety** - catch errors at compile time
- **Scalable architecture** - handles complex game features
- **Testable code** - unit test individual systems with 214+ passing tests
- **Modern tooling** - great IDE support and debugging
- **Code quality** - automated linting, formatting, and pre-commit hooks

## 🤝 Contributing

We're building a modern Minecraft clone! Key principles:

1. **Minecraft-First**: Every feature should work toward the Minecraft experience
2. **TypeScript ECS**: Use component-based architecture for all game systems
3. **Code Quality**: Use ESLint, Prettier, and write tests for new features
4. **Performance**: Optimize for smooth voxel world rendering
5. **Compatibility**: Maintain familiar Minecraft gameplay mechanics

### Development Workflow

```bash
# Before committing
npm run check         # Runs linting, formatting, and tests
npm run fix           # Auto-fixes linting and formatting issues

# Pre-commit hooks automatically run:
# - ESLint validation
# - Prettier formatting
# - Only clean commits are allowed
```

## 🎯 Current Priority

**Get basic block placement/destruction working** - this is the core of Minecraft gameplay and will demonstrate the ECS architecture handling voxel world interactions.

---

**Building Minecraft the right way with modern web technologies** ⛏️🎮
