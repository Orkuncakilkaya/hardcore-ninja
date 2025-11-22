import * as THREE from 'three';
import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { NetworkManager } from '../network/NetworkManager';
import { ClientEntityManager } from './ClientEntityManager';
import { UIManager } from '../core/UIManager';
import type { NetworkMessage } from '../common/messages';
import { SKILL_CONFIG, SkillType, TICK_INTERVAL } from '../common/constants';

export class GameClient {
    private renderer: Renderer;
    private inputManager: InputManager;
    private networkManager: NetworkManager;
    private entityManager: ClientEntityManager;
    private uiManager: UIManager;
    private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private currentSkill: SkillType | null = null;
    private isTargeting: boolean = false;
    private isRunning: boolean = false;
    private clock: THREE.Clock;
    private localPlayerId: string | null = null;
    private isLeftMouseDown: boolean = false;
    private isTeleportHeld: boolean = false;
    private teleportStartTime: number = 0;
    private lastMovementTarget: THREE.Vector3 | null = null;
    
    // Network throttling
    private lastMovementSendTime: number = 0;
    private movementSendInterval: number = TICK_INTERVAL * 1000; // Send at tick rate
    private pendingMovementTarget: THREE.Vector3 | null = null;

    constructor(networkManager: NetworkManager) {
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.networkManager = networkManager;
        this.entityManager = new ClientEntityManager(this.renderer.scene);
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
            
            // If targeting a skill (except teleport), don't move
            if (this.isTargeting && this.currentSkill !== SkillType.TELEPORT) {
                return;
            }

            // If teleport is held, continue movement
            if (this.isTeleportHeld) {
                return;
            }

            // Normal movement
            const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
            if (target) {
                this.lastMovementTarget = target.clone();
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
            if (wasMoving && !this.isTargeting) {
                this.stopMovement();
            }
            
            // If targeting a skill, fire it
            if (this.isTargeting && this.currentSkill) {
                if (this.currentSkill === SkillType.TELEPORT) {
                    // Teleport is handled by keyup
                    return;
                }
                this.requestSkillUsage();
            }
        });

        // Handle continuous mouse movement for movement and skill targeting
        this.inputManager.on('input', () => {
            if (!this.localPlayerId) return;
            
            const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
            if (!myPlayer) return;

            // Store pending target for movement
            if (this.isLeftMouseDown && !this.isTargeting && !this.isTeleportHeld) {
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    this.lastMovementTarget = target.clone();
                    this.pendingMovementTarget = target.clone();
                    // Movement request will be sent in update loop with throttling
                }
            } else if (this.isLeftMouseDown && this.isTeleportHeld) {
                // Continue movement while teleport is held
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    this.lastMovementTarget = target.clone();
                    this.pendingMovementTarget = target.clone();
                    // Movement request will be sent in update loop with throttling
                }
            } else {
                this.pendingMovementTarget = null;
            }

