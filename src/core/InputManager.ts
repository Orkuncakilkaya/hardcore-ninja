import * as THREE from 'three';

// Define a type for the input data
type InputData = {
  keys: { [key: string]: boolean };
  mouse: THREE.Vector2;
  isLeftMouseDown?: boolean;
};

// Define a type for the callback function
type InputCallback = (data: InputData) => void;

export class InputManager {
  public keys: { [key: string]: boolean } = {};
  public mouse: THREE.Vector2 = new THREE.Vector2();
  public mouseRaycaster: THREE.Raycaster = new THREE.Raycaster();
  private isLeftMouseButtonDown: boolean = false;
  private mouseWorldPosition: THREE.Vector3 | null = null;

  constructor() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      this.emit('input', {
        keys: this.keys,
        mouse: this.mouse,
        isLeftMouseDown: this.isLeftMouseButtonDown,
      });
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      this.emit('input', {
        keys: this.keys,
        mouse: this.mouse,
        isLeftMouseDown: this.isLeftMouseButtonDown,
      });
    });
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.emit('input', {
      keys: this.keys,
      mouse: this.mouse,
      isLeftMouseDown: this.isLeftMouseButtonDown,
    });
  }

  private onMouseDown(event: MouseEvent) {
    if (event.button === 0) {
      // Left mouse button
      this.isLeftMouseButtonDown = true;
      this.emit('mouseDown', { keys: this.keys, mouse: this.mouse });
    }
  }

  private onMouseUp(event: MouseEvent) {
    if (event.button === 0) {
      // Left mouse button
      this.isLeftMouseButtonDown = false;
      this.emit('mouseUp', { keys: this.keys, mouse: this.mouse });
    }
  }

  private listeners: { [key: string]: InputCallback[] } = {};

  public on(event: string, callback: InputCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public emit(event: string, data?: InputData) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback =>
        callback(data || { keys: this.keys, mouse: this.mouse })
      );
    }
  }

  public isLeftMouseDown(): boolean {
    return this.isLeftMouseButtonDown;
  }

  public getMouseGroundIntersection(
    camera: THREE.Camera,
    groundPlane: THREE.Plane
  ): THREE.Vector3 | null {
    this.mouseRaycaster.setFromCamera(this.mouse, camera);
    const target = new THREE.Vector3();
    const intersection = this.mouseRaycaster.ray.intersectPlane(groundPlane, target);
    if (intersection) {
      this.mouseWorldPosition = intersection.clone();
    }
    return intersection;
  }

  public getMouseWorldPosition(): THREE.Vector3 | null {
    return this.mouseWorldPosition;
  }
}
