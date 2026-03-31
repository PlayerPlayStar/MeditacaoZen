<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../includes/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    exit(0);
}

// process POST requests
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'register':
            if (isset($data['name']) && isset($data['email']) && isset($data['password'])) {
                $result = registerUser($data['name'], $data['email'], $data['password']);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
            }
            break;
            
        case 'login':
            if (isset($data['email']) && isset($data['password'])) {
                $result = loginUser($data['email'], $data['password']);
                echo json_encode($result);
            } else {
                echo json_encode(['success' => false, 'message' => 'Email e senha são obrigatórios']);
            }
            break;
            
        case 'logout':
            $result = logout();
            echo json_encode($result);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Ação não reconhecida']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
}