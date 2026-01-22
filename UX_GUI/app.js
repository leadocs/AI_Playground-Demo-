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
        workspaceRight: document.querySelector('#workspace-right'),
        
        // Chat Containers & Welcomes
        chatContainerLeft: document.querySelector('#chat-container-left'),
        chatContainerRight: document.querySelector('#chat-container-right'),
        welcomeSectionLeft: document.querySelector('#welcome-section-left'),
        welcomeSectionRight: document.querySelector('#welcome-section-right'),
        welcomeTitleLeft: document.querySelector('#welcome-section-left .welcome-title'),
        
        apiKeySelect: document.querySelector('#api-key-select'),
        sendBtn: document.querySelector('#send-btn'),
        
        // Video Generation
        videoUploadGroup: document.getElementById('video-upload-group'),
        videoFrameZones: document.querySelectorAll('.video-frame-zone'),
        
        inputBox: document.querySelector('.input-content'),
        drawer: document.querySelector('.right-drawer'),
        drawerToggles: document.querySelectorAll('.pane-config-btn'),
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
        hiddenFileInput: document.querySelector('#hidden-file-input'),
        inputUpperArea: document.querySelector('.input-upper-area'),
        
        // Model Selector
        modelTrigger: document.querySelector('#model-trigger'),
        modelMenu: document.querySelector('#model-menu'),
        modelNameDisplay: document.querySelector('.current-model-name'),
        menuOptions: document.querySelectorAll('.menu-option'),
        modelSelectorContainer: document.querySelector('.model-selector-container'),

        // New Elements
        clearChatBtns: document.querySelectorAll('.clear-chat-btn'),
        presetTags: document.querySelectorAll('.preset-tag'),
        imageGenTags: document.querySelector('#image-gen-tags')
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
        }
        
        // 5. Drawer Toggle
        if (elements.drawerToggles) {
            elements.drawerToggles.forEach(btn => {
                btn.addEventListener('click', toggleDrawer);
            });
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
        if (elements.visualUploadZone) {
            elements.visualUploadZone.addEventListener('click', (e) => {
                if (state.currentEngine === 'text' || (state.currentEngine === 'visual' && state.currentVisualTab === 'image-gen')) {
                     triggerFileUpload('image');
                }
            });
        }

        // 10.2 Video Frame Upload Zones (Start/End)
        if (elements.videoFrameZones) {
            elements.videoFrameZones.forEach(zone => {
                zone.addEventListener('click', () => {
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

        // 12. Per-Pane Clear Chat Buttons
        if (elements.clearChatBtns) {
            elements.clearChatBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const pane = btn.closest('.pane');
                    const side = pane && pane.id === 'workspace-right' ? 'right' : 'left';
                    clearChatPane(side);
                });
            });
        }

        // 13. Preset Tags
        if (elements.presetTags) {
            elements.presetTags.forEach(tag => {
                tag.addEventListener('click', () => {
                    const text = tag.innerText;
                    if (elements.inputBox) {
                        const currentText = elements.inputBox.innerText;
                        // Remove placeholder text if it's the only thing
                        if (elements.inputBox.querySelector('.placeholder-text') || currentText.trim() === '') {
                            elements.inputBox.innerText = text;
                        } else {
                            elements.inputBox.innerText = currentText + ' ' + text;
                        }
                        updateSendButtonState();
                    }
                });
            });
        }
    }

    // --- Helper Functions ---

    function triggerFileUpload(type) {
        const fileInput = elements.hiddenFileInput;
        if (fileInput) {
            fileInput.value = '';
            
            if (type === 'image') {
                fileInput.setAttribute('accept', 'image/*');
                fileInput.setAttribute('multiple', 'multiple');
            } else {
                fileInput.setAttribute('accept', 'video/*');
                fileInput.removeAttribute('multiple');
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

            if (elements.inputUpperArea && elements.inputBox) {
                 elements.inputUpperArea.insertBefore(preview, elements.inputBox);
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
            const url = state.uploadedFileUrls[index];
            URL.revokeObjectURL(url);
            
            state.uploadedFiles.splice(index, 1);
            state.uploadedFileUrls.splice(index, 1);
            
            if (state.uploadedFiles.length === 0) {
                state.hasVisualInput = false;
            }
            
            renderPreviews();
            updateSendButtonState();
        }
    }

    function clearAllUploads() {
        state.uploadedFiles = [];
        state.hasVisualInput = false;
        
        state.uploadedFileUrls.forEach(url => URL.revokeObjectURL(url));
        state.uploadedFileUrls = [];
        
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

    function clearChatPane(side) {
        const container = side === 'left' ? elements.chatContainerLeft : elements.chatContainerRight;
        const welcome = side === 'left' ? elements.welcomeSectionLeft : elements.welcomeSectionRight;

        // Clear content
        if (container) {
            container.innerHTML = '';
            container.style.display = 'none';
        }
        
        // Show Welcome
        if (welcome) {
            welcome.style.display = 'block';
        }
    }
    
    // Global reset (if needed, or just clear all)
    function resetChat() {
        clearChatPane('left');
        clearChatPane('right');
        if (elements.inputBox) elements.inputBox.innerText = '';
        clearAllUploads();
    }

    // --- Logic Actions ---

    function switchEngine(engine) {
        // Reset chat/result state when switching engines
        resetChat(); 
        
        // Exit compare mode if active (Reset to default)
        if (state.isCompareMode) {
            toggleCompareMode();
        }

        state.currentEngine = engine;
        render();
    }

    function toggleDrawer() {
        state.isDrawerOpen = !state.isDrawerOpen;
        if (elements.drawer) {
            if (state.isDrawerOpen) {
                elements.drawer.classList.add('open');
            } else {
                elements.drawer.classList.remove('open');
            }
        }
    }

    function toggleCompareMode() {
        state.isCompareMode = !state.isCompareMode;
        const btn = elements.compareToggle;
        
        if (state.isCompareMode) {
            btn.classList.add('active');
            // Show Right Pane
            if (elements.workspaceRight) {
                elements.workspaceRight.style.display = 'flex'; // Enable split view
            }
        } else {
            btn.classList.remove('active');
            // Hide Right Pane
            if (elements.workspaceRight) {
                elements.workspaceRight.style.display = 'none';
            }
        }
    }

    function updateModelDisplay() {
        const name = `${state.modelSelection.brand}-${state.modelSelection.version}-${state.modelSelection.endpoint}`;
        elements.modelNameDisplay.textContent = name;
    }

    function simulateGeneration() {
        const userInput = elements.inputBox.innerText.trim();
        const uploadedFileUrls = [...state.uploadedFileUrls]; // Copy

        // Determine targets
        const targets = ['left'];
        if (state.isCompareMode && state.currentEngine === 'text') {
            targets.push('right');
        }

        targets.forEach(side => {
            const container = side === 'left' ? elements.chatContainerLeft : elements.chatContainerRight;
            const welcome = side === 'left' ? elements.welcomeSectionLeft : elements.welcomeSectionRight;
            
            if (!container) return;
            
            // Hide welcome
            if (welcome) welcome.style.display = 'none';
            container.style.display = 'flex';

            // 1. Add User Message
            const userMsg = document.createElement('div');
            userMsg.className = 'message user-message';
            
            let contentHtml = '';
            if (uploadedFileUrls.length > 0) {
                contentHtml += `<div class="message-images" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">`;
                uploadedFileUrls.forEach(url => {
                    contentHtml += `<img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; display: block; border: 1px solid rgba(0,0,0,0.1);">`;
                });
                contentHtml += `</div>`;
            }
            contentHtml += `<div class="message-content">${userInput}</div>`;
            userMsg.innerHTML = contentHtml;
            container.appendChild(userMsg);
            
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
            container.appendChild(loadingMsg);
            container.scrollTop = container.scrollHeight;

            // 3. Simulate Response
            setTimeout(() => {
                loadingMsg.remove();
                
                const aiMsg = document.createElement('div');
                aiMsg.className = 'message ai-message';
                
                // Diff text for compare mode
                let responseText = `这里是 ${state.modelSelection.brand} 模型根据您的输入生成的内容。`;
                if (side === 'right') {
                    responseText = `这里是 对比模型 (B) 根据您的输入生成的内容。<br>它的回答可能略有不同。`;
                }

                aiMsg.innerHTML = `
                    <div class="message-avatar">
                        <img src="assets/avatar-ai.png" onerror="this.src='assets/icon-ai.svg'" style="width:24px; height:24px;">
                    </div>
                    <div class="message-content">
                        ${responseText}
                    </div>
                `;
                container.appendChild(aiMsg);
                container.scrollTop = container.scrollHeight;
            }, 1500);
        });

        // Clear shared inputs after sending
        if (elements.inputBox) elements.inputBox.innerText = '';
        clearAllUploads();
    }

    // --- Rendering ---

    function render() {
        // 1. Toggle Sub Category Nav and Titles
        if (state.currentEngine === 'visual') {
            elements.subCategoryNav.style.display = 'flex';
            if (elements.welcomeTitleLeft) elements.welcomeTitleLeft.textContent = "欢迎使用视觉大模型";
            
            // Hide Compare Toggle in Visual Mode
            if (elements.compareToggle) elements.compareToggle.style.display = 'none';
        } else {
            elements.subCategoryNav.style.display = 'none';
            if (elements.welcomeTitleLeft) elements.welcomeTitleLeft.textContent = "欢迎使用文本大模型";
            
            // Show Compare Toggle in Text Mode
            if (elements.compareToggle) elements.compareToggle.style.display = '';
        }

        renderWorkspace();
    }

    function renderWorkspace() {
        // Update Placeholder
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
        if (elements.visualUploadZone) elements.visualUploadZone.style.display = 'none';
        if (elements.videoUploadGroup) elements.videoUploadGroup.style.display = 'none';
        
        if (elements.toolsText) elements.toolsText.style.display = 'none';
        if (elements.toolsVisualUnderstanding) elements.toolsVisualUnderstanding.style.display = 'none';
        if (elements.toolsImage) elements.toolsImage.style.display = 'none';
        if (elements.toolsVideo) elements.toolsVideo.style.display = 'none';
        if (elements.imageGenTags) {
            if (state.currentEngine === 'visual' && state.currentVisualTab === 'image-gen') {
                elements.imageGenTags.style.display = 'flex';
            } else {
                elements.imageGenTags.style.display = 'none';
            }
        }

        const videoUploadBtn = document.querySelector('.upload-option-btn[data-type="video"]');

        if (state.currentEngine === 'text') {
            // Text Mode
            if (elements.toolsText) elements.toolsText.style.display = 'flex';
            
            if (elements.visualUploadZone) {
                // Hide upload zone in Text Mode
                elements.visualUploadZone.style.display = 'none';
            }
            if (videoUploadBtn) videoUploadBtn.style.display = 'none';

        } else {
            // Visual Mode
            const subVal = state.currentVisualTab;

            if (subVal === 'video-gen') {
                if (elements.videoUploadGroup) elements.videoUploadGroup.style.display = 'flex';
                if (elements.toolsVideo) elements.toolsVideo.style.display = 'flex';
                
            } else {
                if (elements.visualUploadZone) {
                    elements.visualUploadZone.style.display = 'block';
                    
                    if (subVal === 'image-gen') {
                        // Image Gen
                        elements.visualUploadZone.classList.add('single-mode', 'image-gen-mode');
                        if (videoUploadBtn) videoUploadBtn.style.display = 'none';
                        if (elements.toolsImage) elements.toolsImage.style.display = 'flex';
                        if (elements.imageGenTags) elements.imageGenTags.style.display = 'flex'; // Show Tags
                    } else {
                        // Understanding
                        elements.visualUploadZone.classList.remove('single-mode', 'image-gen-mode');
                        if (videoUploadBtn) videoUploadBtn.style.display = 'flex';
                        if (elements.toolsVisualUnderstanding) elements.toolsVisualUnderstanding.style.display = 'flex';
                    }
                }
            }
        }
        
        updateSendButtonState();
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
