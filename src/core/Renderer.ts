import * as THREE from 'three';

export class Renderer {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private gridHelper: THREE.GridHelper;
    private directionalLight: THREE.DirectionalLight;

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 20, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        const container = document.getElementById('game-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        } else {
            document.body.appendChild(this.renderer.domElement);
        }

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        
        // Configure shadow camera to cover the entire map area
        // Initial map size is 70x70, shadow camera will be updated when map loads
        this.updateShadowCamera(70);
        
        // Increase shadow map resolution for better quality
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        
        // Shadow bias to prevent shadow acne
        this.directionalLight.shadow.bias = -0.0001;
        
        this.scene.add(this.directionalLight);

        // Grid Helper (will be updated with actual map size)
        // Start as closed by default
        this.gridHelper = new THREE.GridHelper(70, 70);
        this.gridHelper.visible = false; // Closed by default
        this.scene.add(this.gridHelper);

        // Define setter/getter for window.groundGridDebug
        this.setupGridDebugControl();

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    private setupGridDebugControl() {
        // Control mechanism for window.groundGridDebug
        let gridDebugValue = 0; // Closed by default

        Object.defineProperty(window, 'groundGridDebug', {
            get: () => gridDebugValue,
            set: (value: number) => {
                gridDebugValue = value ? 1 : 0;
                this.updateGridVisibility();
            },
            configurable: true
        });

        // Perform initial check
        this.updateGridVisibility();
    }

    private updateGridVisibility() {
        const shouldShow = (window as any).groundGridDebug === 1;
        if (this.gridHelper) {
            this.gridHelper.visible = shouldShow;
        }
    }

    /**
     * Update the grid size based on map configuration
     */
    public updateGridSize(size: number) {
        // Remove old grid
        this.scene.remove(this.gridHelper);

        // Create new grid with updated size
        this.gridHelper = new THREE.GridHelper(size, size);
        // Set visibility based on window.groundGridDebug value
        this.updateGridVisibility();
        this.scene.add(this.gridHelper);
        
        // Update shadow camera to match map size
        this.updateShadowCamera(size);
    }

    /**
     * Update shadow camera frustum to cover the entire map area
     */
    private updateShadowCamera(mapSize: number) {
        if (!this.directionalLight) return;
        
        // Shadow camera frustum should cover the entire map with extra margin
        const shadowSize = mapSize * 1.5; // Add extra margin for safety
        this.directionalLight.shadow.camera.left = -shadowSize;
        this.directionalLight.shadow.camera.right = shadowSize;
        this.directionalLight.shadow.camera.top = shadowSize;
        this.directionalLight.shadow.camera.bottom = -shadowSize;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 100;
        
        // Update projection matrix
        this.directionalLight.shadow.camera.updateProjectionMatrix();
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }
}
