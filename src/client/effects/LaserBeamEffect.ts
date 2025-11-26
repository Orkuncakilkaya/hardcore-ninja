import * as THREE from 'three';

/**
 * Manages laser beam visual effects
 */
export class LaserBeamEffect {
  constructor(_scene: THREE.Scene) {
    // Scene parameter kept for consistency with other effect classes
  }

  /**
   * Creates a realistic laser beam with glow and trail effects
   */
  createLaserBeam(startPos: THREE.Vector3, endPos: THREE.Vector3, thickness: number): THREE.Group {
    const group = new THREE.Group();

    const direction = endPos.clone().sub(startPos);
    const length = direction.length();
    const normalizedDir = direction.normalize();

    // Main laser core (bright red cylinder)
    const coreGeometry = new THREE.CylinderGeometry(thickness * 0.6, thickness * 0.6, length, 16);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 1.0,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.copy(startPos.clone().add(endPos).multiplyScalar(0.5));
    core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDir);
    group.add(core);

    // Outer glow layer 1 (bright red-orange)
    const glow1Geometry = new THREE.CylinderGeometry(thickness * 0.9, thickness * 0.9, length, 16);
    const glow1Material = new THREE.MeshStandardMaterial({
      color: 0xff4400,
      emissive: 0xff4400,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.7,
    });
    const glow1 = new THREE.Mesh(glow1Geometry, glow1Material);
    glow1.position.copy(core.position);
    glow1.quaternion.copy(core.quaternion);
    group.add(glow1);

    // Outer glow layer 2 (softer red)
    const glow2Geometry = new THREE.CylinderGeometry(thickness * 1.2, thickness * 1.2, length, 16);
    const glow2Material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.4,
    });
    const glow2 = new THREE.Mesh(glow2Geometry, glow2Material);
    glow2.position.copy(core.position);
    glow2.quaternion.copy(core.quaternion);
    group.add(glow2);

    // Outer glow layer 3 (ambient glow)
    const glow3Geometry = new THREE.CylinderGeometry(thickness * 1.5, thickness * 1.5, length, 16);
    const glow3Material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.2,
    });
    const glow3 = new THREE.Mesh(glow3Geometry, glow3Material);
    glow3.position.copy(core.position);
    glow3.quaternion.copy(core.quaternion);
    group.add(glow3);

    // Create particle trail along the laser
    const particleCount = Math.max(20, Math.floor(length * 3));
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);
    const particleColors = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const t = i / (particleCount - 1);
      const pos = startPos.clone().lerp(endPos, t);

      // Add slight randomness perpendicular to laser direction
      const perp1 = new THREE.Vector3(1, 0, 0);
      if (Math.abs(normalizedDir.dot(perp1)) > 0.9) {
        perp1.set(0, 1, 0);
      }
      const perp2 = normalizedDir.clone().cross(perp1).normalize();
      perp1.crossVectors(normalizedDir, perp2).normalize();

      const randomOffset = (Math.random() - 0.5) * thickness * 0.5;
      particlePositions[i3] = pos.x + perp1.x * randomOffset;
      particlePositions[i3 + 1] = pos.y + perp1.y * randomOffset;
      particlePositions[i3 + 2] = pos.z + perp1.z * randomOffset;

      particleSizes[i] = 0.05 + Math.random() * 0.1;

      // Color gradient (bright red -> orange -> yellow)
      const colorT = Math.random();
      if (colorT < 0.5) {
        particleColors[i3] = 1.0;
        particleColors[i3 + 1] = 0.2 + colorT * 0.3;
        particleColors[i3 + 2] = 0.0;
      } else {
        particleColors[i3] = 1.0;
        particleColors[i3 + 1] = 0.5 + (1 - colorT) * 0.3;
        particleColors[i3 + 2] = 0.0;
      }

      // Random velocities (outward from laser)
      particleVelocities[i3] = (Math.random() - 0.5) * 0.1;
      particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.1;
      particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(particleVelocities, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: true,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = particleVelocities;
    particles.userData.startTime = Date.now();
    group.add(particles);

    // Create impact effect at end position
    const impactGeometry = new THREE.SphereGeometry(thickness * 2, 16, 16);
    const impactMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 2.0,
      transparent: true,
      opacity: 0.8,
    });
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.copy(endPos);
    group.add(impact);

    // Store references for animation
    group.userData.core = core;
    group.userData.glow1 = glow1;
    group.userData.glow2 = glow2;
    group.userData.glow3 = glow3;
    group.userData.particles = particles;
    group.userData.impact = impact;
    group.userData.startTime = Date.now();
    group.userData.startPos = startPos.clone();
    group.userData.endPos = endPos.clone();

    return group;
  }

  /**
   * Updates laser beam animation
   */
  updateAnimation(laserGroup: THREE.Group, delta: number): void {
    const time = (Date.now() - laserGroup.userData.startTime) / 1000;

    // Animate core pulsing
    const core = laserGroup.userData.core;
    if (core) {
      const pulse = 1 + Math.sin(time * 20) * 0.1;
      core.scale.set(1, pulse, 1);
    }

    // Animate glow layers
    const glow1 = laserGroup.userData.glow1;
    const glow2 = laserGroup.userData.glow2;
    const glow3 = laserGroup.userData.glow3;

    if (glow1) {
      const glowPulse = 1 + Math.sin(time * 15) * 0.15;
      glow1.scale.set(1, glowPulse, 1);
      const material1 = glow1.material as THREE.MeshStandardMaterial;
      material1.emissiveIntensity = 2.0 + Math.sin(time * 18) * 0.5;
    }

    if (glow2) {
      const glowPulse = 1 + Math.sin(time * 12) * 0.1;
      glow2.scale.set(1, glowPulse, 1);
    }

    if (glow3) {
      const glowPulse = 1 + Math.sin(time * 10) * 0.08;
      glow3.scale.set(1, glowPulse, 1);
    }

    // Animate particles
    const particles = laserGroup.userData.particles;
    if (particles && particles.geometry) {
      const positions = particles.geometry.attributes.position;
      const velocities = particles.userData.velocities;
      const sizes = particles.geometry.attributes.size;
      const colors = particles.geometry.attributes.color as THREE.BufferAttribute;

      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;

        // Update position
        positions.array[i3] += velocities[i3] * delta * 2;
        positions.array[i3 + 1] += velocities[i3 + 1] * delta * 2;
        positions.array[i3 + 2] += velocities[i3 + 2] * delta * 2;

        // Fade out particles
        const life = time * 2;
        if (life > 1) {
          sizes.array[i] = 0;
          colors.array[i3] = 0;
          colors.array[i3 + 1] = 0;
          colors.array[i3 + 2] = 0;
        } else {
          sizes.array[i] = (0.05 + Math.random() * 0.1) * (1 - life);
          colors.array[i3] *= 1 - life * 0.5;
          colors.array[i3 + 1] *= 1 - life * 0.5;
          colors.array[i3 + 2] *= 1 - life * 0.5;
        }
      }

      positions.needsUpdate = true;
      sizes.needsUpdate = true;
      colors.needsUpdate = true;
    }

    // Animate impact effect
    const impact = laserGroup.userData.impact;
    if (impact) {
      const impactPulse = 1 + Math.sin(time * 25) * 0.3;
      impact.scale.setScalar(impactPulse);
      const impactMaterial = impact.material as THREE.MeshStandardMaterial;
      impactMaterial.opacity = 0.8 * (1 - Math.min(time * 2, 1));
    }
  }
}
