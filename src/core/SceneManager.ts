// @ts-nocheck
import * as BABYLON from '@babylonjs/core';
import type { VRGame } from './VRGame';

export class SceneManager {
    private game: VRGame;
    private currentRoom: string | null = null;
    private vrUI: BABYLON.Mesh[] = [];

    constructor(game: VRGame) {
        this.game = game;
    }

    public async loadRoom(roomType: string): Promise<void> {
        console.log(`🏠 방 로딩 시작: ${roomType}`);
        
        // 기존 방 제거
        if (this.currentRoom) {
            this.clearRoom();
        }

        switch (roomType) {
            case 'library':
                await this.loadLibraryRoom();
                break;
            case 'lab':
                await this.loadLabRoom();
                break;
            case 'mystery':
                await this.loadMysteryRoom();
                break;
            default:
                console.warn(`알 수 없는 방 타입: ${roomType}`);
                await this.loadLibraryRoom(); // 기본값
        }

        this.currentRoom = roomType;
        console.log(`✅ 방 로딩 완료: ${roomType}`);
    }

    private async loadLibraryRoom(): Promise<void> {
        // 바닥
        const floor = BABYLON.MeshBuilder.CreateGround("floor", {
            width: 10,
            height: 10
        }, this.game.scene);
        
        const floorMaterial = new BABYLON.StandardMaterial("floorMaterial", this.game.scene);
        floorMaterial.diffuseColor = new BABYLON.Color3(0.545, 0.271, 0.075); // 갈색
        floor.material = floorMaterial;
        floor.receiveShadows = true;

        // 벽들
        this.createWalls();

        // 책장들
        await this.createBookshelves();

        // 책상
        await this.createDesk();

        // 퍼즐 오브젝트들
        await this.createLibraryPuzzles();

        // 방 조명
        this.setupRoomLighting();
    }

