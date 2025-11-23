import * as THREE from 'three';

/**
 * Manages click indicator visual effects on the ground
 */
export class ClickIndicatorEffect {
    private scene: THREE.Scene;
    private indicators: THREE.Group[] = [];
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }
    
    /**
     * Creates a click indicator effect on the ground at the specified position
     */
    public createClickIndicator(position: THREE.Vector3): void {
        const indicator = new THREE.Group();
        
        // Outer expanding ring (smaller and more subtle)
        const outerRingGeometry = new THREE.RingGeometry(0.2, 0.35, 32);
        const outerRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00aaff,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
        outerRing.rotation.x = -Math.PI / 2;
        outerRing.position.y = 0.15; // Above ground (accounting for displacement)
        indicator.add(outerRing);
        
        // Inner ring (smaller)
        const innerRingGeometry = new THREE.RingGeometry(0.08, 0.2, 32);
        const innerRingMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00aaff,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = 0.16; // Above ground (accounting for displacement)
        indicator.add(innerRing);
        
        // Center point (smaller)
        const centerGeometry = new THREE.CircleGeometry(0.08, 16);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x00aaff,
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.rotation.x = -Math.PI / 2;
        center.position.y = 0.17; // Above ground (accounting for displacement)
        indicator.add(center);
        
        // Position indicator
        indicator.position.copy(position);
        indicator.position.y = 0.15; // Above ground (accounting for displacement)
        
        // Store references for animation
        indicator.userData.outerRing = outerRing;
        indicator.userData.innerRing = innerRing;
        indicator.userData.center = center;
        indicator.userData.outerRingMaterial = outerRingMaterial;
        indicator.userData.innerRingMaterial = innerRingMaterial;
        indicator.userData.centerMaterial = centerMaterial;
        indicator.userData.startTime = Date.now();
        
        this.scene.add(indicator);
        this.indicators.push(indicator);
        
        // Animate and remove after duration
        const animate = () => {
            const elapsed = (Date.now() - indicator.userData.startTime) / 1000;
            
            if (elapsed > 0.8) {
                // Remove indicator
                this.scene.remove(indicator);
                const index = this.indicators.indexOf(indicator);
                if (index > -1) {
                    this.indicators.splice(index, 1);
                }
                return;
            }
            
            // Expand rings
            const expand = 1 + elapsed * 3;
            outerRing.scale.setScalar(expand);
            innerRing.scale.setScalar(expand * 0.8);
            
            // Fade out
            const fade = 1 - (elapsed / 0.8);
            indicator.userData.outerRingMaterial.opacity = 0.4 * fade;
            indicator.userData.innerRingMaterial.opacity = 0.5 * fade;
            indicator.userData.centerMaterial.opacity = 0.6 * fade;
            
            requestAnimationFrame(animate);
        };
        animate();
    }
}

