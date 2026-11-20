document.addEventListener('DOMContentLoaded', () => {
    const googleLogin = document.getElementById('google-login');
    const googleRegister = document.getElementById('google-register');
    const googleButtons = [googleLogin, googleRegister].filter(Boolean);
    const status = document.getElementById('auth-status');
    const signOutButtons = [
        ...document.querySelectorAll('[data-sign-out]')
    ];
    const logoutError = document.getElementById('logout-error');
    const welcomeToast = document.getElementById('welcome-toast');
    const loginMarker = 'suri-login-pending';

    let client;
    let signingIn = false;
    let signingOut = false;
    let googleAvailable = false;
    let verificationId = 0;
    let verificationTimer;

    const hasAuthError =
        new URLSearchParams(location.search).has('error') ||
        location.hash.includes('error=');

    function setText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    function setHidden(id, hidden) {
        const element = document.getElementById(id);
        if (element) element.hidden = hidden;
    }

    function setStatus(message) {
        if (status) status.textContent = message;
    }

    function clearPendingWelcome() {
        try {
            sessionStorage.removeItem(loginMarker);
        } catch {}
    }

    if (hasAuthError) clearPendingWelcome();

    function welcomeAfterLogin(name) {
        let pending;

        try {
            pending = JSON.parse(
                sessionStorage.getItem(loginMarker) || 'null'
            );
        } catch {}

        clearPendingWelcome();

        const age = Date.now() - pending?.startedAt;

        if (
            !Number.isFinite(age) ||
            age < 0 ||
            age > 10 * 60 * 1000 ||
            hasAuthError
        ) {
            return;
        }

        setText(
            'welcome-toast-message',
            `Bem-vindo(a), ${name}! Que bom ter você por aqui.`
        );

        if (welcomeToast && window.bootstrap?.Toast) {
            window.bootstrap.Toast.getOrCreateInstance(
                welcomeToast,
                { delay: 5000, autohide: true }
            ).show();
        }
    }

    function updateGoogleButtons() {
        googleButtons.forEach(button => {
            button.disabled = !googleAvailable || signingIn;
        });
    }

    function render(user, profile) {
        const metadata = user?.user_metadata || {};
        const candidate = [
            profile?.nome,
            metadata.full_name,
            metadata.name,
            user?.email?.split('@')[0]
        ].find(value =>
            typeof value === 'string' && value.trim()
        );

        const name = candidate?.trim().slice(0, 120) || 'estudante';

        setHidden('signed-out-view', !!user);
        setHidden('signed-in-view', !user);

        setText('account-status', user ? 'Perfil conectado' : 'Visitante');
        setText('account-open', user ? 'Meu perfil' : 'Entrar →');
        setText('account-name', user ? name : '');
        setText(
            'account-email',
            user ? profile?.email ?? user.email ?? '' : ''
        );

        setText('profile-storage-status', user ? 'Verificando o cadastro…' : '');
        setText('sidebar-profile-name', 'Aprenda do seu jeito');
        setText(
            'sidebar-profile-note',
            user
                ? 'Gerencie sua conta em Meu perfil.'
                : 'Com sua conta ou como visitante.'
        );
        setText(
            'sidebar-profile-open',
            user ? 'Meu perfil' : 'Minha conta'
        );

        setHidden('account-title', !!user);
        setHidden('profile-dialog-title', !user);

        document.getElementById('account-modal')?.setAttribute(
            'aria-labelledby',
            user ? 'profile-dialog-title' : 'account-title'
        );

        setText(
            'account-description',
            user
                ? 'Esta é a sua conta conectada ao SuriAgent.'
                : 'Entre ou crie sua conta com Google. Você também pode continuar como visitante.'
        );

        setHidden('visitor-divider', !!user);
        setHidden('continue-visitor', !!user);

        if (logoutError) {
            logoutError.hidden = true;
            logoutError.textContent = '';
        }

        signingIn = false;
        updateGoogleButtons();

        if (user) {
            welcomeAfterLogin(name);
        } else if (welcomeToast && window.bootstrap?.Toast) {
            window.bootstrap.Toast.getInstance(welcomeToast)?.hide();
        }
    }

    async function verifySession() {
        if (!client || signingOut) return;

        const current = ++verificationId;
        let user;

        try {
            const { data, error } = await client.auth.getSession();

            if (current !== verificationId) return;
            if (error) throw error;

            if (!data?.session) {
                render(null);
                return;
            }

            const result = await client.auth.getUser();

            if (current !== verificationId) return;
            if (result.error) throw result.error;

            if (!result.data?.user) {
                throw new Error('Sessão não confirmada');
            }

            user = result.data.user;
        } catch (error) {
            if (current !== verificationId) return;

            if (error?.status === 401 || error?.status === 403) {
                render(null);
                setStatus(
                    'Não foi possível validar sua sessão. Entre novamente para acessar seu perfil.'
                );
            } else {
                // Uma falha de conexão não significa que houve logout.
                setStatus(
                    'Não foi possível verificar sua sessão agora. Tentaremos novamente quando você voltar à página ou recuperar a conexão.'
                );
            }

            return;
        }

        // Exibe a conta confirmada mesmo se a consulta do perfil estiver lenta.
        render(user);
        setStatus('');

        let saved = false;
        try {
            const { data: profile, error } = await client
                .from('suri_perfis')
                .select('nome, email')
                .eq('id', user.id)
                .abortSignal(AbortSignal.timeout(5000))
                .maybeSingle();

            if (current === verificationId && !error && profile) {
                render(user, profile);
                saved = true;
            }
        } catch {
            // O perfil do Auth continua disponível se a Data API falhar.
        }

        if (current === verificationId) {
            setText('profile-storage-status', saved
                ? 'Cadastro salvo.'
                : 'Sua sessão está ativa. Não foi possível confirmar o cadastro agora.');
        }
    }

    function scheduleVerification() {
        if (!client || signingIn || signingOut) return;

        clearTimeout(verificationTimer);
        verificationTimer = setTimeout(() => {
            void verifySession();
        }, 0);
    }

    window.addEventListener('online', scheduleVerification);
    window.addEventListener('focus', scheduleVerification);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleVerification();
        }
    });

    async function startGoogleLogin({ currentTarget }) {
        const registering = currentTarget === googleRegister;
        if (!client || !googleAvailable || signingIn || signingOut) {
            return;
        }

        try {
            sessionStorage.setItem(
                loginMarker,
                JSON.stringify({ startedAt: Date.now() })
            );
        } catch {}

        signingIn = true;
        updateGoogleButtons();
        setStatus(registering ? 'Abrindo o cadastro com Google…' : 'Abrindo o login com Google…');

        try {
            const { error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo:
                        `${location.origin}${location.pathname}#chat-panel`,
                    scopes: 'openid email profile',
                    ...(registering && { queryParams: { prompt: 'select_account' } })
                }
            });

            if (error) throw error;
        } catch {
            clearPendingWelcome();
            signingIn = false;
            updateGoogleButtons();

            setStatus(
                'Não foi possível iniciar o login Google. Continue como visitante ou tente novamente.'
            );
        }
    }

    googleButtons.forEach(button => button.addEventListener('click', startGoogleLogin));

    async function signOut() {
        if (!client || signingOut) return;

        signingOut = true;
        ++verificationId;
        clearTimeout(verificationTimer);

        signOutButtons.forEach(button => {
            button.disabled = true;
        });

        if (logoutError) logoutError.hidden = true;

        try {
            const { error } = await client.auth.signOut({
                scope: 'local'
            });

            if (error) throw error;

            ++verificationId;
            clearPendingWelcome();
            render(null);

            setStatus(
                'Você saiu do perfil neste dispositivo. Continue como visitante quando quiser.'
            );
        } catch {
            if (logoutError) {
                logoutError.textContent =
                    'Não foi possível sair do perfil. Tente novamente.';
                logoutError.hidden = false;
            }
        } finally {
            signingOut = false;

            signOutButtons.forEach(button => {
                button.disabled = false;
            });
        }
    }

    signOutButtons.forEach(button => {
        button.addEventListener('click', signOut);
    });

    async function initializeAuth() {
        updateGoogleButtons();

        try {
            const response = await fetch('/api/auth/config', {
                cache: 'no-store',
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                throw new Error('Configuração indisponível');
            }

            const config = await response.json();

            if (!config.available) {
                setStatus(
                    config.message ||
                    'O login está indisponível. Continue como visitante.'
                );
                return;
            }

            if (!window.supabase?.createClient) {
                throw new Error('Biblioteca de autenticação indisponível');
            }

            client = window.supabase.createClient(
                config.url,
                config.publishableKey,
                {
                    auth: {
                        flowType: 'pkce',
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );

            googleAvailable = config.googleEnabled !== false;

            updateGoogleButtons();

            setStatus(
                googleAvailable
                    ? 'Já tem conta? Entre com o mesmo Google que usou no cadastro.'
                    : 'O login Google ainda não foi habilitado. Continue como visitante.'
            );

            client.auth.onAuthStateChange(event => {
                // Mantém o callback síncrono; verifica fora dele.
                if (event === 'SIGNED_OUT') {
                    ++verificationId;
                    clearTimeout(verificationTimer);
                    clearPendingWelcome();
                    render(null);
                    return;
                }

                if (
                    event === 'SIGNED_IN' ||
                    event === 'TOKEN_REFRESHED' ||
                    event === 'USER_UPDATED'
                ) {
                    ++verificationId;
                    scheduleVerification();
                }
            });

            await verifySession();

            if (hasAuthError) {
                clearPendingWelcome();

                setStatus(
                    'O login foi cancelado ou não pôde ser concluído. Você pode tentar novamente ou continuar como visitante.'
                );

                const modal = document.getElementById('account-modal');

                if (modal && window.bootstrap?.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance(modal).show();
                }

                const url = new URL(location.href);

                ['error', 'error_code', 'error_description'].forEach(key => {
                    url.searchParams.delete(key);
                });

                url.hash = 'chat-panel';
                history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
        } catch {
            setStatus(
                'O acesso à conta está indisponível no momento. As consultas continuam disponíveis como visitante.'
            );
        }
    }

    void initializeAuth();
});