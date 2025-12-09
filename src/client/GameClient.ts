import * as THREE from 'three';
import { Renderer } from '../core/Renderer';
import { InputManager } from '../core/InputManager';
import { NetworkManager } from '../network/NetworkManager';
import { ClientEntityManager } from './ClientEntityManager';
import { UIManager } from '../core/UIManager';
import { AudioManager } from './AudioManager';
import type { NetworkMessage, JoinRequestMessage } from '../common/messages';
import type { GameState } from '../common/types';
import { SKILL_CONFIG, SkillType, TICK_INTERVAL, GameMode } from '../common/constants';
import { DynamicMapLoader } from '../core/DynamicMapLoader.ts';

// Declare custom event types
declare global {
  interface WindowEventMap {
    'network-data': CustomEvent<{ from: string; data: NetworkMessage }>;
    'game-started': CustomEvent<void>;
    'player-disconnected': CustomEvent<string>;
  }
}

export class GameClient {
  private renderer: Renderer;
  private inputManager: InputManager;
  private networkManager: NetworkManager;
  private entityManager: ClientEntityManager;
  private uiManager: UIManager;
  public audioManager: AudioManager;
  private isRunning: boolean = false;
  private clock: THREE.Clock;
  private localPlayerId: string | null = null;
  private isLeftMouseDown: boolean = false;
  private currentGameState: GameState | null = null;

  // Callbacks for React components
  private onSettingsToggle?: () => void;
  private onScoreboardToggle?: () => void;
  private onScoreboardClose?: () => void;

  // Getter for audioManager
  public getAudioManager(): AudioManager {
    return this.audioManager;
  }

  // Getter for localPlayerId
  public getLocalPlayerId(): string | null {
    return this.localPlayerId;
  }

  // Getter for currentGameState
  public getCurrentGameState(): GameState | null {
    return this.currentGameState;
  }

  // Setter for settings toggle callback
  public setOnSettingsToggle(callback: () => void) {
    this.onSettingsToggle = callback;
  }

  // Setter for scoreboard toggle callback
  public setOnScoreboardToggle(callback: () => void) {
    this.onScoreboardToggle = callback;
  }

  // Setter for scoreboard close callback
  public setOnScoreboardClose(callback: () => void) {
    this.onScoreboardClose = callback;
  }

  // Callback for host disconnection
  private onHostDisconnected?: () => void;

  public setOnHostDisconnected(callback: () => void) {
    this.onHostDisconnected = callback;
  }

  // Callback for game logs
  private onGameLog?: (message: string) => void;

  public setOnGameLog(callback: (message: string) => void) {
    this.onGameLog = callback;
  }

  // Network throttling
  private lastMovementSendTime: number = 0;
  private movementSendInterval: number = TICK_INTERVAL * 1000; // Send at tick rate
  private pendingMovementTarget: THREE.Vector3 | null = null;

