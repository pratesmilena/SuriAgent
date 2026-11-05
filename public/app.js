document.addEventListener('DOMContentLoaded', () => {
    const horariosForm = document.getElementById('horarios-form');
    const horariosStatus = document.getElementById('horarios-status');
    const horariosResults = document.getElementById('horarios-results');
    const horariosSubmit = document.getElementById('horarios-submit');
    horariosForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        horariosSubmit.disabled = true;
        horariosSubmit.textContent = 'Consultando…';
        horariosResults.setAttribute('aria-busy', 'true');
        horariosResults.replaceChildren();
        horariosStatus.className = 'result-status';
        horariosStatus.textContent = 'Consultando os horários da escola…';
        const parametros = new URLSearchParams({
            turma: document.getElementById('turma').value.trim(),
            dia: document.getElementById('dia').value
        });
        try {
            const response = await fetch(`/api/horarios?${parametros}`, { signal: AbortSignal.timeout(15000) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.erro || 'Não foi possível consultar os horários.');
            horariosStatus.textContent = data.aulas.length
                ? `${data.aulas.length} aula(s) encontrada(s) para ${data.turma}.`
                : 'Nenhuma aula encontrada para esta turma e dia. Confira o nome da turma ou consulte a secretaria.';
            if (data.aulas.length) renderHorarios(data);
        } catch (error) {
            horariosStatus.classList.add('error');
            horariosStatus.textContent = error.name === 'TimeoutError'
                ? 'A consulta demorou mais que o esperado. Tente novamente.'
                : error.message === 'Failed to fetch' ? 'Não foi possível conectar ao servidor. Tente novamente.' : error.message;
        } finally {
            horariosResults.setAttribute('aria-busy', 'false');
            horariosSubmit.disabled = false;
            horariosSubmit.textContent = 'Consultar →';
        }
    });

    function renderHorarios({ turma, dia, aulas }) {
        const card = document.createElement('div');
        card.className = 'card schedule-card';
        const title = document.createElement('h3');
        title.className = 'schedule-title';
        title.textContent = `${turma} · ${dia}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        const table = document.createElement('table');
        table.className = 'table';
        const caption = table.createCaption();
        caption.className = 'visually-hidden';
        caption.textContent = `Horários de ${turma} em ${dia}`;
        const head = table.createTHead().insertRow();
        for (const label of ['Aula', 'Início', 'Disciplina', 'Professor(a)']) {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = label;
            head.append(th);
        }
        const body = table.createTBody();
        for (const aula of aulas) {
            const row = body.insertRow();
            for (const value of [aula.numero_aula, aula.horario_inicio, aula.disciplina, aula.professor]) {
                row.insertCell().textContent = value == null || value === '' ? 'Não informado' : String(value);
            }
        }
        wrapper.append(table);
        card.append(title, wrapper);
        horariosResults.append(card);
    }
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const welcomeScreen = document.getElementById('welcome-screen');
    const sendBtn = document.getElementById('send-btn');
    const providerSelect = document.getElementById('ai-provider');
    const providerNote = document.getElementById('ai-provider-note');
    const puterConnect = document.getElementById('puter-connect');
    let providers = [];
    let puterLoading;

    function loadPuter() {
        if (window.puter) return Promise.resolve(window.puter);
        if (!puterLoading) puterLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const timer = setTimeout(() => { script.remove(); puterLoading = null; reject(new Error('Não foi possível carregar o Puter. Tente novamente.')); }, 15000);
            script.src = 'https://js.puter.com/v2/';
            script.onload = () => { clearTimeout(timer); resolve(window.puter); };
            script.onerror = () => { clearTimeout(timer); script.remove(); puterLoading = null; reject(new Error('Não foi possível carregar o Puter.')); };
            document.head.append(script);
        });
        return puterLoading;
    }

    async function updateProvider() {
        const info = providers.find(item => item.id === providerSelect.value);
        const browser = providerSelect.value === 'puter';
        puterConnect.hidden = !browser;
        providerNote.textContent = browser
            ? 'Puter usa sua conta pessoal e pode exigir créditos ou ter cotas. As mensagens são enviadas ao Puter. Clique em Conectar antes de conversar.'
            : info?.available ? `${info.label} · ${info.model}. Mensagens são enviadas a esse provedor. Horários e localização usam primeiro as informações confirmadas da escola.`
                : 'Provedor sem chave configurada no servidor. Configure a chave ou selecione Puter para usar sua conta pessoal.';
        if (browser) {
            puterConnect.disabled = true;
            try { await loadPuter(); } catch (error) { providerNote.textContent = error.message; }
            finally { puterConnect.disabled = false; }
        }
    }

    puterConnect.addEventListener('click', () => {
        if (!window.puter) { updateProvider(); return; }
        // Abrir autenticação dentro do clique, para não bloquear o popup no navegador.
        window.puter.auth.signIn().then(() => {
            providerNote.textContent = 'Puter conectado. As mensagens usam a cota da sua conta pessoal.';
        }).catch(() => { providerNote.textContent = 'Conexão ao Puter cancelada ou indisponível. Tente novamente.'; });
    });
    providerSelect.addEventListener('change', updateProvider);
    fetch('/api/ia', { signal: AbortSignal.timeout(10000) }).then(async response => {
        if (!response.ok) throw new Error('configuração indisponível');
        const config = await response.json();
        providers = config.providers;
        providerSelect.replaceChildren(...providers.map(info => {
            const option = document.createElement('option');
            option.value = info.id;
            option.textContent = `${info.label}${info.available ? '' : ' — configurar chave'}`;
            return option;
        }));
        providerSelect.value = config.defaultProvider;
        updateProvider();
    }).catch(() => { providerNote.textContent = 'Não foi possível verificar os provedores. Recarregue a página.'; });

    document.querySelectorAll('[data-school-question]').forEach(button => {
        button.addEventListener('click', () => {
            userInput.value = button.dataset.schoolQuestion;
            userInput.focus();
        });
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const text = userInput.value.trim();
        if (!text) return;

        // Remove a tela de boas-vindas na primeira mensagem
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

        // Adiciona a mensagem do usuário
        addMessageToChat(text, 'user');
        userInput.value = '';
        
        // Adiciona indicador de loading
        const loadingId = addLoadingIndicator();
        
        // Bloqueia o input enquanto processa
        userInput.disabled = true;
        sendBtn.disabled = true;
        providerSelect.disabled = true;

        try {
            // Consultar primeiro o backend escolar, inclusive ao usar Puter.
            // Não enviar perguntas sobre dados oficiais a um modelo sem consultar a base.
            const schoolResponse = await fetch('/api/escola/perguntar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pergunta: text }), signal: AbortSignal.timeout(15000)
            });
            const schoolData = await schoolResponse.json();
            if (!schoolResponse.ok) throw new Error(schoolData.erro || 'Não foi possível consultar os dados escolares.');
            if (schoolData.handled) {
                removeElement(loadingId);
                addMessageToChat(schoolData.solucao, 'ai', true);
                return;
            }
            if (providerSelect.value === 'puter') {
                const puter = await loadPuter();
                if (!puter.auth.isSignedIn()) throw new Error('Clique em Conectar ao Puter e entre na sua conta antes de enviar a mensagem.');
                const model = providers.find(info => info.id === 'puter')?.model;
                let timer;
                try {
                    const response = await Promise.race([
                        puter.ai.chat([{ role: 'system', content: SuriAI.SYSTEM_PROMPT }, { role: 'user', content: text }], { model }),
                        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('O Puter demorou a responder. Verifique sua conta antes de tentar novamente.')), 60000); })
                    ]);
                    removeElement(loadingId);
                    addMessageToChat(SuriAI.puterText(response), 'ai');
                } finally { clearTimeout(timer); }
                return;
            }
            // Reaproveitando a rota /api/diagnosticar, enviando o texto como logErro
            const response = await fetch('/api/diagnosticar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ logErro: text, provider: providerSelect.value }),
                signal: AbortSignal.timeout(50000)
            });

            const data = await response.json();
            
            // Remove o loading
            removeElement(loadingId);

            if (!response.ok) {
                throw new Error(data.erro || 'Erro ao processar a requisição');
            }

            // Adiciona a resposta da IA formatada
            addMessageToChat(data.solucao, 'ai');

        } catch (error) {
            removeElement(loadingId);
            addMessageToChat(`**Erro:** ${error.message}`, 'ai');
        } finally {
            userInput.disabled = false;
            sendBtn.disabled = false;
            providerSelect.disabled = false;
            userInput.focus();
        }
    });

    function addMessageToChat(content, sender, plainText = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = sender === 'ai' ? 'message-content markdown-body' : 'message-content';
        
        if (sender === 'ai' && !plainText) {
            contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(content));
        } else {
            contentDiv.textContent = content;
        }

        if (plainText) contentDiv.classList.add('school-answer');
        msgDiv.appendChild(contentDiv);
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    }

    function addLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai';
        msgDiv.id = id;
        
        msgDiv.innerHTML = '<div class="loading-dots" role="status">Suri está pensando…</div>';
        
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }

    // Foca o input inicial
    userInput.focus();
});
