import * as THREE from 'three';
import { SKILL_CONFIG, SkillType } from '../../common/constants';

/**
 * Manages missile (homing missile) visual effects
 */
export class MissileEffect {
    private scene: THREE.Scene;
    private playerRadiusMesh?: THREE.Mesh; // Activation zone around player
    private mouseRadiusMesh?: THREE.Mesh; // Target zone around mouse
    
    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.createTargetingRadii();
    }
    
    /**
     * Creates the targeting radius indicators for homing missile skill
     */
    private createTargetingRadii(): void {
        const hmConfig = SKILL_CONFIG[SkillType.HOMING_MISSILE];
        
        // Homing Missile Player Radius (Activation Zone)
        const prGeo = new THREE.RingGeometry(hmConfig.radius - 0.1, hmConfig.radius, 32);
        const prMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.playerRadiusMesh = new THREE.Mesh(prGeo, prMat);
        this.playerRadiusMesh.rotation.x = -Math.PI / 2;
        this.playerRadiusMesh.position.y = 0.1;
        this.playerRadiusMesh.visible = false;
        this.scene.add(this.playerRadiusMesh);
        
        // Homing Missile Mouse Radius (Target Zone) - starts green
        const mrGeo = new THREE.RingGeometry(hmConfig.mouseRadius - 0.1, hmConfig.mouseRadius, 32);
        const mrMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        this.mouseRadiusMesh = new THREE.Mesh(mrGeo, mrMat);
        this.mouseRadiusMesh.rotation.x = -Math.PI / 2;
        this.mouseRadiusMesh.position.y = 0.1;
        this.mouseRadiusMesh.visible = false;
        this.scene.add(this.mouseRadiusMesh);
        
        // Lock emoji sprite for mouse radius
        const lockCanvas = document.createElement('canvas');
        lockCanvas.width = 128;
        lockCanvas.height = 128;
        const lockContext = lockCanvas.getContext('2d');
        if (lockContext) {
            lockContext.font = 'bold 80px Arial';
            lockContext.textAlign = 'center';
            lockContext.textBaseline = 'middle';
            lockContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
            lockContext.fillRect(10, 10, lockCanvas.width - 20, lockCanvas.height - 20);
            lockContext.fillStyle = 'white';
            lockContext.fillText('🔒', lockCanvas.width / 2, lockCanvas.height / 2 - 10);
            
            // Add "Lock to target" text below emoji
            lockContext.font = 'bold 14px Arial';
            lockContext.fillText('Lock to target', lockCanvas.width / 2, lockCanvas.height / 2 + 35);
        }
        
        const lockTexture = new THREE.CanvasTexture(lockCanvas);
        lockTexture.needsUpdate = true;
        const lockMaterial = new THREE.SpriteMaterial({ 
            map: lockTexture,
            transparent: true,
            alphaTest: 0.1
        });
        const lockSprite = new THREE.Sprite(lockMaterial);
        lockSprite.scale.set(2, 2, 1);
        lockSprite.position.y = 0.15;
        lockSprite.visible = false;
        this.mouseRadiusMesh.add(lockSprite);
        this.mouseRadiusMesh.userData.lockSprite = lockSprite;
        this.mouseRadiusMesh.userData.material = mrMat;
    }
    
    /**
     * Shows or hides the targeting radii
     */
    public setTargetingVisible(visible: boolean): void {
        if (this.playerRadiusMesh) {
            this.playerRadiusMesh.visible = visible;
        }
        if (this.mouseRadiusMesh) {
            this.mouseRadiusMesh.visible = visible;
            // Hide lock sprite when targeting is disabled
            if (!visible && this.mouseRadiusMesh.userData.lockSprite) {
                this.mouseRadiusMesh.userData.lockSprite.visible = false;
            }
            // Reset to green when starting targeting
            if (visible) {
                const material = this.mouseRadiusMesh.userData.material as THREE.MeshBasicMaterial;
                if (material) {
                    material.color.set(0x00ff00);
                }
            }
        }
    }
    
    /**
     * Updates the player radius position (activation zone)
     */
    public updatePlayerRadiusPosition(position: THREE.Vector3): void {
        if (this.playerRadiusMesh && this.playerRadiusMesh.visible) {
            this.playerRadiusMesh.position.x = position.x;
            this.playerRadiusMesh.position.z = position.z;
        }
    }
    
    /**
     * Updates the mouse radius position and color based on distance from player radius
     */
    public updateMouseRadiusPosition(mousePosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        if (this.mouseRadiusMesh && this.mouseRadiusMesh.visible) {
            this.mouseRadiusMesh.position.set(mousePosition.x, 0.1, mousePosition.z);
            
            // Show lock sprite
            if (this.mouseRadiusMesh.userData.lockSprite) {
                this.mouseRadiusMesh.userData.lockSprite.visible = true;
            }
            
            // Check if mouse is outside player radius (green circle)
            if (this.playerRadiusMesh && this.playerRadiusMesh.visible) {
                const playerPos = new THREE.Vector3(
                    this.playerRadiusMesh.position.x,
                    0,
                    this.playerRadiusMesh.position.z
                );
                const mousePos = new THREE.Vector3(mousePosition.x, 0, mousePosition.z);
                const distance = playerPos.distanceTo(mousePos);
                const hmConfig = SKILL_CONFIG[SkillType.HOMING_MISSILE];
                
                // Change color based on distance from player radius
                const material = this.mouseRadiusMesh.userData.material as THREE.MeshBasicMaterial;
                if (distance > hmConfig.radius) {
                    // Outside green circle - make red
                    material.color.set(0xff0000);
                } else {
                    // Inside green circle - keep green
                    material.color.set(0x00ff00);
                }
            }
        }
    }
    
    /**
     * Creates a colorful, glowing missile with multiple layers
     */
    createMissile(): THREE.Group {
        const group = new THREE.Group();
        
        // Main missile core (bright yellow)
        const coreGeometry = new THREE.ConeGeometry(0.15, 0.7, 16);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 1.0
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.rotation.x = Math.PI / 2;
        group.add(core);
        
        // Glow layer 1 (orange)
        const glow1Geometry = new THREE.ConeGeometry(0.2, 0.75, 16);
        const glow1Material = new THREE.MeshStandardMaterial({
            color: 0xff6600,
            emissive: 0xff6600,
            emissiveIntensity: 2.0,
            transparent: true,
            opacity: 0.7
        });
        const glow1 = new THREE.Mesh(glow1Geometry, glow1Material);
        glow1.rotation.x = Math.PI / 2;
        group.add(glow1);
        
        // Glow layer 2 (red)
        const glow2Geometry = new THREE.ConeGeometry(0.25, 0.8, 16);
        const glow2Material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1.5,
            transparent: true,
            opacity: 0.5
        });
        const glow2 = new THREE.Mesh(glow2Geometry, glow2Material);
        glow2.rotation.x = Math.PI / 2;
        group.add(glow2);
        
        // Glow layer 3 (purple/pink)
        const glow3Geometry = new THREE.ConeGeometry(0.3, 0.85, 16);
        const glow3Material = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.3
        });
        const glow3 = new THREE.Mesh(glow3Geometry, glow3Material);
        glow3.rotation.x = Math.PI / 2;
        group.add(glow3);
        
        // Sparkle particles around the missile
        const particleCount = 20;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        const particleColors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.2 + Math.random() * 0.15;
            const height = (Math.random() - 0.5) * 0.8;
            
            particlePositions[i3] = Math.cos(angle) * radius;
            particlePositions[i3 + 1] = height;
            particlePositions[i3 + 2] = Math.sin(angle) * radius;
            
            particleSizes[i] = 0.05 + Math.random() * 0.1;
            
            // Random colors (yellow, orange, red, pink)
            const colorChoice = Math.random();
            if (colorChoice < 0.25) {
                // Yellow
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 1.0;
                particleColors[i3 + 2] = 0.2;
            } else if (colorChoice < 0.5) {
                // Orange
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 0.6;
                particleColors[i3 + 2] = 0.0;
            } else if (colorChoice < 0.75) {
                // Red
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 0.2;
                particleColors[i3 + 2] = 0.0;
            } else {
                // Pink
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 0.4;
                particleColors[i3 + 2] = 0.8;
            }
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.1,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            vertexColors: true
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.userData.startTime = Date.now();
        group.add(particles);
        
        // Store references for animation
        group.userData.core = core;
        group.userData.glow1 = glow1;
        group.userData.glow2 = glow2;
        group.userData.glow3 = glow3;
        group.userData.particles = particles;
        group.userData.animationStartTime = Date.now();
        
        return group;
    }
    
    /**
     * Updates missile animation
     */
    updateAnimation(missileGroup: THREE.Group, delta: number): void {
        const time = (Date.now() - missileGroup.userData.animationStartTime) / 1000;
        
        // Animate core pulsing
        const core = missileGroup.userData.core;
        if (core) {
            const pulse = 1 + Math.sin(time * 15) * 0.1;
            core.scale.set(1, pulse, 1);
            const coreMaterial = core.material as THREE.MeshStandardMaterial;
            coreMaterial.emissiveIntensity = 2.5 + Math.sin(time * 20) * 0.5;
        }
        
        // Animate glow layers
        const glow1 = missileGroup.userData.glow1;
        const glow2 = missileGroup.userData.glow2;
        const glow3 = missileGroup.userData.glow3;
        
        if (glow1) {
            const pulse1 = 1 + Math.sin(time * 12) * 0.15;
            glow1.scale.set(1, pulse1, 1);
            const glow1Material = glow1.material as THREE.MeshStandardMaterial;
            glow1Material.emissiveIntensity = 2.0 + Math.sin(time * 18) * 0.4;
        }
        
        if (glow2) {
            const pulse2 = 1 + Math.sin(time * 10) * 0.12;
            glow2.scale.set(1, pulse2, 1);
            const glow2Material = glow2.material as THREE.MeshStandardMaterial;
            glow2Material.emissiveIntensity = 1.5 + Math.sin(time * 16) * 0.3;
        }
        
        if (glow3) {
            const pulse3 = 1 + Math.sin(time * 8) * 0.1;
            glow3.scale.set(1, pulse3, 1);
            const glow3Material = glow3.material as THREE.MeshStandardMaterial;
            glow3Material.emissiveIntensity = 1.0 + Math.sin(time * 14) * 0.2;
        }
        
        // Animate particles (sparkle effect)
        const particles = missileGroup.userData.particles;
        if (particles && particles.geometry) {
            const positions = particles.geometry.attributes.position;
            const sizes = particles.geometry.attributes.size;
            const colors = particles.geometry.attributes.color as THREE.BufferAttribute;
            
            for (let i = 0; i < positions.count; i++) {
                const i3 = i * 3;
                
                // Rotate particles around missile
                const angle = Math.atan2(positions.array[i3 + 2], positions.array[i3]);
                const radius = Math.sqrt(positions.array[i3] ** 2 + positions.array[i3 + 2] ** 2);
                const newAngle = angle + delta * 5;
                
                positions.array[i3] = Math.cos(newAngle) * radius;
                positions.array[i3 + 2] = Math.sin(newAngle) * radius;
                
                // Pulsing size
                sizes.array[i] = (0.05 + Math.random() * 0.1) * (1 + Math.sin(time * 10 + i) * 0.3);
                
                // Color pulsing
                const colorPulse = Math.sin(time * 8 + i * 0.5) * 0.3 + 0.7;
                colors.array[i3] *= colorPulse;
                colors.array[i3 + 1] *= colorPulse;
                colors.array[i3 + 2] *= colorPulse;
            }
            
            positions.needsUpdate = true;
            sizes.needsUpdate = true;
            colors.needsUpdate = true;
        }
    }
    
}

