// =============================================================================
//  ENTITY MANAGER SYSTEM
// =============================================================================

class EntityManager {
    constructor(game) {
        this.game = game;
        this.entities = [];
        this.particles = [];
        this.maxEntities = 100;
        this.maxParticles = 500;
        
        // Spawning system
        this.spawnTimer = 0;
        this.spawnInterval = 5; // seconds
        this.maxMobsPerChunk = 4;
        this.mobSpawnRadius = 50;
        
        // Particle system
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.8,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });
        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.game.scene.add(this.particleSystem);
        
        // Mob types and their spawn weights
        this.hostileMobs = [
            { type: Zombie, weight: 100, spawnCap: 70 },
            { type: Skeleton, weight: 100, spawnCap: 70 },
            { type: Creeper, weight: 100, spawnCap: 70 },
            { type: Spider, weight: 100, spawnCap: 70 }
        ];
        
        this.passiveMobs = [
            { type: Cow, weight: 10, spawnCap: 10 },
            { type: Pig, weight: 10, spawnCap: 10 },
            { type: Sheep, weight: 12, spawnCap: 10 },
            { type: Chicken, weight: 10, spawnCap: 10 }
        ];
    }

    update(deltaTime) {
        // Update existing entities
        this.updateEntities(deltaTime);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Handle spawning
        this.updateSpawning(deltaTime);
        
        // Clean up dead entities
        this.cleanupEntities();
        
        // Update particle system
        this.updateParticleSystem();
    }

    updateEntities(deltaTime) {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            
            if (entity.isAlive) {
                entity.update(deltaTime);
                
                // Remove entities that are too far from player
                const playerPos = this.game.camera.position;
                const distance = entity.distanceTo(playerPos);
                
                if (distance > 100) { // Despawn distance
                    this.removeEntity(entity);
                }
            } else {
                this.removeEntity(entity);
            }
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update particle physics
            particle.velocity.y += -9.8 * deltaTime; // Gravity
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // Update life
            particle.life -= deltaTime;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                // Fade out
                const lifeRatio = particle.life / particle.maxLife;
                particle.color.multiplyScalar(lifeRatio);
            }
        }
    }

    updateSpawning(deltaTime) {
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.attemptSpawning();
        }
    }

    attemptSpawning() {
        if (this.entities.length >= this.maxEntities) return;
        
        const playerPos = this.game.camera.position;
        const isDay = this.game.timeOfDay > 0 && this.game.timeOfDay < 12000;
        
        // Try to spawn mobs around the player
        for (let attempts = 0; attempts < 10; attempts++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * this.mobSpawnRadius;
            
            const spawnX = Math.floor(playerPos.x + Math.cos(angle) * distance);
            const spawnZ = Math.floor(playerPos.z + Math.sin(angle) * distance);
            const spawnY = this.findValidSpawnHeight(spawnX, spawnZ);
            
            if (spawnY === null) continue;
            
            // Choose mob type based on conditions
            let mobTypes = isDay ? this.passiveMobs : [...this.passiveMobs, ...this.hostileMobs];
            
            // Filter by biome and current counts
            mobTypes = mobTypes.filter(mobData => {
                const currentCount = this.countMobsOfType(mobData.type);
                return currentCount < mobData.spawnCap && mobData.type.canSpawnAt(this.game, spawnX, spawnY, spawnZ);
            });
            
            if (mobTypes.length === 0) continue;
            
            // Weighted random selection
            const totalWeight = mobTypes.reduce((sum, mob) => sum + mob.weight, 0);
            let random = Math.random() * totalWeight;
            
            for (const mobData of mobTypes) {
                random -= mobData.weight;
                if (random <= 0) {
                    const mob = new mobData.type(this.game, spawnX, spawnY, spawnZ);
                    this.addEntity(mob);
                    break;
                }
            }
            
            break; // Only spawn one mob per attempt
        }
    }

    findValidSpawnHeight(x, z) {
        // Start from a reasonable height and search down
        for (let y = 80; y >= 30; y--) {
            const groundKey = `${x},${y-1},${z}`;
            const airKey1 = `${x},${y},${z}`;
            const airKey2 = `${x},${y+1},${z}`;
            
            // Check for solid ground and air space above
            if (this.game.blockData.has(groundKey) && 
                !this.game.blockData.has(airKey1) && 
                !this.game.blockData.has(airKey2)) {
                
                const groundType = this.game.blockData.get(groundKey);
                if (groundType !== 'water' && groundType !== 'lava') {
                    return y;
                }
            }
        }
        
        return null; // No valid spawn height found
    }

    countMobsOfType(mobType) {
        return this.entities.filter(entity => entity instanceof mobType).length;
    }

    addEntity(entity) {
        if (this.entities.length < this.maxEntities) {
            this.entities.push(entity);
        }
    }

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            entity.cleanup();
            this.entities.splice(index, 1);
        }
    }

    addParticle(particle) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(particle);
        }
    }

    updateParticleSystem() {
        if (this.particles.length === 0) {
            this.particleSystem.visible = false;
            return;
        }
        
        this.particleSystem.visible = true;
        
        // Update particle geometry
        const positions = new Float32Array(this.particles.length * 3);
        const colors = new Float32Array(this.particles.length * 3);
        const sizes = new Float32Array(this.particles.length);
        
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            const i3 = i * 3;
            
            positions[i3] = particle.position.x;
            positions[i3 + 1] = particle.position.y;
            positions[i3 + 2] = particle.position.z;
            
            colors[i3] = particle.color.r;
            colors[i3 + 1] = particle.color.g;
            colors[i3 + 2] = particle.color.b;
            
            sizes[i] = particle.size;
        }
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
    }

    // Entity interaction methods
    getEntitiesInRadius(position, radius) {
        return this.entities.filter(entity => {
            return entity.distanceTo(position) <= radius;
        });
    }

    getEntitiesOfType(type) {
        return this.entities.filter(entity => entity instanceof type);
    }

    getNearestEntityOfType(position, type, maxDistance = Infinity) {
        let nearest = null;
        let nearestDistance = maxDistance;
        
        for (const entity of this.entities) {
            if (entity instanceof type) {
                const distance = entity.distanceTo(position);
                if (distance < nearestDistance) {
                    nearest = entity;
                    nearestDistance = distance;
                }
            }
        }
        
        return nearest;
    }

    // Mob-specific methods
    feedMob(mob, item) {
        if (mob instanceof PassiveMob && mob.isBreedingItem(item)) {
            // Find another mob of the same type nearby
            const nearbyMobs = this.getEntitiesInRadius(mob.position, 5)
                .filter(entity => 
                    entity instanceof mob.constructor && 
                    entity !== mob && 
                    entity.canBreed()
                );
            
            if (nearbyMobs.length > 0) {
                const partner = nearbyMobs[0];
                return mob.breed(partner);
            }
        }
        
        return false;
    }

    shearSheep(sheep) {
        if (sheep instanceof Sheep && sheep.canShear()) {
            return sheep.shear();
        }
        return null;
    }

    milkCow(cow) {
        if (cow instanceof Cow && cow.canMilk()) {
            return cow.milk();
        }
        return null;
    }

    saddlePig(pig) {
        if (pig instanceof Pig && pig.canSaddle()) {
            pig.saddle();
            return true;
        }
        return false;
    }

    // Combat methods
    damageEntity(entity, damage, source = null) {
        if (entity && entity.takeDamage) {
            entity.takeDamage(damage, source);
            return true;
        }
        return false;
    }

    // Spawning control methods
    clearHostileMobs() {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity instanceof Mob && entity.isHostile) {
                this.removeEntity(entity);
            }
        }
    }

    clearAllMobs() {
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (entity instanceof Mob) {
                this.removeEntity(entity);
            }
        }
    }

    setMobSpawning(enabled) {
        this.spawnInterval = enabled ? 5 : Infinity;
    }

    // Cleanup
    cleanup() {
        // Remove all entities
        for (const entity of this.entities) {
            entity.cleanup();
        }
        this.entities.length = 0;
        
        // Clear particles
        this.particles.length = 0;
        
        // Remove particle system
        this.game.scene.remove(this.particleSystem);
    }
}

