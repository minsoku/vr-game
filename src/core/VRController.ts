// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';

export class VRController {
    private game: any;
    private scene: BABYLON.Scene;
    private camera: BABYLON.Camera;
    private engine: BABYLON.Engine;
    
    // XR 관련
    private xrHelper: BABYLON.WebXRDefaultExperience | null = null;
    private xrControllers: BABYLON.WebXRInputSource[] = [];
    private leftController: BABYLON.WebXRInputSource | null = null;
    private rightController: BABYLON.WebXRInputSource | null = null;
    
    // 이동 설정 (2배 크기 환경에 맞게 조정)
    private moveSpeed: number = 12.0; // m/s (2배 크기에 맞게 증가)
    private turnSpeed: number = Math.PI; // 라디안/초
    private teleportMaxDistance: number = 20.0; // 최대 텔레포트 거리 (2배 크기에 맞게 증가)
    
    // 텔레포트 시스템
    private teleportMarker: BABYLON.Mesh | null = null;
    private teleportRay: BABYLON.Mesh | null = null;
    private isTeleporting: boolean = false;
    
    // 이동 상태
    private velocity: BABYLON.Vector3 = new BABYLON.Vector3();
    private isMoving: boolean = false;
    private turnCooldown: number = 0;

    constructor(game: any) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.engine = game.engine;
        
        // VRGame의 XR Helper를 가져옴
        this.xrHelper = game.getXRHelper();
        
