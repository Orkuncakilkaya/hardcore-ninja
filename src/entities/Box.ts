import * as THREE from 'three';

export class Box {
    public id: string;
    public mesh: THREE.Mesh;

    constructor(
        id: string,
        position: THREE.Vector3,
        width: number = 2,
        height: number = 2,
        depth: number = 2,
        color: number = 0x888888
    ) {
        this.id = id;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        // Check if this is a wall (walls have id starting with "wall_")
        const isWall = id.startsWith('wall_');
        
        let material: THREE.MeshStandardMaterial;
        if (isWall) {
            // Create wall texture
            const wallTexture = this.createWallTexture();
            material = new THREE.MeshStandardMaterial({ 
                map: wallTexture,
                color: color,
                roughness: 0.9,
                metalness: 0.1
            });
        } else {
            material = new THREE.MeshStandardMaterial({ color: color });
        }
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }
    
    private createWallTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        if (context) {
            // Mortar/base color (light gray cement)
            context.fillStyle = '#8a8a8a';
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            // Brick dimensions
            const brickWidth = 64;
            const brickHeight = 32;
            const mortarWidth = 4;
            
            // Brick color variations (reddish/orange tones)
            const brickColors = [
                { r: 180, g: 70, b: 50 },   // Dark red brick
                { r: 200, g: 80, b: 60 },   // Medium red brick
                { r: 190, g: 75, b: 55 },   // Red-orange brick
                { r: 170, g: 65, b: 45 },   // Darker red brick
            ];
            
            let rowOffset = 0;
            for (let y = 0; y < canvas.height; y += brickHeight + mortarWidth) {
                // Alternate rows are offset by half brick width (staggered pattern)
                const offset = rowOffset % 2 === 0 ? 0 : (brickWidth + mortarWidth) / 2;
                
                for (let x = -offset; x < canvas.width + brickWidth; x += brickWidth + mortarWidth) {
                    // Select random brick color
                    const colorIndex = Math.floor(Math.random() * brickColors.length);
                    const baseColor = brickColors[colorIndex];
                    
                    // Add variation to brick color
                    const variation = (Math.random() - 0.5) * 20;
                    const r = Math.max(100, Math.min(255, baseColor.r + variation));
                    const g = Math.max(50, Math.min(150, baseColor.g + variation * 0.5));
                    const b = Math.max(30, Math.min(100, baseColor.b + variation * 0.5));
                    
                    // Draw brick
                    const brickX = x + mortarWidth / 2;
                    const brickY = y + mortarWidth / 2;
                    const actualBrickWidth = brickWidth;
                    const actualBrickHeight = brickHeight;
                    
                    // Base brick color
                    context.fillStyle = `rgb(${r}, ${g}, ${b})`;
                    context.fillRect(brickX, brickY, actualBrickWidth, actualBrickHeight);
                    
                    // Add texture detail - darker spots
                    for (let i = 0; i < 8; i++) {
                        const spotX = brickX + Math.random() * actualBrickWidth;
                        const spotY = brickY + Math.random() * actualBrickHeight;
                        const spotRadius = Math.random() * 3 + 1;
                        const spotAlpha = Math.random() * 0.3 + 0.1;
                        
                        context.fillStyle = `rgba(0, 0, 0, ${spotAlpha})`;
                        context.beginPath();
                        context.arc(spotX, spotY, spotRadius, 0, Math.PI * 2);
                        context.fill();
                    }
                    
                    // Add lighter highlights
                    for (let i = 0; i < 3; i++) {
                        const highlightX = brickX + Math.random() * actualBrickWidth;
                        const highlightY = brickY + Math.random() * actualBrickHeight;
                        const highlightRadius = Math.random() * 2 + 0.5;
                        const highlightAlpha = Math.random() * 0.2 + 0.1;
                        
                        context.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
                        context.beginPath();
                        context.arc(highlightX, highlightY, highlightRadius, 0, Math.PI * 2);
                        context.fill();
                    }
                    
                    // Add subtle gradient for depth
                    const gradient = context.createLinearGradient(
                        brickX, brickY,
                        brickX + actualBrickWidth, brickY + actualBrickHeight
                    );
                    gradient.addColorStop(0, `rgba(0, 0, 0, 0.1)`);
                    gradient.addColorStop(0.5, `rgba(0, 0, 0, 0)`);
                    gradient.addColorStop(1, `rgba(0, 0, 0, 0.15)`);
                    context.fillStyle = gradient;
                    context.fillRect(brickX, brickY, actualBrickWidth, actualBrickHeight);
                    
                    // Add edge shadows for 3D effect
                    context.strokeStyle = `rgba(0, 0, 0, 0.2)`;
                    context.lineWidth = 1;
                    context.strokeRect(brickX, brickY, actualBrickWidth, actualBrickHeight);
                }
                
                rowOffset++;
            }
            
            // Draw mortar lines more prominently
            context.strokeStyle = '#6a6a6a';
            context.lineWidth = mortarWidth;
            
            // Horizontal mortar lines
            for (let y = 0; y <= canvas.height; y += brickHeight + mortarWidth) {
                context.beginPath();
                context.moveTo(0, y);
                context.lineTo(canvas.width, y);
                context.stroke();
            }
            
            // Vertical mortar lines (with offset for staggered rows)
            rowOffset = 0;
            for (let y = 0; y < canvas.height; y += brickHeight + mortarWidth) {
                const offset = rowOffset % 2 === 0 ? 0 : (brickWidth + mortarWidth) / 2;
                for (let x = -offset; x < canvas.width + brickWidth; x += brickWidth + mortarWidth) {
                    context.beginPath();
                    context.moveTo(x + brickWidth / 2, y);
                    context.lineTo(x + brickWidth / 2, y + brickHeight + mortarWidth);
                    context.stroke();
                }
                rowOffset++;
            }
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2); // Repeat texture
        
        return texture;
    }
}