// =============================================================================
//  PROJECTILE ENTITIES
// =============================================================================

class Arrow extends Entity {
    constructor(game, x, y, z, target, damage = 2) {
        super(game, x, y, z);
        
        this.target = target.clone();
        this.damage = damage;
        this.speed = 20;
        this.gravity = -9.8;
        this.maxAge = 5; // seconds
        this.stuck = false;
        
        // Calculate initial velocity
        const direction = this.target.clone().sub(this.position).normalize();
        this.velocity = direction.multiplyScalar(this.speed);
        
        // Add some arc for realism
        this.velocity.y += 5;
    }

    createMesh() {
        const geometry = new THREE.ConeGeometry(0.02, 0.5, 6);
        const material = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Add fletching
        const fletchGeometry = new THREE.PlaneGeometry(0.1, 0.1);
        const fletchMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        for (let i = 0; i < 3; i++) {
            const fletch = new THREE.Mesh(fletchGeometry, fletchMaterial);
            fletch.position.set(0, 0, 0.2);
            fletch.rotation.y = (i / 3) * Math.PI * 2;
            this.mesh.add(fletch);
        }
    }

    update(deltaTime) {
        if (this.stuck) {
            this.age += deltaTime;
            if (this.age > this.maxAge) {
                this.isAlive = false;
            }
            return;
        }
        
        super.update(deltaTime);
        
        // Rotate to face velocity direction
        if (this.mesh && this.velocity.length() > 0) {
            const direction = this.velocity.clone().normalize();
            this.mesh.lookAt(this.position.clone().add(direction));
            this.mesh.rotateX(Math.PI / 2);
        }
        
        // Check for collisions with entities
        this.checkEntityCollisions();
        
        // Remove if too old
        if (this.age > this.maxAge) {
            this.isAlive = false;
        }
    }

