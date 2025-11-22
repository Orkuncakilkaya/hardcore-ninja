import * as THREE from 'three';
import type { Vector3, LaserBeamState } from '../common/types';
import { SKILL_CONFIG, SkillType } from '../common/constants';

export class ServerLaserBeam {
    public id: string;
    public ownerId: string;
    public startPosition: THREE.Vector3;
    public endPosition: THREE.Vector3;
    public expiresAt: number;
    private hitPlayers: Set<string> = new Set(); // Track players already damaged

    constructor(id: string, ownerId: string, startPos: Vector3, endPos: Vector3) {
        this.id = id;
        this.ownerId = ownerId;
        this.startPosition = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
        this.endPosition = new THREE.Vector3(endPos.x, endPos.y, endPos.z);

        const config = SKILL_CONFIG[SkillType.LASER_BEAM];
        this.expiresAt = Date.now() + config.lifetime;
    }

    public isExpired(): boolean {
        return Date.now() >= this.expiresAt;
    }

    public checkCollision(playerPos: THREE.Vector3, playerId: string): boolean {
        // Don't damage owner
        if (playerId === this.ownerId) return false;

        // Don't damage same player twice
        if (this.hitPlayers.has(playerId)) return false;

        // Check if player capsule intersects with beam cylinder
        const config = SKILL_CONFIG[SkillType.LASER_BEAM];
        const beamRadius = config.thickness;

        // Player is a capsule: center at playerPos + (0, 1, 0), height 2, radius 0.5
        const playerCenter = new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z);
        const playerRadius = 0.5;
        const playerHeight = 2;

        // Calculate closest point on beam line segment to player center
        const beamDir = this.endPosition.clone().sub(this.startPosition);
        const beamLength = beamDir.length();
        beamDir.normalize();

        const toPlayer = playerCenter.clone().sub(this.startPosition);
        const projection = toPlayer.dot(beamDir);
        const clampedProjection = Math.max(0, Math.min(beamLength, projection));

        const closestPoint = this.startPosition.clone().add(beamDir.clone().multiplyScalar(clampedProjection));
        const distance = playerCenter.distanceTo(closestPoint);

        // Check if distance is within combined radii
        if (distance <= beamRadius + playerRadius) {
            // Also check vertical overlap (simplified)
            const verticalDist = Math.abs(closestPoint.y - playerCenter.y);
            if (verticalDist <= playerHeight / 2) {
                this.hitPlayers.add(playerId);
                return true;
            }
        }

        return false;
    }

    public getState(): LaserBeamState {
        return {
            id: this.id,
            ownerId: this.ownerId,
            startPosition: { x: this.startPosition.x, y: this.startPosition.y, z: this.startPosition.z },
            endPosition: { x: this.endPosition.x, y: this.endPosition.y, z: this.endPosition.z },
            expiresAt: this.expiresAt
        };
    }
}
