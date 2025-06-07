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
        console.log(`📦 간단한 박스 환경 로딩 시작...`);
        
        // 기존 방 제거
        if (this.currentRoom) {
            this.clearRoom();
        }

        // 간단한 박스 환경 생성
        await this.createSimpleBoxEnvironment();

        this.currentRoom = 'simple_box';
        console.log(`✅ 간단한 박스 환경 로딩 완료!`);
    }

    private async createSimpleBoxEnvironment(): Promise<void> {
        console.log('📦 간단한 박스 환경 생성 중...');
        
        try {
            // 검정 배경 설정
            this.game.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
            console.log('🖤 검정 배경 설정 완료');

            // 투명한 바닥 생성 (VR 텔레포트용)
            const ground = BABYLON.MeshBuilder.CreateGround("ground", {
                width: 20,
                height: 20
            }, this.game.scene);
            
            const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.game.scene);
            groundMaterial.alpha = 0; // 완전 투명
            ground.material = groundMaterial;
            ground.receiveShadows = true;
            ground.checkCollisions = true;
            
            // VR 텔레포트를 위한 바닥 메시 설정
            this.setupFloorMeshes([ground]);
            console.log('👻 투명 바닥 생성 완료');

            // 간단한 박스 생성
            this.createSimpleBox();

            // 기본 조명 설정
            this.setupSimpleLighting();

            console.log('✅ 간단한 박스 환경 생성 완료!');

        } catch (error) {
            console.error('❌ 간단한 박스 환경 생성 실패:', error);
        }
    }

    private createSimpleBox(): void {
        console.log('📦 안녕하세요 박스 생성 중...');
        
        // 박스 생성
        const box = BABYLON.MeshBuilder.CreateBox("helloBox", {
            width: 4,
            height: 2,
            depth: 1
        }, this.game.scene);
        box.position = new BABYLON.Vector3(0, 2, -5);
        
        // 박스 머티리얼
        const boxMaterial = new BABYLON.StandardMaterial("boxMaterial", this.game.scene);
        boxMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8); // 파란색
        boxMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.2, 0.4);
        box.material = boxMaterial;
        
        // 한글 텍스트를 위한 Dynamic Texture
        const textTexture = new BABYLON.DynamicTexture("textTexture", {width: 800, height: 400}, this.game.scene);
        textTexture.hasAlpha = true;
        
        // 한글 텍스트 그리기
        textTexture.drawText(
            "안녕하세요", 
            null, null, 
            "bold 80px Arial", 
            "#000000",
            "#FFFFFF",
            true
        );
        
        // 텍스트 머티리얼
        const textMaterial = new BABYLON.StandardMaterial("textMaterial", this.game.scene);
        textMaterial.diffuseTexture = textTexture;
        textMaterial.emissiveTexture = textTexture;
        textMaterial.emissiveColor = new BABYLON.Color3(0.5, 0.5, 1);
        
        // 텍스트 평면 생성
        const textPlane = BABYLON.MeshBuilder.CreatePlane("textPlane", {
            width: 3.8,
            height: 1.8
        }, this.game.scene);
        textPlane.position = new BABYLON.Vector3(0, 2, -4.9);
        textPlane.material = textMaterial;
        
        console.log('✅ 안녕하세요 박스 생성 완료');
    }

    private setupSimpleLighting(): void {
        console.log('💡 기본 조명 설정 중...');
        
        // 기본 환경광
        const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.game.scene);
        ambientLight.intensity = 0.5;
        ambientLight.diffuse = new BABYLON.Color3(1, 1, 1);
        
        // 박스를 비추는 조명
        const spotLight = new BABYLON.SpotLight(
            "spotLight", 
            new BABYLON.Vector3(0, 5, 0), 
            new BABYLON.Vector3(0, -1, -1),
            Math.PI / 3,
            2,
            this.game.scene
        );
        spotLight.intensity = 2.0;
        spotLight.diffuse = new BABYLON.Color3(1, 1, 1);
        spotLight.range = 20;
        
        console.log('✅ 기본 조명 설정 완료');
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