<?php
//INICIO DE SESSÃO
session_start();
require_once 'config/database.php';

//VERIFICAR O LOGIN
if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit;
}

//PROCESSAR LOGIN
if ($_POST && isset($_POST['action']) && $_POST['action'] == 'login') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if ($email && $password) {
        //CONSULTAR O BANCO DE DADOS
        $stmt = $pdo->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        //VALIDAR CREDENCIAIS
        if ($user && password_verify($password, $user['password'])) {
            //CRIAR UMA SESSÃO
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            header('Location: dashboard.php');
            exit;
        } else {
            $error = "Email ou senha incorretos";
        }
    } else {
        $error = "Preencha todos os campos";
    }
}

//PROCESSAR REGISTRO DO USUÁRIO
if ($_POST && isset($_POST['action']) && $_POST['action'] == 'register') {
    $name = $_POST['name'] ?? '';
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if ($name && $email && $password) {
        //VERIFICADOR DE EMAIL
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            $error = "Este email já está cadastrado";
        } else {
            //CRIAR NOVO USUÁRIO
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())");
            
            if ($stmt->execute([$name, $email, $hashedPassword])) {
                $success = "Usuário criado com sucesso! Faça login.";
            } else {
                $error = "Erro ao criar usuário";
            }
        }
    } else {
        $error = "Preencha todos os campos";
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zen</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="auth-page">
    <div class="container">
        <div class="auth-container">
            <div class="logo">
                <h1>Meditação Zen</h1>
                <p>Encontre sua paz interior</p>
            </div>

            <?php if (isset($error)): ?>
                <div class="alert alert-error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <?php if (isset($success)): ?>
                <div class="alert alert-success"><?php echo htmlspecialchars($success); ?></div>
            <?php endif; ?>

            <!-- FORMULÁRIO DE LOGIN -->
            <div class="auth-form" id="login-form">
                <h2>Entrar</h2>
                <form method="POST">
                    <input type="hidden" name="action" value="login">
                    <div class="form-group">
                        <input type="email" name="email" placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" name="password" placeholder="Senha" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Entrar</button>
                </form>
                <p class="auth-switch">
                    Não tem conta? <a href="#" id="show-register">Cadastre-se</a>
                </p>
            </div>

            <!-- FORMULÁRIO DE CADASTRO -->
            <div class="auth-form" id="register-form" style="display: none;">
                <h2>Cadastrar</h2>
                <form method="POST">
                    <input type="hidden" name="action" value="register">
                    <div class="form-group">
                        <input type="text" name="name" placeholder="Nome completo" required>
                    </div>
                    <div class="form-group">
                        <input type="email" name="email" placeholder="Email" required>
                    </div>
                    <div class="form-group">
                        <input type="password" name="password" placeholder="Senha" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Cadastrar</button>
                </form>
                <p class="auth-switch">
                    Já tem conta? <a href="#" id="show-login">Faça login</a>
                </p>
            </div>
        </div>
    </div>

    <script src="assets/js/app.js?v=<?php echo filemtime('assets/js/app.js') . '_' . time(); ?>"></script>
</body>
</html> 