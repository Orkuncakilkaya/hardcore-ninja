import * as THREE from 'three';
import { Player } from './Player';
import { Missile } from './Missile';
import { SlashArea } from './SlashArea';
import { Box } from './Box';
import type { MapConfig } from '../core/MapLoader';
import { MapLoader } from '../core/MapLoader';

export class EntityManager {
    private scene: THREE.Scene;
    public players: Map<string, Player> = new Map();
    public missiles: Missile[] = [];
    public slashAreas: SlashArea[] = [];
    public boxes: Box[] = []; // Gameplay boxes only
    public walls: Box[] = []; // Static walls from map
    public localPlayerId: string | null = null;

    // Spawn position system
    private spawnPositions: THREE.Vector2[] = [];
    private nextSpawnIndex: number = 0;
    private mapConfig: MapConfig | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        // Don't initialize spawn positions here anymore - wait for map config
    }

    /**
     * Set the map configuration and initialize spawn positions
     */
    public setMapConfig(config: MapConfig) {
        this.mapConfig = config;
        this.initializeSpawnPositions();
    }

    private initializeSpawnPositions() {
        if (!this.mapConfig) {
            console.warn('Map config not set, cannot initialize spawn positions');
            return;
        }

        // Load spawn points from map config
        const spawnPoints = this.mapConfig.spawnPoints.map(sp =>
            MapLoader.toVector2(sp)
        );

        // Shuffle the positions using Fisher-Yates algorithm
        this.spawnPositions = [...spawnPoints];
        for (let i = this.spawnPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnPositions[i], this.spawnPositions[j]] = [this.spawnPositions[j], this.spawnPositions[i]];
        }

        this.nextSpawnIndex = 0;
    }

    private getNextSpawnPosition(): THREE.Vector2 {
        if (this.nextSpawnIndex >= this.spawnPositions.length) {
            // If we run out of spawn positions, cycle back (for more than 4 players)
            this.nextSpawnIndex = 0;
        }
        const position = this.spawnPositions[this.nextSpawnIndex];
        this.nextSpawnIndex++;
        return position;
    }

    public createPlayer(id: string, isLocal: boolean = false) {
        if (this.players.has(id)) {
            console.log(`Player ${id} already exists, skipping creation`);
            return;
        }

        const color = isLocal ? 0x00ff00 : 0xff0000;
        const player = new Player(id, this, color, isLocal);

        // Get spawn position from shuffled corners
        const spawnPos = this.getNextSpawnPosition();
        player.setPosition(spawnPos.x, spawnPos.y);

        this.players.set(id, player);
        this.scene.add(player.mesh);
        console.log(`Created ${isLocal ? 'LOCAL' : 'REMOTE'} player ${id} at position (${spawnPos.x}, ${spawnPos.y}), total players: ${this.players.size}`);

        if (isLocal) {
            this.localPlayerId = id;
        }
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

    public createBox(
        id: string,
        position: THREE.Vector3,
        width: number = 2,
        height: number = 2,
        depth: number = 2,
        color: number = 0x888888
    ) {
        const box = new Box(id, position, width, height, depth, color);
        this.boxes.push(box);
        this.scene.add(box.mesh);
    }

    public createWall(
        id: string,
        position: THREE.Vector3,
        width: number = 2,
        height: number = 2,
        depth: number = 2,
        color: number = 0x888888
    ) {
        const wall = new Box(id, position, width, height, depth, color);
        this.walls.push(wall);
        this.scene.add(wall.mesh);
    }

    public removePlayer(id: string) {
        const player = this.players.get(id);
        if (player) {
            this.scene.remove(player.mesh);
            this.players.delete(id);
        }
    }

    public getState(): any {
        const playersData = Array.from(this.players.values()).map(p => ({
            id: p.id,
            position: { x: p.mesh.position.x, y: p.mesh.position.y, z: p.mesh.position.z },
            rotation: { x: p.mesh.rotation.x, y: p.mesh.rotation.y, z: p.mesh.rotation.z, order: p.mesh.rotation.order },
            health: p.health,
            isInvulnerable: p.isInvulnerable
        }));

        const missilesData = this.missiles.map(m => ({
            ownerId: m.ownerId,
            position: { x: m.mesh.position.x, y: m.mesh.position.y, z: m.mesh.position.z },
            rotation: { x: m.mesh.rotation.x, y: m.mesh.rotation.y, z: m.mesh.rotation.z, order: m.mesh.rotation.order }
        }));

        const slashData = this.slashAreas.map(s => ({
            ownerId: s.ownerId,
            position: { x: s.mesh.position.x, y: s.mesh.position.y, z: s.mesh.position.z },
            rotation: { x: s.mesh.rotation.x, y: s.mesh.rotation.y, z: s.mesh.rotation.z, order: s.mesh.rotation.order },
            scale: s.mesh.scale.x // Assuming uniform scale
        }));

        const boxesData = this.boxes.map(b => {
            const geometry = b.mesh.geometry as THREE.BoxGeometry;
            const material = b.mesh.material as THREE.MeshStandardMaterial;
            return {
                id: b.id,
                position: { x: b.mesh.position.x, y: b.mesh.position.y, z: b.mesh.position.z },
                width: geometry.parameters.width,
                height: geometry.parameters.height,
                depth: geometry.parameters.depth,
                color: material.color.getHex()
            };
        });

        return {
            players: playersData,
            missiles: missilesData,
            slashes: slashData,
            boxes: boxesData
        };
    }

    public applyState(state: any) {
        // Sync Players
        const statePlayerIds = new Set(state.players.map((p: any) => p.id));

        // Remove missing players
        for (const [id, _player] of this.players) {
            if (!statePlayerIds.has(id) && id !== this.localPlayerId) { // Don't remove local player immediately if prediction, but for now strict sync
                this.removePlayer(id);
            }
        }

        // Update/Create players
        state.players.forEach((pData: any) => {
            if (pData.id === this.localPlayerId) {
                // Ensure local player exists
                if (!this.players.has(this.localPlayerId!)) {
                    this.createPlayer(this.localPlayerId!, true);
                }

                // Reconciliation could go here, but for now just trust server for health/status
                // Position might be predicted locally, so maybe don't overwrite position if local
                const local = this.players.get(this.localPlayerId!);
                if (local) {
                    local.health = pData.health;
                    local.isInvulnerable = pData.isInvulnerable;
                    // Update position from server to avoid desync
                    // local.mesh.position.set(pData.position.x, pData.position.y, pData.position.z);
                }
                return;
            }

            let player = this.players.get(pData.id);
            if (!player) {
                this.createPlayer(pData.id, false);
                player = this.players.get(pData.id);
            }

            if (player) {
                player.mesh.position.set(pData.position.x, pData.position.y, pData.position.z);
                player.mesh.rotation.set(pData.rotation.x, pData.rotation.y, pData.rotation.z, pData.rotation.order);
                player.health = pData.health;
                player.isInvulnerable = pData.isInvulnerable;
            }
        });

        // Sync Missiles (Simple recreation for now, optimization: ID tracking)
        // Clearing and recreating every frame is expensive but simplest for prototype
        // Better: Track IDs. For now, let's just clear remote missiles and recreate.
        // Actually, for smooth movement, we need IDs.
        // Let's just clear all and recreate for this prototype step to ensure it works.
        // Optimization: TODO

        // Remove all missiles and slashes and recreate from state (Visual glitch warning, but functional)
        this.missiles.forEach(m => this.scene.remove(m.mesh));
        this.missiles = [];
        state.missiles.forEach((mData: any) => {
            const pos = new THREE.Vector3(mData.position.x, mData.position.y, mData.position.z);
            const rot = new THREE.Euler(mData.rotation.x, mData.rotation.y, mData.rotation.z, mData.rotation.order);
            this.spawnMissile(mData.ownerId, pos, rot);
        });

        this.slashAreas.forEach(s => this.scene.remove(s.mesh));
        this.slashAreas = [];
        state.slashes.forEach((sData: any) => {
            const pos = new THREE.Vector3(sData.position.x, sData.position.y, sData.position.z);
            const rot = new THREE.Euler(sData.rotation.x, sData.rotation.y, sData.rotation.z, sData.rotation.order);
            this.spawnSlash(sData.ownerId, pos, rot);
            // Restore scale
            const s = this.slashAreas[this.slashAreas.length - 1];
            s.mesh.scale.setScalar(sData.scale);
        });

        // Sync Boxes
        // Similar to missiles, for now we can just recreate if count differs or just clear/recreate
        // Since boxes are static usually, we might want to check if they exist first.
        // For prototype: Clear and Recreate if count is 0 (initial sync) or if we want to support dynamic boxes later.
        // Let's do a smart sync: if we have 0 boxes and state has boxes, create them.
        // If we have boxes, assume they are static for now (optimization).
        // Actually, to be safe against desync, let's clear and recreate if the count doesn't match or just always for now (safest but heavy if many boxes).
        // Given it's 5 boxes, clear/recreate is fine.

        if (this.boxes.length !== state.boxes.length) {
            this.boxes.forEach(b => this.scene.remove(b.mesh));
            this.boxes = [];
            state.boxes.forEach((bData: any) => {
                const pos = new THREE.Vector3(bData.position.x, bData.position.y, bData.position.z);
                this.createBox(
                    bData.id,
                    pos,
                    bData.width || 2,
                    bData.height || 2,
                    bData.depth || 2,
                    bData.color || 0x888888
                );
            });
        }
    }

    public update(delta: number, input: { keys: { [key: string]: boolean }, mouse: { x: number, y: number, z: number } | null }) {
        // Get all players as array for collision detection
        const allPlayers = Array.from(this.players.values());
        // Combine walls and boxes for collision detection
        const allObstacles = [...this.walls, ...this.boxes];

        // Update local player with input
        if (this.localPlayerId) {
            const localPlayer = this.players.get(this.localPlayerId);
            if (localPlayer) {
                localPlayer.update(delta, input, allObstacles, allPlayers);
            }
        }

        // Update Missiles
        for (let i = this.missiles.length - 1; i >= 0; i--) {
            const missile = this.missiles[i];
            missile.update(delta);

            // Collision Check
            let hit = false;
            for (const [playerId, player] of this.players) {
                if (playerId !== missile.ownerId) {
                    const dist = missile.mesh.position.distanceTo(player.mesh.position);
                    if (dist < 1.0) { // Hit radius
                        player.takeDamage(20);
                        hit = true;
                        break;
                    }
                }
            }

            if (hit || missile.lifeTime <= 0) {
                this.scene.remove(missile.mesh);
                this.missiles.splice(i, 1);
            }
        }

        // Update Slash Areas
        for (let i = this.slashAreas.length - 1; i >= 0; i--) {
            const slash = this.slashAreas[i];
            slash.update(delta);

            // Collision Check (Continuous damage or once? Usually once per cast, but for simplicity let's do continuous for now or check if already hit)
            // For this prototype, let's just check distance.
            for (const [playerId, player] of this.players) {
                if (playerId !== slash.ownerId) {
                    const dist = slash.mesh.position.distanceTo(player.mesh.position);
                    if (dist < 2.0) { // Slash radius
                        // TODO: Add debounce to not melt health instantly
                        // For now, small damage per frame
                        player.takeDamage(0.5);
                    }
                }
            }

            if (slash.lifeTime <= 0) {
                this.scene.remove(slash.mesh);
                this.slashAreas.splice(i, 1);
            }
        }

        // Other players will be updated via network sync (TODO)
    }
}
