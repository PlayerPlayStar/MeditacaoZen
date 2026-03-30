<?php
/**
 * API para Gerenciar os Arquivos de Áudio
 * 
 * Gerencia todas as operações dos arquivos de áudio do usuário:
 * - Upload de arquivos de áudio personalizados (que o usuário envia)
 * - Lista de arquivos do usuário
 * - Download de arquivos
 * - Exclusão de arquivos
 */

session_start();
require_once '../config/database.php';

// === CONFIGURAÇÕES DE UPLOAD ===
// Configurar PHP para uploads de arquivos grandes
ini_set('upload_max_filesize', '50M');      // Tamanho máximo que um arquivo pode ter
ini_set('post_max_size', '50M');             // Tamanho máximo do POST
ini_set('max_execution_time', 300);          // Tempo máximo de execução (5 minutos)
ini_set('memory_limit', '256M');             // Limite de memória
header('Content-Type: application/json');

// === VERIFICAÇÃO DE AUTENTICAÇÃO ===
// Verifica se o usuário está logado
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Não autorizado']);
    exit;
}

$user_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

// === ROTEAMENTO DE AÇÕES ===
// Direciona requisições para funções baseadas na ação
switch ($action) {
    case 'upload':
        handleUpload();        // Upload de novo arquivo
        break;
    case 'list':
        listFiles();          // Lista arquivos do usuário
        break;
    case 'get':
        getFile();            // Obtém arquivo específico
        break;
    case 'delete':
        deleteFile();         // Exclui arquivo
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Ação inválida']);
}

/**
 * handleUpload() - Processa upload de arquivo de áudio:
 * 
 * - Valida o arquivo enviado
 * - Verifica o tipo MIME permitido
 * - Gera nome único para o arquivo
 * - Salva o arquivo no servidor
 * - Registra as informações no banco de dados
 * - Retorna um JSON com o resultado
 */

function handleUpload() {
    global $user_id;
    
    // === VALIDAÇÃO DO ARQUIVO ===
    // Verifica se o arquivo foi enviado corretamente
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Erro no upload do arquivo']);
        return;
    }
    
    $file = $_FILES['audio'];
    
    // === TIPOS DE ARQUIVO PERMITIDOS ===
    // Lista de tipos MIME aceitos para áudio
    $allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4'];
    $maxSize = 50 * 1024 * 1024; // tamanho máximo de 50MB
    
    // Valida o tipo
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de arquivo não suportado']);
        return;
    }
    
    // Valida o tamanho
    if ($file['size'] > $maxSize) {
        echo json_encode(['success' => false, 'message' => 'Arquivo muito grande. Máximo 50MB']);
        return;
    }
    
    // Prepara a pasta de upload
    $uploadDir = __DIR__ . '/../uploads/user-audio/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            echo json_encode(['success' => false, 'message' => 'Erro ao criar diretório de upload']);
            return;
        }
    }
    
    // Verifica se o diretório aceita uploads
    if (!is_writable($uploadDir)) {
        chmod($uploadDir, 0777);
        if (!is_writable($uploadDir)) {
            echo json_encode(['success' => false, 'message' => 'Diretório de upload não é gravável']);
            return;
        }
    }
    
    // Gera um nome único para o arquivo
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $uploadPath = $uploadDir . $filename;
    
    // Log detalhado para debug
    error_log("Upload Debug - Diretório: $uploadDir");
    error_log("Upload Debug - Caminho completo: $uploadPath");
    error_log("Upload Debug - Arquivo temporário: " . $file['tmp_name']);
    error_log("Upload Debug - Arquivo temporário existe: " . (file_exists($file['tmp_name']) ? 'SIM' : 'NÃO'));
    error_log("Upload Debug - Diretório é gravável: " . (is_writable($uploadDir) ? 'SIM' : 'NÃO'));
    
    // Move o arquivo para a pasta de upload
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        $error = error_get_last();
        error_log("Upload Debug - Erro ao mover arquivo: " . ($error['message'] ?? 'Erro desconhecido'));
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar arquivo: ' . ($error['message'] ?? 'Erro desconhecido')]);
        return;
    }
    
    // Verifica se o arquivo foi salvo
    if (!file_exists($uploadPath)) {
        error_log("Upload Debug - Arquivo não foi salvo: $uploadPath");
        echo json_encode(['success' => false, 'message' => 'Arquivo não foi salvo corretamente']);
        return;
    }
    
    error_log("Upload Debug - Arquivo salvo com sucesso: $uploadPath");
    
    // Salva as informações do arquivo no banco de dados
    try {
        global $pdo;
        $stmt = $pdo->prepare("
            INSERT INTO audio_files (user_id, filename, original_name, file_path, file_size, mime_type, category, title, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $user_id,
            $filename,
            $file['name'],
            '../uploads/user-audio/' . $filename,
            $file['size'],
            $file['type'],
            'custom',
            $file['name'],
            ''
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Arquivo enviado com sucesso',
            'filename' => $filename
        ]);
        
    } catch (Exception $e) {
        unlink($uploadPath); // Remover arquivo se falhou no banco
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar informações: ' . $e->getMessage()]);
    }
}

/**
 * listFiles() - Lista todos os arquivos de áudio do usuário:
 * 
 * - Busca todos os arquivos do usuário no banco de dados
 * - Ordena os arquivos por data de criação (mais recentes primeiro)
 * - Inclui as informações de ativação/desativação
 * - Retorna a lista em formato JSON
 * - Registra logs de debug
 */

