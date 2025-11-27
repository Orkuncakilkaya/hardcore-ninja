import * as THREE from 'three';
import { ServerPlayer } from './ServerPlayer';
import { ServerMissile } from './ServerMissile';
import { ServerLaserBeam } from './ServerLaserBeam';
import type { MapConfig } from '../common/types';
import { SKILL_CONFIG, SkillType } from '../common/constants';

export class ServerEntityManager {
  public players: Map<string, ServerPlayer> = new Map();
  public missiles: ServerMissile[] = [];
  public laserBeams: ServerLaserBeam[] = [];
  public obstacles: THREE.Box3[] = [];
  public spawnPositions: THREE.Vector2[] = [];
  private claimedSpawnPoints: Map<string, number> = new Map();
  private mapLimit: number = 35; // Default value, will be set from JSON

  constructor() {}

  public loadMap(config: MapConfig) {
    this.obstacles = [];

    // Store map limit from playableArea.size (half size because it's centered at 0,0)
    this.mapLimit = config.playableArea.size / 2;

    // Walls
    config.walls.forEach(wall => {
      const pos = new THREE.Vector3(wall.position.x, wall.position.y, wall.position.z);
      const size = new THREE.Vector3(
        wall.dimensions.width,
        wall.dimensions.height,
        wall.dimensions.depth
      );
      const box = new THREE.Box3().setFromCenterAndSize(pos, size);
      this.obstacles.push(box);
    });

    // Boxes
    config.boxes.forEach(box => {
      const pos = new THREE.Vector3(box.position.x, box.position.y, box.position.z);
      const size = new THREE.Vector3(
        box.dimensions.width,
        box.dimensions.height,
        box.dimensions.depth
      );
      const box3 = new THREE.Box3().setFromCenterAndSize(pos, size);
      this.obstacles.push(box3);
    });

    // Spawn Points
    // Map JSON (x, y) to World (x, z)
    this.spawnPositions = config.spawnPoints.map(sp => new THREE.Vector2(sp.x, sp.y));

    // Shuffle spawn points
    for (let i = this.spawnPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnPositions[i], this.spawnPositions[j]] = [
        this.spawnPositions[j],
        this.spawnPositions[i],
      ];
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

    const player = new ServerPlayer(
      id,
      { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
      this.mapLimit
    );
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
          const killedPlayerId = player.takeDamage(config.damage, beam.ownerId);

          // Increment kill count for the attacker if player died
          if (killedPlayerId) {
            const attacker = this.getPlayer(beam.ownerId);
            if (attacker) {
              attacker.kills++;
            }
          }
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
