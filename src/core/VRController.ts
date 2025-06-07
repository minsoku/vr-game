// @ts-nocheck
import * as THREE from 'three';

export class VRController {
    private game: any;
    private camera: THREE.Camera;
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    
    // 이동 설정
    private moveSpeed: number = 3.0; // m/s
    private turnSpeed: number = Math.PI; // 라디안/초
    private teleportMaxDistance: number = 10.0; // 최대 텔레포트 거리
    
    // 컨트롤러 상태
    private controllers: THREE.Group[] = [];
    private controllerGrips: THREE.Group[] = [];
    private gamepadStates: any[] = [];
    
    // 텔레포트 시스템
    private teleportMarker: THREE.Mesh | null = null;
    private teleportRay: THREE.Line | null = null;
    private isTeleporting: boolean = false;
    
    // 이동 상태
    private velocity: THREE.Vector3 = new THREE.Vector3();
    private isMoving: boolean = false;

    constructor(game: any) {
        this.game = game;
        this.camera = game.camera;
        this.scene = game.scene;
        this.renderer = game.renderer;
        
        this.setupControllers();
        this.createTeleportMarker();
    }

    private setupControllers(): void {
        console.log('🎮 VR 컨트롤러 설정 중...');
        
        // 컨트롤러 0 (보통 왼손)
        const controller0 = this.renderer.xr.getController(0);
        controller0.addEventListener('selectstart', (event) => this.onSelectStart(event, 0));
        controller0.addEventListener('selectend', (event) => this.onSelectEnd(event, 0));
        controller0.addEventListener('connected', (event) => this.onControllerConnected(event, 0));
        this.scene.add(controller0);
        this.controllers[0] = controller0;

        // 컨트롤러 1 (보통 오른손)
        const controller1 = this.renderer.xr.getController(1);
        controller1.addEventListener('selectstart', (event) => this.onSelectStart(event, 1));
        controller1.addEventListener('selectend', (event) => this.onSelectEnd(event, 1));
        controller1.addEventListener('connected', (event) => this.onControllerConnected(event, 1));
        this.scene.add(controller1);
        this.controllers[1] = controller1;

        // 컨트롤러 그립 모델
        const controllerModelFactory = new THREE.Group(); // 임시로 간단한 그룹 사용
        
        for (let i = 0; i < 2; i++) {
            const grip = this.renderer.xr.getControllerGrip(i);
            this.scene.add(grip);
            this.controllerGrips[i] = grip;
        }

        console.log('✅ VR 컨트롤러 설정 완료');
    }

    private onControllerConnected(event: any, controllerIndex: number): void {
        console.log(`🎮 컨트롤러 ${controllerIndex} 연결됨:`, event.data);
        this.gamepadStates[controllerIndex] = event.data.gamepad;
    }

    private onSelectStart(event: any, controllerIndex: number): void {
        console.log(`🎮 컨트롤러 ${controllerIndex} 선택 시작`);
        
        if (controllerIndex === 1) { // 오른손 컨트롤러로 텔레포트
            this.startTeleport(controllerIndex);
        }
    }

    private onSelectEnd(event: any, controllerIndex: number): void {
        console.log(`🎮 컨트롤러 ${controllerIndex} 선택 종료`);
        
        if (controllerIndex === 1 && this.isTeleporting) {
            this.executeTeleport();
        }
    }

