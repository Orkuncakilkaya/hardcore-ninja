import * as THREE from 'three';
import { SKILL_CONFIG, SkillType } from '../common/constants';
import type { MissileState } from '../common/types';
import { ServerEntityManager } from './ServerEntityManager';

export class ServerMissile {
  public id: string;
  public ownerId: string;
  public position: THREE.Vector3;
  public rotation: THREE.Quaternion;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public targetId: string | null = null;

  private lifeTime: number;
  private speed: number;
  private damage: number;
  private isDead: boolean = false;

  constructor(
    id: string,
    ownerId: string,
    startPosition: THREE.Vector3,
    targetId: string | null,
    initialDirection: THREE.Vector3
  ) {
    this.id = id;
    this.ownerId = ownerId;
    this.position = startPosition.clone();
    this.rotation = new THREE.Quaternion();
    this.targetId = targetId;

    const config = SKILL_CONFIG[SkillType.HOMING_MISSILE];
    this.lifeTime = config.duration;
    this.speed = config.speed;
    this.damage = config.damage;

    // Initial velocity
    this.velocity = initialDirection.normalize().multiplyScalar(this.speed);
    this.updateRotation();
  }

  public update(delta: number, entityManager: ServerEntityManager) {
    if (this.isDead) return;

    this.lifeTime -= delta * 1000;
    if (this.lifeTime <= 0) {
      this.isDead = true;
      return;
    }

    // Homing Logic
    if (this.targetId) {
      const targetPlayer = entityManager.getPlayer(this.targetId);
      if (targetPlayer && targetPlayer.health > 0) {
        const direction = targetPlayer.position.clone().sub(this.position).normalize();
        // Steer towards target
        const steerStrength = 5 * delta; // Adjust steering strength
        this.velocity.lerp(direction.multiplyScalar(this.speed), steerStrength);
      } else {
        // Target lost or dead, continue straight
        this.targetId = null;
      }
    }

    // Move
    const moveStep = this.velocity.clone().multiplyScalar(delta);
    const nextPosition = this.position.clone().add(moveStep);

    // Collision Detection
    if (this.checkCollisions(nextPosition, entityManager)) {
      this.isDead = true;
      return;
    }

    this.position.copy(nextPosition);
    this.updateRotation();
  }

  private updateRotation() {
    if (this.velocity.lengthSq() > 0.001) {
      const lookAt = new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        this.velocity,
        new THREE.Vector3(0, 1, 0)
      );
      this.rotation.setFromRotationMatrix(lookAt);
    }
  }

  private checkCollisions(
    nextPosition: THREE.Vector3,
    entityManager: ServerEntityManager
  ): boolean {
    // Create a small box for the missile
    const missileBox = new THREE.Box3().setFromCenterAndSize(
      nextPosition,
      new THREE.Vector3(0.5, 0.5, 0.5)
    );

    // Check Walls & Boxes
    // We need access to walls and boxes. ServerEntityManager should provide them.
    // Assuming ServerEntityManager has getObstacles() or similar.
    // Wait, ServerPlayer uses `obstacles: THREE.Box3[]` passed in update.
    // Let's assume we can access them via entityManager for now, or we need to pass them.
    // Looking at ServerEntityManager, it has `walls` and `boxes`.

    const obstacles = entityManager.getObstacles();
    for (const obstacle of obstacles) {
      if (missileBox.intersectsBox(obstacle)) {
        return true; // Hit wall/box
      }
    }

    // Check Players
    const players = entityManager.getPlayers();
    for (const player of players) {
      if (player.id === this.ownerId) continue; // Don't hit self
      if (player.health <= 0) continue;

      const playerBox = new THREE.Box3().setFromCenterAndSize(
        player.position.clone().add(new THREE.Vector3(0, 1, 0)),
        new THREE.Vector3(1, 2, 1)
      );

      if (missileBox.intersectsBox(playerBox)) {
        // Hit player
        player.takeDamage(this.damage);
        return true;
      }
    }

    return false;
  }

  public getState(): MissileState {
    return {
      id: this.id,
      ownerId: this.ownerId,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z, w: this.rotation.w },
      targetId: this.targetId,
    };
  }

  public shouldRemove(): boolean {
    return this.isDead;
  }
}
