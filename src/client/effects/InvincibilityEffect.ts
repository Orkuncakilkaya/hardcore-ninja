import * as THREE from 'three';

/**
 * Manages invincibility shield visual effects
 */
export class InvincibilityEffect {
    constructor(_scene: THREE.Scene) {
        // Scene parameter kept for consistency with other effect classes
    }
    
    /**
     * Creates an invincibility shield sphere with pulse effect
     */
    createShield(): THREE.Group {
        const group = new THREE.Group();
        
        // Main shield sphere (light yellow, more transparent)
        const shieldGeometry = new THREE.SphereGeometry(2, 32, 32);
        const shieldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffcc,
            transparent: true,
            opacity: 0.25,
            emissive: 0xffffaa,
            emissiveIntensity: 0.5,
            side: THREE.DoubleSide
        });
        const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
        shield.position.y = 1; // Center at player's chest height
        group.add(shield);
        
        // Outer pulse layer 1 (expanding outward)
        const pulse1Geometry = new THREE.SphereGeometry(2, 32, 32);
        const pulse1Material = new THREE.MeshStandardMaterial({
            color: 0xffffdd,
            transparent: true,
            opacity: 0.2,
            emissive: 0xffffbb,
            emissiveIntensity: 0.4,
            side: THREE.DoubleSide
        });
        const pulse1 = new THREE.Mesh(pulse1Geometry, pulse1Material);
        pulse1.position.y = 1;
        group.add(pulse1);
        
        // Outer pulse layer 2 (expanding outward)
        const pulse2Geometry = new THREE.SphereGeometry(2, 32, 32);
        const pulse2Material = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            transparent: true,
            opacity: 0.15,
            emissive: 0xffffcc,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        const pulse2 = new THREE.Mesh(pulse2Geometry, pulse2Material);
        pulse2.position.y = 1;
        group.add(pulse2);
        
        // Outer pulse layer 3 (expanding outward)
        const pulse3Geometry = new THREE.SphereGeometry(2, 32, 32);
        const pulse3Material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.1,
            emissive: 0xffffdd,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        });
        const pulse3 = new THREE.Mesh(pulse3Geometry, pulse3Material);
        pulse3.position.y = 1;
        group.add(pulse3);
        
        // Store references for animation
        group.userData.shield = shield;
        group.userData.pulse1 = pulse1;
        group.userData.pulse2 = pulse2;
        group.userData.pulse3 = pulse3;
        group.userData.startTime = Date.now();
        
        return group;
    }
    
    /**
     * Updates shield pulse animation
     */
    updateAnimation(shieldGroup: THREE.Group, _delta: number): void {
        const time = (Date.now() - shieldGroup.userData.startTime) / 1000;
        
        const shield = shieldGroup.userData.shield;
        const pulse1 = shieldGroup.userData.pulse1;
        const pulse2 = shieldGroup.userData.pulse2;
        const pulse3 = shieldGroup.userData.pulse3;
        
        // Main shield subtle pulsing
        if (shield) {
            const shieldPulse = 1 + Math.sin(time * 4) * 0.05;
            shield.scale.setScalar(shieldPulse);
            const shieldMaterial = shield.material as THREE.MeshStandardMaterial;
            shieldMaterial.emissiveIntensity = 0.5 + Math.sin(time * 6) * 0.15;
        }
        
        // Pulse layer 1 - expanding outward
        if (pulse1) {
            const pulse1Scale = 1 + Math.sin(time * 3) * 0.3;
            pulse1.scale.setScalar(pulse1Scale);
            const pulse1Material = pulse1.material as THREE.MeshStandardMaterial;
            pulse1Material.opacity = 0.2 * (1 - (pulse1Scale - 1) / 0.3);
        }
        
        // Pulse layer 2 - expanding outward (delayed)
        if (pulse2) {
            const pulse2Time = time - 0.2;
            const pulse2Scale = 1 + Math.sin(pulse2Time * 3) * 0.4;
            pulse2.scale.setScalar(pulse2Scale);
            const pulse2Material = pulse2.material as THREE.MeshStandardMaterial;
            pulse2Material.opacity = 0.15 * (1 - (pulse2Scale - 1) / 0.4);
        }
        
        // Pulse layer 3 - expanding outward (more delayed)
        if (pulse3) {
            const pulse3Time = time - 0.4;
            const pulse3Scale = 1 + Math.sin(pulse3Time * 3) * 0.5;
            pulse3.scale.setScalar(pulse3Scale);
            const pulse3Material = pulse3.material as THREE.MeshStandardMaterial;
            pulse3Material.opacity = 0.1 * (1 - (pulse3Scale - 1) / 0.5);
        }
    }
}

