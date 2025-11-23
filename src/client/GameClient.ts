import * as THREE from 'three';
import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { NetworkManager } from '../network/NetworkManager';
import { ClientEntityManager } from './ClientEntityManager';
import { UIManager } from '../core/UIManager';
import { AudioManager } from './AudioManager';
import type { NetworkMessage } from '../common/messages';
import { SKILL_CONFIG, SkillType, TICK_INTERVAL } from '../common/constants';

export class GameClient {
    private renderer: Renderer;
    private inputManager: InputManager;
    private networkManager: NetworkManager;
    private entityManager: ClientEntityManager;
    private uiManager: UIManager;
    private audioManager: AudioManager;
    private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private isRunning: boolean = false;
    private clock: THREE.Clock;
    private localPlayerId: string | null = null;
    private isLeftMouseDown: boolean = false;

    // Getter for audioManager
    public getAudioManager(): AudioManager {
        return this.audioManager;
    }

    // Network throttling
    private lastMovementSendTime: number = 0;
    private movementSendInterval: number = TICK_INTERVAL * 1000; // Send at tick rate
    private pendingMovementTarget: THREE.Vector3 | null = null;

    constructor(networkManager: NetworkManager) {
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.networkManager = networkManager;
        this.audioManager = new AudioManager();
        this.entityManager = new ClientEntityManager(this.renderer.scene, this.audioManager);
        this.uiManager = new UIManager();
        this.clock = new THREE.Clock();

        this.setupNetworkHandlers();
        this.setupInputHandlers();
    }

    private setupNetworkHandlers() {
        window.addEventListener('network-data', (e: any) => {
            const { data } = e.detail;
            this.handleMessage(data);
        });
    }

    private setupInputHandlers() {
        // Handle mouse down
        this.inputManager.on('mouseDown', () => {
            this.isLeftMouseDown = true;


            // Normal movement
            const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
            if (target) {
                this.pendingMovementTarget = target.clone();
                this.sendMovementRequest(target, true); // Immediate on mouse down
            }
        });

        // Handle mouse up
        this.inputManager.on('mouseUp', () => {
            const wasMoving = this.isLeftMouseDown;
            this.isLeftMouseDown = false;
            this.pendingMovementTarget = null;

            // Stop movement immediately when mouse is released
            if (wasMoving) {
                this.stopMovement();
            }
        });

        // Handle continuous mouse movement for movement and skill targeting
        this.inputManager.on('input', () => {
            if (!this.localPlayerId) return;

            const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
            if (!myPlayer) return;

            // Store pending target for movement
            if (this.isLeftMouseDown) {
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    this.pendingMovementTarget = target.clone();
                    // Movement request will be sent in update loop with throttling
                }
            } else {
                this.pendingMovementTarget = null;
            }
        });

