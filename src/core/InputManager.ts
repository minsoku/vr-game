// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import type { VRGame } from './VRGame';

export class InputManager {
    private game: VRGame;
    private scene: BABYLON.Scene;
    private camera: BABYLON.Camera;
    private intersectedMesh: BABYLON.Mesh | null = null;
    private selectedMesh: BABYLON.Mesh | null = null;
    
    // 키보드 상태
    private keys: { [key: string]: boolean } = {};
    
    // 마우스 상태
    private isMouseDown = false;
    private pointerLocked = false;

    constructor(game: VRGame) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // 키보드 이벤트
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // 마우스 이벤트 (3D 모드용)
        this.scene.onPointerObservable.add((pointerInfo) => {
            this.onPointerEvent(pointerInfo);
        });
        
        // 포인터 락 이벤트
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
    }

    private onPointerEvent(pointerInfo: BABYLON.PointerInfo): void {
        switch (pointerInfo.type) {
            case BABYLON.PointerEventTypes.POINTERMOVE:
                this.onPointerMove(pointerInfo);
                break;
            case BABYLON.PointerEventTypes.POINTERDOWN:
                this.onPointerDown(pointerInfo);
                break;
            case BABYLON.PointerEventTypes.POINTERUP:
                this.onPointerUp(pointerInfo);
                break;
        }
    }

    // VR 컨트롤러 이벤트 (VRGame에서 호출)
    public onSelectStart(event: any): void {
        console.log('VR 컨트롤러 선택 시작:', event);
        
        // VR 컨트롤러 레이캐스팅은 VRController에서 처리
        // 여기서는 일반적인 상호작용만 처리
    }

    public onSelectEnd(event: any): void {
        console.log('VR 컨트롤러 선택 종료:', event);
        
        if (this.selectedMesh) {
            this.onObjectReleased(this.selectedMesh);
            this.selectedMesh = null;
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
            case 'KeyC':
                // 카메라 컨트롤 토글
                this.toggleCameraControls();
                break;
        }
    }

    private onKeyUp(event: KeyboardEvent): void {
        this.keys[event.code] = false;
    }

    // 포인터/마우스 이벤트 핸들러
    private onPointerMove(pointerInfo: BABYLON.PointerInfo): void {
        if (this.pointerLocked) {
            // 포인터 락 상태에서 카메라 회전
            const deltaX = pointerInfo.event.movementX || 0;
            const deltaY = pointerInfo.event.movementY || 0;
            
            if (this.camera instanceof BABYLON.FreeCamera) {
                this.camera.rotation.y -= deltaX * 0.002;
                this.camera.rotation.x -= deltaY * 0.002;
                this.camera.rotation.x = BABYLON.Scalar.Clamp(this.camera.rotation.x, -Math.PI/2, Math.PI/2);
            }
        } else {
            // 일반 마우스 이동 - 오브젝트 하이라이트용
            this.updateMouseRaycasting(pointerInfo);
        }
    }

    private onPointerDown(pointerInfo: BABYLON.PointerInfo): void {
        this.isMouseDown = true;
        
        if (pointerInfo.event.button === 0) { // 좌클릭
            if (!this.pointerLocked) {
                // 포인터 락 요청
                this.requestPointerLock();
            } else {
                // 오브젝트 상호작용
                this.interactWithObject();
            }
        }
    }

    private onPointerUp(pointerInfo: BABYLON.PointerInfo): void {
        this.isMouseDown = false;
    }

    private requestPointerLock(): void {
        const canvas = this.game.canvas;
        if (canvas && canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }

    private onPointerLockChange(): void {
        const canvas = this.game.canvas;
        this.pointerLocked = document.pointerLockElement === canvas;
        
        if (this.pointerLocked) {
            console.log('포인터 락 활성화');
        } else {
            console.log('포인터 락 해제');
        }
    }

    private updateMouseRaycasting(pointerInfo: BABYLON.PointerInfo): void {
        // 마우스 위치에서 레이캐스팅
        const pickInfo = this.scene.pick(pointerInfo.event.offsetX, pointerInfo.event.offsetY);
        
        // 이전 하이라이트 제거
        if (this.intersectedMesh) {
            this.removeHighlight(this.intersectedMesh);
            this.intersectedMesh = null;
        }
        
        // 새로운 오브젝트 하이라이트
        if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
            const mesh = pickInfo.pickedMesh as BABYLON.Mesh;
            if (mesh.metadata && mesh.metadata.interactive) {
                this.intersectedMesh = mesh;
                this.addHighlight(mesh);
            }
        }
    }

    private addHighlight(mesh: BABYLON.Mesh): void {
        // 오브젝트 하이라이트 효과
        if (mesh.material instanceof BABYLON.StandardMaterial) {
            const material = mesh.material;
            if (!mesh.metadata.originalColor) {
                mesh.metadata.originalColor = material.diffuseColor.clone();
            }
            material.diffuseColor = new BABYLON.Color3(1, 1, 0); // 노란색 하이라이트
        }
    }

    private removeHighlight(mesh: BABYLON.Mesh): void {
        // 하이라이트 제거
        if (mesh.material instanceof BABYLON.StandardMaterial && mesh.metadata.originalColor) {
            const material = mesh.material;
            material.diffuseColor = mesh.metadata.originalColor;
        }
    }

    private onObjectSelected(mesh: BABYLON.Mesh): void {
        if (!mesh.metadata) return;
        
        console.log(`오브젝트 선택됨: ${mesh.metadata.type} (${mesh.metadata.id})`);
        
        // 오브젝트 타입별 처리
        switch (mesh.metadata.type) {
            case 'key':
                this.handleKeyInteraction(mesh);
                break;
            case 'drawer':
                this.handleDrawerInteraction(mesh);
                break;
            case 'door':
                this.handleDoorInteraction(mesh);
                break;
            default:
                console.log('상호작용 가능한 오브젝트입니다.');
        }
    }

    private onObjectReleased(mesh: BABYLON.Mesh): void {
        console.log(`오브젝트 해제됨: ${mesh.metadata?.type}`);
    }

    private handleKeyInteraction(keyMesh: BABYLON.Mesh): void {
        if (!keyMesh.metadata) return;
        
        console.log(`🔑 열쇠 수집: ${keyMesh.metadata.id}`);
        
        // 게임 상태에 열쇠 추가
        this.game.gameState.addItem('key', keyMesh.metadata.id);
        
        // 오디오 재생
        this.game.audioManager.onKeyPickup();
        
        // 오브젝트 제거
        keyMesh.dispose();
        
        console.log('✅ 열쇠를 획득했습니다!');
    }

    private handleDrawerInteraction(drawerMesh: BABYLON.Mesh): void {
        if (!drawerMesh.metadata) return;
        
        if (drawerMesh.metadata.locked) {
            // 열쇠가 필요한 서랍
            const hasKey = this.game.gameState.hasItem('key', 'library_key_1');
            if (hasKey) {
                console.log('🔓 서랍이 열렸습니다!');
                drawerMesh.metadata.locked = false;
                
                // 서랍 열기 애니메이션 (간단한 이동)
                BABYLON.Animation.CreateAndStartAnimation(
                    "drawerOpen",
                    drawerMesh,
                    "position.z",
                    30,
                    30,
                    drawerMesh.position.z,
                    drawerMesh.position.z + 0.3,
                    BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
                );
                
                this.game.audioManager.onDrawerOpen();
                this.game.gameState.addScore(50);
            } else {
                console.log('🔒 이 서랍은 잠겨있습니다. 열쇠가 필요해요.');
            }
        } else {
            console.log('📦 서랍을 확인했습니다.');
        }
    }

    private handleDoorInteraction(doorMesh: BABYLON.Mesh): void {
        console.log('🚪 문과 상호작용했습니다.');
        // 문 열기 로직 구현
    }

    private showHint(): void {
        console.log('💡 힌트: 주변을 자세히 살펴보세요!');
        this.game.audioManager.onHintShow();
    }

    private toggleInventory(): void {
        console.log('🎒 인벤토리 토글');
        // 인벤토리 UI 토글 로직
    }

    private interactWithObject(): void {
        if (this.intersectedMesh) {
            this.selectedMesh = this.intersectedMesh;
            this.onObjectSelected(this.intersectedMesh);
        } else {
            // 중앙 화면에서 레이캐스팅
            const pickInfo = this.scene.pick(
                this.scene.getEngine().getRenderWidth() / 2,
                this.scene.getEngine().getRenderHeight() / 2
            );
            
            if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
                const mesh = pickInfo.pickedMesh as BABYLON.Mesh;
                if (mesh.metadata && mesh.metadata.interactive) {
                    this.selectedMesh = mesh;
                    this.onObjectSelected(mesh);
                }
            }
        }
    }

    private exitPointerLock(): void {
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    private toggleCameraControls(): void {
        console.log('🎮 카메라 컨트롤 토글 시도...');
        
        if (!(this.camera instanceof BABYLON.FreeCamera)) {
            console.warn('⚠️ 카메라가 FreeCamera가 아닙니다.');
            return;
        }

        const freeCamera = this.camera as BABYLON.FreeCamera;
        
        try {
            // inputs가 존재하는지 확인
            if (!freeCamera.inputs) {
                console.warn('⚠️ 카메라 inputs이 초기화되지 않았습니다.');
                return;
            }

            // 현재 연결된 입력 확인
            const hasKeyboard = freeCamera.inputs.attached && freeCamera.inputs.attached.keyboard;
            const hasMouse = freeCamera.inputs.attached && freeCamera.inputs.attached.mouse;

            if (hasKeyboard || hasMouse) {
                // 입력 제거
                if (hasKeyboard) {
                    freeCamera.inputs.removeByType("FreeCameraKeyboardMoveInput");
                }
                if (hasMouse) {
                    freeCamera.inputs.removeByType("FreeCameraMouseInput");
                }
                console.log('✅ 카메라 컨트롤 해제됨');
            } else {
                // 입력 추가
                freeCamera.inputs.addKeyboard();
                freeCamera.inputs.addMouse();
                console.log('✅ 카메라 컨트롤 활성화됨');
            }
        } catch (error) {
            console.error('❌ 카메라 컨트롤 토글 실패:', error);
            
            // 최후의 수단: attachControls/detachControls 시도
            try {
                if (typeof freeCamera.attachControls === 'function') {
                    freeCamera.attachControls(this.game.canvas, true);
                    console.log('✅ attachControls로 카메라 활성화됨');
                } else {
                    console.warn('⚠️ attachControls 메서드를 사용할 수 없습니다.');
                }
            } catch (fallbackError) {
                console.error('❌ 카메라 컨트롤 완전 실패:', fallbackError);
            }
        }
    }

    public update(): void {
        this.handleMovement();
    }

    private handleMovement(): void {
        // Babylon.js FreeCamera는 이미 WASD 키 컨트롤이 내장되어 있음
        // 포인터 락 상태에서만 추가 처리가 필요한 경우에만 구현
        
        // 현재는 기본 카메라 컨트롤을 사용하므로 별도 처리 불필요
        // 필요한 경우 여기에 추가 로직 구현
    }

    public dispose(): void {
        // 이벤트 리스너 정리
        document.removeEventListener('keydown', (event) => this.onKeyDown(event));
        document.removeEventListener('keyup', (event) => this.onKeyUp(event));
        document.removeEventListener('pointerlockchange', () => this.onPointerLockChange());
        
        // 포인터 락 해제
        this.exitPointerLock();
    }
} 