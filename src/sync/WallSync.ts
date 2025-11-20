import type { Box } from '../entities/Box';
import type { EntityManager } from '../entities/EntityManager';
import * as THREE from 'three';

export interface WallStateData {
    id: string;
    position: { x: number; y: number; z: number };
    width: number;
    height: number;
    depth: number;
    color: number;
}

export class WallSync {
    /**
     * Serialize all walls to network-transmittable data
     */
    static serialize(walls: Box[]): WallStateData[] {
        return walls.map(wall => {
            const geometry = wall.mesh.geometry as THREE.BoxGeometry;
            const material = wall.mesh.material as THREE.MeshStandardMaterial;
            return {
                id: wall.id,
                position: {
                    x: wall.mesh.position.x,
                    y: wall.mesh.position.y,
                    z: wall.mesh.position.z
                },
                width: geometry.parameters.width,
                height: geometry.parameters.height,
                depth: geometry.parameters.depth,
                color: material.color.getHex()
            };
        });
    }

    /**
     * Deserialize wall state and apply to EntityManager
     * Only syncs if wall count differs (walls are static)
     */
    static deserialize(data: WallStateData[], entityManager: EntityManager): void {
        // Only recreate walls if count differs (optimization for static walls)
        if (entityManager.walls.length !== data.length) {
            // Remove all existing walls
            entityManager.walls.forEach(wall => entityManager.scene.remove(wall.mesh));
            entityManager.walls = [];

            // Create walls from state
            data.forEach(wData => {
                const pos = new THREE.Vector3(wData.position.x, wData.position.y, wData.position.z);
                entityManager.createWall(
                    wData.id,
                    pos,
                    wData.width,
                    wData.height,
                    wData.depth,
                    wData.color
                );
            });
        }
    }
}
