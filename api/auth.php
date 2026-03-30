<?php
/**
 * API para Autenticação de Usuários
 * 
 * Esse arquivo gerencia todas as operações de autenticação para o usuário:
 * - Registra os novos usuários
 * - Login de usuários já cadastrados
 * - Logout de usuários
 * - Valida os dados de entrada
 * - Gerencia as sessões
 */

// === HEADERS HTTP ===
// Configurar headers para API JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// === INCLUSÃO DE FUNÇÕES ===
// Incluir arquivo com funções de autenticação
require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

// === TRATAMENTO DE OPTIONS ===
// Responder a requisiçoes OPTIONS (CORS preflight)
if ($method === 'OPTIONS') {
    exit(0);
}

// === ROTEAMENTO DE AÇÕES ===
// Processar requisições POST para autenticação
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'register':
            // === REGISTRO DE USUÁRIO ===
            // Validar dados obrigatórios e registrar novo usuário
            if (isset($data['name']) && isset($data['email']) && isset($data['password'])) {
                $result = registerUser($data['name'], $data['email'], $data['password']);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
            }
            break;
            
        case 'login':
            // === LOGIN DE USUÁRIO ===
            // Validar credenciais e autenticar usuário
            if (isset($data['email']) && isset($data['password'])) {
                $result = loginUser($data['email'], $data['password']);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'Email e senha são obrigatórios']);
            }
            break;
            
        case 'logout':
            // === LOGOUT DE USUÁRIO ===
            // Derruba o usuário e limpa a sessão
            $result = logout();
            echo json_encode($result);
            break;
            
        default:
            // === AÇÃO NÃO RECONHECIDA ===
            echo json_encode(['success' => false, 'message' => 'Ação não reconhecida']);
    }
} else {
    // === MÉTODO NÃO PERMITIDO ===
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
}