function listFiles() {
    global $user_id, $pdo;
    
    try {
        // === CONSULTA BANCO DE DADOS ===
        // Busca todos os arquivos do usuário (ordenados por data)
        $stmt = $pdo->prepare("SELECT * FROM audio_files WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // === LOGS DE DEBUG ===
        // Registra informações para debug
        error_log("API Audio - User ID: $user_id");
        error_log("API Audio - Files found: " . count($files));
        foreach ($files as $file) {
            error_log("API Audio - File: " . $file['original_name'] . " (active: " . $file['is_active'] . ")");
        }
        
        // === RESPOSTA JSON ===
        // Retorna a lista de arquivos JSON
        echo json_encode(['success' => true, 'files' => $files]);
    } catch (Exception $e) {
        // === TRATAMENTO DE ERRO ===
        // Registra e retorna mensagem de erro
        error_log("API Audio - Erro: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erro ao buscar arquivos: ' . $e->getMessage()]);
    }
}

/**
 * getFile() - Obtém um arquivo de áudio específico:
 *
 * - Validar o ID do arquivo fornecido
 * - Verificar se o arquivo pertence ao usuário logado
 * - Buscar o arquivo físico no servidor
 * - Servir o arquivo com headers apropriados
 * - Suporta múltiplos caminhos possíveis
 */

function getFile() {
    global $user_id, $pdo;
    
    // === VALIDAÇÃO DO ID ===
    // Verifica se o ID foi fornecido
    $fileId = $_GET['id'] ?? null;
    if (!$fileId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID do arquivo não fornecido']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM audio_files WHERE id = ? AND user_id = ?");
        $stmt->execute([$fileId, $user_id]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$file) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Arquivo não encontrado']);
            return;
        }
        
        // Busca o arquivo físico no servidor
        $possiblePaths = [
            $file['file_path'],
            __DIR__ . '/' . $file['file_path'],
            __DIR__ . '/../uploads/user-audio/' . basename($file['file_path']),
            __DIR__ . '/../uploads/audio/' . basename($file['file_path'])
        ];
        
        $fullPath = null;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                $fullPath = $path;
                break;
            }
        }
        
        if (!$fullPath) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Arquivo não encontrado no servidor']);
            return;
        }
        
        // Serve o arquivo com headers
        header('Content-Type: ' . $file['mime_type']);
        header('Content-Disposition: inline; filename="' . $file['original_name'] . '"');
        header('Content-Length: ' . filesize($fullPath));
        readfile($fullPath);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao buscar arquivo: ' . $e->getMessage()]);
    }
}

/**
 * deleteFile() - Exclui um arquivo de áudio do usuário:
 * 
 * - Valida o ID do arquivo fornecido
 * - Verifica se o arquivo pertence ao usuário logado
 * - Remove o arquivo físico do servidor
 * - Remove o registro do banco de dados
 * - Registra logs para debug
 */

function deleteFile() {
    global $user_id, $pdo;
    
    // === VALIDAÇÃO DO ID ===
    // Verifica se o ID foi fornecido
    $fileId = $_GET['id'] ?? null;
    if (!$fileId) {
        error_log("Delete Debug - ID do arquivo não fornecido");
        echo json_encode(['success' => false, 'message' => 'ID do arquivo não fornecido']);
        return;
    }
    
    // === LOG DE DEBUG ===
    // Registra tentativa de exclusão
    error_log("Delete Debug - Tentando remover arquivo ID: $fileId para usuário: $user_id");
    
    try {
        // Busca o arquivo no banco de dados
        $stmt = $pdo->prepare("SELECT * FROM audio_files WHERE id = ? AND user_id = ?");
        $stmt->execute([$fileId, $user_id]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$file) {
            error_log("Delete Debug - Arquivo não encontrado no banco de dados");
            echo json_encode(['success' => false, 'message' => 'Arquivo não encontrado']);
            return;
        }
        
        error_log("Delete Debug - Arquivo encontrado: " . $file['original_name']);
        
        // Busca o arquivo físico no servidor em locais diferentes possíveis
        $possiblePaths = [
            $file['file_path'],
            __DIR__ . '/' . $file['file_path'],
            __DIR__ . '/../uploads/user-audio/' . basename($file['file_path']),
            __DIR__ . '/../uploads/audio/' . basename($file['file_path'])
        ];
        
        $fileDeleted = false;
        foreach ($possiblePaths as $path) {
            if (file_exists($path)) {
                if (unlink($path)) {
                    error_log("Delete Debug - Arquivo físico removido: $path");
                    $fileDeleted = true;
                } else {
                    error_log("Delete Debug - Erro ao remover arquivo físico: $path");
                }
                break;
            }
        }
        
        if (!$fileDeleted) {
            error_log("Delete Debug - Arquivo físico não encontrado em nenhum local");
        }
        
        // Remove o registro do banco de dados
        $stmt = $pdo->prepare("DELETE FROM audio_files WHERE id = ? AND user_id = ?");
        $result = $stmt->execute([$fileId, $user_id]);
        
        if ($result) {
            error_log("Delete Debug - Registro removido do banco de dados com sucesso");
            echo json_encode(['success' => true, 'message' => 'Arquivo removido com sucesso']);
        } else {
            error_log("Delete Debug - Erro ao remover registro do banco de dados");
            echo json_encode(['success' => false, 'message' => 'Erro ao remover registro do banco de dados']);
        }
        
    } catch (Exception $e) {
        error_log("Delete Debug - Exceção: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erro ao remover arquivo: ' . $e->getMessage()]);
    }
}
?>
