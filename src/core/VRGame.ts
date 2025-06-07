// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';

import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';
import { VRController } from './VRController';

export class VRGame {
    // Babylon.js 핵심 컴포넌트
    public scene: BABYLON.Scene;
    public camera: BABYLON.FreeCamera;
    public engine: BABYLON.Engine;
    public canvas: HTMLCanvasElement;
    
    // XR 관련
    private xrHelper: BABYLON.WebXRDefaultExperience | null = null;
    public vrController: VRController | null = null;
    
    // 게임 매니저들
    public sceneManager: SceneManager;
    public inputManager: InputManager;
    public gameState: GameStateManager;
    public audioManager: AudioManager;
    
    // 게임 상태
    private isVRMode: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.initializeEngine();
        this.initializeScene();
        this.initializeManagers();
        this.setupVR();
    }

    private initializeEngine(): void {
        console.log('🎮 Babylon.js 엔진 초기화 중...');
        
        // 엔진 생성
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
        });

        // 리사이즈 이벤트
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        console.log('✅ Babylon.js 엔진 초기화 완료');
    }

    private initializeScene(): void {
        console.log('🏛️ Babylon.js 씬 초기화 중...');
        
        // 씬 생성
        this.scene = new BABYLON.Scene(this.engine);
        
        // 카메라 생성
        this.camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 1.6, -5), this.scene);
        this.camera.setTarget(BABYLON.Vector3.Zero());
        
        // 카메라 컨트롤 설정 (안전한 방법)
        try {
            if (this.camera && typeof this.camera.attachControls === 'function') {
                this.camera.attachControls(this.canvas, true);
                console.log('✅ 카메라 컨트롤 연결 성공');
            } else {
                console.warn('⚠️ attachControls 메서드를 사용할 수 없습니다. 수동 컨트롤 설정...');
                this.setupManualCameraControls();
            }
        } catch (error) {
            console.error('❌ 카메라 컨트롤 설정 실패:', error);
            this.setupManualCameraControls();
        }
        
        // 카메라 속성 설정
        if (this.camera instanceof BABYLON.FreeCamera) {
            this.camera.speed = 0.5;
            this.camera.angularSensibility = 2000;
        }

        // 조명 생성
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        // 기본 환경 설정
        this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 50,
            createSkybox: true,
            skyboxSize: 100
        });

        console.log('✅ Babylon.js 씬 초기화 완료');
    }

    private setupManualCameraControls(): void {
        console.log('🔧 수동 카메라 컨트롤 설정 중...');
        
        if (!(this.camera instanceof BABYLON.FreeCamera)) {
            console.warn('카메라가 FreeCamera가 아닙니다.');
            return;
        }

        try {
            // 키보드 입력 설정
            this.camera.inputs.addKeyboard();
            console.log('✅ 키보드 입력 추가됨');
            
            // 마우스 입력 설정
            this.camera.inputs.addMouse();
            console.log('✅ 마우스 입력 추가됨');
            
        } catch (error) {
            console.error('❌ 수동 카메라 컨트롤 설정 실패:', error);
            
            // 최후의 수단: 기본 설정만 사용
            this.camera.speed = 0.5;
            this.camera.angularSensibility = 2000;
            console.log('⚠️ 기본 카메라 설정만 적용됨');
        }

        console.log('✅ 수동 카메라 컨트롤 설정 완료');
    }

    private initializeManagers(): void {
        console.log('📋 게임 매니저 초기화 중...');
        
        // 매니저들 초기화
        this.sceneManager = new SceneManager(this);
        this.inputManager = new InputManager(this);
        this.gameState = new GameStateManager(this);
        this.audioManager = new AudioManager(this);

        // 기본 방 로드
        this.sceneManager.loadRoom('library');

        console.log('✅ 게임 매니저 초기화 완료');
    }

    private async setupVR(): Promise<void> {
        try {
            console.log('🥽 VR 설정 시작...');
            
            // WebXR 지원 확인
            const webXRSupported = await BABYLON.WebXRSessionManager.IsSessionSupportedAsync('immersive-vr');
            if (!webXRSupported) {
                console.warn('⚠️ WebXR이 지원되지 않습니다.');
                return;
            }

            // XR 경험 생성
            this.xrHelper = await this.scene.createDefaultXRExperienceAsync({
                floorMeshes: [], // 바닥 메시 추가 가능
                disableTeleportation: false,
                optionalFeatures: true
            });

            // VR 진입/종료 이벤트
            this.xrHelper.baseExperience.onStateChangedObservable.add((state) => {
                switch (state) {
                    case BABYLON.WebXRState.IN_XR:
                        console.log('🥽 VR 모드 진입');
                        this.onEnterVR();
                        break;
                    case BABYLON.WebXRState.NOT_IN_XR:
                        console.log('🖥️ VR 모드 종료');
                        this.onExitVR();
                        break;
                }
            });

            // VR 컨트롤러 초기화
            this.vrController = new VRController(this);

            console.log('✅ VR 설정 완료');
            
        } catch (error) {
            console.error('❌ VR 설정 실패:', error);
        }
    }

    private onEnterVR(): void {
        this.isVRMode = true;
        console.log('🎮 VR 모드 활성화됨');
        
        // VR 전용 설정
        if (this.xrHelper) {
            // 포인터 설정
            if (this.xrHelper.pointerSelection) {
                this.xrHelper.pointerSelection.displayLaserPointer = true;
                this.xrHelper.pointerSelection.displaySelectionMesh = true;
            }

            // 핸드 트래킹 활성화
            const featureManager = this.xrHelper.baseExperience.featuresManager;
            try {
                featureManager.enableFeature(BABYLON.WebXRFeatureName.HAND_TRACKING, "latest", {
                    xrInput: this.xrHelper.input,
                }, true, false);
                console.log('✋ 핸드 트래킹 활성화됨');
            } catch (error) {
                console.log('⚠️ 핸드 트래킹 활성화 실패:', error);
            }
        }
    }

    private onExitVR(): void {
        this.isVRMode = false;
        console.log('🖥️ 데스크탑 모드로 전환됨');
    }

    public startRenderLoop(): void {
        console.log('🎬 렌더링 루프 시작...');
        
        this.engine.runRenderLoop(() => {
            if (this.scene) {
                // 게임 업데이트
                this.update();
                
                // 씬 렌더링
                this.scene.render();
            }
        });
    }

    private update(): void {
        // VR 컨트롤러 업데이트
        if (this.vrController) {
            this.vrController.update();
        }

        // 게임 매니저 업데이트
        if (this.inputManager) {
            this.inputManager.update();
        }
        
        if (this.gameState) {
            this.gameState.update();
        }
    }

    public async enterVRMode(): Promise<void> {
        try {
            if (!this.xrHelper) {
                console.error('❌ XR Helper가 초기화되지 않았습니다.');
                return;
            }

            console.log('🥽 VR 모드 진입 시도...');
            await this.xrHelper.baseExperience.enterXRAsync('immersive-vr', 'local-floor');
            
        } catch (error) {
            console.error('❌ VR 모드 진입 실패:', error);
        }
    }

    public async exitVRMode(): Promise<void> {
        try {
            if (!this.xrHelper) {
                console.error('❌ XR Helper가 초기화되지 않았습니다.');
                return;
            }

            console.log('🖥️ VR 모드 종료 시도...');
            await this.xrHelper.baseExperience.exitXRAsync();
            
        } catch (error) {
            console.error('❌ VR 모드 종료 실패:', error);
        }
    }

    public getXRHelper(): BABYLON.WebXRDefaultExperience | null {
        return this.xrHelper;
    }

    public isInVRMode(): boolean {
        return this.isVRMode;
    }

    // 텍스처 로딩 헬퍼
    public loadTexture(url: string): BABYLON.Texture {
        return new BABYLON.Texture(url, this.scene);
    }

    // 3D 모델 로딩 헬퍼
    public async loadModel(rootUrl: string, sceneFilename: string): Promise<BABYLON.ISceneLoaderAsyncResult> {
        return await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, sceneFilename, this.scene);
    }

    // 사운드 로딩 헬퍼
    public loadSound(name: string, url: string, options?: any): BABYLON.Sound {
        return new BABYLON.Sound(name, url, this.scene, null, options);
    }

    public dispose(): void {
        console.log('🗑️ VRGame 정리 중...');
        
        // VR 컨트롤러 정리
        if (this.vrController) {
            this.vrController.dispose();
            this.vrController = null;
        }

        // XR Helper 정리
        if (this.xrHelper) {
            this.xrHelper.dispose();
            this.xrHelper = null;
        }

        // 매니저들 정리
        if (this.audioManager) {
            this.audioManager.dispose();
        }

        // 씬 정리
        if (this.scene) {
            this.scene.dispose();
        }

        // 엔진 정리
        if (this.engine) {
            this.engine.dispose();
        }

        console.log('✅ VRGame 정리 완료');
    }
} 