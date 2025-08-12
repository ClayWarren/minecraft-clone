// =============================================================================
//  MINECRAFT CLONE - MULTIPLAYER SERVER
// =============================================================================
// Complete authoritative server with all game systems
// Features: World generation, physics, crafting, tools, weather, day/night
// =============================================================================

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class MinecraftServer {
    constructor() {
        this.wss = new WebSocket.Server({ port: 8080 });
        
        // Game state
        this.players = new Map();
        this.blockData = new Map();
        this.chunkSize = 16;
        this.loadedChunks = new Set();
        this.generatedStructures = new Set();
        this.villages = new Map();
        
        // Game systems
        this.timeOfDay = 0;
        this.dayLength = 20 * 60 * 1000; // 20 minutes
        this.startTime = Date.now();
        
        // Weather system
        this.weather = {
            type: 'clear',
            intensity: 0,
            duration: 0,
            nextWeatherChange: Date.now() + Math.random() * 300000 + 60000
        };
        
        // Water physics
        this.waterUpdates = new Set();
        this.waterFlowTimer = 0;
        
        // Biome and world generation
        this.biomes = {
            plains: { surface: 'grass', subsurface: 'dirt', treeChance: 0.02, villageChance: 0.01 },
            desert: { surface: 'sand', subsurface: 'sandstone', treeChance: 0.001, villageChance: 0.005 },
            forest: { surface: 'grass', subsurface: 'dirt', treeChance: 0.08, villageChance: 0.003 },
            ocean: { surface: 'water', subsurface: 'sand', treeChance: 0, villageChance: 0 },
            tundra: { surface: 'snow', subsurface: 'dirt', treeChance: 0.01, villageChance: 0.002 },
            mountains: { surface: 'stone', subsurface: 'stone', treeChance: 0.005, villageChance: 0.001 }
        };
        
        // Block properties
        this.blockProperties = {
            grass: { hardness: 0.6, tool: 'shovel', drops: ['dirt'] },
            dirt: { hardness: 0.5, tool: 'shovel', drops: ['dirt'] },
            stone: { hardness: 1.5, tool: 'pickaxe', level: 0, drops: ['stone'] },
            wood: { hardness: 2.0, tool: 'axe', drops: ['wood'] },
            sand: { hardness: 0.5, tool: 'shovel', drops: ['sand'] },
            coal_ore: { hardness: 3.0, tool: 'pickaxe', level: 0, drops: ['coal'] },
            iron_ore: { hardness: 3.0, tool: 'pickaxe', level: 1, drops: ['iron_ore'] },
            diamond_ore: { hardness: 3.0, tool: 'pickaxe', level: 2, drops: ['diamond'] },
            bedrock: { hardness: -1, tool: null, drops: [] },
            planks: { hardness: 2.0, tool: 'axe', drops: ['planks'] },
            water: { hardness: -1, tool: null, drops: [] },
            snow: { hardness: 0.2, tool: 'shovel', drops: ['snow'] },
            leaves: { hardness: 0.2, tool: null, drops: [] },
            sandstone: { hardness: 0.8, tool: 'pickaxe', drops: ['sandstone'] },
            ice: { hardness: 0.5, tool: 'pickaxe', drops: ['ice'] }
        };
        
        // Tool properties
        this.toolProperties = {
            wooden_pickaxe: { type: 'pickaxe', level: 0, efficiency: 2.0 },
            stone_pickaxe: { type: 'pickaxe', level: 1, efficiency: 4.0 },
            iron_pickaxe: { type: 'pickaxe', level: 2, efficiency: 6.0 },
            diamond_pickaxe: { type: 'pickaxe', level: 3, efficiency: 8.0 },
            wooden_axe: { type: 'axe', level: 0, efficiency: 2.0 },
            stone_axe: { type: 'axe', level: 1, efficiency: 4.0 },
            iron_axe: { type: 'axe', level: 2, efficiency: 6.0 },
            diamond_axe: { type: 'axe', level: 3, efficiency: 8.0 },
            wooden_shovel: { type: 'shovel', level: 0, efficiency: 2.0 },
            stone_shovel: { type: 'shovel', level: 1, efficiency: 4.0 },
            iron_shovel: { type: 'shovel', level: 2, efficiency: 6.0 },
            diamond_shovel: { type: 'shovel', level: 3, efficiency: 8.0 }
        };
        
        // Crafting recipes
        this.craftingRecipes = {
            planks: { ingredients: { wood: 1 }, output: { planks: 4 } },
            sticks: { ingredients: { planks: 2 }, output: { sticks: 4 } },
            wooden_pickaxe: { ingredients: { planks: 3, sticks: 2 }, output: { wooden_pickaxe: 1 }, durability: 59 },
            stone_pickaxe: { ingredients: { stone: 3, sticks: 2 }, output: { stone_pickaxe: 1 }, durability: 131 },
            iron_pickaxe: { ingredients: { iron_ingot: 3, sticks: 2 }, output: { iron_pickaxe: 1 }, durability: 250 },
            diamond_pickaxe: { ingredients: { diamond: 3, sticks: 2 }, output: { diamond_pickaxe: 1 }, durability: 1561 },
            wooden_axe: { ingredients: { planks: 3, sticks: 2 }, output: { wooden_axe: 1 }, durability: 59 },
            stone_axe: { ingredients: { stone: 3, sticks: 2 }, output: { stone_axe: 1 }, durability: 131 },
            iron_axe: { ingredients: { iron_ingot: 3, sticks: 2 }, output: { iron_axe: 1 }, durability: 250 },
            diamond_axe: { ingredients: { diamond: 3, sticks: 2 }, output: { diamond_axe: 1 }, durability: 1561 },
            wooden_shovel: { ingredients: { planks: 1, sticks: 2 }, output: { wooden_shovel: 1 }, durability: 59 },
            stone_shovel: { ingredients: { stone: 1, sticks: 2 }, output: { stone_shovel: 1 }, durability: 131 },
            iron_shovel: { ingredients: { iron_ingot: 1, sticks: 2 }, output: { iron_shovel: 1 }, durability: 250 },
            diamond_shovel: { ingredients: { diamond: 1, sticks: 2 }, output: { diamond_shovel: 1 }, durability: 1561 }
        };
        
        this.init();
    }
    
    init() {
        console.log('🎮 Minecraft Server starting...');
        
        // Load world if exists
        this.loadWorld();
        
        // Start game loops
        this.startGameLoop();
        this.startPhysicsLoop();
        this.startWeatherLoop();
        
        // Setup WebSocket handlers
        this.setupWebSocket();
        
        console.log('✅ Minecraft Server ready on port 8080!');
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            this.handlePlayerConnect(ws);
        });
    }
    
    handlePlayerConnect(ws) {
        const playerId = this.generatePlayerId();
        console.log(`👤 Player ${playerId} connected`);
        
        // Initialize player data
        const player = {
            id: playerId,
            ws: ws,
            position: { x: 0, y: 80, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            health: 20,
            hunger: 20,
            inventory: {
                grass: 64, dirt: 64, stone: 64, wood: 32, sand: 32, bedrock: Infinity,
                coal_ore: 0, iron_ore: 0, diamond_ore: 0,
                wooden_pickaxe: 0, stone_pickaxe: 0, iron_pickaxe: 0, diamond_pickaxe: 0,
                wooden_axe: 0, stone_axe: 0, iron_axe: 0, diamond_axe: 0,
                wooden_shovel: 0, stone_shovel: 0, iron_shovel: 0, diamond_shovel: 0,
                planks: 0, sticks: 0, coal: 0, iron_ingot: 0, diamond: 0
            },
            selectedSlot: 0,
            hotbar: ['grass', 'dirt', 'stone', 'wood', 'sand', 'bedrock', 'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe'],
            tools: new Map(),
            onGround: false,
            lastUpdate: Date.now(),
            chunkRadius: 4,
            loadedChunks: new Set(),
            miningState: {
                isActive: false,
                position: null,
                startTime: 0,
                requiredTime: 0,
                blockType: null
            }
        };
        
        this.players.set(playerId, player);
        
        // Send initial game state
        this.sendInitialGameState(player);
        
        // Setup message handlers
        ws.on('message', (message) => {
            this.handlePlayerMessage(playerId, message);
        });
        
        ws.on('close', () => {
            this.handlePlayerDisconnect(playerId);
        });
        
        ws.on('error', (error) => {
            console.error(`❌ Player ${playerId} error:`, error);
            this.handlePlayerDisconnect(playerId);
        });
    }
    
    handlePlayerMessage(playerId, message) {
        try {
            const data = JSON.parse(message);
            const player = this.players.get(playerId);
            if (!player) return;
            
            switch (data.type) {
                case 'move':
                    this.handlePlayerMove(player, data);
                    break;
                case 'startMining':
                    this.handleStartMining(player, data);
                    break;
                case 'stopMining':
                    this.handleStopMining(player);
                    break;
                case 'placeBlock':
                    this.handlePlaceBlock(player, data);
                    break;
                case 'craft':
                    this.handleCraft(player, data);
                    break;
                case 'hotbarSelect':
                    this.handleHotbarSelect(player, data);
                    break;
                case 'requestChunks':
                    this.handleChunkRequest(player, data);
                    break;
                default:
                    console.warn(`⚠️  Unknown message type: ${data.type}`);
            }
        } catch (error) {
            console.error(`❌ Error handling message from ${playerId}:`, error);
        }
    }
    
    handlePlayerMove(player, data) {
        // Validate movement (anti-cheat)
        const { position, velocity } = data;
        const maxSpeed = 20; // blocks per second
        const deltaTime = (Date.now() - player.lastUpdate) / 1000;
        
        if (deltaTime > 0) {
            const distance = Math.sqrt(
                Math.pow(position.x - player.position.x, 2) +
                Math.pow(position.y - player.position.y, 2) +
                Math.pow(position.z - player.position.z, 2)
            );
            
            const speed = distance / deltaTime;
            if (speed > maxSpeed) {
                // Reject movement, send correction
                this.sendToPlayer(player, {
                    type: 'positionCorrection',
                    position: player.position
                });
                return;
            }
        }
        
        player.position = position;
        player.velocity = velocity;
        player.lastUpdate = Date.now();
        
        // Update chunks if needed
        this.updatePlayerChunks(player);
        
        // Broadcast to other players
        this.broadcastToOthers(player, {
            type: 'playerMove',
            playerId: player.id,
            position: position,
            velocity: velocity
        });
    }
    
    handleStartMining(player, data) {
        const { position } = data;
        const blockKey = `${position.x},${position.y},${position.z}`;
        const blockType = this.blockData.get(blockKey);
        
        if (!blockType || blockType === 'bedrock') return;
        
        const blockProps = this.blockProperties[blockType];
        if (!blockProps || blockProps.hardness === -1) return;
        
        // Check tool requirements
        const selectedItem = player.hotbar[player.selectedSlot];
        const toolProps = this.toolProperties[selectedItem];
        
        if (!this.canMineBlock(blockType, selectedItem)) {
            this.sendToPlayer(player, {
                type: 'miningFailed',
                reason: 'invalidTool'
            });
            return;
        }
        
        // Calculate mining time
        let miningTime = blockProps.hardness * 1000;
        if (toolProps && toolProps.type === blockProps.tool) {
            miningTime /= toolProps.efficiency;
        } else {
            miningTime *= 5;
        }
        
        player.miningState = {
            isActive: true,
            position: position,
            startTime: Date.now(),
            requiredTime: miningTime,
            blockType: blockType
        };
        
        // Broadcast mining start to all players
        this.broadcast({
            type: 'playerStartMining',
            playerId: player.id,
            position: position,
            duration: miningTime
        });
    }
    
    handleStopMining(player) {
        if (!player.miningState.isActive) return;
        
        const elapsed = Date.now() - player.miningState.startTime;
        if (elapsed >= player.miningState.requiredTime) {
            // Mining completed
            this.finishMining(player);
        } else {
            // Mining cancelled
            player.miningState.isActive = false;
            this.broadcastToOthers(player, {
                type: 'playerStopMining',
                playerId: player.id
            });
        }
    }
    
    finishMining(player) {
        const pos = player.miningState.position;
        const blockType = player.miningState.blockType;
        const blockKey = `${pos.x},${pos.y},${pos.z}`;
        
        // Remove block
        this.blockData.delete(blockKey);
        
        // Add drops to inventory
        const blockProps = this.blockProperties[blockType];
        const drops = blockProps.drops || [blockType];
        
        drops.forEach(drop => {
            if (player.inventory[drop] !== undefined) {
                if (player.inventory[drop] !== Infinity) {
                    player.inventory[drop]++;
                }
            } else {
                player.inventory[drop] = 1;
            }
        });
        
        // Damage tool
        this.damageTool(player, player.hotbar[player.selectedSlot]);
        
        // Trigger water physics
        this.checkWaterFlow(pos);
        
        // Reset mining state
        player.miningState.isActive = false;
        
        // Broadcast to all players
        this.broadcast({
            type: 'blockUpdate',
            position: pos,
            blockType: null
        });
        
        this.broadcast({
            type: 'playerFinishMining',
            playerId: player.id,
            position: pos
        });
        
        // Update player inventory
        this.sendPlayerUpdate(player);
        
        // Save world state
        this.saveWorld();
    }
    
    handlePlaceBlock(player, data) {
        const { position, blockType } = data;
        const blockKey = `${position.x},${position.y},${position.z}`;
        
        // Validate placement
        if (this.blockData.has(blockKey)) return;
        if (!player.inventory[blockType] || player.inventory[blockType] <= 0) return;
        
        // Check if player has the block in hotbar
        if (!player.hotbar.includes(blockType)) return;
        
        // Place block
        this.blockData.set(blockKey, blockType);
        
        // Update inventory
        if (player.inventory[blockType] !== Infinity) {
            player.inventory[blockType]--;
        }
        
        // Trigger water physics if needed
        if (blockType === 'water') {
            this.triggerWaterUpdate(position);
        } else {
            this.checkWaterDisplacement(position);
        }
        
        // Broadcast to all players
        this.broadcast({
            type: 'blockUpdate',
            position: position,
            blockType: blockType
        });
        
        // Update player inventory
        this.sendPlayerUpdate(player);
        
        // Save world state
        this.saveWorld();
    }
    
    handleCraft(player, data) {
        const { recipe } = data;
        const success = this.craft(player, recipe);
        
        this.sendToPlayer(player, {
            type: 'craftResult',
            recipe: recipe,
            success: success
        });
        
        if (success) {
            this.sendPlayerUpdate(player);
        }
    }
    
    handleHotbarSelect(player, data) {
        const { slot } = data;
        if (slot >= 0 && slot < player.hotbar.length) {
            player.selectedSlot = slot;
        }
    }
    
    handleChunkRequest(player, data) {
        const { chunks } = data;
        chunks.forEach(chunkKey => {
            this.sendChunkToPlayer(player, chunkKey);
        });
    }
    
    handlePlayerDisconnect(playerId) {
        console.log(`👤 Player ${playerId} disconnected`);
        
        // Broadcast player leave
        this.broadcastToOthers(this.players.get(playerId), {
            type: 'playerLeave',
            playerId: playerId
        });
        
        this.players.delete(playerId);
    }
    
    // World generation methods
    noise(x, z) {
        let value = 0, f = 0.02, a = 1;
        for (let i = 0; i < 4; i++) {
            value += Math.sin(x * f) * Math.cos(z * f) * a;
            f *= 2; a *= 0.5;
        }
        return value;
    }
    
    getBiome(x, z) {
        const temperature = (Math.sin(x * 0.01) + Math.cos(z * 0.015)) * 0.5 + 0.5;
        const humidity = (Math.cos(x * 0.013) + Math.sin(z * 0.01)) * 0.5 + 0.5;
        const elevation = this.noise(x * 0.02, z * 0.02);
        
        if (elevation < -0.3) return 'ocean';
        if (elevation > 0.5) return 'mountains';
        if (temperature < 0.3) return 'tundra';
        if (temperature > 0.7) return humidity < 0.3 ? 'desert' : 'plains';
        return humidity > 0.6 ? 'forest' : 'plains';
    }
    
    isCave(x, y, z) {
        if (y > 35) return false;
        
        const caveNoise1 = this.caveNoise(x * 0.04, y * 0.04, z * 0.04);
        const caveNoise2 = this.caveNoise(x * 0.06, y * 0.06, z * 0.06);
        const caveNoise3 = this.caveNoise(x * 0.08, y * 0.08, z * 0.08);
        
        const combinedNoise = (caveNoise1 + caveNoise2 * 0.5 + caveNoise3 * 0.25) / 1.75;
        return combinedNoise > 0.6;
    }
    
    caveNoise(x, y, z) {
        const sinX = Math.sin(x);
        const cosY = Math.cos(y);
        const sinZ = Math.sin(z);
        return (sinX * cosY + sinZ * cosY + sinX * sinZ) / 3 + 0.5;
    }
    
    generateChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        if (this.loadedChunks.has(chunkKey)) return;
        
        this.loadedChunks.add(chunkKey);
        const minHeight = -10;
        
        for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
            for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
                const height = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
                
                for (let y = height; y >= minHeight; y--) {
                    const blockKey = `${x},${y},${z}`;
                    if (this.blockData.has(blockKey)) continue;
                    
                    // Check for caves
                    if (this.isCave(x, y, z)) continue;
                    
                    // Generate blocks based on biome
                    const biome = this.getBiome(x, z);
                    const biomeData = this.biomes[biome];
                    let blockType;
                    
                    if (y === minHeight) {
                        blockType = 'bedrock';
                    } else if (y === height) {
                        if (biome === 'ocean' && height < 35) {
                            blockType = 'water';
                        } else {
                            blockType = biomeData.surface;
                        }
                    } else if (height - y > 3) {
                        const oreRandom = Math.random();
                        if (y < 20 && oreRandom < 0.01) blockType = 'diamond_ore';
                        else if (y < 32 && oreRandom < 0.02) blockType = 'iron_ore';
                        else if (y < 40 && oreRandom < 0.05) blockType = 'coal_ore';
                        else blockType = 'stone';
                    } else {
                        blockType = biomeData.subsurface;
                    }
                    
                    this.blockData.set(blockKey, blockType);
                }
            }
        }
        
        // Generate structures
        this.generateStructuresInChunk(cx, cz);
    }
    
    generateStructuresInChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        if (this.generatedStructures.has(chunkKey)) return;
        
        this.generatedStructures.add(chunkKey);
        
        const centerX = cx * this.chunkSize + this.chunkSize / 2;
        const centerZ = cz * this.chunkSize + this.chunkSize / 2;
        
        const biome = this.getBiome(centerX, centerZ);
        const biomeData = this.biomes[biome];
        
        // Generate village
        if (Math.random() < biomeData.villageChance) {
            this.generateVillage(centerX, centerZ, biome);
        }
        
        // Generate trees
        for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
            for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
                const localBiome = this.getBiome(x, z);
                const localBiomeData = this.biomes[localBiome];
                
                if (Math.random() < localBiomeData.treeChance) {
                    this.generateTree(x, z);
                }
            }
        }
    }
    
    generateVillage(centerX, centerZ, biome) {
        const villageSize = 5 + Math.floor(Math.random() * 3);
        const villageKey = `${centerX},${centerZ}`;
        
        this.villages.set(villageKey, {
            center: { x: centerX, z: centerZ },
            biome: biome,
            buildings: []
        });
        
        this.generateWell(centerX, centerZ);
        
        for (let i = 0; i < villageSize; i++) {
            const angle = (i / villageSize) * Math.PI * 2;
            const distance = 15 + Math.random() * 10;
            const buildingX = centerX + Math.cos(angle) * distance;
            const buildingZ = centerZ + Math.sin(angle) * distance;
            
            const buildingType = Math.random();
            if (buildingType < 0.4) {
                this.generateHouse(Math.floor(buildingX), Math.floor(buildingZ), biome);
            } else if (buildingType < 0.7) {
                this.generateShop(Math.floor(buildingX), Math.floor(buildingZ), biome);
            } else {
                this.generateFarm(Math.floor(buildingX), Math.floor(buildingZ), biome);
            }
        }
    }
    
    generateWell(x, z) {
        const surfaceY = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
        
        // Clear area
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy <= 4; dy++) {
                    const blockKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                    this.blockData.delete(blockKey);
                }
            }
        }
        
        // Well structure
        const wellBlocks = [
            { x: 0, y: 0, z: 0, type: 'stone' }, { x: 1, y: 0, z: 0, type: 'stone' }, { x: -1, y: 0, z: 0, type: 'stone' },
            { x: 0, y: 0, z: 1, type: 'stone' }, { x: 0, y: 0, z: -1, type: 'stone' },
            { x: 0, y: 1, z: 0, type: 'water' },
            { x: 2, y: 1, z: 0, type: 'wood' }, { x: 2, y: 2, z: 0, type: 'wood' }, { x: 2, y: 3, z: 0, type: 'wood' },
            { x: -2, y: 1, z: 0, type: 'wood' }, { x: -2, y: 2, z: 0, type: 'wood' }, { x: -2, y: 3, z: 0, type: 'wood' },
            { x: -1, y: 4, z: 0, type: 'wood' }, { x: 0, y: 4, z: 0, type: 'wood' }, { x: 1, y: 4, z: 0, type: 'wood' }
        ];
        
        wellBlocks.forEach(block => {
            const blockKey = `${x + block.x},${surfaceY + block.y},${z + block.z}`;
            this.blockData.set(blockKey, block.type);
        });
    }
    
    generateHouse(x, z, biome) {
        const surfaceY = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
        const wallMaterial = biome === 'desert' ? 'sandstone' : 'planks';
        const roofMaterial = biome === 'tundra' ? 'snow' : 'wood';
        
        // Clear area
        for (let dx = -3; dx <= 3; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                for (let dy = 0; dy <= 6; dy++) {
                    const blockKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                    this.blockData.delete(blockKey);
                }
            }
        }
        
        // Build house
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                // Floor
                const floorKey = `${x + dx},${surfaceY},${z + dz}`;
                this.blockData.set(floorKey, wallMaterial);
                
                // Walls
                if (dx === -2 || dx === 2 || dz === -2 || dz === 2) {
                    for (let dy = 1; dy <= 3; dy++) {
                        if (!(dx === 0 && dz === 2 && dy <= 2)) {
                            const wallKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                            this.blockData.set(wallKey, wallMaterial);
                        }
                    }
                }
                
                // Roof
                if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
                    const roofKey = `${x + dx},${surfaceY + 4},${z + dz}`;
                    this.blockData.set(roofKey, roofMaterial);
                }
            }
        }
    }
    
    generateShop(x, z, biome) {
        const surfaceY = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
        const wallMaterial = biome === 'desert' ? 'sandstone' : 'stone';
        
        // Clear area
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                for (let dy = 0; dy <= 7; dy++) {
                    const blockKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                    this.blockData.delete(blockKey);
                }
            }
        }
        
        // Build shop
        for (let dx = -3; dx <= 3; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                // Floor
                const floorKey = `${x + dx},${surfaceY},${z + dz}`;
                this.blockData.set(floorKey, wallMaterial);
                
                // Walls
                if (dx === -3 || dx === 3 || dz === -3 || dz === 3) {
                    for (let dy = 1; dy <= 4; dy++) {
                        if (!((dx === 0 || dx === 1) && dz === 3 && dy <= 2)) {
                            const wallKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                            this.blockData.set(wallKey, wallMaterial);
                        }
                    }
                }
                
                // Roof
                if (Math.abs(dx) <= 3 && Math.abs(dz) <= 3) {
                    const roofKey = `${x + dx},${surfaceY + 5},${z + dz}`;
                    this.blockData.set(roofKey, 'planks');
                }
            }
        }
    }
    
    generateFarm(x, z, biome) {
        const surfaceY = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
        
        // Clear and flatten farm area
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                for (let dy = 0; dy <= 3; dy++) {
                    const blockKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                    this.blockData.delete(blockKey);
                }
                
                const plotKey = `${x + dx},${surfaceY},${z + dz}`;
                this.blockData.set(plotKey, 'dirt');
            }
        }
        
        // Add fence
        for (let dx = -5; dx <= 5; dx++) {
            for (let dz = -5; dz <= 5; dz++) {
                if (dx === -5 || dx === 5 || dz === -5 || dz === 5) {
                    const fenceKey = `${x + dx},${surfaceY + 1},${z + dz}`;
                    this.blockData.set(fenceKey, 'wood');
                }
            }
        }
        
        // Water sources
        const waterKey1 = `${x},${surfaceY + 1},${z}`;
        const waterKey2 = `${x + 2},${surfaceY + 1},${z + 2}`;
        this.blockData.set(waterKey1, 'water');
        this.blockData.set(waterKey2, 'water');
    }
    
    generateTree(x, z) {
        const surfaceY = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        
        // Tree trunk
        for (let y = 1; y <= treeHeight; y++) {
            const trunkKey = `${x},${surfaceY + y},${z}`;
            this.blockData.set(trunkKey, 'wood');
        }
        
        // Tree leaves
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy <= 2; dy++) {
                    if (Math.abs(dx) + Math.abs(dz) + dy < 4) {
                        const leafKey = `${x + dx},${surfaceY + treeHeight + dy},${z + dz}`;
                        if (Math.random() > 0.3) {
                            this.blockData.set(leafKey, 'leaves');
                        }
                    }
                }
            }
        }
    }
    
    // Game systems
    canMineBlock(blockType, tool) {
        const blockProps = this.blockProperties[blockType];
        const toolProps = this.toolProperties[tool];
        
        if (!blockProps) return false;
        if (blockProps.hardness === -1) return false;
        
        if (blockProps.level !== undefined) {
            if (!toolProps || toolProps.level < blockProps.level) {
                return false;
            }
        }
        
        return true;
    }
    
    craft(player, recipe) {
        const recipeData = this.craftingRecipes[recipe];
        if (!recipeData) return false;
        
        // Check ingredients
        for (const [ingredient, amount] of Object.entries(recipeData.ingredients)) {
            if (!player.inventory[ingredient] || player.inventory[ingredient] < amount) {
                return false;
            }
        }
        
        // Consume ingredients
        for (const [ingredient, amount] of Object.entries(recipeData.ingredients)) {
            player.inventory[ingredient] -= amount;
        }
        
        // Add outputs
        for (const [output, amount] of Object.entries(recipeData.output)) {
            if (!player.inventory[output]) player.inventory[output] = 0;
            player.inventory[output] += amount;
            
            if (recipeData.durability && this.toolProperties[output]) {
                player.tools.set(output, recipeData.durability);
            }
        }
        
        return true;
    }
    
    damageTool(player, toolName) {
        if (!this.toolProperties[toolName]) return;
        
        if (player.tools.has(toolName)) {
            const currentDurability = player.tools.get(toolName);
            if (currentDurability <= 1) {
                player.inventory[toolName]--;
                player.tools.delete(toolName);
                if (player.inventory[toolName] <= 0) {
                    delete player.inventory[toolName];
                }
            } else {
                player.tools.set(toolName, currentDurability - 1);
            }
        }
    }
    
    // Water physics
    triggerWaterUpdate(pos) {
        const positions = [
            pos,
            { x: pos.x + 1, y: pos.y, z: pos.z },
            { x: pos.x - 1, y: pos.y, z: pos.z },
            { x: pos.x, y: pos.y, z: pos.z + 1 },
            { x: pos.x, y: pos.y, z: pos.z - 1 },
            { x: pos.x, y: pos.y - 1, z: pos.z }
        ];
        
        positions.forEach(p => {
            this.waterUpdates.add(`${p.x},${p.y},${p.z}`);
        });
    }
    
    checkWaterDisplacement(pos) {
        const adjacentPositions = [
            { x: pos.x + 1, y: pos.y, z: pos.z },
            { x: pos.x - 1, y: pos.y, z: pos.z },
            { x: pos.x, y: pos.y + 1, z: pos.z },
            { x: pos.x, y: pos.y - 1, z: pos.z },
            { x: pos.x, y: pos.y, z: pos.z + 1 },
            { x: pos.x, y: pos.y, z: pos.z - 1 }
        ];
        
        adjacentPositions.forEach(adjPos => {
            const adjKey = `${adjPos.x},${adjPos.y},${adjPos.z}`;
            if (this.blockData.get(adjKey) === 'water') {
                this.triggerWaterUpdate(adjPos);
            }
        });
    }
    
    checkWaterFlow(pos) {
        this.checkWaterDisplacement(pos);
    }
    
    processWaterFlow() {
        if (this.waterUpdates.size === 0) return;
        
        const newWaterBlocks = new Map();
        const changedChunks = new Set();
        
        this.waterUpdates.forEach(posKey => {
            const [x, y, z] = posKey.split(',').map(Number);
            const pos = { x, y, z };
            
            if (this.blockData.get(posKey) === 'water') {
                this.simulateWaterFlow(pos, newWaterBlocks);
                changedChunks.add(this.getChunkKey(x, z));
            }
        });
        
        // Apply water changes
        newWaterBlocks.forEach((blockType, blockKey) => {
            if (blockType === 'water') {
                this.blockData.set(blockKey, 'water');
            } else if (blockType === 'air') {
                this.blockData.delete(blockKey);
            }
            
            const [x, y, z] = blockKey.split(',').map(Number);
            changedChunks.add(this.getChunkKey(x, z));
        });
        
        // Broadcast water updates
        changedChunks.forEach(chunkKey => {
            this.broadcastChunkUpdate(chunkKey);
        });
        
        this.waterUpdates.clear();
    }
    
    simulateWaterFlow(pos, newWaterBlocks) {
        const currentKey = `${pos.x},${pos.y},${pos.z}`;
        
        // Water flows down first
        const belowPos = { x: pos.x, y: pos.y - 1, z: pos.z };
        const belowKey = `${belowPos.x},${belowPos.y},${belowPos.z}`;
        
        if (!this.blockData.has(belowKey) && !newWaterBlocks.has(belowKey)) {
            newWaterBlocks.set(belowKey, 'water');
            this.waterUpdates.add(belowKey);
            return;
        }
        
        // Flow horizontally
        const directions = [
            { x: pos.x + 1, y: pos.y, z: pos.z },
            { x: pos.x - 1, y: pos.y, z: pos.z },
            { x: pos.x, y: pos.y, z: pos.z + 1 },
            { x: pos.x, y: pos.y, z: pos.z - 1 }
        ];
        
        let canFlowHorizontally = false;
        
        directions.forEach(dir => {
            const dirKey = `${dir.x},${dir.y},${dir.z}`;
            
            if (!this.blockData.has(dirKey) && !newWaterBlocks.has(dirKey)) {
                const belowDirKey = `${dir.x},${dir.y - 1},${dir.z}`;
                if (this.blockData.has(belowDirKey) || this.blockData.get(belowDirKey) === 'water') {
                    newWaterBlocks.set(dirKey, 'water');
                    this.waterUpdates.add(dirKey);
                    canFlowHorizontally = true;
                }
            }
        });
        
        // Water source mechanics
        if (this.isWaterSource(pos)) return;
        
        if (!canFlowHorizontally && Math.random() < 0.1) {
            const adjacentWaterCount = this.countAdjacentWater(pos);
            if (adjacentWaterCount < 2) {
                newWaterBlocks.set(currentKey, 'air');
            }
        }
    }
    
    isWaterSource(pos) {
        const adjacentWaterCount = this.countAdjacentWater(pos);
        return adjacentWaterCount >= 2;
    }
    
    countAdjacentWater(pos) {
        let count = 0;
        const directions = [
            { x: pos.x + 1, y: pos.y, z: pos.z },
            { x: pos.x - 1, y: pos.y, z: pos.z },
            { x: pos.x, y: pos.y, z: pos.z + 1 },
            { x: pos.x, y: pos.y, z: pos.z - 1 }
        ];
        
        directions.forEach(dir => {
            const dirKey = `${dir.x},${dir.y},${dir.z}`;
            if (this.blockData.get(dirKey) === 'water') {
                count++;
            }
        });
        
        return count;
    }
    
    // Networking methods
    sendToPlayer(player, message) {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    }
    
    broadcast(message) {
        const data = JSON.stringify(message);
        this.players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(data);
            }
        });
    }
    
    broadcastToOthers(excludePlayer, message) {
        const data = JSON.stringify(message);
        this.players.forEach(player => {
            if (player !== excludePlayer && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(data);
            }
        });
    }
    
    sendInitialGameState(player) {
        // Send world time
        this.sendToPlayer(player, {
            type: 'timeUpdate',
            timeOfDay: this.timeOfDay
        });
        
        // Send weather
        this.sendToPlayer(player, {
            type: 'weatherUpdate',
            weather: this.weather
        });
        
        // Send player data
        this.sendPlayerUpdate(player);
        
        // Send other players
        const otherPlayers = Array.from(this.players.values())
            .filter(p => p.id !== player.id)
            .map(p => ({
                id: p.id,
                position: p.position,
                velocity: p.velocity
            }));
            
        this.sendToPlayer(player, {
            type: 'playersUpdate',
            players: otherPlayers
        });
        
        // Send initial chunks
        this.updatePlayerChunks(player);
        
        // Broadcast new player to others
        this.broadcastToOthers(player, {
            type: 'playerJoin',
            player: {
                id: player.id,
                position: player.position,
                velocity: player.velocity
            }
        });
    }
    
    sendPlayerUpdate(player) {
        this.sendToPlayer(player, {
            type: 'playerUpdate',
            health: player.health,
            hunger: player.hunger,
            inventory: player.inventory,
            tools: Array.from(player.tools.entries())
        });
    }
    
    updatePlayerChunks(player) {
        const playerChunkX = Math.floor(player.position.x / this.chunkSize);
        const playerChunkZ = Math.floor(player.position.z / this.chunkSize);
        const radius = player.chunkRadius;
        
        const newChunks = new Set();
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const chunkX = playerChunkX + dx;
                const chunkZ = playerChunkZ + dz;
                const chunkKey = `${chunkX},${chunkZ}`;
                
                newChunks.add(chunkKey);
                
                if (!player.loadedChunks.has(chunkKey)) {
                    this.generateChunk(chunkX, chunkZ);
                    this.sendChunkToPlayer(player, chunkKey);
                    player.loadedChunks.add(chunkKey);
                }
            }
        }
        
        // Unload distant chunks
        player.loadedChunks.forEach(chunkKey => {
            if (!newChunks.has(chunkKey)) {
                player.loadedChunks.delete(chunkKey);
                this.sendToPlayer(player, {
                    type: 'unloadChunk',
                    chunkKey: chunkKey
                });
            }
        });
    }
    
    sendChunkToPlayer(player, chunkKey) {
        const [cx, cz] = chunkKey.split(',').map(Number);
        const chunkBlocks = [];
        
        for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
            for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
                for (let y = -10; y <= 80; y++) {
                    const blockKey = `${x},${y},${z}`;
                    const blockType = this.blockData.get(blockKey);
                    if (blockType) {
                        chunkBlocks.push({ x, y, z, type: blockType });
                    }
                }
            }
        }
        
        this.sendToPlayer(player, {
            type: 'chunkData',
            chunkKey: chunkKey,
            blocks: chunkBlocks
        });
    }
    
    broadcastChunkUpdate(chunkKey) {
        const [cx, cz] = chunkKey.split(',').map(Number);
        const chunkBlocks = [];
        
        for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
            for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
                for (let y = -10; y <= 80; y++) {
                    const blockKey = `${x},${y},${z}`;
                    const blockType = this.blockData.get(blockKey);
                    if (blockType) {
                        chunkBlocks.push({ x, y, z, type: blockType });
                    }
                }
            }
        }
        
        this.players.forEach(player => {
            if (player.loadedChunks.has(chunkKey)) {
                this.sendToPlayer(player, {
                    type: 'chunkUpdate',
                    chunkKey: chunkKey,
                    blocks: chunkBlocks
                });
            }
        });
    }
    
    getChunkKey(x, z) {
        return `${Math.floor(x / this.chunkSize)},${Math.floor(z / this.chunkSize)}`;
    }
    
    // Game loops
    startGameLoop() {
        setInterval(() => {
            this.updateGameState();
        }, 50); // 20 TPS
    }
    
    startPhysicsLoop() {
        setInterval(() => {
            this.updatePhysics();
        }, 16); // ~60 FPS
    }
    
    startWeatherLoop() {
        setInterval(() => {
            this.updateWeather();
            this.processWaterFlow();
        }, 500); // 2 TPS
    }
    
    updateGameState() {
        // Update time
        this.timeOfDay = ((Date.now() - this.startTime) % this.dayLength) / this.dayLength * 24000;
        
        // Update player states
        this.players.forEach(player => {
            this.updatePlayerState(player);
        });
        
        // Broadcast time update
        this.broadcast({
            type: 'timeUpdate',
            timeOfDay: this.timeOfDay
        });
    }
    
    updatePlayerState(player) {
        // Update mining
        if (player.miningState.isActive) {
            const elapsed = Date.now() - player.miningState.startTime;
            if (elapsed >= player.miningState.requiredTime) {
                this.finishMining(player);
            }
        }
        
        // Update hunger (every 20 seconds)
        if (Date.now() - player.lastUpdate > 20000) {
            if (player.hunger > 0) {
                player.hunger--;
                this.sendPlayerUpdate(player);
            }
        }
        
        // Health regeneration
        if (player.health < 20 && player.hunger > 17 && player.onGround) {
            if (Date.now() - player.lastUpdate > 4000) {
                player.health++;
                this.sendPlayerUpdate(player);
            }
        }
    }
    
    updatePhysics() {
        this.players.forEach(player => {
            // Server-side physics validation would go here
            // For now, we trust client physics but validate bounds
            
            // Prevent falling through world
            if (player.position.y < -50) {
                player.position = { x: 0, y: 80, z: 0 };
                player.velocity = { x: 0, y: 0, z: 0 };
                
                this.sendToPlayer(player, {
                    type: 'positionCorrection',
                    position: player.position
                });
            }
        });
    }
    
    updateWeather() {
        const currentTime = Date.now();
        
        if (currentTime > this.weather.nextWeatherChange) {
            this.changeWeather();
        }
        
        this.broadcast({
            type: 'weatherUpdate',
            weather: this.weather
        });
    }
    
    changeWeather() {
        // Simplified weather logic - in reality would be based on biomes
        const weatherTypes = ['clear', 'rain', 'snow', 'storm'];
        const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        
        this.weather = {
            type: newWeather,
            intensity: Math.random() * 0.7 + 0.3,
            duration: Math.random() * 120000 + 30000,
            nextWeatherChange: Date.now() + Math.random() * 180000 + 60000
        };
        
        console.log(`🌦️  Weather changed to ${newWeather} with intensity ${this.weather.intensity.toFixed(2)}`);
    }
    
    // Persistence
    saveWorld() {
        const worldData = {
            blocks: Array.from(this.blockData.entries()),
            structures: Array.from(this.generatedStructures),
            villages: Array.from(this.villages.entries()),
            timeOfDay: this.timeOfDay,
            weather: this.weather
        };
        
        try {
            fs.writeFileSync('world.json', JSON.stringify(worldData, null, 2));
        } catch (error) {
            console.error('❌ Failed to save world:', error);
        }
    }
    
    loadWorld() {
        try {
            if (fs.existsSync('world.json')) {
                const worldData = JSON.parse(fs.readFileSync('world.json', 'utf8'));
                
                this.blockData = new Map(worldData.blocks);
                this.generatedStructures = new Set(worldData.structures);
                this.villages = new Map(worldData.villages);
                this.timeOfDay = worldData.timeOfDay || 0;
                this.weather = worldData.weather || this.weather;
                
                console.log('📁 World loaded successfully');
            } else {
                console.log('🌍 Creating new world...');
            }
        } catch (error) {
            console.error('❌ Failed to load world:', error);
            console.log('🌍 Creating new world...');
        }
    }
    
    generatePlayerId() {
        return Math.random().toString(36).substr(2, 9);
    }
}

// Start server
const server = new MinecraftServer();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n💾 Saving world before shutdown...');
    server.saveWorld();
    console.log('✅ Server shutdown complete');
    process.exit(0);
});