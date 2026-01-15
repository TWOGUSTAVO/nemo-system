const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database file
const DB_FILE = path.join(__dirname, 'database.json');

// Load database
async function loadDatabase() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Create initial database
        const initialData = {
            users: [
                {
                    id: 1,
                    username: 'Nemo',
                    password: 'gustavo2709',
                    name: 'Administrador Nemo',
                    email: 'admin@blacknet.dev',
                    isAdmin: true,
                    createdAt: new Date().toISOString(),
                    lastLogin: null
                }
            ],
            sessions: [],
            apiKeys: {},
            logs: []
        };
        
        await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2));
        return initialData;
    }
}

// Save database
async function saveDatabase(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// Hash password (simplified for demo)
function hashPassword(password) {
    // In production, use bcrypt or similar
    return require('crypto').createHash('sha256').update(password).digest('hex');
}

// Auth middleware
async function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    try {
        const db = await loadDatabase();
        const session = db.sessions.find(s => s.token === token);
        
        if (!session || new Date(session.expiresAt) < new Date()) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }
        
        const user = db.users.find(u => u.id === session.userId);
        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado' });
        }
        
        req.user = user;
        req.session = session;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Erro na autenticação' });
    }
}

// Admin middleware
function requireAdmin(req, res, next) {
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Verify token
app.post('/api/verify-token', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ valid: false });
    }
    
    try {
        const db = await loadDatabase();
        const session = db.sessions.find(s => s.token === token);
        
        if (!session || new Date(session.expiresAt) < new Date()) {
            return res.json({ valid: false });
        }
        
        const user = db.users.find(u => u.id === session.userId);
        if (!user) {
            return res.json({ valid: false });
        }
        
        res.json({
            valid: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            }
        });
    } catch (error) {
        res.status(500).json({ valid: false });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const db = await loadDatabase();
        
        const user = db.users.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Usuário não encontrado' 
            });
        }
        
        // Simple password check (in production use bcrypt)
        const hashedPassword = hashPassword(password);
        if (hashedPassword !== user.password) {
            return res.status(401).json({ 
                success: false, 
                message: 'Senha incorreta' 
            });
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        
        // Generate token
        const token = require('crypto').randomBytes(32).toString('hex');
        
        // Create session
        const session = {
            userId: user.id,
            token,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        db.sessions.push(session);
        
        // Log activity
        db.logs.push({
            userId: user.id,
            action: 'login',
            details: `Login from ${req.ip}`,
            timestamp: new Date().toISOString()
        });
        
        await saveDatabase(db);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro no servidor' 
        });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { name, username, email, password } = req.body;
        const db = await loadDatabase();
        
        // Check if user exists
        if (db.users.some(u => u.username === username)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nome de usuário já está em uso' 
            });
        }
        
        if (db.users.some(u => u.email === email)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email já está cadastrado' 
            });
        }
        
        // Create new user
        const newUser = {
            id: db.users.length + 1,
            username,
            password: hashPassword(password),
            name,
            email,
            isAdmin: false,
            createdAt: new Date().toISOString(),
            lastLogin: null
        };
        
        db.users.push(newUser);
        
        // Log activity
        db.logs.push({
            userId: newUser.id,
            action: 'register',
            details: `New user registered: ${username}`,
            timestamp: new Date().toISOString()
        });
        
        await saveDatabase(db);
        
        res.json({
            success: true,
            message: 'Usuário criado com sucesso'
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro no servidor' 
        });
    }
});

