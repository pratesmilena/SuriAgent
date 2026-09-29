document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const welcomeScreen = document.getElementById('welcome-screen');
    const sendBtn = document.getElementById('send-btn');

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
            // Reaproveitando a rota /api/diagnosticar, enviando o texto como logErro
            const response = await fetch('/api/diagnosticar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ logErro: text, detalhes: '' })
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

    function addMessageToChat(content, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = sender === 'ai' ? 'message-content markdown-body' : 'message-content';
        
        if (sender === 'ai') {
            contentDiv.innerHTML = marked.parse(content);
        } else {
            contentDiv.textContent = content;
        }

        msgDiv.appendChild(contentDiv);
        chatHistory.appendChild(msgDiv);
        scrollToBottom();
    }

    function addLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message ai';
        msgDiv.id = id;
        
        msgDiv.innerHTML = `
            <div class="loading-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        
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
