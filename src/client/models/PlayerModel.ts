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
        // Black and white shoe design
        const shoeBlackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000, // Black
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x000000,
            emissiveIntensity: 0.1,
            depthWrite: true // Write to depth buffer so shoes render above damage area
        });
        
        const shoeWhiteMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, // White
            roughness: 0.6,
            metalness: 0.2,
            emissive: 0x000000,
            emissiveIntensity: 0.1,
            depthWrite: true // Write to depth buffer so shoes render above damage area
        });
        
        // Shoe dimensions - bigger
        const shoeWidth = 0.35;
        const shoeHeight = 0.25;
        const shoeLength = 0.5;
        const soleThickness = 0.08;
        
        // Left shoe - black and white sport shoe design
        const leftShoe = new THREE.Group();
        // Left shoe body - black base
        const leftShoeBody = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth, shoeHeight, shoeLength),
            shoeBlackMaterial
        );
        leftShoeBody.position.set(0, shoeHeight / 2, shoeLength / 2);
        leftShoeBody.castShadow = true;
        leftShoeBody.renderOrder = 100; // Render above damage area effect
        leftShoe.add(leftShoeBody);
        
        // White diagonal stripe pattern (sporty design)
        const stripeThickness = 0.015;
        // Diagonal stripe from front-top to back-bottom
        const leftDiagonalStripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeThickness, shoeHeight * 0.7, shoeLength * 1.2),
            shoeWhiteMaterial
        );
        leftDiagonalStripe.rotation.z = Math.PI / 6; // 30 degree angle
        leftDiagonalStripe.position.set(0, shoeHeight * 0.5, shoeLength / 2);
        leftDiagonalStripe.renderOrder = 101;
        leftShoe.add(leftDiagonalStripe);
        
        // White front accent (toe cap area)
        const leftToeCap = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.9, shoeHeight * 0.25, shoeLength * 0.3),
            shoeWhiteMaterial
        );
        leftToeCap.position.set(0, shoeHeight * 0.3, shoeLength * 0.85);
        leftToeCap.renderOrder = 101;
        leftShoe.add(leftToeCap);
        
        // White heel accent
        const leftHeelAccent = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.85, shoeHeight * 0.3, shoeLength * 0.25),
            shoeWhiteMaterial
        );
        leftHeelAccent.position.set(0, shoeHeight * 0.4, shoeLength * 0.15);
        leftHeelAccent.renderOrder = 101;
        leftShoe.add(leftHeelAccent);
        
        // White sole with black accents
        const leftSole = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth + 0.05, soleThickness * 1.3, shoeLength + 0.05),
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff, // White sole
                roughness: 0.9,
                metalness: 0.0,
                depthWrite: true // Write to depth buffer so shoes render above damage area
            })
        );
        leftSole.position.set(0, soleThickness * 0.65, shoeLength / 2);
        leftSole.renderOrder = 102;
        leftShoe.add(leftSole);
        
        // Black sole accent lines
        const leftSoleLine1 = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.7, soleThickness * 0.2, shoeLength * 0.1),
            shoeBlackMaterial
        );
        leftSoleLine1.position.set(0, soleThickness * 0.5, shoeLength * 0.3);
        leftSoleLine1.renderOrder = 103;
        leftShoe.add(leftSoleLine1);
        
        const leftSoleLine2 = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.7, soleThickness * 0.2, shoeLength * 0.1),
            shoeBlackMaterial
        );
        leftSoleLine2.position.set(0, soleThickness * 0.5, shoeLength * 0.7);
        leftSoleLine2.renderOrder = 103;
        leftShoe.add(leftSoleLine2);
        
        // Position shoe forward and to the left
        // y position is 0.1 to ensure shoes are always above damageAreaEffect (y=0.05)
        leftShoe.position.set(-0.2, 0.1, 0.3); // More forward (positive Z), above damage area
        leftShoe.renderOrder = 100; // Ensure entire shoe group renders above damage area
        bodyGroup.add(leftShoe); // Add to bodyGroup so it rotates with player
        
        // Right shoe - black and white sport shoe design
        const rightShoe = new THREE.Group();
        // Right shoe body - black base
        const rightShoeBody = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth, shoeHeight, shoeLength),
            shoeBlackMaterial
        );
        rightShoeBody.position.set(0, shoeHeight / 2, shoeLength / 2);
        rightShoeBody.castShadow = true;
        rightShoeBody.renderOrder = 100; // Render above damage area effect
        rightShoe.add(rightShoeBody);
        
        // White diagonal stripe pattern (sporty design) - mirrored
        // Diagonal stripe from front-top to back-bottom
        const rightDiagonalStripe = new THREE.Mesh(
            new THREE.BoxGeometry(stripeThickness, shoeHeight * 0.7, shoeLength * 1.2),
            shoeWhiteMaterial
        );
        rightDiagonalStripe.rotation.z = -Math.PI / 6; // -30 degree angle (mirrored)
        rightDiagonalStripe.position.set(0, shoeHeight * 0.5, shoeLength / 2);
        rightDiagonalStripe.renderOrder = 101;
        rightShoe.add(rightDiagonalStripe);
        
        // White front accent (toe cap area)
        const rightToeCap = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.9, shoeHeight * 0.25, shoeLength * 0.3),
            shoeWhiteMaterial
        );
        rightToeCap.position.set(0, shoeHeight * 0.3, shoeLength * 0.85);
        rightToeCap.renderOrder = 101;
        rightShoe.add(rightToeCap);
        
        // White heel accent
        const rightHeelAccent = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.85, shoeHeight * 0.3, shoeLength * 0.25),
            shoeWhiteMaterial
        );
        rightHeelAccent.position.set(0, shoeHeight * 0.4, shoeLength * 0.15);
        rightHeelAccent.renderOrder = 101;
        rightShoe.add(rightHeelAccent);
        
        // White sole with black accents
        const rightSole = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth + 0.05, soleThickness * 1.3, shoeLength + 0.05),
            new THREE.MeshStandardMaterial({ 
                color: 0xffffff, // White sole
                roughness: 0.9,
                metalness: 0.0,
                depthWrite: true // Write to depth buffer so shoes render above damage area
            })
        );
        rightSole.position.set(0, soleThickness * 0.65, shoeLength / 2);
        rightSole.renderOrder = 102;
        rightShoe.add(rightSole);
        
        // Black sole accent lines
        const rightSoleLine1 = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.7, soleThickness * 0.2, shoeLength * 0.1),
            shoeBlackMaterial
        );
        rightSoleLine1.position.set(0, soleThickness * 0.5, shoeLength * 0.3);
        rightSoleLine1.renderOrder = 103;
        rightShoe.add(rightSoleLine1);
        
        const rightSoleLine2 = new THREE.Mesh(
            new THREE.BoxGeometry(shoeWidth * 0.7, soleThickness * 0.2, shoeLength * 0.1),
            shoeBlackMaterial
        );
        rightSoleLine2.position.set(0, soleThickness * 0.5, shoeLength * 0.7);
        rightSoleLine2.renderOrder = 103;
        rightShoe.add(rightSoleLine2);
        
        // Position shoe forward and to the right
        // y position is 0.1 to ensure shoes are always above damageAreaEffect (y=0.05)
        rightShoe.position.set(0.2, 0.1, 0.3); // More forward (positive Z), above damage area
        rightShoe.renderOrder = 100; // Ensure entire shoe group renders above damage area
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

