document.addEventListener('DOMContentLoaded', () => {
    const google = document.getElementById('google-login');
    const status = document.getElementById('auth-status');
    const accountStatus = document.getElementById('account-status');
    const accountOpen = document.getElementById('account-open');
    const signedOut = document.getElementById('signed-out-view');
    const signedIn = document.getElementById('signed-in-view');
    const logout = document.getElementById('logout');
    let client;
    let signingIn = false;
    function render(user) {
        signedOut.hidden = !!user;
        signedIn.hidden = !user;
        accountStatus.textContent = user ? 'Conectado' : 'Visitante';
        accountOpen.textContent = user ? 'Minha conta' : 'Entrar →';
        document.getElementById('account-name').textContent = user?.user_metadata?.full_name || user?.email || 'estudante';
    }
    async function verifySession() {
        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (error) throw error;
            if (!session) { render(null); return; }
            const { data: { user }, error: userError } = await client.auth.getUser();
            if (userError) throw userError;
            render(user);
        } catch {
            render(null);
            status.textContent = 'Não foi possível confirmar sua sessão. Você pode continuar como visitante e tentar entrar novamente.';
        }
    }
    google.addEventListener('click', async () => {
        if (!client || signingIn) return;
        signingIn = true; google.disabled = true;
        status.textContent = 'Abrindo o acesso seguro do Google…';
        try {
            const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
                redirectTo: `${location.origin}${location.pathname}#chat-panel`, scopes: 'openid email profile'
            } });
            if (error) throw error;
        } catch {
            status.textContent = 'Não foi possível iniciar o login Google. Continue como visitante ou tente novamente mais tarde.';
            google.disabled = false; signingIn = false;
        }
    });
    logout.addEventListener('click', async () => {
        logout.disabled = true;
        try {
            const { error } = await client.auth.signOut({ scope: 'local' });
            if (error) throw error;
            render(null);
            status.textContent = 'Você saiu da conta neste dispositivo. Continue como visitante quando quiser.';
        } catch {
            // O erro também precisa ficar visível na área autenticada.
            document.getElementById('account-name').textContent = 'Não foi possível sair. Tente novamente.';
        } finally { logout.disabled = false; }
    });
    fetch('/api/auth/config', { signal: AbortSignal.timeout(15000) }).then(async response => {
        if (!response.ok) throw new Error();
        const config = await response.json();
        if (!config.available) { status.textContent = config.message; return; }
        client = window.supabase.createClient(config.url, config.publishableKey, {
            auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        google.disabled = config.googleEnabled === false;
        status.textContent = config.googleEnabled === false
            ? 'O login Google ainda não foi habilitado pela equipe do site. Continue como visitante.'
            : 'Ao continuar, você será direcionado ao Google para autorizar o acesso à sua conta.';
        client.auth.onAuthStateChange(() => { setTimeout(verifySession, 0); });
        await verifySession();
        const query = new URLSearchParams(location.search);
        if (query.has('error') || location.hash.includes('error=')) {
            status.textContent = 'O login foi cancelado ou não pôde ser concluído. Você pode continuar como visitante.';
            render(null);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('account-modal')).show();
            history.replaceState(null, '', location.pathname + '#chat-panel');
        }
    }).catch(() => { status.textContent = 'O acesso à conta está indisponível no momento. As consultas continuam disponíveis como visitante.'; });
});
