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
            case 'house':
                await this.loadHouseRoom();
                break;
            default:
                console.warn(`알 수 없는 방 타입: ${roomType}`);
                await this.loadHouseRoom(); // 기본값을 house로 변경
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

    private async loadHouseRoom(): Promise<void> {
        console.log('🏠 House 모델 로딩 중...');
        
        try {
            // 먼저 FBX 파일이 있는지 확인
            const houseFiles = [
                'House_01.fbx',
                'House_02.fbx',
                'House_03.fbx',
                'House_04.fbx',
                'House_05.fbx',
                'House_06.fbx',
                'House_07.fbx'
            ];

            console.log('🔍 FBX 파일 접근성 확인 중...');

            // FBX 로딩 시도
            let fbxLoadSuccess = false;
            
            try {
                // 메인 하우스 로드 (가운데)
                const mainHouseFile = houseFiles[Math.floor(Math.random() * houseFiles.length)];
                console.log(`🏠 메인 하우스 로딩 시도: ${mainHouseFile}`);
                
                const mainHouseResult = await BABYLON.SceneLoader.ImportMeshAsync(
                    "",
                    "/house/",
                    mainHouseFile,
                    this.game.scene
                );

                if (mainHouseResult.meshes && mainHouseResult.meshes.length > 0) {
                    // 모든 메시들을 적절히 처리
                    mainHouseResult.meshes.forEach((mesh, index) => {
                        if (mesh.name && mesh.name !== "__root__") {
                            mesh.position = new BABYLON.Vector3(0, 0, 0);
                            mesh.scaling = new BABYLON.Vector3(3, 3, 3); // 크기 3배로 확대
                            mesh.receiveShadows = true;
                            mesh.checkCollisions = true;
                            console.log(`✅ 메인 하우스 메시 로딩: ${mesh.name}`);
                        }
                    });
                    console.log(`✅ 메인 하우스 로딩 완료: ${mainHouseFile}, 메시 개수: ${mainHouseResult.meshes.length}`);
                    fbxLoadSuccess = true;
                }
            } catch (fbxError) {
                console.warn('⚠️ FBX 로딩 실패, 대체 하우스 생성:', fbxError);
                fbxLoadSuccess = false;
            }

            // FBX 로딩이 실패했다면 기본 하우스들을 생성
            if (!fbxLoadSuccess) {
                console.log('🏠 기본 하우스 모델들을 생성합니다...');
                await this.createBasicHouses();
            }

            // 추가 하우스들을 주변에 배치 (마을 형태)
            const positions = [
                new BABYLON.Vector3(-20, 0, -15),
                new BABYLON.Vector3(20, 0, -15),
                new BABYLON.Vector3(-20, 0, 15),
                new BABYLON.Vector3(20, 0, 15),
                new BABYLON.Vector3(-30, 0, 0),
                new BABYLON.Vector3(30, 0, 0),
                new BABYLON.Vector3(0, 0, -25),
                new BABYLON.Vector3(0, 0, 25)
            ];

            // FBX가 성공적으로 로드된 경우에만 서브 하우스들 로드
            if (fbxLoadSuccess) {
                // 여러 하우스들을 랜덤하게 배치
                for (let i = 0; i < Math.min(5, positions.length); i++) {
                    const houseFile = houseFiles[Math.floor(Math.random() * houseFiles.length)];
                    try {
                        const houseResult = await BABYLON.SceneLoader.ImportMeshAsync(
                            "",
                            "/house/",
                            houseFile,
                            this.game.scene
                        );

                        if (houseResult.meshes && houseResult.meshes.length > 0) {
                            houseResult.meshes.forEach((mesh) => {
                                if (mesh.name && mesh.name !== "__root__") {
                                    mesh.position = positions[i];
                                    mesh.scaling = new BABYLON.Vector3(2, 2, 2); // 서브 하우스는 조금 작게
                                    mesh.rotation.y = Math.random() * Math.PI * 2; // 랜덤 회전
                                    mesh.receiveShadows = true;
                                    mesh.checkCollisions = true;
                                }
                            });
                            console.log(`✅ 서브 하우스 ${i+1} 로딩 완료: ${houseFile}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ 서브 하우스 ${i+1} 로딩 실패:`, error);
                    }
                }
            }

            // 바닥 생성
            this.createHouseGround();
            
            // 하우스 환경 조명
            this.setupHouseLighting();

            // 인터랙티브 오브젝트 추가
            await this.createHouseInteractives();

        } catch (error) {
            console.error('❌ House 모델 로딩 실패:', error);
            // 폴백으로 기본 하우스들 생성
            await this.createBasicHouses();
            
            // 바닥 생성
            this.createHouseGround();
            
            // 하우스 환경 조명
            this.setupHouseLighting();

            // 인터랙티브 오브젝트 추가
            await this.createHouseInteractives();
        }
    }

    private async createBasicHouses(): Promise<void> {
        console.log('🏗️ 기본 하우스 모델들을 생성 중...');
        
        // 메인 하우스 (중앙)
        await this.createBasicHouse(new BABYLON.Vector3(0, 0, 0), 3, '메인');
        
        // 서브 하우스들 (주변)
        const positions = [
            new BABYLON.Vector3(-20, 0, -15),
            new BABYLON.Vector3(20, 0, -15),
            new BABYLON.Vector3(-20, 0, 15),
            new BABYLON.Vector3(20, 0, 15),
            new BABYLON.Vector3(-30, 0, 0)
        ];
        
        for (let i = 0; i < positions.length; i++) {
            await this.createBasicHouse(positions[i], 2, `서브 ${i+1}`);
        }
        
        console.log('✅ 기본 하우스 모델 생성 완료');
    }

    private async createBasicHouse(position: BABYLON.Vector3, scale: number, name: string): Promise<void> {
        const houseGroup = new BABYLON.TransformNode(`house_${name}`, this.game.scene);
        houseGroup.position = position;
        houseGroup.scaling = new BABYLON.Vector3(scale, scale, scale);
        
        // 집 기본 구조
        const houseMaterial = new BABYLON.StandardMaterial(`houseMaterial_${name}`, this.game.scene);
        const houseColors = [
            new BABYLON.Color3(0.8, 0.6, 0.4),  // 베이지
            new BABYLON.Color3(0.9, 0.8, 0.7),  // 크림
            new BABYLON.Color3(0.7, 0.5, 0.3),  // 갈색
            new BABYLON.Color3(0.6, 0.7, 0.8),  // 파스텔 블루
            new BABYLON.Color3(0.8, 0.8, 0.6)   // 연한 노랑
        ];
        houseMaterial.diffuseColor = houseColors[Math.floor(Math.random() * houseColors.length)];
        
        // 집 몸체
        const houseBody = BABYLON.MeshBuilder.CreateBox(`houseBody_${name}`, {
            width: 4,
            height: 3,
            depth: 4
        }, this.game.scene);
        houseBody.position = new BABYLON.Vector3(0, 1.5, 0);
        houseBody.material = houseMaterial;
        houseBody.parent = houseGroup;
        houseBody.receiveShadows = true;
        houseBody.checkCollisions = true;
        
        // 지붕
        const roofMaterial = new BABYLON.StandardMaterial(`roofMaterial_${name}`, this.game.scene);
        roofMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.2, 0.1); // 빨간 지붕
        
        const roof = BABYLON.MeshBuilder.CreateCylinder(`roof_${name}`, {
            height: 2,
            diameterTop: 0,
            diameterBottom: 6,
            tessellation: 4
        }, this.game.scene);
        roof.position = new BABYLON.Vector3(0, 4, 0);
        roof.rotation.y = Math.PI / 4; // 45도 회전하여 피라미드 형태로
        roof.material = roofMaterial;
        roof.parent = houseGroup;
        roof.receiveShadows = true;
        
        // 문
        const doorMaterial = new BABYLON.StandardMaterial(`doorMaterial_${name}`, this.game.scene);
        doorMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1); // 어두운 갈색
        
        const door = BABYLON.MeshBuilder.CreateBox(`door_${name}`, {
            width: 0.8,
            height: 1.8,
            depth: 0.1
        }, this.game.scene);
        door.position = new BABYLON.Vector3(0, 0.9, 2.05);
        door.material = doorMaterial;
        door.parent = houseGroup;
        
        // 창문들
        const windowMaterial = new BABYLON.StandardMaterial(`windowMaterial_${name}`, this.game.scene);
        windowMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.9, 1); // 하늘색 유리
        windowMaterial.alpha = 0.6;
        
        // 좌측 창문
        const leftWindow = BABYLON.MeshBuilder.CreateBox(`leftWindow_${name}`, {
            width: 0.8,
            height: 0.8,
            depth: 0.1
        }, this.game.scene);
        leftWindow.position = new BABYLON.Vector3(-1.2, 1.8, 2.05);
        leftWindow.material = windowMaterial;
        leftWindow.parent = houseGroup;
        
        // 우측 창문
        const rightWindow = BABYLON.MeshBuilder.CreateBox(`rightWindow_${name}`, {
            width: 0.8,
            height: 0.8,
            depth: 0.1
        }, this.game.scene);
        rightWindow.position = new BABYLON.Vector3(1.2, 1.8, 2.05);
        rightWindow.material = windowMaterial;
        rightWindow.parent = houseGroup;
        
        // 랜덤 회전
        houseGroup.rotation.y = Math.random() * Math.PI * 2;
        
        console.log(`✅ ${name} 하우스 생성 완료`);
    }

    private createHouseGround(): void {
        // 큰 바닥 생성 (잔디밭)
        const ground = BABYLON.MeshBuilder.CreateGround("ground", {
            width: 100,
            height: 100
        }, this.game.scene);
        
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.game.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2); // 잔디 녹색
        groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // 약간의 반사
        
        // 그라운드 텍스처 반복
        groundMaterial.diffuseTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", this.game.scene);
        
        ground.material = groundMaterial;
        ground.receiveShadows = true;
        ground.position.y = -0.1;
        ground.checkCollisions = true;
    }

    private setupHouseLighting(): void {
        // 태양광 (Directional Light) - 더 밝게
        const sunLight = new BABYLON.DirectionalLight("sunLight", new BABYLON.Vector3(-1, -1, -1), this.game.scene);
        sunLight.intensity = 1.2;
        sunLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8); // 따뜻한 햇빛
        sunLight.specular = new BABYLON.Color3(1, 1, 1);
        
        // 환경광 (Hemisphere Light) - 더 밝게
        const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.game.scene);
        ambientLight.intensity = 0.6;
        ambientLight.diffuse = new BABYLON.Color3(0.8, 0.8, 1); // 파란 하늘빛
        
        // 추가 포인트 라이트들 (하우스들 주변)
        const lightPositions = [
            new BABYLON.Vector3(0, 8, 0),    // 중앙 상단
            new BABYLON.Vector3(-15, 5, -10), // 좌측 전방
            new BABYLON.Vector3(15, 5, -10),  // 우측 전방
            new BABYLON.Vector3(0, 5, 15)     // 후방
        ];
        
        lightPositions.forEach((pos, index) => {
            const pointLight = new BABYLON.PointLight(`houseLight_${index}`, pos, this.game.scene);
            pointLight.intensity = 0.3;
            pointLight.diffuse = new BABYLON.Color3(1, 0.9, 0.7);
            pointLight.range = 25;
        });
        
        console.log('🌞 하우스 환경 조명 설정 완료');
    }

    private async createHouseInteractives(): Promise<void> {
        // 상호작용 가능한 오브젝트들 생성
        
        // 우편함
        const mailbox = BABYLON.MeshBuilder.CreateBox("mailbox", {
            width: 0.5,
            height: 1,
            depth: 0.3
        }, this.game.scene);
        
        const mailboxMaterial = new BABYLON.StandardMaterial("mailboxMaterial", this.game.scene);
        mailboxMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.8); // 파란색
        mailbox.material = mailboxMaterial;
        
        mailbox.position = new BABYLON.Vector3(5, 0.5, -8);
        mailbox.metadata = { 
            type: 'mailbox', 
            id: 'house_mailbox',
            interactive: true,
            message: '편지가 들어있습니다!'
        };

        // 정원 벤치
        const bench = BABYLON.MeshBuilder.CreateBox("bench", {
            width: 2,
            height: 0.1,
            depth: 0.5
        }, this.game.scene);
        
        const benchMaterial = new BABYLON.StandardMaterial("benchMaterial", this.game.scene);
        benchMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1); // 갈색
        bench.material = benchMaterial;
        
        bench.position = new BABYLON.Vector3(-8, 0.3, 5);
        bench.metadata = { 
            type: 'bench', 
            id: 'garden_bench',
            interactive: true,
            message: '편안한 벤치입니다. 잠시 쉬어가세요.'
        };

        console.log('🎯 하우스 인터랙티브 오브젝트 생성 완료');
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