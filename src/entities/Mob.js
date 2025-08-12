// =============================================================================
//  MOB BASE CLASS
// =============================================================================

class Mob extends Entity {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        // Mob-specific properties
        this.isHostile = false;
        this.attackDamage = 1;
        this.attackRange = 1.5;
        this.detectionRange = 8;
        this.lastAttack = 0;
        this.attackCooldown = 1000; // ms
        
        // AI states
        this.aiState = 'idle'; // idle, wandering, chasing, attacking, fleeing
        this.aiTimer = 0;
        this.wanderTarget = null;
        this.lastPlayerSeen = 0;
        
        // Movement properties
        this.speed = 2;
        this.jumpHeight = 5;
        
        // Spawning properties
        this.spawnBiome = null;
        this.spawnTime = null; // 'day', 'night', 'any'
        this.spawnLight = null; // light level requirements
        
        // Drops
        this.drops = [];
        this.experienceValue = 1;
    }

    updateAI(deltaTime) {
        this.aiTimer += deltaTime;
        
        // Find nearest player
        const player = this.findNearestPlayer();
        
        switch (this.aiState) {
            case 'idle':
                this.updateIdleAI(deltaTime, player);
                break;
            case 'wandering':
                this.updateWanderingAI(deltaTime, player);
                break;
            case 'chasing':
                this.updateChasingAI(deltaTime, player);
                break;
            case 'attacking':
                this.updateAttackingAI(deltaTime, player);
                break;
            case 'fleeing':
                this.updateFleeingAI(deltaTime, player);
                break;
        }
    }

    updateIdleAI(deltaTime, player) {
        // Check for player detection
        if (player && this.shouldTargetPlayer(player)) {
            this.target = player;
            this.aiState = 'chasing';
            this.lastPlayerSeen = Date.now();
            return;
        }
        
        // Random chance to start wandering
        if (this.aiTimer > 3 && Math.random() < 0.3) {
            this.startWandering();
        }
    }

    updateWanderingAI(deltaTime, player) {
        // Check for player detection
        if (player && this.shouldTargetPlayer(player)) {
            this.target = player;
            this.aiState = 'chasing';
            this.lastPlayerSeen = Date.now();
            return;
        }
        
        // Move towards wander target
        if (this.wanderTarget) {
            const direction = this.findPathTo(this.wanderTarget);
            
            if (this.distanceTo(this.wanderTarget) < 1) {
                // Reached target, go idle
                this.aiState = 'idle';
                this.wanderTarget = null;
                this.aiTimer = 0;
            } else {
                this.moveTo(direction, this.speed * 0.5);
            }
        } else {
            this.startWandering();
        }
        
        // Timeout wandering
        if (this.aiTimer > 10) {
            this.aiState = 'idle';
            this.wanderTarget = null;
            this.aiTimer = 0;
        }
    }

    updateChasingAI(deltaTime, player) {
        if (!player || !this.shouldTargetPlayer(player)) {
            // Lost target
            this.target = null;
            this.aiState = 'idle';
            this.aiTimer = 0;
            return;
        }
        
        const distance = this.distanceTo(player.camera.position);
        
        if (distance <= this.attackRange) {
            // Close enough to attack
            this.aiState = 'attacking';
            this.aiTimer = 0;
        } else {
            // Chase the player
            const direction = this.findPathTo(player.camera.position);
            this.moveTo(direction, this.speed);
            
            // Jump if stuck
            if (this.velocity.x === 0 && this.velocity.z === 0 && this.onGround) {
                this.jump();
            }
        }
        
        this.lastPlayerSeen = Date.now();
    }

    updateAttackingAI(deltaTime, player) {
        if (!player || !this.shouldTargetPlayer(player)) {
            this.target = null;
            this.aiState = 'idle';
            return;
        }
        
        const distance = this.distanceTo(player.camera.position);
        
        if (distance > this.attackRange * 1.5) {
            // Player moved away, chase again
            this.aiState = 'chasing';
            return;
        }
        
        // Face the player
        const direction = player.camera.position.clone().sub(this.position);
        direction.y = 0;
        direction.normalize();
        this.rotation.y = Math.atan2(direction.x, direction.z);
        
        // Attack if cooldown is ready
        const now = Date.now();
        if (now - this.lastAttack > this.attackCooldown) {
            this.attack(player);
            this.lastAttack = now;
        }
    }

    updateFleeingAI(deltaTime, player) {
        if (player) {
            // Run away from player
            const direction = this.position.clone().sub(player.camera.position);
            direction.y = 0;
            direction.normalize();
            this.moveTo(direction, this.speed * 1.5);
        }
        
        // Stop fleeing after some time
        if (this.aiTimer > 5) {
            this.aiState = 'idle';
            this.aiTimer = 0;
        }
    }

    startWandering() {
        // Pick a random point nearby to wander to
        const angle = Math.random() * Math.PI * 2;
        const distance = 3 + Math.random() * 5;
        
        this.wanderTarget = new THREE.Vector3(
            this.position.x + Math.cos(angle) * distance,
            this.position.y,
            this.position.z + Math.sin(angle) * distance
        );
        
        this.aiState = 'wandering';
        this.aiTimer = 0;
    }

    shouldTargetPlayer(player) {
        if (!this.isHostile) return false;
        
        const distance = this.distanceTo(player.camera.position);
        if (distance > this.detectionRange) return false;
        
        // Check if player is in line of sight
        return this.canSee(player.camera.position);
    }

    findNearestPlayer() {
        // In single player, just return the main player
        const playerPos = this.game.camera.position;
        const distance = this.distanceTo(playerPos);
        
        if (distance <= this.detectionRange * 2) {
            return this.game.player;
        }
        
        return null;
    }

    attack(target) {
        // Create attack animation/effect
        this.createAttackEffect();
        
        // Deal damage to target
        if (target && target.takeDamage) {
            target.takeDamage(this.attackDamage, this);
        }
        
        // Play attack sound
        this.game.audio.playSound('mob_attack');
    }

    createAttackEffect() {
        // Create attack particles
        const direction = this.target ? 
            this.target.camera.position.clone().sub(this.position).normalize() :
            new THREE.Vector3(1, 0, 0);
        
        for (let i = 0; i < 3; i++) {
            const particle = {
                position: this.position.clone().add(new THREE.Vector3(0, 1, 0)),
                velocity: direction.clone().multiplyScalar(3).add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 1,
                        Math.random() * 1,
                        (Math.random() - 0.5) * 1
                    )
                ),
                color: new THREE.Color(1, 1, 0.5),
                life: 0.5,
                maxLife: 0.5,
                size: 0.1
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    onDeath() {
        super.onDeath();
        
        // Give player experience
        if (this.game.player) {
            this.game.player.addExperience(this.experienceValue);
        }
        
        // Play death sound
        this.game.audio.playSound('mob_death');
    }

    dropItems() {
        // Drop items based on mob type
        this.drops.forEach(drop => {
            if (Math.random() < drop.chance) {
                const quantity = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
                
                for (let i = 0; i < quantity; i++) {
                    this.createItemDrop(drop.item);
                }
            }
        });
    }

    createItemDrop(itemType) {
        // Create a dropped item entity
        const dropPosition = this.position.clone().add(
            new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                1,
                (Math.random() - 0.5) * 2
            )
        );
        
        const itemDrop = new ItemDrop(this.game, dropPosition.x, dropPosition.y, dropPosition.z, itemType);
        this.game.entityManager.addEntity(itemDrop);
    }

    // Spawning conditions
    static canSpawnAt(game, x, y, z) {
        // Check biome requirements
        const biome = game.worldGenerator.getBiome(x, z);
        if (this.spawnBiome && this.spawnBiome !== biome) {
            return false;
        }
        
        // Check time requirements
        if (this.spawnTime) {
            const isDay = game.timeOfDay > 0 && game.timeOfDay < 12000;
            if (this.spawnTime === 'day' && !isDay) return false;
            if (this.spawnTime === 'night' && isDay) return false;
        }
        
        // Check light level requirements
        if (this.spawnLight !== null) {
            const lightLevel = game.getLightLevel(x, y, z);
            if (lightLevel > this.spawnLight) return false;
        }
        
        // Check for solid ground
        const groundKey = `${x},${y-1},${z}`;
        if (!game.blockData.has(groundKey)) return false;
        
        // Check for air space
        const airKey = `${x},${y},${z}`;
        const airKey2 = `${x},${y+1},${z}`;
        if (game.blockData.has(airKey) || game.blockData.has(airKey2)) return false;
        
        return true;
    }
}

