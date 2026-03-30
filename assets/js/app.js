// Navegação, autenticação e AJAX

document.addEventListener('DOMContentLoaded', function() {
    console.log('app.js carregado');
    
    // Navegação entre telas
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(function(screen) {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    // Alterna entre login e registro
    const showRegisterBtn = document.getElementById('show-register');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            if (loginForm && registerForm) {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            } else {
                showScreen('register-screen');
            }
        });
    }
    
    const showLoginBtn = document.getElementById('show-login');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const loginForm = document.getElementById('login-form');
            const registerForm = document.getElementById('register-form');
            if (loginForm && registerForm) {
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            } else {
                showScreen('login-screen');
            }
        });
    }

    // Fazr login
    async function login(email, password) {
        if (!email || !password) {
            alert('Por favor, preencha todos os campos');
            return false;
        }
        
        try {
            const response = await fetch('/api/auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                throw new Error('Erro na requisição');
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Redireciona para dashboard
                window.location.href = '/dashboard.php';
                return true;
            } else {
                alert(result.message || 'Erro no login');
                return false;
            }
        } catch (error) {
            console.error('Erro no login:', error);
            alert('Erro de conexão. Tente novamente.');
            return false;
        }
    }

    // Registrar usuário
    async function register(name, email, password) {
        if (!name || !email || !password) {
            alert('Por favor, preencha todos os campos');
            return false;
        }
        
        try {
            const response = await fetch('/api/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            });
            
            if (!response.ok) {
                throw new Error('Erro na requisição');
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('Usuário registrado com sucesso! Faça login.');
                // Mostrar formulário de login
                const loginForm = document.getElementById('login-form');
                const registerForm = document.getElementById('register-form');
                if (loginForm && registerForm) {
                    registerForm.style.display = 'none';
                    loginForm.style.display = 'block';
                }
                return true;
            } else {
                alert(result.message || 'Erro no registro');
                return false;
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            alert('Erro de conexão. Tente novamente.');
            return false;
        }
    }

    // Event listener para formulário de login
    const loginFormContainer = document.getElementById('login-form');
    if (loginFormContainer) {
        const loginForm = loginFormContainer.querySelector('form');
        if (loginForm) {
            loginForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Formulário de login submetido');
                
                // Buscar inputs diretamente do formulário
                const formData = new FormData(loginForm);
                const email = (formData.get('email') || '').trim();
                const password = formData.get('password') || '';
                
                console.log('Email:', email ? 'preenchido' : 'vazio');
                console.log('Password:', password ? 'preenchido' : 'vazio');
                
                if (!email || !password) {
                    alert('Por favor, preencha todos os campos');
                    return;
                }
                
                await login(email, password);
            });
        } else {
            console.error('Formulário de login não encontrado dentro do container');
        }
    } else {
        console.warn('Container login-form não encontrado');
    }

    // Event listener para formulário de registro
    const registerFormContainer = document.getElementById('register-form');
    if (registerFormContainer) {
        const registerForm = registerFormContainer.querySelector('form');
        if (registerForm) {
            registerForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Formulário de registro submetido');
                
                // Buscar inputs diretamente do formulário
                const formData = new FormData(registerForm);
                const name = (formData.get('name') || '').trim();
                const email = (formData.get('email') || '').trim();
                const password = formData.get('password') || '';
                
                if (!name || !email || !password) {
                    alert('Por favor, preencha todos os campos');
                    return;
                }
                
                await register(name, email, password);
            });
        } else {
            console.error('Formulário de registro não encontrado dentro do container');
        }
    } else {
        console.warn('Container register-form não encontrado');
    }

    // Função para logout
    async function logout() {
        try {
            const response = await fetch('/api/auth.php?action=logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.location.href = '/index.php';
                return true;
            }
        } catch (error) {
            console.error('Erro no logout:', error);
        }
        return false;
    }

    // Event listener para logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Funcionalidades principais (apenas para dashboard)
class MeditationApp {
    constructor() {
        this.initializeApp();
    }
    
    initializeApp() {
        // Só carregar se estiver na página do dashboard
        if (!document.getElementById('sessions-list')) {
            return;
        }
        this.loadSessionHistory();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Atualizar histórico quando o timer terminar de rodar
        if (window.meditationTimer) {
            window.meditationTimer.onComplete = () => {
                this.loadSessionHistory();
            };
        }
    }
    
