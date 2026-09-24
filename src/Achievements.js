import { Storage } from './storage.js';
export class AchievementsManager {
    constructor() {
        this.achievements = JSON.parse(Storage.getItem('py_sim_achievements', '{}') || '{}');
        this.definitions = {
            'first_steps': { title: 'Primeros Pasos', desc: '¡Completaste tu primera misión Python!' },
            'detective': { title: 'Detective', desc: 'Completaste una auditoría exitosamente.' },
            'builder': { title: 'Constructor', desc: 'Ensamblaste tu primer programa.' },
            'master': { title: 'Maestro Python', desc: 'Venciste el último desafío. ¡Eres el maestro!' },
            'half_way': { title: 'A Medio Camino', desc: 'Llegaste a la mitad del curso.' }
        };
        this.setupContainer();
    }

    setupContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.setAttribute('role', 'status');
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'true');
            Object.assign(container.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                zIndex: '99999'
            });
            document.body.appendChild(container);
        }

        if (!document.getElementById('toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.textContent = `
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
            `;
            document.head.appendChild(style);
        }
    }

    unlock(id) {
        if (this.achievements[id] || !this.definitions[id]) return;

        this.achievements[id] = true;
        Storage.setItem('py_sim_achievements', JSON.stringify(this.achievements));

        this.showToast(this.definitions[id]);
        this.playUnlockSound();
    }

    showToast(achievement) {
        const toast = document.createElement('div');
        toast.className = 'retro-toast';
        Object.assign(toast.style, {
            background: 'gold',
            border: '2px solid #b8860b',
            boxShadow: '4px 4px 0px rgba(0,0,0,0.5)',
            padding: '10px',
            color: 'black',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideIn 0.5s ease-out',
            fontFamily: 'var(--font-ui)',
            minWidth: '200px'
        });

        toast.innerHTML = `
            <i class="ph-fill ph-trophy" style="font-size: 24px; color: #8b6508;"></i>
            <div>
                <div style="font-weight: bold; font-size: 14px;">Logro Desbloqueado</div>
                <div style="font-size: 12px; font-weight: bold;">${achievement.title}</div>
            </div>
        `;

        document.getElementById('toast-container').appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.5s ease-in';
            setTimeout(() => toast.remove(), 490);
        }, 5000);
    }

    playUnlockSound() {
    }
}