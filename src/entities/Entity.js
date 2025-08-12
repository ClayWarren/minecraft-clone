// =============================================================================
//  BASE ENTITY CLASS
// =============================================================================

class Entity {
    constructor(game, x, y, z) {
        this.game = game;
        this.position = new THREE.Vector3(x, y, z);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        // Entity properties
        this.health = 20;
        this.maxHealth = 20;
        this.isAlive = true;
        this.age = 0;
        
        // Physics properties
        this.bounds = new THREE.Box3();
        this.onGround = false;
        this.gravity = -9.8;
        this.friction = 0.8;
        
        // Visual representation
        this.mesh = null;
        this.hitbox = null;
        
        // AI properties
        this.target = null;
        this.pathfinding = null;
        this.lastPathUpdate = 0;
        
        this.createMesh();
        if (this.mesh) {
            this.game.scene.add(this.mesh);
        }
    }

    createMesh() {
        // Override in subclasses
    }

    update(deltaTime) {
        if (!this.isAlive) return;
        
        this.age += deltaTime;
        
        // Update AI
        this.updateAI(deltaTime);
        
        // Apply physics
        this.updatePhysics(deltaTime);
        
        // Update visual representation
        this.updateMesh();
        
        // Update bounds
        this.updateBounds();
    }

    updateAI(deltaTime) {
        // Override in subclasses
    }

    updatePhysics(deltaTime) {
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.z *= this.friction;
        
        // Update position
        const movement = this.velocity.clone().multiplyScalar(deltaTime);
        
        // Check collisions
        const newPosition = this.position.clone().add(movement);
        if (this.checkCollision(newPosition)) {
            // Handle collision
            this.onCollision();
        } else {
            this.position.copy(newPosition);
        }
        
        // Check ground
        this.checkGround();
    }

    checkCollision(newPosition) {
        // Simple AABB collision with blocks
        const bounds = this.bounds.clone();
        bounds.translate(newPosition.clone().sub(this.position));
        
        // Check against world blocks
        for (let x = Math.floor(bounds.min.x); x <= Math.ceil(bounds.max.x); x++) {
            for (let y = Math.floor(bounds.min.y); y <= Math.ceil(bounds.max.y); y++) {
                for (let z = Math.floor(bounds.min.z); z <= Math.ceil(bounds.max.z); z++) {
                    const blockKey = `${x},${y},${z}`;
                    if (this.game.blockData.has(blockKey)) {
                        const blockType = this.game.blockData.get(blockKey);
                        if (blockType !== 'water' && blockType !== 'air') {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }

    checkGround() {
        const groundCheck = this.position.clone();
        groundCheck.y -= 0.1;
        
        const x = Math.floor(groundCheck.x);
        const y = Math.floor(groundCheck.y);
        const z = Math.floor(groundCheck.z);
        const blockKey = `${x},${y},${z}`;
        
        this.onGround = this.game.blockData.has(blockKey) && 
                       this.game.blockData.get(blockKey) !== 'water' && 
                       this.game.blockData.get(blockKey) !== 'air';
        
        if (this.onGround && this.velocity.y < 0) {
            this.velocity.y = 0;
        }
    }

    onCollision() {
        // Stop movement on collision
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        if (this.velocity.y < 0) {
            this.velocity.y = 0;
        }
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }

    updateBounds() {
        const size = this.getSize();
        this.bounds.setFromCenterAndSize(this.position, size);
    }

    getSize() {
        return new THREE.Vector3(0.6, 1.8, 0.6); // Default size
    }

    takeDamage(amount, source = null) {
        if (!this.isAlive) return;
        
        this.health -= amount;
        
        // Create damage particles
        this.createDamageParticles();
        
        if (this.health <= 0) {
            this.die();
        }
        
        // Knockback effect
        if (source && source.position) {
            const knockback = this.position.clone().sub(source.position).normalize().multiplyScalar(2);
            this.velocity.add(knockback);
        }
    }

    die() {
        this.isAlive = false;
        this.onDeath();
        
        // Create death particles
        this.createDeathParticles();
        
        // Remove from scene
        if (this.mesh) {
            this.game.scene.remove(this.mesh);
        }
        
        // Drop items
        this.dropItems();
    }

    onDeath() {
        // Override in subclasses
    }

    dropItems() {
        // Override in subclasses
    }

    createDamageParticles() {
        // Create red damage particles
        for (let i = 0; i < 5; i++) {
            const particle = {
                position: this.position.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 0.5,
                        Math.random() * 1.5,
                        (Math.random() - 0.5) * 0.5
                    )
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 2
                ),
                color: new THREE.Color(1, 0, 0),
                life: 1.0,
                maxLife: 1.0,
                size: 0.1
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    createDeathParticles() {
        // Create death explosion particles
        for (let i = 0; i < 20; i++) {
            const particle = {
                position: this.position.clone().add(
                    new THREE.Vector3(
                        (Math.random() - 0.5) * 1.0,
                        Math.random() * 1.5,
                        (Math.random() - 0.5) * 1.0
                    )
                ),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 4,
                    Math.random() * 3 + 1,
                    (Math.random() - 0.5) * 4
                ),
                color: new THREE.Color(0.5, 0.5, 0.5),
                life: 2.0,
                maxLife: 2.0,
                size: 0.05
            };
            
            this.game.entityManager.addParticle(particle);
        }
    }

    // Pathfinding helpers
    findPathTo(target) {
        // Simple pathfinding - just move towards target
        const direction = target.clone().sub(this.position);
        direction.y = 0; // Don't pathfind vertically
        direction.normalize();
        
        return direction;
    }

    canSee(target) {
        // Raycast to check line of sight
        const direction = target.clone().sub(this.position).normalize();
        const distance = this.position.distanceTo(target);
        
        // Check for blocks in the way
        for (let d = 0; d < distance; d += 0.5) {
            const checkPos = this.position.clone().add(direction.clone().multiplyScalar(d));
            const x = Math.floor(checkPos.x);
            const y = Math.floor(checkPos.y + 1); // Check at eye level
            const z = Math.floor(checkPos.z);
            const blockKey = `${x},${y},${z}`;
            
            if (this.game.blockData.has(blockKey)) {
                const blockType = this.game.blockData.get(blockKey);
                if (blockType !== 'water' && blockType !== 'air') {
                    return false;
                }
            }
        }
        
        return true;
    }

    jump() {
        if (this.onGround) {
            this.velocity.y = 5;
        }
    }

    moveTo(direction, speed = 2) {
        if (direction.length() > 0) {
            direction.normalize();
            this.velocity.x = direction.x * speed;
            this.velocity.z = direction.z * speed;
            
            // Face movement direction
            this.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }

    distanceTo(target) {
        return this.position.distanceTo(target);
    }

    cleanup() {
        if (this.mesh) {
            this.game.scene.remove(this.mesh);
        }
    }
}