// Temporizador

class MeditationTimer {
    constructor() {
        this.timeLeft = 15 * 60;
        this.originalTime = 15 * 60; // Armazena o tempo original selecionado pelo usuário
        this.isRunning = false;
        this.interval = null;
        this.sessionId = null;
        this.volume = 0.5;
        this.userAudio = null;
        this.audioContext = null;
        this.analyser = null;
        this.visualizerInterval = null;
        this.isAudioPaused = false;
        this.sessionStarted = false; // Flag para controlar se a sessão foi iniciada
        this.activeSessionUpdater = null; // Timer para atualizar sessões ativas
        
        // Estado de playlist do usuário
        this.userPlaylist = [];
        this.userPlaylistIndex = 0;
        this.selectedMusicType = 'none';
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
        this.initializeMusic();
        this.loadSavedColors();
        
        // Verificar autenticação e carregar histórico
        this.checkAuthAndLoadSessions();
    }
    
    initializeElements() {
        // Elementos principais
        this.minutesDisplay = document.getElementById('minutes');
        this.secondsDisplay = document.getElementById('seconds');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        
        // Elementos de áudio
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeDisplay = document.getElementById('volume-display');
        this.audioVisualizer = document.getElementById('audio-visualizer');
        this.visualizerBars = document.querySelectorAll('.visualizer-bar');
        
        // Elementos de cor
        this.color1Picker = document.getElementById('color1-picker');
        this.color2Picker = document.getElementById('color2-picker');
        this.applyColorsBtn = document.getElementById('apply-colors-btn');
        this.resetColorsBtn = document.getElementById('reset-colors-btn');
        
        // Debug: verificar se os elementos foram encontrados
        console.log('Elementos de cor encontrados:', {
            color1Picker: !!this.color1Picker,
            color2Picker: !!this.color2Picker,
            applyColorsBtn: !!this.applyColorsBtn,
            resetColorsBtn: !!this.resetColorsBtn
        });

        // Seleciona a música clicada (sem tocar ainda)
        const initialRadio = document.querySelector('input[name="background-music"]:checked');
        this.selectedMusicType = initialRadio ? initialRadio.value : 'none';
    }
    
