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

    constructor() {
        this.renderer = new Renderer();
        this.inputManager = new InputManager();
        this.networkManager = new NetworkManager();
        this.entityManager = new EntityManager(this.renderer.scene);
        this.uiManager = new UIManager();
        this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.clock = new THREE.Clock();

        this.setupUI();
        this.setupScene();
    }

    private setupScene() {
        // Scene setup (lights, etc. if any, currently empty or just ground which is in constructor)
        // Ground is already created in constructor but not added to scene?
        // Ah, groundPlane is just a mathematical plane for raycasting.
        // We need a visual ground?
        // The previous code didn't seem to have a visual ground mesh, just the plane for math.
        // Wait, looking at previous Game.ts content...
        // It had `this.groundPlane = ...`
        // And `setupScene` had box creation.
        // It seems there is no visual ground? Or maybe Renderer adds it?
        // Let's check Renderer later if needed, but for now just remove box creation.
    }

    private async initializeLevel() {
        try {
            // Load map configuration from JSON
            const mapConfig = await MapLoader.loadMap('/maps/default_map.json');

            console.log(`Loading map: ${mapConfig.name} (v${mapConfig.version})`);

            // Initialize EntityManager with map config
            this.entityManager.setMapConfig(mapConfig);

            // Create walls from config
            mapConfig.walls.forEach(wall => {
                this.entityManager.createWall(
                    wall.id,
                    MapLoader.toVector3(wall.position),
                    wall.dimensions.width,
                    wall.dimensions.height,
                    wall.dimensions.depth,
                    wall.color
                );
            });

            // Create boxes from config
            mapConfig.boxes.forEach(box => {
                this.entityManager.createBox(
                    box.id,
                    MapLoader.toVector3(box.position),
                    box.dimensions.width,
                    box.dimensions.height,
                    box.dimensions.depth,
                    box.color
                );
            });

            // Update renderer with playable area size
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
            if (this.networkManager.isHost) {
                // Host receiving input or handshake
                if (data.type === 'HANDSHAKE') {
                    console.log(`[HOST] Received HANDSHAKE from ${from}`);
                    // New player connected, create their player entity
                    this.entityManager.createPlayer(from, false);
                    // Send initial state to the new player
                    const state = this.entityManager.getState();
                    console.log(`[HOST] Sending initial state to ${from}, players in state:`, state.players.map((p: any) => p.id));
                    this.networkManager.sendToClient(from, { type: 'STATE', state: state });
                } else if (data.type === 'INPUT') {
                    const player = this.entityManager.players.get(from);
                    if (player) {
                        // Apply input to player
                        // We need to store this input and apply it in update loop
                        player['lastInput'] = data.input; // Hack: Store on player
                    }
                }
            } else {
                // Client receiving state
                if (data.type === 'STATE') {
                    console.log(`[CLIENT] Received state, players:`, data.state.players.map((p: any) => p.id));
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

            // Initialize level first to load map config and spawn positions
            await this.initializeLevel();
            // Then create local player (needs spawn positions to be ready)
            this.entityManager.createPlayer(this.networkManager.peerId, true);
            this.start();
        });

        btnJoin.addEventListener('click', async () => {
            const hostId = inputHostId.value;
            if (hostId) {
                this.networkManager.joinGame(hostId);
                hostControls.style.display = 'none';
                statusEl.textContent = 'Joining...';

                // Initialize level first to load map config
                await this.initializeLevel();
                // Set local player ID (client player will be created when receiving state from host)
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
        const mouseIntersection = this.inputManager.getMouseGroundIntersection(this.renderer.camera, this.groundPlane);
        const input = {
            keys: this.inputManager.keys,
            mouse: mouseIntersection ? { x: mouseIntersection.x, y: mouseIntersection.y, z: mouseIntersection.z } : null
        };

        if (this.networkManager.isHost) {
            // Host Logic
            // Update local player
            this.entityManager.update(delta, input);

            // Update other players with their last known input
            const allPlayers = Array.from(this.entityManager.players.values());
            const allObstacles = [...this.entityManager.walls, ...this.entityManager.boxes];
            this.entityManager.players.forEach(p => {
                if (p.id !== this.entityManager.localPlayerId && p['lastInput']) {
                    p.update(delta, p['lastInput'], allObstacles, allPlayers);
                }
            });

            // Broadcast State
            const state = this.entityManager.getState();
            this.networkManager.broadcast({ type: 'STATE', state: state });
        } else {
            // Client Logic
            // Send Input
            this.networkManager.sendToHost({ type: 'INPUT', input: input });

            // Local prediction or just wait for state?
            // For smoothness, we should predict local movement
            // But for simplicity, let's rely on state first, or just predict movement
            if (this.entityManager.localPlayerId) {
                // Predict local movement for responsiveness
                // Note: This might conflict with applyState if not handled carefully
                // For this prototype, let's just run local update for responsiveness and let state correct it (snap)
                const localPlayer = this.entityManager.players.get(this.entityManager.localPlayerId);
                const allPlayers = Array.from(this.entityManager.players.values());
                const allObstacles = [...this.entityManager.walls, ...this.entityManager.boxes];
                if (localPlayer) {
                    localPlayer.update(delta, input, allObstacles, allPlayers);
                }
            }
        }

        // Camera follow local player
        if (this.entityManager.localPlayerId) {
            const player = this.entityManager.players.get(this.entityManager.localPlayerId);
            if (player) {
                this.renderer.camera.position.x = player.mesh.position.x;
                this.renderer.camera.position.z = player.mesh.position.z + 10; // Offset
                this.renderer.camera.lookAt(player.mesh.position);

                // Update HUD
                this.uiManager.update(player);
            }
        }
    }
}
