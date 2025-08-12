// =============================================================================
//  FURNACE AND SMELTING SYSTEM
// =============================================================================

class FurnaceSystem {
    constructor(game) {
        this.game = game;
        this.furnaces = new Map(); // Map of furnace positions to furnace data
        
        // Smelting recipes
        this.smeltingRecipes = {
            iron_ore: { result: 'iron_ingot', time: 10, experience: 0.7 },
            gold_ore: { result: 'gold_ingot', time: 10, experience: 1.0 },
            sand: { result: 'glass', time: 10, experience: 0.1 },
            cobblestone: { result: 'stone', time: 10, experience: 0.1 },
            raw_beef: { result: 'cooked_beef', time: 10, experience: 0.35 },
            raw_pork: { result: 'cooked_pork', time: 10, experience: 0.35 },
            raw_chicken: { result: 'cooked_chicken', time: 10, experience: 0.35 },
            raw_mutton: { result: 'cooked_mutton', time: 10, experience: 0.35 },
            potato: { result: 'baked_potato', time: 10, experience: 0.35 },
            clay_ball: { result: 'brick', time: 10, experience: 0.3 }
        };
        
        // Fuel items and their burn times (in seconds)
        this.fuelItems = {
            coal: 80,
            charcoal: 80,
            wood: 15,
            planks: 15,
            sticks: 5,
            wooden_pickaxe: 10,
            wooden_axe: 10,
            wooden_shovel: 10,
            lava_bucket: 1000,
            blaze_rod: 120
        };
        
        this.furnaceUI = null;
        this.currentFurnace = null;
    }

    update(deltaTime) {
        // Update all active furnaces
        for (const [position, furnace] of this.furnaces) {
            this.updateFurnace(furnace, deltaTime);
        }
        
        // Update UI if open
        if (this.furnaceUI && this.currentFurnace) {
            this.updateFurnaceUI();
        }
    }

    updateFurnace(furnace, deltaTime) {
        const wasLit = furnace.isLit;
        
        // Update fuel burn time
        if (furnace.fuelTime > 0) {
            furnace.fuelTime -= deltaTime;
            furnace.isLit = true;
            
            if (furnace.fuelTime <= 0) {
                furnace.fuelTime = 0;
                furnace.isLit = false;
                this.updateFurnaceBlock(furnace);
            }
        }
        
        // Try to add fuel if needed and available
        if (furnace.fuelTime <= 0 && furnace.fuel && furnace.fuel.count > 0) {
            const fuelType = furnace.fuel.type;
            const burnTime = this.fuelItems[fuelType];
            
            if (burnTime && (furnace.input || furnace.smeltProgress > 0)) {
                furnace.fuelTime = burnTime;
                furnace.maxFuelTime = burnTime;
                furnace.fuel.count--;
                
                if (furnace.fuel.count <= 0) {
                    furnace.fuel = null;
                }
                
                furnace.isLit = true;
                this.updateFurnaceBlock(furnace);
            }
        }
        
        // Process smelting
        if (furnace.isLit && furnace.input && furnace.input.count > 0) {
            const recipe = this.smeltingRecipes[furnace.input.type];
            
            if (recipe) {
                // Check if output slot can accept the result
                if (!furnace.output || 
                    (furnace.output.type === recipe.result && furnace.output.count < 64)) {
                    
                    furnace.smeltProgress += deltaTime;
                    
                    if (furnace.smeltProgress >= recipe.time) {
                        // Complete smelting
                        this.completeSmelting(furnace, recipe);
                    }
                }
            }
        } else {
            // No valid input or fuel, stop smelting
            furnace.smeltProgress = 0;
        }
        
        // Update block visual if lit state changed
        if (wasLit !== furnace.isLit) {
            this.updateFurnaceBlock(furnace);
        }
    }

    completeSmelting(furnace, recipe) {
        // Remove input item
        furnace.input.count--;
        if (furnace.input.count <= 0) {
            furnace.input = null;
        }
        
        // Add output item
        if (!furnace.output) {
            furnace.output = { type: recipe.result, count: 1 };
        } else {
            furnace.output.count++;
        }
        
        // Reset smelting progress
        furnace.smeltProgress = 0;
        
        // Give experience (simplified - just log for now)
        console.log(`Smelting complete! Gained ${recipe.experience} experience`);
        
        // Play smelting sound
        this.game.audio.playSound('furnace_complete');
    }

    placeFurnace(position) {
        const posKey = `${position.x},${position.y},${position.z}`;
        
        const furnace = {
            position: position,
            input: null,      // { type: 'iron_ore', count: 5 }
            fuel: null,       // { type: 'coal', count: 3 }
            output: null,     // { type: 'iron_ingot', count: 2 }
            fuelTime: 0,      // Current fuel burn time remaining
            maxFuelTime: 0,   // Maximum fuel burn time
            smeltProgress: 0, // Current smelting progress
            isLit: false      // Whether furnace is currently burning
        };
        
        this.furnaces.set(posKey, furnace);
        
        // Place furnace block in world
        this.game.blockData.set(posKey, 'furnace');
        this.game.updateChunks();
        
        return furnace;
    }