// =============================================================================
//  HOSTILE MOBS
// =============================================================================

class Zombie extends Mob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 20;
        this.maxHealth = 20;
        this.isHostile = true;
        this.attackDamage = 3;
        this.speed = 1.5;
        this.detectionRange = 10;
        
        this.spawnTime = 'night';
        this.spawnLight = 7;
        
        this.drops = [
            { item: 'rotten_flesh', chance: 1.0, min: 0, max: 2 },
            { item: 'iron_ingot', chance: 0.025, min: 1, max: 1 },
            { item: 'carrot', chance: 0.025, min: 1, max: 1 },
            { item: 'potato', chance: 0.025, min: 1, max: 1 }
        ];
    }

    createMesh() {
        // Create simple zombie model
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.3);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x4a7c59,
            map: this.game.textureGenerator.createZombieTexture()
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add arms
        const armGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3);
        const leftArm = new THREE.Mesh(armGeometry, material);
        leftArm.position.set(-0.45, 0, 0);
        this.mesh.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, material);
        rightArm.position.set(0.45, 0, 0);
        this.mesh.add(rightArm);
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 1.1, 0);
        this.mesh.add(head);
    }

    updateAI(deltaTime) {
        super.updateAI(deltaTime);
        
        // Zombies burn in sunlight
        const isDay = this.game.timeOfDay > 0 && this.game.timeOfDay < 12000;
        if (isDay && this.position.y > 50) { // Above ground
            this.takeDamage(1 * deltaTime);
            this.createBurnParticles();
        }
    }

    createBurnParticles() {
        const particle = {
            position: this.position.clone().add(new THREE.Vector3(0, 1, 0)),
            velocity: new THREE.Vector3(0, 2, 0),
            color: new THREE.Color(1, 0.5, 0),
            life: 1.0,
            maxLife: 1.0,
            size: 0.1
        };
        
        this.game.entityManager.addParticle(particle);
    }
}

