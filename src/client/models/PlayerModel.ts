import * as THREE from 'three';

export interface PlayerMeshResult {
    group: THREE.Group;
    body: THREE.Mesh;
    bodyGroup: THREE.Group;
    nameLabel: THREE.Sprite;
    leftShoe: THREE.Group;
    rightShoe: THREE.Group;
}

export class PlayerModel {
    /**
     * Creates a player mesh with body, eyes, shoes and name label
     */
    public static createPlayerMesh(
        isLocal: boolean,
        createPlayerNameLabel: (name: string) => THREE.Sprite
    ): PlayerMeshResult {
        const group = new THREE.Group();
        
        // Create body group (will rotate based on movement direction)
        const bodyGroup = new THREE.Group();
        
        // Create body capsule
        const geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
        const material = new THREE.MeshStandardMaterial({ color: isLocal ? 0x00ff00 : 0xff0000 });
        const body = new THREE.Mesh(geometry, material);
        body.position.y = 1;
        body.castShadow = true;
        body.receiveShadow = true;
        bodyGroup.add(body);
        
        // Create eyes - white eyes with black pupils (bigger and funnier)
        const eyeSize = 0.18; // Bigger eyes for comical effect
        const eyeWhiteGeometry = new THREE.SphereGeometry(eyeSize, 16, 16);
        const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1
        });
        
        const pupilSize = 0.08; // Bigger pupils
        const pupilGeometry = new THREE.SphereGeometry(pupilSize, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        // Left eye
        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        leftEyeWhite.position.set(-0.22, 1.38, 0.5);
        bodyGroup.add(leftEyeWhite);
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.22, 1.38, 0.5 + eyeSize * 0.6); // Slightly forward for 3D effect
        bodyGroup.add(leftPupil);
        
        // Right eye
        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        rightEyeWhite.position.set(0.22, 1.38, 0.5);
        bodyGroup.add(rightEyeWhite);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.22, 1.38, 0.5 + eyeSize * 0.6); // Slightly forward for 3D effect
        bodyGroup.add(rightPupil);
        
        // Create shoes - animated when walking (bigger and more prominent)
        // Shoes are added to bodyGroup so they rotate with the player
        const shoeColor = 0x1a1a1a; // Dark black shoes for better visibility
        const shoeMaterial = new THREE.MeshStandardMaterial({ 
            color: shoeColor,
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x000000,
            emissiveIntensity: 0.1
        });
        
        // Shoe dimensions - bigger
        const shoeWidth = 0.35;
        const shoeHeight = 0.25;
        const shoeLength = 0.5;
        const soleThickness = 0.08;
        
        // Left shoe
        const leftShoe = new THREE.Group();
        const leftShoeBody = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth, shoeHeight, shoeLength),
            shoeMaterial
        );
        leftShoeBody.position.set(0, shoeHeight / 2, shoeLength / 2);
        leftShoeBody.castShadow = true;
        leftShoe.add(leftShoeBody);
        
        // Left shoe sole - bigger and more visible
        const leftSole = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth + 0.05, soleThickness, shoeLength + 0.05),
            new THREE.MeshStandardMaterial({ 
                color: 0x000000,
                roughness: 0.9,
                metalness: 0.0
            })
        );
        leftSole.position.set(0, soleThickness / 2, shoeLength / 2);
        leftShoe.add(leftSole);
        
        // Position shoe forward and to the left
        leftShoe.position.set(-0.2, 0, 0.3); // More forward (positive Z)
        bodyGroup.add(leftShoe); // Add to bodyGroup so it rotates with player
        
        // Right shoe
        const rightShoe = new THREE.Group();
        const rightShoeBody = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth, shoeHeight, shoeLength),
            shoeMaterial
        );
        rightShoeBody.position.set(0, shoeHeight / 2, shoeLength / 2);
        rightShoeBody.castShadow = true;
        rightShoe.add(rightShoeBody);
        
        // Right shoe sole - bigger and more visible
        const rightSole = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth + 0.05, soleThickness, shoeLength + 0.05),
            new THREE.MeshStandardMaterial({ 
                color: 0x000000,
                roughness: 0.9,
                metalness: 0.0
            })
        );
        rightSole.position.set(0, soleThickness / 2, shoeLength / 2);
        rightShoe.add(rightSole);
        
        // Position shoe forward and to the right
        rightShoe.position.set(0.2, 0, 0.3); // More forward (positive Z)
        bodyGroup.add(rightShoe); // Add to bodyGroup so it rotates with player
        
        // Add bodyGroup to main group after adding shoes
        group.add(bodyGroup);

        // Create name label with default name
        const nameLabel = createPlayerNameLabel(isLocal ? "You" : "Player");
        // Position the name label above the player
        nameLabel.position.y = 3.5; // Above player's head
        group.add(nameLabel); // Add to group so it moves with player

        return { group, body, bodyGroup, nameLabel, leftShoe, rightShoe };
    }
}

