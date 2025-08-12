// =============================================================================
//  PASSIVE MOBS
// =============================================================================

class PassiveMob extends Mob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.isHostile = false;
        this.spawnTime = 'any';
        this.spawnLight = null; // Can spawn in any light
        
        // Breeding properties
        this.breedingItem = null;
        this.breedingCooldown = 5 * 60 * 1000; // 5 minutes
        this.lastBred = 0;
        this.isChild = false;
        this.growthTime = 20 * 60 * 1000; // 20 minutes to grow up
        this.birthTime = Date.now();
        
        // Following behavior
        this.isFollowing = false;
        this.followTarget = null;
        this.followDistance = 10;
        
        // Grazing behavior
        this.grazingTimer = 0;
        this.grazingInterval = 30; // seconds
    }

    updateAI(deltaTime) {
        // Skip most AI if this is a child
        if (this.isChild) {
            this.updateChildAI(deltaTime);
            return;
        }
        
        this.grazingTimer += deltaTime;
        
        // Check for breeding items in player's hand
        const player = this.findNearestPlayer();
        if (player && this.canBreed() && this.isBreedingItem(player.getHeldItem())) {
            this.followTarget = player;
            this.isFollowing = true;
        } else {
            this.isFollowing = false;
            this.followTarget = null;
        }
        
        if (this.isFollowing && this.followTarget) {
            this.updateFollowingAI(deltaTime);
        } else {
            // Normal passive AI
            switch (this.aiState) {
                case 'idle':
                    this.updateIdleAI(deltaTime, player);
                    break;
                case 'wandering':
                    this.updateWanderingAI(deltaTime, player);
                    break;
                case 'grazing':
                    this.updateGrazingAI(deltaTime);
                    break;
                case 'fleeing':
                    this.updateFleeingAI(deltaTime, player);
                    break;
            }
        }
        
        // Random grazing
        if (this.grazingTimer > this.grazingInterval && Math.random() < 0.3) {
            this.startGrazing();
        }
    }

    updateChildAI(deltaTime) {
        // Check if grown up
        if (Date.now() - this.birthTime > this.growthTime) {
            this.becomeAdult();
        }
        
        // Children follow their parents or wander nearby
        if (this.aiTimer > 2) {
            this.startWandering();
        }
    }

    updateFollowingAI(deltaTime) {
        if (!this.followTarget) {
            this.isFollowing = false;
            this.aiState = 'idle';
            return;
        }
        
        const distance = this.distanceTo(this.followTarget.camera.position);
        
        if (distance > this.followDistance) {
            // Too far, stop following
            this.isFollowing = false;
            this.followTarget = null;
            this.aiState = 'idle';
        } else if (distance > 2) {
            // Follow the target
            const direction = this.findPathTo(this.followTarget.camera.position);
            this.moveTo(direction, this.speed);
        } else {
            // Close enough, stop moving
            this.velocity.x = 0;
            this.velocity.z = 0;
            
            // Face the target
            const direction = this.followTarget.camera.position.clone().sub(this.position);
            direction.y = 0;
            direction.normalize();
            this.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }

    updateGrazingAI(deltaTime) {
        // Stay still and "eat"
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        if (this.aiTimer > 3) {
            this.aiState = 'idle';
            this.aiTimer = 0;
        }
    }

    startGrazing() {
        this.aiState = 'grazing';
        this.aiTimer = 0;
        this.grazingTimer = 0;
        
        // Create eating particles
        this.createEatingParticles();
    }

    createEatingParticles() {
        for (let i = 0; i < 5; i++) {
            const particle = {
                position: this.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 1 + 0.5,
                    (Math.random() - 0.5) * 1
                ),
                color: new THREE.Color(0.2, 0.8, 0.2),
                life: 1.0,
                maxLife: 1.0,
                size: 0.05
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    shouldTargetPlayer(player) {
        return false; // Passive mobs don't target players
    }

    takeDamage(amount, source = null) {
        super.takeDamage(amount, source);
        
        // Flee when damaged
        if (this.isAlive && source && source.position) {
            this.aiState = 'fleeing';
            this.aiTimer = 0;
        }
    }

    canBreed() {
        return !this.isChild && Date.now() - this.lastBred > this.breedingCooldown;
    }

    isBreedingItem(item) {
        return item === this.breedingItem;
    }

    breed(partner) {
        if (!this.canBreed() || !partner.canBreed()) return false;
        
        // Create baby
        const babyX = (this.position.x + partner.position.x) / 2;
        const babyY = this.position.y;
        const babyZ = (this.position.z + partner.position.z) / 2;
        
        const baby = new this.constructor(this.game, babyX, babyY, babyZ);
        baby.isChild = true;
        baby.birthTime = Date.now();
        
        // Scale down baby
        if (baby.mesh) {
            baby.mesh.scale.set(0.5, 0.5, 0.5);
        }
        
        this.game.entityManager.addEntity(baby);
        
        // Set breeding cooldown
        this.lastBred = Date.now();
        partner.lastBred = Date.now();
        
        // Create heart particles
        this.createBreedingParticles();
        partner.createBreedingParticles();
        
        return true;
    }

    becomeAdult() {
        this.isChild = false;
        if (this.mesh) {
            this.mesh.scale.set(1, 1, 1);
        }
    }

    createBreedingParticles() {
        for (let i = 0; i < 8; i++) {
            const particle = {
                position: this.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 2
                ),
                color: new THREE.Color(1, 0.7, 0.8), // Pink/red hearts
                life: 2.0,
                maxLife: 2.0,
                size: 0.15
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    // Override wandering to stay closer to spawn
    startWandering() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * 3; // Smaller wander distance
        
        this.wanderTarget = new THREE.Vector3(
            this.position.x + Math.cos(angle) * distance,
            this.position.y,
            this.position.z + Math.sin(angle) * distance
        );
        
        this.aiState = 'wandering';
        this.aiTimer = 0;
    }
}

// =============================================================================
//  SPECIFIC PASSIVE MOB TYPES
// =============================================================================

class Cow extends PassiveMob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 10;
        this.maxHealth = 10;
        this.speed = 1.2;
        this.breedingItem = 'wheat';
        
        this.drops = [
            { item: 'raw_beef', chance: 1.0, min: 1, max: 3 },
            { item: 'leather', chance: 1.0, min: 0, max: 2 }
        ];
        
        this.milkCooldown = 0;
        this.milkInterval = 60000; // 1 minute
    }

    createMesh() {
        // Create cow body
        const bodyGeometry = new THREE.BoxGeometry(1.4, 1.3, 0.9);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            map: this.game.textureGenerator.createCowTexture()
        });
        
        this.mesh = new THREE.Mesh(bodyGeometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add legs
        const legGeometry = new THREE.BoxGeometry(0.25, 1.0, 0.25);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
        
        const legPositions = [
            [-0.4, -1.0, -0.3],
            [0.4, -1.0, -0.3],
            [-0.4, -1.0, 0.3],
            [0.4, -1.0, 0.3]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            this.mesh.add(leg);
        });
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.6);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 0.8, -0.8);
        this.mesh.add(head);
        
        // Add horns
        const hornGeometry = new THREE.ConeGeometry(0.05, 0.3, 6);
        const hornMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const leftHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        leftHorn.position.set(-0.2, 1.3, -0.8);
        this.mesh.add(leftHorn);
        
        const rightHorn = new THREE.Mesh(hornGeometry, hornMaterial);
        rightHorn.position.set(0.2, 1.3, -0.8);
        this.mesh.add(rightHorn);
    }

    canMilk() {
        return !this.isChild && Date.now() - this.milkCooldown > this.milkInterval;
    }

    milk() {
        if (this.canMilk()) {
            this.milkCooldown = Date.now();
            return 'milk_bucket';
        }
        return null;
    }

    getSize() {
        return new THREE.Vector3(1.4, 2.3, 0.9);
    }
}

