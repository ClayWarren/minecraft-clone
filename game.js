// =============================================================================
//  MINECRAFT CLONE - ASSET-FREE VERSION
// =============================================================================
// Features:
// - No external assets needed (no textures, sounds, or images).
// - Solid colors for blocks.
// - Emoji for UI icons.
// - AABB Collision Physics & Basic Survival Mechanics.
// - Merged-mesh chunk rendering for performance.
// =============================================================================

class MinecraftClone {
    constructor() {
        // Core Three.js components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = new THREE.PointerLockControls(this.camera, document.body);
        
        // Multiplayer networking
        this.isMultiplayer = window.location.search.includes('multiplayer=true');
        this.ws = null;
        this.playerId = null;
        this.otherPlayers = new Map();
        this.networkQueue = [];
        this.lastNetworkUpdate = 0;

        // Game state
        this.blockData = new Map();
        this.chunkSize = 16;
        this.loadedChunks = new Map();
        
        // Managers
        this.physics = new Physics(this.blockData);
        this.entityManager = new EntityManager(this);
        this.audio = new AudioSystem();
        this.furnaceSystem = new FurnaceSystem(this);
        this.farmingSystem = new FarmingSystem(this);

        // Player state
        this.player = {
            health: 20,
            hunger: 20,
            inventory: { 
                grass: 64, dirt: 64, stone: 64, wood: 32, sand: 32, bedrock: Infinity,
                coal_ore: 0, iron_ore: 0, diamond_ore: 0,
                wooden_pickaxe: 0, stone_pickaxe: 0, iron_pickaxe: 0, diamond_pickaxe: 0,
                wooden_axe: 0, stone_axe: 0, iron_axe: 0, diamond_axe: 0,
                wooden_shovel: 0, stone_shovel: 0, iron_shovel: 0, diamond_shovel: 0,
                planks: 0, sticks: 0, coal: 0, iron_ingot: 0, diamond: 0,
                // Mob drops and food
                bone: 0, arrow: 0, string: 0, gunpowder: 0, rotten_flesh: 0,
                raw_beef: 0, raw_pork: 0, raw_chicken: 0, raw_mutton: 0,
                leather: 0, wool_white: 0, feather: 0, egg: 0,
                // Breeding items
                wheat: 10, carrot: 5, potato: 5, seeds: 20,
                // Tools for mob interaction
                shears: 0, bucket: 0, milk_bucket: 0, saddle: 0,
                // Furnace and smelting
                furnace: 5, iron_ingot: 0, gold_ingot: 0, glass: 0,
                // Cooked foods
                cooked_beef: 0, cooked_pork: 0, cooked_chicken: 0, cooked_mutton: 0,
                bread: 0, baked_potato: 0, cake: 0, apple: 0,
                // Farming tools and items
                wooden_hoe: 0, stone_hoe: 0, iron_hoe: 0, diamond_hoe: 0,
                bone_meal: 0
            },
            selectedSlot: 0,
            hotbar: ['grass', 'dirt', 'stone', 'wood', 'sand', 'furnace', 'wooden_pickaxe', 'stone_pickaxe', 'iron_pickaxe'],
            velocity: new THREE.Vector3(),
            onGround: false,
            lastHungerDepletion: 0,
            craftingOpen: false,
            tools: new Map(),
        };
        this.player.bounds = new THREE.Box3().setFromCenterAndSize(this.camera.position, new THREE.Vector3(0.6, 1.8, 0.6));
        
        // Block Definitions with procedural textures
        this.textureGenerator = new TextureGenerator();
        this.materials = {
            grass: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createGrassTexture() }),
            dirt: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createDirtTexture() }),
            stone: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createStoneTexture() }),
            wood: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createWoodTexture() }),
            sand: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createSandTexture() }),
            bedrock: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createBedrockTexture() }),
            coal_ore: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createCoalOreTexture() }),
            iron_ore: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createIronOreTexture() }),
            diamond_ore: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createDiamondOreTexture() }),
            planks: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createPlanksTexture() }),
            water: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createWaterTexture(), transparent: true, opacity: 0.7 }),
            lava: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createLavaTexture() }),
            snow: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createSnowTexture() }),
            leaves: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createLeavesTexture() }),
            sandstone: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createSandstoneTexture() }),
            ice: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createIceTexture(), transparent: true, opacity: 0.8 }),
            furnace: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createFurnaceTexture() }),
            furnace_lit: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createFurnaceLitTexture() }),
            // Farming blocks
            farmland: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createFarmlandTexture() }),
            wheat_crop: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createWheatCropTexture(), transparent: true }),
            carrot_crop: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createCarrotCropTexture(), transparent: true }),
            potato_crop: new THREE.MeshLambertMaterial({ map: this.textureGenerator.createPotatoCropTexture(), transparent: true }),
        };

        // Biome system
        this.biomes = {
            plains: { surface: 'grass', subsurface: 'dirt', treeChance: 0.02, temperature: 0.7, humidity: 0.4 },
            desert: { surface: 'sand', subsurface: 'sandstone', treeChance: 0.001, temperature: 0.9, humidity: 0.1 },
            forest: { surface: 'grass', subsurface: 'dirt', treeChance: 0.08, temperature: 0.6, humidity: 0.8 },
            ocean: { surface: 'water', subsurface: 'sand', treeChance: 0, temperature: 0.5, humidity: 1.0 },
            tundra: { surface: 'snow', subsurface: 'dirt', treeChance: 0.01, temperature: 0.1, humidity: 0.3 },
            mountains: { surface: 'stone', subsurface: 'stone', treeChance: 0.005, temperature: 0.3, humidity: 0.4 },
        };

        // Crafting system
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
            diamond_shovel: { ingredients: { diamond: 1, sticks: 2 }, output: { diamond_shovel: 1 }, durability: 1561 },
            furnace: { ingredients: { stone: 8 }, output: { furnace: 1 } },
            bucket: { ingredients: { iron_ingot: 3 }, output: { bucket: 1 } },
            shears: { ingredients: { iron_ingot: 2 }, output: { shears: 1 } },
            bread: { ingredients: { wheat: 3 }, output: { bread: 1 } },
            cake: { ingredients: { wheat: 3, milk_bucket: 3, egg: 1 }, output: { cake: 1 } },
            wooden_hoe: { ingredients: { planks: 2, sticks: 2 }, output: { wooden_hoe: 1 }, durability: 59 },
            stone_hoe: { ingredients: { stone: 2, sticks: 2 }, output: { stone_hoe: 1 }, durability: 131 },
            iron_hoe: { ingredients: { iron_ingot: 2, sticks: 2 }, output: { iron_hoe: 1 }, durability: 250 },
            diamond_hoe: { ingredients: { diamond: 2, sticks: 2 }, output: { diamond_hoe: 1 }, durability: 1561 },
            bone_meal: { ingredients: { bone: 1 }, output: { bone_meal: 3 } },
        };

        // Block hardness and tool requirements
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
            ice: { hardness: 0.5, tool: 'pickaxe', drops: ['ice'] },
            furnace: { hardness: 3.5, tool: 'pickaxe', drops: ['furnace'] },
            furnace_lit: { hardness: 3.5, tool: 'pickaxe', drops: ['furnace'] },
            // Farming blocks
            farmland: { hardness: 0.6, tool: 'shovel', drops: ['dirt'] },
            wheat_crop: { hardness: 0.0, tool: null, drops: ['wheat', 'seeds'] },
            carrot_crop: { hardness: 0.0, tool: null, drops: ['carrot'] },
            potato_crop: { hardness: 0.0, tool: null, drops: ['potato'] },
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
            diamond_shovel: { type: 'shovel', level: 3, efficiency: 8.0 },
            wooden_hoe: { type: 'hoe', level: 0, efficiency: 2.0 },
            stone_hoe: { type: 'hoe', level: 1, efficiency: 4.0 },
            iron_hoe: { type: 'hoe', level: 2, efficiency: 6.0 },
            diamond_hoe: { type: 'hoe', level: 3, efficiency: 8.0 },
        };

        // Mining state
        this.miningState = {
            isActive: false,
            position: null,
            startTime: 0,
            requiredTime: 0,
            blockType: null,
            crackOverlay: null,
        };

        // Block breaking crack textures
        this.crackTextures = this.createCrackTextures();

        // Particle system
        this.particles = [];
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            vertexColors: true
        });
        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.scene.add(this.particleSystem);

        // Water physics system
        this.waterUpdates = new Set();
        this.waterFlowTimer = 0;

        // Animated textures
        this.animatedTextures = {};
        this.animationTime = 0;

        // Weather system
        this.weather = {
            type: 'clear', // clear, rain, snow, storm
            intensity: 0,
            duration: 0,
            nextWeatherChange: Math.random() * 300000 + 60000, // 1-5 minutes
            particles: []
        };
        
        this.createWeatherSystem();
        
        // Initialize multiplayer if enabled
        if (this.isMultiplayer) {
            this.initMultiplayer();
        }
    }

    init() {
        // Renderer setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // Lighting system
        this.ambientLight = new THREE.AmbientLight(0x909090, 0.6);
        this.scene.add(this.ambientLight);
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 50, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        // Moon light for night
        this.moonLight = new THREE.DirectionalLight(0x6666aa, 0.3);
        this.moonLight.position.set(-50, 30, -50);
        this.moonLight.castShadow = true;
        this.scene.add(this.moonLight);

        // Camera and controls
        this.camera.position.set(0, 80, 0);
        this.scene.add(this.camera);

        this.setupEventListeners();
        this.setupUI();
        
        if (!this.isMultiplayer) {
            this.generateWorld();
        }
        
        // Clock for physics delta
        this.clock = new THREE.Clock();
        this.animate();
    }
    
    // =========================================================================
    //  WORLD GENERATION & CHUNKS
    // =========================================================================

    getChunkKey(x, z) {
        return `${Math.floor(x / this.chunkSize)},${Math.floor(z / this.chunkSize)}`;
    }

    generateWorld() {
        this.updateChunks();
    }

    updateChunks() {
        const viewDistance = 4;
        const playerChunkX = Math.floor(this.camera.position.x / this.chunkSize);
        const playerChunkZ = Math.floor(this.camera.position.z / this.chunkSize);

        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            for (let dz = -viewDistance; dz <= viewDistance; dz++) {
                this.loadChunk(playerChunkX + dx, playerChunkZ + dz);
            }
        }
    }
    
    loadChunk(cx, cz) {
        const key = `${cx},${cz}`;
        if (this.loadedChunks.has(key)) return;

        const chunkGeometries = {};
        for (const type in this.materials) {
            chunkGeometries[type] = [];
        }
        
        const minHeight = -10;
        for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
            for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
                const height = Math.floor(this.noise(x * 0.02, z * 0.02) * 15) + 40;
                
                for (let y = height; y >= minHeight; y--) {
                    const blockKey = `${x},${y},${z}`;
                    let blockType;
                    
                    if (this.blockData.has(blockKey)) {
                        // Use existing block type
                        blockType = this.blockData.get(blockKey);
                    } else {
                        // Generate new block with biomes
                        const biome = this.getBiome(x, z);
                        const biomeData = this.biomes[biome];
                        
                        if (y === minHeight) {
                            blockType = 'bedrock';
                        } else if (y === height) {
                            // Surface block based on biome
                            if (biome === 'ocean' && height < 35) {
                                blockType = 'water';
                            } else {
                                blockType = biomeData.surface;
                            }
                        } else if (height - y > 3) {
                            // Check for caves first
                            if (this.isCave(x, y, z)) {
                                continue; // Skip placing block (air)
                            }
                            
                            // Deep layer - stone with ores
                            const oreRandom = Math.random();
                            if (y < 20 && oreRandom < 0.01) blockType = 'diamond_ore';
                            else if (y < 32 && oreRandom < 0.02) blockType = 'iron_ore';
                            else if (y < 40 && oreRandom < 0.05) blockType = 'coal_ore';
                            else blockType = 'stone';
                        } else {
                            // Subsurface layer based on biome
                            blockType = biomeData.subsurface;
                        }
                        this.blockData.set(blockKey, blockType);
                    }
                    
                    const geo = new THREE.BoxGeometry(1, 1, 1);
                    geo.translate(x + 0.5, y + 0.5, z + 0.5);
                    chunkGeometries[blockType].push(geo);
                }
            }
        }
        
        // Generate structures for this chunk
        this.generateStructuresInChunk(cx, cz);
        
        const chunkMeshes = {};
        for (const type in chunkGeometries) {
            if (chunkGeometries[type].length > 0) {
                const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(chunkGeometries[type]);
                const mesh = new THREE.Mesh(mergedGeometry, this.materials[type]);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                chunkMeshes[type] = mesh;
            }
        }
        this.loadedChunks.set(key, chunkMeshes);
    }

    noise(x, z) {
        let value = 0, f = 0.02, a = 1;
        for (let i = 0; i < 4; i++) {
            value += Math.sin(x * f) * Math.cos(z * f) * a;
            f *= 2; a *= 0.5;
        }
        return value;
    }

    getBiome(x, z) {
        // Temperature and humidity based on position
        const temperature = (Math.sin(x * 0.01) + Math.cos(z * 0.015)) * 0.5 + 0.5;
        const humidity = (Math.cos(x * 0.013) + Math.sin(z * 0.01)) * 0.5 + 0.5;
        const elevation = this.noise(x * 0.02, z * 0.02);
        
        // Ocean biome for low areas
        if (elevation < -0.3) return 'ocean';
        
        // Mountain biome for high areas
        if (elevation > 0.5) return 'mountains';
        
        // Cold biomes
        if (temperature < 0.3) {
            return humidity > 0.5 ? 'tundra' : 'tundra';
        }
        
        // Hot biomes
        if (temperature > 0.7) {
            return humidity < 0.3 ? 'desert' : 'plains';
        }
        
        // Temperate biomes
        if (humidity > 0.6) {
            return 'forest';
        } else {
            return 'plains';
        }
    }

    isCave(x, y, z) {
        // Only generate caves below surface
        if (y > 35) return false;
        
        // 3D Perlin noise for caves
        const caveNoise1 = this.caveNoise(x * 0.04, y * 0.04, z * 0.04);
        const caveNoise2 = this.caveNoise(x * 0.06, y * 0.06, z * 0.06);
        const caveNoise3 = this.caveNoise(x * 0.08, y * 0.08, z * 0.08);
        
        // Combine noise for complex cave systems
        const combinedNoise = (caveNoise1 + caveNoise2 * 0.5 + caveNoise3 * 0.25) / 1.75;
        
        // Cave threshold - adjust for cave density
        return combinedNoise > 0.6;
    }

    caveNoise(x, y, z) {
        // Simple 3D noise function for caves
        const sinX = Math.sin(x);
        const cosY = Math.cos(y);
        const sinZ = Math.sin(z);
        
        return (sinX * cosY + sinZ * cosY + sinX * sinZ) / 3 + 0.5;
    }

    generateStructuresInChunk(cx, cz) {
        const chunkKey = `${cx},${cz}`;
        if (this.generatedStructures.has(chunkKey)) return;
        
        this.generatedStructures.add(chunkKey);
        
        // Try to generate village
        const centerX = cx * this.chunkSize + this.chunkSize / 2;
        const centerZ = cz * this.chunkSize + this.chunkSize / 2;
        
        const biome = this.getBiome(centerX, centerZ);
        const biomeData = this.biomes[biome];
        
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
        const villageSize = 5 + Math.floor(Math.random() * 3); // 5-7 buildings
        const villageKey = `${centerX},${centerZ}`;
        
        this.villages.set(villageKey, {
            center: { x: centerX, z: centerZ },
            biome: biome,
            buildings: []
        });
        
        // Generate village center (well)
        this.generateWell(centerX, centerZ);
        
        // Generate buildings in a circle around center
        for (let i = 0; i < villageSize; i++) {
            const angle = (i / villageSize) * Math.PI * 2;
            const distance = 15 + Math.random() * 10;
            const buildingX = centerX + Math.cos(angle) * distance;
            const buildingZ = centerZ + Math.sin(angle) * distance;
            
            // Generate different building types
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
        
        // Clear area and build well
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
            // Base ring
            { x: 0, y: 0, z: 0, type: 'stone' }, { x: 1, y: 0, z: 0, type: 'stone' }, { x: -1, y: 0, z: 0, type: 'stone' },
            { x: 0, y: 0, z: 1, type: 'stone' }, { x: 0, y: 0, z: -1, type: 'stone' },
            // Water in center
            { x: 0, y: 1, z: 0, type: 'water' },
            // Side pillars
            { x: 2, y: 1, z: 0, type: 'wood' }, { x: 2, y: 2, z: 0, type: 'wood' }, { x: 2, y: 3, z: 0, type: 'wood' },
            { x: -2, y: 1, z: 0, type: 'wood' }, { x: -2, y: 2, z: 0, type: 'wood' }, { x: -2, y: 3, z: 0, type: 'wood' },
            // Top beam
            { x: -1, y: 4, z: 0, type: 'wood' }, { x: 0, y: 4, z: 0, type: 'wood' }, { x: 1, y: 4, z: 0, type: 'wood' },
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
        
        // Build house (4x4 base)
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                // Floor
                const floorKey = `${x + dx},${surfaceY},${z + dz}`;
                this.blockData.set(floorKey, wallMaterial);
                
                // Walls
                if (dx === -2 || dx === 2 || dz === -2 || dz === 2) {
                    for (let dy = 1; dy <= 3; dy++) {
                        // Skip door on front wall
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
        
        // Similar to house but larger (6x6)
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                for (let dy = 0; dy <= 7; dy++) {
                    const blockKey = `${x + dx},${surfaceY + dy},${z + dz}`;
                    this.blockData.delete(blockKey);
                }
            }
        }
        
        // Build shop structure
        for (let dx = -3; dx <= 3; dx++) {
            for (let dz = -3; dz <= 3; dz++) {
                // Floor
                const floorKey = `${x + dx},${surfaceY},${z + dz}`;
                this.blockData.set(floorKey, wallMaterial);
                
                // Walls
                if (dx === -3 || dx === 3 || dz === -3 || dz === 3) {
                    for (let dy = 1; dy <= 4; dy++) {
                        // Double door
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
                
                // Farm plot
                const plotKey = `${x + dx},${surfaceY},${z + dz}`;
                this.blockData.set(plotKey, 'dirt');
            }
        }
        
        // Add fence around farm
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
                        if (Math.random() > 0.3) { // Some randomness in leaves
                            this.blockData.set(leafKey, 'leaves');
                        }
                    }
                }
            }
        }
    }
    
    regenerateChunkForPosition(x, z) {
        const key = this.getChunkKey(x, z);
        if (this.loadedChunks.has(key)) {
            const meshes = this.loadedChunks.get(key);
            for (const type in meshes) {
                this.scene.remove(meshes[type]);
                meshes[type].geometry.dispose();
            }
            this.loadedChunks.delete(key);
        }
        this.loadChunk(Math.floor(x / this.chunkSize), Math.floor(z / this.chunkSize));
    }


    // =========================================================================
    //  PLAYER ACTIONS & UI
    // =========================================================================
    
    placeBlock(pos, type) {
        const key = `${pos.x},${pos.y},${pos.z}`;
        if (!this.blockData.has(key) && this.player.inventory[type] > 0) {
            if (this.isMultiplayer) {
                this.sendPlaceBlock(pos, type);
                return;
            }
            
            this.blockData.set(key, type);
            
            // Special handling for furnaces
            if (type === 'furnace') {
                this.furnaceSystem.placeFurnace(pos);
            } else {
                this.regenerateChunkForPosition(pos.x, pos.z);
            }
            
            if (this.player.inventory[type] !== Infinity) this.player.inventory[type]--;
            
            // Trigger water physics updates for nearby water
            if (type === 'water') {
                this.triggerWaterUpdate(pos);
            } else {
                this.checkWaterDisplacement(pos);
            }
            
            this.updateUI();
        }
    }

    startMining(pos) {
        if (this.isMultiplayer) {
            this.sendStartMining(pos);
            return;
        }
        
        const key = `${pos.x},${pos.y},${pos.z}`;
        const blockType = this.blockData.get(key);
        if (!blockType || blockType === 'bedrock') return;

        const blockProps = this.blockProperties[blockType];
        if (!blockProps || blockProps.hardness === -1) return;

        // Check tool requirements
        const selectedItem = this.player.hotbar[this.player.selectedSlot];
        const toolProps = this.toolProperties[selectedItem];
        const canMine = this.canMineBlock(blockType, selectedItem);
        
        if (!canMine) return;

        // Calculate mining time
        let miningTime = blockProps.hardness * 1000; // Base time in ms
        if (toolProps && toolProps.type === blockProps.tool) {
            miningTime /= toolProps.efficiency;
        } else {
            miningTime *= 5; // Penalty for wrong tool
        }

        this.miningState = {
            isActive: true,
            position: pos,
            startTime: performance.now(),
            requiredTime: miningTime,
            blockType: blockType,
        };
    }

    canMineBlock(blockType, tool) {
        const blockProps = this.blockProperties[blockType];
        const toolProps = this.toolProperties[tool];
        
        if (!blockProps) return false;
        if (blockProps.hardness === -1) return false;
        
        // Check if block requires specific tool level
        if (blockProps.level !== undefined) {
            if (!toolProps || toolProps.level < blockProps.level) {
                return false;
            }
        }
        
        return true;
    }

    finishMining() {
        if (!this.miningState.isActive) return;
        
        if (this.isMultiplayer) {
            this.sendStopMining();
            this.miningState.isActive = false;
            return;
        }
        
        const pos = this.miningState.position;
        const key = `${pos.x},${pos.y},${pos.z}`;
        const blockType = this.miningState.blockType;
        
        // Remove block
        // Special handling for furnaces
        if (this.furnaceSystem.isFurnaceBlock(blockType)) {
            this.furnaceSystem.removeFurnace(pos);
        } else {
            this.blockData.delete(key);
            this.regenerateChunkForPosition(pos.x, pos.z);
        }
        
        // Handle crop harvesting
        if (this.farmingSystem.isCropBlock(blockType)) {
            const cropDrops = this.farmingSystem.harvestCrop(pos);
            cropDrops.forEach(drop => {
                this.addToInventory(drop.item, drop.count);
            });
        } else {
            // Normal block drops
            const blockProps = this.blockProperties[blockType];
            const drops = blockProps.drops || [blockType];
            drops.forEach(drop => {
                if (this.player.inventory[drop] !== undefined) {
                    if (this.player.inventory[drop] !== Infinity) {
                        this.player.inventory[drop]++;
                    }
                } else {
                    this.player.inventory[drop] = 1;
                }
            });
        }

        // Damage tool
        const selectedItem = this.player.hotbar[this.player.selectedSlot];
        this.damageTool(selectedItem);
        
        // Create block break particles
        this.createBlockBreakParticles(pos, blockType);
        
        // Trigger water physics if water block was removed or nearby
        this.checkWaterFlow(pos);
        
        this.miningState.isActive = false;
        this.updateUI();
    }

    damageTool(toolName) {
        if (!this.toolProperties[toolName]) return;
        
        if (this.player.tools.has(toolName)) {
            const currentDurability = this.player.tools.get(toolName);
            if (currentDurability <= 1) {
                // Tool breaks
                this.player.inventory[toolName]--;
                this.player.tools.delete(toolName);
                if (this.player.inventory[toolName] <= 0) {
                    delete this.player.inventory[toolName];
                }
            } else {
                this.player.tools.set(toolName, currentDurability - 1);
            }
        }
    }

    updateMining() {
        const progressBar = document.getElementById('mining-progress');
        const progressFill = document.getElementById('mining-progress-bar');
        
        if (!this.miningState.isActive) {
            progressBar.style.display = 'none';
            this.removeCrackOverlay();
            return;
        }
        
        const elapsed = performance.now() - this.miningState.startTime;
        const progress = Math.min(elapsed / this.miningState.requiredTime, 1.0);
        
        progressBar.style.display = 'block';
        progressFill.style.width = `${progress * 100}%`;
        
        // Update crack overlay
        this.updateCrackOverlay(progress);
        
        if (elapsed >= this.miningState.requiredTime) {
            this.finishMining();
            progressBar.style.display = 'none';
            this.removeCrackOverlay();
        }
    }

    updateCrackOverlay(progress) {
        const pos = this.miningState.position;
        if (!pos) return;
        
        // Remove old crack overlay
        this.removeCrackOverlay();
        
        // Calculate crack level (0-9)
        const crackLevel = Math.floor(progress * 9);
        if (crackLevel >= 0 && crackLevel < 10) {
            // Create crack overlay geometry
            const geometry = new THREE.PlaneGeometry(1.01, 1.01);
            const material = new THREE.MeshBasicMaterial({
                map: this.crackTextures[crackLevel],
                transparent: true,
                alphaTest: 0.1,
                depthWrite: false
            });
            
            const crackMesh = new THREE.Mesh(geometry, material);
            crackMesh.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
            
            // Position crack overlay on all faces
            const crackGroup = new THREE.Group();
            
            // Front face
            const frontCrack = crackMesh.clone();
            frontCrack.position.z += 0.501;
            crackGroup.add(frontCrack);
            
            // Back face
            const backCrack = crackMesh.clone();
            backCrack.position.z -= 0.501;
            backCrack.rotation.y = Math.PI;
            crackGroup.add(backCrack);
            
            // Left face
            const leftCrack = crackMesh.clone();
            leftCrack.position.x -= 0.501;
            leftCrack.rotation.y = Math.PI / 2;
            crackGroup.add(leftCrack);
            
            // Right face
            const rightCrack = crackMesh.clone();
            rightCrack.position.x += 0.501;
            rightCrack.rotation.y = -Math.PI / 2;
            crackGroup.add(rightCrack);
            
            // Top face
            const topCrack = crackMesh.clone();
            topCrack.position.y += 0.501;
            topCrack.rotation.x = -Math.PI / 2;
            crackGroup.add(topCrack);
            
            // Bottom face
            const bottomCrack = crackMesh.clone();
            bottomCrack.position.y -= 0.501;
            bottomCrack.rotation.x = Math.PI / 2;
            crackGroup.add(bottomCrack);
            
            this.scene.add(crackGroup);
            this.miningState.crackOverlay = crackGroup;
        }
    }

    removeCrackOverlay() {
        if (this.miningState.crackOverlay) {
            this.scene.remove(this.miningState.crackOverlay);
            this.miningState.crackOverlay.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.miningState.crackOverlay = null;
        }
    }

    createBlockBreakParticles(pos, blockType) {
        const particleCount = 15 + Math.floor(Math.random() * 10);
        const blockColor = this.getBlockColor(blockType);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = {
                position: new THREE.Vector3(
                    pos.x + 0.5 + (Math.random() - 0.5) * 0.8,
                    pos.y + 0.5 + (Math.random() - 0.5) * 0.8,
                    pos.z + 0.5 + (Math.random() - 0.5) * 0.8
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 6 + 2,
                    (Math.random() - 0.5) * 8
                ),
                color: blockColor.clone(),
                life: 1.0,
                maxLife: 1.0 + Math.random() * 0.5,
                size: 0.05 + Math.random() * 0.1,
                gravity: -15
            };
            this.particles.push(particle);
        }
    }

    getBlockColor(blockType) {
        const colors = {
            grass: new THREE.Color(0x4a7c59),
            dirt: new THREE.Color(0x8b4513),
            stone: new THREE.Color(0x696969),
            wood: new THREE.Color(0xd2691e),
            sand: new THREE.Color(0xf4a460),
            coal_ore: new THREE.Color(0x2c2c2c),
            iron_ore: new THREE.Color(0xd8af93),
            diamond_ore: new THREE.Color(0x5cb3cc),
            planks: new THREE.Color(0xc4915c),
            water: new THREE.Color(0x3498db),
            snow: new THREE.Color(0xffffff),
            leaves: new THREE.Color(0x228B22),
            sandstone: new THREE.Color(0xe6d690),
            ice: new THREE.Color(0xb8e6ff)
        };
        return colors[blockType] || new THREE.Color(0x888888);
    }

    updateParticles() {
        const deltaTime = 0.016; // Approximate 60fps
        
        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update physics
            particle.velocity.y += particle.gravity * deltaTime;
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // Update life
            particle.life -= deltaTime / particle.maxLife;
            
            // Check collision with ground
            const groundY = Math.floor(this.noise(particle.position.x * 0.02, particle.position.z * 0.02) * 15) + 40;
            if (particle.position.y <= groundY) {
                particle.velocity.y *= -0.3; // Bounce
                particle.velocity.x *= 0.8; // Friction
                particle.velocity.z *= 0.8;
                particle.position.y = groundY + 0.1;
            }
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update particle system geometry
        this.updateParticleGeometry();
        
        // Add ambient particles occasionally
        if (Math.random() < 0.02) {
            this.createAmbientParticles();
        }
    }

    updateParticleGeometry() {
        if (this.particles.length === 0) {
            this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([]), 3));
            this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array([]), 3));
            return;
        }
        
        const positions = new Float32Array(this.particles.length * 3);
        const colors = new Float32Array(this.particles.length * 3);
        
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            
            positions[i * 3] = particle.position.x;
            positions[i * 3 + 1] = particle.position.y;
            positions[i * 3 + 2] = particle.position.z;
            
            // Fade out over time
            const alpha = particle.life;
            colors[i * 3] = particle.color.r * alpha;
            colors[i * 3 + 1] = particle.color.g * alpha;
            colors[i * 3 + 2] = particle.color.b * alpha;
        }
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
    }

    createAmbientParticles() {
        // Create floating dust particles near player
        const playerPos = this.camera.position;
        
        for (let i = 0; i < 3; i++) {
            const particle = {
                position: new THREE.Vector3(
                    playerPos.x + (Math.random() - 0.5) * 20,
                    playerPos.y + Math.random() * 10,
                    playerPos.z + (Math.random() - 0.5) * 20
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * 0.2,
                    (Math.random() - 0.5) * 0.5
                ),
                color: new THREE.Color(0.8, 0.8, 0.6),
                life: 1.0,
                maxLife: 3.0 + Math.random() * 2.0,
                size: 0.02,
                gravity: -0.1
            };
            this.particles.push(particle);
        }
    }

    craft(recipe) {
        if (this.isMultiplayer) {
            this.sendCraftRequest(recipe);
            return true; // Let server handle validation
        }
        
        const recipeData = this.craftingRecipes[recipe];
        if (!recipeData) return false;

        // Check if player has all ingredients
        for (const [ingredient, amount] of Object.entries(recipeData.ingredients)) {
            if (!this.player.inventory[ingredient] || this.player.inventory[ingredient] < amount) {
                return false;
            }
        }

        // Consume ingredients
        for (const [ingredient, amount] of Object.entries(recipeData.ingredients)) {
            this.player.inventory[ingredient] -= amount;
        }

        // Add outputs
        for (const [output, amount] of Object.entries(recipeData.output)) {
            if (!this.player.inventory[output]) this.player.inventory[output] = 0;
            this.player.inventory[output] += amount;
            
            // Set tool durability if it's a tool
            if (recipeData.durability && this.toolProperties[output]) {
                this.player.tools.set(output, recipeData.durability);
            }
        }

        this.updateUI();
        return true;
    }

    setupUI() {
        const hotbar = document.getElementById('hotbar');
        this.player.hotbar.forEach(() => {
            const slot = document.createElement('div');
            slot.classList.add('hotbar-slot');
            const count = document.createElement('div');
            count.classList.add('count');
            slot.appendChild(count);
            hotbar.appendChild(slot);
        });
        this.updateUI();
    }

    updateUI() {
        // Hotbar
        document.querySelectorAll('.hotbar-slot').forEach((slot, i) => {
            slot.classList.toggle('selected', i === this.player.selectedSlot);
            const type = this.player.hotbar[i];
            const count = this.player.inventory[type];
            const countElement = slot.querySelector('.count');
            let displayText = count === Infinity ? '∞' : (count || 0);
            
            // Show tool durability
            if (this.toolProperties[type] && this.player.tools.has(type)) {
                const durability = this.player.tools.get(type);
                const maxDurability = this.craftingRecipes[type]?.durability || 0;
                displayText += ` (${durability}/${maxDurability})`;
            }
            
            countElement.textContent = displayText;
        });

        // Health & Hunger with Emoji
        const healthBar = document.getElementById('health-bar');
        const hungerBar = document.getElementById('hunger-bar');
        healthBar.innerHTML = '';
        hungerBar.innerHTML = '';
        
        for (let i = 0; i < 10; i++) {
            const healthIcon = document.createElement('div');
            healthIcon.classList.add('icon');
            healthIcon.textContent = (this.player.health / 2 > i) ? '❤️' : '🖤';
            healthBar.appendChild(healthIcon);

            const hungerIcon = document.createElement('div');
            hungerIcon.classList.add('icon');
            hungerIcon.textContent = '🍗';
            if (this.player.hunger / 2 <= i) hungerIcon.style.opacity = '0.3';
            hungerBar.appendChild(hungerIcon);
        }
    }

    updateCraftingUI() {
        let craftingDiv = document.getElementById('crafting-menu');
        
        if (this.player.craftingOpen) {
            if (!craftingDiv) {
                craftingDiv = document.createElement('div');
                craftingDiv.id = 'crafting-menu';
                craftingDiv.style.cssText = `
                    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px;
                    color: white; font-family: monospace; max-height: 400px; overflow-y: auto;
                    z-index: 1000; min-width: 300px;
                `;
                document.body.appendChild(craftingDiv);
            }

            let html = '<h3>Crafting Menu (Press C to close)</h3>';
            for (const [recipe, data] of Object.entries(this.craftingRecipes)) {
                const canCraft = Object.entries(data.ingredients).every(([ing, amt]) => 
                    this.player.inventory[ing] >= amt
                );
                
                html += `<div style="margin: 10px 0; padding: 10px; background: ${canCraft ? 'rgba(0,100,0,0.3)' : 'rgba(100,0,0,0.3)'};">`;
                html += `<strong>${recipe.replace('_', ' ')}</strong><br>`;
                html += `Needs: ${Object.entries(data.ingredients).map(([ing, amt]) => `${amt} ${ing}`).join(', ')}<br>`;
                html += `Makes: ${Object.entries(data.output).map(([out, amt]) => `${amt} ${out}`).join(', ')}<br>`;
                if (canCraft) {
                    html += `<button onclick="game.craft('${recipe}')" style="margin-top: 5px; padding: 5px 10px;">Craft</button>`;
                }
                html += '</div>';
            }
            craftingDiv.innerHTML = html;
        } else {
            if (craftingDiv) {
                craftingDiv.remove();
            }
        }
    }
    
    updatePlayerState(deltaTime) {
        // Use the enhanced hunger system
        this.updateHungerSystem(deltaTime);
    }

    // =========================================================================
    //  PLAYER METHODS
    // =========================================================================

    getSelectedItem() {
        return this.player.hotbar[this.player.selectedSlot];
    }

    addToInventory(item, count = 1) {
        if (this.player.inventory.hasOwnProperty(item)) {
            this.player.inventory[item] += count;
            this.updateUI();
            return true;
        }
        return false;
    }

    removeFromInventory(item, count = 1) {
        if (this.player.inventory[item] >= count) {
            this.player.inventory[item] -= count;
            this.updateUI();
            return true;
        }
        return false;
    }

    takeDamage(amount, source = null) {
        this.player.health = Math.max(0, this.player.health - amount);
        this.updateUI();
        
        // Create damage effect
        this.createDamageEffect();
        
        if (this.player.health <= 0) {
            this.onPlayerDeath();
        }
    }

    addExperience(amount) {
        // TODO: Implement experience system
        console.log(`Gained ${amount} experience!`);
    }

    createDamageEffect() {
        // Flash red effect
        document.body.style.background = 'rgba(255, 0, 0, 0.3)';
        setTimeout(() => {
            document.body.style.background = 'black';
        }, 200);
    }

    onPlayerDeath() {
        console.log('Player died!');
        // Reset health and respawn
        this.player.health = 20;
        this.player.hunger = 20;
        this.camera.position.set(0, 80, 0);
        this.updateUI();
    }

    interactWithMob(mob, button) {
        const heldItem = this.getSelectedItem();
        
        if (button === 0) { // Left click - Attack
            this.attackMob(mob);
        } else if (button === 2) { // Right click - Interact
            this.interactWithMobItem(mob, heldItem);
        }
    }

    attackMob(mob) {
        const heldItem = this.getSelectedItem();
        let damage = 1; // Base damage
        
        // Check if holding a weapon
        if (heldItem.includes('sword')) {
            damage = 4;
        } else if (heldItem.includes('axe')) {
            damage = 3;
        } else if (heldItem.includes('pickaxe')) {
            damage = 2;
        }
        
        // Deal damage
        this.entityManager.damageEntity(mob, damage, this.player);
        
        // Reduce tool durability
        if (heldItem.includes('sword') || heldItem.includes('axe') || heldItem.includes('pickaxe')) {
            this.reduceDurability(heldItem, 1);
        }
    }

    interactWithMobItem(mob, item) {
        switch (item) {
            case 'wheat':
                if (mob instanceof Cow || mob instanceof Sheep) {
                    if (this.entityManager.feedMob(mob, item)) {
                        this.removeFromInventory(item, 1);
                    }
                }
                break;
                
            case 'carrot':
                if (mob instanceof Pig) {
                    if (this.entityManager.feedMob(mob, item)) {
                        this.removeFromInventory(item, 1);
                    }
                }
                break;
                
            case 'seeds':
                if (mob instanceof Chicken) {
                    if (this.entityManager.feedMob(mob, item)) {
                        this.removeFromInventory(item, 1);
                    }
                }
                break;
                
            case 'shears':
                if (mob instanceof Sheep) {
                    const woolDrop = this.entityManager.shearSheep(mob);
                    if (woolDrop) {
                        this.addToInventory(woolDrop.item, woolDrop.count);
                        this.reduceDurability('shears', 1);
                    }
                }
                break;
                
            case 'bucket':
                if (mob instanceof Cow) {
                    const milk = this.entityManager.milkCow(mob);
                    if (milk) {
                        this.removeFromInventory('bucket', 1);
                        this.addToInventory(milk, 1);
                    }
                }
                break;
                
            case 'saddle':
                if (mob instanceof Pig) {
                    if (this.entityManager.saddlePig(mob)) {
                        this.removeFromInventory('saddle', 1);
                    }
                }
                break;
        }
    }

    reduceDurability(item, amount) {
        // TODO: Implement tool durability system
        console.log(`${item} durability reduced by ${amount}`);
    }

    // =========================================================================
    //  FOOD SYSTEM
    // =========================================================================

    eatFood(foodType) {
        if (this.player.inventory[foodType] <= 0) return false;
        
        const foodValues = {
            // Raw foods
            apple: { hunger: 4, saturation: 2.4 },
            bread: { hunger: 5, saturation: 6.0 },
            carrot: { hunger: 3, saturation: 3.6 },
            potato: { hunger: 1, saturation: 0.6 },
            baked_potato: { hunger: 5, saturation: 6.0 },
            
            // Raw meats
            raw_beef: { hunger: 3, saturation: 1.8 },
            raw_pork: { hunger: 3, saturation: 1.8 },
            raw_chicken: { hunger: 2, saturation: 1.2, poisonChance: 0.3 },
            raw_mutton: { hunger: 2, saturation: 1.2 },
            
            // Cooked meats
            cooked_beef: { hunger: 8, saturation: 12.8 },
            cooked_pork: { hunger: 8, saturation: 12.8 },
            cooked_chicken: { hunger: 6, saturation: 7.2 },
            cooked_mutton: { hunger: 6, saturation: 9.6 },
            
            // Special foods
            cake: { hunger: 14, saturation: 2.8 },
            rotten_flesh: { hunger: 4, saturation: 0.8, poisonChance: 0.8 }
        };
        
        const food = foodValues[foodType];
        if (!food) return false;
        
        // Can't eat if hunger is full
        if (this.player.hunger >= 20) return false;
        
        // Consume food
        this.removeFromInventory(foodType, 1);
        
        // Restore hunger
        this.player.hunger = Math.min(20, this.player.hunger + food.hunger);
        
        // Add saturation (simplified - just reset hunger depletion timer)
        this.player.lastHungerDepletion = performance.now();
        
        // Handle food poisoning
        if (food.poisonChance && Math.random() < food.poisonChance) {
            this.applyFoodPoisoning();
        }
        
        // Create eating particles
        this.createEatingParticles(foodType);
        
        // Play eating sound
        this.audio.playSound('eat_food');
        
        this.updateUI();
        return true;
    }

    applyFoodPoisoning() {
        // Simplified food poisoning - just reduce health slightly
        this.takeDamage(2);
        console.log('You feel sick from eating bad food!');
        
        // Create poison particles
        for (let i = 0; i < 10; i++) {
            const particle = {
                position: this.camera.position.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        Math.random() * 2,
                        (Math.random() - 0.5) * 2
                    )
                ),
                velocity: new THREE.Vector3(0, 1, 0),
                color: new THREE.Color(0.5, 1, 0.5),
                life: 1.0,
                maxLife: 1.0,
                size: 0.1
            };
            
            this.entityManager.addParticle(particle);
        }
    }

    createEatingParticles(foodType) {
        const colors = {
            apple: new THREE.Color(1, 0, 0),
            bread: new THREE.Color(0.8, 0.6, 0.2),
            carrot: new THREE.Color(1, 0.5, 0),
            potato: new THREE.Color(0.8, 0.7, 0.3),
            cooked_beef: new THREE.Color(0.6, 0.3, 0.1),
            cooked_pork: new THREE.Color(0.8, 0.4, 0.2),
            cooked_chicken: new THREE.Color(0.9, 0.8, 0.6),
            cake: new THREE.Color(0.9, 0.8, 0.9)
        };
        
        const color = colors[foodType] || new THREE.Color(0.8, 0.6, 0.4);
        
        for (let i = 0; i < 8; i++) {
            const particle = {
                position: this.camera.position.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 1,
                        Math.random() * 0.5 - 1,
                        (Math.random() - 0.5) * 1
                    )
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 1 + 0.5,
                    (Math.random() - 0.5) * 2
                ),
                color: color.clone(),
                life: 0.8,
                maxLife: 0.8,
                size: 0.05
            };
            
            this.entityManager.addParticle(particle);
        }
    }

    canEat(foodType) {
        const foodValues = {
            apple: true, bread: true, carrot: true, potato: true, baked_potato: true,
            raw_beef: true, raw_pork: true, raw_chicken: true, raw_mutton: true,
            cooked_beef: true, cooked_pork: true, cooked_chicken: true, cooked_mutton: true,
            cake: true, rotten_flesh: true
        };
        
        return foodValues[foodType] && this.player.inventory[foodType] > 0 && this.player.hunger < 20;
    }

    // Enhanced hunger system
    updateHungerSystem(deltaTime) {
        // Hunger depletion based on activity
        const now = performance.now();
        let hungerRate = 20000; // Base rate: deplete every 20 seconds
        
        // Increase hunger depletion if moving
        if (this.keys['KeyW'] || this.keys['KeyA'] || this.keys['KeyS'] || this.keys['KeyD']) {
            hungerRate *= 0.8; // 20% faster when moving
        }
        
        // Increase hunger depletion if sprinting (holding shift)
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            hungerRate *= 0.5; // 50% faster when sprinting
        }
        
        if (now - this.player.lastHungerDepletion > hungerRate) {
            if (this.player.hunger > 0) {
                this.player.hunger = Math.max(0, this.player.hunger - 1);
                this.player.lastHungerDepletion = now;
                this.updateUI();
                
                // Starvation damage
                if (this.player.hunger === 0) {
                    this.takeDamage(1);
                }
            }
        }
        
        // Health regeneration when well-fed
        if (this.player.health < 20 && this.player.hunger >= 18 && this.player.onGround) {
            if (now - this.player.lastHungerDepletion > 4000) {
                this.player.health = Math.min(20, this.player.health + 1);
                this.player.lastHungerDepletion = now;
                this.updateUI();
            }
        }
    }

    // =========================================================================
    //  EVENT LISTENERS & MAIN LOOP
    // =========================================================================

    setupEventListeners() {
        document.addEventListener('click', () => this.controls.lock());

        const raycaster = new THREE.Raycaster();
        document.addEventListener('mousedown', (event) => {
            if (!this.controls.isLocked) return;
            raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
            
            // Check for mob interactions first
            const mobMeshes = this.entityManager.entities.map(entity => entity.mesh).filter(mesh => mesh);
            const mobIntersects = raycaster.intersectObjects(mobMeshes);
            
            if (mobIntersects.length > 0) {
                const mobIntersect = mobIntersects[0];
                if (mobIntersect.distance <= 5) {
                    // Find the entity that owns this mesh
                    const targetEntity = this.entityManager.entities.find(entity => entity.mesh === mobIntersect.object);
                    if (targetEntity) {
                        this.interactWithMob(targetEntity, event.button);
                        return;
                    }
                }
            }
            
            // If no mob interaction, check for blocks
            const allMeshes = Array.from(this.loadedChunks.values()).flatMap(chunk => Object.values(chunk));
            const intersects = raycaster.intersectObjects(allMeshes);
            
            if (intersects.length > 0) {
                const intersect = intersects[0];
                if (intersect.distance > 5) return;

                if (event.button === 0) { // Left-click - Start mining
                    const pos = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1));
                    this.startMining({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) });
                } else if (event.button === 2) { // Right-click - Place or interact
                    // Check if clicking on an existing block for interaction
                    const clickedPos = intersect.point.clone().sub(intersect.face.normal.clone().multiplyScalar(0.1));
                    const clickedBlockPos = { x: Math.floor(clickedPos.x), y: Math.floor(clickedPos.y), z: Math.floor(clickedPos.z) };
                    const clickedBlockKey = `${clickedBlockPos.x},${clickedBlockPos.y},${clickedBlockPos.z}`;
                    const clickedBlockType = this.blockData.get(clickedBlockKey);
                    
                    // Handle furnace interaction
                    if (this.furnaceSystem.isFurnaceBlock(clickedBlockType)) {
                        const furnace = this.furnaceSystem.getFurnaceAt(clickedBlockPos);
                        if (furnace) {
                            this.furnaceSystem.openFurnaceGUI(furnace);
                            return;
                        }
                    }
                    
                    // Handle farming interactions
                    const heldItem = this.getSelectedItem();
                    
                    // Check for soil tilling with hoe
                    if (heldItem.includes('hoe')) {
                        if (this.farmingSystem.tillSoil(clickedBlockPos)) {
                            this.audio.playSound('block_place');
                            this.reduceDurability(heldItem, 1);
                            return;
                        }
                    }
                    
                    // Check for seed planting
                    if (this.farmingSystem.canPlantSeed(
                        { x: Math.floor(intersect.point.x), y: Math.floor(intersect.point.y), z: Math.floor(intersect.point.z) },
                        heldItem
                    )) {
                        const plantPos = { 
                            x: Math.floor(intersect.point.x), 
                            y: Math.floor(intersect.point.y), 
                            z: Math.floor(intersect.point.z) 
                        };
                        if (this.farmingSystem.plantSeed(plantPos, heldItem)) {
                            this.removeFromInventory(heldItem, 1);
                            this.audio.playSound('block_place');
                            return;
                        }
                    }
                    
                    // Check for bone meal use
                    if (heldItem === 'bone_meal' && this.farmingSystem.isCropBlock(clickedBlockType)) {
                        if (this.farmingSystem.fertilizeCrop(clickedBlockPos)) {
                            this.removeFromInventory('bone_meal', 1);
                            this.audio.playSound('block_place');
                            return;
                        }
                    }
                    
                    // Default block placement
                    const pos = intersect.point.clone().add(intersect.face.normal.clone().multiplyScalar(0.1));
                    const type = this.player.hotbar[this.player.selectedSlot];
                    this.placeBlock({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) }, type);
                }
            }
        });
        
        document.addEventListener('contextmenu', e => e.preventDefault());
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener('wheel', (event) => {
            if (!this.controls.isLocked) return;
            const newSlot = (this.player.selectedSlot + (event.deltaY > 0 ? 1 : -1) + this.player.hotbar.length) % this.player.hotbar.length;
            this.selectHotbarSlot(newSlot);
        });

        // Crafting shortcuts
        document.addEventListener('keydown', (event) => {
            if (!this.controls.isLocked) return;
            
            switch(event.key) {
                case 'c': case 'C':
                    this.player.craftingOpen = !this.player.craftingOpen;
                    this.updateCraftingUI();
                    break;
                case 'f': case 'F':
                    // Eat food from current slot
                    const currentItem = this.getSelectedItem();
                    if (this.canEat(currentItem)) {
                        this.eatFood(currentItem);
                    }
                    break;
                case '1': this.selectHotbarSlot(0); break;
                case '2': this.selectHotbarSlot(1); break;
                case '3': this.selectHotbarSlot(2); break;
                case '4': this.selectHotbarSlot(3); break;
                case '5': this.selectHotbarSlot(4); break;
                case '6': this.selectHotbarSlot(5); break;
                case '7': this.selectHotbarSlot(6); break;
                case '8': this.selectHotbarSlot(7); break;
                case '9': this.selectHotbarSlot(8); break;
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const deltaTime = Math.min(0.05, this.clock.getDelta());

        if(this.controls.isLocked) {
            this.physics.update(this.player, this.controls, deltaTime);
            this.updatePlayerState(deltaTime);
            this.updateChunks();
            this.updateMining();
            this.updateDayNightCycle();
            this.updateParticles();
            this.updateWaterPhysics();
            this.updateAnimatedTextures();
            this.updateWeather();
            this.entityManager.update(deltaTime);
            this.furnaceSystem.update(deltaTime);
            this.farmingSystem.update(deltaTime);
            
            // Send movement updates to server
            this.sendMovementUpdate();
        }
        
        // Update other players interpolation
        if (this.isMultiplayer) {
            this.updateOtherPlayersInterpolation();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    // =============================================================================
    //  MULTIPLAYER NETWORKING
    // =============================================================================
    
    initMultiplayer() {
        console.log('🌐 Connecting to multiplayer server...');
        
        try {
            this.ws = new WebSocket('ws://localhost:8080');
            
            this.ws.onopen = () => {
                console.log('✅ Connected to server');
                this.showConnectionStatus('Connected', 'green');
            };
            
            this.ws.onmessage = (event) => {
                this.handleServerMessage(JSON.parse(event.data));
            };
            
            this.ws.onclose = () => {
                console.log('❌ Disconnected from server');
                this.showConnectionStatus('Disconnected', 'red');
                this.attemptReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('🔌 WebSocket error:', error);
                this.showConnectionStatus('Connection Error', 'red');
            };
            
        } catch (error) {
            console.error('❌ Failed to connect to server:', error);
            this.showConnectionStatus('Connection Failed', 'red');
        }
    }
    
    handleServerMessage(data) {
        switch (data.type) {
            case 'chunkData':
                this.handleChunkData(data);
                break;
            case 'chunkUpdate':
                this.handleChunkUpdate(data);
                break;
            case 'unloadChunk':
                this.handleUnloadChunk(data);
                break;
            case 'blockUpdate':
                this.handleBlockUpdate(data);
                break;
            case 'playerUpdate':
                this.handlePlayerUpdate(data);
                break;
            case 'playersUpdate':
                this.handlePlayersUpdate(data);
                break;
            case 'playerJoin':
                this.handlePlayerJoin(data);
                break;
            case 'playerLeave':
                this.handlePlayerLeave(data);
                break;
            case 'playerMove':
                this.handlePlayerMove(data);
                break;
            case 'playerStartMining':
                this.handlePlayerStartMining(data);
                break;
            case 'playerStopMining':
                this.handlePlayerStopMining(data);
                break;
            case 'playerFinishMining':
                this.handlePlayerFinishMining(data);
                break;
            case 'timeUpdate':
                this.handleTimeUpdate(data);
                break;
            case 'weatherUpdate':
                this.handleWeatherUpdate(data);
                break;
            case 'positionCorrection':
                this.handlePositionCorrection(data);
                break;
            case 'craftResult':
                this.handleCraftResult(data);
                break;
            case 'miningFailed':
                this.handleMiningFailed(data);
                break;
        }
    }
    
    handleChunkData(data) {
        const { chunkKey, blocks } = data;
        
        // Clear existing chunk data
        this.clearChunk(chunkKey);
        
        // Add new blocks
        blocks.forEach(block => {
            const blockKey = `${block.x},${block.y},${block.z}`;
            this.blockData.set(blockKey, block.type);
        });
        
        // Regenerate chunk visuals
        const [cx, cz] = chunkKey.split(',').map(Number);
        this.regenerateChunkForPosition(cx * this.chunkSize, cz * this.chunkSize);
    }
    
    handleChunkUpdate(data) {
        this.handleChunkData(data); // Same handling for now
    }
    
    handleUnloadChunk(data) {
        const { chunkKey } = data;
        this.clearChunk(chunkKey);
    }
    
    handleBlockUpdate(data) {
        const { position, blockType } = data;
        const blockKey = `${position.x},${position.y},${position.z}`;
        
        if (blockType) {
            this.blockData.set(blockKey, blockType);
        } else {
            this.blockData.delete(blockKey);
        }
        
        this.regenerateChunkForPosition(position.x, position.z);
    }
    
    handlePlayerUpdate(data) {
        this.player.health = data.health;
        this.player.hunger = data.hunger;
        this.player.inventory = data.inventory;
        
        // Restore tools map
        this.player.tools = new Map(data.tools);
        
        this.updateUI();
    }
    
    handlePlayersUpdate(data) {
        const { players } = data;
        
        // Update other players
        players.forEach(playerData => {
            if (playerData.id !== this.playerId) {
                this.updateOtherPlayer(playerData);
            }
        });
    }
    
    handlePlayerJoin(data) {
        const { player } = data;
        console.log(`👤 Player ${player.id} joined`);
        this.createOtherPlayer(player);
    }
    
    handlePlayerLeave(data) {
        const { playerId } = data;
        console.log(`👤 Player ${playerId} left`);
        this.removeOtherPlayer(playerId);
    }
    
    handlePlayerMove(data) {
        const { playerId, position, velocity } = data;
        this.updateOtherPlayerMovement(playerId, position, velocity);
    }
    
    handlePlayerStartMining(data) {
        const { playerId, position, duration } = data;
        if (playerId !== this.playerId) {
            this.showOtherPlayerMining(playerId, position, duration);
        }
    }
    
    handlePlayerStopMining(data) {
        const { playerId } = data;
        if (playerId !== this.playerId) {
            this.hideOtherPlayerMining(playerId);
        }
    }
    
    handlePlayerFinishMining(data) {
        const { playerId, position } = data;
        if (playerId !== this.playerId) {
            this.showOtherPlayerFinishMining(playerId, position);
        }
    }
    
    handleTimeUpdate(data) {
        this.timeOfDay = data.timeOfDay;
    }
    
    handleWeatherUpdate(data) {
        this.weather = data.weather;
    }
    
    handlePositionCorrection(data) {
        // Server corrected our position (anti-cheat)
        this.camera.position.copy(data.position);
        this.player.bounds.setFromCenterAndSize(this.camera.position, new THREE.Vector3(0.6, 1.8, 0.6));
    }
    
    handleCraftResult(data) {
        const { recipe, success } = data;
        if (!success) {
            console.warn(`❌ Crafting failed for ${recipe}`);
        }
    }
    
    handleMiningFailed(data) {
        const { reason } = data;
        console.warn(`❌ Mining failed: ${reason}`);
    }
    
    // Multiplayer player management
    createOtherPlayer(playerData) {
        const { id, position } = playerData;
        
        // Create visual representation
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.3);
        const material = new THREE.MeshLambertMaterial({ color: 0x0066cc });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.set(position.x, position.y, position.z);
        this.scene.add(mesh);
        
        // Create name tag
        const nameTag = this.createNameTag(id);
        nameTag.position.set(position.x, position.y + 2.5, position.z);
        this.scene.add(nameTag);
        
        this.otherPlayers.set(id, {
            mesh: mesh,
            nameTag: nameTag,
            position: position,
            targetPosition: position,
            miningIndicator: null
        });
    }
    
    updateOtherPlayer(playerData) {
        const { id, position, velocity } = playerData;
        const player = this.otherPlayers.get(id);
        
        if (!player) {
            this.createOtherPlayer(playerData);
            return;
        }
        
        // Update target position for interpolation
        player.targetPosition = position;
    }
    
    updateOtherPlayerMovement(playerId, position, velocity) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            player.targetPosition = position;
        }
    }
    
    removeOtherPlayer(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            this.scene.remove(player.mesh);
            this.scene.remove(player.nameTag);
            if (player.miningIndicator) {
                this.scene.remove(player.miningIndicator);
            }
            
            player.mesh.geometry.dispose();
            player.mesh.material.dispose();
            player.nameTag.geometry.dispose();
            player.nameTag.material.dispose();
            
            this.otherPlayers.delete(playerId);
        }
    }
    
    showOtherPlayerMining(playerId, position, duration) {
        const player = this.otherPlayers.get(playerId);
        if (player) {
            // Create mining indicator
            const geometry = new THREE.SphereGeometry(0.1);
            const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const indicator = new THREE.Mesh(geometry, material);
            
            indicator.position.set(position.x + 0.5, position.y + 0.5, position.z + 0.5);
            this.scene.add(indicator);
            
            player.miningIndicator = indicator;
            
            // Animate indicator
            const startTime = Date.now();
            const animate = () => {
                if (player.miningIndicator === indicator) {
                    const elapsed = Date.now() - startTime;
                    const progress = elapsed / duration;
                    
                    if (progress < 1) {
                        indicator.scale.setScalar(1 + Math.sin(elapsed * 0.01) * 0.3);
                        requestAnimationFrame(animate);
                    }
                }
            };
            animate();
        }
    }
    
    hideOtherPlayerMining(playerId) {
        const player = this.otherPlayers.get(playerId);
        if (player && player.miningIndicator) {
            this.scene.remove(player.miningIndicator);
            player.miningIndicator.geometry.dispose();
            player.miningIndicator.material.dispose();
            player.miningIndicator = null;
        }
    }
    
    showOtherPlayerFinishMining(playerId, position) {
        this.hideOtherPlayerMining(playerId);
        this.createBlockBreakParticles(position, 'stone'); // Generic particles
    }
    
    createNameTag(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = 'white';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(2, 0.5);
        
        return new THREE.Mesh(geometry, material);
    }
    
    clearChunk(chunkKey) {
        const [cx, cz] = chunkKey.split(',').map(Number);
        
        // Remove chunk from loaded chunks
        if (this.loadedChunks.has(chunkKey)) {
            const meshes = this.loadedChunks.get(chunkKey);
            for (const type in meshes) {
                this.scene.remove(meshes[type]);
                meshes[type].geometry.dispose();
            }
            this.loadedChunks.delete(chunkKey);
        }
        
        // Remove blocks from blockData
        for (let x = cx * this.chunkSize; x < (cx + 1) * this.chunkSize; x++) {
            for (let z = cz * this.chunkSize; z < (cz + 1) * this.chunkSize; z++) {
                for (let y = -10; y <= 80; y++) {
                    const blockKey = `${x},${y},${z}`;
                    this.blockData.delete(blockKey);
                }
            }
        }
    }
    
    // Network communication
    sendToServer(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            // Queue message if not connected
            this.networkQueue.push(message);
        }
    }
    
    sendMovementUpdate() {
        if (!this.isMultiplayer) return;
        
        const now = Date.now();
        if (now - this.lastNetworkUpdate < 50) return; // 20 updates per second max
        
        this.sendToServer({
            type: 'move',
            position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            velocity: this.player.velocity
        });
        
        this.lastNetworkUpdate = now;
    }
    
    sendStartMining(position) {
        if (this.isMultiplayer) {
            this.sendToServer({
                type: 'startMining',
                position: position
            });
        }
    }
    
    sendStopMining() {
        if (this.isMultiplayer) {
            this.sendToServer({
                type: 'stopMining'
            });
        }
    }
    
    sendPlaceBlock(position, blockType) {
        if (this.isMultiplayer) {
            this.sendToServer({
                type: 'placeBlock',
                position: position,
                blockType: blockType
            });
        }
    }
    
    sendCraftRequest(recipe) {
        if (this.isMultiplayer) {
            this.sendToServer({
                type: 'craft',
                recipe: recipe
            });
        }
    }
    
    sendHotbarSelect(slot) {
        if (this.isMultiplayer) {
            this.sendToServer({
                type: 'hotbarSelect',
                slot: slot
            });
        }
    }
    
    requestChunks(chunkKeys) {
        if (this.isMultiplayer) {
            this.sendToServer({
                type: 'requestChunks',
                chunks: chunkKeys
            });
        }
    }
    
    showConnectionStatus(message, color) {
        let statusDiv = document.getElementById('connection-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'connection-status';
            statusDiv.style.cssText = `
                position: fixed; top: 10px; left: 10px; 
                padding: 10px; background: rgba(0,0,0,0.8);
                color: white; border-radius: 5px; font-family: monospace;
                z-index: 1001;
            `;
            document.body.appendChild(statusDiv);
        }
        
        statusDiv.textContent = message;
        statusDiv.style.color = color;
    }
    
    attemptReconnect() {
        console.log('🔄 Attempting to reconnect...');
        setTimeout(() => {
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                this.initMultiplayer();
            }
        }, 3000);
    }
    
    updateOtherPlayersInterpolation() {
        this.otherPlayers.forEach(player => {
            // Smooth interpolation to target position
            const lerpFactor = 0.2;
            
            player.mesh.position.lerp(
                new THREE.Vector3(
                    player.targetPosition.x,
                    player.targetPosition.y,
                    player.targetPosition.z
                ),
                lerpFactor
            );
            
            player.nameTag.position.copy(player.mesh.position);
            player.nameTag.position.y += 2.5;
            
            // Make name tag face camera
            player.nameTag.lookAt(this.camera.position);
        });
    }
}

