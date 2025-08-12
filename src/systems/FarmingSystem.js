// =============================================================================
//  FARMING SYSTEM
// =============================================================================

class FarmingSystem {
    constructor(game) {
        this.game = game;
        this.crops = new Map(); // Map of crop positions to crop data
        this.growthTimer = 0;
        this.growthInterval = 30; // Growth check every 30 seconds
        
        // Crop types and their properties
        this.cropTypes = {
            wheat: {
                seedItem: 'seeds',
                grownItem: 'wheat',
                growthStages: 4,
                growthTime: 60, // seconds per stage
                blockType: 'wheat_crop'
            },
            carrot: {
                seedItem: 'carrot',
                grownItem: 'carrot',
                growthStages: 4,
                growthTime: 60,
                blockType: 'carrot_crop'
            },
            potato: {
                seedItem: 'potato',
                grownItem: 'potato',
                growthStages: 4,
                growthTime: 60,
                blockType: 'potato_crop'
            }
        };
    }

    update(deltaTime) {
        this.growthTimer += deltaTime;
        
        if (this.growthTimer >= this.growthInterval) {
            this.updateCropGrowth();
            this.growthTimer = 0;
        }
    }

    updateCropGrowth() {
        const now = Date.now();
        
        for (const [position, crop] of this.crops) {
            if (crop.stage < crop.maxStages) {
                // Check if enough time has passed for growth
                if (now - crop.lastGrowth > crop.growthTime * 1000) {
                    // Check if crop has proper conditions
                    if (this.checkGrowthConditions(crop)) {
                        this.growCrop(crop);
                    }
                }
            }
        }
    }

    checkGrowthConditions(crop) {
        // Check if farmland is still below the crop
        const farmlandPos = { x: crop.x, y: crop.y - 1, z: crop.z };
        const farmlandKey = `${farmlandPos.x},${farmlandPos.y},${farmlandPos.z}`;
        
        if (!this.game.blockData.has(farmlandKey) || 
            this.game.blockData.get(farmlandKey) !== 'farmland') {
            // Farmland destroyed, remove crop
            this.removeCrop(crop);
            return false;
        }
        
        // Check for water nearby (within 4 blocks)
        let hasWater = false;
        for (let dx = -4; dx <= 4; dx++) {
            for (let dz = -4; dz <= 4; dz++) {
                const waterKey = `${crop.x + dx},${crop.y - 1},${crop.z + dz}`;
                if (this.game.blockData.has(waterKey) && 
                    this.game.blockData.get(waterKey) === 'water') {
                    hasWater = true;
                    break;
                }
            }
            if (hasWater) break;
        }
        
        // Slower growth without water
        if (!hasWater && Math.random() < 0.7) {
            return false;
        }
        
        // Check light level (simplified - just check if above ground)
        return crop.y > 30;
    }

    growCrop(crop) {
        crop.stage++;
        crop.lastGrowth = Date.now();
        
        // Update visual representation
        this.updateCropBlock(crop);
        
        if (crop.stage >= crop.maxStages) {
            console.log(`${crop.type} crop is fully grown!`);
        }
    }

    plantSeed(position, seedType) {
        // Check if position is valid (above farmland)
        const farmlandPos = { x: position.x, y: position.y - 1, z: position.z };
        const farmlandKey = `${farmlandPos.x},${farmlandPos.y},${farmlandPos.z}`;
        
        if (!this.game.blockData.has(farmlandKey) || 
            this.game.blockData.get(farmlandKey) !== 'farmland') {
            return false;
        }
        
        // Check if there's already a crop here
        const cropKey = `${position.x},${position.y},${position.z}`;
        if (this.crops.has(cropKey)) {
            return false;
        }
        
        // Determine crop type from seed
        let cropType = null;
        for (const [type, config] of Object.entries(this.cropTypes)) {
            if (config.seedItem === seedType) {
                cropType = type;
                break;
            }
        }
        
        if (!cropType) return false;
        
        const cropConfig = this.cropTypes[cropType];
        
        // Create crop
        const crop = {
            x: position.x,
            y: position.y,
            z: position.z,
            type: cropType,
            stage: 0,
            maxStages: cropConfig.growthStages,
            growthTime: cropConfig.growthTime,
            lastGrowth: Date.now(),
            blockType: cropConfig.blockType
        };
        
        this.crops.set(cropKey, crop);
        
        // Place crop block in world
        this.game.blockData.set(cropKey, cropConfig.blockType);
        this.updateCropBlock(crop);
        
        return true;
    }

