import { ServerEntityManager } from './ServerEntityManager';
import { NetworkManager } from '../network/NetworkManager';
import { TICK_RATE, TICK_INTERVAL, GameMode, GAME_CONFIG } from '../common/constants';
import type { MapConfig } from '../common/types';
import type { NetworkMessage } from '../common/messages';
import * as THREE from 'three';
import type { ServerPlayer } from './ServerPlayer.ts';

export class GameServer {
  private entityManager: ServerEntityManager;
  private networkManager: NetworkManager;
  private intervalId: number | null = null;
  private mapConfig: MapConfig;

  // Game state
  private gameMode: string = GameMode.WARMUP;
  private currentRound: number = 0;
  private totalRounds: number = GAME_CONFIG.ROUNDS_TO_WIN;
  private freezeTimeEnd: number = 0;
  private winnerId: string | undefined = undefined;
  private roundWinnerId: string | undefined = undefined;
  private playerRespawnEnabled: boolean = true; // In warmup mode, respawn is enabled

  constructor(networkManager: NetworkManager, mapConfig: MapConfig) {
    this.networkManager = networkManager;
    this.mapConfig = mapConfig;

    this.entityManager = new ServerEntityManager();
    this.entityManager.loadMap(this.mapConfig);

    this.setupNetworkHandlers();
  }

  private setupNetworkHandlers() {
    // We need a way to intercept messages intended for the server
    // Since NetworkManager is shared, we might need a specific "ServerNetworkAdapter" or similar.
    // For now, let's assume NetworkManager exposes an event or callback for received messages.

    // In the current architecture, NetworkManager dispatches window events.
    // This is browser-specific. The server logic should ideally be environment agnostic but we are running in browser (Host).
    // So we can listen to the same events, but we need to distinguish "Server" handling from "Client" handling.

    window.addEventListener(
      'network-data',
      (e: CustomEvent<{ from: string; data: NetworkMessage }>) => {
        if (!this.networkManager.isHost) return; // Only Host runs the server

        const { from, data } = e.detail;
        this.handleMessage(from, data);
      }
    );

    window.addEventListener('player-disconnected', (e: CustomEvent<string>) => {
      if (!this.networkManager.isHost) return;
      this.entityManager.removePlayer(e.detail);
      this.networkManager.broadcast({ type: 'PLAYER_DIED', id: e.detail }); // Or PLAYER_LEFT
    });
  }

  private handleMessage(playerId: string, message: NetworkMessage) {
    switch (message.type) {
      case 'JOIN_REQUEST': {
        // Handle join (actually PeerJS handles connection, this might be application level handshake)
        // For now, we assume connection = join.
        // But if we have a specific JOIN_REQUEST message:
        const player = this.entityManager.addPlayer(playerId);

        // Set player username if available
        if (message.username) {
          player.username = message.username;
        } else if (playerId === this.networkManager.peerId && this.networkManager.playerName) {
          // If this is the host player, use their player name
          player.username = this.networkManager.playerName;
        }

        // Set player avatar if available (for future use)
        if (message.avatar) {
          player.avatar = message.avatar;
        }

        this.networkManager.sendToClient(playerId, {
          type: 'JOIN_RESPONSE',
          success: true,
          mapConfig: this.mapConfig,
          playerId: playerId,
          spawnPosition: player.position,
        });
        break;
      }

      case 'START_GAME':
        if (this.networkManager.isHost && playerId === this.networkManager.peerId) {
          this.startGame();
        }
        break;

      case 'RESTART_GAME':
        if (this.networkManager.isHost && playerId === this.networkManager.peerId) {
          this.restartGame();
        }
        break;

      case 'PLAYER_INPUT': {
        const p = this.entityManager.getPlayer(playerId);
        if (p) {
          // Don't process input if player is dead or frozen
          if (p.isDead || p.isFrozen) {
            return;
          }

          if (message.stopMovement) {
            p.stopMovement();
          } else if (message.destination) {
            p.setDestination(
              new THREE.Vector3(message.destination.x, message.destination.y, message.destination.z)
            );
          }
        } else {
          console.warn(`Player ${playerId} not found for input`);
        }
        break;
      }

      case 'SKILL_REQUEST': {
        const sp = this.entityManager.getPlayer(playerId);
        if (sp) {
          if (message.skillType === 'TELEPORT' && message.target) {
            sp.attemptTeleport(
              new THREE.Vector3(message.target.x, message.target.y, message.target.z),
              this.entityManager.getObstacles()
            );
          } else if (message.skillType === 'HOMING_MISSILE' && message.target) {
            sp.attemptHomingMissile(
              new THREE.Vector3(message.target.x, message.target.y, message.target.z),
              this.entityManager
            );
          } else if (message.skillType === 'LASER_BEAM' && message.direction) {
            sp.attemptLaserBeam(message.direction, this.entityManager);
          } else if (message.skillType === 'INVINCIBILITY') {
            sp.attemptInvincibility();
          }
          // Handle other skills
        }
        break;
      }

      case 'STATE_REQUEST': {
        const baseState = this.entityManager.getState();
        const state = {
          ...baseState,
          gameMode: this.gameMode,
          currentRound: this.currentRound,
          totalRounds: this.totalRounds,
          freezeTimeEnd: this.freezeTimeEnd > 0 ? this.freezeTimeEnd : undefined,
          winnerId: this.winnerId,
          roundWinnerId: this.roundWinnerId,
        };
        this.networkManager.sendToClient(playerId, {
          type: 'GAME_STATE_UPDATE',
          state: state,
          timestamp: Date.now(),
        });
        break;
      }
    }
  }

