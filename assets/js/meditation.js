
class MeditationTimer {
    constructor() {
        this.timeLeft = 15 * 60;
        this.originalTime = 15 * 60;
        this.isRunning = false;
        this.interval = null;
        this.sessionId = null;
        this.volume = 0.5;
        this.userAudio = null;
        this.audioContext = null;
        this.analyser = null;
        this.visualizerInterval = null;
        this.isAudioPaused = false;
        this.sessionStarted = false;
        this.activeSessionUpdater = null;
        
        // playlist info
        this.userPlaylist = [];
        this.userPlaylistIndex = 0;
        this.selectedMusicType = 'none';
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
        this.initializeMusic();
        this.loadSavedColors();
        
        this.checkAuthAndLoadSessions();
    }
    
    initializeElements() {
        this.minutesDisplay = document.getElementById('minutes');
        this.secondsDisplay = document.getElementById('seconds');
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        
        this.volumeSlider = document.getElementById('volume-slider');
        this.volumeDisplay = document.getElementById('volume-display');
        this.audioVisualizer = document.getElementById('audio-visualizer');
        this.visualizerBars = document.querySelectorAll('.visualizer-bar');
        
        this.color1Picker = document.getElementById('color1-picker');
        this.color2Picker = document.getElementById('color2-picker');
        this.applyColorsBtn = document.getElementById('apply-colors-btn');
        this.resetColorsBtn = document.getElementById('reset-colors-btn');
        
        console.log('Elementos de cor encontrados:', {
            color1Picker: !!this.color1Picker,
            color2Picker: !!this.color2Picker,
            applyColorsBtn: !!this.applyColorsBtn,
            resetColorsBtn: !!this.resetColorsBtn
        });

        // choose song to play
        const initialRadio = document.querySelector('input[name="background-music"]:checked');
        this.selectedMusicType = initialRadio ? initialRadio.value : 'none';
    }
    
