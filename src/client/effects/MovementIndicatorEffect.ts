import * as THREE from 'three';

/**
 * Manages movement direction indicator (arrow) similar to MOBA games
 * Shows a circle under the character with an arrow pointing in movement direction
 */
export class MovementIndicatorEffect {
    private scene: THREE.Scene;
    private indicator: THREE.Group | null = null;
    private circle: THREE.Mesh | null = null;
    private arrow: THREE.Group | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createIndicator();
    }

    private createIndicator() {
        if (this.indicator) {
            this.scene.remove(this.indicator);
        }

        const indicator = new THREE.Group();

        // Base circle under character (always visible when moving)
        // Make it larger than character width (character capsule radius is 0.5, so use 0.9-1.0)
        const circleGeometry = new THREE.CircleGeometry(0.9, 32);
        const circleMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.circle = new THREE.Mesh(circleGeometry, circleMaterial);
        this.circle.rotation.x = -Math.PI / 2; // Face upward
        this.circle.position.y = 0.15; // Above ground (accounting for displacement)
        indicator.add(this.circle);

        // Arrow group (will rotate to show direction)
        this.arrow = new THREE.Group();

        // Arrow head (cone pointing forward)
        const arrowHeadGeometry = new THREE.ConeGeometry(0.15, 0.35, 8);
        const arrowHeadMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide
        });
        const arrowHead = new THREE.Mesh(arrowHeadGeometry, arrowHeadMaterial);
        arrowHead.rotation.x = -Math.PI / 2; // Point forward (along Z axis)
        arrowHead.position.z = 0.65; // Position further out from circle edge
        this.arrow.add(arrowHead);

        // Arrow shaft (cylinder) - longer
        const shaftGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
        const shaftMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.x = Math.PI / 2; // Rotate to horizontal
        shaft.position.z = 0.45; // Position behind arrow head, extending further
        this.arrow.add(shaft);

        // Position arrow above circle
        this.arrow.position.y = 0.16; // Above ground (accounting for displacement)
        this.arrow.rotation.x = -Math.PI / 2; // Lay flat on ground

        indicator.add(this.arrow);

        // Position indicator above ground
        indicator.position.y = 0.15; // Above ground (accounting for displacement)

        this.indicator = indicator;
        this.indicator.visible = false;
        this.scene.add(this.indicator);
    }

    public updatePosition(from: THREE.Vector3, to: THREE.Vector3) {
        if (!this.indicator || !this.circle || !this.arrow) return;

        // Calculate direction
        const direction = new THREE.Vector3().subVectors(to, from);
        direction.y = 0; // Keep horizontal
        const distance = direction.length();

        if (distance < 0.1) {
            this.hide();
            return;
        }

        direction.normalize();

        // Position indicator at player position (on ground)
        this.indicator.position.copy(from);
        this.indicator.position.y = 0.15; // Above ground (accounting for displacement)

        // Calculate rotation angle around Y axis to face movement direction
        const angle = Math.atan2(direction.x, direction.z);
        
        // Reset arrow rotation first
        this.arrow.rotation.set(-Math.PI / 2, 0, 0);
        // Then rotate around Y axis to face movement direction
        this.arrow.rotateY(angle);

        this.show();
    }

    public setPlayerPosition(position: THREE.Vector3) {
        if (!this.indicator) return;
        
        this.indicator.position.copy(position);
        this.indicator.position.y = 0.15; // Above ground (accounting for displacement)
    }

    public show() {
        if (this.indicator) {
            this.indicator.visible = true;
        }
    }

    public hide() {
        if (this.indicator) {
            this.indicator.visible = false;
        }
    }

    public update(_delta: number) {
        // No particles animation - removed as requested
        // Indicator stays static
    }
}
