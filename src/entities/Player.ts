import * as THREE from 'three';
import { SkillSystem, SkillType } from '../systems/SkillSystem';
import { Box } from './Box';

export class Player {
    public id: string;
    public mesh: THREE.Group;
    private bodyMesh: THREE.Mesh;
    private spotLight?: THREE.SpotLight;
    private speed: number = 10;
    private velocity: THREE.Vector3 = new THREE.Vector3();
    public skillSystem: SkillSystem;

    // Health & Status
    public maxHealth: number = 100;
    public health: number = 100;
    public isInvulnerable: boolean = false;
    private invulnerableTimer: number = 0;

    // Network
    public lastInput: { keys: { [key: string]: boolean }, mouse: { x: number, y: number, z: number } | null } | null = null;

    constructor(id: string, entityManager: any, color: number = 0x00ff00, isLocal: boolean = false) {
        this.id = id;
        this.mesh = new THREE.Group();
        this.skillSystem = new SkillSystem(this, entityManager);

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
    }

    public update(delta: number, input: { keys: { [key: string]: boolean }, mouse: { x: number, y: number, z: number } | null }, boxes: Box[] = [], otherPlayers: Player[] = []) {
        // Movement
        this.velocity.set(0, 0, 0);
        if (input.keys['KeyW']) this.velocity.z -= 1;
        if (input.keys['KeyS']) this.velocity.z += 1;
        if (input.keys['KeyA']) this.velocity.x -= 1;
        if (input.keys['KeyD']) this.velocity.x += 1;

        if (this.velocity.lengthSq() > 0) {
            const moveVector = this.velocity.clone().normalize().multiplyScalar(this.speed * delta);
            const potentialPosition = this.mesh.position.clone().add(moveVector);

            // Collision Detection
            const playerBox = new THREE.Box3().setFromCenterAndSize(
                potentialPosition.clone().add(new THREE.Vector3(0, 1, 0)), // Center (y=1 matches bodyMesh)
                new THREE.Vector3(1, 2, 1) // Size (matches Capsule radius 0.5*2, height 1+capsule_ends? Capsule is radius 0.5, length 1. Total height approx 2)
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
                            break;
                        }
                    }
                }
            }

            if (!collision) {
                this.mesh.position.add(moveVector);
            }

            // Map Boundary Collision (70x70 playable area = ±35 from center)
            const MAP_LIMIT = 35;
            this.mesh.position.x = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.mesh.position.x));
            this.mesh.position.z = Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, this.mesh.position.z));
        }

        // Rotation (Look at mouse)
        if (input.mouse) {
            const target = new THREE.Vector3(input.mouse.x, this.mesh.position.y, input.mouse.z);
            this.mesh.lookAt(target);
        }

        // Skills Input
        if (input.keys['KeyQ']) this.skillSystem.activateSkill(SkillType.MISSILE);
        if (input.keys['KeyE']) this.skillSystem.activateSkill(SkillType.SLASH);
        if (input.keys['KeyR']) this.skillSystem.activateSkill(SkillType.TANK);
        if (input.keys['Space']) this.skillSystem.activateSkill(SkillType.ULTIMATE);
        // Basic Attack needs mouse click, handling in InputManager or here if passed

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
        // TODO: Handle death (respawn or game over)
        this.health = this.maxHealth;
        this.setPosition(0, 0); // Respawn at center for now
    }
}
