import * as THREE from 'three';
import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { NetworkManager } from '../network/NetworkManager';
import { ClientEntityManager } from './ClientEntityManager';
import { UIManager } from '../core/UIManager';
import type { NetworkMessage } from '../common/messages';

export class GameClient {
    private renderer: Renderer;
    private inputManager: InputManager;
    private networkManager: NetworkManager;
    private entityManager: ClientEntityManager;
    private uiManager: UIManager;
    private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    private isTargetingTeleport: boolean = false;
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
                this.toggleTeleportTargeting();
            }
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                if (this.isTargetingTeleport) {
                    this.requestTeleport();
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

    private toggleTeleportTargeting() {
        if (!this.localPlayerId) return;
        const myPlayer = this.entityManager.getPlayer(this.localPlayerId);

        if (myPlayer && Date.now() < myPlayer.teleportCooldown) {
            console.log('Teleport on cooldown');
            return;
        }

        this.isTargetingTeleport = !this.isTargetingTeleport;
        this.entityManager.setTeleportTargeting(this.isTargetingTeleport);
    }

    private requestTeleport() {
        const target = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        if (target) {
            this.networkManager.sendToHost({
                type: 'SKILL_REQUEST',
                skillType: 'TELEPORT',
                target: { x: target.x, y: target.y, z: target.z },
                timestamp: Date.now()
            });
            this.isTargetingTeleport = false;
            this.entityManager.setTeleportTargeting(false);
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