    bindEvents() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.time);
                this.setTime(minutes * 60);
            });
        });
        
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                this.volume = e.target.value / 100;
                this.volumeDisplay.textContent = e.target.value + '%';
                if (this.userAudio) this.userAudio.volume = this.volume;
            });
        }
        
        document.querySelectorAll('input[name="background-music"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (!e.target.checked) return;
                this.selectedMusicType = e.target.value;
                if (this.isRunning) {
                    this.startBackgroundMusic(this.selectedMusicType, true);
                } else {
                    this.stopAllMusic();
                }
            });
        });
        
        if (this.applyColorsBtn) {
            this.applyColorsBtn.addEventListener('click', () => this.applyCustomColors());
        }
        if (this.resetColorsBtn) {
            this.resetColorsBtn.addEventListener('click', () => this.resetColors());
        }
    }
    
    // set, start, pause, reset timer

    setTime(seconds) {
        this.timeLeft = seconds;
        this.originalTime = seconds;
        this.updateDisplay();
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startBtn.style.display = 'none';
        this.pauseBtn.style.display = 'inline-block';
        
        document.body.classList.add('meditation-active');
        
        if (!this.sessionStarted) {
            this.startSession();
            this.sessionStarted = true;
        } else if (this.sessionId) {
            this.reactivateSession();
        }
        
        const selectedMusic = this.selectedMusicType && this.selectedMusicType !== 'none'
            ? { value: this.selectedMusicType }
            : null;
        
        if (selectedMusic && selectedMusic.value !== 'none') {
            if (this.userAudio && this.userAudio.paused && this.isAudioPaused) {
                console.log('Retomando música existente');
                this.resumeBackgroundMusic();
            } else if (!this.userAudio) {
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
        
        document.body.classList.add('meditation-active');
    }


    pause() {
        this.isRunning = false;
        clearInterval(this.interval);
        this.startBtn.style.display = 'inline-block';
        this.pauseBtn.style.display = 'none';
        document.body.classList.remove('meditation-active');
        
        this.pauseBackgroundMusic();
        if (!this.isRunning) {
            if (this.userAudio && !this.userAudio.paused) {
                this.userAudio.pause();
            }
            if (this.backgroundMusic && this.backgroundMusic.stop) {
                this.backgroundMusic.stop();
            }
        }
        
        // pause audio along with the timer
        if (this.userAudio && !this.userAudio.paused) {
            this.userAudio.pause();
            this.isAudioPaused = true;
            this.stopVisualizer();
            console.log('Música pausada automaticamente com timer');
        }
        
        document.body.classList.remove('meditation-active');
    }
    
    reset() {
        this.pause();
        this.timeLeft = this.originalTime;
        this.updateDisplay();
        
        if (this.sessionId) {
            this.interruptSession();
        }
        
        this.stopAllMusic();
        this.sessionStarted = false;
        this.sessionId = null;
    }
    

    stopAllMusic() {
        console.log('Parando toda a música...');
        document.querySelectorAll('audio').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        
        if (this.userAudio) {
            this.userAudio.pause();
            this.userAudio.currentTime = 0;
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


    complete() {
        this.pause();
        this.stopAllMusic();

        this.completeSession();
        

        this.sessionStarted = false;
        
        alert('Meditação concluída!');
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        this.minutesDisplay.textContent = minutes.toString().padStart(2, '0');
        this.secondsDisplay.textContent = seconds.toString().padStart(2, '0');
    }


    initializeMusic() {
        if (this.volumeDisplay) {
            this.volumeDisplay.textContent = '50%';
        }
    }

    async startBackgroundMusic(type, force = false) {
        if (type === 'none') return;
        
        if (window.audioUploadManager) {
            window.audioUploadManager.stopAllAudioPlayers();
        }
        
        const normalizeCategory = (t) => {
            if (!t) return t;
            if (['noite', 'calmaria', 'por do sol', 'custom'].includes(t)) {
                return t;
            }
            return t;
        };
        const canonicalType = normalizeCategory(type);
        if (!force && !this.isRunning) {
            this.selectedMusicType = type;
            console.log('Timer parado, não iniciando música agora');
            return;
        }
        
        console.log(`Iniciando música de fundo para categoria: ${type} (canônica: ${canonicalType})`);
        
        if (this.userAudio && !this.userAudio.paused) {
            console.log('Música já está tocando, pausando antes de iniciar nova');
            this.pauseBackgroundMusic();
        }
        
        try {
            console.log('Buscando arquivos do usuário...');
            const userFiles = await this.getUserAudioFiles(canonicalType);
            if (userFiles.length > 0) {
                console.log(`Arquivos do usuário encontrados: ${userFiles.length}`);
                this.startUserPlaylist(userFiles, type);
                return;
            }
            
            console.log('Buscando arquivos manuais...');
            const manualFile = await this.getManualAudioFile(type);
            if (manualFile) {
                console.log(`Arquivo manual encontrado: ${manualFile}`);
                this.startManualAudio(manualFile);
                return;
            }
            
            console.log('Usando som sintético como fallback');
            this.startSyntheticMusic(canonicalType);
            
        } catch (error) {
            console.error('Erro ao iniciar música:', error);
            this.startSyntheticMusic(canonicalType);
        }
    }
    
    // playlist and tracks
    startUserPlaylist(files, category) {
        this.userPlaylist = files;
        this.userPlaylistIndex = 0;
        console.log('🎼 Iniciando playlist do usuário:', this.userPlaylist.map(f => f.title || f.original_name));
        this.playCurrentUserTrack(category);
    }
    playCurrentUserTrack(category) {
        if (!this.userPlaylist || this.userPlaylist.length === 0) {
            console.log('Playlist vazia, abortando reprodução');
            return;
        }
        const current = this.userPlaylist[this.userPlaylistIndex];
        console.log(`Tocando faixa ${this.userPlaylistIndex + 1}/${this.userPlaylist.length}: ${current.title || current.original_name}`);
        this.startUserAudio(current, category);
    }

    async getUserAudioFiles(type) {
        try {
            console.log(`Buscando arquivos do usuário para categoria: ${type}`);
            const response = await fetch(`/api/audio.php?action=list`, {
                credentials: 'same-origin'
            });
            const result = await response.json();
            console.log('Resultado da API de áudio:', result);
            
            if (result.success) {
                const normalizeType = (t) => {
                    if (!t) return t;
                    if (['noite', 'calmaria', 'por do sol', 'custom'].includes(t)) {
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
    
    async getManualAudioFile(type) {
        console.log(`Buscando arquivo manual para categoria: ${type}`);
        
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
        
        // const by names and extensions
        const audioExtensions = ['mp4', 'mp3', 'wav', 'ogg', 'm4a'];
        const commonNames = ['audio', 'music', 'sound', 'noite', 'calmaria'];
        
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
                }
            }
        }
        
        console.log(`Nenhum arquivo manual encontrado para categoria: ${type}`);
        return null;
    }

    startUserAudio(audioFile, categoryFromContext) {
        const isEdge = /Edg/.test(navigator.userAgent);
        
        this.userAudio = new Audio(`/api/audio.php?action=get&id=${audioFile.id}`);
        this.userAudio.volume = this.volume;
        this.userAudio.loop = false;
        this.userAudio.preload = 'auto';
        
        // edge-specific configurations
        if (isEdge) {
            this.userAudio.crossOrigin = 'anonymous';
            this.userAudio.controls = false;
        }
        
        this.userAudio.addEventListener('loadeddata', () => {
            console.log('Arquivo do usuário carregado');
            
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
    

    startManualAudio(filePath) {
        console.log(`Iniciando arquivo manual: ${filePath}`);
        
        const urlParts = filePath.split('/');
        const fileName = urlParts.pop();
        const basePath = urlParts.join('/');
        const encodedFileName = encodeURIComponent(fileName);
        const encodedPath = basePath + '/' + encodedFileName;
        
        fetch(encodedPath, { method: 'HEAD' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Arquivo não encontrado: ${encodedPath} (Status: ${response.status})`);
                }
                console.log(`Arquivo manual verificado: ${encodedPath}`);
                this.loadManualAudio(filePath);
            })
            .catch(error => {
                console.error(`Erro ao verificar arquivo manual: ${encodedPath}`, error);
                console.log('Tentando som sintético...');
                this.startSyntheticMusic('noite');
            });
    }
    

    loadManualAudio(filePath) {
        console.log(`Carregando arquivo manual: ${filePath}`);
        
        const isEdge = /Edg/.test(navigator.userAgent);
        
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
        
        if (isEdge) {
            this.userAudio.crossOrigin = 'anonymous';
            this.userAudio.controls = false;
        }
        
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
    createSyntheticSound(type) {
        console.log(`Criando som sintético para categoria: ${type}`);

        const oscillators = [];
        const gainNodes = [];
        
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
            ]
        };
        
        const configs = soundConfig[type] || soundConfig['noite'];
        console.log(`🎼 Configuração de som para ${type}:`, configs);
        
        configs.forEach((config, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            oscillator.frequency.setValueAtTime(config.freq, this.audioContext.currentTime);
            oscillator.type = config.type;
            gainNode.gain.setValueAtTime(config.gain, this.audioContext.currentTime);

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
        
        // oscillators control
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
                    }
                });
            }
        };
        
        console.log(`Som sintético criado para ${type} com ${oscillators.length} osciladores`);
        
        return soundGroup;
    }
    

    setupAudioVisualizer() {
        if (!this.audioContext || !this.userAudio) {
            console.log('AudioContext ou userAudio não disponível para visualizador');
            return;
        }

        // browsers
        const isEdge = /Edg/.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent);
        
        console.log(`Configurando visualizador de áudio... (Browser: ${isEdge ? 'Edge' : isChrome ? 'Chrome' : 'Other'})`);
        
        try {
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.3;
            this.analyser.minDecibels = -90;
            this.analyser.maxDecibels = -10;
            
            const source = this.audioContext.createMediaElementSource(this.userAudio);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            console.log('Visualizador configurado com sucesso');
            this.startVisualizer();
        } catch (error) {
            console.error('Erro ao configurar visualizador:', error);
            console.log('Usando visualizador simulado...');
            this.startSimulatedVisualizer();
        }
    }

    startVisualizer() {
        console.log('Iniciando visualizador de áudio...');
        this.stopVisualizer();
        if (!this.userAudio || this.userAudio.paused || this.userAudio.ended) {
            console.log('Áudio não está tocando');
            return;
        }
        
        if (!this.analyser) {
            console.log('Analisador não disponível');
            return;
        }
        
        this._startVisualizerLoop(50, 100, () => {
            if (!this.analyser) {
                this.stopVisualizer();
                return;
            }
            this.analyser.getByteFrequencyData(this.dataArray);
            this.updateVisualizerBars();
        }, 'Visualizador', true);
        
        console.log('Visualizador iniciado');
    }
    

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
}

class MeditationApp {
    // ... restante do código ...
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
