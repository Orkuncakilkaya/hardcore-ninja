import type { Missile } from '../entities/Missile';
import type { EntityManager } from '../entities/EntityManager';
import * as THREE from 'three';

export interface MissileStateData {
    ownerId: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; order: string };
}

export class MissileSync {
    /**
     * Serialize all missiles to network-transmittable data
     */
    static serialize(missiles: Missile[]): MissileStateData[] {
        return missiles.map(missile => ({
            ownerId: missile.ownerId,
            position: {
                x: missile.mesh.position.x,
                y: missile.mesh.position.y,
                z: missile.mesh.position.z
            },
            rotation: {
                x: missile.mesh.rotation.x,
                y: missile.mesh.rotation.y,
                z: missile.mesh.rotation.z,
                order: missile.mesh.rotation.order
            }
        }));
    }

    /**
     * Deserialize missile state and apply to EntityManager
     * Clears and recreates all missiles (simple approach for fast-moving projectiles)
     */
    static deserialize(data: MissileStateData[], entityManager: EntityManager): void {
        // Remove all existing missiles
        entityManager.missiles.forEach(missile => entityManager.scene.remove(missile.mesh));
        entityManager.missiles = [];

        // Create missiles from state
        data.forEach(mData => {
            const pos = new THREE.Vector3(mData.position.x, mData.position.y, mData.position.z);
            const rot = new THREE.Euler(mData.rotation.x, mData.rotation.y, mData.rotation.z, "XYZ");
            entityManager.spawnMissile(mData.ownerId, pos, rot);
        });
    }
}
