# Guia de Ferramentas para Agentes de IA: Agent-Reach & Obscura

Este documento fornece instruções completas e práticas para que agentes de IA possam identificar, escolher e operar as ferramentas **Agent-Reach** e **Obscura** disponíveis neste ambiente Windows.

---

## 1. Visão Geral e Matriz de Decisão

| Ferramenta | Propósito Principal | Quando Usar | Como Invocar no Diretório Atual |
|---|---|---|---|
| **Agent-Reach** | Roteador e extrator para plataformas de internet | Pesquisas e leitura estruturada em redes e plataformas sociais (GitHub, Twitter/X, Reddit, Bilibili, YouTube, RSS, V2EX, etc.) | `.\agent-reach.cmd` ou `..\sandbox-venv\Scripts\agent-reach.exe` |
| **Obscura** | Navegador *headless* em Rust com motor V8, renderização nativa (sem Chromium) e modo *stealth* | Renderização de SPAs/JavaScript, capturas de tela (PNG), exportação em PDF, bypass anti-bot, automação MCP e CDP | `.\obscura.exe` e `.\obscura-worker.exe` |
| **fetch_social.py** | Utilitário Python integrado para redes autenticadas | Consultas diretas estruturadas a Reddit, X (Twitter) e YouTube usando a sessão ativa | `& "..\sandbox-venv\Scripts\python.exe" fetch_social.py <reddit\|x\|youtube> <alvo>` |

### Quando Combinar as Ferramentas:
1. O **Agent-Reach** (ou `fetch_social.py`) descobre, busca e filtra links e metadados nas redes e fóruns.
2. O **Obscura** acessa páginas complexas que exigem renderização JavaScript completa, modo anti-detecção (*stealth*) ou captura visual para análise multimodal.

---

## 2. Caminhos e Localização dos Binários

### No diretório `Obscura`:
- **CLI Obscura**: `.\obscura.exe`
- **Worker Paralelo Obscura**: `.\obscura-worker.exe`
- **Wrapper do Agent-Reach**: `.\agent-reach.cmd`
- **Perfil com Cookies Salvos**: `.\obscura-profile\cookies.json` (sessão ativa de X e Reddit)
- **Script Auxiliar Social**: [fetch_social.py](fetch_social.py)
- **Variáveis de Ambiente**: `.env` (tokens e cookies)
- **Documentação detalhada do Obscura**: [docs](docs)
- **Skill do Obscura**: [skills/obscura/SKILL.md](skills/obscura/SKILL.md)

### No diretório `Agent-Reach` (pai):
- **Raiz do projeto**: `C:\Users\orugi\Documents\Projetos\Agent-Reach`
- **Virtualenv Python**: `C:\Users\orugi\Documents\Projetos\Agent-Reach\sandbox-venv`
- **Interpretador Python**: `C:\Users\orugi\Documents\Projetos\Agent-Reach\sandbox-venv\Scripts\python.exe`
- **Binário CLI nativo**: `C:\Users\orugi\Documents\Projetos\Agent-Reach\sandbox-venv\Scripts\agent-reach.exe`
- **Binário yt-dlp**: `C:\Users\orugi\Documents\Projetos\Agent-Reach\sandbox-venv\Scripts\yt-dlp.exe`
- **Skill nativa do Agent-Reach**: `C:\Users\orugi\.agents\skills\agent-reach\SKILL.md`

---

## 3. Instruções de Uso: Obscura (v0.2.5)

O Obscura substitui o Chromium headless com consumo de memória de ~30 MB e inicialização quase instantânea.

### A. Extração de Conteúdo e Avaliação JavaScript

```powershell
# Extrair Markdown formatado (ideal para LLMs lerem artigos/documentação)
.\obscura.exe fetch https://example.com --dump markdown

# Extrair texto puro
.\obscura.exe fetch https://example.com --dump text

# Extrair todos os links da página
.\obscura.exe fetch https://example.com --dump links

# Executar expressão JavaScript no DOM e obter o retorno
.\obscura.exe fetch https://example.com --eval "document.title"
.\obscura.exe fetch https://example.com --eval "document.querySelector('h1').innerText"
```

### B. Modo Stealth (Anti-Detecção e Bloqueio de Rastreadores)

Ativa impersonação TLS realística (via BoringSSL/wreq), mascaramento de `navigator.webdriver`, normalização de impressões digitais de GPU/Canvas/Áudio e bloqueio de mais de 3.500 domínios de telemetria/rastreamento:

