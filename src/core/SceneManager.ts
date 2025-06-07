// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
// FBX 로더 명시적 import
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
// 서드파티 FBX 로더 추가
import { FBXLoader } from 'babylonjs-fbx-loader';
import type { VRGame } from './VRGame';

export class SceneManager {
    private game: VRGame;
    private currentRoom: string | null = null;
    private vrUI: BABYLON.Mesh[] = [];

    constructor(game: VRGame) {
        this.game = game;
        
        // FBX 로더 등록
        if (BABYLON.SceneLoader) {
            BABYLON.SceneLoader.RegisterPlugin(new FBXLoader());
            console.log('✅ FBX 로더 플러그인 등록 완료');
        }
    }

    public async loadRoom(roomType: string): Promise<void> {
        console.log(`🌌 불빛 분위기 환경 로딩 시작...`);
        
        // 기존 방 제거
        if (this.currentRoom) {
            this.clearRoom();
        }

        // 불빛 분위기 환경 생성
        await this.createAtmosphericEnvironment();

        this.currentRoom = 'atmospheric_lights';
        console.log(`✅ 불빛 분위기 환경 로딩 완료!`);
    }

    private async createAtmosphericEnvironment(): Promise<void> {
        console.log('🌌 불빛 분위기 환경 생성 중...');
        
        try {
            // 기본 환경 제거 (검정 배경을 위해)
            this.game.scene.environmentTexture = null;
            this.game.scene.createDefaultSkybox(null, false, 1000, 0);
            
            // 검정 배경 설정
            this.game.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
            console.log('🖤 검정 배경 설정 완료');

            // 투명한 바닥 생성 (VR 텔레포트용)
            const ground = BABYLON.MeshBuilder.CreateGround("ground", {
                width: 50,
                height: 50
            }, this.game.scene);
            
            // 투명한 머티리얼 적용
            const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.game.scene);
            groundMaterial.alpha = 0; // 완전 투명
            groundMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
            ground.material = groundMaterial;
            ground.receiveShadows = true;
            ground.checkCollisions = true;
            
            // VR 텔레포트를 위한 바닥 메시 설정
            this.setupFloorMeshes([ground]);
            console.log('👻 투명 바닥 생성 완료');

            // 분위기 있는 조명 시스템 설정
            this.setupAtmosphericLighting();

            // 파티클 효과 추가
            this.createParticleEffects();

            // 방탈출 퍼즐 시스템 추가
            this.createEscapeRoomPuzzle();

            console.log('✨ 불빛 분위기 환경 생성 완료!');

        } catch (error) {
            console.error('❌ 분위기 환경 생성 실패:', error);
        }
    }

    private setupAtmosphericLighting(): void {
        console.log('💡 분위기 조명 설정 중...');
        
        // 기존 조명들 제거
        this.game.scene.lights.forEach(light => {
            if (light.name !== 'light') { // 기본 조명은 유지하되 약하게
                light.dispose();
            } else {
                light.intensity = 0.1; // 기본 조명을 매우 약하게
            }
        });

        // 메인 분위기 조명 (부드러운 파란색)
        const ambientLight = new BABYLON.HemisphericLight("atmosphericAmbient", new BABYLON.Vector3(0, 1, 0), this.game.scene);
        ambientLight.intensity = 0.2;
        ambientLight.diffuse = new BABYLON.Color3(0.1, 0.2, 0.4); // 파란빛 톤

        // 중앙 스포트라이트 (따뜻한 느낌)
        const centerSpot = new BABYLON.SpotLight(
            "centerSpot", 
            new BABYLON.Vector3(0, 8, 0), 
            new BABYLON.Vector3(0, -1, 0),
            Math.PI / 4,
            2,
            this.game.scene
        );
        centerSpot.intensity = 2.0;
        centerSpot.diffuse = new BABYLON.Color3(1, 0.8, 0.4); // 따뜻한 노란색
        centerSpot.range = 15;

        // 움직이는 포인트 라이트들 (불빛 효과)
        this.createMovingLights();

        // 깜박이는 조명들
        this.createFlickeringLights();

        console.log('✅ 분위기 조명 설정 완료');
    }

    private createMovingLights(): void {
        console.log('🎭 움직이는 조명 생성 중...');
        
        const colors = [
            new BABYLON.Color3(1, 0.3, 0.3), // 빨강
            new BABYLON.Color3(0.3, 1, 0.3), // 초록
            new BABYLON.Color3(0.3, 0.3, 1), // 파랑
            new BABYLON.Color3(1, 1, 0.3),   // 노랑
            new BABYLON.Color3(1, 0.3, 1)    // 보라
        ];

        for (let i = 0; i < 5; i++) {
            const light = new BABYLON.PointLight(`movingLight${i}`, new BABYLON.Vector3(0, 3, 0), this.game.scene);
            light.intensity = 1.5;
            light.diffuse = colors[i];
            light.range = 10;

            // 원형 움직임 애니메이션
            const animationPosition = new BABYLON.Animation(
                `lightMovement${i}`,
                "position",
                30,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const radius = 8 + i * 2;
            const speed = 0.5 + i * 0.2;
            const keys = [];
            for (let frame = 0; frame <= 360; frame += 10) {
                const angle = (frame * speed * Math.PI) / 180;
                keys.push({
                    frame: frame,
                    value: new BABYLON.Vector3(
                        Math.cos(angle) * radius,
                        3 + Math.sin(angle * 2) * 2,
                        Math.sin(angle) * radius
                    )
                });
            }
            animationPosition.setKeys(keys);
            light.animations.push(animationPosition);
            
            this.game.scene.beginAnimation(light, 0, 360, true);
        }

        console.log('✅ 움직이는 조명 생성 완료');
    }

    private createFlickeringLights(): void {
        console.log('✨ 깜박이는 조명 생성 중...');
        
        // 여러 개의 깜박이는 조명 생성
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 15;
            
            const flickerLight = new BABYLON.PointLight(
                `flickerLight${i}`, 
                new BABYLON.Vector3(
                    Math.cos(angle) * radius,
                    2 + Math.random() * 3,
                    Math.sin(angle) * radius
                ), 
                this.game.scene
            );
            
            flickerLight.intensity = 0.5 + Math.random() * 0.5;
            flickerLight.diffuse = new BABYLON.Color3(
                0.8 + Math.random() * 0.2,
                0.6 + Math.random() * 0.4,
                0.2 + Math.random() * 0.3
            );
            flickerLight.range = 8;

            // 랜덤 깜박임 애니메이션
            const flickerAnimation = new BABYLON.Animation(
                `flicker${i}`,
                "intensity",
                60,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
            );

            const keys = [];
            for (let frame = 0; frame <= 120; frame += 5) {
                keys.push({
                    frame: frame,
                    value: Math.random() * 0.8 + 0.2
                });
            }
            flickerAnimation.setKeys(keys);
            flickerLight.animations.push(flickerAnimation);
            
            this.game.scene.beginAnimation(flickerLight, 0, 120, true);
        }

        console.log('✅ 깜박이는 조명 생성 완료');
    }

    private createParticleEffects(): void {
        console.log('🌟 파티클 효과 생성 중...');
        
        // 먼지 파티클 시스템
        const dustParticles = new BABYLON.ParticleSystem("dustParticles", 200, this.game.scene);
        dustParticles.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", this.game.scene);
        
        dustParticles.emitter = new BABYLON.Vector3(0, 5, 0);
        dustParticles.minEmitBox = new BABYLON.Vector3(-20, 0, -20);
        dustParticles.maxEmitBox = new BABYLON.Vector3(20, 0, 20);
        
        dustParticles.color1 = new BABYLON.Color4(1, 1, 1, 0.2);
        dustParticles.color2 = new BABYLON.Color4(0.8, 0.8, 1, 0.1);
        dustParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        dustParticles.minSize = 0.1;
        dustParticles.maxSize = 0.3;
        dustParticles.minLifeTime = 5;
        dustParticles.maxLifeTime = 10;
        
        dustParticles.emitRate = 50;
        dustParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        dustParticles.gravity = new BABYLON.Vector3(0, -0.5, 0);
        dustParticles.direction1 = new BABYLON.Vector3(-1, 1, -1);
        dustParticles.direction2 = new BABYLON.Vector3(1, 1, 1);
        
        dustParticles.minAngularSpeed = 0;
        dustParticles.maxAngularSpeed = Math.PI;
        
        dustParticles.minEmitPower = 0.5;
        dustParticles.maxEmitPower = 1.5;
        dustParticles.updateSpeed = 0.005;
        
        dustParticles.start();

        console.log('✅ 파티클 효과 생성 완료');
    }

    private createEscapeRoomPuzzle(): void {
        console.log('🔐 방탈출 퍼즐 시스템 생성 중...');
        
        // 오르골 생성
        this.createMusicBox();
        
        // 힌트 패널 생성
        this.createHintPanel();
        
        // 자물쇠 시스템 생성
        this.createLockSystem();
        
        console.log('✅ 방탈출 퍼즐 시스템 생성 완료');
    }

    private createMusicBox(): void {
        console.log('🎵 오르골 생성 중...');
        
        // 오르골 베이스
        const musicBox = BABYLON.MeshBuilder.CreateBox("musicBox", {
            width: 2,
            height: 0.5,
            depth: 1.5
        }, this.game.scene);
        musicBox.position = new BABYLON.Vector3(-5, 1, 0);
        
        // 오르골 머티리얼
        const musicBoxMaterial = new BABYLON.StandardMaterial("musicBoxMaterial", this.game.scene);
        musicBoxMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1); // 갈색 나무
        musicBoxMaterial.specularColor = new BABYLON.Color3(0.2, 0.1, 0.05);
        musicBox.material = musicBoxMaterial;
        
        // 오르골 뚜껑
        const lid = BABYLON.MeshBuilder.CreateBox("musicBoxLid", {
            width: 2.1,
            height: 0.1,
            depth: 1.6
        }, this.game.scene);
        lid.position = new BABYLON.Vector3(-5, 1.3, 0);
        lid.material = musicBoxMaterial;
        
        // 오르골 회전 피규어
        const figure = BABYLON.MeshBuilder.CreateCylinder("musicBoxFigure", {
            height: 0.8,
            diameterTop: 0.2,
            diameterBottom: 0.3
        }, this.game.scene);
        figure.position = new BABYLON.Vector3(-5, 1.6, 0);
        
        const figureMaterial = new BABYLON.StandardMaterial("figureMaterial", this.game.scene);
        figureMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.4); // 황금색
        figureMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.08, 0.04);
        figure.material = figureMaterial;
        
        // 회전 애니메이션
        const rotationAnimation = new BABYLON.Animation(
            "figureRotation",
            "rotation.y",
            30,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );
        
        const rotationKeys = [
            { frame: 0, value: 0 },
            { frame: 120, value: 2 * Math.PI }
        ];
        rotationAnimation.setKeys(rotationKeys);
        figure.animations.push(rotationAnimation);
        this.game.scene.beginAnimation(figure, 0, 120, true);
        
        // 클릭 이벤트 설정
        musicBox.actionManager = new BABYLON.ActionManager(this.game.scene);
        musicBox.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
                this.playMusicBoxSequence();
            }
        ));
        
        console.log('✅ 오르골 생성 완료');
    }

    private createHintPanel(): void {
        console.log('📋 힌트 패널 생성 중...');
        
        // 힌트 패널 베이스
        const hintPanel = BABYLON.MeshBuilder.CreateBox("hintPanel", {
            width: 4,
            height: 3,
            depth: 0.1
        }, this.game.scene);
        hintPanel.position = new BABYLON.Vector3(0, 2.5, -8);
        
        // 힌트 패널 머티리얼
        const panelMaterial = new BABYLON.StandardMaterial("panelMaterial", this.game.scene);
        panelMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        panelMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.1);
        hintPanel.material = panelMaterial;
        
        // 힌트 텍스트를 위한 Dynamic Texture
        const hintTexture = new BABYLON.DynamicTexture("hintTexture", {width: 800, height: 600}, this.game.scene);
        hintTexture.hasAlpha = true;
        
        const hintText = `
🎵 오르골 힌트 🎵

끊임없이 반복되는 알파벳 패턴:

M T ? T F ? S
(요일 영어로)

R ? Y G ? N P  
(색깔 영어로)

🔐 4글자 알파벳을 찾아 자물쇠를 열어라!
        `;
        
        hintTexture.drawText(hintText, null, null, "24px Arial", "#00FFFF", "#000000", true);
        
        const hintMaterial = new BABYLON.StandardMaterial("hintMaterial", this.game.scene);
        hintMaterial.diffuseTexture = hintTexture;
        hintMaterial.emissiveTexture = hintTexture;
        hintMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 1);
        
        const hintDisplay = BABYLON.MeshBuilder.CreatePlane("hintDisplay", {
            width: 3.8,
            height: 2.8
        }, this.game.scene);
        hintDisplay.position = new BABYLON.Vector3(0, 2.5, -7.95);
        hintDisplay.material = hintMaterial;
        
        console.log('✅ 힌트 패널 생성 완료');
    }

    private createLockSystem(): void {
        console.log('🔐 자물쇠 시스템 생성 중...');
        
        // 자물쇠 베이스
        const lockBase = BABYLON.MeshBuilder.CreateBox("lockBase", {
            width: 3,
            height: 2,
            depth: 0.5
        }, this.game.scene);
        lockBase.position = new BABYLON.Vector3(5, 1.5, 0);
        
        const lockMaterial = new BABYLON.StandardMaterial("lockMaterial", this.game.scene);
        lockMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        lockMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        lockBase.material = lockMaterial;
        
        // 4개의 알파벳 다이얼 생성
        this.createAlphabetDials(lockBase);
        
        console.log('✅ 자물쇠 시스템 생성 완료');
    }

    private createAlphabetDials(lockBase: BABYLON.Mesh): void {
        console.log('🔤 알파벳 다이얼 생성 중...');
        
        const dialPositions = [
            { x: -1.2, y: 0 },
            { x: -0.4, y: 0 },
            { x: 0.4, y: 0 },
            { x: 1.2, y: 0 }
        ];
        
        this.dialValues = ['A', 'A', 'A', 'A']; // 현재 다이얼 값들
        this.dialMeshes = [];
        
        dialPositions.forEach((pos, index) => {
            // 다이얼 실린더
            const dial = BABYLON.MeshBuilder.CreateCylinder(`dial${index}`, {
                height: 0.3,
                diameter: 0.6
            }, this.game.scene);
            dial.position = new BABYLON.Vector3(
                lockBase.position.x + pos.x,
                lockBase.position.y + pos.y,
                lockBase.position.z + 0.4
            );
            
            // 다이얼 머티리얼
            const dialMaterial = new BABYLON.StandardMaterial(`dialMaterial${index}`, this.game.scene);
            dialMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.4);
            dialMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.2);
            dial.material = dialMaterial;
            
            // 알파벳 텍스처
            const dialTexture = new BABYLON.DynamicTexture(`dialTexture${index}`, {width: 256, height: 256}, this.game.scene);
            dialTexture.drawText('A', null, null, "bold 120px Arial", "#FFFFFF", "#000000", true);
            
            const textMaterial = new BABYLON.StandardMaterial(`textMaterial${index}`, this.game.scene);
            textMaterial.diffuseTexture = dialTexture;
            textMaterial.emissiveTexture = dialTexture;
            textMaterial.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3);
            
            const textPlane = BABYLON.MeshBuilder.CreatePlane(`textPlane${index}`, {
                width: 0.4,
                height: 0.4
            }, this.game.scene);
            textPlane.position = new BABYLON.Vector3(
                dial.position.x,
                dial.position.y,
                dial.position.z + 0.16
            );
            textPlane.material = textMaterial;
            
            // 클릭 이벤트
            dial.actionManager = new BABYLON.ActionManager(this.game.scene);
            dial.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    this.rotateDial(index);
                }
            ));
            
            this.dialMeshes.push({
                dial: dial,
                textPlane: textPlane,
                texture: dialTexture
            });
        });
        
        console.log('✅ 알파벳 다이얼 생성 완료');
    }

    private dialValues: string[] = [];
    private dialMeshes: any[] = [];
    private correctAnswer = ['W', 'S', 'O', 'B'];

    private rotateDial(dialIndex: number): void {
        console.log(`🔄 다이얼 ${dialIndex} 회전`);
        
        // 알파벳 순환 (A-Z)
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const currentIndex = alphabet.indexOf(this.dialValues[dialIndex]);
        const nextIndex = (currentIndex + 1) % 26;
        this.dialValues[dialIndex] = alphabet[nextIndex];
        
        // 텍스처 업데이트
        const dialMesh = this.dialMeshes[dialIndex];
        dialMesh.texture.clear();
        dialMesh.texture.drawText(
            this.dialValues[dialIndex], 
            null, null, 
            "bold 120px Arial", 
            "#FFFFFF", 
            "#000000", 
            true
        );
        
        // 회전 애니메이션
        const rotationAnimation = new BABYLON.Animation(
            `dialRotation${dialIndex}`,
            "rotation.y",
            60,
            BABYLON.Animation.ANIMATIONTYPE_FLOAT,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keys = [
            { frame: 0, value: dialMesh.dial.rotation.y },
            { frame: 15, value: dialMesh.dial.rotation.y + Math.PI / 6 }
        ];
        rotationAnimation.setKeys(keys);
        
        this.game.scene.beginAnimation(dialMesh.dial, 0, 15, false, 1, () => {
            this.checkAnswer();
        });
        
        console.log(`다이얼 ${dialIndex}: ${this.dialValues[dialIndex]}`);
    }

    private checkAnswer(): void {
        console.log('🔍 답 확인 중...', this.dialValues);
        
        if (JSON.stringify(this.dialValues) === JSON.stringify(this.correctAnswer)) {
            console.log('🎉 정답! 자물쇠가 열렸습니다!');
            this.unlockSuccess();
        }
    }

    private unlockSuccess(): void {
        console.log('🎊 자물쇠 해제 성공!');
        
        // 성공 파티클 효과
        const successParticles = new BABYLON.ParticleSystem("successParticles", 500, this.game.scene);
        successParticles.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", this.game.scene);
        
        successParticles.emitter = new BABYLON.Vector3(5, 1.5, 0);
        successParticles.minEmitBox = new BABYLON.Vector3(-1, -1, -1);
        successParticles.maxEmitBox = new BABYLON.Vector3(1, 1, 1);
        
        successParticles.color1 = new BABYLON.Color4(1, 1, 0, 1);
        successParticles.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
        successParticles.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        successParticles.minSize = 0.2;
        successParticles.maxSize = 0.8;
        successParticles.minLifeTime = 1;
        successParticles.maxLifeTime = 3;
        
        successParticles.emitRate = 100;
        successParticles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
        
        successParticles.start();
        
        // 3초 후 파티클 정지
        setTimeout(() => {
            successParticles.stop();
        }, 3000);
        
        // 축하 메시지 표시
        this.showSuccessMessage();
    }

    private showSuccessMessage(): void {
        // 성공 메시지 패널
        const successPanel = BABYLON.MeshBuilder.CreatePlane("successPanel", {
            width: 6,
            height: 2
        }, this.game.scene);
        successPanel.position = new BABYLON.Vector3(0, 4, -5);
        
        const successTexture = new BABYLON.DynamicTexture("successTexture", {width: 1200, height: 400}, this.game.scene);
        successTexture.drawText(
            "🎉 축하합니다! 🎉\n방탈출 퍼즐을 해결했습니다!", 
            null, null, 
            "bold 48px Arial", 
            "#FFD700", 
            "#000000", 
            true
        );
        
        const successMaterial = new BABYLON.StandardMaterial("successMaterial", this.game.scene);
        successMaterial.diffuseTexture = successTexture;
        successMaterial.emissiveTexture = successTexture;
        successMaterial.emissiveColor = new BABYLON.Color3(1, 1, 0.5);
        successPanel.material = successMaterial;
        
        // 5초 후 메시지 제거
        setTimeout(() => {
            successPanel.dispose();
        }, 5000);
    }

    private playMusicBoxSequence(): void {
        console.log('🎵 오르골 시퀀스 재생');
        
        // 간단한 사운드 효과 (향후 확장 가능)
        // 현재는 콘솔 로그로 힌트 제공
        console.log('🎼 M T _ T F _ S (요일: Monday, Tuesday, ?, Thursday, Friday, ?, Sunday)');
        console.log('🎨 R _ Y G _ N P (색깔: Red, ?, Yellow, Green, ?, Navy, Purple)');
        console.log('💡 빠진 글자들: W(Wednesday), S(Saturday), O(Orange), B(Blue)');
        console.log('🔑 답: W S O B');
    }

    private setupFloorMeshes(floorMeshes: BABYLON.AbstractMesh[]): void {
        // VRGame의 XR Helper에 바닥 메시 등록
        const xrHelper = this.game.getXRHelper();
        if (xrHelper && xrHelper.teleportation) {
            floorMeshes.forEach(mesh => {
                xrHelper.teleportation.addFloorMesh(mesh);
                console.log(`📍 텔레포트 바닥 메시 등록: ${mesh.name}`);
            });
        }
    }

    public showVRUI(): void {
        if (this.vrUI.length === 0) {
            this.createVRUI();
        }
        this.vrUI.forEach(ui => ui.setEnabled(true));
    }

    public hideVRUI(): void {
        this.vrUI.forEach(ui => ui.setEnabled(false));
    }

    private createVRUI(): void {
        // VR 전용 UI 요소들 생성
        const uiPanel = BABYLON.MeshBuilder.CreatePlane("vrUIPanel", {
            width: 2,
            height: 1
        }, this.game.scene);
        
        const uiMaterial = new BABYLON.StandardMaterial("vrUIMaterial", this.game.scene);
        uiMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        uiMaterial.alpha = 0.7;
        uiPanel.material = uiMaterial;
        
        uiPanel.position = new BABYLON.Vector3(0, 2, -3);
        uiPanel.setEnabled(false);
        
        this.vrUI.push(uiPanel);
    }

    public update(): void {
        // 애니메이션이나 동적 업데이트가 필요한 경우
        if (this.currentRoom) {
            // 현재는 정적 씬이므로 특별한 업데이트 없음
        }
    }

    private clearRoom(): void {
        // 현재 방의 모든 메시들을 제거
        const meshesToRemove = this.game.scene.meshes.filter(mesh => 
            mesh.name !== 'camera' && 
            mesh.name !== '__root__' &&
            !mesh.name.includes('vrUI') &&
            mesh.name !== 'ground' &&
            mesh.name !== 'skyBox'
        );

        meshesToRemove.forEach(mesh => {
            console.log(`🗑️ 메시 제거: ${mesh.name}`);
            mesh.dispose();
        });

        // 조명들도 제거 (기본 조명 제외)
        const lightsToRemove = this.game.scene.lights.filter(light => 
            light.name !== 'light'
        );
        
        lightsToRemove.forEach(light => {
            console.log(`💡 조명 제거: ${light.name}`);
            light.dispose();
        });

        console.log('✅ 기존 방 정리 완료');
    }

    public dispose(): void {
        this.clearRoom();
        this.vrUI.forEach(ui => ui.dispose());
        this.vrUI = [];
        console.log('♻️ SceneManager 정리 완료');
    }
} 