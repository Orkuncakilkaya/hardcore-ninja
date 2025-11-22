import './style.css'
import { NetworkManager } from './network/NetworkManager';
import { GameClient } from './client/GameClient';
import { GameServer } from './server/GameServer';
import { MapLoader } from './core/MapLoader';

const networkManager = new NetworkManager();
const gameClient = new GameClient(networkManager);

// UI Logic
const hostIdLabel = document.getElementById('host-id') as HTMLInputElement;
const btnHost = document.getElementById('btn-host')!;
const btnJoin = document.getElementById('btn-join')!;
const inputHostId = document.getElementById('input-host-id') as HTMLInputElement;
const hostControls = document.getElementById('host-controls')!;
const lobbyControls = document.getElementById('lobby-controls')!;
const myIdDisplay = document.getElementById('my-id-display')!;
const statusEl = document.getElementById('connection-status')!;

// Create player name input container
const playerNameContainer = document.createElement('div');
playerNameContainer.id = 'player-name-container';
playerNameContainer.style.marginBottom = '15px';

// Create player name input
const inputPlayerName = document.createElement('input');
inputPlayerName.id = 'input-player-name';
inputPlayerName.type = 'text';
inputPlayerName.placeholder = 'Enter your name';
inputPlayerName.style.width = '100%';
inputPlayerName.style.padding = '8px';
inputPlayerName.style.marginBottom = '5px';
inputPlayerName.style.borderRadius = '4px';
inputPlayerName.style.border = '1px solid #ccc';
inputPlayerName.maxLength = 15; // Limit name length

// Create save button
const btnSaveName = document.createElement('button');
btnSaveName.id = 'btn-save-name';
btnSaveName.textContent = 'Save Name';
btnSaveName.style.padding = '8px 16px';
btnSaveName.style.backgroundColor = '#4CAF50';
btnSaveName.style.color = 'white';
btnSaveName.style.border = 'none';
btnSaveName.style.borderRadius = '4px';
btnSaveName.style.cursor = 'pointer';
btnSaveName.style.width = '100%';

// Create player name display
const playerNameDisplay = document.createElement('div');
playerNameDisplay.id = 'player-name-display';
playerNameDisplay.style.marginBottom = '10px';
playerNameDisplay.style.padding = '8px';
playerNameDisplay.style.backgroundColor = '#2f2f2f';
playerNameDisplay.style.borderRadius = '4px';
playerNameDisplay.style.display = 'none';
playerNameDisplay.style.textAlign = 'center';
playerNameDisplay.style.fontWeight = 'bold';
playerNameDisplay.style.position = 'relative'; // For positioning the reset button

// Create player name text element
const playerNameText = document.createElement('span');
playerNameText.id = 'player-name-text';
playerNameDisplay.appendChild(playerNameText);

// Create reset button for player name
const btnResetName = document.createElement('button');
btnResetName.id = 'btn-reset-name';
btnResetName.textContent = 'Reset';
btnResetName.style.position = 'absolute';
btnResetName.style.top = '5px';
btnResetName.style.right = '5px';
btnResetName.style.padding = '4px 8px';
btnResetName.style.backgroundColor = '#f44336';
btnResetName.style.color = 'white';
btnResetName.style.border = 'none';
btnResetName.style.borderRadius = '4px';
btnResetName.style.cursor = 'pointer';
btnResetName.style.fontSize = '12px';

// Add player name elements to the host controls
playerNameContainer.appendChild(inputPlayerName);
playerNameContainer.appendChild(btnSaveName);
playerNameDisplay.appendChild(btnResetName);
hostControls.insertBefore(playerNameContainer, hostControls.firstChild);
hostControls.insertBefore(playerNameDisplay, playerNameContainer.nextSibling);

window.addEventListener('network-ready', (_e: any) => {
    statusEl.textContent = 'Network Ready!';
    hostControls.style.display = 'block';
    if (hostIdLabel) {
        hostIdLabel.value = networkManager.peerId;
        hostIdLabel.addEventListener('click', () => {
            hostIdLabel.select();
            hostIdLabel.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(hostIdLabel.value);
        })
    }
});

// Handle player name events
window.addEventListener('player-name-changed', (e: any) => {
    const name = e.detail;
    if (name) {
        playerNameContainer.style.display = 'none';
        playerNameDisplay.style.display = 'block';
        playerNameText.textContent = `Playing as: ${name}`;
    } else {
        playerNameContainer.style.display = 'block';
        playerNameDisplay.style.display = 'none';
    }
});

// Add event listener for save button
btnSaveName.addEventListener('click', () => {
    const name = inputPlayerName.value.trim();
    if (name) {
        networkManager.playerName = name;
    } else {
        alert('Please enter a name');
    }
});

// Add event listener for reset button
btnResetName.addEventListener('click', () => {
    // Clear the player name
    networkManager.playerName = '';
    // Clear the input field
    inputPlayerName.value = '';
});

// Initialize player name display if name is already set
if (networkManager.playerName) {
    playerNameContainer.style.display = 'none';
    playerNameDisplay.style.display = 'block';
    playerNameText.textContent = `Playing as: ${networkManager.playerName}`;
    inputPlayerName.value = networkManager.playerName;
}

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