    harvestCrop(position) {
        const cropKey = `${position.x},${position.y},${position.z}`;
        const crop = this.crops.get(cropKey);
        
        if (!crop) return [];
        
        const cropConfig = this.cropTypes[crop.type];
        const drops = [];
        
        if (crop.stage >= crop.maxStages) {
            // Fully grown crop
            const baseYield = 1 + Math.floor(Math.random() * 3); // 1-3 items
            drops.push({ item: cropConfig.grownItem, count: baseYield });
            
            // Chance for extra seeds
            if (crop.type === 'wheat') {
                const seedYield = Math.floor(Math.random() * 4); // 0-3 seeds
                if (seedYield > 0) {
                    drops.push({ item: 'seeds', count: seedYield });
                }
            } else {
                // Carrots and potatoes can drop extra of themselves
                const extraYield = Math.floor(Math.random() * 2); // 0-1 extra
                if (extraYield > 0) {
                    drops.push({ item: cropConfig.grownItem, count: extraYield });
                }
            }
        } else {
            // Immature crop - only drop seeds/base item
            if (crop.type === 'wheat') {
                drops.push({ item: 'seeds', count: 1 });
            } else {
                drops.push({ item: cropConfig.seedItem, count: 1 });
            }
        }
        
        // Remove crop
        this.removeCrop(crop);
        
        return drops;
    }

    removeCrop(crop) {
        const cropKey = `${crop.x},${crop.y},${crop.z}`;
        this.crops.delete(cropKey);
        
        // Remove block from world
        this.game.blockData.delete(cropKey);
        this.game.regenerateChunkForPosition(crop.x, crop.z);
    }

    updateCropBlock(crop) {
        const cropKey = `${crop.x},${crop.y},${crop.z}`;
        
        // Update block type based on growth stage
        // For now, we'll just use the base crop type
        // In a more advanced system, you could have different textures for each stage
        this.game.blockData.set(cropKey, crop.blockType);
        
        // Regenerate chunk
        this.game.regenerateChunkForPosition(crop.x, crop.z);
    }

    tillSoil(position) {
        // Convert dirt/grass to farmland
        const blockKey = `${position.x},${position.y},${position.z}`;
        const blockType = this.game.blockData.get(blockKey);
        
        if (blockType === 'dirt' || blockType === 'grass') {
            this.game.blockData.set(blockKey, 'farmland');
            this.game.regenerateChunkForPosition(position.x, position.z);
            return true;
        }
        
        return false;
    }

    canPlantSeed(position, seedType) {
        // Check if position is above farmland
        const farmlandPos = { x: position.x, y: position.y - 1, z: position.z };
        const farmlandKey = `${farmlandPos.x},${farmlandPos.y},${farmlandPos.z}`;
        
        const isFarmland = this.game.blockData.has(farmlandKey) && 
                          this.game.blockData.get(farmlandKey) === 'farmland';
        
        // Check if seed type is valid
        const isValidSeed = Object.values(this.cropTypes).some(config => 
            config.seedItem === seedType
        );
        
        // Check if position is empty
        const posKey = `${position.x},${position.y},${position.z}`;
        const isEmpty = !this.game.blockData.has(posKey);
        
        return isFarmland && isValidSeed && isEmpty;
    }

    isCropBlock(blockType) {
        return Object.values(this.cropTypes).some(config => 
            config.blockType === blockType
        );
    }

    getCropAt(position) {
        const cropKey = `${position.x},${position.y},${position.z}`;
        return this.crops.get(cropKey);
    }

    // Bone meal fertilizer
    fertilizeCrop(position) {
        const crop = this.getCropAt(position);
        if (!crop) return false;
        
        // Advance crop by 1-3 stages
        const growth = 1 + Math.floor(Math.random() * 3);
        crop.stage = Math.min(crop.maxStages, crop.stage + growth);
        crop.lastGrowth = Date.now();
        
        this.updateCropBlock(crop);
        
        // Create growth particles
        this.createGrowthParticles(position);
        
        return true;
    }

    createGrowthParticles(position) {
        for (let i = 0; i < 15; i++) {
            const particle = {
                position: new THREE.Vector3(
                    position.x + (Math.random() - 0.5) * 2,
                    position.y + Math.random() * 2,
                    position.z + (Math.random() - 0.5) * 2
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 1
                ),
                color: new THREE.Color(0.2, 0.8, 0.2),
                life: 1.5,
                maxLife: 1.5,
                size: 0.08
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    // Get crops ready for harvest
    getHarvestableCrops() {
        const harvestable = [];
        
        for (const [position, crop] of this.crops) {
            if (crop.stage >= crop.maxStages) {
                harvestable.push(crop);
            }
        }
        
        return harvestable;
    }

    // Statistics
    getCropStatistics() {
        const stats = {
            totalCrops: this.crops.size,
            cropsByType: {},
            readyToHarvest: 0
        };
        
        for (const crop of this.crops.values()) {
            if (!stats.cropsByType[crop.type]) {
                stats.cropsByType[crop.type] = 0;
            }
            stats.cropsByType[crop.type]++;
            
            if (crop.stage >= crop.maxStages) {
                stats.readyToHarvest++;
            }
        }
        
        return stats;
    }
}