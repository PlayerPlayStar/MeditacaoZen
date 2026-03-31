<?php
session_start();
require_once 'config/database.php';

// VERIFICAR SE ESTÁ LOGADO
if (!isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

$user_id = $_SESSION['user_id'];
$user_name = $_SESSION['user_name'];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#667eea">
    <meta name="description" content="Aplicativo de meditação com timer e relatórios">
    <meta name="keywords" content="meditação, mindfulness, timer, relaxamento">
    <meta name="author" content="Meditação Zen">
    

    <!-- ÍCONE -->
    <link rel="icon" type="image/svg+xml" href="assets/icons/icon.svg">
    
    <title>Dashboard - Meditação Zen</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div class="container">
        <header class="dashboard-header">
            <h1>Meditação Zen</h1>
            <div class="user-info">
                <span>Olá, <?php echo htmlspecialchars($user_name); ?>!</span>
                <a href="logout.php" class="btn btn-secondary">Sair</a>
            </div>
        </header>

        <main class="dashboard-content">
            <div class="meditation-timer">
                <h2>Timer de Meditação</h2>
                <div class="timer-display">
                    <span id="minutes">15</span>:<span id="seconds">00</span>
                </div>
                <div class="timer-controls">
                    <button id="start-btn" class="btn btn-primary">Iniciar</button>
                    <button id="pause-btn" class="btn btn-secondary" style="display: none;">Pausar</button>
                    <button id="reset-btn" class="btn btn-secondary">Reset</button>
                </div>
                <div class="timer-presets">
                    <button class="preset-btn" data-time="5">5 min</button>
                    <button class="preset-btn" data-time="10">10 min</button>
                    <button class="preset-btn" data-time="15">15 min</button>
                    <button class="preset-btn" data-time="20">20 min</button>
                    <button class="preset-btn" data-time="30">30 min</button>
                </div>
                
                <!-- OPÇÕES DAS MÚSICAS DE FUNDO -->
                <div class="music-controls">
                    <h3>Música de Fundo</h3>
                    <div class="music-options">
                        <label class="music-option">
                            <input type="radio" name="background-music" value="none" checked>
                            <span class="music-label">Sem música</span>
                        </label>
                        <label class="music-option">
                            <input type="radio" name="background-music" value="noite">
                            <span class="music-label">Noite</span>
                        </label>
                        <label class="music-option">
                            <input type="radio" name="background-music" value="por do sol">
                            <span class="music-label">Pôr do sol</span>
                        </label>
                        <label class="music-option">
                            <input type="radio" name="background-music" value="calmaria">
                            <span class="music-label">Calmaria</span>
                        </label>
                    </div>
                    <div class="volume-control">
                        <label for="volume-slider">Volume:</label>
                        <input type="range" id="volume-slider" min="0" max="100" value="50">
                        <span id="volume-display">50%</span>
                    </div>
                    
                    <!-- CONTROLE DAS CORES DO GRADIENTE -->
                    <div class="color-controls">
                        <h4>Cores do Gradiente</h4>
                        <div class="color-picker-container">
                            <div class="color-inputs-row">
                                <div class="color-picker-group">
                                    <label for="color1-picker">Cor 1:</label>
                                    <input type="color" id="color1-picker" value="#667eea">
                                </div>
                                <div class="color-picker-group">
                                    <label for="color2-picker">Cor 2:</label>
                                    <input type="color" id="color2-picker" value="#764ba2">
                                </div>
                            </div>
                            <div class="color-buttons-row">
                                <button id="apply-colors-btn" class="btn btn-primary">Aplicar Cores</button>
                                <button id="reset-colors-btn" class="btn btn-secondary">Resetar</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- BARRAS COLORIDAS ANIMADAS -->
                    <div class="audio-visualizer" id="audio-visualizer" style="display: none;">
                        <div class="visualizer-container">
                            <div class="visualizer-bar" data-frequency="0"></div>
                            <div class="visualizer-bar" data-frequency="1"></div>
                            <div class="visualizer-bar" data-frequency="2"></div>
                            <div class="visualizer-bar" data-frequency="3"></div>
                            <div class="visualizer-bar" data-frequency="4"></div>
                            <div class="visualizer-bar" data-frequency="5"></div>
                            <div class="visualizer-bar" data-frequency="6"></div>
                            <div class="visualizer-bar" data-frequency="7"></div>
                            <div class="visualizer-bar" data-frequency="8"></div>
                            <div class="visualizer-bar" data-frequency="9"></div>
                            <div class="visualizer-bar" data-frequency="10"></div>
                            <div class="visualizer-bar" data-frequency="11"></div>
                            <div class="visualizer-bar" data-frequency="12"></div>
                            <div class="visualizer-bar" data-frequency="13"></div>
                            <div class="visualizer-bar" data-frequency="14"></div>
                            <div class="visualizer-bar" data-frequency="15"></div>
                        </div>
                    </div>
                    
                    <!-- UPLOAD DE MÚSICAS FEITAS PELO USUÁRIO -->
                    <div class="audio-upload" id="audio-upload">
                        <div class="accordion-header" id="audio-accordion">
                            <h2>Seus Arquivos de Áudio</h2>
                            <span class="accordion-icon">▼</span>
                        </div>
                        <div class="accordion-content" id="audio-content">
                            <div class="upload-form">
                            <form id="audio-upload-form" enctype="multipart/form-data">
                                <div class="form-group">
                                    <label for="audio-file">Escolher arquivo de áudio:</label>
                                    <input type="file" id="audio-file" name="audio" accept="audio/*,video/mp4" required>
                                    <small>Formatos suportados: MP3, WAV, OGG, M4A, MP4 (máximo 50MB)</small>
                                </div>
                                <div class="form-group">
                                    <label for="audio-title">Título:</label>
                                    <input type="text" id="audio-title" name="title" placeholder="Ex: Chuva na Floresta">
                                </div>
                                <div class="form-group">
                                    <label for="audio-description">Descrição (opcional):</label>
                                    <textarea id="audio-description" name="description" placeholder="Descreva o áudio..."></textarea>
                                </div>
                                <button type="submit" class="btn btn-primary">Enviar Áudio</button>
                            </form>
                        </div>
                        
                            <!-- LISTAR OS ARQUIVOS ENVIADOS -->
                            <div class="audio-files-list" id="audio-files-list">
                                <h5>Seus Áudios:</h5>
                                <div id="audio-files-container">
                                    <p class="loading">Carregando seus arquivos...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                
            </div>

            <!-- HISTÓRICO DAS SESSÕES ANTERIORES-->
            <div class="session-history">
                <div class="accordion-header" id="history-accordion">
                    <h2>Histórico de Sessões</h2>
                    <span class="accordion-icon">▼</span>
                </div>
                <div class="accordion-content" id="history-content">
                    <div id="sessions-list">
                    </div>
                </div>
            </div>
        </main>
    </div>

    <script src="assets/js/meditation.js?v=<?php echo filemtime('assets/js/meditation.js'); ?>"></script>
    <script src="assets/js/app.js?v=<?php echo filemtime('assets/js/app.js'); ?>"></script>
    <script src="assets/js/audio-upload.js?v=<?php echo filemtime('assets/js/audio-upload.js'); ?>"></script>
    
</body>
</html> 