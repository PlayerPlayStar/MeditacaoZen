
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
        
        this.stopVisualizer();
        
        if (!this.userAudio || this.userAudio.paused || this.userAudio.ended) {
            console.log('Áudio não está tocando, não iniciando visualizador simulado');
            return;
        }
        

        // visualizer loop and bars

        this._startVisualizerLoop(150, 50, () => {
            this.updateSimulatedVisualizer();
        }, 'Visualizador simulado');
        
        console.log('Visualizador simulado iniciado');
    }

    _startVisualizerLoop(interval, maxTimeouts, updateFn, name, requireAnalyser = false) {
        let timeoutCount = 0;
        
        this.visualizerInterval = setInterval(() => {
            const audioOk = this.userAudio && !this.userAudio.paused && !this.userAudio.ended;
            const analyserOk = !requireAnalyser || this.analyser;
            
            if (audioOk && analyserOk) {
                try {
                    timeoutCount++;
                    
                    if (timeoutCount > maxTimeouts) {
                        console.warn(`${name} parado por segurança (timeout)`);
                        this.stopVisualizer();
                        return;
                    }
                    
                    updateFn();
                } catch (error) {
                    console.error(`Erro no ${name.toLowerCase()}:`, error);
                    this.stopVisualizer();
                }
            } else {
                console.log(`Áudio parou, parando ${name.toLowerCase()}...`);
                this.stopVisualizer();
            }
        }, interval);
    }

    updateVisualizerBars() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            console.log('Barras do visualizador não encontradas');
            return;
        }
        
        let totalIntensity = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            totalIntensity += this.dataArray[i];
        }
        const averageIntensity = totalIntensity / this.dataArray.length;
        
        this.visualizerBars.forEach((bar, index) => {
            let frequency = 0;
            
            if (index < this.visualizerBars.length / 3) {
                // low frequency
                frequency = this.dataArray[Math.floor(index * 2)] || 0;
            } else if (index < (this.visualizerBars.length * 2) / 3) {
                // mid frequency
                frequency = this.dataArray[Math.floor(index * 1.5) + 8] || 0;
            } else {
                // high frequency
                frequency = this.dataArray[Math.floor(index * 1.2) + 16] || 0;
            }
            
            const normalizedFreq = frequency / 255;
            const baseHeight = Math.max(4, normalizedFreq * 80 + 4);
            
            const intensityMultiplier = 1 + (averageIntensity / 255) * 0.3;
            const height = Math.min(100, baseHeight * intensityMultiplier);
            
            bar.style.transition = 'height 0.1s ease-out, background-color 0.1s ease-out';
            bar.style.height = height + 'px';
            
            const intensity = normalizedFreq;
            let hue;
            if (index < this.visualizerBars.length / 3) {
                // low frequency
                hue = (intensity * 60) + 0;
            } else if (index < (this.visualizerBars.length * 2) / 3) {
                // mid frequency
                hue = (intensity * 60) + 60;
            } else {
                // high frequency
                hue = (intensity * 60) + 180;
            }
            
            const saturation = 70 + (intensity * 30);
            const lightness = 60 + (intensity * 20);
            bar.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        });
    }


    updateSimulatedVisualizer() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            return;
        }
        
        this.visualizerBars.forEach((bar, index) => {
            const time = Date.now() * 0.001;
            const frequency = 0.5 + (index * 0.1);
            const amplitude = 30 + Math.sin(time * frequency) * 20;
            const randomVariation = Math.random() * 10;
            const height = Math.max(4, amplitude + randomVariation);
            
            bar.style.transition = 'height 0.1s ease-out';
            bar.style.height = height + 'px';
            
            const hue = (index * 30 + time * 50) % 360;
            bar.style.backgroundColor = `hsl(${hue}, 70%, 60%)`;
        });
    }

    stopVisualizer() {
        console.log('Parando visualizador...');
        
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
            this.visualizerInterval = null;
        }
        
        this.resetVisualizerBars();
        
        if (this.dataArray) {
            this.dataArray.fill(0);
        }
        
        if (this.analyser) {
            this.analyser = null;
        }
        
        console.log('Visualizador parado');
    }
    
    resetVisualizerBars() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            return;
        }
        
        this.visualizerBars.forEach((bar, index) => {
            bar.style.transition = 'none';
            bar.style.height = '4px';
            bar.style.backgroundColor = '#4a90e2'; // Cor padrão azul
            
            bar.offsetHeight;
        });
    }
    
    fadeVisualizerBars() {
        if (!this.visualizerBars || this.visualizerBars.length === 0) {
            return;
        }
        
        this.visualizerBars.forEach((bar, index) => {
            const currentHeight = parseInt(bar.style.height) || 50;
            const newHeight = Math.max(4, currentHeight * 0.8);
            
            bar.style.transition = 'height 0.3s ease-out';
            bar.style.height = newHeight + 'px';
        });
    }
    
    // audio controls
    showAudioControls() {
        if (this.audioVisualizer) {
            this.audioVisualizer.style.display = 'block';
        }
    }

    hideAudioControls() {
        if (this.audioVisualizer) {
            this.audioVisualizer.style.display = 'none';
        }
    }


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
        this.stopVisualizer();
        
        console.log('Música de fundo pausada');
    }


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

    applyCustomColors() {
        const color1 = this.color1Picker.value;
        const color2 = this.color2Picker.value;
        
        console.log('Cores personalizadas selecionadas:', color1, '→', color2);
        
        if (!this.color1Picker || !this.color2Picker) {
            console.error('Seletores de cor não encontrados!');
            return;
        }
        
        // gradient custom colors
        const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
        document.body.style.background = gradient;
        document.body.style.backgroundSize = '200% 200%';
        document.body.style.animation = 'gradientMove 16s ease-in-out infinite';
        
        document.documentElement.style.setProperty('--color1', color1);
        document.documentElement.style.setProperty('--color2', color2);
        
        document.body.classList.add('custom-colors');
        
        console.log('Gradiente aplicado:', gradient);
        
        localStorage.setItem('customColor1', color1);
        localStorage.setItem('customColor2', color2);
        
        console.log('Cores aplicadas ao gradiente linear com sucesso!');
    }
    
    resetColors() {
        console.log('Resetando cores para padrão do gradiente linear');
        
        const defaultColor1 = '#667eea';
        const defaultColor2 = '#764ba2';
        
        this.color1Picker.value = defaultColor1;
        this.color2Picker.value = defaultColor2;
        
        document.body.classList.remove('custom-colors');
        
        document.documentElement.style.setProperty('--color1', defaultColor1);
        document.documentElement.style.setProperty('--color2', defaultColor2);
        
        localStorage.removeItem('customColor1');
        localStorage.removeItem('customColor2');
        
        console.log('Cores resetadas para padrão do gradiente linear!');
    }


    loadSavedColors() {
        const savedColor1 = localStorage.getItem('customColor1');
        const savedColor2 = localStorage.getItem('customColor2');        
        let color1, color2;
        
        if (savedColor1 && savedColor2) {
            color1 = savedColor1;
            color2 = savedColor2;
            
            this.color1Picker.value = savedColor1;
            this.color2Picker.value = savedColor2;
            
            document.body.classList.add('custom-colors');
        } else {
            color1 = '#667eea';
            color2 = '#764ba2';
            
            document.body.classList.remove('custom-colors');
        }
        
        document.documentElement.style.setProperty('--color1', color1);
        document.documentElement.style.setProperty('--color2', color2);
        
        document.body.offsetHeight;
        
        setTimeout(() => {
            const finalBackground = getComputedStyle(document.body).getPropertyValue('background');
            console.log('Background final após carregamento:', finalBackground);
        }, 100);
    }
    

    async startSession() {
        console.log('🚀 Iniciando nova sessão...');
        
        try {
            const duration = Math.floor(this.timeLeft / 60);
            const now = new Date();
            
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
    

    async completeSession() {
        if (!this.sessionId) {
            console.log('Nenhuma sessão ativa para finalizar');
            return;
        }
        
        console.log('Finalizando sessão...');
        
        try {
            const now = new Date();
            
            // convert to Brasília time
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

    async interruptSession() {
        if (!this.sessionId) {
            console.log('Nenhuma sessão ativa para interromper');
            return;
        }
        
        console.log('Interrompendo sessão...');
        
        try {
            const now = new Date();
            
            // convert to Brasilia time
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
                
                // session timeout
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

    async checkAuthAndLoadSessions() {
        try {
            await this.loadSessions();
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
        }
    }

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
    
    // session duration infos
    formatDuration(duration) {
        if (!duration || duration === '--:--:--') {
            return '0 minutos';
        }
        
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

    displaySessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        if (!sessionsList) return;
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = '<div class="empty-state">Nenhuma sessão encontrada. Comece sua primeira meditação!</div>';
            return;
        }
        
        sessionsList.innerHTML = sessions.map(session => {
            let formattedDate = session.formatted_date;
            
            if (session.status === 'active' && session.is_active) {
                const now = new Date();
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
                formattedDate = session.formatted_date_pt;
            }
            
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
            
            // div classes
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
        
        const hasActiveSessions = sessions.some(session => session.status === 'active');
        if (hasActiveSessions) {
            this.startActiveSessionUpdater();
        } else {
            this.stopActiveSessionUpdater();
        }
    }
    
    startActiveSessionUpdater() {
        if (this.activeSessionUpdater) {
            clearInterval(this.activeSessionUpdater);
        }
        
        let updateCount = 0;
        const maxUpdates = 20;
        
        this.activeSessionUpdater = setInterval(() => {
            updateCount++;
            
            if (updateCount > maxUpdates) {
                console.log('⏰ Atualizador de sessões parado por segurança');
                this.stopActiveSessionUpdater();
                return;
            }
            
            try {
                this.loadSessions();
            } catch (error) {
                console.error('Erro ao atualizar sessões:', error);
                this.stopActiveSessionUpdater();
            }
        }, 30000);
    }
    
    stopActiveSessionUpdater() {
        if (this.activeSessionUpdater) {
            clearInterval(this.activeSessionUpdater);
            this.activeSessionUpdater = null;
        }
    }
}


window.toggleSessionDetails = function(sessionId) {
    const sessionElement = document.querySelector(`[data-session-id="${sessionId}"]`);
    if (!sessionElement) return;
    
    const isCollapsed = sessionElement.classList.contains('collapsed');
    
    if (isCollapsed) {
        sessionElement.classList.remove('collapsed');
        sessionElement.classList.add('expanded');
    } else {
        sessionElement.classList.remove('expanded');
        sessionElement.classList.add('collapsed');
    }
};


document.addEventListener('DOMContentLoaded', () => {
    const timer = new MeditationTimer();
    
    window.meditationTimer = timer;
    console.log('Timer exposto globalmente como window.meditationTimer');
    
    timer.forceBackgroundCleanup();
    
    timer.loadSessions();
    
    let cleanupCount = 0;
    const maxCleanups = 100;
    
    const cleanupInterval = setInterval(() => {
        cleanupCount++;
        
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
