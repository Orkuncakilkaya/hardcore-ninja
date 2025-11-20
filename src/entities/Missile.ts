import * as THREE from 'three';

export class Missile {
    public mesh: THREE.Mesh;
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public lifeTime: number = 3.0;
    public speed: number = 15;
    public ownerId: string;

    constructor(ownerId: string, position: THREE.Vector3, rotation: THREE.Euler) {
        this.ownerId = ownerId;

        const geometry = new THREE.ConeGeometry(0.2, 1, 8);
        geometry.rotateX(Math.PI / 2); // Point forward
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        this.mesh = new THREE.Mesh(geometry, material);

        this.mesh.position.copy(position);
        this.mesh.position.y = 1; // Keep at player height
        this.mesh.rotation.copy(rotation);

        // Initial velocity forward
        this.velocity.set(0, 0, 1).applyEuler(rotation).multiplyScalar(this.speed);
    }

    public update(delta: number) {
        this.lifeTime -= delta;
        this.mesh.position.addScaledVector(this.velocity, delta);

        // TODO: Homing logic (find nearest target)
    }
}
