import * as THREE from 'three';
import type { VRGame } from './VRGame';

export class InputManager {
    private game: VRGame;
    private raycaster: THREE.Raycaster;
    private intersectedObject: THREE.Object3D | null = null;
    private selectedObject: THREE.Object3D | null = null;
    
    // 키보드 상태
    private keys: { [key: string]: boolean } = {};
    
    // 마우스 상태
    private mouse = new THREE.Vector2();
    private isMouseDown = false;

    constructor(game: VRGame) {
        this.game = game;
        this.raycaster = new THREE.Raycaster();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // 키보드 이벤트
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // 마우스 이벤트 (2D 모드용)
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        window.addEventListener('mousedown', (event) => this.onMouseDown(event));
        window.addEventListener('mouseup', (event) => this.onMouseUp(event));
        
        // 포인터 락 이벤트
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    }

    // VR 컨트롤러 이벤트 (VRGame에서 호출)
    public onSelectStart(event: any): void {
        const controller = event.target;
        
        // 레이캐스팅을 통한 오브젝트 감지
        this.raycaster.setFromXRController(controller);
        const intersects = this.raycaster.intersectObjects(this.game.scene.children, true);
        
        if (intersects.length > 0) {
            const intersected = intersects[0].object;
            if (intersected.userData.interactive) {
                this.selectedObject = intersected;
                this.onObjectSelected(intersected);
                
                // 햅틱 피드백
                if (controller.gamepad && controller.gamepad.hapticActuators) {
                    controller.gamepad.hapticActuators[0].pulse(0.5, 100);
                }
            }
        }
    }

    public onSelectEnd(event: any): void {
        if (this.selectedObject) {
            this.onObjectReleased(this.selectedObject);
            this.selectedObject = null;
        }
    }

    // 키보드 이벤트 핸들러
    private onKeyDown(event: KeyboardEvent): void {
        this.keys[event.code] = true;
        
        switch (event.code) {
            case 'KeyH':
                this.showHint();
                break;
            case 'Tab':
                event.preventDefault();
                this.toggleInventory();
                break;
            case 'KeyE':
                this.interactWithObject();
                break;
            case 'Escape':
                this.exitPointerLock();
                break;
        }
    }

    private onKeyUp(event: KeyboardEvent): void {
        this.keys[event.code] = false;
    }

