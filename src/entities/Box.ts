import * as THREE from 'three';

export class Box {
    public id: string;
    public mesh: THREE.Mesh;

    constructor(
        id: string,
        position: THREE.Vector3,
        width: number = 2,
        height: number = 2,
        depth: number = 2,
        color: number = 0x888888
    ) {
        this.id = id;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }
}
