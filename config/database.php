<?php
// Configuração do banco de dados
define('DB_HOST', 'mysql');
define('DB_NAME', 'meditacao_zen');
define('DB_USER', 'meditacao_user');
define('DB_PASS', 'meditacao_pass');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Configurar charset para utf8mb4
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("SET CHARACTER SET utf8mb4");
} catch(PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}

// Criar tabelas se não existirem
$sql_users = "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)";

$sql_sessions = "CREATE TABLE IF NOT EXISTS meditation_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    duration INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    interruptions INT DEFAULT 0,
    status ENUM('active', 'completed', 'interrupted') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id)
)";

$sql_audio_files = "CREATE TABLE IF NOT EXISTS audio_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    duration INT DEFAULT 0,
    category ENUM('noite', 'calmaria', 'custom') DEFAULT 'custom',
    title VARCHAR(200),
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)";

try {
    $pdo->exec($sql_users);
    $pdo->exec($sql_sessions);
    $pdo->exec($sql_audio_files);
} catch(PDOException $e) {
    die("Erro ao criar tabelas: " . $e->getMessage());
} 