    removeFurnace(position) {
        const posKey = `${position.x},${position.y},${position.z}`;
        const furnace = this.furnaces.get(posKey);
        
        if (furnace) {
            // Drop all items
            this.dropFurnaceItems(furnace);
            this.furnaces.delete(posKey);
        }
        
        // Remove block from world
        this.game.blockData.delete(posKey);
        this.game.updateChunks();
    }

    dropFurnaceItems(furnace) {
        const dropItems = [];
        
        if (furnace.input) {
            dropItems.push(furnace.input);
        }
        if (furnace.fuel) {
            dropItems.push(furnace.fuel);
        }
        if (furnace.output) {
            dropItems.push(furnace.output);
        }
        
        // Create item drops
        dropItems.forEach(item => {
            for (let i = 0; i < item.count; i++) {
                const dropPosition = new THREE.Vector3(
                    furnace.position.x + (Math.random() - 0.5) * 2,
                    furnace.position.y + 1,
                    furnace.position.z + (Math.random() - 0.5) * 2
                );
                
                const itemDrop = new ItemDrop(
                    this.game,
                    dropPosition.x,
                    dropPosition.y,
                    dropPosition.z,
                    item.type
                );
                
                this.game.entityManager.addEntity(itemDrop);
            }
        });
    }

    updateFurnaceBlock(furnace) {
        const posKey = `${furnace.position.x},${furnace.position.y},${furnace.position.z}`;
        const blockType = furnace.isLit ? 'furnace_lit' : 'furnace';
        
        this.game.blockData.set(posKey, blockType);
        
        // Update the specific chunk containing this furnace
        const chunkX = Math.floor(furnace.position.x / this.game.chunkSize);
        const chunkZ = Math.floor(furnace.position.z / this.game.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Remove old chunk and regenerate
        if (this.game.loadedChunks.has(chunkKey)) {
            const chunk = this.game.loadedChunks.get(chunkKey);
            Object.values(chunk).forEach(mesh => this.game.scene.remove(mesh));
            this.game.loadedChunks.delete(chunkKey);
        }
        
        this.game.loadChunk(chunkX, chunkZ);
    }

    openFurnaceGUI(furnace) {
        this.currentFurnace = furnace;
        this.createFurnaceUI();
        this.game.controls.unlock();
    }

    closeFurnaceGUI() {
        if (this.furnaceUI) {
            document.body.removeChild(this.furnaceUI);
            this.furnaceUI = null;
        }
        this.currentFurnace = null;
        this.game.controls.lock();
    }

    createFurnaceUI() {
        if (this.furnaceUI) {
            document.body.removeChild(this.furnaceUI);
        }
        
        this.furnaceUI = document.createElement('div');
        this.furnaceUI.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #555;
            border-radius: 10px;
            padding: 20px;
            color: white;
            font-family: monospace;
            z-index: 1000;
            min-width: 400px;
        `;
        
        this.furnaceUI.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold;">
                🔥 Furnace
            </div>
            
            <div style="display: flex; justify-content: space-around; align-items: center; margin-bottom: 20px;">
                <div style="text-align: center;">
                    <div style="margin-bottom: 10px;">Input</div>
                    <div id="furnace-input" style="width: 60px; height: 60px; border: 2px solid #555; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        ⬜
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <div style="margin-bottom: 10px;">Fuel</div>
                    <div id="furnace-fuel" style="width: 60px; height: 60px; border: 2px solid #555; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        ⬜
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <div>Progress</div>
                    <div style="margin: 10px 0;">
                        <div id="smelt-progress" style="width: 40px; height: 20px; border: 1px solid #555; background: #333;">
                            <div id="smelt-bar" style="height: 100%; background: #ff6600; width: 0%; transition: width 0.1s;"></div>
                        </div>
                    </div>
                    <div>
                        <div id="fuel-progress" style="width: 40px; height: 20px; border: 1px solid #555; background: #333;">
                            <div id="fuel-bar" style="height: 100%; background: #ffaa00; width: 0%; transition: width 0.1s;"></div>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <div style="margin-bottom: 10px;">Output</div>
                    <div id="furnace-output" style="width: 60px; height: 60px; border: 2px solid #555; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        ⬜
                    </div>
                </div>
            </div>
            
            <div style="text-align: center;">
                <button onclick="game.furnaceSystem.closeFurnaceGUI()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        
        document.body.appendChild(this.furnaceUI);
        
        // Add click handlers for slots
        this.setupFurnaceSlotHandlers();
        this.updateFurnaceUI();
    }

    setupFurnaceSlotHandlers() {
        const inputSlot = document.getElementById('furnace-input');
        const fuelSlot = document.getElementById('furnace-fuel');
        const outputSlot = document.getElementById('furnace-output');
        
        inputSlot.onclick = () => this.handleSlotClick('input');
        fuelSlot.onclick = () => this.handleSlotClick('fuel');
        outputSlot.onclick = () => this.handleSlotClick('output');
    }

    handleSlotClick(slotType) {
        const heldItem = this.game.getSelectedItem();
        const furnace = this.currentFurnace;
        
        if (!furnace) return;
        
        if (slotType === 'input') {
            // Add item to input slot
            if (heldItem && this.smeltingRecipes[heldItem] && this.game.player.inventory[heldItem] > 0) {
                if (!furnace.input || furnace.input.type === heldItem) {
                    const addCount = Math.min(this.game.player.inventory[heldItem], 64 - (furnace.input?.count || 0));
                    
                    if (!furnace.input) {
                        furnace.input = { type: heldItem, count: addCount };
                    } else {
                        furnace.input.count += addCount;
                    }
                    
                    this.game.removeFromInventory(heldItem, addCount);
                }
            } else if (furnace.input) {
                // Take item from input slot
                this.game.addToInventory(furnace.input.type, furnace.input.count);
                furnace.input = null;
                furnace.smeltProgress = 0; // Reset progress when removing input
            }
        } else if (slotType === 'fuel') {
            // Add fuel to fuel slot
            if (heldItem && this.fuelItems[heldItem] && this.game.player.inventory[heldItem] > 0) {
                if (!furnace.fuel || furnace.fuel.type === heldItem) {
                    const addCount = Math.min(this.game.player.inventory[heldItem], 64 - (furnace.fuel?.count || 0));
                    
                    if (!furnace.fuel) {
                        furnace.fuel = { type: heldItem, count: addCount };
                    } else {
                        furnace.fuel.count += addCount;
                    }
                    
                    this.game.removeFromInventory(heldItem, addCount);
                }
            } else if (furnace.fuel) {
                // Take fuel from fuel slot
                this.game.addToInventory(furnace.fuel.type, furnace.fuel.count);
                furnace.fuel = null;
            }
        } else if (slotType === 'output') {
            // Take item from output slot
            if (furnace.output) {
                this.game.addToInventory(furnace.output.type, furnace.output.count);
                furnace.output = null;
            }
        }
        
        this.updateFurnaceUI();
    }

    updateFurnaceUI() {
        if (!this.furnaceUI || !this.currentFurnace) return;
        
        const furnace = this.currentFurnace;
        
        // Update slot displays
        const inputSlot = document.getElementById('furnace-input');
        const fuelSlot = document.getElementById('furnace-fuel');
        const outputSlot = document.getElementById('furnace-output');
        
        inputSlot.innerHTML = furnace.input ? 
            `${this.getItemIcon(furnace.input.type)}<br><small>${furnace.input.count}</small>` : '⬜';
            
        fuelSlot.innerHTML = furnace.fuel ? 
            `${this.getItemIcon(furnace.fuel.type)}<br><small>${furnace.fuel.count}</small>` : '⬜';
            
        outputSlot.innerHTML = furnace.output ? 
            `${this.getItemIcon(furnace.output.type)}<br><small>${furnace.output.count}</small>` : '⬜';
        
        // Update progress bars
        const smeltBar = document.getElementById('smelt-bar');
        const fuelBar = document.getElementById('fuel-bar');
        
        if (furnace.input && this.smeltingRecipes[furnace.input.type]) {
            const recipe = this.smeltingRecipes[furnace.input.type];
            const smeltProgress = Math.min(100, (furnace.smeltProgress / recipe.time) * 100);
            smeltBar.style.width = smeltProgress + '%';
        } else {
            smeltBar.style.width = '0%';
        }
        
        if (furnace.maxFuelTime > 0) {
            const fuelProgress = (furnace.fuelTime / furnace.maxFuelTime) * 100;
            fuelBar.style.width = fuelProgress + '%';
        } else {
            fuelBar.style.width = '0%';
        }
    }

    getItemIcon(itemType) {
        const icons = {
            iron_ore: '🪨',
            gold_ore: '🟨',
            sand: '🟡',
            coal: '⚫',
            wood: '🪵',
            planks: '🟫',
            iron_ingot: '⚪',
            gold_ingot: '🟨',
            glass: '⬜',
            raw_beef: '🥩',
            raw_pork: '🥓',
            raw_chicken: '🍗',
            cooked_beef: '🍖',
            cooked_pork: '🥓',
            cooked_chicken: '🍗'
        };
        
        return icons[itemType] || '📦';
    }

    getFurnaceAt(position) {
        const posKey = `${position.x},${position.y},${position.z}`;
        return this.furnaces.get(posKey);
    }

    isFurnaceBlock(blockType) {
        return blockType === 'furnace' || blockType === 'furnace_lit';
    }

    canSmelt(itemType) {
        return this.smeltingRecipes.hasOwnProperty(itemType);
    }

    isFuel(itemType) {
        return this.fuelItems.hasOwnProperty(itemType);
    }
}

// Add furnace recipes to crafting system
const furnaceRecipes = {
    furnace: { 
        ingredients: { stone: 8 }, 
        output: { furnace: 1 },
        pattern: [
            ['stone', 'stone', 'stone'],
            ['stone', null, 'stone'],
            ['stone', 'stone', 'stone']
        ]
    }
};