    checkCollision(newPosition) {
        const collision = super.checkCollision(newPosition);
        
        if (collision) {
            this.stuck = true;
            this.velocity.set(0, 0, 0);
            return false; // Don't prevent movement, just stick
        }
        
        return false;
    }

    checkEntityCollisions() {
        const nearbyEntities = this.game.entityManager.getEntitiesInRadius(this.position, 1);
        
        for (const entity of nearbyEntities) {
            if (entity !== this && entity.isAlive && entity.takeDamage) {
                // Check if arrow intersects entity bounds
                if (this.position.distanceTo(entity.position) < 0.5) {
                    entity.takeDamage(this.damage, this);
                    this.isAlive = false;
                    break;
                }
            }
        }
    }

    onDeath() {
        // Chance to drop arrow item
        if (Math.random() < 0.5) {
            const arrowDrop = new ItemDrop(this.game, this.position.x, this.position.y, this.position.z, 'arrow');
            this.game.entityManager.addEntity(arrowDrop);
        }
    }
}

// =============================================================================
//  ITEM DROP ENTITY
// =============================================================================

class ItemDrop extends Entity {
    constructor(game, x, y, z, itemType, count = 1) {
        super(game, x, y, z);
        
        this.itemType = itemType;
        this.count = count;
        this.bobTimer = 0;
        this.pickupDelay = 0.5; // seconds before can be picked up
        this.despawnTime = 5 * 60; // 5 minutes
        this.magnetRange = 1.5; // Range at which item is attracted to player
        
        // Add some random velocity
        this.velocity.set(
            (Math.random() - 0.5) * 2,
            Math.random() * 2 + 1,
            (Math.random() - 0.5) * 2
        );
    }

    createMesh() {
        // Create a simple cube to represent the item
        const geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        
        // Get material based on item type
        let material;
        if (this.game.materials[this.itemType]) {
            material = this.game.materials[this.itemType];
        } else {
            // Create a material based on item type
            material = new THREE.MeshLambertMaterial({ 
                color: this.getItemColor(),
                map: this.game.textureGenerator.createItemTexture(this.itemType)
            });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }

    getItemColor() {
        const colors = {
            wood: 0x8B4513,
            coal: 0x2F2F2F,
            iron_ingot: 0xC0C0C0,
            diamond: 0x00FFFF,
            gold_ingot: 0xFFD700,
            bone: 0xF5F5DC,
            arrow: 0x8B4513,
            string: 0xF0F0F0,
            gunpowder: 0x404040,
            rotten_flesh: 0x8B4513,
            raw_beef: 0x8B0000,
            raw_pork: 0xFFB6C1,
            raw_chicken: 0xFFA500,
            raw_mutton: 0xDC143C,
            leather: 0x8B4513,
            wool_white: 0xFFFFFF,
            feather: 0xF0F0F0,
            egg: 0xF5F5DC
        };
        
        return colors[this.itemType] || 0xFFFFFF;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        this.pickupDelay -= deltaTime;
        
        // Bob up and down
        this.bobTimer += deltaTime * 3;
        if (this.mesh) {
            this.mesh.position.y = this.position.y + Math.sin(this.bobTimer) * 0.1;
            this.mesh.rotation.y += deltaTime * 2; // Rotate
        }
        
        // Attract to nearby player
        if (this.pickupDelay <= 0) {
            const playerPos = this.game.camera.position;
            const distance = this.distanceTo(playerPos);
            
            if (distance <= this.magnetRange) {
                // Move towards player
                const direction = playerPos.clone().sub(this.position).normalize();
                this.velocity.add(direction.multiplyScalar(deltaTime * 10));
                
                // Pick up if very close
                if (distance < 0.5) {
                    this.pickup();
                }
            }
        }
        
        // Despawn after time limit
        if (this.age > this.despawnTime) {
            this.isAlive = false;
        }
    }

    pickup() {
        // Add to player inventory
        if (this.game.player.addToInventory(this.itemType, this.count)) {
            this.game.audio.playSound('item_pickup');
            this.isAlive = false;
            
            // Create pickup particles
            for (let i = 0; i < 3; i++) {
                const particle = {
                    position: this.position.clone(),
                    velocity: new THREE.Vector3(0, 2, 0),
                    color: new THREE.Color(1, 1, 0.5),
                    life: 0.5,
                    maxLife: 0.5,
                    size: 0.1
                };
                
                this.game.entityManager.addParticle(particle);
            }
        }
    }

    getSize() {
        return new THREE.Vector3(0.25, 0.25, 0.25);
    }
}