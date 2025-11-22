import * as THREE from 'three';
import { Box } from '../entities/Box';
import type { GameState, MapConfig } from '../common/types';
import { SKILL_CONFIG, SkillType } from '../common/constants';
import { TeleportEffect } from './effects/TeleportEffect';
import { MissileEffect } from './effects/MissileEffect';
import { LaserBeamEffect } from './effects/LaserBeamEffect';
import { InvincibilityEffect } from './effects/InvincibilityEffect';
import { ClickIndicatorEffect } from './effects/ClickIndicatorEffect';
import { PlayerModel } from './models/PlayerModel';

interface ClientPlayer {
    mesh: THREE.Group;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Quaternion;
    teleportCooldown: number;
    homingMissileCooldown: number;
    laserBeamCooldown: number;
    invincibilityCooldown: number;
    invincibilitySphere: THREE.Group | null;
    isDead: boolean;
    bodyMesh: THREE.Mesh; // Reference to the body mesh for easier access
    bodyGroup: THREE.Group; // Group containing body and eyes (for rotation)
    healthBar: THREE.Group | null; // Reference to the healthbar mesh
    nameLabel: THREE.Sprite | null; // Reference to the player name label
    leftShoe: THREE.Group; // Reference to left shoe for animation
    rightShoe: THREE.Group; // Reference to right shoe for animation
    health: number; // Current health value
    maxHealth: number; // Maximum health value
    isTeleporting: boolean; // Whether player is currently teleporting
    previousPosition: THREE.Vector3; // Previous position for trail
    teleportTrail: THREE.Line | null; // Trail effect during teleport
    teleportStartEffect: THREE.Group | null; // Start position effect
    teleportEndEffect: THREE.Group | null; // End position effect
    teleportTrailParticles: THREE.Points | null; // Particle trail
    walkAnimationTime: number; // Time accumulator for walk animation
}

export class ClientEntityManager {
    public scene: THREE.Scene;
    public players: Map<string, ClientPlayer> = new Map();
    public boxes: Box[] = [];
    public walls: Box[] = [];
    public missiles: Map<string, THREE.Group> = new Map();
    public laserBeams: Map<string, THREE.Group> = new Map();
    private laserPreviewLine?: THREE.Line; // For Laser Beam preview
    private localPlayerId: string | null = null;
    
