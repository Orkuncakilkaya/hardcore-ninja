import * as THREE from 'three';
import type { Vector3, PlayerState } from '../common/types';
import { SKILL_CONFIG, SkillType } from '../common/constants';
import { ServerEntityManager } from './ServerEntityManager';
import { ServerMissile } from './ServerMissile';
import { ServerLaserBeam } from './ServerLaserBeam';

export class ServerPlayer {
    public id: string;
    public username?: string; // Player's display name
    public avatar?: string; // Player's avatar (for future use)
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
    public isDead: boolean = false;
    public isFrozen: boolean = false;

    // Stats
    public kills: number = 0;
    public deaths: number = 0;
    public lastPlayerAlive: number = 0;
    public aliveStartTime: number = 0;
    public respawnTime: number = 0;

    // Teleport State
    public isTeleporting: boolean = false;
    public teleportCooldown: number = 0;
    private teleportDestination: THREE.Vector3 = new THREE.Vector3();
    private teleportSpeed: number = 50;

    // Homing Missile State
    public homingMissileCooldown: number = 0;

    // Laser Beam State
    public laserBeamCooldown: number = 0;

    // Invincibility State
    public invincibilityCooldown: number = 0;

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

        // Don't update movement if player is frozen or dead
        if (this.isFrozen || this.isDead) {
            return;
        }

        // Teleport movement (no collision during teleport)
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
            return; // Skip collision checks during teleport
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

    public attemptTeleport(target: Vector3, obstacles: THREE.Box3[]): boolean {
        if (this.isDead) return false;
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

        // Validate bounds (map limits)
        const MAP_LIMIT = 35;
        if (target.x < -MAP_LIMIT || target.x > MAP_LIMIT || target.z < -MAP_LIMIT || target.z > MAP_LIMIT) {
            console.log('Teleport rejected: out of bounds');
            return false;
        }

        // Check if destination is inside an obstacle
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(target.x, target.y + 1, target.z),
            new THREE.Vector3(1, 2, 1)
        );

        for (const obstacleBox of obstacles) {
            if (playerBox.intersectsBox(obstacleBox)) {
                console.log('Teleport rejected: destination inside obstacle');
                return false;
            }
        }

        // Perform teleport
        this.teleportDestination.set(target.x, target.y, target.z);
        this.isTeleporting = true;
        this.teleportCooldown = now + SKILL_CONFIG.TELEPORT.cooldown;

        return true;
    }

    public attemptHomingMissile(mousePos: Vector3, entityManager: ServerEntityManager): boolean {
        if (this.isDead) return false;
        const now = Date.now();
        if (now < this.homingMissileCooldown) {
            return false;
        }

        const config = SKILL_CONFIG[SkillType.HOMING_MISSILE];

        // Find target
        // Check if any enemy is within mouseRadius of mousePos
        const mouseV = new THREE.Vector3(mousePos.x, mousePos.y, mousePos.z);
        let targetId: string | null = null;
        let minDistance = config.mouseRadius;

        const players = entityManager.getPlayers();
        for (const player of players) {
            if (player.id === this.id) continue; // Skip self
            if (player.health <= 0) continue;

            const dist = player.position.distanceTo(mouseV);
            if (dist <= config.mouseRadius && dist < minDistance) {
                minDistance = dist;
                targetId = player.id;
            }
        }

        // Create Missile
        // Spawn at player position
        const spawnPos = this.position.clone();
        spawnPos.y = 1; // Spawn at chest height

        // Initial direction: Towards mouse cursor
        const direction = mouseV.clone().sub(spawnPos).normalize();

        const missileId = `missile_${this.id}_${now}`;
        const missile = new ServerMissile(missileId, this.id, spawnPos, targetId, direction);

        entityManager.addMissile(missile);

        this.homingMissileCooldown = now + config.cooldown;
        return true;
    }

    public attemptLaserBeam(direction: Vector3, entityManager: ServerEntityManager): boolean {
        if (this.isDead) return false;
        const now = Date.now();
        if (now < this.laserBeamCooldown) {
            return false;
        }

        const config = SKILL_CONFIG[SkillType.LASER_BEAM];

        // Normalize direction
        const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();

        // Start position at player chest height
        const startPos = this.position.clone();
        startPos.y = 1;

        // Calculate end position at max range
        const endPos = startPos.clone().add(dir.multiplyScalar(config.range));

        // Perform raycast to check for walls/obstacles
        const raycaster = new THREE.Raycaster(startPos, dir, 0, config.range);
        const obstacles = entityManager.getObstacles();

        let actualEndPos = endPos;
        let minDistance = config.range;

        // Check intersection with each obstacle
        for (const obstacleBox of obstacles) {
            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectBox(obstacleBox, intersection)) {
                const dist = startPos.distanceTo(intersection);
                if (dist < minDistance) {
                    minDistance = dist;
                    actualEndPos = intersection;
                }
            }
        }

        // Create laser beam
        const beamId = `laser_${this.id}_${now}`;
        const beam = new ServerLaserBeam(
            beamId,
            this.id,
            { x: startPos.x, y: startPos.y, z: startPos.z },
            { x: actualEndPos.x, y: actualEndPos.y, z: actualEndPos.z }
        );

        entityManager.addLaserBeam(beam);
        this.laserBeamCooldown = now + config.cooldown;
        return true;
    }

    public takeDamage(amount: number) {
        if (this.isDead) return;
        if (this.isInvulnerable) return;
        this.health = Math.max(0, this.health - amount);
        if (this.health <= 0) {
            // Handle death
            this.isDead = true;
            this.deaths++;
            this.aliveStartTime = 0; // Stop tracking alive time
            console.log(`Player ${this.id} took ${amount} damage. Health: ${this.health}. Player is dead.`);
        }
    }

    public attemptInvincibility(): boolean {
        if (this.isDead) return false;
        const now = Date.now();
        if (now < this.invincibilityCooldown) {
            return false;
        }

        const config = SKILL_CONFIG[SkillType.INVINCIBILITY];

        // Activate invincibility
        this.isInvulnerable = true;
        this.invulnerableTimer = config.duration / 1000; // Convert to seconds
        this.invincibilityCooldown = now + config.cooldown;

        return true;
    }

    public reset() {
        // Reset health and status
        this.health = this.maxHealth;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.isDead = false;
        this.isFrozen = false;
        this.respawnTime = 0;

        // Reset movement
        this.stopMovement();

        // Reset cooldowns
        const now = Date.now();
        this.teleportCooldown = now;
        this.homingMissileCooldown = now;
        this.laserBeamCooldown = now;
        this.invincibilityCooldown = now;

        // Start tracking alive time
        this.aliveStartTime = now;
    }

    public getState(): PlayerState {
        return {
            id: this.id,
            username: this.username,
            avatar: this.avatar,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z, w: this.rotation.w },
            health: this.health,
            maxHealth: this.maxHealth,
            isInvulnerable: this.isInvulnerable,
            isMoving: this.isMoving,
            teleportCooldown: this.teleportCooldown,
            isTeleporting: this.isTeleporting,
            homingMissileCooldown: this.homingMissileCooldown,
            laserBeamCooldown: this.laserBeamCooldown,
            invincibilityCooldown: this.invincibilityCooldown,
            isDead: this.isDead,
            isFrozen: this.isFrozen,
            kills: this.kills,
            deaths: this.deaths,
            lastPlayerAlive: this.lastPlayerAlive
        };
    }
}
