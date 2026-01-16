# CyberShield OSINT Platform

![License](https://img.shields.io/badge/License-MIT-red)
![Version](https://img.shields.io/badge/Version-1.0.0-black)
![Purpose](https://img.shields.io/badge/Purpose-Ethical%20Research-red)

## ⚠️ AVISO LEGAL
Esta plataforma destina-se exclusivamente para:
- Pesquisa acadêmica em segurança cibernética
- Análise forense digital autorizada
- Desenvolvimento de ferramentas defensivas
- Testes de penetração com autorização explícita

**O uso malicioso é estritamente proibido e constitui crime.**

## 🚀 Funcionalidades

### APIs Integradas
1. **APIs OSINT**
   - Shodan API
   - Censys API
   - VirusTotal API
   - HaveIBeenPwned API

2. **APIs de Geolocalização**
   - ip-api.com
   - MaxMind GeoIP
   - Google Maps API

3. **APIs de Redes Sociais** (uso limitado)
   - Twitter API v2
   - Facebook Graph API
   - LinkedIn API

4. **Análise de Vulnerabilidades**
   - NVD API
   - Exploit-DB API
   - CVE Search API
   - OWASP Dependency-Check

5. **Análise de Malware e Ameaças**
   - Hybrid Analysis API
   - AlienVault OTX API
   - MISP API

6. **APIs de Redes e Domínios**
   - WHOIS APIs
   - DNS APIs
   - SecurityTrails API
   - URLScan.io API

7. **APIs de Comunicação**
   - Socket Programming
   - Scapy (Python)
   - HTTP Libraries

8. **APIs de Criptografia**
   - cryptography (Python)
   - OpenSSL APIs
   - Hashcat API

## 📦 Instalação

### Pré-requisitos
- Node.js 16+
- npm ou yarn
- SQLite3
- Chaves de API (obrigatórias para funcionalidade completa)

### Passos de Instalação
```bash
# Clone o repositório
git clone https://github.com/cybershield/osint-platform.git
cd osint-platform

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas chaves de API

# Inicie o servidor
npm start

# Para desenvolvimento
npm run dev
