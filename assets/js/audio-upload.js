class AudioUploadManager {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadAudioFiles();
    }
    
    // audio upload form
    initializeElements() {
        this.uploadForm = document.getElementById('audio-upload-form');
        this.audioFileInput = document.getElementById('audio-file');
        this.audioCategory = null;
        this.audioTitle = document.getElementById('audio-title');
        this.audioDescription = document.getElementById('audio-description');
        this.audioFilesContainer = document.getElementById('audio-files-container');
    }
    
    bindEvents() {
        if (this.uploadForm) {
            this.uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }
        if (this.audioFileInput) {
            this.audioFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('Arquivo muito grande. Máximo 50MB permitido.');
                event.target.value = '';
                return;
            }
            const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'video/mp4'];
            if (!allowedTypes.includes(file.type)) {
                alert('Tipo de arquivo não suportado. Use MP3, WAV, OGG, M4A ou MP4.');
                event.target.value = '';
                return;
            }
            if (!this.audioTitle.value) {
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                this.audioTitle.value = fileName;
            }
        }
    }

    // audio upload handler
    async handleUpload(event) {
        event.preventDefault();
        const submitBtn = this.uploadForm ? this.uploadForm.querySelector('button[type="submit"]') : null;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
        }

        try {
            const fileField = this.audioFileInput;
            if (!fileField || !fileField.files || fileField.files.length === 0) {
                alert('Selecione um arquivo para enviar.');
                throw new Error('Nenhum arquivo selecionado');
            }

        const formData = new FormData();
        formData.append('audio', fileField.files[0]);
        formData.append('category', 'custom');
        formData.append('title', this.audioTitle ? this.audioTitle.value : '');
        formData.append('description', this.audioDescription ? this.audioDescription.value : '');
        
            const response = await fetch('/api/audio.php?action=upload', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Arquivo enviado com sucesso!');
                this.uploadForm.reset();
                this.loadAudioFiles();
            } else {
                alert('Erro ao enviar arquivo: ' + result.message);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            alert('Erro de conexão ao enviar arquivo');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Áudio';
            }
        }
    }


    async loadAudioFiles() {
        try {
            const response = await fetch('/api/audio.php?action=list');
            const result = await response.json();
            
            if (result.success) {
                this.displayAudioFiles(result.files);
            } else {
                this.audioFilesContainer.innerHTML = '<p class="no-files">Erro ao carregar arquivos</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar arquivos:', error);
            this.audioFilesContainer.innerHTML = '<p class="no-files">Erro de conexão</p>';
        }
    }
    
    displayAudioFiles(files) {
        if (files.length === 0) {
            this.audioFilesContainer.innerHTML = '<p class="no-files">Nenhum arquivo de áudio enviado ainda</p>';
            return;
        }
        
        const filesHtml = files.map(file => this.createAudioFileItem(file)).join('');
        this.audioFilesContainer.innerHTML = filesHtml;
        
        this.bindAudioFileEvents();
    }
    

    createAudioFileItem(file) {
        const categoryNames = {
            'noite': 'Noite',
            'por do sol': 'Por do Sol',
            'calmaria': 'Calmaria',
            'custom': 'Personalizado'
        };
        
        const normalizedCategory = file.category;
        
        const fileSize = this.formatFileSize(file.file_size);
        const duration = file.duration ? `${file.duration} min` : 'N/A';
        const uploadDate = new Date(file.created_at).toLocaleDateString('pt-BR');
        
        return `
            <div class="audio-file-item" data-id="${file.id}">
                <div class="audio-file-info">
                    <div class="audio-file-title">${file.title || file.original_name}</div>
                    <div class="audio-file-details">
                        ${fileSize} • ${duration} • ${uploadDate}
                    </div>
                    <div class="audio-file-category">
                        ${categoryNames[normalizedCategory]}
                    </div>
                </div>
                <div class="audio-file-actions">
                    <button class="audio-play-btn" data-id="${file.id}">Tocar</button>
                    <button class="audio-delete-btn" data-id="${file.id}">Remover</button>
                </div>
            </div>
        `;
    }
    

    bindAudioFileEvents() {
        document.querySelectorAll('.audio-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const audioId = e.target.dataset.id;
                this.playAudioFile(audioId);
            });
        });
        
        document.querySelectorAll('.audio-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const audioId = e.target.dataset.id;
                this.deleteAudioFile(audioId);
            });
        });
    }
    
    // stop audios to avoid multiple instances
    stopAllAudioPlayers() {
        document.querySelectorAll('.media-player').forEach(player => {
            const media = player.querySelector('audio');
            if (media) {
                media.pause();
                media.currentTime = 0;
            }
            player.remove();
        });
        
        document.querySelectorAll('.audio-play-btn').forEach(btn => {
            if (btn.textContent.includes('Tocando')) {
                btn.textContent = 'Tocar';
                btn.disabled = false;
            }
        });
        
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        if (window.meditationTimer) {
            if (window.meditationTimer.userAudio) {
                window.meditationTimer.userAudio.pause();
                window.meditationTimer.userAudio.currentTime = 0;
            }
            
            if (window.meditationTimer.backgroundMusic && window.meditationTimer.backgroundMusic.stop) {
                window.meditationTimer.backgroundMusic.stop();
            }
            
            if (window.meditationTimer.audioContext && window.meditationTimer.audioContext.state === 'running') {
                window.meditationTimer.audioContext.suspend();
            }
            window.meditationTimer.isAudioPaused = false;
            window.meditationTimer.stopVisualizer();
            window.meditationTimer.hideAudioControls();
        }
    }


    async playAudioFile(audioId) {
        this.stopAllAudioPlayers();
        
        try {
            const media = document.createElement('audio');
            media.src = `/api/audio.php?action=get&id=${audioId}`;
            media.volume = 0.5;
            media.controls = true;
            media.style.width = '100%';
            media.style.marginTop = '10px';
            
            const btn = document.querySelector(`[data-id="${audioId}"].audio-play-btn`);
            const originalText = btn.textContent;
            btn.textContent = '🔊 Tocando...';
            btn.disabled = true;
            
            const fileItem = document.querySelector(`[data-id="${audioId}"].audio-file-item`);
            if (fileItem) {
                const existingPlayer = fileItem.querySelector('.media-player');
                if (existingPlayer) {
                    existingPlayer.remove();
                }
                const playerContainer = document.createElement('div');
                playerContainer.className = 'media-player';
                playerContainer.appendChild(media);
                fileItem.appendChild(playerContainer);
            }
            
            media.addEventListener('loadeddata', () => {
                media.play();
            });
            
            media.addEventListener('ended', () => {
                btn.textContent = originalText;
                btn.disabled = false;
                const playerContainer = fileItem.querySelector('.media-player');
                if (playerContainer) {
                    playerContainer.remove();
                }
            });
            
            media.addEventListener('error', () => {
                btn.textContent = originalText;
                btn.disabled = false;
                alert('Erro ao reproduzir arquivo');
                const playerContainer = fileItem.querySelector('.media-player');
                if (playerContainer) {
                    playerContainer.remove();
                }
            });
            
        } catch (error) {
            console.error('Erro ao tocar arquivo:', error);
            alert('Erro ao reproduzir arquivo');
        }
    }
    

    async deleteAudioFile(audioId) {
        if (!confirm('Tem certeza que deseja remover este arquivo?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/audio.php?action=delete&id=${audioId}`, {
                method: 'GET'
            });
            
            const result = await response.json();
            
            if (result.success) {
                const fileItem = document.querySelector(`[data-id="${audioId}"].audio-file-item`);
                if (fileItem) {
                    fileItem.remove();
                }
                const remainingFiles = document.querySelectorAll('.audio-file-item');
                if (remainingFiles.length === 0) {
                    this.audioFilesContainer.innerHTML = '<p class="no-files">Nenhum arquivo de áudio enviado ainda</p>';
                }
            } else {
                alert('Erro ao remover arquivo: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao remover arquivo:', error);
            alert('Erro de conexão ao remover arquivo');
        }
    }


    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}


document.addEventListener('DOMContentLoaded', () => {
    window.audioUploadManager = new AudioUploadManager();
});