class Pig extends PassiveMob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 10;
        this.maxHealth = 10;
        this.speed = 1.2;
        this.breedingItem = 'carrot';
        
        this.drops = [
            { item: 'raw_pork', chance: 1.0, min: 1, max: 3 }
        ];
        
        this.isSaddled = false;
        this.rider = null;
    }

    createMesh() {
        const bodyGeometry = new THREE.BoxGeometry(0.9, 0.9, 1.3);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xffc0cb,
            map: this.game.textureGenerator.createPigTexture()
        });
        
        this.mesh = new THREE.Mesh(bodyGeometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add legs
        const legGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0xffa0ab });
        
        const legPositions = [
            [-0.3, -0.8, -0.5],
            [0.3, -0.8, -0.5],
            [-0.3, -0.8, 0.5],
            [0.3, -0.8, 0.5]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            this.mesh.add(leg);
        });
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 0.3, -0.9);
        this.mesh.add(head);
        
        // Add snout
        const snoutGeometry = new THREE.BoxGeometry(0.4, 0.3, 0.2);
        const snout = new THREE.Mesh(snoutGeometry, new THREE.MeshLambertMaterial({ color: 0xff9999 }));
        snout.position.set(0, 0.3, -1.2);
        this.mesh.add(snout);
    }

    canSaddle() {
        return !this.isChild && !this.isSaddled;
    }

    saddle() {
        if (this.canSaddle()) {
            this.isSaddled = true;
            // Add saddle visual
            const saddleGeometry = new THREE.BoxGeometry(0.8, 0.1, 1.0);
            const saddleMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
            const saddle = new THREE.Mesh(saddleGeometry, saddleMaterial);
            saddle.position.set(0, 0.5, 0);
            this.mesh.add(saddle);
        }
    }

    getSize() {
        return new THREE.Vector3(0.9, 1.6, 1.3);
    }
}

