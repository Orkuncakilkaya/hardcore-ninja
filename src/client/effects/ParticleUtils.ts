import * as THREE from 'three';

/**
 * Utility functions for creating and managing particle effects
 */
export class ParticleUtils {
  /**
   * Creates a particle burst effect at a given position
   */
  static createParticleBurst(
    position: THREE.Vector3,
    color: number,
    count: number = 30
  ): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Random position around center
      positions[i3] = position.x + (Math.random() - 0.5) * 0.5;
      positions[i3 + 1] = position.y + Math.random() * 0.5;
      positions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * 2;
      velocities[i3 + 1] = Math.random() * 2;
      velocities[i3 + 2] = (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.1,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.userData.velocities = velocities;
    points.userData.startTime = Date.now();

    return points;
  }

  /**
   * Updates particle effect positions based on velocities
   */
  static updateParticleEffect(effect: THREE.Object3D, delta: number): void {
    effect.traverse(child => {
      if (child instanceof THREE.Points && child.userData.velocities) {
        const positions = child.geometry.attributes.position;
        const velocities = child.userData.velocities;

        for (let i = 0; i < positions.count; i++) {
          const i3 = i * 3;
          positions.array[i3] += velocities[i3] * delta;
          positions.array[i3 + 1] += velocities[i3 + 1] * delta;
          positions.array[i3 + 2] += velocities[i3 + 2] * delta;

          // Apply gravity
          velocities[i3 + 1] -= 9.8 * delta;
        }

        positions.needsUpdate = true;
      }
    });
  }
}