class Skeleton extends Mob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 20;
        this.maxHealth = 20;
        this.isHostile = true;
        this.attackDamage = 2;
        this.speed = 2;
        this.detectionRange = 15;
        this.attackRange = 8; // Ranged attack
        
        this.spawnTime = 'night';
        this.spawnLight = 7;
        
        this.lastArrowShot = 0;
        this.arrowCooldown = 2000;
        
        this.drops = [
            { item: 'bone', chance: 1.0, min: 0, max: 2 },
            { item: 'arrow', chance: 1.0, min: 0, max: 2 },
            { item: 'bow', chance: 0.025, min: 1, max: 1 }
        ];
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(0.5, 1.8, 0.3);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xf0f0e0,
            map: this.game.textureGenerator.createSkeletonTexture()
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add bow
        const bowGeometry = new THREE.BoxGeometry(0.1, 1.0, 0.1);
        const bowMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const bow = new THREE.Mesh(bowGeometry, bowMaterial);
        bow.position.set(-0.4, 0.5, 0);
        this.mesh.add(bow);
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 1.1, 0);
        this.mesh.add(head);
    }

    attack(target) {
        const now = Date.now();
        if (now - this.lastArrowShot < this.arrowCooldown) return;
        
        // Shoot arrow
        this.shootArrow(target);
        this.lastArrowShot = now;
        
        this.game.audio.playSound('bow_shoot');
    }

    shootArrow(target) {
        const arrow = new Arrow(
            this.game,
            this.position.x,
            this.position.y + 1.5,
            this.position.z,
            target.camera.position.clone(),
            this.attackDamage
        );
        
        this.game.entityManager.addEntity(arrow);
    }
}

