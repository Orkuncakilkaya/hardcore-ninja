import type { Box } from '../entities/Box';
import type { EntityManager } from '../entities/EntityManager';
import * as THREE from 'three';

export interface BoxStateData {
    id: string;
    position: { x: number; y: number; z: number };
    width: number;
    height: number;
    depth: number;
    color: number;
}

export class BoxSync {
    /**
     * Serialize all boxes to network-transmittable data
     */
    static serialize(boxes: Box[]): BoxStateData[] {
        return boxes.map(box => {
            const geometry = box.mesh.geometry as THREE.BoxGeometry;
            const material = box.mesh.material as THREE.MeshStandardMaterial;
            return {
                id: box.id,
                position: {
                    x: box.mesh.position.x,
                    y: box.mesh.position.y,
                    z: box.mesh.position.z
                },
                width: geometry.parameters.width,
                height: geometry.parameters.height,
                depth: geometry.parameters.depth,
                color: material.color.getHex()
            };
        });
    }

    /**
     * Deserialize box state and apply to EntityManager
     * Only syncs if box count differs (boxes are typically static)
     */
    static deserialize(data: BoxStateData[], entityManager: EntityManager): void {
        // Only recreate boxes if count differs (optimization for static boxes)
        if (entityManager.boxes.length !== data.length) {
            // Remove all existing boxes
            entityManager.boxes.forEach(box => entityManager.scene.remove(box.mesh));
            entityManager.boxes = [];

            // Create boxes from state
            data.forEach(bData => {
                const pos = new THREE.Vector3(bData.position.x, bData.position.y, bData.position.z);
                entityManager.createBox(
                    bData.id,
                    pos,
                    bData.width,
                    bData.height,
                    bData.depth,
                    bData.color
                );
            });
        }
    }
}