    private createTeleportMarker(): void {
        // 텔레포트 마커 (발 모양 원)
        const geometry = new THREE.RingGeometry(0.1, 0.3, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        this.teleportMarker = new THREE.Mesh(geometry, material);
        this.teleportMarker.rotation.x = -Math.PI / 2; // 바닥에 평행
        this.teleportMarker.visible = false;
        this.scene.add(this.teleportMarker);

        // 텔레포트 레이 (포물선)
        const rayGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const rayMaterial = new THREE.LineBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });
        this.teleportRay = new THREE.Line(rayGeometry, rayMaterial);
        this.teleportRay.visible = false;
        this.scene.add(this.teleportRay);
    }

    private startTeleport(controllerIndex: number): void {
        this.isTeleporting = true;
        this.teleportMarker.visible = true;
        this.teleportRay.visible = true;
        console.log('📍 텔레포트 모드 시작');
    }

    private executeTeleport(): void {
        if (this.teleportMarker.visible) {
            // 카메라를 텔레포트 마커 위치로 이동
            const markerPosition = this.teleportMarker.position;
            const cameraHeight = 1.6; // 평균 눈높이
            
            this.camera.position.set(
                markerPosition.x,
                markerPosition.y + cameraHeight,
                markerPosition.z
            );
            
            console.log(`📍 텔레포트 완료: ${markerPosition.x.toFixed(2)}, ${markerPosition.z.toFixed(2)}`);
        }
        
        this.isTeleporting = false;
        this.teleportMarker.visible = false;
        this.teleportRay.visible = false;
    }

    public update(): void {
        this.updateControllerInput();
        this.updateTeleportVisuals();
        this.updateMovement();
    }

    private updateControllerInput(): void {
        const session = this.renderer.xr.getSession();
        if (!session) return;

        // 입력 소스 확인
        for (let i = 0; i < session.inputSources.length; i++) {
            const inputSource = session.inputSources[i];
            const gamepad = inputSource.gamepad;
            
            if (gamepad) {
                this.processGamepadInput(gamepad, i);
            }
        }
    }

    private processGamepadInput(gamepad: any, controllerIndex: number): void {
        // 왼손 컨트롤러 (보통 index 0) - 이동
        if (controllerIndex === 0) {
            this.processMovementInput(gamepad);
        }
        
        // 오른손 컨트롤러 (보통 index 1) - 회전 및 텔레포트
        if (controllerIndex === 1) {
            this.processRotationInput(gamepad);
            this.processTeleportInput(gamepad);
        }
    }

    private processMovementInput(gamepad: any): void {
        if (!gamepad.axes || gamepad.axes.length < 2) return;
        
        // 왼쪽 조이스틱 (axes 0, 1)
        const moveX = gamepad.axes[0]; // 좌우
        const moveZ = gamepad.axes[1]; // 앞뒤
        
        // 데드존 적용 (작은 움직임 무시)
        const deadzone = 0.1;
        const absX = Math.abs(moveX);
        const absZ = Math.abs(moveZ);
        
        if (absX > deadzone || absZ > deadzone) {
            // 카메라 방향 기준으로 이동 방향 계산
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Y축 제거 (수평 이동만)
            const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            // 이동 벡터 계산
            this.velocity.copy(forward.multiplyScalar(-moveZ)); // 앞뒤 (Z축 반전)
            this.velocity.add(right.multiplyScalar(moveX)); // 좌우
            this.velocity.multiplyScalar(this.moveSpeed);
            
            this.isMoving = true;
        } else {
            this.velocity.set(0, 0, 0);
            this.isMoving = false;
        }
    }

    private processRotationInput(gamepad: any): void {
        if (!gamepad.axes || gamepad.axes.length < 4) return;
        
        // 오른쪽 조이스틱 (axes 2, 3)
        const turnX = gamepad.axes[2]; // 좌우 회전
        
        // 스냅 회전 (30도씩)
        const deadzone = 0.7; // 높은 데드존으로 스냅 회전
        static_turnCooldown = static_turnCooldown || 0;
        
        if (static_turnCooldown <= 0) {
            if (turnX > deadzone) {
                // 오른쪽으로 30도 회전
                this.camera.rotation.y -= Math.PI / 6;
                static_turnCooldown = 30; // 0.5초 쿨다운
                console.log('↻ 오른쪽 회전');
            } else if (turnX < -deadzone) {
                // 왼쪽으로 30도 회전
                this.camera.rotation.y += Math.PI / 6;
                static_turnCooldown = 30; // 0.5초 쿨다운
                console.log('↺ 왼쪽 회전');
            }
        } else {
            static_turnCooldown--;
        }
    }

    private processTeleportInput(gamepad: any): void {
        if (!this.isTeleporting) return;
        
        // 텔레포트 방향 업데이트
        const controller = this.controllers[1];
        if (controller) {
            this.updateTeleportDirection(controller);
        }
    }

    private updateTeleportDirection(controller: THREE.Group): void {
        // 컨트롤러 방향으로 레이캐스팅
        const raycaster = new THREE.Raycaster();
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
        
        // 바닥과의 교차점 찾기
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        for (let intersect of intersects) {
            // 바닥 레벨 확인 (Y좌표가 0 근처)
            if (Math.abs(intersect.point.y) < 0.5) {
                const distance = controller.position.distanceTo(intersect.point);
                
                if (distance <= this.teleportMaxDistance) {
                    // 텔레포트 마커 위치 업데이트
                    this.teleportMarker.position.copy(intersect.point);
                    this.teleportMarker.position.y = 0.01; // 바닥에서 살짝 위
                    
                    // 텔레포트 레이 업데이트
                    this.updateTeleportRay(controller.position, intersect.point);
                    break;
                }
            }
        }
    }

    private updateTeleportRay(start: THREE.Vector3, end: THREE.Vector3): void {
        // 포물선 텔레포트 레이 생성
        const points = [];
        const segments = 20;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3();
            
            // 포물선 계산 (시작점에서 끝점까지)
            point.lerpVectors(start, end, t);
            
            // 포물선 높이 추가 (중간에 아치 형태)
            const height = Math.sin(t * Math.PI) * 2.0;
            point.y += height;
            
            points.push(point);
        }
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.teleportRay.geometry.dispose();
        this.teleportRay.geometry = geometry;
    }

    private updateTeleportVisuals(): void {
        if (this.isTeleporting && this.teleportMarker.visible) {
            // 텔레포트 마커 애니메이션 (펄스 효과)
            const time = Date.now() * 0.005;
            const scale = 1 + Math.sin(time * 2) * 0.2;
            this.teleportMarker.scale.set(scale, 1, scale);
        }
    }

    private updateMovement(): void {
        if (this.isMoving) {
            // 프레임 시간 계산
            const deltaTime = 1/60; // 60fps 가정
            
            // 카메라 위치 업데이트
            this.camera.position.add(
                this.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // 경계 체크 (맵 제한)
            this.camera.position.x = Math.max(-10, Math.min(10, this.camera.position.x));
            this.camera.position.z = Math.max(-10, Math.min(10, this.camera.position.z));
            this.camera.position.y = Math.max(1.6, this.camera.position.y); // 최소 높이
        }
    }

    public dispose(): void {
        if (this.teleportMarker) {
            this.scene.remove(this.teleportMarker);
            this.teleportMarker.geometry.dispose();
            this.teleportMarker.material.dispose();
        }
        
        if (this.teleportRay) {
            this.scene.remove(this.teleportRay);
            this.teleportRay.geometry.dispose();
            this.teleportRay.material.dispose();
        }
    }
}

// 전역 변수를 위한 임시 해결책
let static_turnCooldown = 0; 