  // Free camera for dead observers
  private isFreeCameraMode: boolean = false;
  private freeCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 20, 10);
  private freeCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraPanSpeed: number = 20; // Units per second

  constructor(networkManager: NetworkManager) {
    this.renderer = new Renderer();
    this.inputManager = new InputManager();
    this.networkManager = networkManager;
    this.audioManager = new AudioManager();
    this.entityManager = new ClientEntityManager(this.renderer.scene, this.audioManager);
    this.uiManager = new UIManager();
    this.clock = new THREE.Clock();

    this.setupNetworkHandlers();
    this.setupInputHandlers();
  }

  private setupNetworkHandlers() {
    window.addEventListener(
      'network-data',
      (e: CustomEvent<{ from: string; data: NetworkMessage }>) => {
        const { data } = e.detail;
        this.handleMessage(data);
      }
    );

    window.addEventListener('player-disconnected', () => {
      if (!this.networkManager.isHost) {
        // If we are a client and receive a disconnect event, it means the host has disconnected
        // (since clients only connect to the host)
        if (this.onHostDisconnected) {
          this.onHostDisconnected();
        }
      }
    });
  }

  private setupInputHandlers() {
    // Handle mouse down
    this.inputManager.on('mouseDown', () => {
      this.isLeftMouseDown = true;

      // Normal movement
      const target = this.inputManager.getMouseGroundIntersection(
        this.renderer.camera,
        this.entityManager.getPlayableAreaMeshes()
      );
      if (target) {
        this.pendingMovementTarget = target.clone();
        this.sendMovementRequest(target, true); // Immediate on mouse down
      }
    });

    // Handle mouse up
    this.inputManager.on('mouseUp', () => {
      const wasMoving = this.isLeftMouseDown;
      this.isLeftMouseDown = false;
      this.pendingMovementTarget = null;

      // Stop movement immediately when mouse is released
      if (wasMoving) {
        this.stopMovement();
      }
    });

    // Handle continuous mouse movement for movement and skill targeting
    this.inputManager.on('input', () => {
      if (!this.localPlayerId) return;

      const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
      if (!myPlayer) return;

      // Store pending target for movement
      if (this.isLeftMouseDown) {
        const target = this.inputManager.getMouseGroundIntersection(
          this.renderer.camera,
          this.entityManager.getPlayableAreaMeshes()
        );
        if (target) {
          this.pendingMovementTarget = target.clone();
          // Movement request will be sent in update loop with throttling
        }
      } else {
        this.pendingMovementTarget = null;
      }
    });

    // Handle skill key presses
    window.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'q') {
        this.fireTeleport();
      } else if (e.key.toLowerCase() === 'w') {
        this.fireHomingMissile();
      } else if (e.key.toLowerCase() === 'e') {
        this.fireLaserBeam();
      } else if (e.key.toLowerCase() === 'r') {
        this.activateInvincibility();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.toggleTabMenu();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.toggleSettingsMenu();
      }
    });

    window.addEventListener('keyup', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.hideTabMenu();
      }
    });
  }

  private sendMovementRequest(target: THREE.Vector3, immediate: boolean = false) {
    if (!this.localPlayerId) return;
    const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!myPlayer || myPlayer.isDead) return;

    const now = Date.now();

    // Throttle movement requests unless immediate
    if (!immediate && now - this.lastMovementSendTime < this.movementSendInterval) {
      return;
    }

    this.lastMovementSendTime = now;

    // Create click indicator effect (only on first send or immediate)
    if (immediate) {
      this.entityManager.createClickIndicator(target);
    }

    // Client-side prediction: server updates will handle position correction

    this.networkManager.sendToHost({
      type: 'PLAYER_INPUT',
      input: { keys: this.inputManager.keys, mouse: null },
      destination: { x: target.x, y: target.y, z: target.z },
      timestamp: now,
    });
  }

  private stopMovement() {
    if (!this.localPlayerId) return;
    const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!myPlayer || myPlayer.isDead) return;

    // Immediately stop local player movement (client-side prediction)
    if (myPlayer) {
      // Set target position to current position to stop interpolation
      myPlayer.targetPosition.copy(myPlayer.mesh.position);
      // Clear velocity
      myPlayer.velocity.set(0, 0, 0);
      // Clear position history to prevent interpolation
      myPlayer.positionHistory = [
        {
          position: myPlayer.mesh.position.clone(),
          timestamp: Date.now(),
        },
      ];
    }

    // Send stop command to server
    this.networkManager.sendToHost({
      type: 'PLAYER_INPUT',
      input: { keys: this.inputManager.keys, mouse: null },
      stopMovement: true,
      timestamp: Date.now(),
    });
  }

  private fireTeleport() {
    if (!this.localPlayerId) return;
    const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!myPlayer || myPlayer.isDead) return;

    // Check cooldown
    const now = Date.now();
    if (now < myPlayer.teleportCooldown) {
      return;
    }

    // Get current mouse position
    const target = this.inputManager.getMouseGroundIntersection(
      this.renderer.camera,
      this.entityManager.getPlayableAreaMeshes()
    );
    if (!target) return;

    // Calculate direction from player to mouse
    const playerPos = myPlayer.mesh.position;
    const direction = new THREE.Vector3().subVectors(target, playerPos);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.01) {
      // Mouse is too close, teleport forward
      const forward = new THREE.Vector3(0, 0, 1);
      const maxRange = SKILL_CONFIG[SkillType.TELEPORT].range;
      const finalPos = playerPos.clone().add(forward.multiplyScalar(maxRange));

      this.networkManager.sendToHost({
        type: 'SKILL_REQUEST',
        skillType: SkillType.TELEPORT,
        target: { x: finalPos.x, y: finalPos.y, z: finalPos.z },
        timestamp: now,
      });
      return;
    }

    // Normalize direction
    direction.normalize();

    // Clamp to max range
    const maxRange = SKILL_CONFIG[SkillType.TELEPORT].range;
    const clampedDistance = Math.min(distance, maxRange);
    const finalPos = playerPos.clone().add(direction.multiplyScalar(clampedDistance));

    // Send teleport request immediately to mouse position (within range)
    this.networkManager.sendToHost({
      type: 'SKILL_REQUEST',
      skillType: SkillType.TELEPORT,
      target: { x: finalPos.x, y: finalPos.y, z: finalPos.z },
      timestamp: now,
    });

    // Play teleport sound locally
    this.audioManager.playLocalSkillSound(SkillType.TELEPORT);
  }

  private fireHomingMissile() {
    if (!this.localPlayerId) return;
    const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!myPlayer || myPlayer.isDead) return;

    // Check cooldown
    const now = Date.now();
    if (now < myPlayer.homingMissileCooldown) {
      return;
    }

    // Get current mouse position
    const target = this.inputManager.getMouseGroundIntersection(
      this.renderer.camera,
      this.entityManager.getPlayableAreaMeshes()
    );
    if (!target) return;

    // Fire skill immediately at mouse position
    this.networkManager.sendToHost({
      type: 'SKILL_REQUEST',
      skillType: SkillType.HOMING_MISSILE,
      target: { x: target.x, y: target.y, z: target.z },
      timestamp: now,
    });

    // Play homing missile sound locally
    this.audioManager.playLocalSkillSound(SkillType.HOMING_MISSILE);
  }

  private fireLaserBeam() {
    if (!this.localPlayerId) return;
    const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!myPlayer || myPlayer.isDead) return;

    // Check cooldown
    const now = Date.now();
    if (now < myPlayer.laserBeamCooldown) {
      return;
    }

    // Get current mouse position
    const target = this.inputManager.getMouseGroundIntersection(
      this.renderer.camera,
      this.entityManager.getPlayableAreaMeshes()
    );
    if (!target) return;

    // Calculate direction from player to mouse
    const playerPos = myPlayer.mesh.position;
    const direction = target.clone().sub(playerPos);
    direction.y = 0;
    direction.normalize();

    // Fire skill immediately in mouse direction
    this.networkManager.sendToHost({
      type: 'SKILL_REQUEST',
      skillType: SkillType.LASER_BEAM,
      direction: { x: direction.x, y: direction.y, z: direction.z },
      timestamp: now,
    });

    // Play laser beam sound locally
    this.audioManager.playLocalSkillSound(SkillType.LASER_BEAM);
  }

  private activateInvincibility() {
    if (!this.localPlayerId) return;

    const myPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!myPlayer) return;
    if (myPlayer.isDead) return;

    const now = Date.now();
    if (now < myPlayer.invincibilityCooldown) {
      return;
    }

    this.networkManager.sendToHost({
      type: 'SKILL_REQUEST',
      skillType: SkillType.INVINCIBILITY,
      timestamp: Date.now(),
    });

    // Play invincibility sound locally
    this.audioManager.playLocalSkillSound(SkillType.INVINCIBILITY);
  }

  private async handleMessage(message: NetworkMessage) {
    switch (message.type) {
      case 'JOIN_RESPONSE':
        if (message.success && message.mapConfig) {
          this.localPlayerId = message.playerId;

          // Show loading overlay
          this.uiManager.showLoading('Loading Resources...');

          // If mapPath is provided, load the map from that path
          if (message.mapPath) {
            try {
              // Load dynamic map
              const dynamicMapConfig = await DynamicMapLoader.loadMap(message.mapPath, progress => {
                this.uiManager.updateLoadingProgress(progress * 0.5); // First 50% for loading map
              });

              // Load assets
              await DynamicMapLoader.loadAssets(dynamicMapConfig, progress => {
                this.uiManager.updateLoadingProgress(0.5 + progress * 0.5); // Last 50% for loading assets
              });

              // Use the map config from the server
              await this.entityManager.loadMap(message.mapConfig);
            } catch (error) {
              console.error('Error loading map from path:', error);
              // Fallback to using the provided mapConfig directly
              await this.entityManager.loadMap(message.mapConfig, progress => {
                this.uiManager.updateLoadingProgress(progress);
              });
            }
          } else {
            // No mapPath provided, use the mapConfig directly
            await this.entityManager.loadMap(message.mapConfig, progress => {
              this.uiManager.updateLoadingProgress(progress);
            });
          }

          // Hide loading overlay
          this.uiManager.hideLoading();

          this.networkManager.sendToHost({
            type: 'STATE_REQUEST',
          });

          this.start();
          this.setupHostActionButtons();
        }
        break;
      case 'GAME_STATE_UPDATE':
        if (this.localPlayerId) {
          // Detect joins and leaves
          if (this.currentGameState) {
            const prevPlayers = new Set(this.currentGameState.players.map(p => p.id));
            const newPlayers = new Set(message.state.players.map(p => p.id));

            // Check for joins
            message.state.players.forEach(p => {
              if (!prevPlayers.has(p.id)) {
                // New player joined
                const name = p.username || `Player ${p.id.substring(0, 4)}`;
                if (this.onGameLog) {
                  this.onGameLog(`${name} joined`);
                }
              }
            });

            // Check for leaves
            this.currentGameState.players.forEach(p => {
              if (!newPlayers.has(p.id)) {
                // Player left
                const name = p.username || `Player ${p.id.substring(0, 4)}`;
                if (this.onGameLog) {
                  this.onGameLog(`${name} left`);
                }
              }
            });
          }

          this.currentGameState = message.state;
          this.entityManager.updateState(message.state, this.localPlayerId);
          this.uiManager.update(message.state, this.localPlayerId, this.networkManager.isHost);
        }
        break;
    }
  }

  private toggleTabMenu() {
    if (this.onScoreboardToggle) {
      this.onScoreboardToggle();
    } else {
      // Fallback to old DOM-based method
      this.uiManager.showTabMenu();
    }
  }

  private hideTabMenu() {
    if (this.onScoreboardClose) {
      this.onScoreboardClose();
    } else {
      this.uiManager.hideTabMenu();
    }
  }

  private toggleSettingsMenu() {
    if (this.onSettingsToggle) {
      this.onSettingsToggle();
    } else {
      // Fallback to old DOM-based method
      this.uiManager.toggleSettingsMenu();
    }
  }

  private setupHostActionButtons() {
    const startButton = document.getElementById('btn-start-game');
    const restartButton = document.getElementById('btn-restart-game');

    if (startButton) {
      startButton.addEventListener('click', () => {
        if (this.networkManager.isHost) {
          this.networkManager.sendToHost({
            type: 'START_GAME',
          });
        }
      });
    }

    if (restartButton) {
      restartButton.addEventListener('click', () => {
        if (this.networkManager.isHost) {
          this.networkManager.sendToHost({
            type: 'RESTART_GAME',
          });
        }
      });
    }
  }

  public joinGame(_hostId: string) {
    const joinRequest: JoinRequestMessage = {
      type: 'JOIN_REQUEST',
      playerId: this.networkManager.peerId,
    };

    if (this.networkManager.playerName) {
      joinRequest.username = this.networkManager.playerName;
    }

    if (this.networkManager.playerAvatar) {
      joinRequest.avatar = this.networkManager.playerAvatar;
    }

    this.networkManager.sendToHost(joinRequest);
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    window.dispatchEvent(new CustomEvent('game-started'));
    this.uiManager.showHUD();

    // Initialize audio system
    try {
      await this.audioManager.init(this.renderer.camera);

      // Start playing background music
      this.audioManager.playBackgroundMusic();

      // Set audio manager for settings menu
      this.uiManager.setAudioManager(this.audioManager);
    } catch (error) {
      console.error('Failed to initialize audio system:', error);
    }

    this.animate();
  }

  public stop() {
    this.isRunning = false;
    this.uiManager.hideHUD();

    // Stop and dispose audio resources
    if (this.audioManager) {
      this.audioManager.dispose();
    }
  }

  private animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    this.update(delta);
    this.renderer.render();
  };

  private update(delta: number) {
    // Send pending movement requests with throttling
    if (this.pendingMovementTarget && this.isLeftMouseDown) {
      this.sendMovementRequest(this.pendingMovementTarget, false);
    }

    // Update Entities (Interpolation)
    this.entityManager.update(delta);

    // Update camera mode based on player state
    const wasFreeCameraMode = this.isFreeCameraMode;
    this.updateCameraMode();

    // Camera Follow or Free Camera
    if (this.localPlayerId) {
      const localEntity = this.entityManager.getPlayer(this.localPlayerId);
      
      if (this.isFreeCameraMode) {
        // Free camera mode - handle WASD panning
        this.updateFreeCamera(delta);
      } else if (localEntity) {
        // Normal player-locked camera
        this.renderer.camera.position.x = localEntity.mesh.position.x;
        this.renderer.camera.position.z = localEntity.mesh.position.z + 10;
        this.renderer.camera.lookAt(localEntity.mesh.position);
        
        // Update free camera position only when transitioning from free camera to player-lock
        if (wasFreeCameraMode) {
          this.freeCameraPosition.copy(this.renderer.camera.position);
          this.freeCameraTarget.copy(localEntity.mesh.position);
        }
      }
    }
  }

  private updateCameraMode() {
    // Determine if free camera should be enabled
    if (!this.localPlayerId || !this.currentGameState) {
      this.isFreeCameraMode = false;
      return;
    }

    const localPlayer = this.entityManager.getPlayer(this.localPlayerId);
    if (!localPlayer) {
      this.isFreeCameraMode = false;
      return;
    }

    // Enable free camera only if:
    // 1. Player is dead
    // 2. Game is NOT in warmup mode
    const isInRound = this.currentGameState.gameMode !== GameMode.WARMUP;
    const shouldEnableFreeCamera = localPlayer.isDead && isInRound;

    // Transition to free camera mode
    if (shouldEnableFreeCamera && !this.isFreeCameraMode) {
      this.isFreeCameraMode = true;
      // Initialize free camera at current camera position
      this.freeCameraPosition.copy(this.renderer.camera.position);
      this.freeCameraTarget.copy(localPlayer.mesh.position);
    } 
    // Transition back to player-locked camera
    else if (!shouldEnableFreeCamera && this.isFreeCameraMode) {
      this.isFreeCameraMode = false;
    }
  }

  private updateFreeCamera(delta: number) {
    // Handle WASD keys for camera panning
    const moveAmount = this.cameraPanSpeed * delta;
    const moveVector = new THREE.Vector3();

    // W/S for forward/backward (Z axis)
    if (this.inputManager.keys['KeyW']) {
      moveVector.z -= moveAmount;
    }
    if (this.inputManager.keys['KeyS']) {
      moveVector.z += moveAmount;
    }

    // A/D for left/right (X axis)
    if (this.inputManager.keys['KeyA']) {
      moveVector.x -= moveAmount;
    }
    if (this.inputManager.keys['KeyD']) {
      moveVector.x += moveAmount;
    }

    // Update camera position and target together
    this.freeCameraPosition.add(moveVector);
    this.freeCameraTarget.add(moveVector);

    // Apply the camera position
    this.renderer.camera.position.copy(this.freeCameraPosition);
    this.renderer.camera.lookAt(this.freeCameraTarget);
  }
}
