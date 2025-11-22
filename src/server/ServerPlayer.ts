import * as THREE from 'three';
import type { Vector3, PlayerState } from '../common/types';
import { SKILL_CONFIG } from '../common/constants';

export class ServerPlayer {
    public id: string;
    public position: THREE.Vector3;
    public rotation: THREE.Quaternion;
    public velocity: THREE.Vector3 = new THREE.Vector3();
    public destination: THREE.Vector3 | null = null;
    public isMoving: boolean = false;
    public speed: number = 10;

    // Health & Status
    public maxHealth: number = 100;
    public health: number = 100;
    public isInvulnerable: boolean = false;
    private invulnerableTimer: number = 0;

    // Teleport State
    public isTeleporting: boolean = false;
    public teleportCooldown: number = 0;
    private teleportDestination: THREE.Vector3 = new THREE.Vector3();
    private teleportSpeed: number = 50;

    // Skill System (We might need a ServerSkillSystem)
    // For now, let's keep it simple or reuse SkillSystem if it doesn't depend on rendering
    // The current SkillSystem depends on Player (which has mesh) and EntityManager (which has scene).
    // We need to refactor SkillSystem or create a ServerSkillSystem.
    // Let's assume we refactor SkillSystem later or mock it for now.

    constructor(id: string, startPosition: Vector3) {
        this.id = id;
        this.position = new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z);
        this.rotation = new THREE.Quaternion();
    }

    public setDestination(point: THREE.Vector3) {
        this.destination = point.clone();
        this.destination.y = this.position.y;
        this.isMoving = true;
        const direction = this.destination.clone().sub(this.position).normalize();
        this.velocity.copy(direction);
    }

    public stopMovement() {
        this.isMoving = false;
        this.destination = null;
        this.velocity.set(0, 0, 0);
    }

    public update(delta: number, obstacles: THREE.Box3[], otherPlayers: ServerPlayer[]) {
        // Update Invulnerability
        if (this.isInvulnerable) {
            this.invulnerableTimer -= delta;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
            }
        }

        if (this.isTeleporting) {
            const distanceToDest = this.position.distanceTo(this.teleportDestination);
            const moveDist = this.teleportSpeed * delta;

            if (distanceToDest <= moveDist) {
                this.position.copy(this.teleportDestination);
                this.isTeleporting = false;
            } else {
                const direction = this.teleportDestination.clone().sub(this.position).normalize();
                this.position.add(direction.multiplyScalar(moveDist));
            }
            return;
        }

        if (this.isMoving && this.destination) {
            const distanceToDestination = this.position.distanceTo(this.destination);
            const moveDistance = this.speed * delta;

            if (distanceToDestination <= moveDistance) {
                this.position.copy(this.destination);
                this.stopMovement();
            } else {
                const moveVector = this.velocity.clone().multiplyScalar(moveDistance);
                const potentialPosition = this.position.clone().add(moveVector);

                // Collision Detection
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    potentialPosition.clone().add(new THREE.Vector3(0, 1, 0)),
                    new THREE.Vector3(1, 2, 1)
                );

                let collision = false;

                // Check collision with obstacles
                for (const obstacleBox of obstacles) {
                    if (playerBox.intersectsBox(obstacleBox)) {
                        collision = true;
                        break;
                    }
                }

                // Check collision with other players
                if (!collision) {
                    for (const otherPlayer of otherPlayers) {
                        if (otherPlayer.id !== this.id) {
                            const otherPlayerBox = new THREE.Box3().setFromCenterAndSize(
                                otherPlayer.position.clone().add(new THREE.Vector3(0, 1, 0)),
                                new THREE.Vector3(1, 2, 1)
                            );
                            if (playerBox.intersectsBox(otherPlayerBox)) {
                                collision = true;
                                break;
                            }
                        }
                    }
                }

                if (collision) {
                    this.stopMovement();
                } else {
                    this.position.add(moveVector);
                }
            }

            // Map Boundary
            const MAP_LIMIT = 35;
            this.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.position.x));
            this.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.position.z));
        }
    }

    public attemptTeleport(target: Vector3): boolean {
        const now = Date.now();
        if (now < this.teleportCooldown) {
            return false;
        }

        // Validate range
        const currentPos = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
        const targetPos = new THREE.Vector3(target.x, target.y, target.z);
        const distance = currentPos.distanceTo(targetPos);

        if (distance > SKILL_CONFIG.TELEPORT.range + 1) { // +1 buffer for latency/float errors
            return false;
        }

        // Validate bounds (simple map bounds check)
        if (target.x < -50 || target.x > 50 || target.z < -50 || target.z > 50) {
            return false;
        }

        // Perform teleport
        this.position.set(target.x, target.y, target.z);
        this.isTeleporting = true;
        this.teleportCooldown = now + SKILL_CONFIG.TELEPORT.cooldown;

        // Reset teleporting flag after a short delay (e.g., 1 tick)
        setTimeout(() => {
            this.isTeleporting = false;
        }, 50);

        return true;
    }

    public getState(): PlayerState {
        return {
            id: this.id,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z, w: this.rotation.w },
            health: this.health,
            maxHealth: this.maxHealth,
            isInvulnerable: this.isInvulnerable,
            isMoving: this.isMoving,
            teleportCooldown: this.teleportCooldown,
            isTeleporting: this.isTeleporting
        };
    }
}
