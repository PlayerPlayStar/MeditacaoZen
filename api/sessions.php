<?php
/**
 * API para Gerenciamento de Sessões de Meditação
 * 
 * Esse arquivo gerencia todas as operações relacionadas às sessões de meditação:
 * - Início de sessões
 * - Finalização de sessões
 * - Listagem de histórico de sessões
 * - Atualização de sessões ativas
 */

// === CONFIGURAÇÕES INICIAIS ===
// Configura o timezone para Brasília
date_default_timezone_set('America/Sao_Paulo');

session_start();

// === HEADERS HTTP ===
// Configurar headers para API JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// === LOGS DE DEBUG ===
// Registra as informações da sessão para debug
error_log("=== API SESSIONS DEBUG ===");
error_log("Session ID: " . session_id());
error_log("User ID: " . ($_SESSION['user_id'] ?? 'NOT SET'));
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
error_log("Request URI: " . $_SERVER['REQUEST_URI']);

// === VERIFICAÇÃO DE AUTENTICAÇÃO ===
// Verifica se o usuário está logado
if (!isset($_SESSION['user_id'])) {
    error_log("Usuário não autenticado");
    http_response_code(401);
    echo json_encode([
        'error' => 'Não autorizado', 
        'session_id' => session_id(),
        'debug' => 'Usuário não está logado'
    ]);
    exit;
}

error_log("Usuário autenticado: " . $_SESSION['user_id']);

// === CONEXÃO COM BANCO DE DADOS ===
require_once '../config/database.php';

$user_id = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

// Direcionar requisições POST para funções específicas
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'start':
            startSession($pdo, $user_id, $input);        // Inicia nova sessão
            break;
            
        case 'complete':
            completeSession($pdo, $user_id, $input);      // Finaliza sessão
            break;
            
        case 'interrupt':
            interruptSession($pdo, $user_id, $input);      // Interrompe sessão
            break;
            
        case 'reactivate':
            reactivateSession($pdo, $user_id, $input);      // Reativa sessão
            break;
            
        case 'list':
            listSessions($pdo, $user_id);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Ação inválida']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido']);
}

/**
 * startSession() - Inicia uma nova sessão de meditação
 * @param PDO $pdo - Conexão com banco de dados
 * @param int $user_id - ID do usuário
 * @param array $input - Dados da requisição (duration, start_time)
 * 
 * - Finaliza qualquer sessão ativa anterior do usuário
 * - Cria nova sessão com status 'active'
 * - Usa timezone de Brasília
 * - Retorna session_id
 */

