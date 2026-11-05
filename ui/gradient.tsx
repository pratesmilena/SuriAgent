import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AnimatedGradient from './spell-ui/animated-gradient';

function GradientSurface({ host }: { host: HTMLElement }) {
    const [active, setActive] = useState(false);
    useEffect(() => {
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        let inView = true;
        const update = () => setActive(inView && !document.hidden && !reduced.matches);
        const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); });
        observer.observe(host);
        reduced.addEventListener('change', update);
        document.addEventListener('visibilitychange', update);
        update();
        return () => { observer.disconnect(); reduced.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); };
    }, [host]);
    return active ? <AnimatedGradient config={{ preset: 'Plasma', speed: 18 }} style={{ zIndex: 0 }} radius="20px" /> : null;
}
const host = document.getElementById('gradient-root');
if (host) createRoot(host).render(<GradientSurface host={host} />);