        // Handle skill key presses
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'q') {
                this.fireTeleport();
            } else if (e.key.toLowerCase() === 'w') {
                this.fireHomingMissile();
            } else if (e.key.toLowerCase() === 'e') {
                this.fireLaserBeam();
            } else if (e.key.toLowerCase() === 'r') {
                this.activateInvincibility();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleTabMenu();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.toggleSettingsMenu();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.hideTabMenu();
            }
        });
    }

    private sendMovementRequest(target: THREE.Vector3, immediate: boolean = false) {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer || myPlayer.isDead) return;


        const now = Date.now();

        // Throttle movement requests unless immediate
        if (!immediate && (now - this.lastMovementSendTime) < this.movementSendInterval) {
            return;
        }

        this.lastMovementSendTime = now;

        // Create click indicator effect (only on first send or immediate)
        if (immediate) {
            this.entityManager.createClickIndicator(target);
        }

        // Client-side prediction: server updates will handle position correction

        this.networkManager.sendToHost({
            type: 'PLAYER_INPUT',
            input: { keys: this.inputManager.keys, mouse: null },
            destination: { x: target.x, y: target.y, z: target.z },
            timestamp: now
        });
    }

    private stopMovement() {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer || myPlayer.isDead) return;

        // Immediately stop local player movement (client-side prediction)
        if (myPlayer) {
            // Set target position to current position to stop interpolation
            myPlayer.targetPosition.copy(myPlayer.mesh.position);
            // Clear velocity
            myPlayer.velocity.set(0, 0, 0);
            // Clear position history to prevent interpolation
            myPlayer.positionHistory = [{
                position: myPlayer.mesh.position.clone(),
                timestamp: Date.now()
            }];
        }

        // Send stop command to server
        this.networkManager.sendToHost({
            type: 'PLAYER_INPUT',
            input: { keys: this.inputManager.keys, mouse: null },
            stopMovement: true,
            timestamp: Date.now()
        });
    }

    private fireTeleport() {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer || myPlayer.isDead) return;

        // Check cooldown
        const now = Date.now();
        if (now < myPlayer.teleportCooldown) {
            console.log('Teleport on cooldown');
            return;
        }

        // Get current mouse position
        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (!target) return;

        // Calculate direction from player to mouse
        const playerPos = myPlayer.mesh.position;
        const direction = new THREE.Vector3().subVectors(target, playerPos);
        direction.y = 0;
        const distance = direction.length();

        if (distance < 0.01) {
            // Mouse is too close, teleport forward
            const forward = new THREE.Vector3(0, 0, 1);
            const maxRange = SKILL_CONFIG[SkillType.TELEPORT].range;
            const finalPos = playerPos.clone().add(forward.multiplyScalar(maxRange));

            this.networkManager.sendToHost({
                type: 'SKILL_REQUEST',
                skillType: SkillType.TELEPORT,
                target: { x: finalPos.x, y: finalPos.y, z: finalPos.z },
                timestamp: now
            });
            return;
        }

        // Normalize direction
        direction.normalize();

        // Clamp to max range
        const maxRange = SKILL_CONFIG[SkillType.TELEPORT].range;
        const clampedDistance = Math.min(distance, maxRange);
        const finalPos = playerPos.clone().add(direction.multiplyScalar(clampedDistance));

        // Send teleport request immediately to mouse position (within range)
        this.networkManager.sendToHost({
            type: 'SKILL_REQUEST',
            skillType: SkillType.TELEPORT,
            target: { x: finalPos.x, y: finalPos.y, z: finalPos.z },
            timestamp: now
        });

        // Play teleport sound locally
        this.audioManager.playLocalSkillSound(SkillType.TELEPORT);
    }

    private fireHomingMissile() {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer || myPlayer.isDead) return;

        // Check cooldown
        const now = Date.now();
        if (now < myPlayer.homingMissileCooldown) {
            console.log('Homing Missile on cooldown');
            return;
        }

        // Get current mouse position
        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (!target) return;

        // Fire skill immediately at mouse position
        this.networkManager.sendToHost({
            type: 'SKILL_REQUEST',
            skillType: SkillType.HOMING_MISSILE,
            target: { x: target.x, y: target.y, z: target.z },
            timestamp: now
        });

        // Play homing missile sound locally
        this.audioManager.playLocalSkillSound(SkillType.HOMING_MISSILE);
    }

    private fireLaserBeam() {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer || myPlayer.isDead) return;

        // Check cooldown
        const now = Date.now();
        if (now < myPlayer.laserBeamCooldown) {
            console.log('Laser Beam on cooldown');
            return;
        }

        // Get current mouse position
        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (!target) return;

        // Calculate direction from player to mouse
        const playerPos = myPlayer.mesh.position;
        const direction = target.clone().sub(playerPos);
        direction.y = 0;
        direction.normalize();

        // Fire skill immediately in mouse direction
        this.networkManager.sendToHost({
            type: 'SKILL_REQUEST',
            skillType: SkillType.LASER_BEAM,
            direction: { x: direction.x, y: direction.y, z: direction.z },
            timestamp: now
        });

        // Play laser beam sound locally
        this.audioManager.playLocalSkillSound(SkillType.LASER_BEAM);
    }


    private activateInvincibility() {
        if (!this.localPlayerId) return;

        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer) return;
        if (myPlayer.isDead) return;

        const now = Date.now();
        if (now < myPlayer.invincibilityCooldown) {
            console.log('Invincibility on cooldown');
            return;
        }

        this.networkManager.sendToHost({
            type: 'SKILL_REQUEST',
            skillType: SkillType.INVINCIBILITY,
            timestamp: Date.now()
        });

        // Play invincibility sound locally
        this.audioManager.playLocalSkillSound(SkillType.INVINCIBILITY);

        this.uiManager.clearSkillBorder(SkillType.INVINCIBILITY);
    }

    private async handleMessage(message: NetworkMessage) {
        switch (message.type) {
            case 'JOIN_RESPONSE':
                if (message.success && message.mapConfig) {
                    this.localPlayerId = message.playerId;

                    // Show loading overlay
                    this.uiManager.showLoading('Loading Resources...');

                    // Load map and wait for textures to load
                    await this.entityManager.loadMap(message.mapConfig, (progress) => {
                        this.uiManager.updateLoadingProgress(progress);
                    });

                    // Hide loading overlay
                    this.uiManager.hideLoading();

                    this.networkManager.sendToHost({
                        type: 'STATE_REQUEST'
                    });

                    this.start();
                    this.setupHostActionButtons();
                }
                break;
            case 'GAME_STATE_UPDATE':
                if (this.localPlayerId) {
                    this.entityManager.updateState(message.state, this.localPlayerId);
                    this.uiManager.update(message.state, this.localPlayerId, this.networkManager.isHost);
                }
                break;
        }
    }

    private toggleTabMenu() {
        this.uiManager.showTabMenu();
    }

    private hideTabMenu() {
        this.uiManager.hideTabMenu();
    }

    private toggleSettingsMenu() {
        this.uiManager.toggleSettingsMenu();
    }

    private setupHostActionButtons() {
        const startButton = document.getElementById('btn-start-game');
        const restartButton = document.getElementById('btn-restart-game');

        if (startButton) {
            startButton.addEventListener('click', () => {
                if (this.networkManager.isHost) {
                    this.networkManager.sendToHost({
                        type: 'START_GAME'
                    });
                }
            });
        }

        if (restartButton) {
            restartButton.addEventListener('click', () => {
                if (this.networkManager.isHost) {
                    this.networkManager.sendToHost({
                        type: 'RESTART_GAME'
                    });
                }
            });
        }
    }

    public joinGame(_hostId: string) {
        const joinRequest: any = { 
            type: 'JOIN_REQUEST', 
            playerId: this.networkManager.peerId 
        };

        if (this.networkManager.playerName) {
            joinRequest.username = this.networkManager.playerName;
        }

        if (this.networkManager.playerAvatar) {
            joinRequest.avatar = this.networkManager.playerAvatar;
        }

        this.networkManager.sendToHost(joinRequest);
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        window.dispatchEvent(new CustomEvent('game-started'));
        this.uiManager.showHUD();

        // Initialize audio system
        try {
            await this.audioManager.init(this.renderer.camera);
            console.log('Audio system initialized');

            // Start playing background music
            this.audioManager.playBackgroundMusic();

            // Set audio manager for settings menu
            this.uiManager.setAudioManager(this.audioManager);
        } catch (error) {
            console.error('Failed to initialize audio system:', error);
        }

        this.animate();
    }

    private animate = () => {
        if (!this.isRunning) return;
        requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render();
    }

    private update(delta: number) {
        // Send pending movement requests with throttling
        if (this.pendingMovementTarget && this.isLeftMouseDown) {
            this.sendMovementRequest(this.pendingMovementTarget, false);
        }

        // Update Entities (Interpolation)
        this.entityManager.update(delta);


        // Camera Follow
        if (this.localPlayerId) {
            const localEntity = this.entityManager.getPlayer(this.localPlayerId);
            if (localEntity) {
                this.renderer.camera.position.x = localEntity.mesh.position.x;
                this.renderer.camera.position.z = localEntity.mesh.position.z + 10;
                this.renderer.camera.lookAt(localEntity.mesh.position);
            }
        }
    }
}
