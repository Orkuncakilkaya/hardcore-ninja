import { ServerEntityManager } from './ServerEntityManager';
import { NetworkManager } from '../network/NetworkManager';
import { TICK_RATE, TICK_INTERVAL } from '../common/constants';
import type { MapConfig } from '../common/types';
import type { NetworkMessage } from '../common/messages';
import * as THREE from 'three';

export class GameServer {
    private entityManager: ServerEntityManager;
    private networkManager: NetworkManager;
    private intervalId: any = null;
    private mapConfig: MapConfig;

    constructor(networkManager: NetworkManager, mapConfig: MapConfig) {
        this.networkManager = networkManager;
        this.mapConfig = mapConfig;
        this.entityManager = new ServerEntityManager();
        this.entityManager.loadMap(mapConfig);

        this.setupNetworkHandlers();
    }

    private setupNetworkHandlers() {
        // We need a way to intercept messages intended for the server
        // Since NetworkManager is shared, we might need a specific "ServerNetworkAdapter" or similar.
        // For now, let's assume NetworkManager exposes an event or callback for received messages.

        // In the current architecture, NetworkManager dispatches window events. 
        // This is browser-specific. The server logic should ideally be environment agnostic but we are running in browser (Host).
        // So we can listen to the same events, but we need to distinguish "Server" handling from "Client" handling.

        window.addEventListener('network-data', (e: any) => {
            if (!this.networkManager.isHost) return; // Only Host runs the server

            const { from, data } = e.detail;
            this.handleMessage(from, data);
        });

        window.addEventListener('player-disconnected', (e: any) => {
            if (!this.networkManager.isHost) return;
            this.entityManager.removePlayer(e.detail);
            this.networkManager.broadcast({ type: 'PLAYER_DIED', id: e.detail }); // Or PLAYER_LEFT
        });
    }

    private handleMessage(playerId: string, message: NetworkMessage) {
        switch (message.type) {
            case 'JOIN_REQUEST':
                // Handle join (actually PeerJS handles connection, this might be application level handshake)
                // For now, we assume connection = join.
                // But if we have a specific JOIN_REQUEST message:
                const player = this.entityManager.addPlayer(playerId);
                this.networkManager.sendToClient(playerId, {
                    type: 'JOIN_RESPONSE',
                    success: true,
                    mapConfig: this.mapConfig,
                    playerId: playerId,
                    spawnPosition: player.position
                });
                break;

            case 'PLAYER_INPUT':
                const p = this.entityManager.getPlayer(playerId);
                if (p) {
                    if (message.destination) {
                        console.log(`Processing Move for ${playerId} to`, message.destination);
                        p.setDestination(new THREE.Vector3(message.destination.x, message.destination.y, message.destination.z));
                    }
                } else {
                    console.warn(`Player ${playerId} not found for input`);
                }
                break;

            case 'SKILL_REQUEST':
                const sp = this.entityManager.getPlayer(playerId);
                if (sp) {
                    if (message.skillType === 'TELEPORT' && message.target) {
                        sp.attemptTeleport(new THREE.Vector3(message.target.x, message.target.y, message.target.z), this.entityManager.getObstacles());
                    } else if (message.skillType === 'HOMING_MISSILE' && message.target) {
                        sp.attemptHomingMissile(new THREE.Vector3(message.target.x, message.target.y, message.target.z), this.entityManager);
                    } else if (message.skillType === 'LASER_BEAM' && message.direction) {
                        sp.attemptLaserBeam(message.direction, this.entityManager);
                    }
                    // Handle other skills
                }
                break;

            case 'STATE_REQUEST':
                const state = this.entityManager.getState();
                this.networkManager.sendToClient(playerId, {
                    type: 'GAME_STATE_UPDATE',
                    state: state,
                    timestamp: Date.now()
                });
                break;
        }
    }

    public start() {
        if (this.intervalId) return;
        console.log('Game Server Started');

        // Add Host Player
        this.entityManager.addPlayer(this.networkManager.peerId);

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000 / TICK_RATE);
    }

    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private tick() {
        this.entityManager.update(TICK_INTERVAL);
        const state = this.entityManager.getState();
        this.networkManager.broadcast({
            type: 'GAME_STATE_UPDATE',
            state: state,
            timestamp: Date.now()
        });
    }
}
