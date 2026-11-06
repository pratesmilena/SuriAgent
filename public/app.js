document.addEventListener('DOMContentLoaded', () => {
    const horariosForm = document.getElementById('horarios-form');
    const horariosStatus = document.getElementById('horarios-status');
    const horariosResults = document.getElementById('horarios-results');
    const horariosSubmit = document.getElementById('horarios-submit');
    const turmaSelect = document.getElementById('turma');
    const diaSelect = document.getElementById('dia');
    const catalogoRetry = document.getElementById('catalogo-retry');
    let turmas = [];
    function atualizarDias() {
        const turma = turmas.find(item => item.nome === turmaSelect.value);
        for (const option of diaSelect.options) {
            option.disabled = option.value !== 'SEMANA' && !turma?.dias.includes(option.value);
        }
        if (diaSelect.selectedOptions[0]?.disabled) diaSelect.value = turma?.dias[0] || 'SEMANA';
    }
    async function carregarTurmas() {
        catalogoRetry.hidden = true;
        turmaSelect.disabled = true;
        horariosSubmit.disabled = true;
        horariosStatus.className = 'result-status';
        horariosStatus.textContent = 'Carregando turmas da escola…';
        try {
            const response = await fetch('/api/horarios/catalogo', { signal: AbortSignal.timeout(15000) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.erro || 'Não foi possível carregar as turmas.');
            turmas = data.turmas;
            turmaSelect.replaceChildren(...turmas.map(turma => {
                const option = document.createElement('option');
                option.value = turma.nome;
                option.textContent = turma.nome;
                return option;
            }));
            if (!turmas.length) throw new Error('Nenhuma turma está visível na base da escola. Confirme o cadastro e o acesso.');
            atualizarDias();
            turmaSelect.disabled = false;
            horariosSubmit.disabled = false;
            horariosStatus.textContent = `${turmas.length} turmas disponíveis. Escolha a turma e o dia ou consulte a semana completa.`;
        } catch (error) {
            turmaSelect.replaceChildren(new Option('Turmas indisponíveis — tente novamente', ''));
            horariosStatus.classList.add('error');
            horariosStatus.textContent = error.name === 'TimeoutError' ? 'O carregamento demorou mais que o esperado. Tente novamente.' : error.message;
            catalogoRetry.hidden = false;
        }
    }
    turmaSelect.addEventListener('change', atualizarDias);
    catalogoRetry.addEventListener('click', carregarTurmas);
    carregarTurmas();
    horariosForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        horariosSubmit.disabled = true;
        turmaSelect.disabled = true;
        diaSelect.disabled = true;
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
            turmaSelect.disabled = false;
            diaSelect.disabled = false;
            horariosSubmit.textContent = 'Consultar →';
        }
    });

    function renderHorarios({ turma, dia, aulas }) {
        const card = document.createElement('div');
        card.className = 'card schedule-card';
        const title = document.createElement('h3');
        title.className = 'schedule-title';
        title.textContent = `${turma} · ${dia === 'SEMANA' ? 'Segunda a sexta-feira' : dia}`;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        const table = document.createElement('table');
        table.className = 'table';
        const caption = table.createCaption();
        caption.className = 'visually-hidden';
        caption.textContent = `Horários de ${turma} em ${dia}`;
        const head = table.createTHead().insertRow();
        for (const label of [...(dia === 'SEMANA' ? ['Dia'] : []), 'Aula', 'Início', 'Disciplina', 'Professor(a)']) {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = label;
            head.append(th);
        }
        const body = table.createTBody();
        for (const aula of aulas) {
            const row = body.insertRow();
            for (const value of [...(dia === 'SEMANA' ? [aula.dia_semana] : []), aula.numero_aula, aula.horario_inicio, aula.disciplina, aula.professor]) {
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

        try {
            // Consultar primeiro as informações oficiais da escola.
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
            // Reaproveitando a rota /api/diagnosticar, enviando o texto como logErro
            const response = await fetch('/api/diagnosticar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ logErro: text }),
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