    private createWalls(): void {
        const wallMaterial = new BABYLON.StandardMaterial("wallMaterial", this.game.scene);
        wallMaterial.diffuseColor = new BABYLON.Color3(0.961, 0.871, 0.702); // 베이지색
        
        // 뒷벽
        const backWall = BABYLON.MeshBuilder.CreatePlane("backWall", {
            width: 10,
            height: 5
        }, this.game.scene);
        backWall.position = new BABYLON.Vector3(0, 2.5, -5);
        backWall.material = wallMaterial;

        // 좌벽
        const leftWall = BABYLON.MeshBuilder.CreatePlane("leftWall", {
            width: 10,
            height: 5
        }, this.game.scene);
        leftWall.position = new BABYLON.Vector3(-5, 2.5, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.material = wallMaterial;

        // 우벽
        const rightWall = BABYLON.MeshBuilder.CreatePlane("rightWall", {
            width: 10,
            height: 5
        }, this.game.scene);
        rightWall.position = new BABYLON.Vector3(5, 2.5, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.material = wallMaterial;
    }

    private async createBookshelves(): Promise<void> {
        const shelfMaterial = new BABYLON.StandardMaterial("shelfMaterial", this.game.scene);
        shelfMaterial.diffuseColor = new BABYLON.Color3(0.545, 0.271, 0.075); // 갈색

        // 간단한 책장 생성
        for (let i = 0; i < 3; i++) {
            // 책장 프레임
            const shelf = BABYLON.MeshBuilder.CreateBox("bookshelf", {
                width: 2,
                height: 3,
                depth: 0.3
            }, this.game.scene);
            shelf.position = new BABYLON.Vector3(-3 + i * 3, 1.5, -4.5);
            shelf.material = shelfMaterial;

            // 책들 추가
            for (let j = 0; j < 5; j++) {
                const book = BABYLON.MeshBuilder.CreateBox("book", {
                    width: 0.1,
                    height: 0.3,
                    depth: 0.15
                }, this.game.scene);

                const bookMaterial = new BABYLON.StandardMaterial(`bookMaterial_${i}_${j}`, this.game.scene);
                bookMaterial.diffuseColor = new BABYLON.Color3(Math.random(), Math.random(), Math.random());
                book.material = bookMaterial;

                book.position = new BABYLON.Vector3(
                    -3 + i * 3 + (-0.8 + j * 0.4),
                    1.5 + (-1 + Math.random() * 2),
                    -4.5 + 0.1
                );
            }
        }
    }

    private async createDesk(): Promise<void> {
        const deskMaterial = new BABYLON.StandardMaterial("deskMaterial", this.game.scene);
        deskMaterial.diffuseColor = new BABYLON.Color3(0.396, 0.263, 0.129); // 어두운 갈색

        // 책상
        const desk = BABYLON.MeshBuilder.CreateBox("desk", {
            width: 2,
            height: 0.1,
            depth: 1
        }, this.game.scene);
        desk.position = new BABYLON.Vector3(0, 1, 2);
        desk.material = deskMaterial;

        // 책상 다리들
        for (let i = 0; i < 4; i++) {
            const leg = BABYLON.MeshBuilder.CreateBox("deskLeg", {
                width: 0.1,
                height: 1,
                depth: 0.1
            }, this.game.scene);
            const x = i % 2 === 0 ? -0.9 : 0.9;
            const z = i < 2 ? 1.5 : 2.5;
            leg.position = new BABYLON.Vector3(x, 0.5, z);
            leg.material = deskMaterial;
        }
    }

    private async createLibraryPuzzles(): Promise<void> {
        // 퍼즐 1: 책상 위의 열쇠
        const key = BABYLON.MeshBuilder.CreateCylinder("key", {
            height: 0.3,
            diameter: 0.04
        }, this.game.scene);
        
        const keyMaterial = new BABYLON.StandardMaterial("keyMaterial", this.game.scene);
        keyMaterial.diffuseColor = new BABYLON.Color3(1, 0.843, 0); // 금색
        keyMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0);
        key.material = keyMaterial;
        
        key.position = new BABYLON.Vector3(0.5, 1.15, 2);
        key.rotation.z = Math.PI / 2;
        key.metadata = { 
            type: 'key', 
            id: 'library_key_1',
            interactive: true 
        };

        // 퍼즐 2: 숨겨진 서랍
        const drawer = BABYLON.MeshBuilder.CreateBox("drawer", {
            width: 0.8,
            height: 0.1,
            depth: 0.3
        }, this.game.scene);
        
        const drawerMaterial = new BABYLON.StandardMaterial("drawerMaterial", this.game.scene);
        drawerMaterial.diffuseColor = new BABYLON.Color3(0.545, 0.271, 0.075);
        drawer.material = drawerMaterial;
        
        drawer.position = new BABYLON.Vector3(-0.5, 0.8, 1.8);
        drawer.metadata = { 
            type: 'drawer', 
            id: 'secret_drawer',
            interactive: true,
            locked: true 
        };
    }

    private async loadLabRoom(): Promise<void> {
        // 연구소 방 구현 (향후 확장)
        console.log('🧪 연구소 방 로딩...');
        // 임시: 라이브러리와 동일
        await this.loadLibraryRoom();
    }

    private async loadMysteryRoom(): Promise<void> {
        // 미스터리 방 구현 (향후 확장)
        console.log('🔮 미스터리 방 로딩...');
        // 임시: 라이브러리와 동일
        await this.loadLibraryRoom();
    }

    private setupRoomLighting(): void {
        // 추가 조명 (기본 환경 조명은 VRGame에서 설정됨)
        const pointLight = new BABYLON.PointLight("roomLight", new BABYLON.Vector3(0, 3, 0), this.game.scene);
        pointLight.intensity = 0.5;
        pointLight.diffuse = new BABYLON.Color3(1, 0.9, 0.7); // 따뜻한 빛
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
            !mesh.name.startsWith('xr') &&
            !mesh.name.startsWith('controller')
        );

        meshesToRemove.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });

        // 추가된 조명들도 제거
        const lightsToRemove = this.game.scene.lights.filter(light => 
            light.name !== 'light' // 기본 조명은 유지
        );

        lightsToRemove.forEach(light => {
            light.dispose();
        });

        console.log('🧹 이전 방 정리 완료');
    }

    public dispose(): void {
        this.clearRoom();
        this.vrUI.forEach(ui => ui.dispose());
        this.vrUI = [];
    }
} 