    // 마우스 이벤트 핸들러
    private onMouseMove(event: MouseEvent): void {
        if (document.pointerLockElement === this.game.renderer.domElement) {
            // 포인터 락 상태에서 카메라 회전
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            this.game.camera.rotation.y -= movementX * 0.002;
            this.game.camera.rotation.x -= movementY * 0.002;
            this.game.camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.game.camera.rotation.x));
        } else {
            // 일반 마우스 이동 - 오브젝트 하이라이트용
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            this.updateMouseRaycasting();
        }
    }

    private onMouseDown(event: MouseEvent): void {
        this.isMouseDown = true;
        
        if (event.button === 0) { // 좌클릭
            if (!document.pointerLockElement) {
                // 포인터 락 요청
                this.game.renderer.domElement.requestPointerLock();
            } else {
                // 오브젝트 상호작용
                this.interactWithObject();
            }
        }
    }

    private onMouseUp(event: MouseEvent): void {
        this.isMouseDown = false;
    }

    private onPointerLockChange(): void {
        if (document.pointerLockElement === this.game.renderer.domElement) {
            console.log('포인터 락 활성화');
        } else {
            console.log('포인터 락 해제');
        }
    }

    private updateMouseRaycasting(): void {
        this.raycaster.setFromCamera(this.mouse, this.game.camera);
        const intersects = this.raycaster.intersectObjects(this.game.scene.children, true);
        
        // 이전 하이라이트 제거
        if (this.intersectedObject) {
            this.removeHighlight(this.intersectedObject);
            this.intersectedObject = null;
        }
        
        // 새로운 오브젝트 하이라이트
        if (intersects.length > 0) {
            const intersected = intersects[0].object;
            if (intersected.userData.interactive) {
                this.intersectedObject = intersected;
                this.addHighlight(intersected);
            }
        }
    }

    private addHighlight(object: THREE.Object3D): void {
        // 오브젝트 하이라이트 효과
        if (object instanceof THREE.Mesh && object.material) {
            const material = object.material as THREE.MeshLambertMaterial;
            if (!object.userData.originalColor) {
                object.userData.originalColor = material.color.clone();
            }
            material.color.setHex(0xffff00); // 노란색 하이라이트
        }
    }

    private removeHighlight(object: THREE.Object3D): void {
        // 하이라이트 제거
        if (object instanceof THREE.Mesh && object.material && object.userData.originalColor) {
            const material = object.material as THREE.MeshLambertMaterial;
            material.color.copy(object.userData.originalColor);
        }
    }

    private onObjectSelected(object: THREE.Object3D): void {
        console.log(`오브젝트 선택됨: ${object.userData.type} (${object.userData.id})`);
        
        // 오브젝트 타입별 처리
        switch (object.userData.type) {
            case 'key':
                this.handleKeyInteraction(object);
                break;
            case 'drawer':
                this.handleDrawerInteraction(object);
                break;
            case 'door':
                this.handleDoorInteraction(object);
                break;
            default:
                console.log('상호작용 가능한 오브젝트입니다.');
        }
    }

    private onObjectReleased(object: THREE.Object3D): void {
        console.log(`오브젝트 해제됨: ${object.userData.type}`);
    }

    private handleKeyInteraction(keyObject: THREE.Object3D): void {
        // 열쇠 줍기
        this.game.gameState.addToInventory({
            id: keyObject.userData.id,
            type: 'key',
            name: '황금 열쇠',
            object: keyObject
        });
        
        // 씬에서 제거
        this.game.scene.remove(keyObject);
        console.log('🔑 열쇠를 획득했습니다!');
    }

    private handleDrawerInteraction(drawerObject: THREE.Object3D): void {
        if (drawerObject.userData.locked) {
            // 열쇠가 있는지 확인
            const hasKey = this.game.gameState.hasItemInInventory('library_key_1');
            if (hasKey) {
                drawerObject.userData.locked = false;
                console.log('🔓 서랍이 열렸습니다!');
                
                // 서랍 애니메이션 (간단한 이동)
                const drawer = drawerObject as THREE.Mesh;
                drawer.position.z += 0.2;
                
                this.game.gameState.addScore(100);
            } else {
                console.log('🔒 서랍이 잠겨있습니다. 열쇠가 필요합니다.');
            }
        } else {
            console.log('서랍이 이미 열려있습니다.');
        }
    }

    private handleDoorInteraction(doorObject: THREE.Object3D): void {
        console.log('🚪 문과 상호작용');
        // 문 열기 로직 (향후 구현)
    }

    // 유틸리티 메서드들
    private showHint(): void {
        this.game.gameState.useHint();
    }

    private toggleInventory(): void {
        console.log('📦 인벤토리 토글');
        // 인벤토리 UI 토글 (향후 구현)
    }

    private interactWithObject(): void {
        if (this.intersectedObject) {
            this.onObjectSelected(this.intersectedObject);
        }
    }

    private exitPointerLock(): void {
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    // 메인 업데이트 루프
    public update(): void {
        this.handleMovement();
        this.updateControllerRaycasting();
    }

    private handleMovement(): void {
        if (!document.pointerLockElement) return;
        
        const moveSpeed = 0.1;
        const direction = new THREE.Vector3();
        
        // WASD 이동
        if (this.keys['KeyW']) direction.z -= 1;
        if (this.keys['KeyS']) direction.z += 1;
        if (this.keys['KeyA']) direction.x -= 1;
        if (this.keys['KeyD']) direction.x += 1;
        
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(moveSpeed);
            
            // 카메라 방향에 따른 이동
            direction.applyQuaternion(this.game.camera.quaternion);
            this.game.camera.position.add(direction);
        }
    }

    private updateControllerRaycasting(): void {
        // VR 컨트롤러 레이캐스팅 (VR 모드에서만)
        if (this.game.renderer.xr.isPresenting) {
            this.game.controllers.forEach((controller, index) => {
                if (controller.visible) {
                    this.raycaster.setFromXRController(controller);
                    const intersects = this.raycaster.intersectObjects(this.game.scene.children, true);
                    
                    // 컨트롤러 레이저 포인터 업데이트 (향후 구현)
                    this.updateControllerPointer(controller, intersects);
                }
            });
        }
    }

    private updateControllerPointer(controller: THREE.Group, intersects: THREE.Intersection[]): void {
        // 컨트롤러 레이저 포인터 시각화 (향후 구현)
        // 현재는 콘솔 로그만
        if (intersects.length > 0 && intersects[0].object.userData.interactive) {
            // console.log(`컨트롤러가 상호작용 가능한 오브젝트를 가리키고 있습니다: ${intersects[0].object.userData.type}`);
        }
    }
} 