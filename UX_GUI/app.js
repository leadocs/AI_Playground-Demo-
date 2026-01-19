document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        currentEngine: 'text', // 'text' | 'visual'
        currentVisualTab: 'understanding', // 'understanding' | 'image-gen' | 'video-gen'
        apiKey: '', // string
        hasVisualInput: false, // Track if image/video is uploaded for visual understanding
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

        // 10. Upload Options Logic
        if (elements.uploadOptions) {
            elements.uploadOptions.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const type = btn.getAttribute('data-type');
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
                });
            });
        }

        // 11. File Input Change Listener
        if (elements.hiddenFileInput) {
            elements.hiddenFileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    // Update state
                    state.hasVisualInput = true;
                    
                    // Show simple feedback (simulated)
                    // In a real app, we would display thumbnails here
                    const uploadHint = document.querySelector('.upload-hint');
                    if (uploadHint) {
                        uploadHint.textContent = `已选择 ${files.length} 个文件`;
                    }
                    
                    updateSendButtonState();
                }
            });
        }

        // 12. New Chat Button
        const newChatBtn = document.querySelector('#new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                if (confirm('确定要清除当前对话上下文吗？')) {
                    // Clear bubbles (keep welcome section if present, or just remove bubbles)
                    const bubbles = document.querySelectorAll('.result-bubble');
                    bubbles.forEach(b => b.remove());
                    // Optionally show welcome again if empty
                    elements.welcomeTitle.style.display = 'block';
                    // Clear input
                    if (elements.inputBox) elements.inputBox.innerText = '';
                }
            });
        }
    }

    // --- Logic Actions ---

    function switchEngine(engine) {
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
        // Helper to animate generation in a specific container
        const animate = (container) => {
            const originalContent = container.innerHTML;
            container.innerHTML = `<div class="loading-state" style="text-align:center; padding-top: 100px;">
                <div class="spinner" style="border: 2px solid #f3f3f3; border-top: 2px solid #165DFF; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                <p style="font-size:12px; color:#999;">正在生成...</p>
            </div>`;
            
            setTimeout(() => {
                container.innerHTML = originalContent;
                // Mock append result
                const result = document.createElement('div');
                result.className = 'result-bubble';
                result.style.cssText = 'background:#F7F8FA; padding:12px; border-radius:8px; margin-top:16px; width:100%; text-align:left; font-size:14px;';
                
                let content = `【生成结果】这里是 ${state.modelSelection.brand} 模型根据您的输入生成的内容...`;
                if (state.currentEngine === 'visual') {
                    if (state.currentVisualTab === 'image-gen') {
                        content = `【生成结果】已生成 ${state.visualSettings.count} 张 ${state.visualSettings.ratio} 图片`;
                    } else if (state.currentVisualTab === 'video-gen') {
                        content = `【生成结果】已生成 ${state.visualSettings.duration} / ${state.visualSettings.resolution} 视频 ${state.visualSettings.smartRewrite ? '(已启用Prompt改写)' : ''}`;
                    }
                }
                
                result.textContent = content;
                
                // Insert after input box
                const inputBox = container.querySelector('.input-box-container');
                if (inputBox) inputBox.parentNode.insertBefore(result, inputBox.nextSibling);
            }, 1500);
        };

        animate(elements.workspaceLeft);
        
        if (state.isCompareMode) {
            const rightPane = document.querySelector('#workspace-right');
            if (rightPane) animate(rightPane);
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

        // Toggle Visual Upload Zone
        const visualUploadZone = document.querySelector('#visual-upload-zone');
        // Show upload zone in Visual Understanding, Image Gen, and Text mode
        if ((state.currentEngine === 'visual' && (state.currentVisualTab === 'understanding' || state.currentVisualTab === 'image-gen')) || state.currentEngine === 'text') {
            if (visualUploadZone) visualUploadZone.style.display = 'block';
            
            // Update placeholder only if in Visual mode to be specific, otherwise keep text default
            if (state.currentEngine === 'visual' && elements.inputBox) {
                 let phText = "输入对图片/视频的描述或提问...";
                 if (state.currentVisualTab === 'image-gen') phText = "输入提示词生成图片 (支持垫图)...";
                 
                 elements.inputBox.innerHTML = `<span class="placeholder-text" contenteditable="false">${phText}</span>`;
            }
            
            // Handle Video Upload Button Visibility & Single Mode Class
            const videoUploadBtn = document.querySelector('.upload-option-btn[data-type="video"]');
            if (videoUploadBtn) {
                // Single Mode (Text or Image Gen)
                if (state.currentEngine === 'text' || (state.currentEngine === 'visual' && state.currentVisualTab === 'image-gen')) {
                    videoUploadBtn.style.display = 'none'; // Hide video in text/image-gen mode
                    visualUploadZone.classList.add('single-mode'); // Add single mode class
                    
                    // Add specific class for Image Gen to customize text
                    if (state.currentEngine === 'visual' && state.currentVisualTab === 'image-gen') {
                        visualUploadZone.classList.add('image-gen-mode');
                    } else {
                        visualUploadZone.classList.remove('image-gen-mode');
                    }
                } else {
                    videoUploadBtn.style.display = 'flex'; // Show in visual mode
                    visualUploadZone.classList.remove('single-mode'); // Remove single mode class
                    visualUploadZone.classList.remove('image-gen-mode');
                }
            }

        } else {
            if (visualUploadZone) visualUploadZone.style.display = 'none';
            // Reset placeholder for other modes (Image/Video Gen)
            if (elements.inputBox && state.currentEngine === 'visual') { // Only reset if not text mode (handled above)
                 // actually the logic below handles text mode placeholder separately
            }
        }

        // Update Footer Tools Visibility
        // Reset all first
        if (elements.toolsText) elements.toolsText.style.display = 'none';
        if (elements.toolsVisualUnderstanding) elements.toolsVisualUnderstanding.style.display = 'none';
        if (elements.toolsImage) elements.toolsImage.style.display = 'none';
        if (elements.toolsVideo) elements.toolsVideo.style.display = 'none';

        if (state.currentEngine === 'text') {
            if (elements.toolsText) elements.toolsText.style.display = 'flex';
        } else {
            // Visual Engine
            if (state.currentVisualTab === 'understanding') {
                if (elements.toolsVisualUnderstanding) elements.toolsVisualUnderstanding.style.display = 'flex';
            } else if (state.currentVisualTab === 'image-gen') {
                if (elements.toolsImage) {
                    elements.toolsImage.style.display = 'flex';
                }
            } else if (state.currentVisualTab === 'video-gen') {
                if (elements.toolsVideo) elements.toolsVideo.style.display = 'flex';
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