        this.initializeVR();
    }

    private async initializeVR(): Promise<void> {
        try {
            console.log('🎮 VR 컨트롤러 설정 중...');
            
            // XR Helper가 없으면 대기
            if (!this.xrHelper) {
                console.log('⏳ XR Helper를 기다리는 중...');
                // XR Helper가 생성될 때까지 대기
                setTimeout(() => {
                    this.xrHelper = this.game.getXRHelper();
                    if (this.xrHelper) {
                        this.setupVRFeatures();
                    }
                }, 1000);
                return;
            }

            this.setupVRFeatures();
            
        } catch (error) {
            console.error('❌ VR 초기화 실패:', error);
        }
    }

    private setupVRFeatures(): void {
        if (!this.xrHelper) return;

        console.log('🎮 VR 기능 설정 중...');

        // WebXR locomotion 시스템 활성화 (조이스틱 이동)
        const featureManager = this.xrHelper.baseExperience.featuresManager;
        try {
            const locomotion = featureManager.enableFeature(BABYLON.WebXRFeatureName.MOVEMENT, "latest", {
                xrInput: this.xrHelper.input,
                movementEnabled: true,
                rotationEnabled: true
            });
            console.log('🚶 WebXR Locomotion 활성화됨');
        } catch (error) {
            console.log('⚠️ WebXR Locomotion 활성화 실패, 수동 구현 사용:', error);
        }

        // 컨트롤러 설정
        this.setupControllers();
        this.createTeleportMarker();
        
        console.log('✅ VR 컨트롤러 설정 완료');
    }

    private setupControllers(): void {
        if (!this.xrHelper || !this.xrHelper.input) {
            console.error('❌ XR Helper 또는 Input이 없습니다.');
            return;
        }

        console.log('🎮 컨트롤러 이벤트 리스너 설정 중...');

        // 컨트롤러 연결 이벤트
        this.xrHelper.input.onControllerAddedObservable.add((controller: BABYLON.WebXRInputSource) => {
            console.log(`🎮 컨트롤러 연결됨: ${controller.inputSource.handedness}`);
            this.onControllerAdded(controller);
        });

        // 컨트롤러 제거 이벤트
        this.xrHelper.input.onControllerRemovedObservable.add((controller: BABYLON.WebXRInputSource) => {
            console.log(`🎮 컨트롤러 제거됨: ${controller.inputSource.handedness}`);
            this.onControllerRemoved(controller);
        });
    }

    private onControllerAdded(controller: BABYLON.WebXRInputSource): void {
        this.xrControllers.push(controller);
        
        // 손 구분
        if (controller.inputSource.handedness === 'left') {
            this.leftController = controller;
            this.setupLeftControllerEvents(controller);
        } else if (controller.inputSource.handedness === 'right') {
            this.rightController = controller;
            this.setupRightControllerEvents(controller);
        }

        console.log(`✅ ${controller.inputSource.handedness} 컨트롤러 설정 완료`);
    }

    private onControllerRemoved(controller: BABYLON.WebXRInputSource): void {
        const index = this.xrControllers.indexOf(controller);
        if (index > -1) {
            this.xrControllers.splice(index, 1);
        }

        if (controller.inputSource.handedness === 'left') {
            this.leftController = null;
        } else if (controller.inputSource.handedness === 'right') {
            this.rightController = null;
        }
    }

    private setupLeftControllerEvents(controller: BABYLON.WebXRInputSource): void {
        // 왼손 컨트롤러 - 이동용
        controller.onMotionControllerInitObservable.add((motionController) => {
            console.log('🕹️ 왼손 모션 컨트롤러 초기화됨');
            
            // 트리거 버튼
            const triggerComponent = motionController.getComponent("xr-standard-trigger");
            if (triggerComponent) {
                triggerComponent.onButtonStateChangedObservable.add((state) => {
                    if (state.pressed) {
                        console.log('🔴 왼손 트리거 눌림');
                        this.onLeftTriggerPressed();
                    }
                });
            }

            // 썸스틱 (이동용)
            const thumbstickComponent = motionController.getComponent("xr-standard-thumbstick");
            if (thumbstickComponent) {
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    this.processMovementInput(axes.x, axes.y);
                });
            }
        });
    }

    private setupRightControllerEvents(controller: BABYLON.WebXRInputSource): void {
        // 오른손 컨트롤러 - 텔레포트 및 회전용
        controller.onMotionControllerInitObservable.add((motionController) => {
            console.log('🕹️ 오른손 모션 컨트롤러 초기화됨');
            
            // 트리거 버튼 (텔레포트)
            const triggerComponent = motionController.getComponent("xr-standard-trigger");
            if (triggerComponent) {
                triggerComponent.onButtonStateChangedObservable.add((state) => {
                    if (state.pressed) {
                        console.log('🔴 오른손 트리거 눌림 - 텔레포트 시작');
                        this.startTeleport();
                    } else {
                        console.log('🔴 오른손 트리거 해제 - 텔레포트 실행');
                        this.executeTeleport();
                    }
                });
            }

            // 썸스틱 (회전용)
            const thumbstickComponent = motionController.getComponent("xr-standard-thumbstick");
            if (thumbstickComponent) {
                thumbstickComponent.onAxisValueChangedObservable.add((axes) => {
                    this.processRotationInput(axes.x, axes.y);
                });
            }

            // 그립 버튼
            const gripComponent = motionController.getComponent("xr-standard-squeeze");
            if (gripComponent) {
                gripComponent.onButtonStateChangedObservable.add((state) => {
                    if (state.pressed) {
                        console.log('✊ 오른손 그립 눌림');
                        this.onRightGripPressed();
                    }
                });
            }
        });
    }

    private processMovementInput(moveX: number, moveZ: number): void {
        // 데드존 적용
        const deadzone = 0.15;
        const absX = Math.abs(moveX);
        const absZ = Math.abs(moveZ);
        
        if (absX > deadzone || absZ > deadzone) {
            // VR 모드에서는 XR 카메라의 position을 직접 조작
            if (this.xrHelper && this.xrHelper.baseExperience.camera) {
                const xrCamera = this.xrHelper.baseExperience.camera;
                
                // XR 카메라의 방향 기준으로 이동 계산
                const forward = xrCamera.getDirection(BABYLON.Vector3.Forward());
                forward.y = 0; // Y축 고정 (수평 이동만)
                forward.normalize();
                
                const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up()).normalize();
                
                // 이동 벡터 계산 (조이스틱 입력 반전)
                const movement = forward.scale(-moveZ).add(right.scale(moveX));
                this.velocity = movement.scale(this.moveSpeed);
                this.isMoving = true;
                
                console.log(`🎮 조이스틱 이동: X=${moveX.toFixed(2)}, Z=${moveZ.toFixed(2)}`);
            } else {
                // 일반 카메라 모드
                const cameraDirection = this.camera.getDirection(BABYLON.Vector3.Forward());
                const forward = new BABYLON.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
                const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up()).normalize();
                
                this.velocity = forward.scale(-moveZ).add(right.scale(moveX)).scale(this.moveSpeed);
                this.isMoving = true;
            }
        } else {
            this.velocity = BABYLON.Vector3.Zero();
            this.isMoving = false;
        }
    }

    private processRotationInput(turnX: number, turnY: number): void {
        // 스냅 회전 (30도씩)
        const deadzone = 0.7;
        
        if (this.turnCooldown <= 0) {
            if (turnX > deadzone) {
                // 오른쪽으로 30도 회전
                this.camera.rotation.y -= Math.PI / 6;
                this.turnCooldown = 30; // 0.5초 쿨다운
                console.log('↻ 오른쪽 회전');
            } else if (turnX < -deadzone) {
                // 왼쪽으로 30도 회전
                this.camera.rotation.y += Math.PI / 6;
                this.turnCooldown = 30;
                console.log('↺ 왼쪽 회전');
            }
        }
    }

    private startTeleport(): void {
        this.isTeleporting = true;
        if (this.teleportMarker) {
            this.teleportMarker.setEnabled(true);
        }
        if (this.teleportRay) {
            this.teleportRay.setEnabled(true);
        }
        console.log('📍 텔레포트 모드 시작');
    }

    private executeTeleport(): void {
        if (this.isTeleporting && this.teleportMarker && this.teleportMarker.isEnabled()) {
            // 텔레포트 실행
            const teleportPosition = this.teleportMarker.position.clone();
            teleportPosition.y = this.camera.position.y; // 높이 유지
            
            this.camera.position = teleportPosition;
            console.log('📍 텔레포트 완료:', teleportPosition);
        }
        
        this.isTeleporting = false;
        if (this.teleportMarker) {
            this.teleportMarker.setEnabled(false);
        }
        if (this.teleportRay) {
            this.teleportRay.setEnabled(false);
        }
    }

    private onLeftTriggerPressed(): void {
        console.log('🔫 왼손 트리거 액션');
        // 왼손 트리거 동작 구현
    }

    private onRightGripPressed(): void {
        console.log('✊ 오른손 그립 액션');
        // 오른손 그립 동작 구현 (잡기 등)
    }

    private createTeleportMarker(): void {
        // 텔레포트 마커 생성
        this.teleportMarker = BABYLON.MeshBuilder.CreateCylinder("teleportMarker", {
            height: 0.1,
            diameter: 1.0
        }, this.scene);
        
        const teleportMaterial = new BABYLON.StandardMaterial("teleportMaterial", this.scene);
        teleportMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // 초록색
        teleportMaterial.alpha = 0.5;
        this.teleportMarker.material = teleportMaterial;
        this.teleportMarker.setEnabled(false);

        // 텔레포트 레이 생성
        const rayPoints = [
            new BABYLON.Vector3(0, 0, 0),
            new BABYLON.Vector3(0, 0, -this.teleportMaxDistance)
        ];
        this.teleportRay = BABYLON.MeshBuilder.CreateLines("teleportRay", {
            points: rayPoints
        }, this.scene);
        this.teleportRay.color = new BABYLON.Color3(0, 1, 0);
        this.teleportRay.setEnabled(false);
    }

    private updateTeleportVisuals(): void {
        if (!this.isTeleporting || !this.rightController) return;

        // 오른손 컨트롤러 위치와 방향 가져오기
        const controllerMesh = this.rightController.grip || this.rightController.pointer;
        if (!controllerMesh) return;

        // 레이캐스팅으로 바닥 찾기
        const ray = new BABYLON.Ray(controllerMesh.position, controllerMesh.forward);
        const hit = this.scene.pickWithRay(ray);

        if (hit && hit.hit && hit.distance <= this.teleportMaxDistance) {
            // 텔레포트 마커 위치 업데이트
            if (this.teleportMarker) {
                this.teleportMarker.position = hit.pickedPoint!.clone();
                this.teleportMarker.position.y += 0.01; // 바닥에서 살짝 위
            }

            // 텔레포트 레이 업데이트
            if (this.teleportRay) {
                const rayPoints = [
                    controllerMesh.position,
                    hit.pickedPoint!
                ];
                this.teleportRay.dispose();
                this.teleportRay = BABYLON.MeshBuilder.CreateLines("teleportRay", {
                    points: rayPoints
                }, this.scene);
                this.teleportRay.color = new BABYLON.Color3(0, 1, 0);
            }
        }
    }

    private updateMovement(): void {
        if (this.isMoving && this.velocity.length() > 0) {
            // 프레임 시간 계산
            const deltaTime = this.engine.getDeltaTime() / 1000; // 초 단위
            const movement = this.velocity.scale(deltaTime);
            
            // VR 모드와 일반 모드 구분해서 카메라 이동
            if (this.xrHelper && this.xrHelper.baseExperience.camera) {
                // VR 모드: XR 카메라 이동
                const xrCamera = this.xrHelper.baseExperience.camera;
                const newPosition = xrCamera.position.add(movement);
                
                // 경계 체크 적용
                newPosition.x = BABYLON.Scalar.Clamp(newPosition.x, -15, 15);
                newPosition.z = BABYLON.Scalar.Clamp(newPosition.z, -15, 15);
                newPosition.y = Math.max(0.1, newPosition.y); // 바닥 아래로 가지 않도록
                
                // XR 카메라 위치 직접 설정
                xrCamera.position.copyFrom(newPosition);
                
                console.log(`🚶 VR 이동: ${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)}`);
            } else {
                // 일반 모드: 기본 카메라 이동
                this.camera.position.addInPlace(movement);
                
                // 경계 체크 (맵 제한)
                this.camera.position.x = BABYLON.Scalar.Clamp(this.camera.position.x, -15, 15);
                this.camera.position.z = BABYLON.Scalar.Clamp(this.camera.position.z, -15, 15);  
                this.camera.position.y = Math.max(1.6, this.camera.position.y); // 최소 높이
            }
        }
        
        // 회전 쿨다운 감소
        if (this.turnCooldown > 0) {
            this.turnCooldown--;
        }
    }

    public update(): void {
        this.updateTeleportVisuals();
        this.updateMovement();
    }

    public dispose(): void {
        if (this.teleportMarker) {
            this.teleportMarker.dispose();
            this.teleportMarker = null;
        }
        
        if (this.teleportRay) {
            this.teleportRay.dispose();
            this.teleportRay = null;
        }

        if (this.xrHelper) {
            this.xrHelper.dispose();
            this.xrHelper = null;
        }
    }
} 