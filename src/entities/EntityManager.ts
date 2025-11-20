import * as THREE from 'three';
import { Player } from './Player';
import { Missile } from './Missile';
import { SlashArea } from './SlashArea';
import { Box } from './Box';
import type { MapConfig } from '../core/MapLoader';
import { MapLoader } from '../core/MapLoader';
import { NetworkManager } from '../network/NetworkManager';

export class EntityManager {
    public scene: THREE.Scene;
    public players: Map<string, Player> = new Map();
    public missiles: Missile[] = [];
    public slashAreas: SlashArea[] = [];
    public boxes: Box[] = []; // Gameplay boxes only
    public walls: Box[] = []; // Static walls from map
    public localPlayerId: string | null = null;
    private networkManager: NetworkManager;

    // Spawn position system
    private spawnPositions: THREE.Vector2[] = [];
    private claimedSpawnPoints: Map<string, number> = new Map();
    private nextSpawnIndex: number = 0;
    private mapConfig: MapConfig | null = null;

    constructor(scene: THREE.Scene, networkManager: NetworkManager) {
        this.scene = scene;
        this.networkManager = networkManager;
    }

    public setMapConfig(config: MapConfig) {
        this.mapConfig = config;
        this.initializeSpawnPositions();
    }

    private initializeSpawnPositions() {
        if (!this.mapConfig) {
            console.warn('Map config not set, cannot initialize spawn positions');
            return;
        }
        const spawnPoints = this.mapConfig.spawnPoints.map(sp => MapLoader.toVector2(sp));
        this.spawnPositions = [...spawnPoints];
        for (let i = this.spawnPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnPositions[i], this.spawnPositions[j]] = [this.spawnPositions[j], this.spawnPositions[i]];
        }
        this.nextSpawnIndex = 0;
    }

    public getNextSpawnPosition(): THREE.Vector2 {
        if (this.nextSpawnIndex >= this.spawnPositions.length) {
            this.nextSpawnIndex = 0;
        }
        const position = this.spawnPositions[this.nextSpawnIndex];
        this.nextSpawnIndex++;
        return position;
    }

    public claimSpawnPoint(playerId: string): { position: THREE.Vector2; index: number } | null {
        const claimedIndices = new Set(this.claimedSpawnPoints.values());
        for (let i = 0; i < this.spawnPositions.length; i++) {
            if (!claimedIndices.has(i)) {
                this.claimedSpawnPoints.set(playerId, i);
                return { position: this.spawnPositions[i], index: i };
            }
        }
        return null; // No available spawn points
    }

    public unclaimSpawnPoint(playerId: string) {
        this.claimedSpawnPoints.delete(playerId);
    }

    public setSpawnPointAsClaimed(playerId: string, spawnIndex: number) {
        this.claimedSpawnPoints.set(playerId, spawnIndex);
    }

    public spawnPlayer(id: string, position: THREE.Vector2, isLocal: boolean) {
        let player = this.players.get(id);

        if (player) {
            player.setPosition(position.x, position.y);
            console.log(`Player ${id} already exists. Forcing position to (${position.x}, ${position.y})`);
        } else {
            const color = isLocal ? 0x00ff00 : 0xff0000;
            player = new Player(id, this, color, isLocal, this.networkManager);
            player.setPosition(position.x, position.y);
            this.players.set(id, player);
            this.scene.add(player.mesh);
            console.log(`Spawned ${isLocal ? 'LOCAL' : 'REMOTE'} player ${id} at position (${position.x}, ${position.y}), total players: ${this.players.size}`);
            if (isLocal) {
                this.localPlayerId = id;
            }
        }
    }

    public getLocalPlayer(): Player | undefined {
        if (!this.localPlayerId) return undefined;
        return this.players.get(this.localPlayerId);
    }

    public spawnMissile(ownerId: string, position: THREE.Vector3, rotation: THREE.Euler) {
        const missile = new Missile(ownerId, position, rotation);
        this.missiles.push(missile);
        this.scene.add(missile.mesh);
    }

    public spawnSlash(ownerId: string, position: THREE.Vector3, rotation: THREE.Euler) {
        const slash = new SlashArea(ownerId, position, rotation);
        this.slashAreas.push(slash);
        this.scene.add(slash.mesh);
    }

    public createBox(id: string, position: THREE.Vector3, width: number = 2, height: number = 2, depth: number = 2, color: number = 0x888888) {
        const box = new Box(id, position, width, height, depth, color);
        this.boxes.push(box);
        this.scene.add(box.mesh);
    }

    public createWall(id: string, position: THREE.Vector3, width: number = 2, height: number = 2, depth: number = 2, color: number = 0x888888) {
        const wall = new Box(id, position, width, height, depth, color);
        this.walls.push(wall);
        this.scene.add(wall.mesh);
    }

    public removePlayer(id: string) {
        const player = this.players.get(id);
        if (player) {
            this.scene.remove(player.mesh);
            this.players.delete(id);
            this.unclaimSpawnPoint(id);
        }
    }

LAGI
    public getState(): any {
        const playersData = Array.from(this.players.values()).map(p => ({
            id: p.id,
            position: { x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z },
            rotation: { x: p.mesh.rotation.x, y: p.mesh.rotation.y, z: p.mesh.rotation.z, order: p.mesh.rotation.order },
            health: p.health,
            isInvulnerable: p.isInvulnerable,
            isMoving: p.isMoving,
            velocity: { x: p.velocity.x, y: p.velocity.y, z: p.velocity.z }
        }));
        // ... (rest of getState is the same)
        return { players: playersData, /* ... */ };
    }

    public applyState(state: any) {
        const statePlayerIds = new Set(state.players.map((p: any) => p.id));

        for (const [id, _player] of this.players) {
            if (!statePlayerIds.has(id)) {
                this.removePlayer(id);
            }
        }

        state.players.forEach((pData: any) => {
            const player = this.players.get(pData.id);
            if (player) {
                player.mesh.position.set(pData.position.x, pData.position.y, pData.position.z);
                player.mesh.rotation.set(pData.rotation.x, pData.rotation.y, pData.rotation.z, pData.rotation.order);
                player.health = pData.health;
                player.isInvulnerable = pData.isInvulnerable;
                player.isMoving = pData.isMoving;
                player.velocity.set(pData.velocity.x, pData.velocity.y, pData.velocity.z);
            }
        });
        // ... (rest of applyState is the same)
    }

    public update(delta: number, input: { keys: { [key: string]: boolean }, mouse: { x: number, y: number, z: number } | null }) {
        const allPlayers = Array.from(this.players.values());
        const allObstacles = [...this.walls, ...this.boxes];

        // Server-side movement calculation for all players
        this.players.forEach(player => {
            // The `update` method now handles movement and collision
            player.update(delta, allObstacles, allPlayers);

            // For the local player on the host, we also apply client-side logic
            if (player.id === this.localPlayerId) {
                player.clientUpdate(delta, input);
            }
        });

        // Update Missiles, Slashes, etc.
        // ... (rest of the update logic is the same)
    }
}
