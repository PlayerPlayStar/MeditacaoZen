<?php
session_start();
require_once __DIR__ . '/../config/database.php';

//REGISTRAR USUÁRIO NO SITE
function registerUser($name, $email, $password) {
    global $pdo;
    
    //VERIFICA SE EMAIL JÁ EXISTE
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        return ['success' => false, 'message' => 'Email já cadastrado!'];
    }
    
    //HASH DA SENHA
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    //INSERIR USUÁRIO NO BANCO DE DADOS
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    if ($stmt->execute([$name, $email, $hashedPassword])) {
        return ['success' => true, 'message' => 'Usuário registrado com sucesso!'];
    } else {
        return ['success' => false, 'message' => 'Erro ao registrar usuário'];
    }
}

//FUNÇÃO PRA FAZER LOGIN NO SITE
function loginUser($email, $password) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['name'];
        $_SESSION['user_email'] = $user['email'];
        return ['success' => true, 'user' => $user];
    } else {
        return ['success' => false, 'message' => 'Email ou senha incorretos!'];
    }
}

//VERIFICA SE USUÁRIO ESTÁ LOGADO
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

//LOGOUT
function logout() {
    session_destroy();
    return ['success' => true, 'message' => 'Logout realizado com sucesso!'];
}

//OBTER DADOS DO USER LOGADO
function getCurrentUser() {
    if (isLoggedIn()) {
        return [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'],
            'email' => $_SESSION['user_email']
        ];
    }
    return null;
}
?> 