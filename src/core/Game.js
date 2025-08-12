// =============================================================================
//  MINECRAFT CLONE - MAIN GAME CLASS
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
        
        // Initialize systems
        this.initializeSystems();
        
        // Initialize multiplayer if enabled
        if (this.isMultiplayer) {
            this.initMultiplayer();
        }
    }

    initializeSystems() {
        // Initialize all game systems
        this.textureGenerator = new TextureGenerator();
        this.materials = new MaterialManager(this.textureGenerator);
        this.physics = new Physics(this.blockData);
        this.worldGenerator = new WorldGenerator(this);
        this.player = new Player(this);
        this.crafting = new CraftingSystem(this);
        this.ui = new UIManager(this);
        this.audio = new AudioSystem();
        this.entityManager = new EntityManager(this);
        this.weatherSystem = new WeatherSystem(this);
        
        // Initialize time
        this.timeOfDay = 6000; // Start at dawn
        this.dayLength = 20 * 60 * 1000; // 20 minutes
        this.startTime = Date.now();
    }

    init() {
        // Renderer setup
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);

        // Initialize lighting
        this.initLighting();

        // Camera setup
        this.camera.position.set(0, 80, 0);
        this.scene.add(this.camera);

        // Initialize systems
        this.ui.init();
        this.setupEventListeners();
        
        if (!this.isMultiplayer) {
            this.worldGenerator.generateWorld();
        }
        
        // Start game loop
        this.clock = new THREE.Clock();
        this.animate();
    }

    initLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x909090, 0.6);
        this.scene.add(this.ambientLight);
        
        // Sun light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 50, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);

        // Moon light
        this.moonLight = new THREE.DirectionalLight(0x6666aa, 0.3);
        this.moonLight.position.set(-50, 30, -50);
        this.moonLight.castShadow = true;
        this.scene.add(this.moonLight);

        // Setup fog
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 300);
    }

    setupEventListeners() {
        // Pointer lock events
        document.addEventListener('click', () => {
            if (!this.controls.isLocked) {
                this.controls.lock();
            }
        });

        this.controls.addEventListener('lock', () => {
            console.log('Pointer locked');
        });

        this.controls.addEventListener('unlock', () => {
            console.log('Pointer unlocked');
        });

        // Input events
        this.keys = {};
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        document.addEventListener('mousedown', (event) => this.onMouseDown(event));
        document.addEventListener('mouseup', (event) => this.onMouseUp(event));
        document.addEventListener('wheel', (event) => this.onWheel(event));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onKeyDown(event) {
        this.keys[event.code] = true;
        
        // Number keys for hotbar
        if (event.code >= 'Digit1' && event.code <= 'Digit9') {
            const slot = parseInt(event.code.replace('Digit', '')) - 1;
            this.player.selectHotbarSlot(slot);
        }
        
        // Other key commands
        switch (event.code) {
            case 'KeyC':
                this.crafting.toggleCraftingMenu();
                break;
            case 'KeyE':
                this.ui.toggleInventory();
                break;
            case 'Escape':
                this.controls.unlock();
                break;
        }
    }

    onKeyUp(event) {
        this.keys[event.code] = false;
    }

    onMouseDown(event) {
        if (!this.controls.isLocked) return;
        
        if (event.button === 0) { // Left click
            this.player.startMining();
        } else if (event.button === 2) { // Right click
            this.player.placeBlock();
        }
    }

    onMouseUp(event) {
        if (event.button === 0) {
            this.player.stopMining();
        }
    }

    onWheel(event) {
        if (!this.controls.isLocked) return;
        
        event.preventDefault();
        const direction = event.deltaY > 0 ? 1 : -1;
        this.player.scrollHotbar(direction);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Update systems
        this.update(deltaTime);
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }

    update(deltaTime) {
        // Update time
        this.updateTimeOfDay();
        
        // Update systems
        this.player.update(deltaTime);
        this.entityManager.update(deltaTime);
        this.weatherSystem.update(deltaTime);
        this.worldGenerator.updateChunks();
        
        // Update multiplayer
        if (this.isMultiplayer) {
            this.updateMultiplayer();
        }
        
        // Update UI
        this.ui.update();
    }

    updateTimeOfDay() {
        const elapsed = Date.now() - this.startTime;
        this.timeOfDay = (6000 + (elapsed / this.dayLength) * 24000) % 24000;
        
        // Update lighting based on time
        const sunAngle = (this.timeOfDay / 24000) * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle);
        
        const isDay = sunHeight > 0;
        
        if (isDay) {
            // Day lighting
            const dayIntensity = Math.max(0.3, sunHeight);
            this.directionalLight.intensity = dayIntensity;
            this.moonLight.intensity = 0;
            this.ambientLight.intensity = Math.max(0.4, dayIntensity * 0.6);
            
            // Day colors
            const skyColor = new THREE.Color().lerpColors(
                new THREE.Color(0xff6644), // Sunrise/sunset
                new THREE.Color(0x87CEEB), // Noon
                Math.abs(sunHeight)
            );
            this.renderer.setClearColor(skyColor);
            this.scene.fog.color.copy(skyColor);
        } else {
            // Night lighting
            const nightIntensity = Math.abs(sunHeight) * 0.4;
            this.directionalLight.intensity = 0;
            this.moonLight.intensity = Math.max(0.1, nightIntensity);
            this.ambientLight.intensity = Math.max(0.1, nightIntensity * 0.3);
            
            // Night colors
            this.renderer.setClearColor(new THREE.Color(0.05, 0.05, 0.2));
            this.scene.fog.color.setHex(0x0a0a0a);
        }
        
        // Update sun/moon position
        this.directionalLight.position.set(
            Math.cos(sunAngle) * 100,
            Math.sin(sunAngle) * 100,
            50
        );
        
        this.moonLight.position.set(
            -Math.cos(sunAngle) * 100,
            -Math.sin(sunAngle) * 100,
            -50
        );
    }

    initMultiplayer() {
        this.ws = new WebSocket('ws://localhost:8080');
        
        this.ws.onopen = () => {
            console.log('Connected to server');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected from server');
        };
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'playerJoined':
                this.playerId = data.playerId;
                break;
            case 'worldData':
                this.loadWorldData(data.blocks);
                break;
            case 'playerUpdate':
                this.updateOtherPlayers(data.players);
                break;
            // Add more message handlers as needed
        }
    }

    updateMultiplayer() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        const now = Date.now();
        if (now - this.lastNetworkUpdate > 50) { // 20 FPS network updates
            this.sendPlayerUpdate();
            this.lastNetworkUpdate = now;
        }
    }

    sendPlayerUpdate() {
        const playerData = {
            type: 'playerUpdate',
            playerId: this.playerId,
            position: this.camera.position,
            rotation: this.camera.rotation
        };
        
        this.ws.send(JSON.stringify(playerData));
    }
}