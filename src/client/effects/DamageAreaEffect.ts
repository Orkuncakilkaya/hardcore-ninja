import * as THREE from 'three';

/**
 * Manages damage area indicator visual effects under players
 */
export class DamageAreaEffect {
    private scene: THREE.Scene;
    private damageAreas: Map<string, THREE.Group> = new Map();

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Creates a damage area indicator under a player
     * @param playerId Unique identifier for the player
     * @param position Player position
     * @param rotationY Rotation angle around Y axis (in radians)
     */
    public createDamageArea(playerId: string, position: THREE.Vector3, rotationY: number): void {
        // Remove existing damage area if any
        this.removeDamageArea(playerId);

        const damageArea = new THREE.Group();

        // Create shape: circle with triangle tip pointing forward
        const shape = new THREE.Shape();

        const circleRadius = 0.9; // Radius of the circular part
        const tipLength = 0.4; // Length of the triangle tip (shorter)
        const tipWidth = 1.3; // Width of the triangle tip at base (even wider)

        // Calculate the connection point on circle for triangle
        const connectionAngle = Math.asin(tipWidth / (2 * circleRadius));
        const connectionY = circleRadius * Math.cos(connectionAngle);

        // Start from the tip (pointing forward/up, which is +Y in shape coordinates)
        shape.moveTo(0, circleRadius + tipLength);

        // Left side of triangle tip
        shape.lineTo(-tipWidth / 2, connectionY);

        // Draw circle arc - go around the circle (counter-clockwise from left to right)
        // Start angle: from left connection point going counter-clockwise
        const startAngle = Math.PI / 2 + connectionAngle;
        const endAngle = Math.PI / 2 - connectionAngle;

        // Draw the circle arc (counter-clockwise, the long way)
        shape.absarc(0, 0, circleRadius, startAngle, endAngle, false);

        // Right side of triangle tip
        shape.lineTo(tipWidth / 2, connectionY);

        // Close back to tip
        shape.lineTo(0, circleRadius + tipLength);

        // Create geometry from shape
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffdd00, // Light yellow color (inside)
            emissive: 0xffdd00,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthWrite: false // Don't write to depth buffer so shoes render on top
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; // Rotate to lay flat on ground
        mesh.position.y = 0.05; // Lower position to ensure shoes are always above
        mesh.renderOrder = 0; // Render below player shoes (which have renderOrder 100+)

        // Add outline for better visibility
        const outlineGeometry = new THREE.EdgesGeometry(geometry);
        const outlineMaterial = new THREE.LineBasicMaterial({
            color: 0xcc9900, // Dark yellow outline (border)
            transparent: true,
            opacity: 0.9
        });
        const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
        outline.rotation.x = -Math.PI / 2;
        outline.position.y = 0.06; // Slightly above the mesh
        outline.renderOrder = 0; // Render below player shoes

        damageArea.add(mesh);
        damageArea.add(outline);

        // Position and rotate - triangle tip should point in the direction character is facing
        // Shape is drawn with tip pointing +Y, when rotated to ground it becomes +Z (forward)
        // Rotate 180 degrees to flip the direction
        damageArea.position.copy(position);
        damageArea.position.y = 0.05; // Lower position to ensure shoes are always above
        damageArea.rotation.y = rotationY + Math.PI; // Rotate 180 degrees

        this.scene.add(damageArea);
        this.damageAreas.set(playerId, damageArea);
    }

    /**
     * Updates the position and rotation of a damage area
     */
    public updateDamageArea(playerId: string, position: THREE.Vector3, rotationY: number): void {
        const damageArea = this.damageAreas.get(playerId);
        if (damageArea) {
            damageArea.position.copy(position);
            damageArea.position.y = 0.05; // Lower position to ensure shoes are always above
            damageArea.rotation.y = rotationY + Math.PI; // Rotate 180 degrees
        } else {
            // Create if doesn't exist
            this.createDamageArea(playerId, position, rotationY);
        }
    }

    /**
     * Removes a damage area indicator
     */
    public removeDamageArea(playerId: string): void {
        const damageArea = this.damageAreas.get(playerId);
        if (damageArea) {
            this.scene.remove(damageArea);
            this.damageAreas.delete(playerId);
        }
    }

    /**
     * Removes all damage area indicators
     */
    public removeAllDamageAreas(): void {
        this.damageAreas.forEach((damageArea) => {
            this.scene.remove(damageArea);
        });
        this.damageAreas.clear();
    }
}
