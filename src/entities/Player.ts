import * as THREE from 'three';
import { SkillSystem, SkillType } from '../systems/SkillSystem';
import { Box } from './Box';
import { NetworkManager } from '../network/NetworkManager';

export class Player {
    public id: string;
    public mesh: THREE.Group;
    private bodyMesh: THREE.Mesh;
    private spotLight?: THREE.SpotLight;
    private speed: number = 10;
    public velocity: THREE.Vector3 = new THREE.Vector3(); // Public for server access
    public skillSystem: SkillSystem;
    private networkManager: NetworkManager;

    // Movement
    public destination: THREE.Vector3 | null = null;
    public isMoving: boolean = false;

    // Health & Status
    public maxHealth: number = 100;
    public health: number = 100;
    public isInvulnerable: boolean = false;
    private invulnerableTimer: number = 0;

    // Network
    public lastInput: { keys: { [key: string]: boolean }, mouse: { x: number, y: number, z: number } | null } | null = null;
    private serverPosition: THREE.Vector3;
    private serverRotation: THREE.Quaternion;
    private isLocal: boolean;


    constructor(id: string, entityManager: any, color: number = 0x00ff00, isLocal: boolean = false, networkManager: NetworkManager) {
        this.id = id;
        this.mesh = new THREE.Group();
        this.skillSystem = new SkillSystem(this, entityManager);
        this.networkManager = networkManager;
        this.isLocal = isLocal;

        // For interpolation
        this.serverPosition = new THREE.Vector3();
        this.serverRotation = new THREE.Quaternion();

        // Player Body (Simple Capsule/Cylinder)
        const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: color });
        this.bodyMesh = new THREE.Mesh(geometry, material);
        this.bodyMesh.position.y = 1; // Half height
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.mesh.add(this.bodyMesh);

        // Conic Eyesight (SpotLight) - Only for local player
        if (isLocal) {
            this.spotLight = new THREE.SpotLight(0xffffff, 100);
            this.spotLight.position.set(0, 5, 0); // Slightly above player
            this.spotLight.angle = Math.PI / 4; // 45 degrees
            this.spotLight.penumbra = 0.1;
            this.spotLight.decay = 2;
            this.spotLight.distance = 20;
            this.spotLight.castShadow = true;
            this.spotLight.shadow.mapSize.width = 1024;
            this.spotLight.shadow.mapSize.height = 1024;

            // Target for spotlight to look at (forward)
            this.spotLight.target.position.set(0, 0, 5);
            this.mesh.add(this.spotLight);
            this.mesh.add(this.spotLight.target);
        }
    }

    public setPosition(x: number, z: number) {
        this.mesh.position.set(x, 0, z);
        this.serverPosition.set(x, 0, z); // Keep server position in sync
    }

    public updateState(position: { x: number, y: number, z: number }, rotation: { x: number, y: number, z: number, w: number }) {
        this.serverPosition.set(position.x, position.y, position.z);
        if (!this.isLocal) { // Local player rotation is controlled by mouse
            this.serverRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }
    }

    public setDestination(point: THREE.Vector3) {
        this.destination = point.clone();
        this.destination.y = this.mesh.position.y; // Ensure y is the same
        this.isMoving = true;

        const direction = this.destination.clone().sub(this.mesh.position).normalize();
        this.velocity.copy(direction);
    }

    public stopMovement() {
        this.isMoving = false;
        this.destination = null;
        this.velocity.set(0, 0, 0);
    }

    // This update method will now be used on the server-side for movement calculation
    public update(delta: number, boxes: Box[] = [], otherPlayers: Player[] = []) {
        if (this.isMoving && this.destination) {
            const distanceToDestination = this.mesh.position.distanceTo(this.destination);
            const moveDistance = this.speed * delta;

            if (distanceToDestination <= moveDistance) {
                // Reached destination
                this.mesh.position.copy(this.destination);
                this.stopMovement();
            } else {
                const moveVector = this.velocity.clone().multiplyScalar(moveDistance);
                const potentialPosition = this.mesh.position.clone().add(moveVector);

                // Collision Detection
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    potentialPosition.clone().add(new THREE.Vector3(0, 1, 0)),
                    new THREE.Vector3(1, 2, 1)
                );

                let collision = false;

                // Check collision with boxes
                for (const box of boxes) {
                    const boxBoundingBox = new THREE.Box3().setFromObject(box.mesh);
                    if (playerBox.intersectsBox(boxBoundingBox)) {
                        collision = true;
                        break;
                    }
                }

                // Check collision with other players
                if (!collision) {
                    for (const otherPlayer of otherPlayers) {
                        if (otherPlayer.id !== this.id) {
                            const otherPlayerBox = new THREE.Box3().setFromCenterAndSize(
                                otherPlayer.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)),
                                new THREE.Vector3(1, 2, 1)
                            );
                            if (playerBox.intersectsBox(otherPlayerBox)) {
                                collision = true;
                                // If two players collide, they should both stop.
                                // The other player will be stopped on their own update loop.
                                break;
                            }
                        }
                    }
                }

                if (collision) {
                    this.stopMovement();
                } else {
                    this.mesh.position.add(moveVector);
                    this.serverPosition.copy(this.mesh.position); // Update server position to match new position
                }
            }

            // Map Boundary Collision (70x70 playable area = ±35 from center)
            const MAP_LIMIT = 35;
            if (this.mesh.position.x > MAP_LIMIT || this.mesh.position.x < -MAP_LIMIT ||
                this.mesh.position.z > MAP_LIMIT || this.mesh.position.z < -MAP_LIMIT) {
                this.mesh.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.mesh.position.x));
                this.mesh.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.mesh.position.z));
                this.stopMovement();
            }
        }
    }

    // Client-side update
    public clientUpdate(delta: number, input?: { keys: { [key: string]: boolean }, mouse: { x: number, y: number, z: number } | null }) {
        // Interpolate position and rotation
        this.mesh.position.lerp(this.serverPosition, 0.25);
        if (!this.isLocal) {
            this.mesh.quaternion.slerp(this.serverRotation, 0.25);
        }


        // Rotation (Look at mouse) for local player
        if (this.isLocal && input && input.mouse) {
            const target = new THREE.Vector3(input.mouse.x, this.mesh.position.y, input.mouse.z);
            this.mesh.lookAt(target);
        }

        // Skills Input
        if (this.isLocal && input) {
            if (input.keys['KeyQ']) this.skillSystem.activateSkill(SkillType.MISSILE);
            if (input.keys['KeyE']) this.skillSystem.activateSkill(SkillType.SLASH);
            if (input.keys['KeyR']) this.skillSystem.activateSkill(SkillType.TANK);
            if (input.keys['Space']) this.skillSystem.activateSkill(SkillType.ULTIMATE);
        }


        this.skillSystem.update(delta);

        // Update Invulnerability
        if (this.isInvulnerable) {
            this.invulnerableTimer -= delta;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
                (this.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            } else {
                // Visual effect
                (this.bodyMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x0000ff);
            }
        }
    }


    public setInvulnerable(duration: number) {
        this.isInvulnerable = true;
        this.invulnerableTimer = duration;
    }

    public takeDamage(amount: number) {
        if (this.isInvulnerable) return;

        this.health -= amount;
        console.log(`Player ${this.id} took ${amount} damage. Health: ${this.health}`);

        if (this.health <= 0) {
            this.die();
        }
    }

    private die() {
        console.log(`Player ${this.id} died!`);
        this.networkManager.sendToHost({ type: 'PLAYER_DIED', id: this.id });
    }
}
