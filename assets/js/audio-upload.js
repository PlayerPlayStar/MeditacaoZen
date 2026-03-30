// Gerencia upload dos arquivos de áudio


class AudioUploadManager {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadAudioFiles();
        // Inicialização funcionando
    }
    
    initializeElements() {
        // Mapeia os elementos do formulário
        this.uploadForm = document.getElementById('audio-upload-form');
        this.audioFileInput = document.getElementById('audio-file');
        // Uploads são sempre 'custom'
        this.audioCategory = null;
        this.audioTitle = document.getElementById('audio-title');
        this.audioDescription = document.getElementById('audio-description');
        this.audioFilesContainer = document.getElementById('audio-files-container');
    }
    
    bindEvents() {
        // Envia o upload via fetch pra página não recarregar sozinha
        if (this.uploadForm) {
            this.uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }
        
        // Preenche automático o título ao selecionar arquivo
        if (this.audioFileInput) {
            this.audioFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }
    
    /**
     * handleFileSelect(event) - Valida o arquivo
     * @param {Event} event - Evento de mudança do input de arquivo
     * 
     * - Valida o tamanho máximo (50MB)
     * - Valida os tipos permitidos (MP3, WAV, OGG, M4A, MP4)
     * - Sugere título baseado no nome do arquivo
     */

    handleFileSelect(event) {
        // Regras de tamanho e tipo
        const file = event.target.files[0];
        if (file) {
            // Validar tamanho (50MB máximo)
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                alert('Arquivo muito grande. Máximo 50MB permitido.');
                event.target.value = '';
                return;
            }
            
            // Validar tipo de arquivo
            const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'video/mp4'];
            if (!allowedTypes.includes(file.type)) {
                alert('Tipo de arquivo não suportado. Use MP3, WAV, OGG, M4A ou MP4.');
                event.target.value = '';
                return;
            }
            
            // Sugerir título com o nome do arquivo
            if (!this.audioTitle.value) {
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                this.audioTitle.value = fileName;
            }
        }
    }
    
    /**
     * handleUpload(event) - Processa upload de arquivo de áudio
     * @param {Event} event - Evento de submit do formulário
     * 
     * - Cria FormData com arquivo e metadados
     * - Envia para API /api/audio.php?action=upload
     * - Recarrega lista de arquivos com sucesso
     */

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

            // Monta FormData para envio
        const formData = new FormData();
        formData.append('audio', fileField.files[0]);
        formData.append('category', 'custom');
        formData.append('title', this.audioTitle ? this.audioTitle.value : '');
        formData.append('description', this.audioDescription ? this.audioDescription.value : '');
        
            const response = await fetch('/api/audio.php?action=upload', {
                method: 'POST',
                body: formData,
                // same-origin por padrão
                credentials: 'same-origin'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Arquivo enviado com sucesso!');
                this.uploadForm.reset();
                this.loadAudioFiles(); // Recarrega listagem após upload
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
    
    /**
     * loadAudioFiles() - Carrega lista de arquivos de áudio do usuário
     * - Busca arquivos via API /api/audio.php?action=list
     * - Exibe arquivos usando displayAudioFiles()
     * - Trata os erros de conexão
     */

    async loadAudioFiles() {
        // Busca a lista de arquivos do usuário
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
    
    /**
     * displayAudioFiles(files) - Exibe lista de arquivos na interface
     * @param {Array} files - Array de objetos com dados dos arquivos
     * 
     * - Exibe mensagem se não houver arquivos
     * - Cria HTML para cada arquivo usando createAudioFileItem()
     * - Adiciona event listeners aos botões de ação
     */

    displayAudioFiles(files) {
        // Constrói HTML da lista e liga os eventos de ação
        if (files.length === 0) {
            this.audioFilesContainer.innerHTML = '<p class="no-files">Nenhum arquivo de áudio enviado ainda</p>';
            return;
        }
        
        const filesHtml = files.map(file => this.createAudioFileItem(file)).join('');
        this.audioFilesContainer.innerHTML = filesHtml;
        
        // Adicionar eventos nos botões
        this.bindAudioFileEvents();
    }
    
    /**
     * createAudioFileItem(file) - Cria HTML de um item de arquivo
     * @param {Object} file - Objeto com dados do arquivo (id, title, category, etc)
     * @returns {string} HTML string do item de arquivo
     * 
     * - Formata tamanho e duração do arquivo
     * - Formata data de upload
     * - Adiciona nome da categoria
     */

    createAudioFileItem(file) {
        // Normalizar categoria antiga para nova (compatibilidade com banco)
        const normalizeCategory = (cat) => {
            const map = {
                'nature': 'noite',
                'rain': 'por do sol',
                'ocean': 'calmaria'
            };
            return map[cat] || cat;
        };
        
        const normalizedCategory = normalizeCategory(file.category);
        
        const categoryNames = {
            'noite': 'Noite',
            'por do sol': 'Por do Sol',
            'calmaria': 'Calmaria',
            'custom': 'Personalizado',
            // Compatibilidade com os dados antigos
            'nature': 'Noite',
            'rain': 'Por do Sol',
            'ocean': 'Calmaria'
        };
        
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
    
    /**
     * bindAudioFileEvents() - Adiciona event listeners nos botões
     * - Botão "Tocar" = playAudioFile()
     * - Botão "Remover" = deleteAudioFile()
     */

    bindAudioFileEvents() {
        // Eventos para o botão de tocar
        document.querySelectorAll('.audio-play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const audioId = e.target.dataset.id;
                this.playAudioFile(audioId);
            });
        });
        
        // Eventos para o botão de remover
        document.querySelectorAll('.audio-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const audioId = e.target.dataset.id;
                this.deleteAudioFile(audioId);
            });
        });
    }
    
    /**
     * stopAllAudioPlayers() - Para todas as músicas que estiverem tocando na hora
     * - Remove todos os players existentes
     * - Reseta os botões para "Tocar"
     * - Reabilita todos os botões
     */

    stopAllAudioPlayers() {
        // Remover todos os players de áudio existentes
        document.querySelectorAll('.media-player').forEach(player => {
            const media = player.querySelector('audio');
            if (media) {
                media.pause();
                media.currentTime = 0;
            }
            player.remove();
        });
        
        // Resetar todos os botões de tocar
        document.querySelectorAll('.audio-play-btn').forEach(btn => {
            if (btn.textContent.includes('Tocando')) {
                btn.textContent = 'Tocar';
                btn.disabled = false;
            }
        });
        
        // Forçar parada de TODOS os elementos de áudio na página (HTML5 Audio)
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        // Parar sons sintéticos do Web Audio API (MeditationTimer)
        if (window.meditationTimer) {
            // Parar áudio do usuário se existir
            if (window.meditationTimer.userAudio) {
                window.meditationTimer.userAudio.pause();
                window.meditationTimer.userAudio.currentTime = 0;
            }
            
            // Parar música de fundo
            if (window.meditationTimer.backgroundMusic && window.meditationTimer.backgroundMusic.stop) {
                window.meditationTimer.backgroundMusic.stop();
            }
            
            // Parar AudioContext se existir
            if (window.meditationTimer.audioContext && window.meditationTimer.audioContext.state === 'running') {
                window.meditationTimer.audioContext.suspend();
            }
            
            // Resetar flags
            window.meditationTimer.isAudioPaused = false;
            window.meditationTimer.stopVisualizer();
            window.meditationTimer.hideAudioControls();
        }
    }
    
    /**
     * playAudioFile(audioId) - Reproduz arquivo de áudio pra pré-visualização
     * @param {number} audioId - ID do arquivo a reproduzir
     * 
     * - Para todas as músicas existentes antes de iniciar
     * - Carrega arquivo via API /api/audio.php?action=get&id={id}
     * - Exibe o player
     * - Remove player quando termina ou dá erro
     */

    async playAudioFile(audioId) {
        // Parar todas as músicas existentes antes de iniciar uma nova
        this.stopAllAudioPlayers();
        
        // Pré-visualização:
        try {
            // Criar elemento de áudio/vídeo temporário
            const media = document.createElement('audio');
            media.src = `/api/audio.php?action=get&id=${audioId}`;
            media.volume = 0.5;
            media.controls = true;
            media.style.width = '100%';
            media.style.marginTop = '10px';
            
            // Mostrar feedback
            const btn = document.querySelector(`[data-id="${audioId}"].audio-play-btn`);
            const originalText = btn.textContent;
            btn.textContent = '🔊 Tocando...';
            btn.disabled = true;
            
            // Inserir player na interface
            const fileItem = document.querySelector(`[data-id="${audioId}"].audio-file-item`);
            if (fileItem) {
                // Remover player anterior se existir
                const existingPlayer = fileItem.querySelector('.media-player');
                if (existingPlayer) {
                    existingPlayer.remove();
                }
                
                // Adicionar novo player
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
    
    /**
     * deleteAudioFile(audioId) - Remove arquivo de áudio
     * @param {number} audioId - ID do arquivo a remover
     * 
     * - Solicita confirmação do usuário
     * - Remove arquivo via API /api/audio.php?action=delete&id={id}
     * - Remove item da lista
     * - Exibe mensagem se não houver mais arquivos
     */

    async deleteAudioFile(audioId) {
        // Remove arquivo via API e atualiza a lista
        if (!confirm('Tem certeza que deseja remover este arquivo?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/audio.php?action=delete&id=${audioId}`, {
                method: 'GET'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Remover item da lista
                const fileItem = document.querySelector(`[data-id="${audioId}"].audio-file-item`);
                if (fileItem) {
                    fileItem.remove();
                }
                
                // Verificar se não há mais arquivos
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
    
    /**
     * formatFileSize(bytes) - Formata tamanho de arquivo
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado (ex: "1.5 MB", "500 KB")
     * 
     * Converte bytes para unidades KB, MB e GB
     * Usa base 1024 e mantém 2 casas decimais
     */

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Inicializa quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.audioUploadManager = new AudioUploadManager();
});