class Sheep extends PassiveMob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 8;
        this.maxHealth = 8;
        this.speed = 1.2;
        this.breedingItem = 'wheat';
        
        this.hasWool = true;
        this.woolColor = 'white';
        this.regrowWoolTime = 60000; // 1 minute
        this.lastSheared = 0;
        
        this.drops = [
            { item: 'raw_mutton', chance: 1.0, min: 1, max: 2 }
        ];
        
        if (this.hasWool) {
            this.drops.push({ item: 'wool_' + this.woolColor, chance: 1.0, min: 1, max: 3 });
        }
    }

    createMesh() {
        const bodyGeometry = new THREE.BoxGeometry(0.9, 1.3, 1.3);
        let material;
        
        if (this.hasWool) {
            material = new THREE.MeshLambertMaterial({ 
                color: this.getWoolColor(),
                map: this.game.textureGenerator.createSheepWoolTexture(this.woolColor)
            });
        } else {
            material = new THREE.MeshLambertMaterial({ 
                color: 0xd4af8c,
                map: this.game.textureGenerator.createSheepSkinTexture()
            });
        }
        
        this.mesh = new THREE.Mesh(bodyGeometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add legs
        const legGeometry = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const legPositions = [
            [-0.3, -0.9, -0.5],
            [0.3, -0.9, -0.5],
            [-0.3, -0.9, 0.5],
            [0.3, -0.9, 0.5]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            this.mesh.add(leg);
        });
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.6, 0.7, 0.8);
        const headMaterial = this.hasWool ? material : new THREE.MeshLambertMaterial({ color: 0xd4af8c });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.8, -0.8);
        this.mesh.add(head);
    }

    getWoolColor() {
        const colors = {
            white: 0xffffff,
            black: 0x1e1e1e,
            gray: 0x808080,
            brown: 0x8b4513,
            pink: 0xffc0cb
        };
        return colors[this.woolColor] || colors.white;
    }

    canShear() {
        return this.hasWool && !this.isChild;
    }

    shear() {
        if (this.canShear()) {
            this.hasWool = false;
            this.lastSheared = Date.now();
            
            // Update appearance
            this.createMesh();
            if (this.mesh) {
                this.game.scene.remove(this.mesh);
                this.game.scene.add(this.mesh);
            }
            
            // Return wool
            const woolCount = 1 + Math.floor(Math.random() * 3);
            return { item: 'wool_' + this.woolColor, count: woolCount };
        }
        return null;
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Regrow wool
        if (!this.hasWool && Date.now() - this.lastSheared > this.regrowWoolTime) {
            this.hasWool = true;
            this.createMesh();
            if (this.mesh) {
                this.game.scene.remove(this.mesh);
                this.game.scene.add(this.mesh);
            }
        }
    }

    getSize() {
        return new THREE.Vector3(0.9, this.hasWool ? 2.1 : 1.6, 1.3);
    }
}

