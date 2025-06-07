// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders';
import type { VRGame } from './VRGame';

export class SceneManager {
    private game: VRGame;
    private currentRoom: string | null = null;
    private vrUI: BABYLON.Mesh[] = [];

    constructor(game: VRGame) {
        this.game = game;
    }

    public async loadRoom(roomType: string): Promise<void> {
        console.log(`👻 Horror Room 로딩 시작...`);
        
        // 기존 방 제거
        if (this.currentRoom) {
            this.clearRoom();
        }

        // Horror Room만 로드
        await this.loadHorrorRoom();

        this.currentRoom = 'horror_room';
        console.log(`✅ Horror Room 로딩 완료!`);
    }

    private async loadHorrorRoom(): Promise<void> {
        console.log('👻 Horror Room GLTF 씬 로딩 중...');
        
        try {
            // Horror Room GLTF 씬 로드
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "/horror_room/",
                "scene.gltf",
                this.game.scene
            );

            if (result.meshes && result.meshes.length > 0) {
                console.log(`✅ Horror Room 로딩 성공! 메시 개수: ${result.meshes.length}`);
                
                // 메시들 설정
                result.meshes.forEach((mesh, index) => {
                    if (mesh.name && mesh.name !== "__root__") {
                        mesh.receiveShadows = true;
                        mesh.checkCollisions = true;
                        console.log(`📦 메시 로딩: ${mesh.name}`);
                    }
                });

                // 호러 분위기 조명 설정
                this.setupHorrorLighting();

                // 호러 음향 효과 추가
                this.setupHorrorSounds();

            } else {
                console.error('❌ Horror Room 메시 로딩 실패');
            }

        } catch (error) {
            console.error('❌ Horror Room 로딩 실패:', error);
        }
    }

    private setupHorrorLighting(): void {
        console.log('💡 Horror Room 조명 설정 중...');
        
        // 기존 조명들 제거
        this.game.scene.lights.forEach(light => {
            if (light.name !== 'light') { // 기본 조명은 유지
                light.dispose();
            }
        });

        // 어두운 환경광
        const ambientLight = new BABYLON.HemisphericLight("horrorAmbient", new BABYLON.Vector3(0, 1, 0), this.game.scene);
        ambientLight.intensity = 0.1; // 매우 어둡게
        ambientLight.diffuse = new BABYLON.Color3(0.3, 0.3, 0.4); // 푸른빛 톤

        // 깜박이는 전구
        const flickeringLight = new BABYLON.PointLight("flickeringBulb", new BABYLON.Vector3(0, 3, 0), this.game.scene);
        flickeringLight.intensity = 0.8;
        flickeringLight.diffuse = new BABYLON.Color3(1, 0.8, 0.6); // 따뜻한 전구색
        flickeringLight.range = 8;

        // 깜박임 애니메이션
        const flickerAnimation = BABYLON.Animation.CreateAndStartAnimation(
            "flicker",
            flickeringLight,
            "intensity",
            60,
            60,
            0.3,
            1.2,
            BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
        );

        // 무서운 붉은 조명
        const redLight = new BABYLON.SpotLight(
            "redHorrorLight", 
            new BABYLON.Vector3(-3, 2, -3), 
            new BABYLON.Vector3(0, -1, 0),
            Math.PI / 3,
            2,
            this.game.scene
        );
        redLight.intensity = 0.5;
        redLight.diffuse = new BABYLON.Color3(1, 0.1, 0.1); // 빨간색
        redLight.range = 5;

        console.log('✅ Horror Room 조명 설정 완료');
    }

    private setupHorrorSounds(): void {
        console.log('🔊 Horror Room 음향 설정 중...');
        
        // 향후 확장: 무서운 음향 효과들
        // - 바람 소리
        // - 삐걱거리는 소리
        // - 심장 박동 소리
        // - 발걸음 소리
        
        console.log('✅ Horror Room 음향 설정 완료 (구현 예정)');
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