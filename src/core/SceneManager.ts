// @ts-nocheck
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { VRGame } from './VRGame';

export class SceneManager {
    private game: VRGame;
    private gltfLoader: GLTFLoader;
    private currentRoom: string | null = null;
    private vrUI: THREE.Group | null = null;

    constructor(game: VRGame) {
        this.game = game;
        this.setupLoaders();
    }

    private setupLoaders(): void {
        // DRACO 압축 지원
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setDRACOLoader(dracoLoader);
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
        const floorGeometry = new THREE.PlaneGeometry(10, 10);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8b4513,
            side: THREE.DoubleSide 
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.game.scene.add(floor);

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
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf5deb3 });
        
        // 뒷벽
        const backWall = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 5),
            wallMaterial
        );
        backWall.position.set(0, 2.5, -5);
        this.game.scene.add(backWall);

        // 좌벽
        const leftWall = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 5),
            wallMaterial
        );
        leftWall.position.set(-5, 2.5, 0);
        leftWall.rotation.y = Math.PI / 2;
        this.game.scene.add(leftWall);

        // 우벽
        const rightWall = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 5),
            wallMaterial
        );
        rightWall.position.set(5, 2.5, 0);
        rightWall.rotation.y = -Math.PI / 2;
        this.game.scene.add(rightWall);
    }

    private async createBookshelves(): Promise<void> {
        // 간단한 책장 생성
        for (let i = 0; i < 3; i++) {
            const bookshelf = new THREE.Group();

            // 책장 프레임
            const shelfGeometry = new THREE.BoxGeometry(2, 3, 0.3);
            const shelfMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
            shelf.castShadow = true;
            bookshelf.add(shelf);

            // 책들 추가
            for (let j = 0; j < 5; j++) {
                const bookGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.15);
                const bookMaterial = new THREE.MeshLambertMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) 
                });
                const book = new THREE.Mesh(bookGeometry, bookMaterial);
                book.position.set(
                    -0.8 + (j * 0.4), 
                    -1 + Math.random() * 2, 
                    0.1
                );
                book.castShadow = true;
                bookshelf.add(book);
            }

            bookshelf.position.set(-3 + i * 3, 1.5, -4.5);
            this.game.scene.add(bookshelf);
        }
    }

    private async createDesk(): Promise<void> {
        // 책상
        const deskGeometry = new THREE.BoxGeometry(2, 0.1, 1);
        const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const desk = new THREE.Mesh(deskGeometry, deskMaterial);
        desk.position.set(0, 1, 2);
        desk.castShadow = true;
        this.game.scene.add(desk);

        // 책상 다리들
        for (let i = 0; i < 4; i++) {
            const legGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
            const leg = new THREE.Mesh(legGeometry, deskMaterial);
            const x = i % 2 === 0 ? -0.9 : 0.9;
            const z = i < 2 ? 1.5 : 2.5;
            leg.position.set(x, 0.5, z);
            leg.castShadow = true;
            this.game.scene.add(leg);
        }
    }

    private async createLibraryPuzzles(): Promise<void> {
        // 퍼즐 1: 책상 위의 열쇠
        const keyGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3);
        const keyMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
        const key = new THREE.Mesh(keyGeometry, keyMaterial);
        key.position.set(0.5, 1.15, 2);
        key.rotation.z = Math.PI / 2;
        key.castShadow = true;
        key.userData = { 
            type: 'key', 
            id: 'library_key_1',
            interactive: true 
        };
        this.game.scene.add(key);

        // 퍼즐 2: 숨겨진 서랍
        const drawerGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.3);
        const drawerMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const drawer = new THREE.Mesh(drawerGeometry, drawerMaterial);
        drawer.position.set(-0.5, 0.8, 1.8);
        drawer.castShadow = true;
        drawer.userData = { 
            type: 'drawer', 
            id: 'secret_drawer',
            interactive: true,
            locked: true 
        };
        this.game.scene.add(drawer);
    }

    private async loadLabRoom(): Promise<void> {
        // 연구소 방 구현 (향후 확장)
        console.log('🧪 연구소 방 로딩...');
        // 임시: 라이브러리와 동일
        await this.loadLibraryRoom();
    }

    private async loadMysteryRoom(): Promise<void> {
        // 미스터리 방 구현 (향후 확장)
        console.log('🏚️ 미스터리 방 로딩...');
        // 임시: 라이브러리와 동일
        await this.loadLibraryRoom();
    }

    private setupRoomLighting(): void {
        // 방 전용 조명
        const roomLight = new THREE.PointLight(0xffffff, 0.8, 10);
        roomLight.position.set(0, 4, 0);
        roomLight.castShadow = true;
        this.game.scene.add(roomLight);
    }

    public showVRUI(): void {
        if (!this.vrUI) {
            this.createVRUI();
        }
        if (this.vrUI) {
            this.vrUI.visible = true;
        }
    }

    public hideVRUI(): void {
        if (this.vrUI) {
            this.vrUI.visible = false;
        }
    }

    private createVRUI(): void {
        this.vrUI = new THREE.Group();

        // VR용 타이머 패널
        const panelGeometry = new THREE.PlaneGeometry(1, 0.3);
        const panelMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            transparent: true, 
            opacity: 0.7 
        });
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);
        panel.position.set(-2, 2, -1);
        panel.lookAt(this.game.camera.position);
        
        this.vrUI.add(panel);
        this.game.scene.add(this.vrUI);
    }

    public update(): void {
        // 씬 업데이트 로직
        if (this.vrUI && this.vrUI.visible) {
            // VR UI를 항상 카메라를 바라보도록
            this.vrUI.lookAt(this.game.camera.position);
        }
    }

    private clearRoom(): void {
        // 현재 방의 모든 오브젝트 제거
        const objectsToRemove: THREE.Object3D[] = [];
        
        this.game.scene.traverse((child: any) => {
            if (child !== this.game.camera && 
                !this.game.controllers.includes(child as THREE.Group) &&
                !this.game.hands.includes(child as THREE.Group) &&
                child.type !== 'AmbientLight' &&
                child.type !== 'DirectionalLight') {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach(obj => {
            this.game.scene.remove(obj);
            if ('geometry' in obj) {
                (obj as any).geometry?.dispose();
            }
            if ('material' in obj) {
                const material = (obj as any).material;
                if (Array.isArray(material)) {
                    material.forEach(mat => mat?.dispose());
                } else {
                    material?.dispose();
                }
            }
        });
    }

    public dispose(): void {
        this.clearRoom();
        this.gltfLoader = null as any;
    }
} 