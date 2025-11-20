import * as THREE from 'three';
import { Renderer } from './Renderer';
import { InputManager } from './InputManager';
import { NetworkManager } from '../network/NetworkManager';
import { EntityManager } from '../entities/EntityManager';
import { UIManager } from './UIManager';
import { MapLoader } from './MapLoader';

export class Game {
    private renderer: Renderer;
    private inputManager: InputManager;
    private networkManager: NetworkManager;
    private entityManager: EntityManager;
    private uiManager: UIManager;
    private isRunning: boolean = false;
    private groundPlane: THREE.Plane;
    private clock: THREE.Clock;

    // Tick-based state synchronization
    private tickRate: number = 1 / 20; // 20 ticks per second
    private timeSinceLastTick: number = 0;

    constructor() {
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.networkManager = new NetworkManager();
        this.entityManager = new EntityManager(this.renderer.scene, this.networkManager);
        this.uiManager = new UIManager();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.clock = new THREE.Clock();

        this.setupUI();
        this.setupScene();
    }

    private setupScene() {
        // Scene setup is now handled in initializeLevel
    }

    private async initializeLevel() {
        try {
            const mapConfig = await MapLoader.loadMap('/maps/default_map.json');
            console.log(`Loading map: ${mapConfig.name} (v${mapConfig.version})`);
            this.entityManager.setMapConfig(mapConfig);
            mapConfig.walls.forEach(wall => this.entityManager.createWall(wall.id, MapLoader.toVector3(wall.position), wall.dimensions.width, wall.dimensions.height, wall.dimensions.depth, wall.color));
            mapConfig.boxes.forEach(box => this.entityManager.createBox(box.id, MapLoader.toVector3(box.position), box.dimensions.width, box.dimensions.height, box.dimensions.depth, box.color));
            this.renderer.updateGridSize(mapConfig.playableArea.size);
            console.log(`Map loaded successfully: ${mapConfig.boxes.length} boxes, ${mapConfig.walls.length} walls, ${mapConfig.spawnPoints.length} spawn points`);
        } catch (error) {
            console.error('Failed to initialize level:', error);
            throw error;
        }
    }

    private setupUI() {
        const statusEl = document.getElementById('connection-status')!;
        const hostControls = document.getElementById('host-controls')!;
        const lobbyControls = document.getElementById('lobby-controls')!;
        const btnHost = document.getElementById('btn-host')!;
        const btnJoin = document.getElementById('btn-join')!;
        const inputHostId = document.getElementById('input-host-id') as HTMLInputElement;
        const myIdDisplay = document.getElementById('my-id-display')!;

        window.addEventListener('network-ready', (_e: any) => {
            statusEl.textContent = 'Network Ready!';
            hostControls.style.display = 'block';
        });

        window.addEventListener('network-data', (e: any) => {
            const { from, data } = e.detail;

            if (data.type === 'SPAWN_POINT_RESPONSE') {
                data.players.forEach((p: any) => {
                    const isLocal = p.id === this.networkManager.peerId;
                    this.entityManager.spawnPlayer(p.id, p.position, isLocal);
                });
                return;
            }

            if (this.networkManager.isHost) {
                if (data.type === 'SPAWN_POINTS_REQUEST') {
                    console.log(`[HOST] Received SPAWN_POINTS_REQUEST from ${from}`);

                    // Spawn the new player on the host
                    const spawnDetails = this.entityManager.claimSpawnPoint(from);
                    if (spawnDetails) {
                        this.entityManager.spawnPlayer(from, spawnDetails.position, false);
                        this.networkManager.broadcast({ type: 'CLAIM_SPAWN_POINT', playerId: from, spawnIndex: spawnDetails.index });
                    }

                    // Get all player positions
                    const playerPositions = Array.from(this.entityManager.players.values()).map(p => ({
                        id: p.id,
                        position: { x: p.mesh.position.x, y: p.mesh.position.z }
                    }));

                    // Send the response back to the requester
                    this.networkManager.sendToClient(from, { type: 'SPAWN_POINT_RESPONSE', players: playerPositions });
                } else if (data.type === 'INPUT') {
                    const player = this.entityManager.players.get(from);
                    if (player) {
                        player.lastInput = data.input;
                        if (data.destination) {
                            player.setDestination(new THREE.Vector3(data.destination.x, data.destination.y, data.destination.z));
                        }
                    }
                }
            } else {
                if (data.type === 'STATE') {
                    this.entityManager.applyState(data.state);
                }
            }
        });

        window.addEventListener('player-disconnected', (e: any) => {
            this.entityManager.removePlayer(e.detail);
        });

        btnHost.addEventListener('click', async () => {
            this.networkManager.hostGame();
            hostControls.style.display = 'none';
            lobbyControls.style.display = 'block';
            myIdDisplay.textContent = `Hosting on ID: ${this.networkManager.peerId}`;
            await this.initializeLevel();
            const spawnDetails = this.entityManager.claimSpawnPoint(this.networkManager.peerId!);
            if (spawnDetails) {
                this.entityManager.spawnPlayer(this.networkManager.peerId!, spawnDetails.position, true);
                this.networkManager.broadcast({ type: 'CLAIM_SPAWN_POINT', playerId: this.networkManager.peerId, spawnIndex: spawnDetails.index });
            }
            this.start();
        });

        btnJoin.addEventListener('click', async () => {
            const hostId = inputHostId.value;
            if (hostId) {
                this.networkManager.joinGame(hostId);
                hostControls.style.display = 'none';
                statusEl.textContent = 'Joining...';
                await this.initializeLevel();
                this.entityManager.localPlayerId = this.networkManager.peerId;
                this.start();
            }
        });
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
        this.timeSinceLastTick += delta;

        const localPlayer = this.entityManager.getLocalPlayer();
        const mouseIntersection = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        const input = {
            keys: this.inputManager.keys,
            mouse: mouseIntersection ? { x: mouseIntersection.x, y: mouseIntersection.y, z: mouseIntersection.z } : null
        };

        let destination: { x: number, y: number, z: number } | null = null;
        if (localPlayer && this.inputManager.isLeftMouseDown() && mouseIntersection) {
            destination = { x: mouseIntersection.x, y: mouseIntersection.y, z: mouseIntersection.z };
        }

        if (this.networkManager.isHost) {
            // Host Logic
            if (localPlayer && destination) {
                localPlayer.setDestination(new THREE.Vector3(destination.x, destination.y, destination.z));
            }
            this.entityManager.update(delta, input); // Server-side update

            if (this.timeSinceLastTick > this.tickRate) {
                const state = this.entityManager.getState();
                this.networkManager.broadcast({ type: 'STATE', state: state });
                this.timeSinceLastTick = 0;
            }
        } else {
            // Client Logic
            this.networkManager.sendToHost({ type: 'INPUT', input: input, destination: destination });
            if (localPlayer) {
                localPlayer.clientUpdate(delta, input);
            }
        }

        // Camera and UI updates are client-side only
        if (localPlayer) {
            this.renderer.camera.position.x = localPlayer.mesh.position.x;
            this.renderer.camera.position.z = localPlayer.mesh.position.z + 10;
            this.renderer.camera.lookAt(localPlayer.mesh.position);
            this.uiManager.update(localPlayer);
        }
    }
}