// Logout
app.post('/api/logout', authenticate, async (req, res) => {
    try {
        const db = await loadDatabase();
        db.sessions = db.sessions.filter(s => s.token !== req.session.token);
        
        // Log activity
        db.logs.push({
            userId: req.user.id,
            action: 'logout',
            details: `User logged out`,
            timestamp: new Date().toISOString()
        });
        
        await saveDatabase(db);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Admin: Get all users
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
    try {
        const db = await loadDatabase();
        const users = db.users.map(user => ({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
        }));
        
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar usuários' });
    }
});

// Admin: Delete user
app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const db = await loadDatabase();
        
        // Prevent deleting self or other admins
        const user = db.users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        if (user.isAdmin && user.id !== req.user.id) {
            return res.status(403).json({ error: 'Não é possível excluir outros administradores' });
        }
        
        if (user.id === req.user.id) {
            return res.status(403).json({ error: 'Não é possível excluir a si mesmo' });
        }
        
        // Remove user and their sessions
        db.users = db.users.filter(u => u.id !== userId);
        db.sessions = db.sessions.filter(s => s.userId !== userId);
        
        // Log activity
        db.logs.push({
            userId: req.user.id,
            action: 'delete_user',
            details: `Deleted user: ${user.username} (ID: ${user.id})`,
            timestamp: new Date().toISOString()
        });
        
        await saveDatabase(db);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

// Admin: Get system logs
app.get('/api/admin/logs', authenticate, requireAdmin, async (req, res) => {
    try {
        const db = await loadDatabase();
        const limit = parseInt(req.query.limit) || 100;
        
        res.json({ 
            logs: db.logs.slice(-limit).reverse() 
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar logs' });
    }
});

// Existing API routes (CEP, CNPJ, etc.)
app.get('/api/cep/:cep', async (req, res) => {
    try {
        const { cep } = req.params;
        const cleanCEP = cep.replace(/\D/g, '');
        
        if (cleanCEP.length !== 8) {
            return res.status(400).json({ error: 'CEP inválido' });
        }
        
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (data.erro) {
            return res.status(404).json({ error: 'CEP não encontrado' });
        }
        
        res.json(data);
    } catch (error) {
        console.error('CEP API Error:', error);
        res.status(500).json({ error: 'Erro ao consultar CEP' });
    }
});

app.get('/api/cnpj/:cnpj', async (req, res) => {
    try {
        const { cnpj } = req.params;
        const cleanCNPJ = cnpj.replace(/\D/g, '');
        
        if (cleanCNPJ.length !== 14) {
            return res.status(400).json({ error: 'CNPJ inválido' });
        }
        
        const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'ERROR') {
            return res.status(404).json({ error: data.message || 'CNPJ não encontrado' });
        }
        
        res.json(data);
    } catch (error) {
        console.error('CNPJ API Error:', error);
        res.status(500).json({ error: 'Erro ao consultar CNPJ' });
    }
});

const ibgeCache = new Map();

app.get('/api/ibge/municipios/:uf', async (req, res) => {
    try {
        const { uf } = req.params;
        
        if (ibgeCache.has(uf)) {
            const cached = ibgeCache.get(uf);
            if (Date.now() - cached.timestamp < 3600000) {
                return res.json(cached.data);
            }
        }
        
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        const data = await response.json();
        
        ibgeCache.set(uf, {
            data,
            timestamp: Date.now()
        });
        
        res.json(data);
    } catch (error) {
        console.error('IBGE API Error:', error);
        res.status(500).json({ error: 'Erro ao consultar municípios' });
    }
});

// Security APIs (require authentication)
app.get('/api/security/shodan/:ip', authenticate, async (req, res) => {
    try {
        // This would require a real Shodan API key
        const { ip } = req.params;
        // Mock response for demo
        res.json({
            ip,
            ports: [80, 443, 22, 21],
            org: "Example ISP",
            location: "Brazil",
            last_update: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro na consulta Shodan' });
    }
});

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api', (req, res) => {
    res.sendFile(path.join(__dirname, 'api.html'));
});

app.get('/buscar-dados', (req, res) => {
    res.sendFile(path.join(__dirname, 'buscar-dados.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor BlackNet rodando em http://localhost:${PORT}`);
    console.log(`🔐 Login: http://localhost:${PORT}/`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`👑 Admin: http://localhost:${PORT}/admin (usuário: Nemo, senha: gustavo2709)`);
    console.log(`🔧 APIs: http://localhost:${PORT}/api`);
});
