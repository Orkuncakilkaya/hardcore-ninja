import * as THREE from 'three';
import { SkillType } from '../common/constants';

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
     * Load all skill sound effects
     */
    private loadSounds(): Promise<void> {
        const soundPromises: Promise<void>[] = [
            this.loadSound(SkillType.TELEPORT, '/resources/sfx/teleport.mp3'),
            this.loadSound(SkillType.HOMING_MISSILE, '/resources/sfx/missile.mp3'),
            this.loadSound(SkillType.LASER_BEAM, '/resources/sfx/laser.mp3'),
            this.loadSound(SkillType.INVINCIBILITY, '/resources/sfx/shield.mp3')
        ];

        return Promise.all(soundPromises).then(() => {
            console.log('All sounds loaded');
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
        sound.setVolume(volume);
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
        sound.setVolume(volume);
        sound.play();

        return sound;
    }

    /**
     * Dispose of all audio resources
     */
    public dispose(): void {
        this.soundMap.forEach(sound => {
            sound.stop();
            sound.disconnect();
        });
        this.soundMap.clear();
        this.skillSounds.clear();
        this.initialized = false;
    }
}