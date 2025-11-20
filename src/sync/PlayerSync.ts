import type { Player } from '../entities/Player';
import type { EntityManager } from '../entities/EntityManager';
import * as THREE from 'three';

export interface PlayerStateData {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; order: string };
    health: number;
    isInvulnerable: boolean;
}

export class PlayerSync {
    /**
     * Serialize all players to network-transmittable data
     */
    static serialize(players: Map<string, Player>): PlayerStateData[] {
        return Array.from(players.values()).map(player => ({
            id: player.id,
            position: {
                x: player.mesh.position.x,
                y: player.mesh.position.y,
                z: player.mesh.position.z
            },
            rotation: {
                x: player.mesh.rotation.x,
                y: player.mesh.rotation.y,
                z: player.mesh.rotation.z,
                order: player.mesh.rotation.order
            },
            health: player.health,
            isInvulnerable: player.isInvulnerable
        }));
    }

    /**
     * Deserialize player state and apply to EntityManager
     * Creates missing players, updates existing ones, removes disconnected ones
     */
    static deserialize(data: PlayerStateData[], entityManager: EntityManager): void {
        const statePlayerIds = new Set(data.map(p => p.id));

        // Remove players that are no longer in the state (disconnected)
        for (const [id, _player] of entityManager.players) {
            if (!statePlayerIds.has(id)) {
                entityManager.removePlayer(id);
            }
        }

        // Update or create players from state
        data.forEach(pData => {
            let player = entityManager.players.get(pData.id);

            // Create player if doesn't exist
            if (!player) {
                const isLocal = pData.id === entityManager.localPlayerId;
                entityManager.spawnPlayer(pData.id, new THREE.Vector2(pData.position.x, pData.position.z), isLocal);
                player = entityManager.players.get(pData.id);
            }

            // Apply state to player
            if (player) {
                // Always update position and rotation from authoritative state
                player.mesh.position.set(pData.position.x, pData.position.y, pData.position.z);
                player.mesh.rotation.set(pData.rotation.x, pData.rotation.y, pData.rotation.z, "XYZ");
                player.health = pData.health;
                player.isInvulnerable = pData.isInvulnerable;
            }
        });
    }
}
