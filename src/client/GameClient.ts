import * as THREE from 'three';
import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { NetworkManager } from '../network/NetworkManager';
import { ClientEntityManager } from './ClientEntityManager';
import { UIManager } from '../core/UIManager';
import type { NetworkMessage } from '../common/messages';
import { SKILL_CONFIG, SkillType } from '../common/constants';

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
        this.inputManager.on('input', (input: any) => {
            // Send input to server
            this.networkManager.sendToHost({
                type: 'PLAYER_INPUT',
                input: input
            });
        });

        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'q') {
                this.toggleSkillTargeting(SkillType.TELEPORT);
            } else if (e.key.toLowerCase() === 'w') {
                this.toggleSkillTargeting(SkillType.HOMING_MISSILE);
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isTargeting && this.currentSkill === SkillType.HOMING_MISSILE) {
                const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                if (target) {
                    this.entityManager.updateMouseRadiusPosition(target);
                }
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                if (this.isTargeting) {
                    this.requestSkillUsage();
                } else {
                    // Movement
                    const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
                    if (target) {
                        console.log('Sending Move Request:', target);
                        this.networkManager.sendToHost({
                            type: 'PLAYER_INPUT',
                            input: { keys: this.inputManager.keys, mouse: null },
                            destination: { x: target.x, y: target.y, z: target.z }
                        });
                    } else {
                        console.log('No ground intersection found');
                    }
                }
            }
        });
    }

    private toggleSkillTargeting(skillType: SkillType) {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);

        // Check Cooldowns (Client-side prediction/check)
        if (myPlayer) {
            const now = Date.now();
            if (skillType === SkillType.TELEPORT && now < myPlayer.teleportCooldown) {
                console.log('Teleport on cooldown');
                return;
            }
            if (skillType === SkillType.HOMING_MISSILE && now < myPlayer.homingMissileCooldown) {
                console.log('Homing Missile on cooldown');
                return;
            }
        }

        if (this.currentSkill === skillType && this.isTargeting) {
            // Toggle off
            this.isTargeting = false;
            this.currentSkill = null;
        } else {
            // Toggle on
            this.isTargeting = true;
            this.currentSkill = skillType;
        }

        this.entityManager.setSkillTargeting(this.currentSkill, this.isTargeting);
    }

    private requestSkillUsage() {
        if (!this.currentSkill || !this.localPlayerId) return;

        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (!target) return;

        if (this.currentSkill === SkillType.TELEPORT) {
            this.networkManager.sendToHost({
                type: 'SKILL_REQUEST',
                skillType: SkillType.TELEPORT,
                target: { x: target.x, y: target.y, z: target.z },
                timestamp: Date.now()
            });
            this.isTargeting = false;
            this.currentSkill = null;
            this.entityManager.setSkillTargeting(null, false);

        } else if (this.currentSkill === SkillType.HOMING_MISSILE) {
            // Check if click is within Player Radius
            const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
            if (myPlayer) {
                const playerPos = myPlayer.mesh.position;
                const dist = new THREE.Vector3(target.x, 0, target.z).distanceTo(new THREE.Vector3(playerPos.x, 0, playerPos.z));
                const config = SKILL_CONFIG[SkillType.HOMING_MISSILE];

                if (dist <= config.radius) {
                    // Valid click inside activation zone
                    this.networkManager.sendToHost({
                        type: 'SKILL_REQUEST',
                        skillType: SkillType.HOMING_MISSILE,
                        target: { x: target.x, y: target.y, z: target.z }, // Target is mouse position for selection
                        timestamp: Date.now()
                    });
                    this.isTargeting = false;
                    this.currentSkill = null;
                    this.entityManager.setSkillTargeting(null, false);
                } else {
                    console.log('Click inside the green circle to activate!');
                }
            }
        }
    }

    private handleMessage(message: NetworkMessage) {
        switch (message.type) {
            case 'JOIN_RESPONSE':
                if (message.success && message.mapConfig) {
                    this.localPlayerId = message.playerId;
                    this.entityManager.loadMap(message.mapConfig);

                    // Request initial state
                    this.networkManager.sendToHost({
                        type: 'STATE_REQUEST'
                    });

                    this.start();
                }
                break;
            case 'GAME_STATE_UPDATE':
                if (this.localPlayerId) {
                    this.entityManager.updateState(message.state, this.localPlayerId);
                    this.uiManager.update(message.state, this.localPlayerId);
                }
                break;
        }
    }

    public joinGame(_hostId: string) {
        // If we are host, we are already connected effectively, but we need to trigger the join flow
        // If we are client, we connect then join.
        // NetworkManager handles connection.
        // We send JOIN_REQUEST.
        this.networkManager.sendToHost({ type: 'JOIN_REQUEST', playerId: this.networkManager.peerId });
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        document.getElementById('menu')!.style.display = 'none';
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
