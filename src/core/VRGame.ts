// @ts-nocheck
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { GameStateManager } from './GameStateManager';
import { AudioManager } from './AudioManager';

export class VRGame {
    // Three.js 핵심 컴포넌트
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    
    // VR 관련
    private controllerModelFactory: XRControllerModelFactory;
    private handModelFactory: XRHandModelFactory;
    public controllers: THREE.Group[] = [];
    public hands: THREE.Group[] = [];
    
    // 게임 매니저들
    public sceneManager: SceneManager;
    public inputManager: InputManager;
    public gameState: GameStateManager;
    public audioManager: AudioManager;
    
    // 게임 상태
    private isVRMode: boolean = false;
    private animationId: number = 0;
    
    // 로더
    private gltfLoader: GLTFLoader;

    constructor() {
        // Three.js 기본 설정
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // VR 팩토리 초기화
        this.controllerModelFactory = new XRControllerModelFactory();
        this.handModelFactory = new XRHandModelFactory();
        
        // 매니저 초기화
        this.sceneManager = new SceneManager(this);
        this.inputManager = new InputManager(this);
        this.gameState = new GameStateManager(this);
        this.audioManager = new AudioManager();
        
        // 로더 초기화
        this.gltfLoader = new GLTFLoader();
    }

    public async init(): Promise<void> {
        try {
            console.log('🖥️ 렌더러 설정 중...');
            await this.setupRenderer();
            
            console.log('🥽 VR 설정 중...');
            await this.setupVR();
            
            console.log('🏠 씬 설정 중...');
            await this.setupScene();
            
            console.log('🎮 이벤트 리스너 설정 중...');
            this.setupEventListeners();
            
            console.log('🔄 렌더 루프 시작 중...');
            this.startRenderLoop();
            
            console.log('✅ VR Game 초기화 완료');
        } catch (error) {
            console.error('❌ VRGame 초기화 실패:', error);
            throw error;
        }
    }

    private async setupRenderer(): Promise<void> {
        // 렌더러 설정
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // DOM에 추가
        document.body.appendChild(this.renderer.domElement);
        
        // 카메라 초기 위치
        this.camera.position.set(0, 1.6, 3); // 평균 성인 눈높이
    }

    private async setupVR(): Promise<void> {
        // WebXR 활성화
        this.renderer.xr.enabled = true;
        
        // VR 버튼 설정 (Three.js의 VRButton 대신 커스텀 버튼 사용)
        // const vrButton = VRButton.createButton(this.renderer);
        // document.body.appendChild(vrButton);
        
        // 컨트롤러 설정
        this.setupControllers();
        
        // 핸드 트래킹 설정
        this.setupHandTracking();
    }

    private setupControllers(): void {
        // 왼쪽 컨트롤러
        const controller1 = this.renderer.xr.getController(0);
        controller1.addEventListener('selectstart', (event) => this.inputManager.onSelectStart(event));
        controller1.addEventListener('selectend', (event) => this.inputManager.onSelectEnd(event));
        this.scene.add(controller1);

        const controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        controllerGrip1.add(this.controllerModelFactory.createControllerModel(controllerGrip1));
        this.scene.add(controllerGrip1);

        // 오른쪽 컨트롤러
        const controller2 = this.renderer.xr.getController(1);
        controller2.addEventListener('selectstart', (event) => this.inputManager.onSelectStart(event));
        controller2.addEventListener('selectend', (event) => this.inputManager.onSelectEnd(event));
        this.scene.add(controller2);

        const controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        controllerGrip2.add(this.controllerModelFactory.createControllerModel(controllerGrip2));
        this.scene.add(controllerGrip2);

        this.controllers = [controller1, controller2];
    }

    private setupHandTracking(): void {
        // 손 추적 설정 (선택적)
        const hand1 = this.renderer.xr.getHand(0);
        hand1.add(this.handModelFactory.createHandModel(hand1, 'mesh'));
        this.scene.add(hand1);

        const hand2 = this.renderer.xr.getHand(1);
        hand2.add(this.handModelFactory.createHandModel(hand2, 'mesh'));
        this.scene.add(hand2);

        this.hands = [hand1, hand2];
    }

    private async setupScene(): Promise<void> {
        // 기본 조명 설정
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 공포 방 로드 (기존 배경과 동일)
        await this.loadHorrorRoom();
        
        // 게임 상태 초기화
        this.gameState.startGame();
    }

