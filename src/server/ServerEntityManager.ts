import * as THREE from 'three';
import { ServerPlayer } from './ServerPlayer';
import type { MapConfig } from '../common/types';

export class ServerEntityManager {
    public players: Map<string, ServerPlayer> = new Map();
    public obstacles: THREE.Box3[] = [];
    public spawnPositions: THREE.Vector2[] = [];
    private claimedSpawnPoints: Map<string, number> = new Map();

    constructor() { }

    public loadMap(config: MapConfig) {
        this.obstacles = [];

        // Walls
        config.walls.forEach(wall => {
            const pos = new THREE.Vector3(wall.position.x, wall.position.y, wall.position.z);
            const size = new THREE.Vector3(wall.dimensions.width, wall.dimensions.height, wall.dimensions.depth);
            const box = new THREE.Box3().setFromCenterAndSize(pos, size);
            this.obstacles.push(box);
        });

        // Boxes
        config.boxes.forEach(box => {
            const pos = new THREE.Vector3(box.position.x, box.position.y, box.position.z);
            const size = new THREE.Vector3(box.dimensions.width, box.dimensions.height, box.dimensions.depth);
            const box3 = new THREE.Box3().setFromCenterAndSize(pos, size);
            this.obstacles.push(box3);
        });

        // Spawn Points
        // Map JSON (x, y) to World (x, z)
        this.spawnPositions = config.spawnPoints.map(sp => new THREE.Vector2(sp.x, sp.y));
        console.log('Loaded Spawn Points:', this.spawnPositions);

        // Shuffle spawn points
        for (let i = this.spawnPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnPositions[i], this.spawnPositions[j]] = [this.spawnPositions[j], this.spawnPositions[i]];
        }
    }

    public addPlayer(id: string): ServerPlayer {
        // Find spawn point
        let spawnPos = new THREE.Vector3(0, 0, 0);
        const claimedIndices = new Set(this.claimedSpawnPoints.values());

        let found = false;
        for (let i = 0; i < this.spawnPositions.length; i++) {
            if (!claimedIndices.has(i)) {
                this.claimedSpawnPoints.set(id, i);
                spawnPos.set(this.spawnPositions[i].x, 0, this.spawnPositions[i].y);
                found = true;
                console.log(`Assigned spawn point ${i} to ${id}:`, spawnPos);
                break;
            }
        }

        if (!found) {
            console.warn(`No free spawn points for ${id}, spawning at 0,0,0`);
        }

        const player = new ServerPlayer(id, { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z });
        this.players.set(id, player);
        return player;
    }

    public removePlayer(id: string) {
        this.players.delete(id);
        this.claimedSpawnPoints.delete(id);
    }

    public getPlayer(id: string): ServerPlayer | undefined {
        return this.players.get(id);
    }

    public update(delta: number) {
        const allPlayers = Array.from(this.players.values());
        this.players.forEach(player => {
            player.update(delta, this.obstacles, allPlayers);
        });
    }

    public getState() {
        return {
            players: Array.from(this.players.values()).map(p => p.getState()),
            timestamp: Date.now()
        };
    }
}
