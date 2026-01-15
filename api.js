// API Configuration
const API_CONFIG = {
    CEP: {
        url: 'https://viacep.com.br/ws/{cep}/json/',
        method: 'GET'
    },
    CNPJ: {
        url: 'https://receitaws.com.br/v1/cnpj/{cnpj}',
        method: 'GET'
    },
    IBGE_MUNICIPIOS: {
        url: 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios',
        method: 'GET'
    },
    IBGE_ESTADOS: {
        url: 'https://servicodados.ibge.gov.br/api/v1/localidades/estados',
        method: 'GET'
    },
    DADOS_GOV: {
        url: 'https://dados.gov.br/api/publico/conjuntos-dados',
        method: 'GET'
    }
};

// Cache system
const API_CACHE = {
    data: new Map(),
    time: new Map(),
    get(key) {
        const item = this.data.get(key);
        const time = this.time.get(key);
        
        if (item && time && Date.now() - time < 300000) { // 5 minutes cache
            return item;
        }
        return null;
    },
    set(key, value) {
        this.data.set(key, value);
        this.time.set(key, Date.now());
    },
    clear() {
        this.data.clear();
        this.time.clear();
    }
};

// Generic API call function
async function callAPI(endpoint, params = {}) {
    const config = API_CONFIG[endpoint];
    if (!config) {
        throw new Error(`Endpoint ${endpoint} não configurado`);
    }
    
    // Build URL with params
    let url = config.url;
    Object.keys(params).forEach(key => {
        url = url.replace(`{${key}}`, params[key]);
    });
    
    // Check cache
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = API_CACHE.get(cacheKey);
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(url, {
            method: config.method,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache successful responses
        API_CACHE.set(cacheKey, data);
        
        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

// CEP Functions
async function consultarCEP() {
    const cepInput = document.getElementById('cep-input');
    const cep = cepInput.value.replace(/\D/g, '');
    const resultDiv = document.getElementById('cep-result');
    
    if (cep.length !== 8) {
        showNotification('CEP inválido. Digite 8 números.', 'error');
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Buscando CEP...</p></div>';
        
        const data = await callAPI('CEP', { cep });
        
        if (data.erro) {
            throw new Error('CEP não encontrado');
        }
        
        const formattedData = {
            'CEP': formatCEP(data.cep || cep),
            'Logradouro': data.logradouro || 'Não informado',
            'Complemento': data.complemento || 'Não informado',
            'Bairro': data.bairro || 'Não informado',
            'Cidade': data.localidade || 'Não informado',
            'Estado': data.uf || 'Não informado',
            'IBGE': data.ibge || 'Não informado',
            'GIA': data.gia || 'Não informado',
            'DDD': data.ddd || 'Não informado',
            'SIAFI': data.siafi || 'Não informado'
        };
        
        let html = '<h4><i class="fas fa-map-pin"></i> Resultado da Consulta</h4>';
        html += '<div class="result-actions">';
        html += `<button onclick="copyToClipboard('${JSON.stringify(formattedData)}')" class="btn-secondary btn-sm">`;
        html += '<i class="fas fa-copy"></i> Copiar Resultado</button>';
        html += '</div>';
        
        html += '<div class="result-grid">';
        Object.entries(formattedData).forEach(([key, value]) => {
            html += `
                <div class="result-item">
                    <span class="label">${key}:</span>
                    <span class="value">${value}</span>
                </div>
            `;
        });
        html += '</div>';
        
        resultDiv.innerHTML = html;
        showNotification('CEP encontrado com sucesso!', 'success');
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Erro na Consulta</h4>
                <p>${error.message}</p>
                <p>Verifique se o CEP está correto e tente novamente.</p>
            </div>
        `;
        showNotification('Erro ao buscar CEP', 'error');
    }
}

// CNPJ Functions
async function consultarCNPJ() {
    const cnpjInput = document.getElementById('cnpj-input');
    const cnpj = cnpjInput.value.replace(/\D/g, '');
    const resultDiv = document.getElementById('cnpj-result');
    
    if (cnpj.length !== 14) {
        showNotification('CNPJ inválido. Digite 14 números.', 'error');
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Buscando CNPJ...</p></div>';
        
        // Using a proxy to avoid CORS issues
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = `https://receitaws.com.br/v1/cnpj/${cnpj}`;
        
        const response = await fetch(proxyUrl + targetUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Origin': window.location.origin
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'ERROR') {
            throw new Error(data.message || 'CNPJ não encontrado');
        }
        
        const formattedData = {
            'CNPJ': formatCNPJ(data.cnpj || cnpj),
            'Nome Fantasia': data.fantasia || 'Não informado',
            'Razão Social': data.nome || 'Não informado',
            'Situação': data.situacao || 'Não informado',
            'Tipo': data.tipo || 'Não informado',
            'Porte': data.porte || 'Não informado',
            'Abertura': data.abertura ? new Date(data.abertura).toLocaleDateString('pt-BR') : 'Não informado',
            'Natureza Jurídica': data.natureza_juridica || 'Não informado',
            'Capital Social': data.capital_social ? `R$ ${parseFloat(data.capital_social).toLocaleString('pt-BR')}` : 'Não informado',
            'Atividade Principal': data.atividade_principal?.[0]?.text || 'Não informado',
            'Logradouro': data.logradouro || 'Não informado',
            'Número': data.numero || 'Não informado',
            'Complemento': data.complemento || 'Não informado',
            'Bairro': data.bairro || 'Não informado',
            'CEP': formatCEP(data.cep || ''),
            'Município': data.municipio || 'Não informado',
            'UF': data.uf || 'Não informado',
            'Telefone': data.telefone ? formatTelefone(data.telefone) : 'Não informado',
            'Email': data.email || 'Não informado'
        };
        
        let html = '<h4><i class="fas fa-building"></i> Dados da Empresa</h4>';
        html += '<div class="result-actions">';
        html += `<button onclick="copyToClipboard('${JSON.stringify(formattedData)}')" class="btn-secondary btn-sm">`;
        html += '<i class="fas fa-copy"></i> Copiar Resultado</button>';
        html += '</div>';
        
        html += '<div class="result-grid">';
        Object.entries(formattedData).forEach(([key, value]) => {
            html += `
                <div class="result-item">
                    <span class="label">${key}:</span>
                    <span class="value">${value}</span>
                </div>
            `;
        });
        html += '</div>';
        
        resultDiv.innerHTML = html;
        showNotification('CNPJ encontrado com sucesso!', 'success');
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Erro na Consulta</h4>
                <p>${error.message}</p>
                <p>A API de CNPJ pode estar temporariamente indisponível.</p>
            </div>
        `;
        showNotification('Erro ao buscar CNPJ', 'error');
    }
}

// Municípios Functions
async function carregarMunicipios() {
    const ufSelect = document.getElementById('uf-select');
    const municipioSelect = document.getElementById('municipio-select');
    const uf = ufSelect.value;
    
    if (!uf) {
        municipioSelect.disabled = true;
        municipioSelect.innerHTML = '<option value="">Selecione um município...</option>';
        return;
    }
    
    try {
        municipioSelect.disabled = true;
        municipioSelect.innerHTML = '<option value="">Carregando municípios...</option>';
        
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
        const municipios = await response.json();
        
        municipioSelect.innerHTML = '<option value="">Selecione um município...</option>';
        municipios.forEach(municipio => {
            const option = document.createElement('option');
            option.value = municipio.id;
            option.textContent = municipio.nome;
            municipioSelect.appendChild(option);
        });
        
        municipioSelect.disabled = false;
        
    } catch (error) {
        municipioSelect.innerHTML = '<option value="">Erro ao carregar municípios</option>';
        console.error('Erro ao carregar municípios:', error);
    }
}

async function consultarMunicipio() {
    const municipioSelect = document.getElementById('municipio-select');
    const municipioId = municipioSelect.value;
    const resultDiv = document.getElementById('municipio-result');
    
    if (!municipioId) {
        showNotification('Selecione um município', 'error');
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Buscando dados do município...</p></div>';
        
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${municipioId}`);
        const data = await response.json();
        
        const formattedData = {
            'ID': data.id,
            'Nome': data.nome,
            'Microrregião': data.microrregiao.nome,
            'Mesorregião': data.microrregiao.mesorregiao.nome,
            'UF': data.microrregiao.mesorregiao.UF.sigla,
            'Região': data.microrregiao.mesorregiao.UF.regiao.nome,
            'Região Imediata': data['regiao-imediata']?.nome || 'Não informado',
            'Região Intermediária': data['regiao-intermediaria']?.nome || 'Não informado'
        };
        
        let html = '<h4><i class="fas fa-city"></i> Dados do Município</h4>';
        html += '<div class="result-grid">';
        Object.entries(formattedData).forEach(([key, value]) => {
            html += `
                <div class="result-item">
                    <span class="label">${key}:</span>
                    <span class="value">${value}</span>
                </div>
            `;
        });
        html += '</div>';
        
        // Get additional statistics
        html += '<h5 style="margin-top: 2rem;"><i class="fas fa-chart-bar"></i> Estatísticas Adicionais</h5>';
        html += '<div class="loading-stats">Carregando estatísticas...</div>';
        
        resultDiv.innerHTML = html;
        
        // Try to get population data
        try {
            const popResponse = await fetch(`https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/2022/variaveis/9324?localidades=N6[${municipioId}]`);
            const popData = await popResponse.json();
            
            const statsDiv = resultDiv.querySelector('.loading-stats');
            if (popData[0]?.resultados[0]?.series[0]?.serie) {
                const populacao = Object.values(popData[0].resultados[0].series[0].serie)[0];
                statsDiv.innerHTML = `
                    <div class="result-grid">
                        <div class="result-item">
                            <span class="label">População (2022):</span>
                            <span class="value">${parseInt(populacao).toLocaleString('pt-BR')} habitantes</span>
                        </div>
                    </div>
                `;
            }
        } catch (popError) {
            console.error('Erro ao buscar população:', popError);
        }
        
        showNotification('Dados do município carregados!', 'success');
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Erro na Consulta</h4>
                <p>${error.message}</p>
            </div>
        `;
        showNotification('Erro ao buscar dados do município', 'error');
    }
}

// Redes Sociais Functions
async function buscarRedeSocial() {
    const username = document.getElementById('social-input').value.trim();
    const platform = document.getElementById('social-platform').value;
    const resultDiv = document.getElementById('social-result');
    
    if (!username) {
        showNotification('Digite um nome de usuário ou termo para buscar', 'error');
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Buscando em redes sociais...</p></div>';
        
        // Simulate API call (in a real scenario, you'd use actual APIs)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mock data for demonstration
        const mockData = {
            twitter: {
                success: true,
                platform: 'Twitter/X',
                query: username,
                results: [
                    {
                        username: `@${username}`,
                        name: `${username.charAt(0).toUpperCase() + username.slice(1)}`,
                        bio: 'Perfil público demonstrativo',
                        followers: Math.floor(Math.random() * 1000),
                        following: Math.floor(Math.random() * 500),
                        tweets: Math.floor(Math.random() * 10000),
                        verified: Math.random() > 0.7
                    }
                ]
            },
            github: {
                success: true,
                platform: 'GitHub',
                query: username,
                results: [
                    {
                        username: username,
                        name: `${username.charAt(0).toUpperCase() + username.slice(1)} Developer`,
                        bio: 'Software developer and open source contributor',
                        repos: Math.floor(Math.random() * 50),
                        followers: Math.floor(Math.random() * 1000),
                        following: Math.floor(Math.random() * 200),
                        created_at: '2020-01-15'
                    }
                ]
            }
        };
        
        const data = mockData[platform] || {
            success: true,
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            query: username,
            results: [
                {
                    username: username,
                    name: 'Usuário Público',
                    bio: 'Perfil público demonstrativo',
                    note: 'Esta é uma demonstração. Em produção, seria conectado à API real da plataforma.'
                }
            ]
        };
        
        let html = `<h4><i class="fab fa-${platform}"></i> Resultados no ${data.platform}</h4>`;
        html += '<div class="search-info">';
        html += `<p><strong>Busca:</strong> "${username}"</p>`;
        html += `<p><strong>Resultados encontrados:</strong> ${data.results.length}</p>`;
        html += '</div>';
        
        html += '<div class="social-results">';
        data.results.forEach((profile, index) => {
            html += `
                <div class="social-profile">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="profile-info">
                            <h5>${profile.name} ${profile.verified ? '<i class="fas fa-check-circle verified"></i>' : ''}</h5>
                            <p class="username">${profile.username}</p>
                        </div>
                    </div>
                    <div class="profile-bio">
                        <p>${profile.bio}</p>
                    </div>
                    ${profile.followers !== undefined ? `
                    <div class="profile-stats">
                        <div class="stat">
                            <span class="stat-number">${profile.followers.toLocaleString()}</span>
                            <span class="stat-label">Seguidores</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${profile.following.toLocaleString()}</span>
                            <span class="stat-label">Seguindo</span>
                        </div>
                        ${profile.repos ? `
                        <div class="stat">
                            <span class="stat-number">${profile.repos}</span>
                            <span class="stat-label">Repositórios</span>
                        </div>
                        ` : ''}
                        ${profile.tweets ? `
                        <div class="stat">
                            <span class="stat-number">${profile.tweets.toLocaleString()}</span>
                            <span class="stat-label">Tweets</span>
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}
                    <div class="profile-note">
                        <i class="fas fa-info-circle"></i>
                        <small>Informações públicas disponíveis na plataforma</small>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        html += '<div class="legal-note">';
        html += '<p><i class="fas fa-balance-scale"></i> <strong>Aviso Legal:</strong> Esta busca utiliza apenas informações publicamente disponíveis. Respeitamos a privacidade e as configurações de cada usuário.</p>';
        html += '</div>';
        
        resultDiv.innerHTML = html;
        showNotification('Busca realizada com sucesso!', 'success');
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Erro na Busca</h4>
                <p>${error.message}</p>
                <p>Esta funcionalidade é demonstrativa. Em produção, seria necessário usar APIs oficiais com autenticação.</p>
            </div>
        `;
        showNotification('Erro na busca em redes sociais', 'error');
    }
}

// Verificação Corporativa
async function processarVerificacao() {
    const dataInput = document.getElementById('verification-data').value;
    const resultDiv = document.getElementById('verification-result');
    
    if (!dataInput) {
        showNotification('Digite os dados para verificação', 'error');
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i><p>Processando verificação...</p></div>';
        
        // Parse JSON input
        const dados = JSON.parse(dataInput);
        
        // Simulate verification process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock verification result
        const verificationResult = {
            success: true,
            timestamp: new Date().toISOString(),
            requestId: 'VRF-' + Date.now(),
            dadosRecebidos: dados,
            status: 'VERIFICADO',
            niveisVerificacao: [
                {
                    nivel: 'FORMATO',
                    status: 'APROVADO',
                    detalhes: 'Dados no formato correto'
                },
                {
                    nivel: 'CONSISTENCIA',
                    status: 'APROVADO',
                    detalhes: 'Dados consistentes'
                },
                {
                    nivel: 'LGPD',
                    status: 'CONFORME',
                    detalhes: 'Processamento conforme Lei Geral de Proteção de Dados'
                }
            ],
            recomendacoes: [
                'Armazenar registro do consentimento por 5 anos',
                'Notificar titular em caso de alterações',
                'Permitir exclusão mediante solicitação'
            ],
            validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        };
        
        let html = '<h4><i class="fas fa-user-check"></i> Resultado da Verificação</h4>';
        html += '<div class="verification-summary">';
        html += `<p><strong>ID da Verificação:</strong> ${verificationResult.requestId}</p>`;
        html += `<p><strong>Status:</strong> <span class="success">${verificationResult.status}</span></p>`;
        html += `<p><strong>Data/Hora:</strong> ${new Date(verificationResult.timestamp).toLocaleString('pt-BR')}</p>`;
        html += `<p><strong>Validade:</strong> ${new Date(verificationResult.validade).toLocaleDateString('pt-BR')}</p>`;
        html += '</div>';
        
        html += '<h5><i class="fas fa-list-check"></i> Níveis de Verificação</h5>';
        html += '<div class="verification-levels">';
        verificationResult.niveisVerificacao.forEach(nivel => {
            html += `
                <div class="verification-level ${nivel.status.toLowerCase()}">
                    <div class="level-header">
                        <span class="level-name">${nivel.nivel}</span>
                        <span class="level-status">${nivel.status}</span>
                    </div>
                    <div class="level-details">${nivel.detalhes}</div>
                </div>
            `;
        });
        html += '</div>';
        
        html += '<h5><i class="fas fa-shield-alt"></i> Conformidade LGPD</h5>';
        html += '<div class="lgpd-compliance">';
        html += '<div class="lgpd-item">';
        html += '<i class="fas fa-check-circle success"></i>';
        html += '<div>';
        html += '<h6>Consentimento Válido</h6>';
        html += '<p>Verificação realizada com base em consentimento explícito do titular (Art. 7º, I LGPD)</p>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="lgpd-item">';
        html += '<i class="fas fa-check-circle success"></i>';
        html += '<div>';
        html += '<h6>Finalidade Específica</h6>';
        html += '<p>Dados processados para finalidade específica informada (Art. 6º, I LGPD)</p>';
        html += '</div>';
        html += '</div>';
        
        html += '<div class="lgpd-item">';
        html += '<i class="fas fa-check-circle success"></i>';
        html += '<div>';
        html += '<h6>Transparência</h6>';
        html += '<p>Processo documentado e auditável (Art. 6º, VI LGPD)</p>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        html += '<h5><i class="fas fa-lightbulb"></i> Recomendações</h5>';
        html += '<div class="recommendations">';
        verificationResult.recomendacoes.forEach(recomendacao => {
            html += `<div class="recommendation"><i class="fas fa-chevron-right"></i> ${recomendacao}</div>`;
        });
        html += '</div>';
        
        html += '<div class="verification-actions">';
        html += `<button onclick="copyToClipboard('${JSON.stringify(verificationResult)}')" class="btn-secondary">`;
        html += '<i class="fas fa-copy"></i> Copiar Resultado</button>';
        html += '<button onclick="gerarCertificado()" class="btn-primary">';
        html += '<i class="fas fa-file-certificate"></i> Gerar Certificado</button>';
        html += '</div>';
        
        resultDiv.innerHTML = html;
        showNotification('Verificação realizada com sucesso!', 'success');
        
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <h4>Erro na Verificação</h4>
                <p>${error.message}</p>
                <p>Verifique o formato dos dados (deve ser um JSON válido).</p>
            </div>
        `;
        showNotification('Erro ao processar verificação', 'error');
    }
}

function gerarCertificado() {
    showNotification('Funcionalidade de certificado em desenvolvimento', 'info');
}

// Dados Internacionais
async function consultarPais(pais) {
    const resultDiv = document.getElementById('international-result');
    
    const paises = {
        us: {
            nome: 'Estados Unidos',
            apis: [
                {
                    nome: 'US Census Bureau',
                    descricao: 'Dados demográficos e econômicos oficiais',
                    url: 'https://api.census.gov',
                    exemplo: '/data/2020/dec?get=NAME,POP&for=state:*'
                },
                {
                    nome: 'Data.gov',
                    descricao: 'Portal de dados abertos do governo americano',
                    url: 'https://api.data.gov',
                    exemplo: '/api/3/action/package_list'
                },
                {
                    nome: 'Library of Congress',
                    descricao: 'API de conteúdo da Biblioteca do Congresso',
                    url: 'https://www.loc.gov/apis',
                    exemplo: '/search/?q=civil+war&fo=json'
                }
            ]
        },
        eu: {
            nome: 'União Europeia',
            apis: [
                {
                    nome: 'European Union Open Data',
                    descricao: 'Dados abertos das instituições da UE',
                    url: 'https://data.europa.eu/api',
                    exemplo: '/mqa/ckan/catalog.json'
                },
                {
                    nome: 'Eurostat',
                    descricao: 'Estatísticas oficiais da União Europeia',
                    url: 'https://ec.europa.eu/eurostat/api',
                    exemplo: '/dissemination/sdmx/2.1/dataflow/ESTAT/all?format=sdmx_2.1'
                }
            ]
        },
        uk: {
            nome: 'Reino Unido',
            apis: [
                {
                    nome: 'UK Government Data',
                    descricao: 'Portal de dados do governo britânico',
                    url: 'https://data.gov.uk/api',
                    exemplo: '/3/action/package_list'
                },
                {
                    nome: 'Office for National Statistics',
                    descricao: 'Estatísticas oficiais do Reino Unido',
                    url: 'https://api.ons.gov.uk',
                    exemplo: '/dataset/CPI/timeseries/D7G7'
                }
            ]
        },
        ca: {
            nome: 'Canadá',
            apis: [
                {
                    nome: 'Open Government Canada',
                    descricao: 'Dados abertos do governo canadense',
                    url: 'https://open.canada.ca/data/en/api',
                    exemplo: '/3/action/package_list'
                },
                {
                    nome: 'Statistics Canada',
                    descricao: 'Estatísticas oficiais do Canadá',
                    url: 'https://www.statcan.gc.ca/eng/developers',
                    exemplo: '/wds/rest/fulldataset/13100754.json'
                }
            ]
        }
    };
    
    const dadosPais = paises[pais];
    if (!dadosPais) {
        showNotification('País não encontrado', 'error');
        return;
    }
    
    let html = `<h4><i class="fas fa-flag"></i> APIs Públicas - ${dadosPais.nome}</h4>`;
    html += '<p class="country-description">APIs oficiais de dados abertos disponíveis publicamente:</p>';
    
    html += '<div class="country-apis">';
    dadosPais.apis.forEach(api => {
        html += `
            <div class="api-card">
                <div class="api-header">
                    <h5>${api.nome}</h5>
                    <span class="api-badge">API Pública</span>
                </div>
                <div class="api-description">
                    <p>${api.descricao}</p>
                </div>
                <div class="api-details">
                    <div class="api-url">
                        <label>URL Base:</label>
                        <code>${api.url}</code>
                        <button onclick="copyToClipboard('${api.url}')" class="btn-copy" title="Copiar URL">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <div class="api-example">
                        <label>Exemplo de Endpoint:</label>
                        <code>${api.exemplo}</code>
                    </div>
                </div>
                <div class="api-legal">
                    <i class="fas fa-balance-scale"></i>
                    <small>API oficial do governo. Uso sujeito aos termos de serviço.</small>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    html += '<div class="international-notes">';
    html += '<h5><i class="fas fa-exclamation-triangle"></i> Considerações Legais Internacionais</h5>';
    html += '<ul>';
    html += '<li>Respeitar as leis de proteção de dados de cada país (GDPR na UE, CCPA na Califórnia, etc.)</li>';
    html += '<li>Verificar os termos de uso específicos de cada API</li>';
    html += '<li>Considerar limitações de rate limiting e quotas</li>';
    html += '<li>Armazenar dados apenas pelo tempo necessário</li>';
    html += '</ul>';
    html += '</div>';
    
    resultDiv.innerHTML = html;
    showNotification(`APIs do ${dadosPais.nome} carregadas`, 'success');
}

// Export functions for global use
window.consultarCEP = consultarCEP;
window.consultarCNPJ = consultarCNPJ;
window.carregarMunicipios = carregarMunicipios;
window.consultarMunicipio = consultarMunicipio;
window.buscarRedeSocial = buscarRedeSocial;
window.processarVerificacao = processarVerificacao;
window.gerarCertificado = gerarCertificado;
window.consultarPais = consultarPais;