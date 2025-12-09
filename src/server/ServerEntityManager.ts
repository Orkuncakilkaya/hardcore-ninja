import * as THREE from 'three';
import { ServerPlayer } from './ServerPlayer';
import { ServerMissile } from './ServerMissile';
import { ServerLaserBeam } from './ServerLaserBeam';
import type { DynamicMapConfig } from '../common/types/MapTypes';
import { DynamicMapLoader } from '../core/DynamicMapLoader';
import { SKILL_CONFIG, SkillType } from '../common/constants';

export class ServerEntityManager {
  public players: Map<string, ServerPlayer> = new Map();
  public missiles: ServerMissile[] = [];
  public laserBeams: ServerLaserBeam[] = [];
  public obstacles: THREE.Box3[] = [];
  public spawnPositions: THREE.Vector2[] = [];
  private claimedSpawnPoints: Map<string, number> = new Map();

  constructor() {}

  public loadMap(config: DynamicMapConfig) {
    this.obstacles = [];

    this.loadDynamicMap(config);

    // Shuffle spawn points
    for (let i = this.spawnPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnPositions[i], this.spawnPositions[j]] = [
        this.spawnPositions[j],
        this.spawnPositions[i],
      ];
    }
  }

  /**
   * Load a map using the new dynamic format
   * @param config Dynamic map configuration
   */
  private loadDynamicMap(config: DynamicMapConfig) {
    // Process all transforms to create collision boxes and spawn points
    for (const transform of config.transforms) {
      // Handle spawn points
      if (transform.entity === 'spawn') {
        // Map JSON (x, y, z) to World (x, z)
        this.spawnPositions.push(new THREE.Vector2(transform.position.x, transform.position.z));
        continue;
      }

      // Handle mesh objects with collision
      if (transform.mesh) {
        const meshDef = config.meshes[transform.mesh];
        if (meshDef && meshDef.collision) {
          // Create collision box
          const collisionBox = DynamicMapLoader.createCollisionBox(transform, meshDef);

          // Only add to obstacles if it's not a playable area
          if (collisionBox && transform.isPlayableArea !== true) {
            this.obstacles.push(collisionBox);
          }
        }
      }
    }
  }

  public addPlayer(id: string): ServerPlayer {
    // Find spawn point
    const spawnPos = new THREE.Vector3(0, 0, 0);
    const claimedIndices = new Set(this.claimedSpawnPoints.values());

    let found = false;
    for (let i = 0; i < this.spawnPositions.length; i++) {
      if (!claimedIndices.has(i)) {
        this.claimedSpawnPoints.set(id, i);
        spawnPos.set(this.spawnPositions[i].x, 0, this.spawnPositions[i].y);
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`No free spawn points for ${id}, spawning at 0,0,0`);
    }

    const player = new ServerPlayer(id, { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z });
    this.players.set(id, player);
    return player;
  }

  public removePlayer(id: string) {
    this.players.delete(id);
    this.claimedSpawnPoints.delete(id);
  }

  public getPlayer(id: string): ServerPlayer | undefined {
    return this.players.get(id);
  }

  public update(delta: number) {
    const allPlayers = Array.from(this.players.values());
    this.players.forEach(player => {
      player.update(delta, this.obstacles, allPlayers);
    });

    // Update Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i];
      missile.update(delta, this);
      if (missile.shouldRemove()) {
        this.missiles.splice(i, 1);
      }
    }

    // Update Laser Beams
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const beam = this.laserBeams[i];

      // Check if expired
      if (beam.isExpired()) {
        this.laserBeams.splice(i, 1);
        continue;
      }

      // Check collisions with players
      this.players.forEach(player => {
        if (beam.checkCollision(player.position, player.id)) {
          const config = SKILL_CONFIG[SkillType.LASER_BEAM];
          player.takeDamage(config.damage, beam.ownerId, this);
        }
      });
    }
  }

  public addMissile(missile: ServerMissile) {
    this.missiles.push(missile);
  }

  public addLaserBeam(beam: ServerLaserBeam) {
    this.laserBeams.push(beam);
  }

  public getObstacles(): THREE.Box3[] {
    return this.obstacles;
  }

  public getPlayers(): ServerPlayer[] {
    return Array.from(this.players.values());
  }

  public getSpawnPointForPlayer(playerId: string): number {
    // Return the claimed spawn point for this player, or -1 if none
    return this.claimedSpawnPoints.get(playerId) ?? -1;
  }

  public getSpawnPosition(index: number): THREE.Vector2 | undefined {
    // Return the spawn position at the given index, or undefined if out of bounds
    return this.spawnPositions[index];
  }

  public getState() {
    return {
      players: Array.from(this.players.values()).map(p => p.getState()),
      missiles: this.missiles.map(m => m.getState()),
      laserBeams: this.laserBeams.map(b => b.getState()),
      timestamp: Date.now(),
    };
  }
}