```powershell
# Fetch sob modo stealth
.\obscura.exe --stealth fetch https://example.com --dump text

# Salvar HTML renderizado sob stealth
.\obscura.exe --stealth fetch https://example.com --dump html --output pagina.html
```

### C. Captura Visual (Screenshots e PDFs)

O motor calcula CSS layout (Flexbox, Grid, posições fixas, transforms) e desenha nativamente:

```powershell
# Captura de viewport padrão
.\obscura.exe fetch https://example.com --screenshot screenshot.png

# Rolagem antes da captura (ex: rodapé)
.\obscura.exe fetch https://example.com --eval "window.scrollTo(0, document.documentElement.scrollHeight)" --screenshot footer.png

# Aguardar término de requisições de rede antes de capturar
.\obscura.exe fetch https://example.com --wait-until networkidle0 --screenshot app.png
```

### D. Scraping Paralelo Concorrente (`scrape`)

Executa buscas simultâneas distribuídas entre múltiplos processos de workers:

```powershell
# Scraping concorrente retornando formato JSON estruturado
.\obscura.exe scrape https://example.com https://iana.org --concurrency 10 --quiet --format json
```

### E. Servidor CDP (Chrome DevTools Protocol)

Permite conexão via Playwright (`chromium.connectOverCDP`) ou Puppeteer (`puppeteer.connect`):

```powershell
# Iniciar servidor CDP na porta 9222
.\obscura.exe serve --port 9222 --stealth
```

Exemplo em Node.js com Playwright:
```javascript
import { chromium } from 'playwright-core';

const browser = await chromium.connectOverCDP({
  endpointURL: 'ws://127.0.0.1:9222',
});
const page = await browser.newPage();
await page.goto('https://example.com');
console.log(await page.title());
await browser.close();
```

### F. Servidor MCP (Model Context Protocol)

Permite que agentes controlem o navegador por ferramentas padronizadas (37 ferramentas disponíveis, incluindo `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill`):

- **Via Stdio (padrão para subprocessos de agentes):**
  ```powershell
  @'
  {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"agent","version":"1.0"}}}
  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"browser_navigate","arguments":{"url":"https://example.com"}}}
  {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"browser_snapshot","arguments":{}}}
  '@ | .\obscura.exe --storage-dir .\obscura-profile mcp
  ```
- **Via HTTP (acesso compartilhado / rede):**
  ```powershell
  .\obscura.exe mcp --http --port 3000
  ```

---

## 4. Instruções de Uso: Agent-Reach (v1.5.0)

O Agent-Reach atua como um orquestrador e diagnosticador inteligente para agentes acessarem plataformas online sem complexidade.

### A. Diagnóstico de Plataformas (`doctor`)

Sempre verifique o status das plataformas antes de planejar requisições em lote:

```powershell
# Relatório legível no terminal
.\agent-reach.cmd doctor

# Relatório JSON estruturado para consumo de código/agentes
.\agent-reach.cmd doctor --json
```

O JSON retorna cada canal com `status` (`ok`, `warn`, `off`) e `active_backend`.

### B. Canais Prontos para Uso (Zero-Config)

1. **GitHub (Código, Repositórios, PRs, Issues)**:
   ```powershell
   gh search repos "agent-reach" --sort stars --limit 5
   ```
2. **Leitura de Qualquer Página Web (Jina Reader)**:
   ```powershell
   curl.exe -s "https://r.jina.ai/https://example.com"
   ```
3. **Feed RSS/Atom**:
   - Disponível via biblioteca Python `feedparser`.
4. **V2EX (Comunidade de Desenvolvedores)**:
   ```powershell
   curl.exe -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: agent-reach/1.0"
   ```
5. **Busca no Bilibili**:
   ```powershell
   # Busca direta via API ou bili-cli
   ```

### C. Uso como Biblioteca Python

```python
from agent_reach.config import Config
from agent_reach.doctor import check_all

config = Config()
results = check_all(config)

for platform, info in results.items():
    print(f"{platform}: {info['status']} (backend: {info['active_backend']})")
```

Execução:
```powershell
& "C:\Users\orugi\Documents\Projetos\Agent-Reach\sandbox-venv\Scripts\python.exe" script.py
```

---

## 5. Acesso Autenticado: Reddit, X (Twitter) e YouTube