class Creeper extends Mob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 20;
        this.maxHealth = 20;
        this.isHostile = true;
        this.attackDamage = 0; // Damage from explosion
        this.speed = 1.2;
        this.detectionRange = 16;
        this.attackRange = 3;
        
        this.spawnTime = 'night';
        this.spawnLight = 7;
        
        this.fuseTime = 0;
        this.maxFuseTime = 1.5; // seconds
        this.isIgnited = false;
        this.explosionPower = 3;
        
        this.drops = [
            { item: 'gunpowder', chance: 1.0, min: 0, max: 2 }
        ];
    }

    createMesh() {
        const geometry = new THREE.BoxGeometry(0.6, 1.7, 0.6);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x0da70b,
            map: this.game.textureGenerator.createCreeperTexture()
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 1.1, 0);
        this.mesh.add(head);
    }

    updateAttackingAI(deltaTime, player) {
        if (!player) {
            this.aiState = 'idle';
            return;
        }
        
        const distance = this.distanceTo(player.camera.position);
        
        if (distance <= this.attackRange) {
            // Start ignition
            if (!this.isIgnited) {
                this.isIgnited = true;
                this.game.audio.playSound('creeper_fuse');
            }
            
            this.fuseTime += deltaTime;
            
            // Flash effect
            const flashIntensity = Math.sin(this.fuseTime * 20) * 0.5 + 0.5;
            if (this.mesh) {
                this.mesh.material.color.setRGB(
                    0.0 + flashIntensity * 0.8,
                    0.85 + flashIntensity * 0.15,
                    0.0 + flashIntensity * 0.8
                );
            }
            
            if (this.fuseTime >= this.maxFuseTime) {
                this.explode();
            }
        } else {
            // Player moved away, cancel explosion
            if (this.isIgnited) {
                this.isIgnited = false;
                this.fuseTime = 0;
                if (this.mesh) {
                    this.mesh.material.color.setHex(0x0da70b);
                }
            }
            this.aiState = 'chasing';
        }
    }

    explode() {
        // Create explosion effect
        this.createExplosionParticles();
        
        // Damage nearby entities and blocks
        this.damageNearbyEntities();
        this.destroyNearbyBlocks();
        
        // Play explosion sound
        this.game.audio.playSound('explosion');
        
        // Kill the creeper
        this.die();
    }

    createExplosionParticles() {
        for (let i = 0; i < 50; i++) {
            const particle = {
                position: this.position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 8 + 2,
                    (Math.random() - 0.5) * 10
                ),
                color: new THREE.Color(1, 0.5, 0),
                life: 2.0,
                maxLife: 2.0,
                size: 0.2
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    damageNearbyEntities() {
        const explosionRadius = this.explosionPower;
        
        // Damage player if in range
        const playerDistance = this.distanceTo(this.game.camera.position);
        if (playerDistance <= explosionRadius) {
            const damage = Math.max(1, this.explosionPower * 8 * (1 - playerDistance / explosionRadius));
            this.game.player.takeDamage(damage, this);
        }
        
        // Damage other entities
        this.game.entityManager.entities.forEach(entity => {
            if (entity !== this && entity.isAlive) {
                const distance = this.distanceTo(entity.position);
                if (distance <= explosionRadius) {
                    const damage = Math.max(1, this.explosionPower * 4 * (1 - distance / explosionRadius));
                    entity.takeDamage(damage, this);
                }
            }
        });
    }

    destroyNearbyBlocks() {
        const explosionRadius = this.explosionPower;
        
        for (let x = -explosionRadius; x <= explosionRadius; x++) {
            for (let y = -explosionRadius; y <= explosionRadius; y++) {
                for (let z = -explosionRadius; z <= explosionRadius; z++) {
                    const distance = Math.sqrt(x*x + y*y + z*z);
                    if (distance <= explosionRadius) {
                        const blockX = Math.floor(this.position.x + x);
                        const blockY = Math.floor(this.position.y + y);
                        const blockZ = Math.floor(this.position.z + z);
                        const blockKey = `${blockX},${blockY},${blockZ}`;
                        
                        if (this.game.blockData.has(blockKey)) {
                            const blockType = this.game.blockData.get(blockKey);
                            
                            // Don't destroy bedrock
                            if (blockType !== 'bedrock') {
                                // Chance to drop block based on distance
                                const dropChance = 1 - (distance / explosionRadius);
                                if (Math.random() < dropChance * 0.3) {
                                    this.createItemDrop(blockType);
                                }
                                
                                this.game.blockData.delete(blockKey);
                            }
                        }
                    }
                }
            }
        }
        
        // Regenerate affected chunks
        this.game.worldGenerator.regenerateChunksAround(this.position.x, this.position.z);
    }
}

class Spider extends Mob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 16;
        this.maxHealth = 16;
        this.isHostile = true; // Hostile at night, neutral during day
        this.attackDamage = 2;
        this.speed = 3;
        this.detectionRange = 16;
        
        this.spawnTime = 'night';
        this.spawnLight = 7;
        
        this.canClimbWalls = true;
        this.jumpHeight = 8;
        
        this.drops = [
            { item: 'string', chance: 1.0, min: 0, max: 2 },
            { item: 'spider_eye', chance: 0.33, min: 1, max: 1 }
        ];
    }

    createMesh() {
        // Create spider body
        const bodyGeometry = new THREE.BoxGeometry(1.4, 0.9, 0.9);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x342017,
            map: this.game.textureGenerator.createSpiderTexture()
        });
        
        this.mesh = new THREE.Mesh(bodyGeometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add legs
        const legGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2a1a0f });
        
        for (let i = 0; i < 8; i++) {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            const angle = (i / 8) * Math.PI * 2;
            const side = i < 4 ? -1 : 1;
            leg.position.set(
                Math.cos(angle) * 0.8,
                -0.3,
                Math.sin(angle) * 0.5 * side
            );
            leg.rotation.z = angle + (side * Math.PI * 0.2);
            this.mesh.add(leg);
        }
        
        // Add eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        
        for (let i = 0; i < 8; i++) {
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.set(
                0.65 + (i % 4) * 0.1 - 0.15,
                0.2 + Math.floor(i / 4) * 0.15 - 0.075,
                0.35 - Math.floor(i / 4) * 0.7
            );
            this.mesh.add(eye);
        }
    }

    shouldTargetPlayer(player) {
        // Only hostile at night or when attacked
        const isDay = this.game.timeOfDay > 0 && this.game.timeOfDay < 12000;
        if (isDay && this.health === this.maxHealth) {
            return false;
        }
        
        return super.shouldTargetPlayer(player);
    }

    updatePhysics(deltaTime) {
        super.updatePhysics(deltaTime);
        
        // Wall climbing ability
        if (this.canClimbWalls && this.aiState === 'chasing' && this.velocity.y === 0) {
            // Check if touching a wall
            const directions = [
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(-1, 0, 0),
                new THREE.Vector3(0, 0, 1),
                new THREE.Vector3(0, 0, -1)
            ];
            
            for (const dir of directions) {
                const checkPos = this.position.clone().add(dir);
                const blockKey = `${Math.floor(checkPos.x)},${Math.floor(checkPos.y)},${Math.floor(checkPos.z)}`;
                
                if (this.game.blockData.has(blockKey)) {
                    // Touching wall, climb up
                    this.velocity.y = 3;
                    break;
                }
            }
        }
    }

    getSize() {
        return new THREE.Vector3(1.4, 0.9, 0.9);
    }
}