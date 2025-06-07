// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRController } from './VRController';

export class SimpleVRGame {
    public scene: any;
    public camera: any;
    public renderer: any;
    private animationId: number = 0;
    
    // 마우스 상태
    private mouse = { x: 0, y: 0 };
    private isMouseDown = false;
    private raycaster: any;
    
    // FPS 컨트롤
    private isPointerLocked = false;
    private keys: { [key: string]: boolean } = {};
    private velocity = { x: 0, y: 0, z: 0 };
    private moveSpeed = 0.05; // 더 현실적인 속도
    private mouseSensitivity = 0.002;
    
    // 1인칭 물리
    private playerHeight = 1.7; // 플레이어 키 (눈높이)
    private gravity = -0.003; // 중력
    private jumpVelocity = 0.1; // 점프 힘
    private onGround = false;
    private groundLevel = 0; // 바닥 높이
    
    // 걷기 효과
    private walkBobSpeed = 8.0; // 걷기 흔들림 속도
    private walkBobAmount = 0.01; // 걷기 흔들림 크기
    private walkBobTimer = 0;
    private isWalking = false;
    
    // 게임 상태
    private score = 0;
    private startTime = Date.now();
    private passwordSolved = false;
    
    // 3D 모델 로더
    private gltfLoader: GLTFLoader;
    
    // VR 컨트롤러
    private vrController: VRController | null = null;
    
    // VR 이동 시스템 (직접 구현)
    private vrMoveSpeed: number = 3.0;
    private vrControllers: THREE.Group[] = [];
    private vrGamepads: (Gamepad | null)[] = [null, null];
    private vrTurnCooldown: number = 0;
    private vrDebugCounter: number = 0; // 디버그 로그 제한용

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.raycaster = new THREE.Raycaster();
        this.gltfLoader = new GLTFLoader();
        