  public start() {
    if (this.intervalId) return;

    // Add Host Player
    this.entityManager.addPlayer(this.networkManager.peerId);

    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000 / TICK_RATE);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    this.updateGameState();
    this.entityManager.update(TICK_INTERVAL);

    const state = {
      ...this.entityManager.getState(),
      gameMode: this.gameMode,
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      freezeTimeEnd: this.freezeTimeEnd > 0 ? this.freezeTimeEnd : undefined,
      winnerId: this.winnerId,
      roundWinnerId: this.roundWinnerId,
    };

    this.networkManager.broadcast({
      type: 'GAME_STATE_UPDATE',
      state: state,
      timestamp: Date.now(),
    });
  }

  private updateGameState() {
    const now = Date.now();

    // Handle freeze time
    if (this.gameMode === GameMode.FREEZE_TIME && now > this.freezeTimeEnd) {
      this.gameMode = GameMode.ROUND;
      // Enable player movement after freeze time
      this.entityManager.getPlayers().forEach(player => {
        player.isFrozen = false;
      });
    }

    // Handle round end
    if (this.gameMode === GameMode.ROUND_END && now > this.freezeTimeEnd) {
      // Start next round with freeze time
      this.startFreezeTime();
      // Clear round winner
      this.roundWinnerId = undefined;
    }

    // Handle player respawn in warmup mode
    if (this.gameMode === GameMode.WARMUP && this.playerRespawnEnabled) {
      this.entityManager.getPlayers().forEach(player => {
        if (player.isDead) {
          // Respawn player after 3 seconds in warmup mode
          if (!player.respawnTime) {
            player.respawnTime = now + 3000; // 3 seconds
          } else if (now >= player.respawnTime) {
            this.respawnPlayer(player);
          }
        }
      });
    }

    // Check if round is over (only one player alive)
    if (this.gameMode === GameMode.ROUND) {
      const alivePlayers = this.entityManager.getPlayers().filter(p => !p.isDead);

      if (alivePlayers.length === 1 && this.entityManager.getPlayers().length > 1) {
        // Round over, one player left
        const winner = alivePlayers[0];
        winner.lastPlayerAlive++; // Increment last player alive count

        // Set round winner
        this.roundWinnerId = winner.id;

        // Start round end freeze time
        this.gameMode = GameMode.ROUND_END;
        this.freezeTimeEnd = now + GAME_CONFIG.ROUND_END_DURATION;

        this.currentRound++;

        if (this.currentRound >= this.totalRounds) {
          // Game over
          this.gameMode = GameMode.GAME_OVER;
          this.winnerId = winner.id;
        }
      }
    }
  }

  private startFreezeTime() {
    this.gameMode = GameMode.FREEZE_TIME;
    this.freezeTimeEnd = Date.now() + GAME_CONFIG.FREEZE_TIME_DURATION;

    // Reset all players and respawn them at their assigned spawn points
    this.entityManager.getPlayers().forEach(player => {
      player.reset();
      player.isFrozen = true; // Freeze players during freeze time
      player.aliveStartTime = Date.now(); // Start tracking alive time

      // Respawn player at their assigned spawn point
      const spawnIndex = this.entityManager.getSpawnPointForPlayer(player.id);
      if (spawnIndex !== -1) {
        const spawnPos = this.entityManager.getSpawnPosition(spawnIndex);
        if (spawnPos) {
          // Set position to spawn point
          player.position.set(spawnPos.x, 0, spawnPos.y);
        }
      }
    });
  }

  public startGame() {
    if (
      this.gameMode !== GameMode.WARMUP ||
      this.entityManager.getPlayers().length < GAME_CONFIG.MIN_PLAYERS_TO_START
    ) {
      return false;
    }

    this.currentRound = 1;
    this.playerRespawnEnabled = false; // Disable respawn in round mode
    this.startFreezeTime();
    return true;
  }

  public restartGame() {
    this.gameMode = GameMode.WARMUP;
    this.currentRound = 0;
    this.playerRespawnEnabled = true;
    this.winnerId = undefined;
    this.roundWinnerId = undefined;

    // Reset all players
    this.entityManager.getPlayers().forEach(player => {
      player.reset();
      player.isFrozen = false;
      player.kills = 0;
      player.deaths = 0;
      player.lastPlayerAlive = 0;
    });

    return true;
  }

  private respawnPlayer(player: ServerPlayer) {
    // Find a spawn point
    const spawnIndex = this.entityManager.getSpawnPointForPlayer(player.id);
    if (spawnIndex !== -1) {
      const spawnPos = this.entityManager.getSpawnPosition(spawnIndex);
      if (spawnPos) {
        // Reset player
        player.reset();
        // Set position to spawn point
        player.position.set(spawnPos.x, 0, spawnPos.y);
        player.respawnTime = 0;
      }
    }
  }
}
