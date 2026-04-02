USE meditacao_zen;

## TABELA USUÁRIOS ##
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

## TABELA SESSÕES ##
CREATE TABLE IF NOT EXISTS meditation_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    duration INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    interruptions INT DEFAULT 0,
    status ENUM('active', 'completed', 'interrupted') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

## TABELA ARQUIVOS DE ÁUDIO ##
CREATE TABLE IF NOT EXISTS audio_files (
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

## USUÁRIO DE TESTE ##
INSERT INTO users (name, email, password) VALUES 
('Teste', 'teste@meditacao.com', 'teste')
ON DUPLICATE KEY UPDATE name = VALUES(name);

## INDÍCES PARA MELHORAR A RESPOSTA ##
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON meditation_sessions(user_id);
CREATE INDEX idx_sessions_start_time ON meditation_sessions(start_time);
CREATE INDEX idx_sessions_status ON meditation_sessions(status);
CREATE INDEX idx_audio_user_id ON audio_files(user_id);
CREATE INDEX idx_audio_category ON audio_files(category);
CREATE INDEX idx_audio_active ON audio_files(is_active); 