    async loadSessionHistory() {
        // Verificar se estamos na página correta antes de carregar
        if (!document.getElementById('sessions-list')) {
            return;
        }
        
        try {
            const response = await fetch('/api/sessions.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'list'
                })
            });
            
            if (response.status === 401) {
                // Usuário não autenticado, não fazer nada
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.displaySessions(data.sessions);
            } else {
                console.error('Erro ao carregar sessões:', data.error);
            }
            
        } catch (error) {
            // Silenciar erros de autenticação na página de login
            if (!document.getElementById('sessions-list')) {
                return;
            }
            console.error('Erro ao carregar histórico:', error);
            this.displaySessions([]);
        }
    }
    
    displaySessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        
        if (!sessionsList) return;
        
        if (!sessions || sessions.length === 0) {
            sessionsList.innerHTML = '<div class="empty-state">Nenhuma sessão ainda. Comece sua primeira meditação!</div>';
            return;
        }
        
        const sessionsHtml = sessions.map(session => `
            <div class="session-item">
                <div class="session-info">
                    <div class="session-duration">${this.formatDuration(session.actual_duration)}</div>
                    <div class="session-date">${session.formatted_date || ''}</div>
                </div>
                <div class="session-status">
                    <span class="status-badge ${session.status || ''}">${this.getStatusText(session.status)}</span>
                </div>
            </div>
        `).join('');
        
        sessionsList.innerHTML = sessionsHtml;
    }
    
    // Formatar duração para exibir em minutos
    formatDuration(duration) {
        if (!duration || duration === '--:--:--') {
            return '0 minutos';
        }
        
        // Converter formato HH:MM:SS para minutos
        const parts = duration.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        
        const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);
        
        if (totalMinutes === 0) {
            return '0 minutos';
        } else if (totalMinutes === 1) {
            return '1 minuto';
        } else {
            return `${totalMinutes} minutos`;
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'completed':
                return 'Concluída';
            case 'active':
                return 'Ativa';
            case 'interrupted':
                return 'Interrompida';
            default:
                return status || 'Desconhecido';
        }
    }
    
    // Mostrar notificações
    showNotification(title, message, type = 'info') {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message
            });
        }
        
        // Também mostrar no console pra debug
        console.log(`${title}: ${message}`);
    }
}

// Inicializa o app quando a página carregar (apenas se estiver no dashboard)
document.addEventListener('DOMContentLoaded', () => {
    // Só inicializa MeditationApp se estiver na página do dashboard
    // Verificar se não estamos na página de login/registro
    setTimeout(() => {
        const isLoginPage = document.getElementById('login-form') || document.getElementById('register-form');
        const isDashboardPage = document.getElementById('meditation-timer') || document.getElementById('sessions-list');
        
        if (isDashboardPage && !isLoginPage) {
            window.meditationApp = new MeditationApp();
        }
    }, 100);
    
    // Accordion para o histórico
    const accordionHeader = document.getElementById('history-accordion');
    const accordionContent = document.getElementById('history-content');
    
    if (accordionHeader && accordionContent) {
        accordionHeader.addEventListener('click', function() {
            const isActive = accordionHeader.classList.contains('active');
            
            if (isActive) {
                // Fecha o accordion
                accordionHeader.classList.remove('active');
                accordionContent.classList.remove('active');
            } else {
                // Abre o accordion
                accordionHeader.classList.add('active');
                accordionContent.classList.add('active');
            }
        });
    }
    
    // Accordion para o upload de áudio
    const audioAccordionHeader = document.getElementById('audio-accordion');
    const audioAccordionContent = document.getElementById('audio-content');
    
    if (audioAccordionHeader && audioAccordionContent) {
        audioAccordionHeader.addEventListener('click', function() {
            const isActive = audioAccordionHeader.classList.contains('active');
            
            if (isActive) {
                // Fecha o accordion
                audioAccordionHeader.classList.remove('active');
                audioAccordionContent.classList.remove('active');
            } else {
                // Abre o accordion
                audioAccordionHeader.classList.add('active');
                audioAccordionContent.classList.add('active');
            }
        });
    }
});
