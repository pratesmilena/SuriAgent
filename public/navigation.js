document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('site-sidebar');
    const menu = document.getElementById('menu-toggle');
    const tabs = [...document.querySelectorAll('#workspace-tabs [data-bs-toggle="pill"]')];
    const mobile = () => window.innerWidth < 992;
    let collapsed = false;
    try { collapsed = localStorage.getItem('suri-sidebar-collapsed') === 'true'; } catch {}
    function reflect() {
        document.body.classList.toggle('sidebar-collapsed', !mobile() && collapsed);
        menu.setAttribute('aria-expanded', String(mobile() ? sidebar.classList.contains('show') : !collapsed));
    }
    function go(id) {
        const tab = tabs.find(item => item.getAttribute('aria-controls') === id);
        if (!tab) return;
        bootstrap.Tab.getOrCreateInstance(tab).show();
        if (mobile()) bootstrap.Offcanvas.getInstance(sidebar)?.hide();
    }
    menu.addEventListener('click', () => {
        if (mobile()) bootstrap.Offcanvas.getOrCreateInstance(sidebar).toggle();
        else { collapsed = !collapsed; try { localStorage.setItem('suri-sidebar-collapsed', String(collapsed)); } catch {} reflect(); }
    });
    sidebar.addEventListener('shown.bs.offcanvas', reflect);
    sidebar.addEventListener('hidden.bs.offcanvas', () => { reflect(); menu.focus(); });
    tabs.forEach(tab => tab.addEventListener('shown.bs.tab', () => {
        history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
        if (mobile()) bootstrap.Offcanvas.getInstance(sidebar)?.hide();
    }));
    tabs.forEach(tab => tab.addEventListener('click', () => {
        // Fechar também ao escolher a seção que já está aberta.
        if (mobile()) bootstrap.Offcanvas.getInstance(sidebar)?.hide();
    }));
    document.addEventListener('click', event => {
        const link = event.target.closest('[data-route]');
        if (!link) return;
        event.preventDefault(); go(link.dataset.route);
    });
    document.querySelectorAll('[data-bs-target="#account-modal"]').forEach(button => button.addEventListener('click', event => {
        if (!mobile() || !sidebar.classList.contains('show')) return;
        // Não sobrepor duas armadilhas de foco (menu e modal) no celular.
        event.preventDefault(); event.stopPropagation();
        sidebar.addEventListener('hidden.bs.offcanvas', () => {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('account-modal')).show();
        }, { once: true });
        bootstrap.Offcanvas.getInstance(sidebar)?.hide();
    }));
    window.addEventListener('hashchange', () => go(location.hash.slice(1)));
    window.addEventListener('resize', () => {
        if (!mobile()) bootstrap.Offcanvas.getInstance(sidebar)?.hide();
        reflect();
    });
    let gesture;
    document.addEventListener('pointerdown', event => {
        if (!mobile() || event.pointerType !== 'touch') return;
        if (event.clientX < 24 || sidebar.contains(event.target)) gesture = { x: event.clientX, y: event.clientY, inside: sidebar.contains(event.target) };
    }, { passive: true });
    document.addEventListener('pointerup', event => {
        if (!gesture) return;
        const dx = event.clientX - gesture.x;
        if (Math.abs(event.clientY - gesture.y) < 60) {
            if (!gesture.inside && dx > 70) bootstrap.Offcanvas.getOrCreateInstance(sidebar).show();
            if (gesture.inside && dx < -70) bootstrap.Offcanvas.getInstance(sidebar)?.hide();
        }
        gesture = null;
    }, { passive: true });
    document.addEventListener('pointercancel', () => { gesture = null; });
    reflect(); go(location.hash.slice(1));
    fetch('/api/escola', { signal: AbortSignal.timeout(10000) }).then(async response => {
        if (!response.ok) throw new Error();
        const school = await response.json();
        document.getElementById('school-address').textContent = school.endereco || 'Confirme o endereço com a secretaria.';
        document.getElementById('school-address-source').textContent = '';
    }).catch(() => { document.getElementById('school-address').textContent = 'Não foi possível carregar o endereço. Tente novamente mais tarde ou consulte a secretaria.'; });
});