function startSession($pdo, $user_id, $input) {
    error_log("=== START SESSION ===");
    error_log("Input data: " . json_encode($input));
    
    $duration = $input['duration'] ?? 15;
    
    try {
        // PRIMEIRO: Finalizar qualquer sessão ativa existente
        $stmt = $pdo->prepare("
            UPDATE meditation_sessions 
            SET status = 'interrupted', end_time = NOW() 
            WHERE user_id = ? AND status = 'active'
        ");
        $stmt->execute([$user_id]);
        $interruptedCount = $stmt->rowCount();
        
        if ($interruptedCount > 0) {
            error_log("Finalizadas $interruptedCount sessões ativas anteriores");
        }
        
        // Usar horário atual de Brasília
        $start_time = date('Y-m-d H:i:s');
        error_log("Horário do servidor (Brasília): $start_time");
        
        // Se o cliente forneceu horário, usar ele (mas validar)
        if (isset($input['start_time']) && !empty($input['start_time'])) {
            try {
                $client_time = new DateTime($input['start_time']);
                // Manter o timezone de Brasília
                $client_time->setTimezone(new DateTimeZone('America/Sao_Paulo'));
                $start_time = $client_time->format('Y-m-d H:i:s');
                error_log("Usando horário do cliente (convertido para Brasília): $start_time");
            } catch (Exception $e) {
                error_log("Erro ao processar horário do cliente, usando servidor: " . $e->getMessage());
            }
        }
        
        error_log("Dados finais - User ID: $user_id, Duration: $duration, Start Time: $start_time");
        
        $stmt = $pdo->prepare("
            INSERT INTO meditation_sessions (user_id, duration, start_time, status) 
            VALUES (?, ?, ?, 'active')
        ");
        
        $result = $stmt->execute([$user_id, $duration, $start_time]);
        $session_id = $pdo->lastInsertId();
        
        if ($result && $session_id) {
            error_log("Sessão criada com sucesso - ID: $session_id");
            echo json_encode([
                'success' => true,
                'session_id' => $session_id,
                'message' => 'Sessão iniciada com sucesso',
                'start_time' => $start_time,
                'interrupted_sessions' => $interruptedCount
            ]);
        } else {
            error_log("Falha ao criar sessão");
            http_response_code(500);
            echo json_encode(['error' => 'Falha ao criar sessão no banco de dados']);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao iniciar sessão: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao iniciar sessão: ' . $e->getMessage()]);
    }
}

/**
 * completeSession() - Finaliza uma sessão
 * @param PDO $pdo - Conexão com banco de dados
 * @param int $user_id - ID do usuário
 * @param array $input - Dados da requisição (session_id, end_time)
 * 
 * - Atualiza sessão para status 'completed'
 * - Define end_time da sessão
 * - Verifica se a sessão pertence ao usuário e está mesmo ativa
 */

function completeSession($pdo, $user_id, $input) {
    error_log("=== COMPLETE SESSION ===");
    error_log("Input data: " . json_encode($input));
    
    $session_id = $input['session_id'] ?? null;
    
    if (!$session_id) {
        error_log("ID da sessão não fornecido");
        http_response_code(400);
        echo json_encode(['error' => 'ID da sessão é obrigatório']);
        return;
    }
    
    try {
        // Usar horário atual de Brasília
        $end_time = date('Y-m-d H:i:s');
        error_log("Horário do servidor (Brasília): $end_time");
        
        // Se o cliente forneceu horário, usar ele (mas validar)
        if (isset($input['end_time']) && !empty($input['end_time'])) {
            try {
                $client_time = new DateTime($input['end_time']);
                // Manter o timezone de Brasília
                $client_time->setTimezone(new DateTimeZone('America/Sao_Paulo'));
                $end_time = $client_time->format('Y-m-d H:i:s');
                error_log("Usando horário do cliente (convertido para Brasília): $end_time");
            } catch (Exception $e) {
                error_log("Erro ao processar horário do cliente, usando servidor: " . $e->getMessage());
            }
        }
        
        error_log("Finalizando sessão - Session ID: $session_id, User ID: $user_id, End Time: $end_time");
        
        $stmt = $pdo->prepare("
            UPDATE meditation_sessions 
            SET end_time = ?, status = 'completed' 
            WHERE id = ? AND user_id = ? AND status = 'active'
        ");
        
        $result = $stmt->execute([$end_time, $session_id, $user_id]);
        $rowsAffected = $stmt->rowCount();
        
        error_log("Linhas afetadas na finalização: $rowsAffected");
        
        if ($rowsAffected > 0) {
            error_log("Sessão finalizada com sucesso");
            echo json_encode([
                'success' => true,
                'message' => 'Sessão completada com sucesso',
                'end_time' => $end_time
            ]);
        } else {
            error_log("Sessão não encontrada ou já finalizada");
            http_response_code(404);
            echo json_encode(['error' => 'Sessão não encontrada ou já finalizada']);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao completar sessão: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao completar sessão: ' . $e->getMessage()]);
    }
}

/**
 * interruptSession() - Interrompe uma sessão
 * @param PDO $pdo - Conexão com banco de dados
 * @param int $user_id - ID do usuário
 * @param array $input - Dados da requisição (session_id, end_time)
 * 
 * - Atualiza sessão para status 'interrupted'
 * - Define end_time da sessão
 * - Verifica se a sessão pertence ao usuário e está mesmo ativa
 */

function interruptSession($pdo, $user_id, $input) {
    error_log("=== INTERRUPT SESSION ===");
    error_log("Input data: " . json_encode($input));
    
    $session_id = $input['session_id'] ?? null;
    
    if (!$session_id) {
        error_log("ID da sessão não fornecido");
        http_response_code(400);
        echo json_encode(['error' => 'ID da sessão é obrigatório']);
        return;
    }
    
    try {
        // Usar horário atual de Brasília
        $end_time = date('Y-m-d H:i:s');
        error_log("Horário do servidor (Brasília): $end_time");
        
        // Se o cliente forneceu horário, usar ele (mas validar)
        if (isset($input['end_time']) && !empty($input['end_time'])) {
            try {
                $client_time = new DateTime($input['end_time']);
                // Manter o timezone de Brasília
                $client_time->setTimezone(new DateTimeZone('America/Sao_Paulo'));
                $end_time = $client_time->format('Y-m-d H:i:s');
                error_log("Usando horário do cliente (convertido para Brasília): $end_time");
            } catch (Exception $e) {
                error_log("Erro ao processar horário do cliente, usando servidor: " . $e->getMessage());
            }
        }
        
        error_log("Interrompendo sessão - Session ID: $session_id, User ID: $user_id, End Time: $end_time");
        
        $stmt = $pdo->prepare("
            UPDATE meditation_sessions 
            SET end_time = ?, status = 'interrupted' 
            WHERE id = ? AND user_id = ? AND status = 'active'
        ");
        
        $result = $stmt->execute([$end_time, $session_id, $user_id]);
        $rowsAffected = $stmt->rowCount();
        
        error_log("Linhas afetadas na interrupção: $rowsAffected");
        
        if ($rowsAffected > 0) {
            error_log("Sessão interrompida com sucesso");
            echo json_encode([
                'success' => true,
                'message' => 'Sessão interrompida com sucesso',
                'end_time' => $end_time
            ]);
        } else {
            error_log("Sessão não encontrada ou já finalizada");
            http_response_code(404);
            echo json_encode(['error' => 'Sessão não encontrada ou já finalizada']);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao interromper sessão: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao interromper sessão: ' . $e->getMessage()]);
    }
}

/**
 * reactivateSession() - Reativa uma sessão interrompida
 * @param PDO $pdo - Conexão com banco de dados
 * @param int $user_id - ID do usuário
 * @param array $input - Dados da requisição (session_id)
 * 
 * - Atualiza sessão para status 'active'
 * - Limpa end_time para indicar que está em andamento
 * - Verifica se a sessão pertence ao usuário e está 'interrupted'
 */

function reactivateSession($pdo, $user_id, $input) {
    error_log("=== REACTIVATE SESSION ===");
    error_log("Input data: " . json_encode($input));
    
    $session_id = $input['session_id'] ?? null;
    
    if (!$session_id) {
        error_log("ID da sessão não fornecido");
        http_response_code(400);
        echo json_encode(['error' => 'ID da sessão é obrigatório']);
        return;
    }
    
    try {
        error_log("Reativando sessão - Session ID: $session_id, User ID: $user_id");
        
        $stmt = $pdo->prepare("
            UPDATE meditation_sessions 
            SET status = 'active', end_time = NULL 
            WHERE id = ? AND user_id = ? AND status = 'interrupted'
        ");
        
        $result = $stmt->execute([$session_id, $user_id]);
        $rowsAffected = $stmt->rowCount();
        
        error_log("Linhas afetadas na reativação: $rowsAffected");
        
        if ($rowsAffected > 0) {
            error_log("Sessão reativada com sucesso");
            echo json_encode([
                'success' => true,
                'message' => 'Sessão reativada com sucesso'
            ]);
        } else {
            error_log("Sessão não encontrada ou não pode ser reativada");
            http_response_code(404);
            echo json_encode(['error' => 'Sessão não encontrada ou não pode ser reativada']);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao reativar sessão: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao reativar sessão: ' . $e->getMessage()]);
    }
}

/**
 * listSessions() - Lista histórico de sessões do usuário
 * @param PDO $pdo - Conexão com banco de dados
 * @param int $user_id - ID do usuário
 * 
 * - Busca últimas 10 sessões do usuário
 * - Ordena por data de início (mais recentes primeiro)
 * - Calcula duração para sessões completadas
 * - Formata datas para exibição
 * - Retorna lista em JSON
 */

function listSessions($pdo, $user_id) {
    error_log("=== LIST SESSIONS ===");
    error_log("User ID: $user_id");
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, duration, start_time, end_time, status, interruptions
            FROM meditation_sessions 
            WHERE user_id = ? 
            ORDER BY start_time DESC 
            LIMIT 10
        ");
        
        $stmt->execute([$user_id]);
        $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("Sessões encontradas: " . count($sessions));
        
        // Processar cada sessão
        foreach ($sessions as &$session) {
            // Calcular duração real
            if ($session['end_time'] && $session['start_time']) {
                $start = new DateTime($session['start_time']);
                $end = new DateTime($session['end_time']);
                $duration = $end->diff($start);
                $session['actual_duration'] = $duration->format('%H:%I:%S');
            } else {
                $session['actual_duration'] = '--:--:--';
            }
            
            // Formatar data para exibição
            $start_time = new DateTime($session['start_time']);
            $start_time->setTimezone(new DateTimeZone('America/Sao_Paulo'));
            
            // Para sessões ativas, usar o horário atual de Brasília
            if ($session['status'] === 'active') {
                $current_time = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
                $session['formatted_date'] = $current_time->format('d/m/Y H:i');
                $session['formatted_date_full'] = $current_time->format('d/m/Y H:i:s');
                $session['is_active'] = true;
                $session['start_time_iso'] = $current_time->format('c'); // ISO format para JavaScript
                
                // Calcula duração em tempo real
                $session_start = new DateTime($session['start_time'], new DateTimeZone('America/Sao_Paulo'));
                $now = new DateTime('now', new DateTimeZone('America/Sao_Paulo'));
                $duration = $now->diff($session_start);
                $session['actual_duration'] = $duration->format('%H:%I:%S');
            } else {
                $session['formatted_date'] = $start_time->format('d/m/Y H:i');
                $session['formatted_date_full'] = $start_time->format('d/m/Y H:i:s');
                $session['is_active'] = false;
                $session['start_time_iso'] = $start_time->format('c');
            }
            
            // Adiciona informações de timezone
            $session['timezone'] = 'America/Sao_Paulo';
            $session['timezone_offset'] = $start_time->getOffset() / 3600;
        }
        
        error_log("Sessões processadas com sucesso");
        echo json_encode([
            'success' => true,
            'sessions' => $sessions,
            'total' => count($sessions)
        ]);
        
    } catch (Exception $e) {
        error_log("Erro ao listar sessões: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao listar sessões: ' . $e->getMessage()]);
    }
}
?> 