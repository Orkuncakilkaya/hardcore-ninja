import * as THREE from 'three';
import { Box } from '../entities/Box';
import type { GameState, MapConfig, PlayerState } from '../common/types';

interface ClientPlayer {
    mesh: THREE.Group;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Quaternion;
    teleportCooldown: number;
}

export class ClientEntityManager {
    public scene: THREE.Scene;
    public players: Map<string, ClientPlayer> = new Map();
    public boxes: Box[] = [];
    public walls: Box[] = [];
    private teleportRadiusMesh?: THREE.Mesh;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createTeleportRadius();
    }

    private createTeleportRadius() {
        const geometry = new THREE.RingGeometry(9.5, 10, 32);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.teleportRadiusMesh = new THREE.Mesh(geometry, material);
        this.teleportRadiusMesh.rotation.x = -Math.PI / 2;
        this.teleportRadiusMesh.position.y = 0.1;
        this.teleportRadiusMesh.visible = false;
        this.scene.add(this.teleportRadiusMesh);
    }

    public setTeleportTargeting(isTargeting: boolean) {
        if (this.teleportRadiusMesh) {
            this.teleportRadiusMesh.visible = isTargeting;
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
                    teleportCooldown: playerState.teleportCooldown
                };
                this.players.set(playerState.id, clientPlayer);
            } else {
                // Update targets for interpolation
                clientPlayer.targetPosition.set(playerState.position.x, playerState.position.y, playerState.position.z);
                clientPlayer.targetRotation.set(playerState.rotation.x, playerState.rotation.y, playerState.rotation.z, playerState.rotation.w);
                clientPlayer.teleportCooldown = playerState.teleportCooldown;
            }

            // Update Teleport Radius Position if targeting
            if (playerState.id === myPeerId && this.teleportRadiusMesh && this.teleportRadiusMesh.visible) {
                this.teleportRadiusMesh.position.x = clientPlayer.mesh.position.x;
                this.teleportRadiusMesh.position.z = clientPlayer.mesh.position.z;
            }
        });

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
}
