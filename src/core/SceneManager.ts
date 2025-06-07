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
        console.log('📦 숫자 번호판 환경 생성 중...');
        
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

            // 숫자 번호판 생성
            this.createNumberPad();

            // 기본 조명 설정
            this.setupSimpleLighting();

            console.log('✅ 숫자 번호판 환경 생성 완료!');

        } catch (error) {
            console.error('❌ 숫자 번호판 환경 생성 실패:', error);
        }
    }

    private inputDisplay: string = "";
    
    private createNumberPad(): void {
        console.log('🔢 숫자 번호판 생성 중...');
        
        // 번호판 배경 패널
        const backPanel = BABYLON.MeshBuilder.CreateBox("backPanel", {
            width: 5,
            height: 6,
            depth: 0.2
        }, this.game.scene);
        backPanel.position = new BABYLON.Vector3(0, 2, -3);
        
        const backMaterial = new BABYLON.StandardMaterial("backMaterial", this.game.scene);
        backMaterial.diffuseColor = new BABYLON.Color3(0.05, 0.05, 0.05); // 더 어두운 회색
        backMaterial.emissiveColor = new BABYLON.Color3(0.02, 0.02, 0.02);
        backPanel.material = backMaterial;
        
        // 디스플레이 패널 (입력된 숫자 표시)
        const display = BABYLON.MeshBuilder.CreateBox("display", {
            width: 4,
            height: 0.8,
            depth: 0.1
        }, this.game.scene);
        display.position = new BABYLON.Vector3(0, 4.5, -2.85);
        
        const displayMaterial = new BABYLON.StandardMaterial("displayMaterial", this.game.scene);
        displayMaterial.diffuseColor = new BABYLON.Color3(0, 0.1, 0); // 더 어두운 녹색
        displayMaterial.emissiveColor = new BABYLON.Color3(0, 0.2, 0); // 더 어두운 녹색 발광
        display.material = displayMaterial;
        
        // 숫자 버튼들 생성 (3x4 격자)
        const buttonLayout = [
            ['1', '2', '3'],
            ['4', '5', '6'], 
            ['7', '8', '9'],
            ['*', '0', '#']
        ];
        
        const buttonSize = 0.6;
        const buttonSpacing = 0.8;
        const startX = -0.8;
        const startY = 3.2;
        
        for (let row = 0; row < buttonLayout.length; row++) {
            for (let col = 0; col < buttonLayout[row].length; col++) {
                const buttonValue = buttonLayout[row][col];
                const x = startX + (col * buttonSpacing);
                const y = startY - (row * buttonSpacing);
                
                this.createNumberButton(buttonValue, x, y, buttonSize);
            }
        }
        
        console.log('✅ 숫자 번호판 생성 완료');
    }
    
    private createNumberButton(value: string, x: number, y: number, size: number): void {
        // 버튼 박스 생성
        const button = BABYLON.MeshBuilder.CreateBox(`button_${value}`, {
            width: size,
            height: size,
            depth: 0.15
        }, this.game.scene);
        
        button.position = new BABYLON.Vector3(x, y, -2.8);
        
        // 색상 설정 (숫자별로 다른 색상)
        const buttonMaterial = new BABYLON.StandardMaterial(`buttonMaterial_${value}`, this.game.scene);
        
        if (value === '*') {
            // * 버튼 - 어두운 빨간색
            buttonMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.1, 0.1);
            buttonMaterial.emissiveColor = new BABYLON.Color3(0.15, 0.05, 0.05);
        } else if (value === '#') {
            // # 버튼 - 어두운 초록색
            buttonMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.1);
            buttonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.05);
        } else {
            // 숫자 버튼들 - 어두운 파란색
            buttonMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.4);
            buttonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.2);
        }
        
        // 텍스트 텍스처 생성
        const textTexture = this.createButtonTexture(value);
        buttonMaterial.diffuseTexture = textTexture;
        buttonMaterial.emissiveTexture = textTexture;
        
        button.material = buttonMaterial;
        
        // 버튼 클릭 이벤트 설정
        button.actionManager = new BABYLON.ActionManager(this.game.scene);
        
        // VR 컨트롤러 호버 효과
        button.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOverTrigger,
            () => {
                buttonMaterial.emissiveColor = buttonMaterial.emissiveColor.scale(2);
                console.log(`🎯 호버: ${value}`);
            }
        ));
        
        button.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPointerOutTrigger,
            () => {
                if (value === '*') {
                    buttonMaterial.emissiveColor = new BABYLON.Color3(0.15, 0.05, 0.05);
                } else if (value === '#') {
                    buttonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.15, 0.05);
                } else {
                    buttonMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.2);
                }
            }
        ));
        
        // 버튼 클릭 이벤트
        button.actionManager.registerAction(new BABYLON.ExecuteCodeAction(
            BABYLON.ActionManager.OnPickTrigger,
            () => {
                this.onNumberButtonClick(value);
            }
        ));
        
        console.log(`🔢 버튼 생성: ${value} at (${x}, ${y})`);
    }
    
    private createButtonTexture(text: string): BABYLON.Texture {
        // 캔버스 생성
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // 배경을 투명하게 설정
        ctx.clearRect(0, 0, 128, 128);
        
        // 텍스트 설정
        ctx.fillStyle = '#FFFFFF'; // 흰색 텍스트
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 텍스트 그리기
        ctx.fillText(text, 64, 64);
        
        // 텍스처로 변환
        const texture = new BABYLON.Texture.CreateFromBase64String(
            canvas.toDataURL(),
            `buttonText_${text}`,
            this.game.scene
        );
        
        texture.hasAlpha = true;
        
        console.log(`📝 버튼 텍스처 생성: ${text}`);
        return texture;
    }
    
    private onNumberButtonClick(value: string): void {
        console.log(`🔢 버튼 클릭: ${value}`);
        
        // 어떤 버튼을 누르든 웹 팝업 표시
        this.showWebPopup();
        
        if (value === '*') {
            // * 버튼: 입력 초기화 (Clear 기능)
            this.inputDisplay = "";
            console.log('🧹 입력 초기화 (*)');
        } else if (value === '#') {
            // # 버튼: 입력 완료 (Enter 기능)
            console.log(`✅ 입력 완료 (#): "${this.inputDisplay}"`);
            this.onNumberInputComplete(this.inputDisplay);
        } else {
            // 숫자 입력 (최대 10자리까지)
            if (this.inputDisplay.length < 10) {
                this.inputDisplay += value;
                console.log(`📝 현재 입력: "${this.inputDisplay}"`);
            } else {
                console.log('⚠️ 입력 한계 도달 (10자리)');
            }
        }
        
        // 디스플레이 업데이트 (시각적 피드백)
        this.updateDisplay();
    }
    
    private updateDisplay(): void {
        // 디스플레이의 발광 색상으로 입력 상태 표시
        const display = this.game.scene.getMeshByName("display");
        if (display && display.material) {
            const material = display.material as BABYLON.StandardMaterial;
            
            // 입력된 숫자 길이에 따라 발광 강도 변경 (더 어둡게)
            const intensity = Math.min(0.3, 0.1 + (this.inputDisplay.length * 0.02));
            material.emissiveColor = new BABYLON.Color3(0, intensity, 0);
            
            console.log(`📺 디스플레이 업데이트: "${this.inputDisplay}" (강도: ${intensity})`);
        }
    }
    
    private onNumberInputComplete(input: string): void {
        console.log(`🎉 번호 입력 완료: "${input}"`);
        
        // 여기서 입력된 번호로 원하는 작업 수행
        if (input === "1234") {
            console.log("🔓 정답! 문이 열립니다!");
            // 성공 효과나 다른 동작 추가 가능
        } else if (input.length > 0) {
            console.log("❌ 틀린 번호입니다.");
            // 오답 효과 추가 가능
        }
        
        // 입력 초기화
        setTimeout(() => {
            this.inputDisplay = "";
            this.updateDisplay();
        }, 2000); // 2초 후 자동 초기화
    }
    
    private showWebPopup(): void {
        console.log('🌐 VR 웹 팝업 표시 중...');
        
        // 기존 팝업 제거
        const existingPopup = document.getElementById('vr-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        // 팝업 컨테이너 생성
        const popup = document.createElement('div');
        popup.id = 'vr-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #333;
            border-radius: 15px;
            padding: 30px;
            font-family: Arial, sans-serif;
            color: white;
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
            pointer-events: auto;
            min-width: 400px;
            text-align: center;
        `;
        
        // 팝업 제목
        const title = document.createElement('h2');
        title.textContent = '🔢 VR 숫자 입력기';
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #4CAF50;
            font-size: 24px;
        `;
        popup.appendChild(title);
        
        // 현재 입력 표시
        const display = document.createElement('div');
        display.id = 'popup-display';
        display.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            min-height: 30px;
            letter-spacing: 3px;
        `;
        display.textContent = this.inputDisplay || '(숫자를 입력하세요)';
        popup.appendChild(display);
        
        // 숫자 키패드 생성
        const keypad = document.createElement('div');
        keypad.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 20px 0;
        `;
        
        const buttons = [
            '1', '2', '3',
            '4', '5', '6',
            '7', '8', '9',
            '*', '0', '#'
        ];
        
        buttons.forEach(btnText => {
            const btn = document.createElement('button');
            btn.textContent = btnText;
            btn.style.cssText = `
                padding: 15px;
                font-size: 20px;
                font-weight: bold;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                color: white;
                ${btnText === '*' ? 'background: #f44336;' : 
                  btnText === '#' ? 'background: #4CAF50;' : 
                  'background: #2196F3;'}
            `;
            
            // 호버 효과
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.1)';
                btn.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.5)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });
            
            // 클릭 이벤트
            btn.addEventListener('click', () => {
                this.handlePopupButtonClick(btnText);
            });
            
            keypad.appendChild(btn);
        });
        
        popup.appendChild(keypad);
        
        // 닫기 버튼
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '❌ 닫기';
        closeBtn.style.cssText = `
            background: #666;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 15px;
        `;
        
        closeBtn.addEventListener('click', () => {
            popup.remove();
            console.log('🌐 팝업 닫힘');
        });
        
        popup.appendChild(closeBtn);
        
        // 팝업을 문서에 추가
        document.body.appendChild(popup);
        
        console.log('✅ VR 웹 팝업 표시 완료');
    }
    
    private handlePopupButtonClick(value: string): void {
        console.log(`🌐 팝업 버튼 클릭: ${value}`);
        
        if (value === '*') {
            // 입력 초기화
            this.inputDisplay = "";
            console.log('🧹 팝업에서 입력 초기화');
        } else if (value === '#') {
            // 입력 완료
            console.log(`✅ 팝업에서 입력 완료: "${this.inputDisplay}"`);
            this.onNumberInputComplete(this.inputDisplay);
            
            // 팝업 닫기
            const popup = document.getElementById('vr-popup');
            if (popup) {
                popup.remove();
            }
        } else {
            // 숫자 입력
            if (this.inputDisplay.length < 10) {
                this.inputDisplay += value;
                console.log(`📝 팝업에서 입력: "${this.inputDisplay}"`);
            }
        }
        
        // 팝업 디스플레이 업데이트
        const display = document.getElementById('popup-display');
        if (display) {
            display.textContent = this.inputDisplay || '(숫자를 입력하세요)';
        }
        
        // VR 디스플레이도 업데이트
        this.updateDisplay();
    }

    private setupSimpleLighting(): void {
        console.log('💡 기본 조명 설정 중...');
        
        // 기본 환경광만 사용 (스포트라이트 제거)
        const ambientLight = new BABYLON.HemisphericLight("ambientLight", new BABYLON.Vector3(0, 1, 0), this.game.scene);
        ambientLight.intensity = 0.15; // 훨씬 더 어두운 환경
        ambientLight.diffuse = new BABYLON.Color3(0.6, 0.6, 0.6); // 더 어두운 회색
        
        console.log('✅ 기본 조명 설정 완료 (스포트라이트 제거됨)');
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