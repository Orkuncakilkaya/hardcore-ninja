import * as THREE from 'three';

export class InputManager {
    public keys: { [key: string]: boolean } = {};
    public mouse: THREE.Vector2 = new THREE.Vector2();
    public mouseRaycaster: THREE.Raycaster = new THREE.Raycaster();
    private isLeftMouseButtonDown: boolean = false;

    constructor() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    private onMouseMove(event: MouseEvent) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    private onMouseDown(event: MouseEvent) {
        if (event.button === 0) { // Left mouse button
            this.isLeftMouseButtonDown = true;
        }
    }

    private onMouseUp(event: MouseEvent) {
        if (event.button === 0) { // Left mouse button
            this.isLeftMouseButtonDown = false;
        }
    }

    public isLeftMouseDown(): boolean {
        return this.isLeftMouseButtonDown;
    }

    public getMouseGroundIntersection(camera: THREE.Camera, groundPlane: THREE.Plane): THREE.Vector3 | null {
        this.mouseRaycaster.setFromCamera(this.mouse, camera);
        const target = new THREE.Vector3();
        return this.mouseRaycaster.ray.intersectPlane(groundPlane, target);
    }
}
