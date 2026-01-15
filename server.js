const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Proxy route for CEP (avoid CORS issues)
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

// Proxy route for CNPJ
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

// Cache for IBGE data
const ibgeCache = new Map();

app.get('/api/ibge/municipios/:uf', async (req, res) => {
    try {
        const { uf } = req.params;
        
        if (ibgeCache.has(uf)) {
            const cached = ibgeCache.get(uf);
            if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
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

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/buscar-dados', (req, res) => {
    res.sendFile(path.join(__dirname, 'buscar-dados.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📁 Página principal: http://localhost:${PORT}/`);
    console.log(`🔍 Buscar dados: http://localhost:${PORT}/buscar-dados`);
});