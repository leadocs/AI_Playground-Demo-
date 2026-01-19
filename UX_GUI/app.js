document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        currentEngine: 'text', // 'text' | 'visual'
        currentVisualTab: 'understanding', // 'understanding' | 'image-gen' | 'video-gen'
        apiKey: '', // string
        hasVisualInput: false, // Track if image/video is uploaded for visual understanding
        uploadedFiles: [], // Store uploaded file objects (Array)
        uploadedFileUrls: [], // Store preview URLs (Array)
        isDrawerOpen: false,
        isCompareMode: false,
        modelSelection: {
            brand: 'Modelverse',
            version: 'Max',
            endpoint: 'Latest'
        },
        visualSettings: {
            ratio: '1:1',
            count: 1,
            duration: '4s',
            resolution: '720p',
            smartRewrite: false
        }
    };

    // DOM Elements
    const elements = {
        sidebarItems: document.querySelectorAll('.sidebar-menu .menu-item'),
        mainContent: document.querySelector('.main-content'),
        pageHeader: document.querySelector('.page-header'),
        subCategoryNav: document.querySelector('#sub-category-nav'),
        radioInputs: document.querySelectorAll('input[name="sub-cat"]'),
        workspace: document.querySelector('#workspace'),
        workspaceLeft: document.querySelector('#workspace-left'),
        welcomeTitle: document.querySelector('.welcome-title'),
        apiKeySelect: document.querySelector('#api-key-select'),
        sendBtn: document.querySelector('#send-btn'),
        // Video Generation
        videoUploadGroup: document.getElementById('video-upload-group'),
        videoFrameZones: document.querySelectorAll('.video-frame-zone'),
        
        inputBox: document.querySelector('.input-content'),
        drawer: document.querySelector('#config-drawer'),
        drawerToggle: document.querySelector('.header-action-btn'),
        drawerClose: document.querySelector('.close-drawer'),
        compareToggle: document.querySelector('#compare-toggle'),
        
        // Footer Tools
        toolsText: document.querySelector('#tools-text'),
        toolsVisualUnderstanding: document.querySelector('#tools-visual-understanding'),
        toolsImage: document.querySelector('#tools-image'),
        toolsVideo: document.querySelector('#tools-video'),
        miniSelects: document.querySelectorAll('.mini-select'),
        smartRewriteSwitch: document.querySelector('#smart-rewrite-switch'),
        
        // Upload
        uploadOptions: document.querySelectorAll('.upload-option-btn'),
        visualUploadZone: document.querySelector('#visual-upload-zone'),
        hiddenFileInput: document.querySelector('#hidden-file-input'), // Added hidden file input
        textModelUploadBtn: document.querySelector('#text-model-upload-btn'), // New upload btn for text model
        chatContainer: document.querySelector('#chat-container'), // New Chat Container
        welcomeSection: document.querySelector('#welcome-section'), // Welcome Section
        newChatBtn: document.querySelector('#new-chat-btn'), // Trash Icon
        inputUpperArea: document.querySelector('.input-upper-area'),
        modelTrigger: document.querySelector('#model-trigger'),
        modelMenu: document.querySelector('#model-menu'),
        modelNameDisplay: document.querySelector('.current-model-name'),
        menuOptions: document.querySelectorAll('.menu-option')
    };

    // --- Initialization ---
    function init() {
        bindEvents();
        render();
    }

    // --- Event Binding ---
    function bindEvents() {
        // 1. Sidebar Navigation
        elements.sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.style.cursor === 'not-allowed') return;

                const engine = item.getAttribute('data-engine');
                if (engine) {
                    switchEngine(engine);
                    // Update active state
                    elements.sidebarItems.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                }
            });
        });

        // 2. Sub Category Navigation (Radio Group)
        elements.radioInputs.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    state.currentVisualTab = e.target.value;
                    renderWorkspace();
                }
            });
        });

        // 3. API Key Selection
        if (elements.apiKeySelect) {
            elements.apiKeySelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'new') {
                    // Simulate creating new key
                    const newKey = `sk-${Math.random().toString(36).substr(2, 8)}`;
                    const option = document.createElement('option');
                    option.text = `New Key (${newKey})`;
                    option.value = newKey;
                    option.selected = true;
                    elements.apiKeySelect.insertBefore(option, elements.apiKeySelect.lastElementChild);
                    elements.apiKeySelect.value = newKey;
                    state.apiKey = newKey;
                    alert(`新 Key 已生成并自动选中: ${newKey}`);
                } else {
                    state.apiKey = val;
                }
            });
        }

        // 4. Send Button Logic (Gatekeeper)
        if (elements.sendBtn) {
            elements.sendBtn.addEventListener('click', () => {
                if (elements.sendBtn.classList.contains('disabled')) return;

                if (!state.apiKey) {
                    alert("【阻断策略】请先在右下角选择或配置 API Key。");
                    elements.apiKeySelect.focus();
                    elements.apiKeySelect.style.borderColor = '#F53F3F';
                    setTimeout(() => elements.apiKeySelect.style.borderColor = '', 2000);
                    return;
                }
                simulateGeneration();
            });
        }
        
        // 4.1 Input Box Monitor
        if (elements.inputBox) {
            elements.inputBox.addEventListener('input', () => {
                updateSendButtonState();
            });
            // Also handle focus/blur to handle placeholder if needed (optional)
        }
        
        // 5. Drawer Toggle
        if (elements.drawerToggle) {
            elements.drawerToggle.addEventListener('click', toggleDrawer);
        }
        if (elements.drawerClose) {
            elements.drawerClose.addEventListener('click', toggleDrawer);
        }

        // 6. Compare Mode (Split View)
        if (elements.compareToggle) {
            elements.compareToggle.addEventListener('click', toggleCompareMode);
        }

        // 7. Model Selector Logic
        if (elements.modelTrigger) {
            elements.modelTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.modelMenu.classList.toggle('open');
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (elements.modelMenu && elements.modelMenu.classList.contains('open')) {
                if (!elements.modelSelectorContainer?.contains(e.target) && !elements.modelMenu.contains(e.target) && !elements.modelTrigger.contains(e.target)) {
                    elements.modelMenu.classList.remove('open');
                }
            }
        });

        // Menu Options Click
        elements.menuOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                // Find siblings and remove active
                const siblings = opt.parentElement.children;
                for (let sib of siblings) {
                    sib.classList.remove('active');
                }
                opt.classList.add('active');

                // Update State based on level
                const level = opt.parentElement;
                const val = opt.getAttribute('data-val'); // simple val
                const text = opt.innerText.split('\n')[0]; // Handle timestamp structure

                if (level.classList.contains('level-brand')) state.modelSelection.brand = text;
                if (level.classList.contains('level-version')) state.modelSelection.version = text;
                if (level.classList.contains('level-endpoint')) {
                    state.modelSelection.endpoint = text;
                    // Close menu on final selection
                    elements.modelMenu.classList.remove('open');
                    updateModelDisplay();
                }
            });
        });

        // 8. Footer Tools (Mini Selects)
        elements.miniSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const type = e.target.getAttribute('data-type');
                const val = e.target.value;
                
                if (type === 'ratio') state.visualSettings.ratio = val;
                if (type === 'count') state.visualSettings.count = val;
                if (type === 'duration') state.visualSettings.duration = val;
                if (type === 'resolution') state.visualSettings.resolution = val;
            });
        });

        // 9. Smart Rewrite Switch
        if (elements.smartRewriteSwitch) {
            elements.smartRewriteSwitch.addEventListener('change', (e) => {
                state.visualSettings.smartRewrite = e.target.checked;
            });
        }

        // 10. Upload Options Logic (Hover Menu)
        if (elements.uploadOptions) {
            elements.uploadOptions.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent bubbling to parent zone if it has a listener
                    const type = btn.getAttribute('data-type');
                    triggerFileUpload(type);
                });
            });
        }
        
        // 10.1 Visual Upload Zone Click Logic (Direct Click)
        // In "single-mode" (Text/ImageGen), clicking the zone should trigger image upload directly
        if (elements.visualUploadZone) {
            elements.visualUploadZone.addEventListener('click', (e) => {
                // If in single mode (Text or ImageGen), trigger image upload
                // Or if user clicked the "default-state" content specifically
                if (state.currentEngine === 'text' || (state.currentEngine === 'visual' && state.currentVisualTab === 'image-gen')) {
                     triggerFileUpload('image');
                }
            });
        }

        // 10.2 Video Frame Upload Zones (Start/End)
        if (elements.videoFrameZones) {
            elements.videoFrameZones.forEach(zone => {
                zone.addEventListener('click', () => {
                     // Trigger file upload for image (frames are images)
                     triggerFileUpload('image');
                });
            });
        }

        // 11. File Input Change Listener
        if (elements.hiddenFileInput) {
            elements.hiddenFileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    // Check limit
                    const currentCount = state.uploadedFiles.length;
                    const remaining = 9 - currentCount;
                    
                    if (remaining <= 0) {
                        alert("最多只能上传9张图片");
                        return;
                    }

                    const filesToAdd = files.slice(0, remaining);
                    if (files.length > remaining) {
                        alert(`最多只能上传9张图片，已自动选取前 ${remaining} 张`);
                    }

                    filesToAdd.forEach(file => {
                        state.uploadedFiles.push(file);
                        state.uploadedFileUrls.push(URL.createObjectURL(file));
                    });

                    state.hasVisualInput = true;
                    
                    // Render Previews
                    renderPreviews();
                    
                    updateSendButtonState();
                }
            });
        }

        // 12. New Chat Button (Trash Icon)
        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', () => {
                 resetChat();
            });
        }
    }

    // --- Helper Functions ---

    function triggerFileUpload(type) {
        const fileInput = elements.hiddenFileInput;
        if (fileInput) {
            // Reset value to allow selecting same file again
            fileInput.value = '';
            
            if (type === 'image') {
                fileInput.setAttribute('accept', 'image/*');
                fileInput.setAttribute('multiple', 'multiple'); // Support multiple images
            } else {
                fileInput.setAttribute('accept', 'video/*');
                fileInput.removeAttribute('multiple'); // Single video
            }
            
            fileInput.click();
        }
    }

    function renderPreviews() {
        // Clear existing previews
        const existingPreviews = document.querySelectorAll('.input-upload-preview');
        existingPreviews.forEach(el => el.remove());

        // Check if we have files
        if (state.uploadedFileUrls.length === 0) {
            // Re-enable upload zone just in case
            if (elements.visualUploadZone) elements.visualUploadZone.classList.remove('disabled');
            return;
        }

        // Render each file
        state.uploadedFileUrls.forEach((url, index) => {
            const preview = document.createElement('div');
            preview.className = 'input-upload-preview';
            preview.innerHTML = `
                <img src="${url}" class="preview-thumbnail-img">
                <div class="remove-upload-btn" data-index="${index}">×</div>
            `;

            // Add to input upper area (AFTER visual upload zone)
            if (elements.visualUploadZone && elements.visualUploadZone.parentNode) {
                 elements.visualUploadZone.parentNode.insertBefore(preview, elements.visualUploadZone.nextSibling); // Insert after zone (or before previous sibling if we iterate backwards, but here we iterate forwards so we should append them in order)
                 // Wait, insertBefore nextSibling will reverse order if we loop 0..N and always insert after zone.
                 // Actually, if we want them [Zone] [1] [2] [3]...
                 // We should insert the last one first? Or just append them to a container?
                 // The parent is `input-upper-area`. It has `visualUploadZone` and `inputBox`.
                 // We want to insert them between Zone and Box.
                 // Correct logic: Insert before inputBox. 
                 // But wait, the user said "div 右侧". 
                 // So the order is: [Zone] [Preview1] [Preview2] ... [InputBox]
                 
                 // To keep order correct:
                 // We cleared all previews.
                 // We can insert them before `inputBox`.
                 // But `inputBox` might be far away if there are other elements.
                 // Let's insert before `inputBox` but ensure they are after `visualUploadZone`.
                 
                 // A better way: insertBefore `elements.visualUploadZone.nextSibling` logic is tricky for multiple.
                 // Let's use `insertBefore` `elements.inputBox`? 
                 // `input-upper-area` contains: [visualUploadZone] ... [inputContent (inputBox)]
                 
                 // If we loop 0->N:
                 // 0: Insert before inputBox. [Zone] [0] [Box]
                 // 1: Insert before inputBox. [Zone] [0] [1] [Box] -> CORRECT!
                 // `parentNode.insertBefore(newNode, referenceNode)`
                 
                 if (elements.inputUpperArea && elements.inputBox) {
                     elements.inputUpperArea.insertBefore(preview, elements.inputBox);
                 }
            }

            // Bind remove event
            preview.querySelector('.remove-upload-btn').addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                removeFile(idx);
            });
        });

        // Check limit to disable upload zone
        if (state.uploadedFiles.length >= 9) {
            if (elements.visualUploadZone) elements.visualUploadZone.classList.add('disabled');
        } else {
            if (elements.visualUploadZone) elements.visualUploadZone.classList.remove('disabled');
        }
    }

    function removeFile(index) {
        if (index >= 0 && index < state.uploadedFiles.length) {
            // Remove file and URL
            const url = state.uploadedFileUrls[index];
            URL.revokeObjectURL(url);
            
            state.uploadedFiles.splice(index, 1);
            state.uploadedFileUrls.splice(index, 1);
            
            if (state.uploadedFiles.length === 0) {
                state.hasVisualInput = false;
            }
            
            // Re-render
            renderPreviews();
            updateSendButtonState();
        }
    }

    function clearAllUploads() {
        state.uploadedFiles = [];
        state.hasVisualInput = false;
        
        // Revoke all URLs
        state.uploadedFileUrls.forEach(url => URL.revokeObjectURL(url));
        state.uploadedFileUrls = [];
        
        // Clear DOM
        const previews = document.querySelectorAll('.input-upload-preview');
        previews.forEach(el => el.remove());
        
        if (elements.hiddenFileInput) elements.hiddenFileInput.value = '';
        if (elements.visualUploadZone) elements.visualUploadZone.classList.remove('disabled');
        
        updateSendButtonState();
    }

    function updateSendButtonState() {
        if (!elements.sendBtn || !elements.inputBox) return;
        
        const text = elements.inputBox.innerText.trim();
        // Enable if has text OR has file
        if (text.length > 0 || state.uploadedFiles.length > 0) {
            elements.sendBtn.classList.remove('disabled');
            elements.sendBtn.style.opacity = '1';
            elements.sendBtn.style.cursor = 'pointer';
        } else {
            elements.sendBtn.classList.add('disabled');
            elements.sendBtn.style.opacity = '0.5';
            elements.sendBtn.style.cursor = 'not-allowed';
        }
    }

    function resetChat() {
        // Cleanup Chat Image URLs to prevent memory leaks
        if (state.chatImageUrls && state.chatImageUrls.length > 0) {
            state.chatImageUrls.forEach(url => URL.revokeObjectURL(url));
            state.chatImageUrls = [];
        }

        // Clear Chat Container
        if (elements.chatContainer) {
            elements.chatContainer.innerHTML = '';
            elements.chatContainer.style.display = 'none';
        }

        // Clear Visual Result Bubbles
        const results = document.querySelectorAll('.result-bubble');
        results.forEach(el => el.remove());
        
        // Show Welcome
        if (elements.welcomeSection) {
            elements.welcomeSection.style.display = 'flex'; // or block/flex depending on css
        }

        // Hide Trash Icon
        if (elements.newChatBtn) {
            elements.newChatBtn.style.display = 'none';
        }

        // Clear Inputs
        if (elements.inputBox) elements.inputBox.innerText = '';
        clearAllUploads();
    }

    // --- Logic Actions ---

    function switchEngine(engine) {
        // Reset chat/result state when switching engines
        resetChat(); 
        state.currentEngine = engine;
        render();
    }

    function toggleDrawer() {
        state.isDrawerOpen = !state.isDrawerOpen;
        if (state.isDrawerOpen) {
            elements.drawer.classList.add('open');
        } else {
            elements.drawer.classList.remove('open');
        }
    }

    function toggleCompareMode() {
        state.isCompareMode = !state.isCompareMode;
        const btn = elements.compareToggle;
        
        if (state.isCompareMode) {
            btn.classList.add('active');
            elements.workspace.classList.add('split-mode');
            
            // Create Right Pane
            if (!document.querySelector('#workspace-right')) {
                const rightPane = elements.workspaceLeft.cloneNode(true);
                rightPane.id = 'workspace-right';
                // Reset content in right pane to avoid ID conflicts conceptually (though for demo it's fine)
                rightPane.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
                
                // Change welcome title to indicate difference
                const title = rightPane.querySelector('.welcome-title');
                if (title) title.textContent = "对比模型 (B)";
                
                elements.workspace.appendChild(rightPane);
            }
        } else {
            btn.classList.remove('active');
            elements.workspace.classList.remove('split-mode');
            const rightPane = document.querySelector('#workspace-right');
            if (rightPane) rightPane.remove();
        }
    }

    function updateModelDisplay() {
        // Construct name: Brand-Version-Endpoint
        // Simplified for demo
        const name = `${state.modelSelection.brand}-${state.modelSelection.version}-${state.modelSelection.endpoint}`;
        elements.modelNameDisplay.textContent = name;
    }

    function simulateGeneration() {
        const userInput = elements.inputBox.innerText.trim();
        const uploadedFiles = [...state.uploadedFiles]; // Copy
        const uploadedFileUrls = [...state.uploadedFileUrls]; // Copy

        // Simulate Upload Log
        uploadedFiles.forEach(file => {
             console.log(`[Simulation] Uploading file to: /Users/lealee/Library/Mobile Documents/com~apple~CloudDocs/Trae_Playground/「Personal」小团队日常/UXteam管理/需求剔骨器_UX/Source/AI平台_体验中心/Output/images/${file.name}`);
        });

        // Show Trash Icon (Clear Chat) when conversation starts
        if (elements.newChatBtn) {
            elements.newChatBtn.style.display = 'flex';
        }

        // Handle Text Engine (Chat Flow)
        if (state.currentEngine === 'text') {
            // Switch to Chat View
            if (elements.welcomeSection) elements.welcomeSection.style.display = 'none';
            if (elements.chatContainer) {
                elements.chatContainer.style.display = 'flex';
                
                // 1. Add User Message
                const userMsg = document.createElement('div');
                userMsg.className = 'message user-message';
                
                let contentHtml = '';
                
                // Add images if any
                if (uploadedFileUrls.length > 0) {
                    contentHtml += `<div class="message-images" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">`;
                    uploadedFileUrls.forEach(url => {
                        contentHtml += `<img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; display: block; border: 1px solid rgba(0,0,0,0.1);">`;
                        // Track URL to revoke later (memory management)
                        if (!state.chatImageUrls) state.chatImageUrls = [];
                        state.chatImageUrls.push(url);
                    });
                    contentHtml += `</div>`;
                }
                
                contentHtml += `<div class="message-content">${userInput}</div>`;
                
                userMsg.innerHTML = contentHtml;
                elements.chatContainer.appendChild(userMsg);
                
                // Clear Upload State (without revoking URLs as they are now in chat)
                state.uploadedFiles = [];
                state.uploadedFileUrls = [];
                state.hasVisualInput = false;
                
                // Clear DOM Previews
                const previews = document.querySelectorAll('.input-upload-preview');
                previews.forEach(el => el.remove());
                if (elements.hiddenFileInput) elements.hiddenFileInput.value = '';
                if (elements.visualUploadZone) elements.visualUploadZone.classList.remove('disabled');
                
                updateSendButtonState();
                elements.inputBox.innerText = ''; // Clear input text

                // 2. Add Loading Message
                const loadingMsg = document.createElement('div');
                loadingMsg.className = 'message ai-message loading';
                loadingMsg.innerHTML = `
                    <div class="message-avatar">
                        <img src="assets/avatar-ai.png" onerror="this.src='assets/icon-ai.svg'" style="width:24px; height:24px;">
                    </div>
                    <div class="message-content">
                        <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #e5e6eb; border-top-color: #165DFF; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    </div>
                `;
                elements.chatContainer.appendChild(loadingMsg);
                
                // Scroll to bottom
                elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;

                // 3. Simulate Response
                setTimeout(() => {
                    loadingMsg.remove();
                    
                    const aiMsg = document.createElement('div');
                    aiMsg.className = 'message ai-message';
                    aiMsg.innerHTML = `
                        <div class="message-avatar">
                            <img src="assets/avatar-ai.png" onerror="this.src='assets/icon-ai.svg'" style="width:24px; height:24px;">
                        </div>
                        <div class="message-content">
                            这里是 ${state.modelSelection.brand} 模型根据您的输入生成的内容。
                            <br>
                            这是一个模拟的回复，用于演示对话流交互体验。
                        </div>
                    `;
                    elements.chatContainer.appendChild(aiMsg);
                    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
                }, 1500);
            }
            
            // Clear Inputs (pass false to avoid revoking, though we nulled it already)
            if (elements.inputBox) elements.inputBox.innerText = '';
            clearUpload(false); 

        } else {
            // Handle Visual/Other Engines (Original "Result Bubble" Logic)
            const animate = (container) => {
                const originalContent = container.innerHTML;
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading-state';
                loadingDiv.style.textAlign = 'center';
                loadingDiv.style.paddingTop = '20px';
                loadingDiv.innerHTML = `
                    <div class="spinner" style="border: 2px solid #f3f3f3; border-top: 2px solid #165DFF; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    <p style="font-size:12px; color:#999;">正在生成...</p>
                `;
                
                const inputBox = container.querySelector('.input-box-container');
                if (inputBox) {
                    inputBox.parentNode.insertBefore(loadingDiv, inputBox);
                }

                setTimeout(() => {
                    loadingDiv.remove();
                    const result = document.createElement('div');
                    result.className = 'result-bubble';
                    result.style.cssText = 'background:#F7F8FA; padding:12px; border-radius:8px; margin-bottom:16px; width:100%; text-align:left; font-size:14px;';
                    
                    let content = `【生成结果】这里是 ${state.modelSelection.brand} 模型根据您的输入生成的内容...`;
                    if (state.currentEngine === 'visual') {
                        if (state.currentVisualTab === 'image-gen') {
                            content = `【生成结果】已生成 ${state.visualSettings.count} 张 ${state.visualSettings.ratio} 图片`;
                        } else if (state.currentVisualTab === 'video-gen') {
                            content = `【生成结果】已生成 ${state.visualSettings.duration} / ${state.visualSettings.resolution} 视频 ${state.visualSettings.smartRewrite ? '(已启用Prompt改写)' : ''}`;
                        }
                    }
                    result.textContent = content;
                    
                    if (inputBox) inputBox.parentNode.insertBefore(result, inputBox.nextSibling);
                }, 1500);
            };

            animate(elements.workspaceLeft);
            if (state.isCompareMode) {
                const rightPane = document.querySelector('#workspace-right');
                if (rightPane) animate(rightPane);
            }
            
            // Clear inputs for visual mode too
             if (elements.inputBox) elements.inputBox.innerText = '';
             clearUpload(true);
        }
    }

    // --- Rendering ---

    function render() {
        // 1. Toggle Sub Category Nav and Titles
        if (state.currentEngine === 'visual') {
            elements.subCategoryNav.style.display = 'flex';
            elements.welcomeTitle.textContent = "欢迎使用视觉大模型";
        } else {
            elements.subCategoryNav.style.display = 'none';
            elements.welcomeTitle.textContent = "欢迎使用文本大模型";
        }

        renderWorkspace();
    }

    function renderWorkspace() {
        // Update Placeholder based on context
        const placeholders = document.querySelectorAll('.placeholder-text');
        
        placeholders.forEach(ph => {
            if (state.currentEngine === 'text') {
                ph.textContent = "输入文本，开始对话...";
            } else {
                if (state.currentVisualTab === 'understanding') {
                    ph.textContent = "拖入图片或视频，并输入问题 (视觉理解模式)...";
                } else if (state.currentVisualTab === 'image-gen') {
                    ph.textContent = "输入提示词生成图片 (支持垫图)...";
                } else {
                    ph.textContent = "输入提示词生成视频...";
                }
            }
        });

        // Toggle Visual Upload Zone & Tools
        // 1. Reset Common Elements
        if (elements.visualUploadZone) elements.visualUploadZone.style.display = 'none';
        if (elements.videoUploadGroup) elements.videoUploadGroup.style.display = 'none';
        
        if (elements.toolsText) elements.toolsText.style.display = 'none';
        if (elements.toolsVisualUnderstanding) elements.toolsVisualUnderstanding.style.display = 'none';
        if (elements.toolsImage) elements.toolsImage.style.display = 'none';
        if (elements.toolsVideo) elements.toolsVideo.style.display = 'none';

        const videoUploadBtn = document.querySelector('.upload-option-btn[data-type="video"]');

        // 2. Logic Branching
        if (state.currentEngine === 'text') {
            // --- Text Mode ---
            if (elements.toolsText) elements.toolsText.style.display = 'flex';
            
            if (elements.visualUploadZone) {
                elements.visualUploadZone.style.display = 'block';
                elements.visualUploadZone.classList.add('single-mode');
                elements.visualUploadZone.classList.remove('image-gen-mode');
            }
            if (videoUploadBtn) videoUploadBtn.style.display = 'none';

        } else {
            // --- Visual Mode ---
            const subVal = state.currentVisualTab;

            if (subVal === 'video-gen') {
                // Video Gen
                if (elements.videoUploadGroup) elements.videoUploadGroup.style.display = 'flex';
                if (elements.toolsVideo) elements.toolsVideo.style.display = 'flex';
                
                // Placeholder
                if (elements.inputBox) {
                    elements.inputBox.innerHTML = '<span class="placeholder-text" contenteditable="false">输入提示词生成视频...</span>';
                }

            } else {
                // Understanding or Image Gen
                if (elements.visualUploadZone) {
                    elements.visualUploadZone.style.display = 'block';
                    
                    if (subVal === 'image-gen') {
                        // Image Gen
                        elements.visualUploadZone.classList.add('single-mode', 'image-gen-mode');
                        if (videoUploadBtn) videoUploadBtn.style.display = 'none';
                        if (elements.toolsImage) elements.toolsImage.style.display = 'flex';
                        
                        if (elements.inputBox) {
                             elements.inputBox.innerHTML = '<span class="placeholder-text" contenteditable="false">输入提示词生成图片 (支持垫图)...</span>';
                        }
                    } else {
                        // Understanding
                        elements.visualUploadZone.classList.remove('single-mode', 'image-gen-mode');
                        if (videoUploadBtn) videoUploadBtn.style.display = 'flex';
                        if (elements.toolsVisualUnderstanding) elements.toolsVisualUnderstanding.style.display = 'flex';
                        
                        if (elements.inputBox) {
                             elements.inputBox.innerHTML = '<span class="placeholder-text" contenteditable="false">输入对图片/视频的描述或提问...</span>';
                        }
                    }
                }
            }
        }
        
        // Update Send Button State
        updateSendButtonState();
    }

    // Helper for Send Button State
    function updateSendButtonState() {
        if (!elements.sendBtn) return;
        
        let shouldDisable = false;

        // 1. Visual Understanding Rule: Must have image/video
        if (state.currentEngine === 'visual' && state.currentVisualTab === 'understanding') {
            if (!state.hasVisualInput) {
                shouldDisable = true;
            }
        }

        // 2. Text Mode Rule: Must have text input
        if (state.currentEngine === 'text') {
            // Clone to safely remove placeholder without affecting UI
            const clone = elements.inputBox.cloneNode(true);
            const placeholder = clone.querySelector('.placeholder-text');
            if (placeholder) {
                placeholder.remove();
            }
            const textContent = clone.innerText.trim();
            if (!textContent) {
                shouldDisable = true;
            }
        }
        
        // Apply State
        if (shouldDisable) {
            elements.sendBtn.classList.add('disabled');
            // Clean up legacy inline styles if any
            elements.sendBtn.style.opacity = '';
            elements.sendBtn.style.cursor = '';
            elements.sendBtn.style.filter = '';
        } else {
            elements.sendBtn.classList.remove('disabled');
            elements.sendBtn.style.opacity = '';
            elements.sendBtn.style.cursor = '';
            elements.sendBtn.style.filter = '';
        }
    }

    // Add CSS for spinner dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);

    // Run init
    init();
});