            // Update skill targeting visuals
            if (this.isTargeting && this.currentSkill === SkillType.HOMING_MISSILE) {
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    this.entityManager.updateMouseRadiusPosition(target);
                }
            } else if (this.isTargeting && this.currentSkill === SkillType.LASER_BEAM) {
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    const playerPos = myPlayer.mesh.position;
                    const direction = target.clone().sub(playerPos);
                    direction.y = 0;
                    this.entityManager.updateLaserPreview(playerPos, direction);
                }
            }
        });

        // Handle skill key presses
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'q') {
                this.startTeleport();
            } else if (e.key.toLowerCase() === 'w') {
                this.startSkillTargeting(SkillType.HOMING_MISSILE);
            } else if (e.key.toLowerCase() === 'e') {
                this.startSkillTargeting(SkillType.LASER_BEAM);
            } else if (e.key.toLowerCase() === 'r') {
                this.activateInvincibility();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleTabMenu();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === 'q') {
                this.endTeleport();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.hideTabMenu();
            }
        });
    }

    private sendMovementRequest(target: THREE.Vector3, immediate: boolean = false) {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer || myPlayer.isDead) return;

        // Stop movement if targeting a skill (except teleport)
        if (this.isTargeting && this.currentSkill !== SkillType.TELEPORT) {
            return;
        }

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

    private startTeleport() {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);

        if (myPlayer) {
            if (myPlayer.isDead) return;
            const now = Date.now();
            if (now < myPlayer.teleportCooldown) {
                console.log('Teleport on cooldown');
                return;
            }
        }

        this.isTeleportHeld = true;
        this.teleportStartTime = Date.now();
        this.isTargeting = true;
        this.currentSkill = SkillType.TELEPORT;
        this.uiManager.setSkillGlow(SkillType.TELEPORT);
        this.entityManager.setSkillTargeting(SkillType.TELEPORT, true);
    }

    private endTeleport() {
        if (!this.isTeleportHeld || !this.currentSkill || this.currentSkill !== SkillType.TELEPORT) return;
        if (!this.localPlayerId) return;

        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer) return;

        // Calculate teleport distance based on how long Q was held
        const holdDuration = Date.now() - this.teleportStartTime;
        const maxDuration = 2000; // 2 seconds max
        const progress = Math.min(holdDuration / maxDuration, 1);
        const maxRange = SKILL_CONFIG[SkillType.TELEPORT].range;
        const teleportDistance = maxRange * progress;

        // Get current mouse position for direction
        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (!target) {
            // Use last movement target if available
            if (this.lastMovementTarget) {
                this.executeTeleport(this.lastMovementTarget, teleportDistance);
            } else {
                // No target, teleport forward
                const playerPos = myPlayer.mesh.position;
                const forward = new THREE.Vector3(0, 0, 1); // Default forward
                const finalPos = playerPos.clone().add(forward.multiplyScalar(teleportDistance));
                this.executeTeleport(finalPos, teleportDistance);
            }
            this.cleanupTeleport();
            return;
        }

        // Calculate direction from player to mouse
        const playerPos = myPlayer.mesh.position;
        const direction = new THREE.Vector3().subVectors(target, playerPos);
        direction.y = 0;
        
        if (direction.length() < 0.01) {
            // Mouse is too close, teleport forward
            const forward = new THREE.Vector3(0, 0, 1);
            const finalPos = playerPos.clone().add(forward.multiplyScalar(teleportDistance));
            this.executeTeleport(finalPos, teleportDistance);
        } else {
            direction.normalize();
            // Calculate final teleport position using the calculated distance
            const finalPos = playerPos.clone().add(direction.multiplyScalar(teleportDistance));
            this.executeTeleport(finalPos, teleportDistance);
        }

        this.cleanupTeleport();
    }

    private executeTeleport(target: THREE.Vector3, maxDistance: number) {
        if (!this.localPlayerId) return;

        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer) return;

        const playerPos = myPlayer.mesh.position;
        const direction = new THREE.Vector3().subVectors(target, playerPos);
        direction.y = 0;
        const distance = direction.length();
        
        // Clamp to max distance (already calculated in endTeleport, but double-check)
        const clampedDistance = Math.min(distance, maxDistance);
        direction.normalize();
        const finalPos = playerPos.clone().add(direction.multiplyScalar(clampedDistance));

        // Send teleport request
        this.networkManager.sendToHost({
            type: 'SKILL_REQUEST',
            skillType: SkillType.TELEPORT,
            target: { x: finalPos.x, y: finalPos.y, z: finalPos.z },
            timestamp: Date.now()
        });
    }

    private cleanupTeleport() {
        this.isTeleportHeld = false;
        this.isTargeting = false;
        this.currentSkill = null;
        this.entityManager.setSkillTargeting(null, false);
        this.uiManager.clearSkillGlow(SkillType.TELEPORT);
        this.uiManager.clearSkillBorder(SkillType.TELEPORT);
    }

    private startSkillTargeting(skillType: SkillType) {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);

        // Check Cooldowns
        if (myPlayer) {
            if (myPlayer.isDead) return;
            const now = Date.now();
            if (skillType === SkillType.HOMING_MISSILE && now < myPlayer.homingMissileCooldown) {
                console.log('Homing Missile on cooldown');
                return;
            }
            if (skillType === SkillType.LASER_BEAM && now < myPlayer.laserBeamCooldown) {
                console.log('Laser Beam on cooldown');
                return;
            }
        }

        // Clear any existing skill glow
        if (this.currentSkill) {
            this.uiManager.clearSkillGlow(this.currentSkill);
        }

        // Start targeting
        this.isTargeting = true;
        this.currentSkill = skillType;
        this.uiManager.setSkillGlow(skillType);
        this.entityManager.setSkillTargeting(skillType, true);

        // Stop player movement when targeting
        if (this.lastMovementTarget) {
            // Send stop command
            this.networkManager.sendToHost({
                type: 'PLAYER_INPUT',
                input: { keys: this.inputManager.keys, mouse: null },
                stopMovement: true
            });
        }
    }

    private requestSkillUsage() {
        if (!this.currentSkill || !this.localPlayerId) return;

        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (!target) return;

        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
        if (!myPlayer) return;

        if (this.currentSkill === SkillType.HOMING_MISSILE) {
            const playerPos = myPlayer.mesh.position;
            const dist = new THREE.Vector3(target.x, 0, target.z).distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
            const config = SKILL_CONFIG[SkillType.HOMING_MISSILE];

            if (dist <= config.radius) {
                this.networkManager.sendToHost({
                    type: 'SKILL_REQUEST',
                    skillType: SkillType.HOMING_MISSILE,
                    target: { x: target.x, y: target.y, z: target.z },
                    timestamp: Date.now()
                });
                this.cleanupSkillTargeting();
            } else {
                console.log('Click inside the green circle to activate!');
            }
        } else if (this.currentSkill === SkillType.LASER_BEAM) {
            const playerPos = myPlayer.mesh.position;
            const direction = target.clone().sub(playerPos);
            direction.y = 0;
            direction.normalize();

            this.networkManager.sendToHost({
                type: 'SKILL_REQUEST',
                skillType: SkillType.LASER_BEAM,
                direction: { x: direction.x, y: direction.y, z: direction.z },
                timestamp: Date.now()
            });
            this.cleanupSkillTargeting();
        }
    }

    private cleanupSkillTargeting() {
        if (this.currentSkill) {
            this.uiManager.clearSkillGlow(this.currentSkill);
            this.uiManager.clearSkillBorder(this.currentSkill);
        }
        this.isTargeting = false;
        this.currentSkill = null;
        this.entityManager.setSkillTargeting(null, false);
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

        this.uiManager.clearSkillBorder(SkillType.INVINCIBILITY);
    }

    private handleMessage(message: NetworkMessage) {
        switch (message.type) {
            case 'JOIN_RESPONSE':
                if (message.success && message.mapConfig) {
                    this.localPlayerId = message.playerId;
                    this.entityManager.loadMap(message.mapConfig);

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

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        window.dispatchEvent(new CustomEvent('game-started'));
        this.uiManager.showHUD();
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

        // Update character rotation to face mouse direction when targeting
        if (this.localPlayerId && this.isTargeting && this.currentSkill) {
            const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
            if (myPlayer) {
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    const playerPos = myPlayer.mesh.position;
                    const direction = new THREE.Vector3().subVectors(target, playerPos);
                    direction.y = 0;
                    direction.normalize();
                    
                    // Rotate character to face mouse direction
                    const angle = Math.atan2(direction.x, direction.z);
                    myPlayer.bodyGroup.rotation.y = angle;
                }
            }
        }

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