        this.init();
    }

    private init(): void {
        // 렌더러 설정
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // DOM에 추가
        document.body.appendChild(this.renderer.domElement);
        
        // 카메라 위치 (1인칭 시점)
        this.camera.position.set(0, this.playerHeight, 3);
        this.onGround = true; // 시작시 바닥에 서있음
        
        // 씬 설정
        this.setupScene();
        
        // 이벤트 리스너
        this.setupEventListeners();
        
        // 렌더 루프 시작
        this.animate();
        
        console.log('✅ 간단한 VR 게임 초기화 완료');
    }

    private setupScene(): void {
        // 공포 방 분위기 조명 설정 (밝기 개선)
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5); // 더 밝은 환경광
        this.scene.add(ambientLight);

        // 메인 조명 (자연스러운 실내조명)
        const mainLight = new THREE.DirectionalLight(0x8090aa, 1.2);
        mainLight.position.set(3, 5, 2);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 50;
        this.scene.add(mainLight);

        // 보조 조명 (따뜻한 느낌)
        const warmLight = new THREE.PointLight(0xffa500, 0.6, 12);
        warmLight.position.set(-2, 3, -1);
        this.scene.add(warmLight);

        // 추가 조명 (전체적인 밝기 향상)
        const fillLight = new THREE.PointLight(0xffffff, 0.8, 15);
        fillLight.position.set(1, 3, 1);
        this.scene.add(fillLight);

        // 렌더러 배경색 설정 (좀 더 밝게)
        this.renderer.setClearColor(0x2a2a3a, 1.0); // 어두운 회색-보라

        // 공포 방 3D 모델 로드
        this.loadScaryInterior();
        
        // 상호작용 가능한 오브젝트들 추가
        this.addInteractiveObjects();
        
        console.log('🏚️ 공포 방 씬 로딩 시작... 조심하세요!');
    }

    private loadScaryInterior(): void {
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
                this.camera.position.set(0, this.playerHeight, 2);
                
                // 바닥 레벨 업데이트 (모델에 맞게)
                this.groundLevel = 0;
                
                console.log('🏚️ 공포 방 환경 로딩 완료 - 탐험을 시작하세요!');
            },
            (progress) => {
                console.log('📦 공포 방 로딩 진행률:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
            },
            (error) => {
                console.error('❌ 공포 방 모델 로딩 실패:', error);
                console.log('🔄 기본 방으로 대체합니다...');
                // 폴백: 기본 방 생성
                this.createFallbackRoom();
            }
        );
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

    private setupEventListeners(): void {
        // 윈도우 리사이즈
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // 마우스 이벤트
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        window.addEventListener('click', (event) => this.onMouseClick(event));
        
        // 키보드 이벤트
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // 포인터 락 이벤트
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        
        console.log('🎮 이벤트 리스너 설정 완료');
    }

    private onMouseMove(event: MouseEvent): void {
        if (this.isPointerLocked) {
            // 1인칭 시점 카메라 회전
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // 좌우 회전 (Y축 회전)
            this.camera.rotation.y -= movementX * this.mouseSensitivity;
            
            // 상하 회전 (X축 회전) - 현실적인 제한
            this.camera.rotation.x -= movementY * this.mouseSensitivity;
            this.camera.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.camera.rotation.x)); // 60도 제한
        } else {
            // 일반 마우스 - 오브젝트 하이라이트용
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // 마우스 위치에서 레이캐스팅
            this.updateMouseRaycasting();
        }
    }

    private onMouseClick(event: MouseEvent): void {
        this.isMouseDown = true;
        
        if (!this.isPointerLocked) {
            // 포인터 락 요청
            this.renderer.domElement.requestPointerLock();
        } else {
            // FPS 모드에서 중앙 크로스헤어로 상호작용
            this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            
            if (intersects.length > 0) {
                const intersected = intersects[0].object;
                if (intersected.userData && intersected.userData.interactive) {
                    this.handleObjectInteraction(intersected);
                }
            }
        }
    }

    private onKeyDown(event: KeyboardEvent): void {
        this.keys[event.code] = true;
        
        switch (event.code) {
            case 'KeyH':
                this.showHint();
                break;
            case 'Escape':
                if (this.isPointerLocked) {
                    document.exitPointerLock();
                }
                break;
            case 'KeyP':
                if (!this.passwordSolved) {
                    this.showPasswordUI();
                }

                break;
        }
    }

    private onKeyUp(event: KeyboardEvent): void {
        this.keys[event.code] = false;
    }

    private onPointerLockChange(): void {
        this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        
        const crosshair = document.getElementById('crosshair');
        const fpsGuide = document.getElementById('fps-guide');
        
        if (this.isPointerLocked) {
            console.log('🔒 FPS 모드 활성화 - ESC로 해제');
            this.showMessage('🎮 FPS 모드 활성화!\nWASD: 이동, 마우스: 시점, ESC: 해제', 2000);
            
            // 크로스헤어 표시
            if (crosshair) crosshair.style.display = 'block';
            if (fpsGuide) fpsGuide.style.display = 'block';
            
            // 마우스 커서 숨김
            document.body.style.cursor = 'none';
        } else {
            console.log('🖱️ 마우스 모드 - 클릭으로 FPS 모드 활성화');
            
            // 크로스헤어 숨김
            if (crosshair) crosshair.style.display = 'none';
            if (fpsGuide) fpsGuide.style.display = 'none';
            
            // 마우스 커서 복원
            document.body.style.cursor = 'default';
        }
    }

    private updateMouseRaycasting(): void {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // 모든 오브젝트의 하이라이트 제거
        this.scene.children.forEach((child: any) => {
            if (child.userData && child.userData.originalColor && child.material) {
                child.material.color.setHex(child.userData.originalColor);
            }
        });
        
        // 마우스가 가리키는 오브젝트 하이라이트
        if (intersects.length > 0) {
            const intersected = intersects[0].object as any;
            if (intersected.userData && intersected.userData.interactive && intersected.material) {
                intersected.material.color.setHex(0xffff00); // 노란색 하이라이트
                document.body.style.cursor = 'pointer';
            } else {
                document.body.style.cursor = 'default';
            }
        } else {
            document.body.style.cursor = 'default';
        }
    }

    private handleObjectInteraction(object: any): void {
        console.log(`🎯 오브젝트 클릭: ${object.userData.type} (${object.userData.id})`);
        
        switch (object.userData.type) {
            case 'key':
                this.collectKey(object);
                break;
            case 'terminal':
                this.showPasswordInput();
                break;
        }
    }

    private collectKey(keyObject: any): void {
        // 키 수집 애니메이션
        const originalY = keyObject.position.y;
        let moveUp = true;
        let animCount = 0;
        
        const animateKey = () => {
            if (moveUp) {
                keyObject.position.y += 0.02;
                animCount++;
                if (animCount > 25) {
                    moveUp = false;
                }
            } else {
                keyObject.position.y -= 0.04;
                if (keyObject.position.y < originalY - 2) {
                    this.scene.remove(keyObject);
                    return;
                }
            }
            requestAnimationFrame(animateKey);
        };
        
        animateKey();
        
        // 점수 추가
        this.score += 100;
        this.updateUI();
        
        console.log('🔑 황금 큐브를 획득했습니다! (+100점)');
        
        // 승리 체크
        if (this.score >= 100) {
            setTimeout(() => {
                this.showWinMessage();
            }, 1000);
        }
    }

    private showHint(): void {
        const hints = [
            "🗝️ 녹슨 열쇠를 찾아야 합니다... 어둠 속에 숨어있습니다",
            "💀 붉은 단말기에서 비밀을 풀어야 탈출할 수 있습니다",
            "🔦 마우스 클릭으로 탐험 모드를 시작하세요",
            "👻 조심스럽게 WASD로 이동... 무언가 지켜보고 있습니다",
            "🩸 비밀번호는... 간단한 수학의 답입니다",
            "⚰️ P키로도 단말기에 접근할 수 있습니다"
        ];
        
        const randomHint = hints[Math.floor(Math.random() * hints.length)];
        this.showMessage(`🕯️ ${randomHint}`, 4000);
    }

    private showMessage(message: string, duration: number = 3000): void {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 1000;
            text-align: center;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, duration);
    }

    private showWinMessage(): void {
        const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
        this.showMessage(`🚪 탈출 성공! 공포의 방에서 벗어났습니다!\n⏱️ 생존 시간: ${elapsedTime}초\n🏆 최종 점수: ${this.score}점\n\n🌅 빛을 보게 되어 다행입니다...`, 6000);
    }

    private updateUI(): void {
        const scoreElement = document.getElementById('score');
        const timerElement = document.getElementById('timer');
        
        if (scoreElement) {
            scoreElement.textContent = `점수: ${this.score}`;
        }
        
        if (timerElement) {
            const elapsedTime = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsedTime / 60);
            const seconds = elapsedTime % 60;
            timerElement.textContent = `시간: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    private animate(): void {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // VR 컨트롤러 업데이트 (VR 모드일 때)
        if (this.renderer.xr.isPresenting) {
            this.updateVRMovement();
        }
        
        // FPS 스타일 이동 처리 (2D 모드일 때)
        if (this.isPointerLocked && !this.renderer.xr.isPresenting) {
            this.handleMovement();
        }
        
        // UI 업데이트
        this.updateUI();
        
        // 렌더링
        this.renderer.render(this.scene, this.camera);
    }

    private handleMovement(): void {
        // 중력 적용
        if (!this.onGround) {
            this.velocity.y += this.gravity;
        }
        
        // 수평 이동 입력 처리
        let moveForward = 0;
        let moveRight = 0;
        
        // WASD 키 입력 처리
        if (this.keys['KeyW']) moveForward += 1;  // 앞으로
        if (this.keys['KeyS']) moveForward -= 1;  // 뒤로
        if (this.keys['KeyD']) moveRight += 1;    // 오른쪽
        if (this.keys['KeyA']) moveRight -= 1;    // 왼쪽
        
        // 걷기 상태 업데이트
        this.isWalking = (moveForward !== 0 || moveRight !== 0) && this.onGround;
        
        // 수평 이동 처리
        if (moveForward !== 0 || moveRight !== 0) {
            // 카메라의 방향 벡터 계산
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // forward 벡터 (Y축은 0으로 설정하여 수평 이동만)
            const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
            
            // right 벡터 (forward에 수직)
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            // 최종 이동 벡터 계산
            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(forward, moveForward * this.moveSpeed);
            moveVector.addScaledVector(right, moveRight * this.moveSpeed);
            
            // X, Z 위치만 업데이트 (Y는 물리에서 처리)
            this.camera.position.x += moveVector.x;
            this.camera.position.z += moveVector.z;
        }
        
        // 수직 이동 적용 (점프/중력)
        this.camera.position.y += this.velocity.y;
        
        // 바닥 충돌 검사
        if (this.camera.position.y <= this.groundLevel + this.playerHeight) {
            this.camera.position.y = this.groundLevel + this.playerHeight;
            this.velocity.y = 0;
            this.onGround = true;
        }
        
        // 걷기 애니메이션 (카메라 흔들림)
        if (this.isWalking) {
            this.walkBobTimer += this.walkBobSpeed * 0.016; // 60fps 기준
            const bobOffset = Math.sin(this.walkBobTimer) * this.walkBobAmount;
            this.camera.position.y += bobOffset;
        }
        
        // 이동 제한 (맵 경계)
        this.camera.position.x = Math.max(-4, Math.min(4, this.camera.position.x));
        this.camera.position.z = Math.max(-4, Math.min(4, this.camera.position.z));
    }

    private showPasswordInput(): void {
        this.showPasswordUI();
    }

    private showPasswordUI(): void {
        const passwordUI = document.getElementById('passwordUI');
        if (passwordUI) {
            passwordUI.style.display = 'flex';
            
            // 디스플레이 초기화
            const displayValue = document.getElementById('displayValue');
            if (displayValue) {
                displayValue.textContent = '_';
            }
            
            // 이벤트 리스너 추가
            this.setupPasswordUIListeners();
        }
    }

    private setupPasswordUIListeners(): void {
        const cancelBtn = document.getElementById('cancelPassword');
        const numButtons = document.querySelectorAll('.num-btn');
        const clearBtn = document.querySelector('.clear-btn');
        const enterBtn = document.querySelector('.enter-btn');
        const displayValue = document.getElementById('displayValue');
        
        let currentValue = '';
        
        // 숫자 버튼들
        numButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const num = btn.getAttribute('data-num');
                if (num && currentValue.length < 3) { // 최대 3자리
                    currentValue += num;
                    if (displayValue) {
                        displayValue.textContent = currentValue || '_';
                    }
                }
            });
        });
        
        // 지우기 버튼
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                currentValue = '';
                if (displayValue) {
                    displayValue.textContent = '_';
                }
            });
        }
        
        // 확인 버튼
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                if (currentValue) {
                    this.checkPassword(currentValue);
                }
            });
        }
        
        // 취소 버튼
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hidePasswordUI();
            });
        }
        
        // ESC 키로 취소
        const escHandler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                this.hidePasswordUI();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    private checkPassword(password: string): void {
        if (password === '5') {
            this.score += 200;
            this.passwordSolved = true;
            this.updateUI();
            this.hidePasswordUI();
            this.showMessage('🎉 비밀번호 정답! (+200점)\n숨겨진 방이 열렸습니다!', 3000);
            console.log('🔓 비밀번호 해독 성공!');
            
            // 승리 조건 업데이트
            if (this.score >= 300) {
                setTimeout(() => {
                    this.showWinMessage();
                }, 1000);
            }
        } else {
            this.hidePasswordUI();
            this.showMessage('❌ 비밀번호가 틀렸습니다!\n다시 시도해보세요.', 2000);
            console.log('🔒 비밀번호 오답');
        }
    }

    private hidePasswordUI(): void {
        const passwordUI = document.getElementById('passwordUI');
        if (passwordUI) {
            passwordUI.style.display = 'none';
        }
    }

    public async checkVRSupport(): Promise<boolean> {
        console.log('🔍 VR 지원 확인 시작');
        
        if (!('xr' in navigator)) {
            console.error('❌ navigator.xr이 존재하지 않습니다');
            console.log('- 가능한 원인: 비보안 연결(HTTP), 구형 브라우저, WebXR 미지원');
            return false;
        }

        try {
            const xr = (navigator as any).xr;
            console.log('✅ navigator.xr 존재');
            console.log('- XR 객체 타입:', typeof xr);
            console.log('- isSessionSupported 메서드:', typeof xr.isSessionSupported);

            if (typeof xr.isSessionSupported !== 'function') {
                console.error('❌ isSessionSupported 메서드가 함수가 아닙니다');
                return false;
            }

            console.log('🔍 immersive-vr 세션 지원 확인 중...');
            const isSupported = await xr.isSessionSupported('immersive-vr');
            console.log('✅ VR 세션 지원 상태:', isSupported);
            
            if (!isSupported) {
                console.warn('❌ immersive-vr 세션이 지원되지 않습니다');
                console.log('- 가능한 원인: VR 헤드셋 미연결, 드라이버 문제, 브라우저 설정');
            }
            
            return isSupported;
        } catch (e) {
            console.error('❌ VR 지원 확인 중 오류:', e);
            console.error('- 에러 이름:', e instanceof Error ? e.name : 'Unknown');
            console.error('- 에러 메시지:', e instanceof Error ? e.message : String(e));
            return false;
        }
    }

    private async forceControllerActivation(session: XRSession) {
        return new Promise<void>((resolve) => {
            console.log('💪 컨트롤러 강제 활성화 시작...');
            
            // 컨트롤러 상태 주기적 확인
            const checkControllers = () => {
                console.log(`🔍 컨트롤러 상태 확인: ${session.inputSources.length}개 입력 소스`);
                
                for (let i = 0; i < session.inputSources.length; i++) {
                    const source = session.inputSources[i];
                    console.log(`  📱 입력소스 ${i}:`, {
                        handedness: source.handedness,
                        targetRayMode: source.targetRayMode,
                        hasGamepad: !!source.gamepad,
                        gamepadId: source.gamepad?.id || 'none',
                        gamepadConnected: source.gamepad?.connected || false,
                        axes: source.gamepad?.axes?.length || 0,
                        buttons: source.gamepad?.buttons?.length || 0
                    });
                    
                    // 컨트롤러 진동으로 활성화 시도
                    if (source.gamepad?.hapticActuators?.length > 0) {
                        console.log('🔄 컨트롤러 진동으로 활성화 시도...');
                        try {
                            source.gamepad.hapticActuators[0].pulse(0.3, 100);
                        } catch (e) {
                            console.log('진동 실패:', e);
                        }
                    }
                }
            };

            // 컨트롤러 이벤트 리스너 추가
            const handleInputSourcesChange = (event: any) => {
                console.log('🎮 컨트롤러 상태 변경 이벤트:', event);
                checkControllers();
            };

            session.addEventListener('inputsourceschange', handleInputSourcesChange);
            
            // 즉시 현재 상태 확인
            checkControllers();
            
            // 메타 퀘스트 컨트롤러 검색 시도
            setTimeout(() => {
                console.log('🔍 직접 gamepad API로 메타 퀘스트 컨트롤러 검색...');
                const gamepads = navigator.getGamepads();
                for (let i = 0; i < gamepads.length; i++) {
                    const gp = gamepads[i];
                    if (gp && gp.connected) {
                        console.log(`🎮 Gamepad ${i}:`, {
                            id: gp.id,
                            connected: gp.connected,
                            mapping: gp.mapping,
                            axes: gp.axes.length,
                            buttons: gp.buttons.length
                        });
                    }
                }
                resolve();
            }, 2000);
        });
    }

    public async startVR(): Promise<void> {
        // WebXR 활성화
        this.renderer.xr.enabled = true;
        
        try {
            console.log('🚀 VR 세션 요청 중...');
            
            // 메타 퀘스트3 호환 설정 - requiredFeatures를 제거하고 optionalFeatures만 사용
            const sessionInit = {
                optionalFeatures: [
                    'local-floor',  // 바닥 기준 추적 (메타 퀘스트 선호)
                    'local',        // 기본 위치 추적
                    'hand-tracking', // 핸드 트래킹 (선택적)
                    'layers'        // 레이어 지원 (선택적)
                ]
            };
            
            console.log('📋 세션 설정:', sessionInit);
            
            const session = await (navigator as any).xr.requestSession('immersive-vr', sessionInit);
            
            console.log('✅ VR 세션 생성 완료');
            console.log('📍 세션 정보:');
            console.log('- inputSources:', session.inputSources?.length || 0);
            console.log('- environmentBlendMode:', session.environmentBlendMode);
            console.log('- interactionMode:', session.interactionMode);
            
            // Three.js에 세션 설정 (Three.js가 reference space를 자동 관리)
            console.log('🔄 Three.js WebXR 세션 설정 중...');
            await this.renderer.xr.setSession(session);
            console.log('🥽 VR 모드 활성화 완료');
            
            // 컨트롤러 권한 및 활성화 시도
            console.log('🎮 컨트롤러 강제 활성화 시도...');
            await this.forceControllerActivation(session);
            
            // VR 컨트롤러 초기화
            console.log('🎮 VR 컨트롤러 초기화 중...');
            this.setupVRControllers();
            console.log('✅ VR 컨트롤러 준비 완료');
            
            // VR 세션 이벤트 리스너
            session.addEventListener('end', () => {
                console.log('🔚 VR 세션 종료됨');
                if (this.vrController) {
                    this.vrController.dispose();
                    this.vrController = null;
                }
                this.renderer.setAnimationLoop(null);
            });
            
            // VR 애니메이션 루프로 전환
            console.log('🔄 VR 애니메이션 루프 시작');
            this.renderer.setAnimationLoop(() => this.animate());
            
        } catch (error) {
            console.error('❌ VR 세션 시작 실패:', error);
            console.error('- 에러 타입:', error.constructor?.name || 'Unknown');
            console.error('- 에러 메시지:', error.message || String(error));
            console.error('- 전체 에러:', error);
            
            // 더 구체적인 에러 정보
            if (error.name === 'NotSupportedError') {
                console.error('🔍 NotSupportedError 상세 분석:');
                console.error('- 이 에러는 보통 reference space 문제입니다');
                console.error('- 메타 퀘스트3에서 지원하지 않는 기능을 요청했을 가능성');
            }
            
            throw error;
        }
    }

    private setupVRControllers(): void {
        console.log('🎮 기본 VR 컨트롤러 설정 시작');
        
        // 컨트롤러 0 (왼손)
        const controller0 = this.renderer.xr.getController(0);
        controller0.addEventListener('connected', (event) => {
            console.log('🎮 왼손 컨트롤러 연결됨:', event.data);
            this.vrGamepads[0] = event.data.gamepad;
        });
        controller0.addEventListener('disconnected', () => {
            console.log('🎮 왼손 컨트롤러 연결 해제됨');
            this.vrGamepads[0] = null;
        });
        this.scene.add(controller0);
        this.vrControllers[0] = controller0;

        // 컨트롤러 1 (오른손)
        const controller1 = this.renderer.xr.getController(1);
        controller1.addEventListener('connected', (event) => {
            console.log('🎮 오른손 컨트롤러 연결됨:', event.data);
            this.vrGamepads[1] = event.data.gamepad;
        });
        controller1.addEventListener('disconnected', () => {
            console.log('🎮 오른손 컨트롤러 연결 해제됨');
            this.vrGamepads[1] = null;
        });
        this.scene.add(controller1);
        this.vrControllers[1] = controller1;
        
        console.log('✅ VR 컨트롤러 이벤트 리스너 설정 완료');
    }

    private updateVRMovement(): void {
        const session = this.renderer.xr.getSession();
        if (!session || !session.inputSources) {
            // 60프레임마다 한 번 로그 (1초마다)
            if (this.vrDebugCounter % 60 === 0) {
                console.log('❌ VR 세션 또는 입력 소스가 없습니다');
            }
            this.vrDebugCounter++;
            return;
        }

        // 컨트롤러 개수 확인
        if (this.vrDebugCounter % 120 === 0) { // 2초마다 한 번
            console.log(`🎮 활성 컨트롤러 수: ${session.inputSources.length}`);
        }

        // 방법 1: WebXR InputSource 사용
        this.tryWebXRInput(session);
        
        // 방법 2: 직접 Gamepad API 사용 (백업)
        this.tryDirectGamepadAPI();
        
        // 회전 쿨다운 감소
        if (this.vrTurnCooldown > 0) {
            this.vrTurnCooldown--;
        }
        
        this.vrDebugCounter++;
    }

    private tryWebXRInput(session: any): void {
        // 모든 입력 소스 확인
        for (let i = 0; i < session.inputSources.length; i++) {
            const inputSource = session.inputSources[i];
            const gamepad = inputSource.gamepad;
            
            if (gamepad) {
                // 60프레임마다 한 번 상세 로그
                if (this.vrDebugCounter % 60 === 0) {
                    console.log(`🎮 WebXR 컨트롤러 ${i} (${inputSource.handedness}):`, {
                        id: gamepad.id,
                        mapping: gamepad.mapping,
                        connected: gamepad.connected,
                        axesLength: gamepad.axes?.length || 0,
                        buttonsLength: gamepad.buttons?.length || 0,
                        axes: gamepad.axes ? gamepad.axes.slice(0, 6).map(axis => axis.toFixed(2)) : 'none',
                        buttons: gamepad.buttons ? gamepad.buttons.slice(0, 8).map(btn => ({ 
                            pressed: btn.pressed, 
                            value: btn.value.toFixed(2) 
                        })) : 'none'
                    });
                }
                
                // 버튼 입력 먼저 테스트
                if (gamepad.buttons && gamepad.buttons.length > 0) {
                    for (let b = 0; b < Math.min(gamepad.buttons.length, 8); b++) {
                        if (gamepad.buttons[b].pressed) {
                            console.log(`🔴 ${inputSource.handedness} 버튼 ${b} 눌림!`);
                            // 버튼으로 테스트 이동
                            this.testButtonMovement(b, inputSource.handedness);
                        }
                    }
                }
                
                // axes 입력 체크 (모든 축 확인)
                if (gamepad.axes && gamepad.axes.length >= 2) {
                    this.processAllAxes(gamepad, inputSource.handedness || `controller_${i}`);
                }
            }
        }
    }

    private tryDirectGamepadAPI(): void {
        // 직접 Gamepad API 사용
        const gamepads = navigator.getGamepads();
        if (gamepads) {
            for (let i = 0; i < gamepads.length; i++) {
                const gamepad = gamepads[i];
                if (gamepad && gamepad.connected) {
                    // 60프레임마다 한 번 로그
                    if (this.vrDebugCounter % 60 === 0) {
                        console.log(`🎮 직접 Gamepad ${i}:`, {
                            id: gamepad.id,
                            mapping: gamepad.mapping,
                            axes: gamepad.axes ? Array.from(gamepad.axes).slice(0, 6).map(axis => axis.toFixed(2)) : 'none',
                            buttons: gamepad.buttons ? Array.from(gamepad.buttons).slice(0, 8).map(btn => ({ 
                                pressed: btn.pressed, 
                                value: btn.value.toFixed(2) 
                            })) : 'none'
                        });
                    }
                    
                    // 직접 gamepad로 이동 처리
                    if (gamepad.axes && gamepad.axes.length >= 2) {
                        this.processAllAxes(gamepad, `direct_${i}`);
                    }
                }
            }
        }
    }

    private processAllAxes(gamepad: Gamepad, handedness: string): void {
        // 모든 축을 확인하여 어떤 축이 활성인지 찾기
        if (!gamepad.axes) return;
        
        for (let axisIndex = 0; axisIndex < Math.min(gamepad.axes.length, 8); axisIndex++) {
            const value = gamepad.axes[axisIndex];
            if (Math.abs(value) > 0.1) {
                console.log(`🕹️ ${handedness} 축 ${axisIndex}: ${value.toFixed(3)}`);
                
                // 축 0, 1이 활성이면 이동으로 처리
                if (axisIndex === 0 || axisIndex === 1) {
                    this.processVRMovementFromAxes(gamepad, handedness, 0, 1);
                }
                // 축 2, 3이 활성이면 회전으로 처리
                else if (axisIndex === 2 || axisIndex === 3) {
                    this.processVRRotationFromAxes(gamepad, handedness, 2, 3);
                }
            }
        }
    }

    private testButtonMovement(buttonIndex: number, handedness: string): void {
        // 버튼으로 간단한 이동 테스트
        const moveDistance = 0.1;
        
        switch (buttonIndex) {
            case 0: // 첫 번째 버튼 - 앞으로
                this.camera.position.z -= moveDistance;
                console.log(`🔴 ${handedness} 버튼 ${buttonIndex}: 앞으로 이동`);
                break;
            case 1: // 두 번째 버튼 - 뒤로
                this.camera.position.z += moveDistance;
                console.log(`🔴 ${handedness} 버튼 ${buttonIndex}: 뒤로 이동`);
                break;
            case 2: // 세 번째 버튼 - 왼쪽
                this.camera.position.x -= moveDistance;
                console.log(`🔴 ${handedness} 버튼 ${buttonIndex}: 왼쪽 이동`);
                break;
            case 3: // 네 번째 버튼 - 오른쪽
                this.camera.position.x += moveDistance;
                console.log(`🔴 ${handedness} 버튼 ${buttonIndex}: 오른쪽 이동`);
                break;
        }
        
        // 경계 제한
        this.camera.position.x = Math.max(-8, Math.min(8, this.camera.position.x));
        this.camera.position.z = Math.max(-8, Math.min(8, this.camera.position.z));
        console.log(`📍 버튼 이동 후 위치: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
    }

    private processVRMovementFromAxes(gamepad: Gamepad, handedness: string, xAxis: number, zAxis: number): void {
        if (!gamepad.axes || gamepad.axes.length <= Math.max(xAxis, zAxis)) return;
        
        const moveX = gamepad.axes[xAxis]; // 좌우
        const moveZ = gamepad.axes[zAxis]; // 앞뒤
        const deadzone = 0.1; // 매우 낮은 데드존
        
        if (Math.abs(moveX) > deadzone || Math.abs(moveZ) > deadzone) {
            console.log(`🚶 ${handedness} 축 이동 (${xAxis},${zAxis}): X=${moveX.toFixed(3)}, Z=${moveZ.toFixed(3)}`);
            
            // 카메라 기준 이동 방향 계산
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Y축 제거 (수평 이동만)
            const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            // 이동 벡터 계산
            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(forward, -moveZ); // 앞뒤 (Z축 반전)
            moveVector.addScaledVector(right, moveX); // 좌우
            
            // 이동 적용
            const deltaTime = 1/60; // 60fps 가정
            const moveAmount = moveVector.multiplyScalar(this.vrMoveSpeed * deltaTime);
            
            this.camera.position.add(moveAmount);
            
            // 경계 제한
            this.camera.position.x = Math.max(-8, Math.min(8, this.camera.position.x));
            this.camera.position.z = Math.max(-8, Math.min(8, this.camera.position.z));
            this.camera.position.y = Math.max(1.6, this.camera.position.y);
            
            console.log(`📍 축 이동 후 위치: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
        }
    }

    private processVRRotationFromAxes(gamepad: Gamepad, handedness: string, xAxis: number, yAxis: number): void {
        if (!gamepad.axes || gamepad.axes.length <= Math.max(xAxis, yAxis)) return;
        
        const turnX = gamepad.axes[xAxis]; // 좌우 회전
        const deadzone = 0.5;
        
        if (this.vrTurnCooldown <= 0) {
            if (turnX > deadzone) {
                // 오른쪽 회전
                this.camera.rotation.y -= Math.PI / 6; // 30도
                this.vrTurnCooldown = 30; // 0.5초 쿨다운
                console.log(`↻ ${handedness} 축 ${xAxis}로 오른쪽 회전 (30도)`);
            } else if (turnX < -deadzone) {
                // 왼쪽 회전
                this.camera.rotation.y += Math.PI / 6; // 30도
                this.vrTurnCooldown = 30; // 0.5초 쿨다운
                console.log(`↺ ${handedness} 축 ${xAxis}로 왼쪽 회전 (30도)`);
            }
        }
    }

    private processVRMovement(gamepad: Gamepad, handedness: string): void {
        if (!gamepad.axes || gamepad.axes.length < 2) return;
        
        const moveX = gamepad.axes[0]; // 좌우
        const moveZ = gamepad.axes[1]; // 앞뒤
        const deadzone = 0.15; // 데드존 낮춤
        
        if (Math.abs(moveX) > deadzone || Math.abs(moveZ) > deadzone) {
            // 30프레임마다 한 번 로그 (0.5초마다)
            if (this.vrDebugCounter % 30 === 0) {
                console.log(`🚶 ${handedness} 이동: X=${moveX.toFixed(2)}, Z=${moveZ.toFixed(2)}`);
            }
            
            // 카메라 기준 이동 방향 계산
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            // Y축 제거 (수평 이동만)
            const forward = new THREE.Vector3(cameraDirection.x, 0, cameraDirection.z).normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            // 이동 벡터 계산
            const moveVector = new THREE.Vector3();
            moveVector.addScaledVector(forward, -moveZ); // 앞뒤 (Z축 반전)
            moveVector.addScaledVector(right, moveX); // 좌우
            
            // 이동 적용
            const deltaTime = 1/60; // 60fps 가정
            const moveAmount = moveVector.multiplyScalar(this.vrMoveSpeed * deltaTime);
            
            this.camera.position.add(moveAmount);
            
            // 경계 제한
            this.camera.position.x = Math.max(-8, Math.min(8, this.camera.position.x));
            this.camera.position.z = Math.max(-8, Math.min(8, this.camera.position.z));
            this.camera.position.y = Math.max(1.6, this.camera.position.y);
            
            // 위치 로그 (60프레임마다)
            if (this.vrDebugCounter % 60 === 0) {
                console.log(`📍 카메라 위치: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
            }
        }
    }

    private processVRRotation(gamepad: Gamepad, handedness: string): void {
        if (!gamepad.axes || gamepad.axes.length < 4) return;
        
        const turnX = gamepad.axes[2]; // 오른쪽 조이스틱 X축
        const deadzone = 0.6; // 데드존 낮춤
        
        if (this.vrTurnCooldown <= 0) {
            if (turnX > deadzone) {
                // 오른쪽 회전
                this.camera.rotation.y -= Math.PI / 6; // 30도
                this.vrTurnCooldown = 30; // 0.5초 쿨다운
                console.log('↻ 오른쪽 회전 (30도)');
            } else if (turnX < -deadzone) {
                // 왼쪽 회전
                this.camera.rotation.y += Math.PI / 6; // 30도
                this.vrTurnCooldown = 30; // 0.5초 쿨다운
                console.log('↺ 왼쪽 회전 (30도)');
            }
        }
    }

    public dispose(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.vrController) {
            this.vrController.dispose();
            this.vrController = null;
        }
        
        this.renderer.dispose();
    }
} 