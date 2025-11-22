import './style.css'
import './style.css'
import { NetworkManager } from './network/NetworkManager';
import { GameClient } from './client/GameClient';
import { GameServer } from './server/GameServer';
import { MapLoader } from './core/MapLoader';

const networkManager = new NetworkManager();
const gameClient = new GameClient(networkManager);

// UI Logic
const btnHost = document.getElementById('btn-host')!;
const btnJoin = document.getElementById('btn-join')!;
const inputHostId = document.getElementById('input-host-id') as HTMLInputElement;
const hostControls = document.getElementById('host-controls')!;
const lobbyControls = document.getElementById('lobby-controls')!;
const myIdDisplay = document.getElementById('my-id-display')!;
const statusEl = document.getElementById('connection-status')!;

window.addEventListener('network-ready', (_e: any) => {
    statusEl.textContent = 'Network Ready!';
    hostControls.style.display = 'block';
});

window.addEventListener('connected', (_e: any) => {
    if (!networkManager.isHost) {
        statusEl.textContent = 'Connected! Joining game...';
        gameClient.joinGame(inputHostId.value);
    }
});

btnHost.addEventListener('click', async () => {
    networkManager.hostGame();
    hostControls.style.display = 'none';
    lobbyControls.style.display = 'block';
    myIdDisplay.textContent = `Hosting on ID: ${networkManager.peerId}`;

    // Start Server
    try {
        const mapConfig = await MapLoader.loadMap('/maps/default_map.json');
        const server = new GameServer(networkManager, mapConfig);
        server.start();

        // Join as client
        gameClient.joinGame(networkManager.peerId);
    } catch (e) {
        console.error('Failed to start server:', e);
        statusEl.textContent = 'Error starting server';
    }
});

btnJoin.addEventListener('click', () => {
    const hostId = inputHostId.value;
    if (hostId) {
        networkManager.joinGame(hostId);
        hostControls.style.display = 'none';
        statusEl.textContent = 'Connecting...';
    }
});

