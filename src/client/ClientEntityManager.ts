import * as THREE from 'three';
import { Box } from '../entities/Box';
import type { GameState, MapConfig } from '../common/types';
import { SKILL_CONFIG, SkillType } from '../common/constants';

interface ClientPlayer {
    mesh: THREE.Group;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Quaternion;
    teleportCooldown: number;
    homingMissileCooldown: number;
    laserBeamCooldown: number;
    invincibilityCooldown: number;
    invincibilitySphere: THREE.Mesh | null;
    isDead: boolean;
    bodyMesh: THREE.Mesh; // Reference to the body mesh for easier access
    healthBar: THREE.Group | null; // Reference to the healthbar mesh
    nameLabel: THREE.Sprite | null; // Reference to the player name label
    health: number; // Current health value
    maxHealth: number; // Maximum health value
}

export class ClientEntityManager {
    public scene: THREE.Scene;
    public players: Map<string, ClientPlayer> = new Map();
    public boxes: Box[] = [];
    public walls: Box[] = [];
    public missiles: Map<string, THREE.Mesh> = new Map();
    public laserBeams: Map<string, THREE.Mesh> = new Map();
    private teleportRadiusMesh?: THREE.Mesh;
    private mouseRadiusMesh?: THREE.Mesh;
    private playerRadiusMesh?: THREE.Mesh; // For Homing Missile activation zone
    private laserPreviewLine?: THREE.Line; // For Laser Beam preview

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createSkillRadii();
    }

    private createSkillRadii() {
        // Teleport Radius
        const tpConfig = SKILL_CONFIG[SkillType.TELEPORT];
        const tpGeo = new THREE.RingGeometry(tpConfig.range - 0.5, tpConfig.range, 32);
        const tpMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.teleportRadiusMesh = new THREE.Mesh(tpGeo, tpMat);
        this.teleportRadiusMesh.rotation.x = -Math.PI / 2;
        this.teleportRadiusMesh.position.y = 0.1;
        this.teleportRadiusMesh.visible = false;
        this.scene.add(this.teleportRadiusMesh);

        // Homing Missile Player Radius (Activation Zone)
        const hmConfig = SKILL_CONFIG[SkillType.HOMING_MISSILE];
        const prGeo = new THREE.RingGeometry(hmConfig.radius - 0.1, hmConfig.radius, 32);
        const prMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.playerRadiusMesh = new THREE.Mesh(prGeo, prMat);
        this.playerRadiusMesh.rotation.x = -Math.PI / 2;
        this.playerRadiusMesh.position.y = 0.1;
        this.playerRadiusMesh.visible = false;
        this.scene.add(this.playerRadiusMesh);

        // Homing Missile Mouse Radius (Target Zone)
        const mrGeo = new THREE.RingGeometry(hmConfig.mouseRadius - 0.1, hmConfig.mouseRadius, 32);
        const mrMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.mouseRadiusMesh = new THREE.Mesh(mrGeo, mrMat);
        this.mouseRadiusMesh.rotation.x = -Math.PI / 2;
        this.mouseRadiusMesh.position.y = 0.1;
        this.mouseRadiusMesh.visible = false;
        this.scene.add(this.mouseRadiusMesh);
    }

    public setSkillTargeting(skillType: SkillType | null, isTargeting: boolean) {
        if (this.teleportRadiusMesh) this.teleportRadiusMesh.visible = false;
        if (this.playerRadiusMesh) this.playerRadiusMesh.visible = false;
        if (this.mouseRadiusMesh) this.mouseRadiusMesh.visible = false;
        if (this.laserPreviewLine) this.laserPreviewLine.visible = false;

        if (!isTargeting || !skillType) return;

        if (skillType === SkillType.TELEPORT && this.teleportRadiusMesh) {
            this.teleportRadiusMesh.visible = true;
        } else if (skillType === SkillType.HOMING_MISSILE) {
            if (this.playerRadiusMesh) this.playerRadiusMesh.visible = true;
            if (this.mouseRadiusMesh) this.mouseRadiusMesh.visible = true;
        } else if (skillType === SkillType.LASER_BEAM) {
            if (!this.laserPreviewLine) {
                this.createLaserPreviewLine();
            }
            if (this.laserPreviewLine) this.laserPreviewLine.visible = true;
        }
    }

    public updateMouseRadiusPosition(position: THREE.Vector3) {
        if (this.mouseRadiusMesh && this.mouseRadiusMesh.visible) {
            this.mouseRadiusMesh.position.set(position.x, 0.1, position.z);
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
        const activeIds = new Set<string>();

        gameState.players.forEach(playerState => {
            activeIds.add(playerState.id);
            let clientPlayer = this.players.get(playerState.id);

            if (!clientPlayer) {
                const { group, body, healthBar, nameLabel } = this.createPlayerMesh(playerState.id === myPeerId);
                group.position.set(playerState.position.x, playerState.position.y, playerState.position.z); // Set initial position
                this.scene.add(group);
                clientPlayer = {
                    mesh: group,
                    bodyMesh: body,
                    healthBar: healthBar,
                    nameLabel: nameLabel,
                    health: playerState.health,
                    maxHealth: playerState.maxHealth,
                    targetPosition: new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z),
                    targetRotation: new THREE.Quaternion(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z, playerState.rotation.w),
                    teleportCooldown: playerState.teleportCooldown,
                    homingMissileCooldown: playerState.homingMissileCooldown,
                    laserBeamCooldown: playerState.laserBeamCooldown,
                    invincibilityCooldown: playerState.invincibilityCooldown,
                    invincibilitySphere: null,
                    isDead: playerState.isDead
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
                        clientPlayer.invincibilitySphere = this.createInvincibilitySphere();
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

            // Update Teleport Radius Position if targeting
            if (playerState.id === myPeerId && clientPlayer) {
                if (this.teleportRadiusMesh && this.teleportRadiusMesh.visible) {
                    this.teleportRadiusMesh.position.x = clientPlayer.mesh.position.x;
                    this.teleportRadiusMesh.position.z = clientPlayer.mesh.position.z;
                }
                if (this.playerRadiusMesh && this.playerRadiusMesh.visible) {
                    this.playerRadiusMesh.position.x = clientPlayer.mesh.position.x;
                    this.playerRadiusMesh.position.z = clientPlayer.mesh.position.z;
                }
            }
        });

        // Update Missiles
        const activeMissileIds = new Set<string>();
        if (gameState.missiles) {
            gameState.missiles.forEach(missileState => {
                activeMissileIds.add(missileState.id);
                let missileMesh = this.missiles.get(missileState.id);
                if (!missileMesh) {
                    missileMesh = this.createMissileMesh();
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
                let laserMesh = this.laserBeams.get(laserState.id);
                if (!laserMesh) {
                    laserMesh = this.createLaserBeamMesh(laserState.startPosition, laserState.endPosition);
                    this.scene.add(laserMesh);
                    this.laserBeams.set(laserState.id, laserMesh);
                }
                // Laser beams don't move, but we could update them if needed
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
                player.mesh.position.lerp(player.targetPosition, 10 * delta);
                player.mesh.quaternion.slerp(player.targetRotation, 10 * delta);
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
    }

    public getPlayer(id: string): ClientPlayer | undefined {
        return this.players.get(id);
    }

    private createPlayerMesh(isLocal: boolean): { group: THREE.Group, body: THREE.Mesh, healthBar: THREE.Group, nameLabel: THREE.Sprite } {
        const group = new THREE.Group();
        const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: isLocal ? 0x00ff00 : 0xff0000 });
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 1;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Create healthbar with default full health
        const healthBar = this.createHealthBar(100, 100);
        group.add(healthBar);

        // Create name label with default name
        const nameLabel = this.createPlayerNameLabel(isLocal ? "You" : "Player");
        // Position the name label above the healthbar
        nameLabel.position.y = 1.5; // Above healthbar
        healthBar.add(nameLabel); // Add to healthbar so it moves with it

        return { group, body, healthBar, nameLabel };
    }

    private createInvincibilitySphere(): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            emissive: 0x00ffff,
            emissiveIntensity: 0.2
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.y = 1; // Center at player's chest height
        return sphere;
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

    private createMissileMesh(): THREE.Mesh {
        const geometry = new THREE.ConeGeometry(0.2, 0.8, 8);
        const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Rotate so cone points in forward direction (default is up)
        geometry.rotateX(Math.PI / 2);
        return mesh;
    }

    private createLaserBeamMesh(startPos: { x: number, y: number, z: number }, endPos: { x: number, y: number, z: number }): THREE.Mesh {
        const config = SKILL_CONFIG[SkillType.LASER_BEAM];
        const start = new THREE.Vector3(startPos.x, startPos.y, startPos.z);
        const end = new THREE.Vector3(endPos.x, endPos.y, endPos.z);

        const direction = end.clone().sub(start);
        const length = direction.length();

        // Create cylinder geometry
        const geometry = new THREE.CylinderGeometry(config.thickness, config.thickness, length, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Position at midpoint
        const midpoint = start.clone().add(end).multiplyScalar(0.5);
        mesh.position.copy(midpoint);

        // Rotate to align with direction
        mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.normalize()
        );

        return mesh;
    }

    private createLaserPreviewLine() {
        const config = SKILL_CONFIG[SkillType.LASER_BEAM];
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, config.range)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
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
}