// =============================================================================
//  TEXTURE GENERATOR
// =============================================================================
class TextureGenerator {
    constructor() {
        this.textureSize = 64;
    }

    createCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = this.textureSize;
        canvas.height = this.textureSize;
        return canvas;
    }

    createGrassTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base green color
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add random grass patterns
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const shade = Math.random() * 0.3 + 0.7;
            ctx.fillStyle = `rgba(${Math.floor(34 * shade)}, ${Math.floor(139 * shade)}, ${Math.floor(34 * shade)}, 0.8)`;
            ctx.fillRect(x, y, 2, 2);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createDirtTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base brown color
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add dirt particles
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const shade = Math.random() * 0.4 + 0.6;
            ctx.fillStyle = `rgba(${Math.floor(139 * shade)}, ${Math.floor(69 * shade)}, ${Math.floor(19 * shade)}, 0.9)`;
            ctx.fillRect(x, y, 3, 3);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createStoneTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base gray color
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add stone patterns
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 1;
            const shade = Math.random() * 0.5 + 0.5;
            ctx.fillStyle = `rgba(${Math.floor(105 * shade)}, ${Math.floor(105 * shade)}, ${Math.floor(105 * shade)}, 0.8)`;
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createWoodTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base wood color
        ctx.fillStyle = '#d2691e';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add wood grain lines
        for (let y = 0; y < this.textureSize; y += 4) {
            const lineY = y + Math.random() * 2;
            const shade = Math.random() * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(${Math.floor(210 * shade)}, ${Math.floor(105 * shade)}, ${Math.floor(30 * shade)}, 0.6)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, lineY);
            ctx.lineTo(this.textureSize, lineY + Math.random() * 4);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSandTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base sand color
        ctx.fillStyle = '#f4a460';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add sand grains
        for (let i = 0; i < 300; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const shade = Math.random() * 0.4 + 0.6;
            ctx.fillStyle = `rgba(${Math.floor(244 * shade)}, ${Math.floor(164 * shade)}, ${Math.floor(96 * shade)}, 0.7)`;
            ctx.fillRect(x, y, 1, 1);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createBedrockTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base dark color
        ctx.fillStyle = '#2f2f2f';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add crack patterns
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 6 + 2;
            const shade = Math.random() * 0.3 + 0.4;
            ctx.fillStyle = `rgba(${Math.floor(64 * shade)}, ${Math.floor(64 * shade)}, ${Math.floor(64 * shade)}, 0.9)`;
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createCoalOreTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base stone color
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add coal spots
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 8 + 4;
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createIronOreTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base stone color
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add iron spots
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 6 + 3;
            ctx.fillStyle = '#d8af93';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createDiamondOreTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base stone color
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add diamond spots
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 2;
            ctx.fillStyle = '#5cb3cc';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createPlanksTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base plank color
        ctx.fillStyle = '#c4915c';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add vertical plank lines
        for (let x = 0; x < this.textureSize; x += 16) {
            ctx.strokeStyle = '#8b6f47';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.textureSize);
            ctx.stroke();
        }
        
        // Add horizontal wood grain
        for (let y = 0; y < this.textureSize; y += 2) {
            const shade = Math.random() * 0.2 + 0.8;
            ctx.strokeStyle = `rgba(${Math.floor(196 * shade)}, ${Math.floor(145 * shade)}, ${Math.floor(92 * shade)}, 0.5)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.textureSize, y);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createWaterTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base water color
        ctx.fillStyle = '#3498db';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add flowing patterns
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const shade = Math.random() * 0.3 + 0.7;
            ctx.fillStyle = `rgba(${Math.floor(52 * shade)}, ${Math.floor(152 * shade)}, ${Math.floor(219 * shade)}, 0.6)`;
            ctx.fillRect(x, y, 3, 1);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSnowTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base snow color
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add subtle variations
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const shade = Math.random() * 0.1 + 0.9;
            ctx.fillStyle = `rgba(${Math.floor(255 * shade)}, ${Math.floor(255 * shade)}, ${Math.floor(255 * shade)}, 0.7)`;
            ctx.fillRect(x, y, 2, 2);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createLeavesTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base green color
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add leaf patterns
        for (let i = 0; i < 150; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const shade = Math.random() * 0.4 + 0.6;
            ctx.fillStyle = `rgba(${Math.floor(34 * shade)}, ${Math.floor(139 * shade)}, ${Math.floor(34 * shade)}, 0.8)`;
            ctx.fillRect(x, y, 3, 2);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSandstoneTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base sandstone color
        ctx.fillStyle = '#e6d690';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add layered patterns
        for (let y = 0; y < this.textureSize; y += 8) {
            const shade = Math.random() * 0.2 + 0.8;
            ctx.strokeStyle = `rgba(${Math.floor(230 * shade)}, ${Math.floor(214 * shade)}, ${Math.floor(144 * shade)}, 0.6)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.textureSize, y);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createIceTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base ice color
        ctx.fillStyle = '#b8e6ff';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add crystal patterns
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createCrackTexture(level) {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Transparent background
        ctx.clearRect(0, 0, this.textureSize, this.textureSize);
        
        // Draw cracks based on level (0-9)
        const crackCount = (level + 1) * 3;
        const opacity = (level + 1) * 0.1;
        
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.lineWidth = 1;
        
        for (let i = 0; i < crackCount; i++) {
            ctx.beginPath();
            const startX = Math.random() * this.textureSize;
            const startY = Math.random() * this.textureSize;
            const endX = startX + (Math.random() - 0.5) * 20;
            const endY = startY + (Math.random() - 0.5) * 20;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            
            // Add branches
            const branches = Math.floor(Math.random() * 3);
            for (let j = 0; j < branches; j++) {
                const branchX = startX + (endX - startX) * Math.random();
                const branchY = startY + (endY - startY) * Math.random();
                const branchEndX = branchX + (Math.random() - 0.5) * 10;
                const branchEndY = branchY + (Math.random() - 0.5) * 10;
                
                ctx.moveTo(branchX, branchY);
                ctx.lineTo(branchEndX, branchEndY);
            }
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    // =============================================================================
    //  MOB TEXTURES
    // =============================================================================

    createZombieTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base zombie green skin
        ctx.fillStyle = '#4a7c59';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add darker patches for decay
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 6 + 2;
            ctx.fillStyle = 'rgba(32, 54, 38, 0.7)';
            ctx.fillRect(x, y, size, size);
        }
        
        // Add torn clothing patches
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 2;
            ctx.fillStyle = 'rgba(101, 67, 33, 0.6)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSkeletonTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base bone white
        ctx.fillStyle = '#f0f0e0';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add bone texture with lines
        for (let y = 0; y < this.textureSize; y += 8) {
            ctx.strokeStyle = 'rgba(200, 200, 180, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.textureSize, y);
            ctx.stroke();
        }
        
        // Add darker bone joints
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = 'rgba(220, 220, 200, 0.8)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createCreeperTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base creeper green
        ctx.fillStyle = '#0da70b';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add darker green patches
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 2;
            const shade = Math.random() * 0.3 + 0.5;
            ctx.fillStyle = `rgba(${Math.floor(13 * shade)}, ${Math.floor(167 * shade)}, ${Math.floor(11 * shade)}, 0.8)`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add pixelated pattern
        for (let x = 0; x < this.textureSize; x += 4) {
            for (let y = 0; y < this.textureSize; y += 4) {
                if (Math.random() < 0.3) {
                    ctx.fillStyle = 'rgba(8, 120, 7, 0.6)';
                    ctx.fillRect(x, y, 4, 4);
                }
            }
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSpiderTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base dark brown
        ctx.fillStyle = '#342017';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add spider hair texture
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const length = Math.random() * 3 + 1;
            ctx.strokeStyle = 'rgba(42, 26, 15, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y + length);
            ctx.stroke();
        }
        
        // Add body segments
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 6 + 3;
            ctx.fillStyle = 'rgba(28, 16, 11, 0.9)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createCowTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add black spots
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 8 + 4;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add some gray shading
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 2;
            ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createPigTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base pink
        ctx.fillStyle = '#ffc0cb';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add slightly darker pink patches
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 5 + 2;
            ctx.fillStyle = 'rgba(255, 160, 171, 0.7)';
            ctx.fillRect(x, y, size, size);
        }
        
        // Add dirt spots
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = 'rgba(139, 69, 19, 0.4)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSheepWoolTexture(color = 'white') {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        const colors = {
            white: '#ffffff',
            black: '#1e1e1e',
            gray: '#808080',
            brown: '#8b4513',
            pink: '#ffc0cb'
        };
        
        // Base wool color
        ctx.fillStyle = colors[color] || colors.white;
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add wool texture (fluffy bumps)
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const radius = Math.random() * 3 + 1;
            
            const woolColor = colors[color] || colors.white;
            const rgb = this.hexToRgb(woolColor);
            const shade = Math.random() * 0.3 + 0.8;
            
            ctx.fillStyle = `rgba(${Math.floor(rgb.r * shade)}, ${Math.floor(rgb.g * shade)}, ${Math.floor(rgb.b * shade)}, 0.8)`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createSheepSkinTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base skin color
        ctx.fillStyle = '#d4af8c';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add skin texture
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = 'rgba(196, 160, 125, 0.8)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createChickenTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add feather texture
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const length = Math.random() * 4 + 2;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.strokeStyle = 'rgba(240, 240, 240, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
            ctx.stroke();
        }
        
        // Add some yellow tint for variety
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
            ctx.fillRect(x, y, size, size);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createItemTexture(itemType) {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base color based on item type
        const itemColors = {
            coal: '#2F2F2F',
            iron_ingot: '#C0C0C0',
            diamond: '#00FFFF',
            gold_ingot: '#FFD700',
            bone: '#F5F5DC',
            arrow: '#8B4513',
            string: '#F0F0F0',
            gunpowder: '#404040',
            rotten_flesh: '#654321',
            raw_beef: '#8B0000',
            raw_pork: '#FFB6C1',
            raw_chicken: '#FFA500',
            raw_mutton: '#DC143C',
            leather: '#8B4513',
            wool_white: '#FFFFFF',
            feather: '#F0F0F0',
            egg: '#F5F5DC'
        };
        
        const baseColor = itemColors[itemType] || '#FFFFFF';
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add item-specific details
        switch (itemType) {
            case 'diamond':
                // Add sparkle effect
                for (let i = 0; i < 20; i++) {
                    const x = Math.random() * this.textureSize;
                    const y = Math.random() * this.textureSize;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(x, y, 1, 1);
                }
                break;
            case 'bone':
                // Add bone segments
                for (let y = 0; y < this.textureSize; y += 6) {
                    ctx.strokeStyle = 'rgba(220, 220, 200, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(this.textureSize, y);
                    ctx.stroke();
                }
                break;
            case 'raw_beef':
            case 'raw_pork':
            case 'raw_chicken':
            case 'raw_mutton':
                // Add meat texture
                for (let i = 0; i < 30; i++) {
                    const x = Math.random() * this.textureSize;
                    const y = Math.random() * this.textureSize;
                    const size = Math.random() * 3 + 1;
                    ctx.fillStyle = 'rgba(100, 0, 0, 0.6)';
                    ctx.fillRect(x, y, size, size);
                }
                break;
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createFurnaceTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base stone color
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add stone pattern
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 1;
            const shade = Math.random() * 0.5 + 0.5;
            ctx.fillStyle = `rgba(${Math.floor(105 * shade)}, ${Math.floor(105 * shade)}, ${Math.floor(105 * shade)}, 0.8)`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add furnace opening (dark rectangle)
        ctx.fillStyle = '#222222';
        ctx.fillRect(this.textureSize * 0.2, this.textureSize * 0.3, this.textureSize * 0.6, this.textureSize * 0.4);
        
        // Add opening border
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.textureSize * 0.2, this.textureSize * 0.3, this.textureSize * 0.6, this.textureSize * 0.4);
        
        return new THREE.CanvasTexture(canvas);
    }

    createFurnaceLitTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base stone color
        ctx.fillStyle = '#696969';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add stone pattern
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 4 + 1;
            const shade = Math.random() * 0.5 + 0.5;
            ctx.fillStyle = `rgba(${Math.floor(105 * shade)}, ${Math.floor(105 * shade)}, ${Math.floor(105 * shade)}, 0.8)`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add furnace opening with fire glow
        const gradient = ctx.createRadialGradient(
            this.textureSize * 0.5, this.textureSize * 0.5,
            0,
            this.textureSize * 0.5, this.textureSize * 0.5,
            this.textureSize * 0.4
        );
        gradient.addColorStop(0, '#ff6600');
        gradient.addColorStop(0.5, '#ff3300');
        gradient.addColorStop(1, '#660000');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.textureSize * 0.2, this.textureSize * 0.3, this.textureSize * 0.6, this.textureSize * 0.4);
        
        // Add fire particles
        for (let i = 0; i < 20; i++) {
            const x = this.textureSize * 0.2 + Math.random() * (this.textureSize * 0.6);
            const y = this.textureSize * 0.3 + Math.random() * (this.textureSize * 0.4);
            const size = Math.random() * 3 + 1;
            ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 155 + 100)}, 0, 0.8)`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add opening border
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.textureSize * 0.2, this.textureSize * 0.3, this.textureSize * 0.6, this.textureSize * 0.4);
        
        return new THREE.CanvasTexture(canvas);
    }

    createFarmlandTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Base dark brown soil
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Add soil texture
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.textureSize;
            const y = Math.random() * this.textureSize;
            const size = Math.random() * 3 + 1;
            const shade = Math.random() * 0.4 + 0.6;
            ctx.fillStyle = `rgba(${Math.floor(93 * shade)}, ${Math.floor(64 * shade)}, ${Math.floor(55 * shade)}, 0.8)`;
            ctx.fillRect(x, y, size, size);
        }
        
        // Add furrow lines
        for (let y = 4; y < this.textureSize; y += 8) {
            ctx.strokeStyle = 'rgba(45, 30, 20, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.textureSize, y);
            ctx.stroke();
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createWheatCropTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Transparent background
        ctx.clearRect(0, 0, this.textureSize, this.textureSize);
        
        // Draw wheat stalks
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * this.textureSize;
            const height = this.textureSize * 0.7 + Math.random() * this.textureSize * 0.3;
            
            // Stalk
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, this.textureSize);
            ctx.lineTo(x + (Math.random() - 0.5) * 4, this.textureSize - height);
            ctx.stroke();
            
            // Wheat head
            ctx.fillStyle = '#ffeb3b';
            ctx.fillRect(x - 2, this.textureSize - height - 4, 4, 6);
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createCarrotCropTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Transparent background
        ctx.clearRect(0, 0, this.textureSize, this.textureSize);
        
        // Draw carrot tops
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * this.textureSize;
            const y = this.textureSize * 0.3 + Math.random() * this.textureSize * 0.3;
            
            // Carrot leaves
            ctx.strokeStyle = '#2e7d32';
            ctx.lineWidth = 1;
            for (let j = 0; j < 3; j++) {
                ctx.beginPath();
                ctx.moveTo(x, this.textureSize);
                ctx.lineTo(x + (Math.random() - 0.5) * 6, y);
                ctx.stroke();
            }
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    createPotatoCropTexture() {
        const canvas = this.createCanvas();
        const ctx = canvas.getContext('2d');
        
        // Transparent background
        ctx.clearRect(0, 0, this.textureSize, this.textureSize);
        
        // Draw potato plants
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * this.textureSize;
            const y = this.textureSize * 0.2 + Math.random() * this.textureSize * 0.4;
            
            // Potato leaves (broader than carrots)
            ctx.fillStyle = '#388e3c';
            for (let j = 0; j < 4; j++) {
                const leafX = x + (Math.random() - 0.5) * 8;
                const leafY = y + Math.random() * this.textureSize * 0.4;
                ctx.beginPath();
                ctx.ellipse(leafX, leafY, 3, 2, Math.random() * Math.PI, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        return new THREE.CanvasTexture(canvas);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 255, g: 255, b: 255 };
    }
}

// Create crack textures for block breaking animation
MinecraftClone.prototype.createCrackTextures = function() {
    const textures = [];
    for (let i = 0; i < 10; i++) {
        textures.push(this.textureGenerator.createCrackTexture(i));
    }
    return textures;
}

// =============================================================================
//  PHYSICS ENGINE (AABB)
// =============================================================================
class Physics {
    constructor(blockData) {
        this.blockData = blockData;
        this.gravity = 30;
        this.moveState = { forward: false, backward: false, left: false, right: false };
        this.direction = new THREE.Vector3();

        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));
    }

    onKey(event, isDown) {
        switch (event.code) {
            case 'KeyW': this.moveState.forward = isDown; break;
            case 'KeyS': this.moveState.backward = isDown; break;
            case 'KeyA': this.moveState.left = isDown; break;
            case 'KeyD': this.moveState.right = isDown; break;
            case 'Space': if(isDown) this.jumpRequest = true; break;
        }
    }

    update(player, controls, deltaTime) {
        const speed = 5;
        const jumpSpeed = 9;
        
        const fallStartVelocity = player.velocity.y;
        player.velocity.y -= this.gravity * deltaTime;

        this.direction.z = Number(this.moveState.forward) - Number(this.moveState.backward);
        this.direction.x = Number(this.moveState.right) - Number(this.moveState.left);
        this.direction.normalize();

        const cameraDirection = new THREE.Vector3();
        controls.getDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        const rightDirection = new THREE.Vector3().crossVectors(new THREE.Vector3(0, -1, 0), cameraDirection).normalize();
        
        const moveDirectionX = cameraDirection.clone().multiplyScalar(this.direction.z).add(rightDirection.multiplyScalar(this.direction.x));
        
        player.velocity.x = moveDirectionX.x * speed;
        player.velocity.z = moveDirectionX.z * speed;
        
        if (this.jumpRequest && player.onGround) {
            player.velocity.y = jumpSpeed;
        }
        this.jumpRequest = false;

        this.moveWithCollisions(player, deltaTime);
        controls.getObject().position.copy(player.bounds.getCenter(new THREE.Vector3()));
        
        if (player.onGround && fallStartVelocity < -12) {
            const fallDamage = Math.floor((Math.abs(fallStartVelocity) - 12) / 2);
            if (fallDamage > 0) {
                player.health -= fallDamage;
                if (player.health < 0) player.health = 0;
                player.updateUI();
            }
        }
    }
    
    moveWithCollisions(player, deltaTime) {
        player.onGround = false;
        const delta = player.velocity.clone().multiplyScalar(deltaTime);

        player.bounds.translate(new THREE.Vector3(delta.x, 0, 0));
        this.checkCollisions(player, 'x');

        player.bounds.translate(new THREE.Vector3(0, delta.y, 0));
        this.checkCollisions(player, 'y');

        player.bounds.translate(new THREE.Vector3(0, 0, delta.z));
        this.checkCollisions(player, 'z');
    }

    checkCollisions(player, axis) {
        const playerBox = player.bounds;
        const min = playerBox.min.clone().floor();
        const max = playerBox.max.clone().ceil();

        for (let x = min.x; x < max.x; x++) {
            for (let y = min.y; y < max.y; y++) {
                for (let z = min.z; z < max.z; z++) {
                    if (this.blockData.has(`${x},${y},${z}`)) {
                        const blockBox = new THREE.Box3(new THREE.Vector3(x,y,z), new THREE.Vector3(x+1,y+1,z+1));
                        
                        if (playerBox.intersectsBox(blockBox)) {
                            const penetration = new THREE.Vector3();
                            if (player.velocity[axis] > 0) {
                                penetration[axis] = blockBox.min[axis] - playerBox.max[axis] - 0.001;
                            } else {
                                penetration[axis] = blockBox.max[axis] - playerBox.min[axis] + 0.001;
                            }
                            player.bounds.translate(penetration);
                            player.velocity[axis] = 0;
                            if (axis === 'y' && penetration.y > 0) {
                                player.onGround = true;
                            }
                        }
                    }
                }
            }
        }
    }

    updateDayNightCycle() {
        // Update time of day
        this.timeOfDay = (performance.now() % this.dayLength) / this.dayLength * 24000;
        
        // Calculate sun/moon positions and lighting
        const sunAngle = (this.timeOfDay / 24000) * Math.PI * 2 - Math.PI / 2;
        const sunHeight = Math.sin(sunAngle);
        const isDay = sunHeight > 0;
        
        // Update sun position
        const sunX = Math.cos(sunAngle) * 100;
        const sunY = Math.sin(sunAngle) * 100;
        this.directionalLight.position.set(sunX, Math.max(sunY, 10), 50);
        
        // Update moon position (opposite of sun)
        const moonX = -sunX;
        const moonY = -Math.min(sunY, -10);
        this.moonLight.position.set(moonX, moonY, -50);
        
        // Update lighting intensity
        if (isDay) {
            // Day lighting
            const dayIntensity = Math.max(0.2, sunHeight * 0.8);
            this.directionalLight.intensity = dayIntensity;
            this.moonLight.intensity = 0;
            this.ambientLight.intensity = Math.max(0.3, sunHeight * 0.6);
            
            // Day colors
            const skyIntensity = Math.max(0.5, sunHeight);
            this.renderer.setClearColor(new THREE.Color(0.5 * skyIntensity, 0.7 * skyIntensity, 1.0 * skyIntensity));
            this.directionalLight.color.setHex(0xffffff);
        } else {
            // Night lighting
            const nightIntensity = Math.abs(sunHeight) * 0.4;
            this.directionalLight.intensity = 0;
            this.moonLight.intensity = Math.max(0.1, nightIntensity);
            this.ambientLight.intensity = Math.max(0.1, nightIntensity * 0.3);
            
            // Night colors
            this.renderer.setClearColor(new THREE.Color(0.05, 0.05, 0.2));
            this.moonLight.color.setHex(0x6666aa);
        }
        
        // Update fog for atmosphere
        if (!this.scene.fog) {
            this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
        }
        
        if (isDay) {
            this.scene.fog.color.setHex(0x87CEEB); // Day fog
            this.scene.fog.near = 100;
            this.scene.fog.far = 300;
        } else {
            this.scene.fog.color.setHex(0x0a0a0a); // Night fog
            this.scene.fog.near = 50;
            this.scene.fog.far = 150;
        }

        // Update time display
        const hours = Math.floor((this.timeOfDay / 1000) % 24);
        const minutes = Math.floor(((this.timeOfDay / 1000) % 1) * 60);
        const day = Math.floor(this.timeOfDay / 24000) + 1;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            timeDisplay.textContent = `Day ${day} - ${timeStr}`;
        }
    }
}

// =============================================================================
//  INITIALIZE AND RUN THE GAME
// =============================================================================
// Game is now initialized from HTML based on user choice