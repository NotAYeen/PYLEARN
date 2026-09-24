import { App } from './App.js';

const initApp = () => {
    const pySim = new App();
    pySim.init();
    window.pySim = pySim;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}