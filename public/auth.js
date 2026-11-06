document.addEventListener('DOMContentLoaded', () => {
    const google = document.getElementById('google-login');
    const status = document.getElementById('auth-status');
    const accountStatus = document.getElementById('account-status');
    const accountOpen = document.getElementById('account-open');
    const signedOut = document.getElementById('signed-out-view');
    const signedIn = document.getElementById('signed-in-view');
    const signOutButtons = [...document.querySelectorAll('[data-sign-out]')];
    const logoutErrors = [document.getElementById('logout-error')];
    let client;
    let signingIn = false;
    let googleAvailable = false;
    let verificationId = 0;
    const loginMarker = 'suri-login-pending';
    const welcomeToast = document.getElementById('welcome-toast');
    const hasAuthError = new URLSearchParams(location.search).has('error') || location.hash.includes('error=');
    function clearPendingWelcome() { try { sessionStorage.removeItem(loginMarker); } catch {} }
    if (hasAuthError) clearPendingWelcome();
    function welcomeAfterLogin(name) {
        let pending;
        try { pending = JSON.parse(sessionStorage.getItem(loginMarker) || 'null'); } catch {}
        clearPendingWelcome();
        const age = Date.now() - pending?.startedAt;
        if (!Number.isFinite(age) || age < 0 || age > 10 * 60 * 1000 || hasAuthError) return;
        document.getElementById('welcome-toast-message').textContent = `Bem-vindo(a), ${name}! Que bom ter você por aqui.`;
        bootstrap.Toast.getOrCreateInstance(welcomeToast, { delay: 5000, autohide: true }).show();
    }
    function render(user) {
        const metadata = user?.user_metadata || {};
        const candidate = [metadata.full_name, metadata.name, user?.email?.split('@')[0]].find(value => typeof value === 'string' && value.trim());
        const name = candidate?.trim().slice(0, 120) || 'estudante';
        signedOut.hidden = !!user;
        signedIn.hidden = !user;
        accountStatus.textContent = user ? 'Perfil conectado' : 'Visitante';
        accountOpen.textContent = user ? 'Meu perfil' : 'Entrar →';
        document.getElementById('account-name').textContent = user ? name : '';
        document.getElementById('account-email').textContent = user && typeof user.email === 'string' ? user.email : '';
        document.getElementById('sidebar-profile-name').textContent = 'Aprenda do seu jeito';
        document.getElementById('sidebar-profile-note').textContent = user ? 'Gerencie sua conta em Meu perfil.' : 'Com sua conta ou como visitante.';
        document.getElementById('sidebar-profile-open').textContent = user ? 'Meu perfil' : 'Minha conta';
        document.getElementById('account-title').hidden = !!user;
        document.getElementById('profile-dialog-title').hidden = !user;
        document.getElementById('account-modal').setAttribute('aria-labelledby', user ? 'profile-dialog-title' : 'account-title');
        document.getElementById('account-description').textContent = user ? 'Esta é a sua conta conectada ao SuriAgent.' : 'Entre com sua conta ou continue explorando como visitante.';
        document.getElementById('visitor-divider').hidden = !!user;
        document.getElementById('continue-visitor').hidden = !!user;
        logoutErrors.forEach(element => { element.hidden = true; element.textContent = ''; });
        if (user) welcomeAfterLogin(name);
        else { bootstrap.Toast.getInstance(welcomeToast)?.hide(); signingIn = false; google.disabled = !googleAvailable; }
    }
    async function verifySession() {
        const current = ++verificationId;
        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (current !== verificationId) return;
            if (error) throw error;
            if (!session) { render(null); return; }
            const { data: { user }, error: userError } = await client.auth.getUser();
            if (current !== verificationId) return;
            if (userError) throw userError;
            render(user);
        } catch {
            if (current !== verificationId) return;
            render(null);
            status.textContent = 'Não foi possível confirmar sua sessão. Você pode continuar como visitante e tentar entrar novamente.';
        }
    }
    google.addEventListener('click', async () => {
        if (!client || signingIn) return;
        try { sessionStorage.setItem(loginMarker, JSON.stringify({ startedAt: Date.now() })); } catch {}
        signingIn = true; google.disabled = true;
        status.textContent = 'Abrindo o acesso seguro do Google…';
        try {
            const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
                redirectTo: `${location.origin}${location.pathname}#chat-panel`, scopes: 'openid email profile'
            } });
            if (error) throw error;
        } catch {
            clearPendingWelcome();
            status.textContent = 'Não foi possível iniciar o login Google. Continue como visitante ou tente novamente mais tarde.';
            google.disabled = !googleAvailable; signingIn = false;
        }
    });
    async function signOut() {
        if (!client || signOutButtons.some(button => button.disabled)) return;
        ++verificationId;
        signOutButtons.forEach(button => { button.disabled = true; });
        logoutErrors.forEach(element => { element.hidden = true; });
        try {
            const { error } = await client.auth.signOut({ scope: 'local' });
            if (error) throw error;
            ++verificationId;
            clearPendingWelcome();
            render(null);
            status.textContent = 'Você saiu do perfil neste dispositivo. Continue como visitante quando quiser.';
        } catch {
            logoutErrors.forEach(element => {
                element.textContent = 'Não foi possível sair do perfil. Tente novamente.';
                element.hidden = false;
            });
        } finally { signOutButtons.forEach(button => { button.disabled = false; }); }
    }
    signOutButtons.forEach(button => button.addEventListener('click', signOut));
    fetch('/api/auth/config', { signal: AbortSignal.timeout(15000) }).then(async response => {
        if (!response.ok) throw new Error();
        const config = await response.json();
        if (!config.available) { status.textContent = config.message; return; }
        client = window.supabase.createClient(config.url, config.publishableKey, {
            auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
        });
        googleAvailable = config.googleEnabled !== false;
        google.disabled = !googleAvailable;
        status.textContent = config.googleEnabled === false
            ? 'O login Google ainda não foi habilitado pela equipe do site. Continue como visitante.'
            : 'Ao continuar, você será direcionado ao Google para autorizar o acesso à sua conta.';
        client.auth.onAuthStateChange(() => { ++verificationId; setTimeout(verifySession, 0); });
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
