# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **modern Minecraft clone** built with **TypeScript and Entity-Component-System (ECS) architecture**. The goal is to recreate the classic voxel sandbox experience using modern web technologies, clean code patterns, and type safety.

## Development Commands

### Starting the Application

```bash
# Quick start (recommended) - TypeScript development server
npm run dev

# Build for production
npm run build

# Start both server and client
npm start

# Manual start
npm run server              # Start multiplayer server only
npm run dev                 # Start Vite development server
```

### Dependencies

```bash
npm install                 # Install all dependencies (TypeScript, Vite, Three.js, WebSockets)
```

### Code Quality Commands

```bash
npm run lint                # Check for linting issues
npm run lint:fix            # Auto-fix linting issues
npm run format              # Format all code
npm run format:check        # Check formatting without changes
npm run check               # Run lint + format check + tests
npm run fix                 # Auto-fix lint + format issues
npm test                    # Run all tests (214+ tests)
```

### Game Access

- Development: http://localhost:3000
- Menu allows selection between single/multiplayer modes

## Minecraft Clone Architecture

### Current Implementation Status

**✅ Foundation Complete (TypeScript ECS)**:

- Modern TypeScript 5.9.2 codebase with strict type checking
- Entity-Component-System architecture for scalable game logic
- Three.js 0.179.1 WebGL rendering with physics and lighting
- First-person player movement with WASD controls
- Development workflow with Vite 7.1.2 hot reload
- Professional code quality infrastructure (ESLint 9.33.0, Prettier 3.6.2, pre-commit hooks)
- AAA game development systems (object pooling, fixed timestep, profiling, state management)
- Comprehensive test suite with 214+ passing tests

**🚧 Minecraft Features In Development**:

- Block system for voxel world interaction
- Chunk-based world generation with biomes
- Mining and building mechanics
- Crafting system with tool progression
- Inventory management and UI
- Multiplayer networking and synchronization

### Project Structure for Minecraft Systems

```
src/
├── types/
│   ├── index.ts           # Core ECS and game types
│   ├── blocks.ts          # Block definitions and properties
│   ├── items.ts           # Item types and crafting recipes
│   └── world.ts           # World generation and chunk types
├── core/                  # AAA Game Development Systems
│   ├── Entity.ts         # Entity management system
│   ├── System.ts         # Base system class
│   ├── ECS.ts            # ECS coordinator
│   ├── ObjectPool.ts     # Memory management and object pooling
│   ├── GameLoop.ts       # Fixed timestep physics loop (60 FPS)
│   ├── Profiler.ts       # Performance monitoring and metrics
│   ├── GameStateManager.ts # Professional state machine
│   ├── AssetManager.ts   # Resource loading and caching
│   ├── InputBuffer.ts    # Responsive input system
│   └── GameDevIntegration.ts # Professional game engine example
├── rendering/            # High-Performance Rendering
│   └── InstancedVoxelRenderer.ts # Instanced rendering for voxels
├── components/           # Game Components
│   ├── index.ts         # Basic components (Transform, Velocity, etc.)
│   ├── BlockComponent.ts # Block data and properties
│   ├── ItemComponent.ts  # Item stacks and metadata
│   └── ChunkComponent.ts # World chunk data
├── systems/              # Game Systems
│   ├── PhysicsSystem.ts  # Player physics and collision
│   ├── RenderSystem.ts   # Three.js rendering pipeline
│   ├── InputSystem.ts    # Player input and controls
│   ├── BlockSystem.ts    # Block interaction and voxel logic
│   ├── WorldSystem.ts    # Terrain generation and chunks
│   ├── CraftingSystem.ts # Recipe processing
│   └── InventorySystem.ts # Item management
├── world/                # World Generation
│   ├── WorldGenerator.ts # Terrain generation algorithms
│   ├── BiomeSystem.ts    # Biome definitions and distribution
│   └── ChunkManager.ts   # Chunk loading and optimization
├── Game.ts               # Main game coordinator
└── main.ts               # Application entry point
```

### Minecraft-Specific Systems

**BlockSystem (Priority)**:

- Handle block placement and destruction
- Voxel world representation and optimization
- Block type definitions and properties
- Collision detection for block interactions

**WorldSystem**:

- Chunk-based infinite world generation
- Biome distribution (plains, forest, desert, mountains)
- Terrain features (caves, ore deposits, structures)
- World persistence and save/load

**CraftingSystem**:

- Recipe definitions and processing
- Tool progression (wood → stone → iron → diamond)
- Workbench and furnace mechanics
- Item transformation and creation

**InventorySystem**:

- 36-slot player inventory management
- Hotbar selection and item usage
- Item stacking and metadata
- UI integration for inventory display

### Technology Stack for Minecraft Features

**Core Technologies:**
- **TypeScript 5.9.2**: Type-safe voxel data structures and game logic
- **Three.js 0.179.1**: Optimized voxel rendering with instancing and LOD
- **Vite 7.1.2**: Fast development for complex world generation testing
- **WebSockets**: Real-time multiplayer world synchronization
- **ECS Pattern**: Scalable architecture for complex Minecraft systems

**AAA Game Development Systems:**
- **Object Pooling**: Memory management for reduced garbage collection
- **Fixed Timestep Physics**: Consistent 60 FPS simulation across devices
- **Performance Profiling**: Real-time frame time and memory monitoring
- **Professional State Management**: Menu, loading, playing, paused states
- **Asset Management**: Efficient resource loading, caching, and cleanup
- **Input Buffering**: Responsive controls with complex input sequences
- **Instanced Rendering**: High-performance rendering for thousands of blocks