As credenciais e cookies de sessão do usuário estão configurados para garantir acesso sem bloqueios ou telas de login:
- **Perfil do Obscura**: `.\obscura-profile\cookies.json` (contém cookies de sessão de `x.com`, `twitter.com` e `reddit.com`).
- **Variáveis de Ambiente**: `.env` e [agent-reach.cmd](agent-reach.cmd) (contêm `TWITTER_AUTH_TOKEN`, `TWITTER_CT0`, `REDDIT_SESSION`, `REDDIT_USERNAME`).

### A. Ferramenta Integrada `fetch_social.py` (Recomendada para Agentes)

O script [fetch_social.py](fetch_social.py) utiliza o Python do ambiente virtual para consultas diretas:

```powershell
# 1. Reddit: Listar posts em alta de qualquer subreddit
& "..\sandbox-venv\Scripts\python.exe" fetch_social.py reddit r/technology 5
& "..\sandbox-venv\Scripts\python.exe" fetch_social.py reddit r/rust 5

# 2. Reddit: Ler thread completa (post + autor + comentários)
& "..\sandbox-venv\Scripts\python.exe" fetch_social.py reddit "https://www.reddit.com/r/technology/comments/1xgrezg/..."

# 3. X (Twitter): Ler perfil ou página sob sessão ativa
& "..\sandbox-venv\Scripts\python.exe" fetch_social.py x https://x.com/OpenAI
& "..\sandbox-venv\Scripts\python.exe" fetch_social.py x https://x.com/elonmusk

# 4. YouTube: Buscar vídeos e obter títulos, durações e URLs
& "..\sandbox-venv\Scripts\python.exe" fetch_social.py youtube "Machine Learning" 5
```

### B. Uso de `fetch_social.py` em Código Python

Qualquer agente pode importar o módulo em seus próprios scripts:

```python
from fetch_social import fetch_reddit, fetch_x, fetch_youtube

# Buscar no Reddit
dados_reddit = fetch_reddit("r/rust", limit=5)

# Buscar no YouTube
videos = fetch_youtube("DeepSeek R1", max_results=3)

# Ler página do X
html_x = fetch_x("https://x.com/OpenAI")
```

### C. Extração Avançada do YouTube via `yt-dlp`

O binário `yt-dlp.exe` está disponível e configurado:

```powershell
# Obter metadados completos em JSON
& "..\sandbox-venv\Scripts\yt-dlp.exe" --dump-json "https://www.youtube.com/watch?v=VIDEO_ID"

# Baixar legendas/transcrições sem baixar o vídeo
& "..\sandbox-venv\Scripts\yt-dlp.exe" --write-sub --write-auto-sub --sub-lang "pt,en" --skip-download -o "$env:TEMP\%(id)s" "https://www.youtube.com/watch?v=VIDEO_ID"
```

### D. Navegação Autenticada e Captura Visual no Obscura

Adicione a flag `--storage-dir .\obscura-profile` para que o Obscura herde automaticamente as sessões:

```powershell
# Acessar Reddit logado sob modo anti-detecção
.\obscura.exe --stealth --storage-dir .\obscura-profile fetch "https://www.reddit.com/r/rust/" --dump text

# Acessar X/Twitter logado e capturar screenshot do feed
.\obscura.exe --stealth --storage-dir .\obscura-profile fetch "https://x.com/home" --screenshot feed_x.png

# Automação MCP com perfil persistido
.\obscura.exe --storage-dir .\obscura-profile mcp
```

---

## 6. Dicas Importantes e Resolução de Problemas

1. **Acesso a Servidores Locais / Intranet**:
   - O Obscura possui proteção SSRF padrão. Para acessar `localhost` ou `127.0.0.1`, adicione sempre a flag global:
     ```powershell
     .\obscura.exe --allow-private-network fetch http://127.0.0.1:8080 --dump text
     ```
2. **Pipelines no Windows PowerShell**:
   - No ambiente de sandbox, processos não podem abrir named pipes arbitrários para comunicação interprocessos do Node.js (`spawn(..., { stdio: 'pipe' })`).
   - Prefira utilizar pipelines nativos do PowerShell (`@'{"jsonrpc": ...}'@ | .\obscura.exe mcp`) ou o transporte HTTP (`.\obscura.exe mcp --http --port 3000`).
3. **Persistência de Cookies e Armazenamento**:
   - Para sessões persistentes no Obscura, utilize a flag `--storage-dir <CAMINHO>` para manter `localStorage` e cookies entre reinicializações.