class Chicken extends PassiveMob {
    constructor(game, x, y, z) {
        super(game, x, y, z);
        
        this.health = 4;
        this.maxHealth = 4;
        this.speed = 1.0;
        this.breedingItem = 'seeds';
        
        this.lastEggLaid = 0;
        this.eggInterval = 5 * 60 * 1000; // 5-10 minutes
        this.canFly = true;
        this.flapTimer = 0;
        
        this.drops = [
            { item: 'raw_chicken', chance: 1.0, min: 1, max: 1 },
            { item: 'feather', chance: 1.0, min: 0, max: 2 }
        ];
    }

    createMesh() {
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.7, 0.6);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0xffffff,
            map: this.game.textureGenerator.createChickenTexture()
        });
        
        this.mesh = new THREE.Mesh(bodyGeometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add legs
        const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, -0.6, 0);
        this.mesh.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, -0.6, 0);
        this.mesh.add(rightLeg);
        
        // Add head
        const headGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.3);
        const head = new THREE.Mesh(headGeometry, material);
        head.position.set(0, 0.7, -0.2);
        this.mesh.add(head);
        
        // Add beak
        const beakGeometry = new THREE.ConeGeometry(0.05, 0.2, 4);
        const beakMaterial = new THREE.MeshLambertMaterial({ color: 0xffa500 });
        const beak = new THREE.Mesh(beakGeometry, beakMaterial);
        beak.position.set(0, 0.7, -0.4);
        beak.rotation.x = Math.PI / 2;
        this.mesh.add(beak);
        
        // Add wings
        const wingGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.4);
        const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.25, 0.2, 0);
        this.mesh.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.25, 0.2, 0);
        this.mesh.add(rightWing);
    }

    update(deltaTime) {
        super.update(deltaTime);
        
        // Lay eggs periodically
        if (!this.isChild && Date.now() - this.lastEggLaid > this.eggInterval + Math.random() * this.eggInterval) {
            this.layEgg();
        }
        
        // Flap wings when falling
        if (this.velocity.y < -1) {
            this.flapWings();
        }
    }

    updatePhysics(deltaTime) {
        // Slow falling (chickens flap their wings)
        if (this.velocity.y < 0 && this.canFly) {
            this.velocity.y *= 0.85; // Reduce fall speed
        }
        
        super.updatePhysics(deltaTime);
    }

    layEgg() {
        this.lastEggLaid = Date.now();
        
        // Create egg item drop
        const egg = new ItemDrop(
            this.game,
            this.position.x,
            this.position.y,
            this.position.z,
            'egg'
        );
        
        this.game.entityManager.addEntity(egg);
        
        // Create particles
        for (let i = 0; i < 5; i++) {
            const particle = {
                position: this.position.clone(),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 0.5,
                    (Math.random() - 0.5) * 1
                ),
                color: new THREE.Color(1, 1, 0.8),
                life: 1.0,
                maxLife: 1.0,
                size: 0.05
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    flapWings() {
        this.flapTimer += 0.1;
        
        // Animate wings
        if (this.mesh && this.mesh.children.length >= 6) {
            const leftWing = this.mesh.children[4];
            const rightWing = this.mesh.children[5];
            
            const flapAngle = Math.sin(this.flapTimer * 20) * 0.3;
            leftWing.rotation.z = flapAngle;
            rightWing.rotation.z = -flapAngle;
        }
    }

    getSize() {
        return new THREE.Vector3(0.4, 1.2, 0.6);
    }
}