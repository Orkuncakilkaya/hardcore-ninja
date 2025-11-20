import * as THREE from 'three';

export class SlashArea {
    public mesh: THREE.Mesh;
    public lifeTime: number = 2.0;
    public ownerId: string;
    private maxScale: number = 3.0;
    private currentScale: number = 0.1;

    constructor(ownerId: string, position: THREE.Vector3, rotation: THREE.Euler) {
        this.ownerId = ownerId;

        // Semi-circle or cone for slash
        const geometry = new THREE.CircleGeometry(1, 32, 0, Math.PI);
        geometry.rotateX(-Math.PI / 2); // Lay flat
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        this.mesh = new THREE.Mesh(geometry, material);

        this.mesh.position.copy(position);
        this.mesh.position.y = 0.1; // Just above ground
        this.mesh.rotation.y = rotation.y - Math.PI / 2; // Align with player facing
    }

    public update(delta: number) {
        this.lifeTime -= delta;

        // Ease in scale
        if (this.currentScale < this.maxScale) {
            this.currentScale += delta * 5;
            if (this.currentScale > this.maxScale) this.currentScale = this.maxScale;
            this.mesh.scale.setScalar(this.currentScale);
        }

        // Fade out near end
        if (this.lifeTime < 0.5) {
            (this.mesh.material as THREE.MeshBasicMaterial).opacity = this.lifeTime;
        }
    }
}
