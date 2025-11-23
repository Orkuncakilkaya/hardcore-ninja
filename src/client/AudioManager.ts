import * as THREE from 'three';
import { SkillType } from '../common/constants';

// Default audio settings
const DEFAULT_SFX_VOLUME = 0.5; // 50%
const DEFAULT_BGM_VOLUME = 0.1; // 10%
const STORAGE_KEY_SFX_VOLUME = 'sfx_volume';
const STORAGE_KEY_BGM_VOLUME = 'bgm_volume';

/**
 * AudioManager handles 3D audio sources and listeners for the game
 */
export class AudioManager {
    private listener: THREE.AudioListener;
    private camera: THREE.Camera;
    private soundMap: Map<string, THREE.Audio | THREE.PositionalAudio>;
    private skillSounds: Map<SkillType, AudioBuffer>;
    private initialized: boolean = false;
    private audioLoader: THREE.AudioLoader;

    // Background music
    private bgmSound: THREE.Audio | null = null;
    private bgmBuffer: AudioBuffer | null = null;

    // Volume settings
    private sfxVolume: number = DEFAULT_SFX_VOLUME;
    private bgmVolume: number = DEFAULT_BGM_VOLUME;

    constructor() {
        this.listener = new THREE.AudioListener();
        this.soundMap = new Map();
        this.skillSounds = new Map();
        this.audioLoader = new THREE.AudioLoader();
    }

    /**
     * Initialize the AudioManager with the camera
     * @param camera The camera to attach the audio listener to
     */
    public init(camera: THREE.Camera): Promise<void> {
        this.camera = camera;
        this.camera.add(this.listener);

        return this.loadSounds().then(() => {
            this.initialized = true;
            console.log('AudioManager initialized');
        });
    }

    /**
     * Load all skill sound effects and background music
     */
    private loadSounds(): Promise<void> {
        // Load settings from local storage
        this.loadSettings();

        const soundPromises: Promise<void>[] = [
            this.loadSound(SkillType.TELEPORT, '/resources/sfx/teleport.mp3'),
            this.loadSound(SkillType.HOMING_MISSILE, '/resources/sfx/missile.mp3'),
            this.loadSound(SkillType.LASER_BEAM, '/resources/sfx/laser.mp3'),
            this.loadSound(SkillType.INVINCIBILITY, '/resources/sfx/shield.mp3'),
            this.loadBackgroundMusic('/resources/bgm/bgm0001.mp3')
        ];

        return Promise.all(soundPromises).then(() => {
            console.log('All sounds loaded');
        });
    }

    /**
     * Load settings from local storage
     */
    private loadSettings(): void {
        const savedSfxVolume = localStorage.getItem(STORAGE_KEY_SFX_VOLUME);
        const savedBgmVolume = localStorage.getItem(STORAGE_KEY_BGM_VOLUME);

        if (savedSfxVolume !== null) {
            this.sfxVolume = parseFloat(savedSfxVolume);
        }

        if (savedBgmVolume !== null) {
            this.bgmVolume = parseFloat(savedBgmVolume);
        }
    }

    /**
     * Save settings to local storage
     */
    private saveSettings(): void {
        localStorage.setItem(STORAGE_KEY_SFX_VOLUME, this.sfxVolume.toString());
        localStorage.setItem(STORAGE_KEY_BGM_VOLUME, this.bgmVolume.toString());
    }

