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
}

export class ClientEntityManager {
    public scene: THREE.Scene;
    public players: Map<string, ClientPlayer> = new Map();
    public boxes: Box[] = [];
    public walls: Box[] = [];
    public missiles: Map<string, THREE.Mesh> = new Map();
    private teleportRadiusMesh?: THREE.Mesh;
    private mouseRadiusMesh?: THREE.Mesh;
    private playerRadiusMesh?: THREE.Mesh; // For Homing Missile activation zone

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createSkillRadii();
    }

    private createSkillRadii() {
        // Teleport Radius
        const tpGeo = new THREE.RingGeometry(9.5, 10, 32);
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

        if (!isTargeting || !skillType) return;

        if (skillType === SkillType.TELEPORT && this.teleportRadiusMesh) {
            this.teleportRadiusMesh.visible = true;
        } else if (skillType === SkillType.HOMING_MISSILE) {
            if (this.playerRadiusMesh) this.playerRadiusMesh.visible = true;
            if (this.mouseRadiusMesh) this.mouseRadiusMesh.visible = true;
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
                const mesh = this.createPlayerMesh(playerState.id === myPeerId);
                mesh.position.set(playerState.position.x, playerState.position.y, playerState.position.z); // Set initial position
                this.scene.add(mesh);
                clientPlayer = {
                    mesh: mesh,
                    targetPosition: new THREE.Vector3(playerState.position.x, playerState.position.y, playerState.position.z),
                    targetRotation: new THREE.Quaternion(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z, playerState.rotation.w),
                    teleportCooldown: playerState.teleportCooldown,
                    homingMissileCooldown: playerState.homingMissileCooldown
                };
                this.players.set(playerState.id, clientPlayer);
            } else {
                // Update targets for interpolation
                clientPlayer.targetPosition.set(playerState.position.x, playerState.position.y, playerState.position.z);
                clientPlayer.targetRotation.set(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z, playerState.rotation.w);
                clientPlayer.teleportCooldown = playerState.teleportCooldown;
                clientPlayer.homingMissileCooldown = playerState.homingMissileCooldown;
            }

            // Update Teleport Radius Position if targeting
            if (playerState.id === myPeerId) {
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

        // Remove disconnected players
        for (const [id, player] of this.players) {
            if (!activeIds.has(id)) {
                this.scene.remove(player.mesh);
                this.players.delete(id);
            }
        }
    }

    public update(delta: number) {
        // Interpolate
        this.players.forEach(player => {
            player.mesh.position.lerp(player.targetPosition, 10 * delta);
            player.mesh.quaternion.slerp(player.targetRotation, 10 * delta);
        });
    }

    public getPlayer(id: string): ClientPlayer | undefined {
        return this.players.get(id);
    }

    private createPlayerMesh(isLocal: boolean): THREE.Group {
        const group = new THREE.Group();
        const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: isLocal ? 0x00ff00 : 0xff0000 });
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 1;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        return group;
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
}
