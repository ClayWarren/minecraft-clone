// =============================================================================
//  AUDIO SYSTEM - PROCEDURAL SOUND GENERATION
// =============================================================================

class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.volume = 0.3;
        this.enabled = true;
        
        // Initialize audio context on user interaction
        this.initialized = false;
        
        // Generate sounds
        this.generateSounds();
    }

    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.warn('Audio not supported:', error);
            this.enabled = false;
        }
    }

    generateSounds() {
        // Pre-generate sound data for different types
        this.soundConfigs = {
            mob_attack: {
                type: 'noise',
                duration: 0.2,
                frequency: 200,
                volume: 0.4
            },
            mob_death: {
                type: 'decay',
                duration: 1.0,
                frequency: 150,
                volume: 0.5
            },
            bow_shoot: {
                type: 'twang',
                duration: 0.3,
                frequency: 400,
                volume: 0.3
            },
            creeper_fuse: {
                type: 'hiss',
                duration: 1.5,
                frequency: 300,
                volume: 0.4
            },
            explosion: {
                type: 'explosion',
                duration: 2.0,
                frequency: 100,
                volume: 0.8
            },
            item_pickup: {
                type: 'pop',
                duration: 0.2,
                frequency: 800,
                volume: 0.2
            },
            block_break: {
                type: 'crack',
                duration: 0.3,
                frequency: 250,
                volume: 0.3
            },
            block_place: {
                type: 'thud',
                duration: 0.2,
                frequency: 180,
                volume: 0.3
            },
            eat_food: {
                type: 'crunch',
                duration: 0.4,
                frequency: 500,
                volume: 0.2
            },
            furnace_complete: {
                type: 'ding',
                duration: 0.8,
                frequency: 800,
                volume: 0.3
            }
        };
    }

    playSound(soundName) {
        if (!this.enabled || !this.initialized) {
            this.init();
            if (!this.enabled) return;
        }

        const config = this.soundConfigs[soundName];
        if (!config) {
            console.warn(`Sound '${soundName}' not found`);
            return;
        }

        this.generateAndPlaySound(config);
    }

    generateAndPlaySound(config) {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = config.volume * this.volume;

        switch (config.type) {
            case 'noise':
                this.playNoiseSound(gainNode, config);
                break;
            case 'decay':
                this.playDecaySound(gainNode, config);
                break;
            case 'twang':
                this.playTwangSound(gainNode, config);
                break;
            case 'hiss':
                this.playHissSound(gainNode, config);
                break;
            case 'explosion':
                this.playExplosionSound(gainNode, config);
                break;
            case 'pop':
                this.playPopSound(gainNode, config);
                break;
            case 'crack':
                this.playCrackSound(gainNode, config);
                break;
            case 'thud':
                this.playThudSound(gainNode, config);
                break;
            case 'crunch':
                this.playCrunchSound(gainNode, config);
                break;
            case 'ding':
                this.playDingSound(gainNode, config);
                break;
        }
    }

    playNoiseSound(gainNode, config) {
        // Quick attack noise
        const oscillator = this.audioContext.createOscillator();
        const noiseGain = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, this.audioContext.currentTime + config.duration);
        
        noiseGain.gain.setValueAtTime(1, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(noiseGain);
        noiseGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playDecaySound(gainNode, config) {
        // Dying sound with decay
        const oscillator = this.audioContext.createOscillator();
        const filterNode = this.audioContext.createBiquadFilter();
        const decayGain = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.2, this.audioContext.currentTime + config.duration);
        
        filterNode.type = 'lowpass';
        filterNode.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filterNode.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + config.duration);
        
        decayGain.gain.setValueAtTime(1, this.audioContext.currentTime);
        decayGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(filterNode);
        filterNode.connect(decayGain);
        decayGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playTwangSound(gainNode, config) {
        // Bow string sound
        const oscillator = this.audioContext.createOscillator();
        const twangGain = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 1.2, this.audioContext.currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.8, this.audioContext.currentTime + config.duration);
        
        twangGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        twangGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(twangGain);
        twangGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playHissSound(gainNode, config) {
        // Creeper fuse hissing
        const bufferSize = this.audioContext.sampleRate * config.duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.3;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const hissGain = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = buffer;
        
        filterNode.type = 'bandpass';
        filterNode.frequency.value = config.frequency;
        filterNode.Q.value = 5;
        
        hissGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        hissGain.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + config.duration);
        
        noiseSource.connect(filterNode);
        filterNode.connect(hissGain);
        hissGain.connect(gainNode);
        
        noiseSource.start(this.audioContext.currentTime);
        noiseSource.stop(this.audioContext.currentTime + config.duration);
    }

    playExplosionSound(gainNode, config) {
        // Explosion sound with multiple components
        
        // Low frequency boom
        const boomOsc = this.audioContext.createOscillator();
        const boomGain = this.audioContext.createGain();
        
        boomOsc.type = 'sine';
        boomOsc.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        boomOsc.frequency.exponentialRampToValueAtTime(config.frequency * 0.1, this.audioContext.currentTime + 0.5);
        
        boomGain.gain.setValueAtTime(1, this.audioContext.currentTime);
        boomGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
        
        boomOsc.connect(boomGain);
        boomGain.connect(gainNode);
        
        // High frequency crack
        const crackOsc = this.audioContext.createOscillator();
        const crackGain = this.audioContext.createGain();
        
        crackOsc.type = 'sawtooth';
        crackOsc.frequency.setValueAtTime(config.frequency * 10, this.audioContext.currentTime);
        crackOsc.frequency.exponentialRampToValueAtTime(config.frequency * 2, this.audioContext.currentTime + 0.3);
        
        crackGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        crackGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        
        crackOsc.connect(crackGain);
        crackGain.connect(gainNode);
        
        // Noise component
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        
        noiseSource.buffer = buffer;
        
        noiseGain.gain.setValueAtTime(0.7, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(gainNode);
        
        // Start all components
        boomOsc.start(this.audioContext.currentTime);
        boomOsc.stop(this.audioContext.currentTime + 0.8);
        
        crackOsc.start(this.audioContext.currentTime);
        crackOsc.stop(this.audioContext.currentTime + 0.3);
        
        noiseSource.start(this.audioContext.currentTime);
        noiseSource.stop(this.audioContext.currentTime + 0.5);
    }

    playPopSound(gainNode, config) {
        // Item pickup pop
        const oscillator = this.audioContext.createOscillator();
        const popGain = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 1.5, this.audioContext.currentTime + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, this.audioContext.currentTime + config.duration);
        
        popGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        popGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(popGain);
        popGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playCrackSound(gainNode, config) {
        // Block breaking crack
        const oscillator = this.audioContext.createOscillator();
        const crackGain = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 0.7, this.audioContext.currentTime + config.duration);
        
        filterNode.type = 'highpass';
        filterNode.frequency.value = 150;
        
        crackGain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        crackGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(filterNode);
        filterNode.connect(crackGain);
        crackGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playThudSound(gainNode, config) {
        // Block placement thud
        const oscillator = this.audioContext.createOscillator();
        const thudGain = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, this.audioContext.currentTime + config.duration);
        
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 400;
        
        thudGain.gain.setValueAtTime(0.7, this.audioContext.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(filterNode);
        filterNode.connect(thudGain);
        thudGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }

    playCrunchSound(gainNode, config) {
        // Food eating crunch sound
        const oscillator = this.audioContext.createOscillator();
        const crunchGain = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        oscillator.frequency.linearRampToValueAtTime(config.frequency * 0.7, this.audioContext.currentTime + config.duration);
        
        filterNode.type = 'bandpass';
        filterNode.frequency.value = config.frequency;
        filterNode.Q.value = 3;
        
        crunchGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        crunchGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + config.duration * 0.5);
        crunchGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator.connect(filterNode);
        filterNode.connect(crunchGain);
        crunchGain.connect(gainNode);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
        
        // Add noise component for crunchiness
        const bufferSize = this.audioContext.sampleRate * config.duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = buffer;
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 200;
        
        noiseGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(gainNode);
        
        noiseSource.start(this.audioContext.currentTime);
        noiseSource.stop(this.audioContext.currentTime + config.duration);
    }

    playDingSound(gainNode, config) {
        // Furnace completion ding
        const oscillator1 = this.audioContext.createOscillator();
        const oscillator2 = this.audioContext.createOscillator();
        const dingGain = this.audioContext.createGain();
        
        oscillator1.type = 'sine';
        oscillator1.frequency.value = config.frequency;
        
        oscillator2.type = 'sine';
        oscillator2.frequency.value = config.frequency * 1.25; // Fifth interval
        
        dingGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        dingGain.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + config.duration * 0.3);
        dingGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + config.duration);
        
        oscillator1.connect(dingGain);
        oscillator2.connect(dingGain);
        dingGain.connect(gainNode);
        
        oscillator1.start(this.audioContext.currentTime);
        oscillator1.stop(this.audioContext.currentTime + config.duration);
        
        oscillator2.start(this.audioContext.currentTime);
        oscillator2.stop(this.audioContext.currentTime + config.duration);
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    cleanup() {
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}