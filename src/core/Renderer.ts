import * as THREE from 'three';

export class Renderer {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    private gridHelper: THREE.GridHelper;

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

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Grid Helper (will be updated with actual map size)
        this.gridHelper = new THREE.GridHelper(70, 70);
        this.scene.add(this.gridHelper);

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Update the grid size based on map configuration
     */
    public updateGridSize(size: number) {
        // Remove old grid
        this.scene.remove(this.gridHelper);

        // Create new grid with updated size
        this.gridHelper = new THREE.GridHelper(size, size);
        this.scene.add(this.gridHelper);
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
