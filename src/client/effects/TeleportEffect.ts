import * as THREE from 'three';
import { ParticleUtils } from './ParticleUtils';
import { SKILL_CONFIG, SkillType } from '../../common/constants';

export interface TeleportEffectData {
  trail: THREE.Line | null;
  trailParticles: THREE.Points | null;
  startEffect: THREE.Group | null;
  endEffect: THREE.Group | null;
}

/**
 * Manages teleport skill visual effects
 */
export class TeleportEffect {
  private scene: THREE.Scene;
  private teleportRadiusMesh?: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createTeleportRadius();
  }

  /**
   * Creates the teleport radius indicator mesh
   */
  private createTeleportRadius(): void {
    const tpConfig = SKILL_CONFIG[SkillType.TELEPORT];
    const tpGeo = new THREE.RingGeometry(tpConfig.range - 0.5, tpConfig.range, 32);
    const tpMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    this.teleportRadiusMesh = new THREE.Mesh(tpGeo, tpMat);
    this.teleportRadiusMesh.rotation.x = -Math.PI / 2;
    this.teleportRadiusMesh.position.y = 0.15; // Above ground (accounting for displacement)
    this.teleportRadiusMesh.visible = false;
    this.scene.add(this.teleportRadiusMesh);
  }

  /**
   * Shows or hides the teleport radius indicator
   */
  public setRadiusVisible(visible: boolean): void {
    if (this.teleportRadiusMesh) {
      this.teleportRadiusMesh.visible = visible;
    }
  }

  /**
   * Updates the teleport radius position
   */
  public updateRadiusPosition(position: THREE.Vector3): void {
    if (this.teleportRadiusMesh && this.teleportRadiusMesh.visible) {
      this.teleportRadiusMesh.position.x = position.x;
      this.teleportRadiusMesh.position.z = position.z;
    }
  }

  /**
   * Creates start effect (portal ring and particles at start position)
   */
  createStartEffect(position: THREE.Vector3): THREE.Group {
    const ringGeometry = new THREE.RingGeometry(0.3, 0.6, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = 0.15; // Above ground (accounting for displacement)

    // Create particle burst
    const particles = ParticleUtils.createParticleBurst(position, 0x00ffff);

    const effectGroup = new THREE.Group();
    effectGroup.add(ring);
    effectGroup.add(particles);
    this.scene.add(effectGroup);

    // Animate and fade out
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0.5) {
        this.scene.remove(effectGroup);
        return;
      }

      ring.scale.setScalar(1 + elapsed * 2);
      ringMaterial.opacity = 0.8 * (1 - elapsed * 2);
      (particles.material as THREE.PointsMaterial).opacity = 1 - elapsed * 2;

      requestAnimationFrame(animate);
    };
    animate();

    return effectGroup;
  }

  /**
   * Creates end effect (portal ring and particles at end position)
   */
  createEndEffect(position: THREE.Vector3): THREE.Group {
    const ringGeometry = new THREE.RingGeometry(0.3, 0.6, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = 0.15; // Above ground (accounting for displacement)
    ring.scale.setScalar(0.5);

    // Create particle burst
    const particles = ParticleUtils.createParticleBurst(position, 0x00ffff);

    const effectGroup = new THREE.Group();
    effectGroup.add(ring);
    effectGroup.add(particles);
    this.scene.add(effectGroup);

    // Animate and fade out
    const startTime = Date.now();
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0.5) {
        this.scene.remove(effectGroup);
        return;
      }

      ring.scale.setScalar(0.5 + elapsed * 1.5);
      ringMaterial.opacity = 0.8 * (1 - elapsed * 2);
      (particles.material as THREE.PointsMaterial).opacity = 1 - elapsed * 2;

      requestAnimationFrame(animate);
    };
    animate();

    return effectGroup;
  }

  /**
   * Creates trail effect between start and end positions
   */
  createTrail(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3
  ): { trail: THREE.Line; trailParticles: THREE.Points } {
    // Create trail line
    const geometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      linewidth: 3,
    });

    const trail = new THREE.Line(geometry, material);
    trail.userData.startTime = Date.now();
    this.scene.add(trail);

    // Create particle trail
    const distance = startPos.distanceTo(endPos);
    const particleCount = Math.max(20, Math.floor(distance * 5));
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1);
      const pos = startPos.clone().lerp(endPos, t);
      const i3 = i * 3;
      trailPositions[i3] = pos.x;
      trailPositions[i3 + 1] = pos.y + 0.5;
      trailPositions[i3 + 2] = pos.z;
    }

    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));

    const trailMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    const trailParticles = new THREE.Points(trailGeometry, trailMaterial);
    trailParticles.userData.startTime = Date.now();
    this.scene.add(trailParticles);

    return { trail, trailParticles };
  }

  /**
   * Updates trail to current position
   */
  updateTrail(
    trail: THREE.Line,
    trailParticles: THREE.Points,
    startPos: THREE.Vector3,
    currentPos: THREE.Vector3
  ): void {
    // Update trail line
    const positions = trail.geometry.attributes.position;
    positions.setXYZ(0, startPos.x, startPos.y, startPos.z);
    positions.setXYZ(1, currentPos.x, currentPos.y, currentPos.z);
    positions.needsUpdate = true;

    // Fade out trail
    const elapsed = (Date.now() - trail.userData.startTime) / 1000;
    const fadeDuration = 0.3;
    if (elapsed < fadeDuration) {
      const opacity = 0.8 * (1 - elapsed / fadeDuration);
      (trail.material as THREE.LineBasicMaterial).opacity = opacity;
      (trailParticles.material as THREE.PointsMaterial).opacity = opacity;
    }
  }

  /**
   * Cleans up trail effects with fade out
   */
  cleanupTrail(trail: THREE.Line | null, trailParticles: THREE.Points | null): void {
    if (trail) {
      const startTime = Date.now();
      const fadeOut = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0.5) {
          this.scene.remove(trail);
          return;
        }
        const opacity = 0.8 * (1 - elapsed * 2);
        (trail.material as THREE.LineBasicMaterial).opacity = opacity;
        requestAnimationFrame(fadeOut);
      };
      fadeOut();
    }

    if (trailParticles) {
      const startTime = Date.now();
      const fadeOut = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0.5) {
          this.scene.remove(trailParticles);
          return;
        }
        const opacity = 0.9 * (1 - elapsed * 2);
        (trailParticles.material as THREE.PointsMaterial).opacity = opacity;
        requestAnimationFrame(fadeOut);
      };
      fadeOut();
    }
  }

  /**
   * Updates player transparency during teleport
   */
  public updatePlayerTransparency(bodyMesh: THREE.Mesh | undefined, isTeleporting: boolean): void {
    if (bodyMesh) {
      const material = bodyMesh.material as THREE.MeshStandardMaterial;
      if (isTeleporting) {
        material.transparent = true;
        material.opacity = 0.5;
      } else {
        material.opacity = 1.0;
      }
    }
  }

  /**
   * Updates teleport trail particle effects
   */
  public updateTrailParticles(trailParticles: THREE.Points | null, delta: number): void {
    if (trailParticles) {
      ParticleUtils.updateParticleEffect(trailParticles, delta);
    }
  }

  /**
   * Updates start/end effect particles
   */
  public updateEffectParticles(effect: THREE.Group | null, delta: number): void {
    if (effect) {
      // Find particles in the effect group
      effect.children.forEach(child => {
        if (child instanceof THREE.Points) {
          ParticleUtils.updateParticleEffect(child, delta);
        }
      });
    }
  }
}