    /**
     * Load background music
     * @param path The path to the music file
     */
    private loadBackgroundMusic(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(
                path,
                (buffer) => {
                    this.bgmBuffer = buffer;
                    resolve();
                },
                undefined,
                (error) => {
                    console.error(`Error loading background music ${path}:`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Load a sound file and store it in the skillSounds map
     * @param skillType The skill type
     * @param path The path to the sound file
     */
    private loadSound(skillType: SkillType, path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.audioLoader.load(
                path,
                (buffer) => {
                    this.skillSounds.set(skillType, buffer);
                    resolve();
                },
                undefined,
                (error) => {
                    console.error(`Error loading sound ${path}:`, error);
                    reject(error);
                }
            );
        });
    }

    /**
     * Play a skill sound at a specific position in 3D space
     * @param skillType The skill type
     * @param position The position to play the sound at
     * @param volume The volume of the sound (0.0 to 1.0)
     * @returns The PositionalAudio object
     */
    public playSkillSoundAt(skillType: SkillType, position: THREE.Vector3, volume: number = 1.0): THREE.PositionalAudio | null {
        if (!this.initialized || !this.skillSounds.has(skillType)) {
            console.warn(`Sound for skill ${skillType} not loaded`);
            return null;
        }

        const buffer = this.skillSounds.get(skillType);
        if (!buffer) return null;

        // Create a positional audio source
        const sound = new THREE.PositionalAudio(this.listener);
        sound.setBuffer(buffer);

        // Apply SFX volume setting
        sound.setVolume(volume * this.sfxVolume);

        sound.setRefDistance(5); // Distance at which the volume is reduced by half
        sound.setMaxDistance(100); // Max distance at which the sound can be heard
        sound.setRolloffFactor(1); // How quickly the volume decreases with distance
        sound.setDistanceModel('inverse'); // Linear, inverse, or exponential

        // Create a dummy object to position the sound
        const soundObject = new THREE.Object3D();
        soundObject.position.copy(position);
        soundObject.add(sound);

        // Add to scene temporarily
        this.camera.parent?.add(soundObject);

        // Play the sound
        sound.play();

        // Remove from scene when done playing
        sound.onEnded = () => {
            this.camera.parent?.remove(soundObject);
        };

        return sound;
    }

    /**
     * Play a skill sound from the local player's perspective
     * @param skillType The skill type
     * @param volume The volume of the sound (0.0 to 1.0)
     * @returns The Audio object
     */
    public playLocalSkillSound(skillType: SkillType, volume: number = 1.0): THREE.Audio | null {
        if (!this.initialized || !this.skillSounds.has(skillType)) {
            console.warn(`Sound for skill ${skillType} not loaded`);
            return null;
        }

        const buffer = this.skillSounds.get(skillType);
        if (!buffer) return null;

        // Create a non-positional audio source (plays at full volume regardless of position)
        const sound = new THREE.Audio(this.listener);
        sound.setBuffer(buffer);

        // Apply SFX volume setting
        sound.setVolume(volume * this.sfxVolume);

        sound.play();

        return sound;
    }

    /**
     * Play background music
     * @returns The Audio object
     */
    public playBackgroundMusic(): THREE.Audio | null {
        if (!this.initialized || !this.bgmBuffer) {
            console.warn('Background music not loaded');
            return null;
        }

        // Stop existing BGM if playing
        this.stopBackgroundMusic();

        // Create a non-positional audio source for BGM
        this.bgmSound = new THREE.Audio(this.listener);
        this.bgmSound.setBuffer(this.bgmBuffer);
        this.bgmSound.setVolume(this.bgmVolume);
        this.bgmSound.setLoop(true); // Loop the background music
        this.bgmSound.play();

        return this.bgmSound;
    }

    /**
     * Stop background music
     */
    public stopBackgroundMusic(): void {
        if (this.bgmSound) {
            this.bgmSound.stop();
            this.bgmSound = null;
        }
    }

    /**
     * Set SFX volume
     * @param volume The volume (0.0 to 1.0)
     */
    public setSfxVolume(volume: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
    }

    /**
     * Set BGM volume
     * @param volume The volume (0.0 to 1.0)
     */
    public setBgmVolume(volume: number): void {
        this.bgmVolume = Math.max(0, Math.min(1, volume));

        // Update playing BGM volume if it exists
        if (this.bgmSound) {
            this.bgmSound.setVolume(this.bgmVolume);
        }

        this.saveSettings();
    }

    /**
     * Get SFX volume
     * @returns The SFX volume (0.0 to 1.0)
     */
    public getSfxVolume(): number {
        return this.sfxVolume;
    }

    /**
     * Get BGM volume
     * @returns The BGM volume (0.0 to 1.0)
     */
    public getBgmVolume(): number {
        return this.bgmVolume;
    }

    /**
     * Dispose of all audio resources
     */
    public dispose(): void {
        // Stop and clean up background music
        this.stopBackgroundMusic();
        this.bgmBuffer = null;

        // Clean up other sounds
        this.soundMap.forEach(sound => {
            sound.stop();
            sound.disconnect();
        });
        this.soundMap.clear();
        this.skillSounds.clear();
        this.initialized = false;
    }
}