    // Skill effect managers
    private teleportEffect: TeleportEffect;
    private missileEffect: MissileEffect;
    private laserBeamEffect: LaserBeamEffect;
    private invincibilityEffect: InvincibilityEffect;
    private clickIndicatorEffect: ClickIndicatorEffect;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.teleportEffect = new TeleportEffect(scene);
        this.missileEffect = new MissileEffect(scene);
        this.laserBeamEffect = new LaserBeamEffect(scene);
        this.invincibilityEffect = new InvincibilityEffect(scene);
        this.clickIndicatorEffect = new ClickIndicatorEffect(scene);
        this.createSkillRadii();
    }

    private createSkillRadii() {
        // Skill radii are now managed by their respective effect classes
    }

    public setSkillTargeting(skillType: SkillType | null, isTargeting: boolean) {
        this.teleportEffect.setRadiusVisible(false);
        this.missileEffect.setTargetingVisible(false);
        if (this.laserPreviewLine) this.laserPreviewLine.visible = false;

        if (!isTargeting || !skillType) return;

        if (skillType === SkillType.TELEPORT) {
            this.teleportEffect.setRadiusVisible(true);
        } else if (skillType === SkillType.HOMING_MISSILE) {
            this.missileEffect.setTargetingVisible(true);
        } else if (skillType === SkillType.LASER_BEAM) {
            if (!this.laserPreviewLine) {
                this.createLaserPreviewLine();
            }
            if (this.laserPreviewLine) this.laserPreviewLine.visible = true;
        }
    }

    public updateMouseRadiusPosition(position: THREE.Vector3) {
        // Get player position for distance check
        const myPlayer = this.players.get(this.localPlayerId || '');
        if (myPlayer) {
            this.missileEffect.updateMouseRadiusPosition(position, myPlayer.mesh.position);
        }
    }

    public loadMap(config: MapConfig) {
        // Create walls and boxes
        config.walls.forEach(wall => {
            const box = new Box(wall.id, new THREE.Vector3(wall.position.x, wall.position.y, wall.position.z), wall.dimensions.width, wall.dimensions.height, wall.dimensions.depth, wall.color);
            this.walls.push(box);
            this.scene.add(box.mesh);
        });

        config.boxes.forEach(box => {
            const b = new Box(box.id, new THREE.Vector3(box.position.x, box.position.y, box.position.z), box.dimensions.width, box.dimensions.height, box.dimensions.depth, box.color);
            this.boxes.push(b);
            this.scene.add(b.mesh);
        });
    }

    public updateState(gameState: GameState, myPeerId: string) {
        this.localPlayerId = myPeerId;
        const activeIds = new Set<string>();

        gameState.players.forEach(playerState => {
            activeIds.add(playerState.id);
            let clientPlayer = this.players.get(playerState.id);

            if (!clientPlayer) {
                const { group, body, bodyGroup, healthBar, nameLabel, leftShoe, rightShoe } = this.createPlayerMesh(playerState.id === myPeerId);
                group.position.set(playerState.position.x, playerState.position.y, playerState.position.z); // Set initial position
                this.scene.add(group);
                clientPlayer = {
                    mesh: group,
                    bodyMesh: body,
                    bodyGroup: bodyGroup,
                    healthBar: healthBar,
                    nameLabel: nameLabel,
                    leftShoe: leftShoe,
                    rightShoe: rightShoe,
                    health: playerState.health,
                    maxHealth: playerState.maxHealth,
                    targetPosition: new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z),
                    targetRotation: new THREE.Quaternion(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z, playerState.rotation.w),
                    teleportCooldown: playerState.teleportCooldown,
                    homingMissileCooldown: playerState.homingMissileCooldown,
                    laserBeamCooldown: playerState.laserBeamCooldown,
                    invincibilityCooldown: playerState.invincibilityCooldown,
                    invincibilitySphere: null,
                    isDead: playerState.isDead,
                    isTeleporting: playerState.isTeleporting || false,
                    previousPosition: new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z),
                    teleportTrail: null,
                    teleportStartEffect: null,
                    teleportEndEffect: null,
                    teleportTrailParticles: null,
                    walkAnimationTime: 0
                };

                // Set player name if available
                if (playerState.username) {
                    this.updatePlayerNameLabel(nameLabel, playerState.username);
                } else if (playerState.id === myPeerId) {
                    this.updatePlayerNameLabel(nameLabel, "You");
                } else {
                    this.updatePlayerNameLabel(nameLabel, "Player " + playerState.id.substring(0, 4));
                }

                this.players.set(playerState.id, clientPlayer);
            } else {
                // Update targets for interpolation
                clientPlayer.targetPosition.set(playerState.position.x, playerState.position.y, playerState.position.z);
                clientPlayer.targetRotation.set(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z, playerState.rotation.w);
                clientPlayer.teleportCooldown = playerState.teleportCooldown;
                clientPlayer.homingMissileCooldown = playerState.homingMissileCooldown;
                clientPlayer.laserBeamCooldown = playerState.laserBeamCooldown;
                clientPlayer.invincibilityCooldown = playerState.invincibilityCooldown;
                
                // Handle teleport effects
                const wasTeleporting = clientPlayer.isTeleporting;
                clientPlayer.isTeleporting = playerState.isTeleporting || false;
                
                if (!wasTeleporting && clientPlayer.isTeleporting) {
                    // Teleport just started - save start position and create effects
                    clientPlayer.previousPosition.copy(clientPlayer.mesh.position);
                    clientPlayer.teleportStartEffect = this.teleportEffect.createStartEffect(clientPlayer.mesh.position);
                    const trailData = this.teleportEffect.createTrail(clientPlayer.previousPosition, clientPlayer.targetPosition);
                    clientPlayer.teleportTrail = trailData.trail;
                    clientPlayer.teleportTrailParticles = trailData.trailParticles;
                } else if (wasTeleporting && !clientPlayer.isTeleporting) {
                    // Teleport just ended - create end effect and clean up trail
                    clientPlayer.teleportEndEffect = this.teleportEffect.createEndEffect(clientPlayer.targetPosition);
                    this.teleportEffect.cleanupTrail(clientPlayer.teleportTrail, clientPlayer.teleportTrailParticles);
                    clientPlayer.teleportTrail = null;
                    clientPlayer.teleportTrailParticles = null;
                } else if (clientPlayer.isTeleporting && clientPlayer.teleportTrail && clientPlayer.teleportTrailParticles) {
                    // Still teleporting - update trail
                    this.teleportEffect.updateTrail(
                        clientPlayer.teleportTrail,
                        clientPlayer.teleportTrailParticles,
                        clientPlayer.previousPosition,
                        clientPlayer.mesh.position
                    );
                }
                
                // Update previous position for next frame
                if (!clientPlayer.isTeleporting) {
                    clientPlayer.previousPosition.copy(clientPlayer.mesh.position);
                }

                // Update health and healthbar
                if (clientPlayer.health !== playerState.health || clientPlayer.maxHealth !== playerState.maxHealth) {
                    clientPlayer.health = playerState.health;
                    clientPlayer.maxHealth = playerState.maxHealth;

                    // Update healthbar if it exists
                    if (clientPlayer.healthBar) {
                        this.updateHealthBarSegments(clientPlayer.healthBar, clientPlayer.health, clientPlayer.maxHealth);

                        // Hide healthbar if player is dead
                        clientPlayer.healthBar.visible = !playerState.isDead;
                    }
                }

                // Update player name if changed
                if (playerState.username && clientPlayer.nameLabel) {
                    // If player is local, always show "You"
                    if (playerState.id === myPeerId) {
                        this.updatePlayerNameLabel(clientPlayer.nameLabel, "You");
                    } else {
                        this.updatePlayerNameLabel(clientPlayer.nameLabel, playerState.username);
                    }
                }

                // Update invincibility sphere visibility
                if (playerState.isInvulnerable) {
                    if (!clientPlayer.invincibilitySphere) {
                        clientPlayer.invincibilitySphere = this.invincibilityEffect.createShield();
                        clientPlayer.mesh.add(clientPlayer.invincibilitySphere);
                    }
                } else {
                    if (clientPlayer.invincibilitySphere) {
                        clientPlayer.mesh.remove(clientPlayer.invincibilitySphere);
                        clientPlayer.invincibilitySphere = null;
                    }
                }

                // Handle dead state changes
                if (playerState.isDead !== clientPlayer.isDead) {
                    clientPlayer.isDead = playerState.isDead;

                    if (playerState.isDead) {
                        // Player is dead - turn gray and rotate to lay down
                        (clientPlayer.bodyMesh.material as THREE.MeshStandardMaterial).color.set(0x808080); // Gray color

                        // Rotate player to lay down (90 degrees around X axis)
                        clientPlayer.mesh.rotation.x = Math.PI / 2;

                        // Hide healthbar and name label when player is dead
                        if (clientPlayer.healthBar) {
                            clientPlayer.healthBar.visible = false;
                        }
                    } else {
                        // Player is alive again - restore original color based on whether it's local or not
                        const isLocal = playerState.id === myPeerId;
                        (clientPlayer.bodyMesh.material as THREE.MeshStandardMaterial).color.set(isLocal ? 0x00ff00 : 0xff0000);

                        // Reset rotation
                        clientPlayer.mesh.rotation.x = 0;

                        // Show healthbar when player is alive
                        if (clientPlayer.healthBar) {
                            clientPlayer.healthBar.visible = true;
                            // Update healthbar to current health
                            this.updateHealthBarSegments(clientPlayer.healthBar, clientPlayer.health, clientPlayer.maxHealth);
                        }
                    }
                }
            }

            // Update skill radius positions if targeting
            if (playerState.id === myPeerId && clientPlayer) {
                this.teleportEffect.updateRadiusPosition(clientPlayer.mesh.position);
                this.missileEffect.updatePlayerRadiusPosition(clientPlayer.mesh.position);
            }
        });

        // Update Missiles
        const activeMissileIds = new Set<string>();
        if (gameState.missiles) {
            gameState.missiles.forEach(missileState => {
                activeMissileIds.add(missileState.id);
                let missileMesh = this.missiles.get(missileState.id);
                if (!missileMesh) {
                    missileMesh = this.missileEffect.createMissile();
                    this.scene.add(missileMesh);
                    this.missiles.set(missileState.id, missileMesh);
                }
                
                missileMesh.position.set(missileState.position.x, missileState.position.y, missileState.position.z);
                missileMesh.quaternion.set(missileState.rotation.x, missileState.rotation.y, missileState.rotation.z, missileState.rotation.w);
            });
        }

        // Remove destroyed missiles
        for (const [id, mesh] of this.missiles) {
            if (!activeMissileIds.has(id)) {
                this.scene.remove(mesh);
                this.missiles.delete(id);
            }
        }

        // Update Laser Beams
        const activeLaserIds = new Set<string>();
        if (gameState.laserBeams) {
            gameState.laserBeams.forEach(laserState => {
                activeLaserIds.add(laserState.id);
                let laserGroup = this.laserBeams.get(laserState.id);
                if (!laserGroup) {
                    const config = SKILL_CONFIG[SkillType.LASER_BEAM];
                    const startPos = new THREE.Vector3(laserState.startPosition.x, laserState.startPosition.y, laserState.startPosition.z);
                    const endPos = new THREE.Vector3(laserState.endPosition.x, laserState.endPosition.y, laserState.endPosition.z);
                    laserGroup = this.laserBeamEffect.createLaserBeam(startPos, endPos, config.thickness);
                    this.scene.add(laserGroup);
                    this.laserBeams.set(laserState.id, laserGroup);
                }
            });
        }

        // Remove expired laser beams
        for (const [id, mesh] of this.laserBeams) {
            if (!activeLaserIds.has(id)) {
                this.scene.remove(mesh);
                this.laserBeams.delete(id);
            }
        }

        // Remove disconnected players
        for (const [id, player] of this.players) {
            if (!activeIds.has(id)) {
                this.scene.remove(player.mesh);
                this.players.delete(id);
            }
        }
    }

    public update(delta: number) {
        // Get camera for billboard effect
        const camera = this.scene.getObjectByProperty('type', 'PerspectiveCamera') as THREE.Camera;

        // Interpolate
        this.players.forEach(player => {
            // Skip position interpolation for dead players (they should be frozen in place)
            if (!player.isDead) {
                const previousPosition = player.mesh.position.clone();
                const wasMoving = player.mesh.position.distanceTo(player.targetPosition) > 0.01;
                player.mesh.position.lerp(player.targetPosition, 10 * delta);
                player.mesh.quaternion.slerp(player.targetRotation, 10 * delta);
                
                // Rotate body group to face movement direction
                if (player.bodyGroup && wasMoving) {
                    const direction = new THREE.Vector3()
                        .subVectors(player.targetPosition, previousPosition)
                        .normalize();
                    
                    if (direction.length() > 0.01) {
                        // Calculate rotation angle around Y axis
                        const angle = Math.atan2(direction.x, direction.z);
                        // Smoothly rotate body group to face movement direction
                        player.bodyGroup.rotation.y = THREE.MathUtils.lerp(
                            player.bodyGroup.rotation.y,
                            angle,
                            15 * delta
                        );
                    }
                }
                
                // Animate shoes when walking
                if (wasMoving && !player.isDead) {
                    player.walkAnimationTime += delta * 8; // Walking speed multiplier
                    
                    // Animate shoes up and down (alternating)
                    const leftShoeLift = Math.abs(Math.sin(player.walkAnimationTime)) * 0.15;
                    const rightShoeLift = Math.abs(Math.sin(player.walkAnimationTime + Math.PI)) * 0.15;
                    
                    // Rotate shoes slightly for walking effect
                    const leftShoeRotation = Math.sin(player.walkAnimationTime) * 0.3;
                    const rightShoeRotation = Math.sin(player.walkAnimationTime + Math.PI) * 0.3;
                    
                    if (player.leftShoe) {
                        player.leftShoe.position.y = leftShoeLift;
                        player.leftShoe.rotation.x = leftShoeRotation;
                    }
                    
                    if (player.rightShoe) {
                        player.rightShoe.position.y = rightShoeLift;
                        player.rightShoe.rotation.x = rightShoeRotation;
                    }
                } else {
                    // Reset shoes to ground when not moving
                    if (player.leftShoe) {
                        player.leftShoe.position.y = 0;
                        player.leftShoe.rotation.x = 0;
                    }
                    if (player.rightShoe) {
                        player.rightShoe.position.y = 0;
                        player.rightShoe.rotation.x = 0;
                    }
                }
                
                // Update teleport trail if teleporting
                if (player.isTeleporting && player.teleportTrail && player.teleportTrailParticles) {
                    this.teleportEffect.updateTrail(
                        player.teleportTrail,
                        player.teleportTrailParticles,
                        player.previousPosition,
                        player.mesh.position
                    );
                }
                
                // Update teleport particle effects
                this.teleportEffect.updateEffectParticles(player.teleportStartEffect, delta);
                this.teleportEffect.updateEffectParticles(player.teleportEndEffect, delta);
                this.teleportEffect.updateTrailParticles(player.teleportTrailParticles, delta);
                
                // Update player transparency during teleport
                this.teleportEffect.updatePlayerTransparency(player.bodyMesh, player.isTeleporting);
            }

            // Make healthbar face the camera (billboard effect)
            if (player.healthBar && camera) {
                // Save the original y rotation
                const originalRotationX = player.healthBar.rotation.x;

                // Make the healthbar face the camera
                player.healthBar.lookAt(camera.position);

                // Restore the original y rotation (we only want to rotate around y axis)
                player.healthBar.rotation.x = originalRotationX;
            }
        });
        
        // Update laser beam animations
        this.laserBeams.forEach((laserGroup) => {
            this.laserBeamEffect.updateAnimation(laserGroup, delta);
        });
        
        // Update missile animations
        this.missiles.forEach((missileGroup) => {
            this.missileEffect.updateAnimation(missileGroup, delta);
        });
        
        // Update invincibility shield animations
        this.players.forEach((player) => {
            if (player.invincibilitySphere) {
                this.invincibilityEffect.updateAnimation(player.invincibilitySphere, delta);
            }
        });
    }
    
    public getPlayer(id: string): ClientPlayer | undefined {
        return this.players.get(id);
    }

    private createPlayerMesh(isLocal: boolean): { group: THREE.Group, body: THREE.Mesh, bodyGroup: THREE.Group, healthBar: THREE.Group, nameLabel: THREE.Sprite, leftShoe: THREE.Group, rightShoe: THREE.Group } {
        return PlayerModel.createPlayerMesh(
            isLocal,
            (health, maxHealth) => this.createHealthBar(health, maxHealth),
            (name) => this.createPlayerNameLabel(name)
        );
    }


    private createHealthBar(health: number, maxHealth: number): THREE.Group {
        const healthBarGroup = new THREE.Group();

        // Constants for healthbar appearance
        const barWidth = 3.0;
        const barHeight = 0.4;
        const barDepth = 0.05;
        const borderThickness = 0.02;
        const numSegments = 5; // Number of segments/slices in the healthbar
        const segmentSpacing = 0.02; // Space between segments
        const segmentWidth = (barWidth - (numSegments - 1) * segmentSpacing) / numSegments;

        // Create border (slightly larger than the healthbar)
        const borderGeometry = new THREE.BoxGeometry(
            barWidth + borderThickness * 2, 
            barHeight + borderThickness * 2, 
            barDepth
        );
        const borderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 }); // Black border
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        healthBarGroup.add(border);

        // Create background (empty health area)
        const bgGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth + 0.01); // Slightly in front
        const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Dark gray background
        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        healthBarGroup.add(background);

        // Create segments container
        const segmentsGroup = new THREE.Group();
        healthBarGroup.add(segmentsGroup);

        // Create individual segments
        for (let i = 0; i < numSegments; i++) {
            const segmentGeometry = new THREE.BoxGeometry(segmentWidth, barHeight, barDepth + 0.02); // Slightly in front of background
            const segmentMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green for health
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            // Position segment (left-aligned with spacing)
            segment.position.x = -barWidth/2 + segmentWidth/2 + i * (segmentWidth + segmentSpacing);

            segmentsGroup.add(segment);
        }

        // Position the healthbar above the player
        healthBarGroup.position.y = 3.5; // Above player's head

        // Make the healthbar always face the camera
        healthBarGroup.rotation.x = -Math.PI / 6; // Slight tilt for better visibility

        // Update the healthbar to show the current health
        this.updateHealthBarSegments(healthBarGroup, health, maxHealth);

        return healthBarGroup;
    }

    private createPlayerNameLabel(name: string): THREE.Sprite {
        // Create a canvas to draw the text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set canvas size
        canvas.width = 256;
        canvas.height = 64;

        if (context) {
            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Set text style
            context.font = 'bold 32px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            // Add background with rounded corners
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 10, true, false);

            // Draw text
            context.fillStyle = 'white';
            context.fillText(name || 'Player', canvas.width / 2, canvas.height / 2);
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        // Create sprite material
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });

        // Create sprite
        const sprite = new THREE.Sprite(material);

        // Scale sprite
        sprite.scale.set(3, 0.75, 1);

        // Position sprite above healthbar
        sprite.position.y = 0.8; // Position above healthbar

        return sprite;
    }

    // Helper method to draw rounded rectangles on canvas
    private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: boolean, stroke: boolean) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }

    private updateHealthBarSegments(healthBarGroup: THREE.Group, health: number, maxHealth: number) {
        if (!healthBarGroup) return;

        const segmentsGroup = healthBarGroup.children[2] as THREE.Group;
        if (!segmentsGroup) return;

        const numSegments = segmentsGroup.children.length;
        const healthPercentage = health / maxHealth;
        const activeSegments = Math.ceil(healthPercentage * numSegments);

        // Update segment colors based on health percentage
        for (let i = 0; i < numSegments; i++) {
            const segment = segmentsGroup.children[i] as THREE.Mesh;
            const material = segment.material as THREE.MeshBasicMaterial;

            if (i < activeSegments) {
                // Active segment - color based on health percentage
                if (healthPercentage > 0.6) {
                    material.color.set(0x00ff00); // Green for high health
                } else if (healthPercentage > 0.3) {
                    material.color.set(0xffff00); // Yellow for medium health
                } else {
                    material.color.set(0xff0000); // Red for low health
                }
                segment.visible = true;
            } else {
                // Inactive segment
                segment.visible = false;
            }
        }
    }

    private updatePlayerNameLabel(nameLabel: THREE.Sprite, name: string) {
        if (!nameLabel) return;

        // Get the sprite material
        const material = nameLabel.material as THREE.SpriteMaterial;
        if (!material || !material.map) return;

        // Get the canvas from the texture
        const texture = material.map;
        const canvas = texture.image as HTMLCanvasElement;
        const context = canvas.getContext('2d');

        if (context) {
            // Clear canvas
            context.clearRect(0, 0, canvas.width, canvas.height);

            // Set text style
            context.font = 'bold 32px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            // Add background with rounded corners
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.roundRect(context, 10, 10, canvas.width - 20, canvas.height - 20, 10, true, false);

            // Draw text
            context.fillStyle = 'white';
            context.fillText(name || 'Player', canvas.width / 2, canvas.height / 2);

            // Update texture
            texture.needsUpdate = true;
        }
    }



    private createLaserPreviewLine() {
        const config = SKILL_CONFIG[SkillType.LASER_BEAM];
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, config.range)
        ]);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff0000, 
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        this.laserPreviewLine = new THREE.Line(geometry, material);
        this.laserPreviewLine.visible = false;
        this.scene.add(this.laserPreviewLine);
    }

    public updateLaserPreview(playerPos: THREE.Vector3, direction: THREE.Vector3) {
        // Create the laser preview line if it doesn't exist
        if (!this.laserPreviewLine) {
            this.createLaserPreviewLine();
        }

        // If the laser preview line is not visible, make it visible
        if (this.laserPreviewLine && !this.laserPreviewLine.visible) {
            this.laserPreviewLine.visible = true;
        }

        if (!this.laserPreviewLine) return;

        const config = SKILL_CONFIG[SkillType.LASER_BEAM];
        const endPos = playerPos.clone().add(direction.clone().normalize().multiplyScalar(config.range));

        // Update line geometry
        const positions = new Float32Array([
            playerPos.x, playerPos.y + 1, playerPos.z,
            endPos.x, endPos.y + 1, endPos.z
        ]);
        this.laserPreviewLine.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.laserPreviewLine.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Creates a click indicator effect on the ground at the specified position
     */
    public createClickIndicator(position: THREE.Vector3): void {
        this.clickIndicatorEffect.createClickIndicator(position);
    }
}