    bindEvents() {
        // Botões principais
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        // Presets
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.time);
                this.setTime(minutes * 60);
            });
        });
        
        // Volume
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                this.volume = e.target.value / 100;
                this.volumeDisplay.textContent = e.target.value + '%';
                if (this.userAudio) this.userAudio.volume = this.volume;
            });
        }
        
        // Seleciona a música mas não toca se o timer estiver parado
        document.querySelectorAll('input[name="background-music"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!e.target.checked) return;
                this.selectedMusicType = e.target.value;
                if (this.isRunning) {
                    // Se o timer está rodando, trocar a música direto
                    this.startBackgroundMusic(this.selectedMusicType, true);
                } else {
                    // Timer parado = não toca nada
                    this.stopAllMusic();
                }
            });
        });
        
        // Controles de cor
        if (this.applyColorsBtn) {
            this.applyColorsBtn.addEventListener('click', () => this.applyCustomColors());
        }
        if (this.resetColorsBtn) {
            this.resetColorsBtn.addEventListener('click', () => this.resetColors());
        }
    }
    
    /**
     * setTime(seconds) - Define o tempo restante do timer
     * @param {number} seconds - Tempo em segundos
     * Atualiza o display assim que definir o novo tempo
     */

    setTime(seconds) {
        this.timeLeft = seconds;
        this.originalTime = seconds; // Armazena o tempo original quando o usuário seleciona
        this.updateDisplay();
    }
    
    /**
     * start() - Inicia o timer
     * - Marca o timer como rodando
     * - Faz uma contagem regressiva de 1 em 1 segundo
     * - Cria sessão no banco de dados se ainda não foi criada
     * - Inicia a música de fundo (se selecionada)
     * - Aplica animação de fundo
     */

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startBtn.style.display = 'none';
        this.pauseBtn.style.display = 'inline-block';
        
        // Aplica classe de meditação ativa
        document.body.classList.add('meditation-active');
        
        // Inicia sessão no banco de dados se ainda não foi iniciada
        if (!this.sessionStarted) {
            this.startSession();
            this.sessionStarted = true;
        } else if (this.sessionId) {
            // Se já existe sessão mas estava pausada, reativa como "em andamento"
            this.reactivateSession();
        }
        
        // Controla a música de fundo baseado no estado
        const selectedMusic = this.selectedMusicType && this.selectedMusicType !== 'none'
            ? { value: this.selectedMusicType }
            : null;
        
        if (selectedMusic && selectedMusic.value !== 'none') {
            // Se já existe música pausada, retoma a mesma música de onde parou 
            if (this.userAudio && this.userAudio.paused && this.isAudioPaused) {
                console.log('Retomando música existente');
                this.resumeBackgroundMusic();
            } else if (!this.userAudio) {
                // Se não existe música, inicia uma nova
                console.log('Iniciando nova música');
                this.startBackgroundMusic(selectedMusic.value, true);
            }
        }
        
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            
            if (this.timeLeft <= 0) {
                this.complete();
            }
        }, 1000);
        
        // Adiciona classe para animação de fundo
        document.body.classList.add('meditation-active');
    }
    
    /**
     * pause() - Pausa o timer
     * - Para a contagem regressiva
     * - Finaliza a sessão no banco de dados
     * - Pausa a música de fundo
     * - Remove a animação de fundo
     */

    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        this.startBtn.style.display = 'inline-block';
        this.pauseBtn.style.display = 'none';
        
        // Remover classe de meditação ativa
        document.body.classList.remove('meditation-active');
        
        // Não interrompe sessão ao pausar - apenas pausa o timer
        // Sessão continua como "em andamento" para poder ser retomada
        
        this.pauseBackgroundMusic();
        if (!this.isRunning) {
            if (this.userAudio && !this.userAudio.paused) {
                this.userAudio.pause();
            }
            if (this.backgroundMusic && this.backgroundMusic.stop) {
                this.backgroundMusic.stop();
            }
        }
        
        // Pausar música de fundo automaticamente quando timer pausa
        if (this.userAudio && !this.userAudio.paused) {
            this.userAudio.pause();
            this.isAudioPaused = true;
            this.stopVisualizer();
            console.log('Música pausada automaticamente com timer');
        }
        
        document.body.classList.remove('meditation-active');
    }
    
    /**
     * reset() - Reseta o timer para o valor padrão (15 minutos)
     * - Pausa o timer se estiver rodando
     * - Finaliza sessão no banco se existir
     * - Para a música
     * - Reseta todas as flags
     */

    reset() {
        this.pause();
        this.timeLeft = this.originalTime; // Usa o tempo original armazenado
        this.updateDisplay();
        
        // Finalizar sessão ativa se existir
        if (this.sessionId) {
            this.interruptSession();
        }
        
        // Limpar a música
        this.stopAllMusic();
        
        // Resetar flags de sessão
        this.sessionStarted = false;
        this.sessionId = null;
    }
    
    /**
     * stopAllMusic() - Para toda a música e limpa recursos de áudio
     * - Para arquivos de áudio
     * - Para sons sintéticos de fundo
     * - Para visualizador de áudio
     * - Remove controles de áudio da interface
     */

    stopAllMusic() {
        console.log('Parando toda a música...');
        
        // Forçar parada de todos os elementos de áudio na página
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        if (this.userAudio) {
            this.userAudio.pause();
            this.userAudio.currentTime = 0; // Volta ao início
            this.userAudio = null;
        }
        
        if (this.backgroundMusic) {
            if (this.backgroundMusic.stop) {
                this.backgroundMusic.stop();
            }
            this.backgroundMusic = null;
        }
        
        this.isAudioPaused = false;
        this.stopVisualizer();
        this.hideAudioControls();
        
        console.log('Toda a música parada e limpa');
    }
    
    /**
     * complete() - Finaliza a meditação quando o timer chega a zero
     * - Pausa o timer
     * - Para toda a música
     * - Finaliza a sessão no banco de dados
     * - Exibe alerta de conclusão
     */

    complete() {
        this.pause();
        this.stopAllMusic();
        
        // Finalizar sessão no banco de dados
        this.completeSession();
        
        // Resetar flags
        this.sessionStarted = false;
        
        alert('Meditação concluída!');
    }
    
    /**
     * updateDisplay() - Atualiza a exibição do timer no formato MM:SS
     * Converte segundos para minutos e segundos formatados
     */

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    }
    
    /**
     * initializeMusic() - Inicializa os controles de música
     * Define o volume inicial como 50% no display
     */

    initializeMusic() {
        if (this.volumeDisplay) {
            this.volumeDisplay.textContent = '50%';
        }
    }
    
    /**
     * startBackgroundMusic(type, force) - Inicia a música de fundo baseado na categoria
     * @param {string} type - Tipo de música
     * @param {boolean} force - Se true, inicia mesmo com timer parado (ex quando clica em iniciar)
     * 
     * Fluxo de busca de música:
     * 1. Tenta arquivos do usuário (upload)
     * 2. Tenta arquivos manuais (assets/audio/manual/)
     * 3. Fallback para som sintético
     */

    async startBackgroundMusic(type, force = false) {
        if (type === 'none') return;
        
        // Parar todas as músicas de "Seus Áudios" antes de iniciar música de fundo
        if (window.audioUploadManager) {
            window.audioUploadManager.stopAllAudioPlayers();
        }
        
        // Normalizar categorias para usar novos nomes
        const normalizeCategory = (t) => {
            if (!t) return t;
            // Se já é um nome novo, retornar como está
            if (['noite', 'calmaria', 'por do sol', 'custom', 'zen'].includes(t)) {
                return t;
            }
            // Retornar como está (sem conversão)
            return t;
        };
        const canonicalType = normalizeCategory(type);
        // Não iniciar música se o timer estiver parado, a menos que seja forçado pelo start()
        if (!force && !this.isRunning) {
            this.selectedMusicType = type;
            console.log('Timer parado, não iniciando música agora');
            return;
        }
        
        console.log(`Iniciando música de fundo para categoria: ${type} (canônica: ${canonicalType})`);
        
        // Verificar se já existe música tocando
        if (this.userAudio && !this.userAudio.paused) {
            console.log('Música já está tocando, pausando antes de iniciar nova');
            this.pauseBackgroundMusic();
        }
        
        try {
            // Tentar arquivo do usuário primeiro
            console.log('Buscando arquivos do usuário...');
            const userFiles = await this.getUserAudioFiles(canonicalType);
            if (userFiles.length > 0) {
                console.log(`Arquivos do usuário encontrados: ${userFiles.length}`);
                this.startUserPlaylist(userFiles, type);
                return;
            }
            
            // Tentar arquivo manual
            console.log('Buscando arquivos manuais...');
            const manualFile = await this.getManualAudioFile(type); // API já aceita aliases novos
            if (manualFile) {
                console.log(`Arquivo manual encontrado: ${manualFile}`);
                this.startManualAudio(manualFile);
                return;
            }
            
            // Fallback para som sintético
            if (type === 'zen') {
                console.log('Nenhum arquivo personalizado encontrado. Adicione seus arquivos de áudio na seção "Suas músicas"!');
                // Para zen, não usar som sintético, apenas mostrar mensagem
                this.showNoPersonalAudioMessage();
                return;
            }
            console.log('Usando som sintético como fallback');
            this.startSyntheticMusic(canonicalType);
            
        } catch (error) {
            console.error('Erro ao iniciar música:', error);
            this.startSyntheticMusic(canonicalType);
        }
    }
    
    /**
     * startUserPlaylist(files, category) - Inicia a playlist de arquivos do usuário
     * @param {Array} files - Array de objetos com informações dos arquivos de áudio
     * @param {string} category - Categoria da música (para contexto)
     * Monta a playlist e inicia a reprodução pela primeira faixa
     */
    startUserPlaylist(files, category) {
        // Montar playlist e iniciar pela primeira faixa
        this.userPlaylist = files;
        this.userPlaylistIndex = 0;
        console.log('🎼 Iniciando playlist do usuário:', this.userPlaylist.map(f => f.title || f.original_name));
        this.playCurrentUserTrack(category);
    }

    /**
     * playCurrentUserTrack(category) - Reproduz a faixa atual da playlist do usuário
     * @param {string} category - Categoria da música (para contexto)
     * Usa o índice atual da playlist para tocar a faixa correspondente
     */
    playCurrentUserTrack(category) {
        if (!this.userPlaylist || this.userPlaylist.length === 0) {
            console.log('Playlist vazia, abortando reprodução');
            return;
        }
        const current = this.userPlaylist[this.userPlaylistIndex];
        console.log(`Tocando faixa ${this.userPlaylistIndex + 1}/${this.userPlaylist.length}: ${current.title || current.original_name}`);
        this.startUserAudio(current, category);
    }

    /**
     * getUserAudioFiles(type) - Busca arquivos de áudio enviados pelo usuário
     * @param {string} type - Tipo/categoria dos arquivos a buscar (nature, ocean, rain, zen)
     * @returns {Array} Array de objetos com informações dos arquivos encontrados
     * 
     * Busca na API /api/audio.php?action=list e filtra por categoria.
     * Para tipo 'zen', retorna todos os arquivos ativos do usuário.
     */
    async getUserAudioFiles(type) {
        try {
            console.log(`Buscando arquivos do usuário para categoria: ${type}`);
            const response = await fetch(`/api/audio.php?action=list`, {
                credentials: 'same-origin'
            });
            const result = await response.json();
            console.log('Resultado da API de áudio:', result);
            
            if (result.success) {
                // Para categoria 'zen', buscar todos os arquivos do usuário (músicas personalizadas)
                if (type === 'zen') {
                    const isActive = (val) => {
                        // Normalizar valores possíveis vindos do backend
                        if (val === true) return true;
                        if (val === false) return false;
                        if (typeof val === 'number') return val === 1;
                        if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
                        return false;
                    };
                    const filteredFiles = result.files.filter(file => isActive(file.is_active));
                    // Fallback: se nenhum ativo encontrado mas existem arquivos, retornar todos
                    if (filteredFiles.length === 0 && result.files.length > 0) {
                        console.log('Nenhum arquivo marcado como ativo; usando todos os arquivos do usuário como fallback');
                        return result.files;
                    }
                    console.log(`Arquivos personalizados encontrados:`, filteredFiles);
                    return filteredFiles;
                }
                // Normalizar categorias salvas para comparar
                const normalizeType = (t) => {
                    if (!t) return t;
                    if (['noite', 'calmaria', 'por do sol', 'custom', 'zen'].includes(t)) {
                        return t;
                    }
                    return t;
                };
                const normalizedType = normalizeType(type);
                return result.files.filter(file => normalizeForComparison(file.category) === normalizedType);
            } else {
                console.error('API retornou erro:', result);
            }
        } catch (error) {
            console.error('Erro ao buscar arquivos do usuário:', error);
        }
        return [];
    }
    
    /**
     * getManualAudioFile(type) - Busca arquivo de áudio manual na pasta assets/audio/manual/
     * @param {string} type - Tipo/categoria (noite, calmaria, pordosol)
     * @returns {string|null} Caminho do arquivo encontrado ou null se não encontrado
     * 
     * Primeiro tenta buscar via API /api/manual-audio.php
     * Se falhar, tenta busca direta com nomes comuns
     */
    async getManualAudioFile(type) {
        console.log(`Buscando arquivo manual para categoria: ${type}`);
        
        // Primeiro, tentar buscar lista de arquivos via API
        try {
            const apiUrl = `/api/manual-audio.php?category=${encodeURIComponent(type)}`;
            console.log(`Chamando API: ${apiUrl}`);
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                console.warn(`API retornou status ${response.status}: ${response.statusText}`);
                throw new Error(`API retornou status ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Resultado da API:`, result);
            
            if (result.success && result.files && result.files.length > 0) {
                // Priorizar arquivos MP4 e MP3
                const mp4Files = result.files.filter(file => file.extension === 'mp4');
                const mp3Files = result.files.filter(file => file.extension === 'mp3');
                const otherFiles = result.files.filter(file => !['mp4', 'mp3'].includes(file.extension));
                
                const selectedFile = mp4Files[0] || mp3Files[0] || otherFiles[0];
                if (selectedFile) {
                    console.log(`Arquivo manual encontrado via API: ${selectedFile.path}`);
                    return selectedFile.path;
                } else {
                    console.warn(`Nenhum arquivo adequado encontrado na lista da API`);
                }
            } else {
                console.warn(`API retornou sucesso=false ou nenhum arquivo:`, result);
            }
        } catch (error) {
            console.error(`Erro ao chamar API de arquivos manuais:`, error);
            console.log('Continuando com busca direta...');
        }
        
        // Fallback: tentar nomes comuns
        const audioExtensions = ['mp4', 'mp3', 'wav', 'ogg', 'm4a']; // MP4 primeiro
        const commonNames = ['audio', 'music', 'sound', 'noite', 'calmaria', 'zen']; // Apenas nomes atuais
        
        // Mapeamento de type para pasta correta
        const folderMapping = {
            'noite': 'Noite',
            'calmaria': 'Calmaria',
            'por do sol': 'Por do Sol'
        };
        const folder = folderMapping[type] || type;
        
        for (const name of commonNames) {
            for (const ext of audioExtensions) {
                const filePath = `/assets/audio/manual/${folder}/${name}.${ext}`;
                try {
                    const response = await fetch(filePath, { method: 'HEAD' });
                    if (response.ok) {
                        console.log(`Arquivo manual encontrado via busca direta: ${filePath}`);
                        return filePath;
            }
        } catch (error) {
                    // Continuar tentando
                }
            }
        }
        
        console.log(`Nenhum arquivo manual encontrado para categoria: ${type}`);
        return null;
    }
    
    /**
     * startUserAudio(audioFile, categoryFromContext) - Reproduz arquivo de áudio do usuário
     * @param {Object} audioFile - Objeto com informações do arquivo (id, title, etc)
     * @param {string} categoryFromContext - Categoria da música
     * 
     * Configura visualizador de áudio quando o arquivo estiver pronto
     * Avança para próxima música quando terminar (faz playlist).
     */

    startUserAudio(audioFile, categoryFromContext) {
        // Detectar Edge para configurações específicas
        const isEdge = /Edg/.test(navigator.userAgent);
        
        this.userAudio = new Audio(`/api/audio.php?action=get&id=${audioFile.id}`);
        this.userAudio.volume = this.volume;
        // Desabilitar loop para permitir avançar para a próxima faixa
        this.userAudio.loop = false;
        this.userAudio.preload = 'auto';
        
        // Configurações específicas para Edge
        if (isEdge) {
            this.userAudio.crossOrigin = 'anonymous';
            this.userAudio.controls = false;
        }
        
        this.userAudio.addEventListener('loadeddata', () => {
            console.log('Arquivo do usuário carregado');
            
            // Para Edge, tentar reproduzir após um pequeno delay
            if (isEdge) {
                setTimeout(() => {
                    if (!this.isRunning) {
                        console.log('Timer parado, não reproduzindo (Edge)');
                        return;
                    }
                    this.userAudio.play().then(() => {
                        console.log('Arquivo do usuário reproduzindo no Edge');
                    }).catch(error => {
                        console.error('Erro ao reproduzir no Edge:', error);
                        this.startSyntheticMusic(audioFile.category);
                    });
                }, 100);
            } else {
                if (!this.isRunning) {
                    console.log('Timer parado, não reproduzindo');
                    return;
                }
                this.userAudio.play().then(() => {
                    console.log('Arquivo do usuário reproduzindo');
                }).catch(error => {
                    console.error('Erro ao reproduzir arquivo do usuário:', error);
                    // Em caso de erro, tentar avançar para próxima faixa se existir
                    if (this.userPlaylist && this.userPlaylist.length > 1) {
                        this.advanceToNextTrack(categoryFromContext || audioFile.category);
                    } else {
                        this.startSyntheticMusic(categoryFromContext || audioFile.category);
                    }
                });
            }
        });
        
        this.userAudio.addEventListener('error', (e) => {
            console.error('Erro ao carregar arquivo do usuário:', e);
            if (this.userPlaylist && this.userPlaylist.length > 1) {
                this.advanceToNextTrack(categoryFromContext || audioFile.category);
            } else {
                this.startSyntheticMusic(categoryFromContext || audioFile.category);
            }
        });
        
        this.userAudio.addEventListener('canplaythrough', () => {
            console.log('Arquivo do usuário pronto para reprodução');
            this.setupAudioVisualizer();
            this.showAudioControls();
        });
        
        this.userAudio.addEventListener('play', () => {
            console.log('Arquivo do usuário iniciado');
            this.isAudioPaused = false;
        });
        
        this.userAudio.addEventListener('pause', () => {
            console.log('Arquivo do usuário pausado');
            this.isAudioPaused = true;
            this.stopVisualizer();
        });
        
        this.userAudio.addEventListener('ended', () => {
            console.log('Arquivo do usuário terminou');
            this.stopVisualizer();
            // Avançar automaticamente para a próxima faixa se houver playlist
            if (this.userPlaylist && this.userPlaylist.length > 0) {
                this.advanceToNextTrack(categoryFromContext || audioFile.category);
            }
        });
        
        this.userAudio.load();
    }

    advanceToNextTrack(category) {
        if (!this.userPlaylist || this.userPlaylist.length === 0) return;
        this.userPlaylistIndex = (this.userPlaylistIndex + 1) % this.userPlaylist.length;
        console.log(`Avançando para faixa ${this.userPlaylistIndex + 1}/${this.userPlaylist.length}`);
        this.playCurrentUserTrack(category);
    }
    
    /**
     * startManualAudio(filePath) - Inicia reprodução da música
     * @param {string} filePath - Caminho do arquivo (na pasta assets/audio/manual/)
     * 
     * Verifica se o arquivo existe antes de carregar
     * Codifica o caminho para lidar com caracteres especiais
     * Se arquivo não for encontrado, usa som sintético
     */

    startManualAudio(filePath) {
        console.log(`Iniciando arquivo manual: ${filePath}`);
        
        // Codificar o caminho para verificação
        const urlParts = filePath.split('/');
        const fileName = urlParts.pop();
        const basePath = urlParts.join('/');
        const encodedFileName = encodeURIComponent(fileName);
        const encodedPath = basePath + '/' + encodedFileName;
        
        // Verificar se o arquivo existe primeiro
        fetch(encodedPath, { method: 'HEAD' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Arquivo não encontrado: ${encodedPath} (Status: ${response.status})`);
                }
                console.log(`Arquivo manual verificado: ${encodedPath}`);
                this.loadManualAudio(filePath); // Passar caminho original para loadManualAudio que faz a codificação
            })
            .catch(error => {
                console.error(`Erro ao verificar arquivo manual: ${encodedPath}`, error);
                console.log('Tentando som sintético...');
                this.startSyntheticMusic('noite');
            });
    }
    
    /**
     * loadManualAudio(filePath) - Carrega e reproduz a música
     * @param {string} filePath - Caminho do arquivo a ser carregado
     * 
     * Cria o elemento Audio, codifica o caminho para caracteres especiais,
     * configura eventos (loadeddata, error, play, pause, ended),
     * configura visualizador e inicia reprodução.
     * Tem timeout de 10 segundos para evitar travamentos.
     */

    loadManualAudio(filePath) {
        console.log(`Carregando arquivo manual: ${filePath}`);
        
        // Detectar Edge para configurações específicas
        const isEdge = /Edg/.test(navigator.userAgent);
        
        // Codifica o caminho para lidar com caracteres especiais (parênteses, espaços, etc)
        // Separa base path e nome do arquivo para codificar apenas o nome
        const urlParts = filePath.split('/');
        const fileName = urlParts.pop();
        const basePath = urlParts.join('/');
        const encodedFileName = encodeURIComponent(fileName);
        const encodedPath = basePath + '/' + encodedFileName;
        
        console.log(`🔗 Caminho original: ${filePath}`);
        console.log(`🔗 Caminho codificado: ${encodedPath}`);
        
        this.userAudio = new Audio(encodedPath);
        this.userAudio.volume = this.volume;
        this.userAudio.loop = true;
        this.userAudio.preload = 'auto';
        
        // Configurações específicas para o Edge
        if (isEdge) {
            this.userAudio.crossOrigin = 'anonymous';
            this.userAudio.controls = false;
        }
        
        // Timeout para evitar travamentos
        const timeout = setTimeout(() => {
            console.error(`Timeout ao carregar arquivo manual: ${filePath}`);
            this.startSyntheticMusic('nature');
        }, 10000);
        
        this.userAudio.addEventListener('loadstart', () => {
            console.log(`Iniciando carregamento: ${filePath}`);
        });
        
        this.userAudio.addEventListener('loadeddata', () => {
            clearTimeout(timeout);
            console.log(`Arquivo manual carregado: ${filePath}`);
            
            // Para Edge, tentar reproduzir após um pequeno delay
            if (isEdge) {
                setTimeout(() => {
                    this.userAudio.play().then(() => {
                        console.log(`Arquivo manual reproduzindo no Edge: ${filePath}`);
                    }).catch(error => {
                        console.error(`Erro ao reproduzir no Edge: ${filePath}`, error);
                        this.startSyntheticMusic('noite');
                    });
                }, 100);
            } else {
                this.userAudio.play().then(() => {
                    console.log(`Arquivo manual reproduzindo: ${filePath}`);
                }).catch(error => {
                    console.error(`Erro ao reproduzir arquivo manual: ${filePath}`, error);
                    this.startSyntheticMusic('noite');
                });
            }
        });
        
        this.userAudio.addEventListener('error', (e) => {
            clearTimeout(timeout);
            console.error(`Erro ao carregar arquivo manual: ${filePath}`, e);
            console.log('Tentando som sintético como fallback...');
            this.startSyntheticMusic('nature');
        });
        
        this.userAudio.addEventListener('canplaythrough', () => {
            console.log(`Arquivo manual pronto para reprodução: ${filePath}`);
            this.setupAudioVisualizer();
            this.showAudioControls();
        });
        
        this.userAudio.addEventListener('play', () => {
            console.log(`Arquivo manual iniciado: ${filePath}`);
            this.isAudioPaused = false;
        });
        
        this.userAudio.addEventListener('pause', () => {
            console.log(`Arquivo manual pausado: ${filePath}`);
            this.isAudioPaused = true;
            this.stopVisualizer();
        });
        
        this.userAudio.addEventListener('ended', () => {
            console.log(`Arquivo manual terminou: ${filePath}`);
            this.stopVisualizer();
        });
        
        this.userAudio.addEventListener('stop', () => {
            console.log(`Arquivo manual parado: ${filePath}`);
            this.stopVisualizer();
        });
        
        this.userAudio.addEventListener('canplay', () => {
            console.log(`Arquivo pode ser reproduzido: ${filePath}`);
        });
        
        this.userAudio.load();
    }
    
    /**
     * startSyntheticMusic(type) - Inicia som sintético
     * @param {string} type - Tipo de som
     * 
     * Cria osciladores e moduladores para gerar sons de fundo sintéticos.
     * Usado como fallback quando não há arquivos de áudio disponíveis.
     * Configura visualizador e controles de áudio.
     */

    startSyntheticMusic(type) {
        console.log(`Iniciando som sintético para: ${type}`);
        this.pauseBackgroundMusic();
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.backgroundMusic = this.createSyntheticSound(type);
            this.backgroundMusic.volume = this.volume;
            this.backgroundMusic.start();
            
            console.log('Som sintético iniciado');
            this.setupAudioVisualizer();
            this.showAudioControls();
        } catch (error) {
            console.error('Erro ao criar som sintético:', error);
        }
    }
    
    /**
     * createSyntheticSound(type) - Cria som sintético
     * @param {string} type - Tipo de som
     * @returns {Object} Objeto com osciladores e inicia/para o som
     * 
     * Cria múltiplos osciladores com frequências e tipos diferentes
     * Adiciona modulação LFO para variação natural.
     * Retorna objeto controlável para iniciar/parar o som
     */

    createSyntheticSound(type) {
        console.log(`Criando som sintético para categoria: ${type}`);
        
        // Cria múltiplos osciladores para som mais rico
        const oscillators = [];
        const gainNodes = [];
        
        // Configura frequências e tipos baseado no tipo
        const soundConfig = {
            'noite': [
                { freq: 220, type: 'sine', gain: 0.05 },
                { freq: 330, type: 'sine', gain: 0.03 },
                { freq: 440, type: 'sine', gain: 0.02 }
            ],
            'por do sol': [
                { freq: 200, type: 'sawtooth', gain: 0.04 },
                { freq: 300, type: 'sawtooth', gain: 0.03 },
                { freq: 400, type: 'sawtooth', gain: 0.02 }
            ],
            'calmaria': [
                { freq: 180, type: 'triangle', gain: 0.06 },
                { freq: 270, type: 'triangle', gain: 0.04 },
                { freq: 360, type: 'triangle', gain: 0.03 }
            ],
            'zen': [
                { freq: 110, type: 'sine', gain: 0.03 },
                { freq: 220, type: 'sine', gain: 0.02 },
                { freq: 330, type: 'sine', gain: 0.01 }
            ]
        };
        
        const configs = soundConfig[type] || soundConfig['noite'];
        console.log(`🎼 Configuração de som para ${type}:`, configs);
        
        // Cria osciladores
        configs.forEach((config, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(config.freq, this.audioContext.currentTime);
            oscillator.type = config.type;
            gainNode.gain.setValueAtTime(config.gain, this.audioContext.currentTime);
            
            // Adiciona modulação suave
            const modulationFreq = config.freq * 0.1;
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            lfo.frequency.setValueAtTime(modulationFreq, this.audioContext.currentTime);
            lfo.type = 'sine';
            lfoGain.gain.setValueAtTime(5, this.audioContext.currentTime);
            
            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);
            
            oscillators.push(oscillator);
            gainNodes.push(gainNode);
        });
        
        // Cria objeto que controla todos os osciladores
        const soundGroup = {
            oscillators: oscillators,
            gainNodes: gainNodes,
            start: function() {
                this.oscillators.forEach(osc => osc.start());
            },
            stop: function() {
                this.oscillators.forEach(osc => {
                    try {
                        osc.stop();
                    } catch (e) {
                        // Oscilador já parado
                    }
                });
            }
        };
        
        console.log(`Som sintético criado para ${type} com ${oscillators.length} osciladores`);
        
        return soundGroup;
    }
    
    /**
     * setupAudioVisualizer() - Configura visualizador de áudio
     * - Cria analisador de frequência (AnalyserNode)
     * - Conecta fonte de áudio ao analisador
     * - Configura FFT size e smoothing
     * - Se falhar, usa visualizador simulado
     */

    setupAudioVisualizer() {
        if (!this.audioContext || !this.userAudio) {
            console.log('AudioContext ou userAudio não disponível para visualizador');
            return;
        }
        
        // Detecta browser para compatibilidade
        const isEdge = /Edg/.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent);
        
        console.log(`Configurando visualizador de áudio... (Browser: ${isEdge ? 'Edge' : isChrome ? 'Chrome' : 'Other'})`);
        
        try {
            // Cria analisador com configurações otimizadas
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256; // Maior precisão para detectar batidas
            this.analyser.smoothingTimeConstant = 0.3; // Menos suavização para detectar batidas
            this.analyser.minDecibels = -90;
            this.analyser.maxDecibels = -10;
            
            // Conecta áudio ao analisador
            const source = this.audioContext.createMediaElementSource(this.userAudio);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            // Prepara array de dados
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            console.log('Visualizador configurado com sucesso');
            this.startVisualizer();
        } catch (error) {
            console.error('Erro ao configurar visualizador:', error);
            console.log('Usando visualizador simulado...');
            this.startSimulatedVisualizer();
        }
    }
    
    /**
     * startVisualizer() - Inicia loop de atualização do visualizador de áudio
     * - Executa a cada 50ms para atualização
     * - Obtém dados de frequência do analisador
     * - Atualiza altura e cores das barras
     * - Tem timeout de segurança para evitar loops infinitos
     * - Para se o áudio pausar ou terminar
     */

    startVisualizer() {
        console.log('Iniciando visualizador de áudio...');
        
        // Para qualquer visualizador existente
        this.stopVisualizer();
        
        // Verifica se áudio está realmente tocando
        if (!this.userAudio || this.userAudio.paused || this.userAudio.ended) {
            console.log('Áudio não está tocando, não iniciando visualizador');
            return;
        }
        
        // Verifica se analisador existe
        if (!this.analyser) {
            console.log('Analisador não disponível, não iniciando visualizador');
            return;
        }
        
        // Inicia loop com dados reais (50ms de intervalo)
        this._startVisualizerLoop(50, 100, () => {
            // Verificar se analyser ainda existe
            if (!this.analyser) {
                this.stopVisualizer();
                return;
            }
            // Obter dados de frequência
            this.analyser.getByteFrequencyData(this.dataArray);
            // Atualizar barras do visualizador
            this.updateVisualizerBars();
        }, 'Visualizador', true);
        
        console.log('Visualizador iniciado');
    }
    
    /**
     * startSimulatedVisualizer() - Inicia visualizador simulado
     * - Simula movimento das barras usando funções matemáticas
     * - Executa a cada 150ms
     * - Tem timeout de segurança para evitar loops infinitos
     */

    startSimulatedVisualizer() {
        console.log('Iniciando visualizador simulado...');
        
        // Para qualquer visualizador existente
        this.stopVisualizer();
        
        // Verifica se áudio está realmente tocando
        if (!this.userAudio || this.userAudio.paused || this.userAudio.ended) {
            console.log('Áudio não está tocando, não iniciando visualizador simulado');
            return;
        }
        
        // Inicia loop simulado (150ms de intervalo)
        this._startVisualizerLoop(150, 50, () => {
            this.updateSimulatedVisualizer();
        }, 'Visualizador simulado');
        
        console.log('Visualizador simulado iniciado');
    }
    
    /**
     * _startVisualizerLoop() - Loop interno
     * @param {number} interval - Intervalo em ms
     * @param {number} maxTimeouts - Número máximo de iterações
     * @param {Function} updateFn - Função de atualização a ser chamada
     * @param {string} name - Nome do visualizador para logs
     * @param {boolean} requireAnalyser - Se true, verifica se analyser existe
     */

    _startVisualizerLoop(interval, maxTimeouts, updateFn, name, requireAnalyser = false) {
        let timeoutCount = 0;
        
        this.visualizerInterval = setInterval(() => {
            // Verificação rigorosa do estado do áudio
            const audioOk = this.userAudio && !this.userAudio.paused && !this.userAudio.ended;
            const analyserOk = !requireAnalyser || this.analyser;
            
            if (audioOk && analyserOk) {
                try {
                    timeoutCount++;
                    
                    // Parar se exceder limite de segurança
                    if (timeoutCount > maxTimeouts) {
                        console.warn(`${name} parado por segurança (timeout)`);
                        this.stopVisualizer();
                        return;
                    }
                    
                    // Executar função de atualização
                    updateFn();
                } catch (error) {
                    console.error(`Erro no ${name.toLowerCase()}:`, error);
                    this.stopVisualizer();
                }
            } else {
                // Se áudio parou, pausou ou terminou, para visualizador
                console.log(`Áudio parou/pausou, parando ${name.toLowerCase()}...`);
                this.stopVisualizer();
            }
        }, interval);
    }
    
    /**
     * updateVisualizerBars() - Atualiza altura e cores das barras do visualizador
     * - Divide frequências baixas-altas para variedade de cores
     * - Calcula altura baseada em dados reais de frequência
     * - Aplica cores baseadas na intensidade
     * - Usa transições suaves para movimento natural
     */

    updateVisualizerBars() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            console.log('Barras do visualizador não encontradas');
            return;
        }
        
        // Calcular intensidade geral do áudio
        let totalIntensity = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            totalIntensity += this.dataArray[i];
        }
        const averageIntensity = totalIntensity / this.dataArray.length;
        
        this.visualizerBars.forEach((bar, index) => {
            // Usar dados de frequência reais com diferentes faixas
            let frequency = 0;
            
            // Dividir frequências em faixas para diferentes barras
            if (index < this.visualizerBars.length / 3) {
                // Baixas frequências (bass) - barras da esquerda
                frequency = this.dataArray[Math.floor(index * 2)] || 0;
            } else if (index < (this.visualizerBars.length * 2) / 3) {
                // Médias frequências (mid) - barras do meio
                frequency = this.dataArray[Math.floor(index * 1.5) + 8] || 0;
            } else {
                // Altas frequências (treble) - barras da direita
                frequency = this.dataArray[Math.floor(index * 1.2) + 16] || 0;
            }
            
            // Calcular altura baseada na frequência real
            const normalizedFreq = frequency / 255;
            const baseHeight = Math.max(4, normalizedFreq * 80 + 4);
            
            // Adicionar variação baseada na intensidade geral
            const intensityMultiplier = 1 + (averageIntensity / 255) * 0.3;
            const height = Math.min(100, baseHeight * intensityMultiplier);
            
            // Aplicar transição suave para movimento natural
            bar.style.transition = 'height 0.1s ease-out, background-color 0.1s ease-out';
            bar.style.height = height + 'px';
            
            // Cores baseadas na frequência
            const intensity = normalizedFreq;
            let hue;
            if (index < this.visualizerBars.length / 3) {
                // Baixas frequências (vermelho/laranja)
                hue = (intensity * 60) + 0;
            } else if (index < (this.visualizerBars.length * 2) / 3) {
                // Médias frequências (amarelo/verde)
                hue = (intensity * 60) + 60;
            } else {
                // Altas frequências (azul/roxo)
                hue = (intensity * 60) + 180;
            }
            
            const saturation = 70 + (intensity * 30); // 70-100%
            const lightness = 60 + (intensity * 20);   // 60-80%
            bar.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        });
    }
    
    /**
     * updateSimulatedVisualizer() - Atualiza barras do visualizador simulado
     * - Usa funções seno e cosseno para simular movimento
     * - Adiciona variação aleatória para naturalidade
     * - Aplica cores baseadas em tempo e índice
     */

    updateSimulatedVisualizer() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            return;
        }
        
        this.visualizerBars.forEach((bar, index) => {
            // Simular movimento baseado em padrão mais realista
            const time = Date.now() * 0.001;
            const frequency = 0.5 + (index * 0.1);
            const amplitude = 30 + Math.sin(time * frequency) * 20;
            const randomVariation = Math.random() * 10;
            const height = Math.max(4, amplitude + randomVariation);
            
            bar.style.transition = 'height 0.1s ease-out';
            bar.style.height = height + 'px';
            
            // Adicionar cores
            const hue = (index * 30 + time * 50) % 360;
            bar.style.backgroundColor = `hsl(${hue}, 70%, 60%)`;
        });
    }
    
    /**
     * stopVisualizer() - Para o visualizador e limpa recursos
     * - Para o intervalo de atualização
     * - Reseta todas as barras para altura mínima
     * - Limpa dados de frequência e analisador
     */

    stopVisualizer() {
        console.log('Parando visualizador...');
        
        // Parar intervalo
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
            this.visualizerInterval = null;
        }
        
        // Reduzir todas as barras para altura mínima
        this.resetVisualizerBars();
        
        // Limpar dados de frequência
        if (this.dataArray) {
            this.dataArray.fill(0);
        }
        
        // Limpar analisador
        if (this.analyser) {
            this.analyser = null;
        }
        
        console.log('Visualizador parado');
    }
    
    /**
     * resetVisualizerBars() - Reseta todas as barras do visualizador
     * - Define altura mínima (4px) imediatamente
     * - Remove transições para reset instantâneo
     * - Define cor padrão azul
     * - Força reflow para aplicar mudanças imediatamente
     */

    resetVisualizerBars() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            return;
        }
        
        this.visualizerBars.forEach((bar, index) => {
            // Parar animação imediatamente
            bar.style.transition = 'none';
            bar.style.height = '4px';
            bar.style.backgroundColor = '#4a90e2'; // Cor padrão azul
            
            // Forçar reflow para aplicar mudanças imediatamente
            bar.offsetHeight;
        });
    }
    
    /**
     * fadeVisualizerBars() - Reduz altura das barras gradualmente
     * - Usado quando pausando o áudio
     * - Reduz altura em 20% a cada chamada
     * - Mantém altura mínima de 4px
     * - Usa transição suave para efeito visual
     */

    fadeVisualizerBars() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            return;
        }
        
        this.visualizerBars.forEach((bar, index) => {
            // Reduzir altura gradualmente quando pausado
            const currentHeight = parseInt(bar.style.height) || 50;
            const newHeight = Math.max(4, currentHeight * 0.8);
            
            bar.style.transition = 'height 0.3s ease-out';
            bar.style.height = newHeight + 'px';
        });
    }
    
    
    /**
     * showAudioControls() - Exibe os controles de áudio (visualizador)
     * Mostra o elemento do visualizador na interface
     */

    showAudioControls() {
        if (this.audioVisualizer) {
            this.audioVisualizer.style.display = 'block';
        }
    }
    
    /**
     * hideAudioControls() - Esconde os controles de áudio (visualizador)
     * Oculta o elemento do visualizador da interface
     */

    hideAudioControls() {
        if (this.audioVisualizer) {
            this.audioVisualizer.style.display = 'none';
        }
    }
    
    
    /**
     * pauseBackgroundMusic() - Pausa a música de fundo
     * - Pausa arquivo de áudio do usuário se existir
     * - Para sons sintéticos se estiverem tocando
     * - Esconde controles de áudio
     * - Para o visualizador completamente
     */

    pauseBackgroundMusic() {
        console.log('Pausando música de fundo...');
        
        if (this.userAudio) {
            this.userAudio.pause();
            this.isAudioPaused = true;
            this.hideAudioControls();
        }
        
        if (this.backgroundMusic) {
            if (this.backgroundMusic.stop) {
                this.backgroundMusic.stop();
            }
            this.backgroundMusic = null;
        }
        
        // Parar visualizador completamente
        this.stopVisualizer();
        
        console.log('Música de fundo pausada');
    }
    
    /**
     * resumeBackgroundMusic() - Retoma a música de fundo pausada
     * - Retoma reprodução do arquivo de áudio
     * - Configura visualizador
     */

    resumeBackgroundMusic() {
        console.log('Retomando música de fundo...');
        
        if (this.userAudio && this.userAudio.paused) {
            const isEdge = /Edg/.test(navigator.userAgent);
            
            if (isEdge) {
                setTimeout(() => {
                    this.userAudio.play().then(() => {
                        console.log('Música retomada no Edge');
                        this.isAudioPaused = false;
                        this.setupAudioVisualizer();
                    }).catch(error => {
                        console.error('Erro ao retomar música no Edge:', error);
                    });
                }, 100);
            } else {
                this.userAudio.play().then(() => {
                    console.log('Música retomada');
                    this.isAudioPaused = false;
                    this.setupAudioVisualizer();
                }).catch(error => {
                    console.error('Erro ao retomar música:', error);
                });
            }
        }
    }
    
    /**
     * applyCustomColors() - Aplica cores personalizadas ao fundo
     * - Obtém cores dos seletores
     * - Aplica gradiente linear ao body
     * - Define variáveis CSS para consistência
     * - Salva cores no localStorage para persistência
     */

    applyCustomColors() {
        const color1 = this.color1Picker.value;
        const color2 = this.color2Picker.value;
        
        console.log('=== APLICANDO CORES PERSONALIZADAS ===');
        console.log('Cores selecionadas:', color1, '→', color2);
        
        // Verificar se os elementos existem
        if (!this.color1Picker || !this.color2Picker) {
            console.error('Seletores de cor não encontrados!');
            return;
        }
        
        // Aplicar gradiente diretamente
        const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        document.body.style.background = gradient;
        document.body.style.backgroundSize = '200% 200%';
        document.body.style.animation = 'gradientMove 16s ease-in-out infinite';
        
        // Definir variáveis CSS para consistência
        document.documentElement.style.setProperty('--color1', color1);
        document.documentElement.style.setProperty('--color2', color2);
        
        // Adicionar classe para indicar cores personalizadas
        document.body.classList.add('custom-colors');
        
        console.log('Gradiente aplicado:', gradient);
        
        // Salvar cores no localStorage
        localStorage.setItem('customColor1', color1);
        localStorage.setItem('customColor2', color2);
        
        console.log('Cores aplicadas ao gradiente linear com sucesso!');
    }
    
    // Resetar cores para padrão
    /**
     * resetColors() - Reseta cores para valores padrão
     * - Remove cores personalizadas
     * - Restaura cores padrão do gradiente (#667eea → #764ba2)
     * - Remove dados do localStorage
     * - Atualiza seletores e variáveis CSS
     */

    resetColors() {
        console.log('Resetando cores para padrão do gradiente linear');
        
        // Cores padrão do gradiente linear
        const defaultColor1 = '#667eea';
        const defaultColor2 = '#764ba2';
        
        // Atualizar seletores
        this.color1Picker.value = defaultColor1;
        this.color2Picker.value = defaultColor2;
        
        // Remover classe custom-colors
        document.body.classList.remove('custom-colors');
        
        // Aplicar cores padrão via variáveis CSS
        document.documentElement.style.setProperty('--color1', defaultColor1);
        document.documentElement.style.setProperty('--color2', defaultColor2);
        
        // Limpar localStorage
        localStorage.removeItem('customColor1');
        localStorage.removeItem('customColor2');
        
        console.log('Cores resetadas para padrão do gradiente linear!');
    }
    
    /**
     * loadSavedColors() - Carrega cores personalizadas salvas
     * - Busca cores no localStorage
     * - Aplica cores se encontradas, senão usa padrão
     * - Atualiza seletores e variáveis CSS
     * - Adiciona classe custom-colors se aplicável
     */

    loadSavedColors() {
        const savedColor1 = localStorage.getItem('customColor1');
        const savedColor2 = localStorage.getItem('customColor2');
        
        console.log('📁 Verificando cores salvas:', { savedColor1, savedColor2 });
        
        let color1, color2;
        
        if (savedColor1 && savedColor2) {
            console.log('📁 Carregando cores personalizadas para gradiente linear:', savedColor1, '→', savedColor2);
            color1 = savedColor1;
            color2 = savedColor2;
            
            // Atualizar seletores
            this.color1Picker.value = savedColor1;
            this.color2Picker.value = savedColor2;
            
            // Adicionar classe para cores personalizadas
            document.body.classList.add('custom-colors');
        } else {
            console.log('📁 Nenhuma cor salva encontrada, aplicando cores padrão');
            color1 = '#667eea';
            color2 = '#764ba2';
            
            // Remover classe custom-colors se existir
            document.body.classList.remove('custom-colors');
        }
        
        // Aplicar cores via variáveis CSS
        document.documentElement.style.setProperty('--color1', color1);
        document.documentElement.style.setProperty('--color2', color2);
        
        // Forçar reflow
        document.body.offsetHeight;
        
        // Verificar o background final
        setTimeout(() => {
            const finalBackground = getComputedStyle(document.body).getPropertyValue('background');
            console.log('Background final após carregamento:', finalBackground);
        }, 100);
    }
    
    /**
     * startSession() - Inicia uma nova sessão de meditação no banco de dados
     * - Cria registro de sessão via API /api/sessions.php
     * - Armazena session_id para finalização posterior
     * - Usa timezone de Brasília
     * - Recarrega página se usuário não estiver autenticado
     */

    async startSession() {
        console.log('🚀 Iniciando nova sessão...');
        
        try {
            const duration = Math.floor(this.timeLeft / 60); // Duração em minutos
            const now = new Date();
            
            // Converter para timezone de Brasília (UTC-3)
            const brasiliaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const brasiliaISO = brasiliaTime.toISOString();
            
            console.log('Dados da sessão:', {
                duration: duration,
                timeLeft: this.timeLeft,
                timestamp: brasiliaISO,
                localTime: now.toLocaleString('pt-BR'),
                brasiliaTime: brasiliaTime.toLocaleString('pt-BR')
            });
            
            const response = await fetch('/api/sessions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'start',
                    duration: duration,
                    start_time: brasiliaISO
                })
            });
            
            console.log('Resposta da API:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('Resultado:', result);
            
            if (result.success) {
                this.sessionId = result.session_id;
                console.log('Sessão iniciada com sucesso! ID:', result.session_id);
                console.log('Horário de início:', result.start_time);
            } else {
                console.error('Erro ao iniciar sessão:', result.error);
                if (result.error && result.error.includes('Não autorizado')) {
                    console.log('Usuário não autenticado, recarregando página...');
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Erro de conexão ao iniciar sessão:', error);
        }
    }
    
    /**
     * completeSession() - Finaliza a sessão de meditação no banco de dados
     * - Envia end_time via API /api/sessions.php
     * - Usa timezone de Brasília
     * - Recarrega histórico de sessões após finalização
     * - Limpa sessionId após sucesso
     */

    async completeSession() {
        if (!this.sessionId) {
            console.log('Nenhuma sessão ativa para finalizar');
            return;
        }
        
        console.log('Finalizando sessão...');
        
        try {
            const now = new Date();
            
            // Converter para timezone de Brasília (UTC-3)
            const brasiliaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const brasiliaISO = brasiliaTime.toISOString();
            
            console.log('Dados da finalização:', {
                sessionId: this.sessionId,
                timestamp: brasiliaISO,
                localTime: now.toLocaleString('pt-BR'),
                brasiliaTime: brasiliaTime.toLocaleString('pt-BR')
            });
            
            const response = await fetch('/api/sessions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'complete',
                    session_id: this.sessionId,
                    end_time: brasiliaISO
                })
            });
            
            console.log('Resposta da API:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('Resultado:', result);
            
            if (result.success) {
                console.log('Sessão finalizada com sucesso!');
                console.log('Horário de fim:', result.end_time);
                this.sessionId = null;
                
                // Recarregar histórico de sessões
                setTimeout(() => {
                    this.loadSessions();
                }, 1000);
            } else {
                console.error('Erro ao finalizar sessão:', result.error);
            }
        } catch (error) {
            console.error('Erro de conexão ao finalizar sessão:', error);
        }
    }
    
    /**
     * interruptSession() - Interrompe a sessão de meditação no banco de dados
     * - Envia end_time via API /api/sessions.php
     * - Usa timezone de Brasília
     * - Define status como 'interrupted' em vez de 'completed'
     * - Recarrega histórico de sessões após interrupção
     * - Limpa sessionId após sucesso
     */

    async interruptSession() {
        if (!this.sessionId) {
            console.log('Nenhuma sessão ativa para interromper');
            return;
        }
        
        console.log('Interrompendo sessão...');
        
        try {
            const now = new Date();
            
            // Converter para timezone de Brasília (UTC-3)
            const brasiliaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
            const brasiliaISO = brasiliaTime.toISOString();
            
            console.log('Dados da interrupção:', {
                sessionId: this.sessionId,
                timestamp: brasiliaISO,
                localTime: now.toLocaleString('pt-BR'),
                brasiliaTime: brasiliaTime.toLocaleString('pt-BR')
            });
            
            const response = await fetch('/api/sessions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'interrupt',
                    session_id: this.sessionId,
                    end_time: brasiliaISO
                })
            });
            
            console.log('Resposta da API:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('Resultado:', result);
            
            if (result.success) {
                console.log('Sessão interrompida com sucesso!');
                console.log('Horário de fim:', result.end_time);
                this.sessionId = null;
                
                // Recarregar histórico de sessões
                setTimeout(() => {
                    this.loadSessions();
                }, 1000);
            } else {
                console.error('Erro ao interromper sessão:', result.error);
            }
        } catch (error) {
            console.error('Erro de conexão ao interromper sessão:', error);
        }
    }
    
    /**
     * reactivateSession() - Reativa uma sessão interrompida para "em andamento"
     * - Atualiza status de 'interrupted' para 'active'
     - Limpa end_time para indicar que está em andamento
     * - Usada quando usuário retoma timer pausado
     */

    async reactivateSession() {
        if (!this.sessionId) {
            console.log('Nenhuma sessão ativa para reativar');
            return;
        }
        
        console.log('Reativando sessão...');
        
        try {
            const response = await fetch('/api/sessions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'reactivate',
                    session_id: this.sessionId
                })
            });
            
            console.log('Resposta da API:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('Resultado:', result);
            
            if (result.success) {
                console.log('Sessão reativada com sucesso!');
                // Recarregar histórico de sessões
                setTimeout(() => {
                    this.loadSessions();
                }, 1000);
            } else {
                console.error('Erro ao reativar sessão:', result.error);
            }
        } catch (error) {
            console.error('Erro de conexão ao reativar sessão:', error);
        }
    }
    
    /**
     * checkAuthAndLoadSessions() - Verifica autenticação e carrega histórico de sessões
     * - Tenta carregar sessões para verificar se usuário está autenticado
     * - Usado na inicialização da classe
     * - Trata erros de autenticação silenciosamente
     */

    async checkAuthAndLoadSessions() {
        try {
            // Primeiro, tentar carregar sessões para verificar se está autenticado
            await this.loadSessions();
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            // Se não conseguir carregar, pode ser problema de autenticação
        }
    }
    
    /**
     * loadSessions() - Carrega histórico de sessões do usuário
     * - Busca sessões via API /api/sessions.php?action=list
     * - Exibe sessões na interface usando displaySessions()
     * - Recarrega página se usuário não estiver autenticado
     * - Trata erros de conexão
     */

    async loadSessions() {
        console.log('Carregando histórico de sessões...');
        
        try {
            const response = await fetch('/api/sessions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    action: 'list'
                })
            });
            
            console.log('Resposta da API:', response.status, response.statusText);
            
            const result = await response.json();
            console.log('Resultado:', result);
            
            if (result.success) {
                console.log('Sessões carregadas com sucesso! Total:', result.total);
                this.displaySessions(result.sessions);
            } else {
                console.error('Erro ao carregar sessões:', result.error);
                if (result.error && result.error.includes('Não autorizado')) {
                    console.log('Usuário não autenticado, recarregando página...');
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Erro de conexão ao carregar sessões:', error);
        }
    }
    
    /**
     * formatDuration(duration) - Formata duração de sessão para exibição
     * @param {string} duration - Duração no formato HH:MM:SS ou '--:--:--'
     * @returns {string} Duração formatada em minutos (ex: "15 minutos")
     * 
     * Converte formato HH:MM:SS para minutos totais.
     * Trata casos especiais (0 minutos, 1 minuto, plural).
     */
    formatDuration(duration) {
        if (!duration || duration === '--:--:--') {
            return '0 minutos';
        }
        
        // Converter formato HH:MM:SS para minutos
        const parts = duration.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        
        const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
        
        if (totalMinutes === 0) {
            return '0 minutos';
        } else if (totalMinutes === 1) {
            return '1 minuto';
        } else {
            return `${totalMinutes} minutos`;
        }
    }

    /**
     * displaySessions(sessions) - Exibe sessões na lista do histórico
     * @param {Array} sessions - Array de objetos com dados das sessões
     * 
     * - Diferencia sessões ativas das completadas
     * - Exibe mensagem se não houver sessões
     * - Renderiza cards com informações de cada sessão
     */

    displaySessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        if (!sessionsList) return;
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = '<div class="empty-state">Nenhuma sessão encontrada. Comece sua primeira meditação!</div>';
            return;
        }
        
        sessionsList.innerHTML = sessions.map(session => {
            // Usar timezone de Brasília para formatar a data
            let formattedDate = session.formatted_date;
            
            // Para sessões ativas, usar horário atual de Brasília
            if (session.status === 'active' && session.is_active) {
                const now = new Date();
                // Converter para timezone de Brasília
                const brasiliaTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
                formattedDate = brasiliaTime.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                });
            } else if (session.start_time_iso) {
                // Para sessões concluídas, usar o horário original
                const sessionDate = new Date(session.start_time_iso);
                formattedDate = sessionDate.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'America/Sao_Paulo'
                });
            } else if (session.formatted_date_pt) {
                // Usar data formatada do servidor
                formattedDate = session.formatted_date_pt;
            }
            
            // Determinar status e ícone
            let statusText, statusClass, statusIcon;
            
            switch (session.status) {
                case 'completed':
                    statusText = 'Concluída';
                    statusClass = 'completed';
                    statusIcon = '';
                    break;
                case 'active':
                    statusText = 'Em andamento';
                    statusClass = 'active';
                    statusIcon = '';
                    break;
                case 'interrupted':
                    statusText = 'Interrompida';
                    statusClass = 'interrupted';
                    statusIcon = '';
                    break;
                default:
                    statusText = 'Desconhecido';
                    statusClass = 'unknown';
                    statusIcon = '';
            }
            
            return `
                <div class="session-item collapsed ${statusClass}" data-session-id="${session.id}">
                    <div class="session-item-header" onclick="toggleSessionDetails(${session.id})">
                        <div class="session-basic-info">
                            <div class="session-date">${formattedDate}</div>
                            <div class="session-duration">${session.actual_duration}</div>
                        </div>
                        <div class="session-status">
                            <span class="status-badge ${statusClass}">
                                ${statusIcon} ${statusText}
                            </span>
                            <span class="session-collapse-icon">▼</span>
                        </div>
                    </div>
                    <div class="session-item-content">
                        <div class="session-details">
                            <div class="session-detail-item">
                                <span class="session-detail-label">Duração:</span>
                                <span class="session-detail-value">${this.formatDuration(session.actual_duration)}</span>
                            </div>
                            <div class="session-detail-item">
                                <span class="session-detail-label">Status:</span>
                                <span class="session-detail-value">
                                    <span class="status-badge ${statusClass}">
                                        ${statusIcon} ${statusText}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Se tem sessões ativas, atualizar o horário a cada minuto
        const hasActiveSessions = sessions.some(session => session.status === 'active');
        if (hasActiveSessions) {
            this.startActiveSessionUpdater();
        } else {
            this.stopActiveSessionUpdater();
        }
    }
    
    // Atualiza horário de sessões ativas
    startActiveSessionUpdater() {
        if (this.activeSessionUpdater) {
            clearInterval(this.activeSessionUpdater);
        }
        
        // Adicionar timeout de segurança
        let updateCount = 0;
        const maxUpdates = 20; // Máximo de 10 minutos (20 * 30s)
        
        this.activeSessionUpdater = setInterval(() => {
            updateCount++;
            
            // Parar se exceder limite de segurança
            if (updateCount > maxUpdates) {
                console.log('⏰ Atualizador de sessões parado por segurança');
                this.stopActiveSessionUpdater();
                return;
            }
            
            try {
                this.loadSessions(); // Recarregar sessões para atualizar horário
            } catch (error) {
                console.error('Erro ao atualizar sessões:', error);
                this.stopActiveSessionUpdater();
            }
        }, 30000); // Atualizar a cada 30 segundos para sessões ativas
    }
    
    // Parar atualização de sessões ativas
    stopActiveSessionUpdater() {
        if (this.activeSessionUpdater) {
            clearInterval(this.activeSessionUpdater);
            this.activeSessionUpdater = null;
        }
    }
    
    /**
     * showNoPersonalAudioMessage() - Exibe notificação quando não há arquivos personalizados
     * - Cria elemento de notificação com estilo de vidro fosco
     * - Exibe mensagem orientando usuário a fazer upload
     * - Remove automaticamente após 5 segundos
     * - Usado quando categoria 'zen' é selecionada sem arquivos
     */

    showNoPersonalAudioMessage() {
        // Criar notificação temporária
        const notification = document.createElement('div');
        notification.className = 'zen-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <h4>Música Personalizada</h4>
                <p>Nenhuma música personalizada encontrada. Faça upload de seus arquivos de áudio na seção "Suas músicas" para usar música personalizada!</p>
                <button onclick="this.parentElement.parentElement.remove()" class="btn btn-primary">Entendi</button>
            </div>
        `;
        
        // Adicionar estilos inline para a notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        
        document.body.appendChild(notification);
        
        // Remove após 10 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }
}

// Função global para alternar detalhes de sessão
window.toggleSessionDetails = function(sessionId) {
    const sessionElement = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (!sessionElement) return;
    
    const isCollapsed = sessionElement.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expandir sessão
        sessionElement.classList.remove('collapsed');
        sessionElement.classList.add('expanded');
    } else {
        // Colapsar sessão
        sessionElement.classList.remove('expanded');
        sessionElement.classList.add('collapsed');
    }
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const timer = new MeditationTimer();
    
    // Expoe timer globalmente para debug
    window.meditationTimer = timer;
    console.log('Timer exposto globalmente como window.meditationTimer');
    
    // Força limpeza do background na inicialização
    timer.forceBackgroundCleanup();
    
    // Carregar histórico de sessões
    timer.loadSessions();
    
    // Executa limpeza com timeout de segurança
    let cleanupCount = 0;
    const maxCleanups = 100; // Máximo de 8 minutos (100 * 5s)
    
    const cleanupInterval = setInterval(() => {
        cleanupCount++;
        
        // Para limpeza automática após limite de segurança
        if (cleanupCount > maxCleanups) {
            console.log('Limpeza automática parada por segurança');
            clearInterval(cleanupInterval);
            return;
        }
        
        try {
            timer.forceBackgroundCleanup();
        } catch (error) {
            console.error('Erro na limpeza automática:', error);
            clearInterval(cleanupInterval);
        }
    }, 5000);
}); 
