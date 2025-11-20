import type { SlashArea } from '../entities/SlashArea';
import type { EntityManager } from '../entities/EntityManager';
import * as THREE from 'three';

export interface SlashStateData {
    ownerId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; order: string };
    scale: number;
}

export class SlashSync {
    /**
     * Serialize all slash areas to network-transmittable data
     */
    static serialize(slashAreas: SlashArea[]): SlashStateData[] {
        return slashAreas.map(slash => ({
            ownerId: slash.ownerId,
            position: {
                x: slash.mesh.position.x,
                y: slash.mesh.position.y,
                z: slash.mesh.position.z
            },
            rotation: {
                x: slash.mesh.rotation.x,
                y: slash.mesh.rotation.y,
                z: slash.mesh.rotation.z,
                order: slash.mesh.rotation.order
            },
            scale: slash.mesh.scale.x // Assuming uniform scale
        }));
    }

    /**
     * Deserialize slash area state and apply to EntityManager
     * Clears and recreates all slash areas
     */
    static deserialize(data: SlashStateData[], entityManager: EntityManager): void {
        // Remove all existing slash areas
        entityManager.slashAreas.forEach(slash => entityManager.scene.remove(slash.mesh));
        entityManager.slashAreas = [];

        // Create slash areas from state
        data.forEach(sData => {
            const pos = new THREE.Vector3(sData.position.x, sData.position.y, sData.position.z);
            const rot = new THREE.Euler(sData.rotation.x, sData.rotation.y, sData.rotation.z, sData.rotation.order);
            entityManager.spawnSlash(sData.ownerId, pos, rot);

            // Restore scale
            const slash = entityManager.slashAreas[entityManager.slashAreas.length - 1];
            if (slash) {
                slash.mesh.scale.setScalar(sData.scale);
            }
        });
    }
}
