import * as THREE from 'three';

/**
 * Manages invincibility shield visual effects
 */
export class InvincibilityEffect {
  constructor(_scene: THREE.Scene) {
    // Scene parameter kept for consistency with other effect classes
  }

  /**
   * Creates an invincibility shield sphere with dome effect
   */
  createShield(): THREE.Group {
    const group = new THREE.Group();

    // Main shield sphere (Light Yellow, Additive Blending)
    const shieldGeometry = new THREE.SphereGeometry(2, 32, 32);
    const shieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffdd, // Light Yellow
      transparent: true,
      opacity: 0.1, // Significantly reduced opacity
      emissive: 0xffffaa, // Yellowish emissive
      emissiveIntensity: 0.2, // Reduced intensity
      side: THREE.DoubleSide,
      depthWrite: false, // Prevent occluding player inside
      blending: THREE.AdditiveBlending, // Additive blending for glow effect without mixing
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.y = 1; // Center at player's chest height
    group.add(shield);

    // Single outer dome layer (expanding outward)
    // Removed multiple layers to reduce visual noise and mixing artifacts
    const dome1Geometry = new THREE.SphereGeometry(2, 32, 32);
    const dome1Material = new THREE.MeshStandardMaterial({
      color: 0xffffdd,
      transparent: true,
      opacity: 0.05, // Very subtle
      emissive: 0xffffbb,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dome1 = new THREE.Mesh(dome1Geometry, dome1Material);
    dome1.position.y = 1;
    group.add(dome1);

    // Store references for animation
    group.userData.shield = shield;
    group.userData.dome1 = dome1;
    group.userData.startTime = Date.now();

    return group;
  }

  /**
   * Updates shield dome animation
   */
  updateAnimation(shieldGroup: THREE.Group, _delta: number): void {
    const time = (Date.now() - shieldGroup.userData.startTime) / 1000;

    const shield = shieldGroup.userData.shield;
    const dome1 = shieldGroup.userData.dome1;

    // Main shield subtle pulsing
    if (shield) {
      // Scale oscillates between 1.0 and 1.05 (never below 1.0 to avoid clipping)
      const shieldPulse = 1.0 + (0.5 + 0.5 * Math.sin(time * 2)) * 0.05;
      shield.scale.setScalar(shieldPulse);
      const shieldMaterial = shield.material as THREE.MeshStandardMaterial;
      // Slower, subtle intensity pulse
      shieldMaterial.emissiveIntensity = 0.2 + (0.5 + 0.5 * Math.sin(time * 3)) * 0.1;
    }

    // Dome layer - expanding outward
    if (dome1) {
      // Scale oscillates between 1.05 and 1.3 (always larger than main shield)
      const dome1Scale = 1.05 + (0.5 + 0.5 * Math.sin(time * 1.5)) * 0.25;
      dome1.scale.setScalar(dome1Scale);
      const dome1Material = dome1.material as THREE.MeshStandardMaterial;
      // Fade out as it expands
      dome1Material.opacity = 0.05 * (1 - (dome1Scale - 1.05) / 0.25);
    }
  }
}