**Code Quality & Testing:**
- **ESLint 9.33.0**: Modern flat config with TypeScript support
- **Prettier 3.6.2**: Consistent code formatting
- **Vitest**: Fast unit and integration testing (214+ tests)
- **Husky 9.1.7**: Pre-commit hooks for quality gates

## Development Priorities

### IMPORTANT: Focus on Core Minecraft Gameplay

When working on this codebase, prioritize implementing authentic Minecraft mechanics:

#### Phase 1: Block System (Current Priority)

1. **Block Entities**: Create block entities with proper voxel positioning
2. **Block Interaction**: Left-click to mine, right-click to place
3. **Block Types**: Basic blocks (grass, dirt, stone, wood)
4. **Simple Inventory**: Basic item storage for collected blocks

#### Phase 2: World Generation

1. **Chunk System**: 16x16 block chunks for infinite worlds
2. **Terrain Generation**: Height maps and basic biomes
3. **Block Placement**: Proper voxel world structure
4. **World Persistence**: Save/load chunk data

#### Phase 3: Minecraft Mechanics

1. **Mining System**: Tool requirements and block hardness
2. **Crafting**: Workbench and basic recipes
3. **Player Progression**: Tool durability and upgrades
4. **Inventory UI**: Proper Minecraft-style interface

#### Phase 4: Advanced Features

1. **Multiplayer**: Real-time world synchronization
2. **Mobs**: Basic creature AI and spawning
3. **Weather**: Day/night cycle and environmental effects
4. **Structures**: Villages, dungeons, and generated buildings

### Code Quality for Minecraft Systems

**Quality Standards:**
- **Code Quality**: All code passes ESLint validation with zero errors/warnings
- **Formatting**: Consistent Prettier formatting across the entire codebase
- **Testing**: Write tests for new features, maintain 214+ passing tests
- **Type Safety**: Strong typing for block IDs, item types, and world coordinates
- **Pre-commit Hooks**: Automatic quality gates prevent broken commits

**Architecture Standards:**
- **AAA Game Development**: Use professional systems (object pooling, fixed timestep, profiling)
- **Memory Management**: Efficient object pooling and garbage collection optimization
- **Performance Monitoring**: Real-time profiling of frame times and memory usage
- **Voxel Optimization**: Use efficient data structures and instanced rendering for blocks
- **Component Design**: Keep block, item, and world data in separate components
- **System Separation**: Dedicated systems for world, crafting, inventory, and performance

## Current Minecraft Implementation Notes

### Block Coordinate System

Use standard Minecraft-style coordinates:

- Y-axis: Vertical (0 = bedrock level)
- X/Z-axis: Horizontal world coordinates
- Chunk coordinates: World coordinates divided by 16

### Voxel Rendering Strategy

- **Instanced Rendering**: High-performance rendering system for thousands of identical blocks
- **Memory Optimization**: Object pooling for Three.js Vector3, Euler, and Matrix4 objects
- **Performance Profiling**: Real-time monitoring of rendering performance and memory usage
- **Face Culling**: Hidden block face optimization for better performance
- **Texture Atlasing**: Efficient material usage with texture atlases

### Multiplayer Architecture

- Server-side world authority for anti-cheat
- Client prediction for responsive block placement
- Chunk streaming to reduce bandwidth
- Delta compression for world updates

## Development Best Practices for Minecraft

1. **Minecraft-First Development**: Every feature should serve the Minecraft experience
2. **AAA Game Development Standards**: Use professional systems (object pooling, fixed timestep, profiling)
3. **Code Quality First**: Use `npm run check` before committing, write tests for new features
4. **Performance Optimization**: Leverage instanced rendering, object pooling, and memory profiling
5. **Authentic Mechanics**: Study original Minecraft behavior for accuracy
6. **Modular Systems**: Use ECS to separate world, physics, crafting, and networking
7. **Type Safety**: Prevent bugs with strong TypeScript typing for game data

### Development Workflow

**Before implementing new features:**
1. Run `npm run check` to ensure existing code is clean
2. Write failing tests for the new feature
3. Implement the feature with proper TypeScript types
4. Ensure all tests pass (`npm test`)
5. Run `npm run fix` to auto-format code
6. Commit changes (pre-commit hooks ensure quality)

## Next Steps for Minecraft Implementation

**Immediate Priority**: Implement basic block placement/destruction system to demonstrate core Minecraft voxel interaction using the ECS architecture and new AAA game development systems.

This will establish the foundation for all other Minecraft features and validate the TypeScript ECS approach with professional game development practices for voxel-based gameplay.

## AAA Game Development Systems Status

**✅ COMPLETED - Professional Game Infrastructure:**
- Object Pooling system for memory management
- Fixed Timestep Game Loop with 60 FPS physics simulation
- Performance Profiling tools for real-time monitoring
- Game State Management with professional state machine
- Asset Management System for resource loading and caching
- Input Buffering system for responsive controls
- Instanced Voxel Renderer for high-performance block rendering
- Comprehensive test suite (214+ tests) covering all systems
- Integration example showing all systems working together

The project now has **AAA-quality game development infrastructure** comparable to professional game engines, ready for implementing core Minecraft features with optimal performance.
