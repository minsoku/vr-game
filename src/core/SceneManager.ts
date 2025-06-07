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