    private setupEventListeners(): void {
        // 윈도우 리사이즈
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // VR 세션 이벤트
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.isVRMode = true;
            this.onVRSessionStart();
        });

        this.renderer.xr.addEventListener('sessionend', () => {
            this.isVRMode = false;
            this.onVRSessionEnd();
        });
    }

    private onVRSessionStart(): void {
        console.log('🥽 VR 세션 시작');
        // VR UI 숨기기
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = 'none';
        
        // VR 전용 UI 표시
        this.sceneManager.showVRUI();
    }

    private onVRSessionEnd(): void {
        console.log('🖥️ VR 세션 종료');
        // 일반 UI 다시 표시
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = 'block';
        
        // VR UI 숨기기
        this.sceneManager.hideVRUI();
    }

    private startRenderLoop(): void {
        const animate = () => {
            this.animationId = this.renderer.xr.isPresenting ? 
                this.renderer.setAnimationLoop(animate) as any : 
                requestAnimationFrame(animate);
            
            this.update();
            this.render();
        };
        
        if (this.renderer.xr.isPresenting) {
            this.renderer.setAnimationLoop(animate);
        } else {
            animate();
        }
    }

    private update(): void {
        // 매니저 업데이트
        this.inputManager.update();
        this.sceneManager.update();
        this.gameState.update();
    }

    private render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    // Public 메서드들
    public async checkVRSupport(): Promise<boolean> {
        if ('xr' in navigator) {
            try {
                const isSupported = await (navigator as any).xr.isSessionSupported('immersive-vr');
                return isSupported;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    public async startVR(): Promise<void> {
        if (this.renderer.xr.isPresenting) return;
        
        try {
            const session = await (navigator as any).xr.requestSession('immersive-vr', {
                optionalFeatures: ['hand-tracking', 'layers']
            });
            
            await this.renderer.xr.setSession(session);
            console.log('🥽 VR 모드 활성화');
        } catch (error) {
            console.error('VR 세션 시작 실패:', error);
            throw error;
        }
    }

    private async loadHorrorRoom(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                '/horror_room/scene.gltf',
                (gltf) => {
                    console.log('✅ 공포 방 모델 로드 완료');
                    
                    // 모델 크기 조정 (horror_room에 맞게)
                    const model = gltf.scene;
                    model.scale.set(1, 1, 1); // 원본 크기 사용
                    model.position.set(0, 0, 0);
                    
                    // 그림자 설정
                    model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // 재질 설정 개선 (공포 분위기)
                            if (child.material) {
                                child.material.side = THREE.DoubleSide;
                            }
                        }
                    });
                    
                    this.scene.add(model);
                    
                    // 카메라 위치 조정 (방 안쪽 적절한 위치로)
                    this.camera.position.set(0, 1.6, 2);
                    
                    // 상호작용 오브젝트 추가
                    this.addInteractiveObjects();
                    
                    console.log('🏚️ 공포 방 환경 로딩 완료 - 탐험을 시작하세요!');
                    resolve();
                },
                (progress) => {
                    console.log('📦 공포 방 로딩 진행률:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
                },
                (error) => {
                    console.error('❌ 공포 방 모델 로딩 실패:', error);
                    console.log('🔄 기본 방으로 대체합니다...');
                    // 폴백: 기본 방 생성
                    this.createFallbackRoom();
                    resolve();
                }
            );
        });
    }

    private createFallbackRoom(): void {
        console.log('🏠 기본 방 생성 (폴백)');
        
        // 바닥
        const floorGeometry = new THREE.PlaneGeometry(10, 10);
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x2a1810 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // 벽들
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x3a2820 });
        
        // 앞 벽
        const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial);
        frontWall.position.set(0, 2, -5);
        this.scene.add(frontWall);
        
        // 뒤 벽
        const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial);
        backWall.position.set(0, 2, 5);
        backWall.rotation.y = Math.PI;
        this.scene.add(backWall);
        
        // 왼쪽 벽
        const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial);
        leftWall.position.set(-5, 2, 0);
        leftWall.rotation.y = Math.PI / 2;
        this.scene.add(leftWall);
        
        // 오른쪽 벽
        const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial);
        rightWall.position.set(5, 2, 0);
        rightWall.rotation.y = -Math.PI / 2;
        this.scene.add(rightWall);

        // 상호작용 오브젝트 추가
        this.addInteractiveObjects();
    }

    private addInteractiveObjects(): void {
        // 상호작용 가능한 오래된 열쇠 (공포 분위기)
        const keyGeometry = new THREE.BoxGeometry(0.05, 0.02, 0.15);
        const keyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8b7355, // 녹슨 금색
            emissive: 0x1f1a0a // 어두운 빛남
        });
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.set(-1.5, 0.8, 0.5); // 방 한쪽에 배치
        key.rotation.y = Math.PI / 4; // 약간 회전
        key.castShadow = true;
        key.userData = { 
            type: 'key', 
            id: 'rusty_key',
            interactive: true,
            originalColor: 0x8b7355
        };
        this.scene.add(key);

        // 오래된 비밀번호 상자 (공포 분위기)
        const terminalGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.1);
        const terminalMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2c2c2c, // 어두운 회색
            emissive: 0x0a0000 // 약간의 붉은 빛
        });
        const terminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
        terminal.position.set(1.5, 1.2, -0.8); // 다른 위치로 이동
        terminal.castShadow = true;
        terminal.userData = { 
            type: 'terminal', 
            id: 'horror_terminal',
            interactive: true,
            originalColor: 0x2c2c2c
        };
        this.scene.add(terminal);

        // 터미널 스크린 (불안한 붉은 빛)
        const screenGeometry = new THREE.BoxGeometry(0.2, 0.12, 0.01);
        const screenMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x220000, // 어두운 빨강
            emissive: 0x440000 // 붉은 빛남
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.set(1.5, 1.2, -0.75);
        this.scene.add(screen);

        // 작은 스컬 오브젝트 (장식용)
        const skullGeometry = new THREE.SphereGeometry(0.08, 8, 6);
        const skullMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xd4c4a8, // 해골 색
            emissive: 0x0a0a0a
        });
        const skull = new THREE.Mesh(skullGeometry, skullMaterial);
        skull.position.set(0.8, 0.9, 1.2);
        skull.scale.set(1, 0.8, 1); // 해골 모양으로 변형
        skull.castShadow = true;
        this.scene.add(skull);
    }

    public dispose(): void {
        // 리소스 정리
        if (this.animationId) {
            if (this.renderer.xr.isPresenting) {
                this.renderer.setAnimationLoop(null);
            } else {
                cancelAnimationFrame(this.animationId);
            }
        }
        
        this.renderer.dispose();
        this.audioManager.dispose();
        this.sceneManager.dispose();
    }
} 