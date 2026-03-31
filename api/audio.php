<?php
session_start();
require_once '../config/database.php';

ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');
ini_set('max_execution_time', 300);
ini_set('memory_limit', '256M');
header('Content-Type: application/json');

// verifies user session
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Não autorizado']);
    exit;
}

$user_id = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'upload':
        handleUpload();
        break;
    case 'list':
        listFiles();
        break;
    case 'get':
        getFile();
        break;
    case 'delete':
        deleteFile();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Ação inválida']);
}

// handles audio upload
function handleUpload() {
    global $user_id;
    
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Erro no upload do arquivo']);
        return;
    }
    
    $file = $_FILES['audio'];
    
    $allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4'];
    $maxSize = 50 * 1024 * 1024;
    
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['success' => false, 'message' => 'Tipo de arquivo não suportado']);
        return;
    }
    
    if ($file['size'] > $maxSize) {
        echo json_encode(['success' => false, 'message' => 'Arquivo muito grande. Máximo 50MB']);
        return;
    }
    
    $uploadDir = __DIR__ . '/../uploads/user-audio/';
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            echo json_encode(['success' => false, 'message' => 'Erro ao criar diretório de upload']);
            return;
        }
    }
    
    if (!is_writable($uploadDir)) {
        chmod($uploadDir, 0777);
        if (!is_writable($uploadDir)) {
            echo json_encode(['success' => false, 'message' => 'Diretório de upload não é gravável']);
            return;
        }
    }
    
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $extension;
    $uploadPath = $uploadDir . $filename;
    
    // log debug
    error_log("Upload Debug - Diretório: $uploadDir");
    error_log("Upload Debug - Caminho completo: $uploadPath");
    error_log("Upload Debug - Arquivo temporário: " . $file['tmp_name']);
    error_log("Upload Debug - Arquivo temporário existe: " . (file_exists($file['tmp_name']) ? 'SIM' : 'NÃO'));
    error_log("Upload Debug - Diretório é gravável: " . (is_writable($uploadDir) ? 'SIM' : 'NÃO'));
    
    if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
        $error = error_get_last();
        error_log("Upload Debug - Erro ao mover arquivo: " . ($error['message'] ?? 'Erro desconhecido'));
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar arquivo: ' . ($error['message'] ?? 'Erro desconhecido')]);
        return;
    }
    
    if (!file_exists($uploadPath)) {
        error_log("Upload Debug - Arquivo não foi salvo: $uploadPath");
        echo json_encode(['success' => false, 'message' => 'Arquivo não foi salvo corretamente']);
        return;
    }
    
    error_log("Upload Debug - Arquivo salvo com sucesso: $uploadPath");
    
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
        unlink($uploadPath);
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar informações: ' . $e->getMessage()]);
    }
}

// list audio files for the current user
function listFiles() {
    global $user_id, $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM audio_files WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("API Audio - User ID: $user_id");
        error_log("API Audio - Files found: " . count($files));
        foreach ($files as $file) {
            error_log("API Audio - File: " . $file['original_name'] . " (active: " . $file['is_active'] . ")");
        }
        
        echo json_encode(['success' => true, 'files' => $files]);
    } catch (Exception $e) {
        error_log("API Audio - Erro: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erro ao buscar arquivos: ' . $e->getMessage()]);
    }
}

function getFile() {
    global $user_id, $pdo;
    
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
        
        header('Content-Type: ' . $file['mime_type']);
        header('Content-Disposition: inline; filename="' . $file['original_name'] . '"');
        header('Content-Length: ' . filesize($fullPath));
        readfile($fullPath);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao buscar arquivo: ' . $e->getMessage()]);
    }
}


function deleteFile() {
    global $user_id, $pdo;
    
    $fileId = $_GET['id'] ?? null;
    if (!$fileId) {
        error_log("Delete Debug - ID do arquivo não fornecido");
        echo json_encode(['success' => false, 'message' => 'ID do arquivo não fornecido']);
        return;
    }
    
    error_log("Delete Debug - Tentando remover arquivo ID: $fileId para usuário: $user_id");
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM audio_files WHERE id = ? AND user_id = ?");
        $stmt->execute([$fileId, $user_id]);
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$file) {
            error_log("Delete Debug - Arquivo não encontrado no banco de dados");
            echo json_encode(['success' => false, 'message' => 'Arquivo não encontrado']);
            return;
        }
        
        error_log("Delete Debug - Arquivo encontrado: " . $file['original_name']);
        
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
