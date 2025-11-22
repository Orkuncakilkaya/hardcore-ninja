import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';

export class NetworkManager {
    private peer: Peer;
    private connections: DataConnection[] = [];
    private _isHost: boolean = false;

    public get isHost(): boolean {
        return this._isHost;
    }

    public get peerId(): string {
        return this.peer.id;
    }

    constructor() {
        this.peer = new Peer();

        this.peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            // Dispatch event or callback to update UI with ID
            window.dispatchEvent(new CustomEvent('network-ready', { detail: id }));
        });

        this.peer.on('connection', (conn) => {
            this.handleConnection(conn);
        });
    }

    public hostGame() {
        this._isHost = true;
        console.log('Hosting game...');
    }

    public joinGame(hostId: string) {
        this._isHost = false;
        console.log('Joining game:', hostId);
        const conn = this.peer.connect(hostId);
        this.handleConnection(conn);
    }

    private handleConnection(conn: DataConnection) {
        conn.on('open', () => {
            console.log('Connected to:', conn.peer);
            this.connections.push(conn);
            window.dispatchEvent(new CustomEvent('connected', { detail: conn.peer }));
        });

        conn.on('data', (data: any) => {
            // Dispatch event for Game to handle
            window.dispatchEvent(new CustomEvent('network-data', { detail: { from: conn.peer, data: data } }));
        });

        conn.on('close', () => {
            console.log('Connection closed:', conn.peer);
            this.connections = this.connections.filter(c => c !== conn);
            window.dispatchEvent(new CustomEvent('player-disconnected', { detail: conn.peer }));
        });
    }

    public broadcast(data: any) {
        this.connections.forEach(conn => conn.send(data));
        // If we are host, we also need to receive the broadcast locally (as a client)
        if (this.isHost) {
            window.dispatchEvent(new CustomEvent('network-data', { detail: { from: this.peerId, data: data } }));
        }
    }

    public sendToHost(data: any) {
        if (this.isHost) {
            // Loopback: We are the host, so we receive our own message
            // We need to simulate receiving data from "ourselves" (client to server)
            // The GameServer listens to 'network-data'
            window.dispatchEvent(new CustomEvent('network-data', { detail: { from: this.peerId, data: data } }));
        } else if (this.connections.length > 0) {
            this.connections[0].send(data);
        }
    }

    public sendToClient(peerId: string, data: any) {
        if (peerId === this.peerId) {
            // Loopback: Server sending to Host Client
            window.dispatchEvent(new CustomEvent('network-data', { detail: { from: this.peerId, data: data } }));
            return;
        }

        const conn = this.connections.find(c => c.peer === peerId);
        if (conn) {
            conn.send(data);
        }
    }
}
