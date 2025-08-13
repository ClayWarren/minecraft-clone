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

### Game Access

- Development: http://localhost:3000
- Menu allows selection between single/multiplayer modes

## Minecraft Clone Architecture

### Current Implementation Status

**✅ Foundation Complete (TypeScript ECS)**:

- Modern TypeScript codebase with strict type checking
- Entity-Component-System architecture for scalable game logic
- Three.js WebGL rendering with physics and lighting
- First-person player movement with WASD controls
- Development workflow with Vite hot reload

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
├── core/                  # ECS Architecture
│   ├── Entity.ts         # Entity management system
│   ├── System.ts         # Base system class
│   └── ECS.ts            # ECS coordinator
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

- **TypeScript**: Type-safe voxel data structures and game logic
- **Three.js**: Optimized voxel rendering with instancing and LOD
- **Vite**: Fast development for complex world generation testing
- **WebSockets**: Real-time multiplayer world synchronization
- **ECS Pattern**: Scalable architecture for complex Minecraft systems

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

- **Voxel Optimization**: Use efficient data structures for block storage
- **Component Design**: Keep block, item, and world data in separate components
- **System Separation**: Dedicated systems for world, crafting, inventory
- **Type Safety**: Strong typing for block IDs, item types, and world coordinates
- **Performance**: Optimize for large voxel worlds and chunk rendering

## Current Minecraft Implementation Notes

### Block Coordinate System

Use standard Minecraft-style coordinates:

- Y-axis: Vertical (0 = bedrock level)
- X/Z-axis: Horizontal world coordinates
- Chunk coordinates: World coordinates divided by 16

### Voxel Rendering Strategy

- Use Three.js BoxGeometry for individual blocks initially
- Plan migration to instanced rendering for performance
- Implement face culling for hidden block faces
- Add texture atlasing for efficient material usage

### Multiplayer Architecture

- Server-side world authority for anti-cheat
- Client prediction for responsive block placement
- Chunk streaming to reduce bandwidth
- Delta compression for world updates

## Development Best Practices for Minecraft

1. **Minecraft-First Development**: Every feature should serve the Minecraft experience
2. **Authentic Mechanics**: Study original Minecraft behavior for accuracy
3. **Performance Optimization**: Voxel worlds require careful performance management
4. **Modular Systems**: Use ECS to separate world, physics, crafting, and networking
5. **Type Safety**: Prevent bugs with strong TypeScript typing for game data

## Next Steps for Minecraft Implementation

**Immediate Priority**: Implement basic block placement/destruction system to demonstrate core Minecraft voxel interaction using the ECS architecture.

This will establish the foundation for all other Minecraft features and validate the TypeScript ECS approach for voxel-based gameplay.
