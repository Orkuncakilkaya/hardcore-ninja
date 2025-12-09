import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { NetworkMessage } from '../common/messages';

export class NetworkManager {
  private peer: Peer;
  private connections: DataConnection[] = [];
  private _isHost: boolean = false;
  private _playerName: string = '';
  private _playerAvatar: string | null = null;
  private _hostId: string | null = null; // Store host ID for clients

  public get isHost(): boolean {
    return this._isHost;
  }

  public get hostId(): string | null {
    return this._hostId;
  }

  public get peerId(): string {
    return this.peer.id;
  }

  public get playerName(): string {
    return this._playerName;
  }

  public set playerName(name: string) {
    this._playerName = name;
    // Save to localStorage for persistence
    localStorage.setItem('player_name', name);
    // Dispatch event to notify UI of name change
    window.dispatchEvent(new CustomEvent('player-name-changed', { detail: name }));
  }

  public get playerAvatar(): string | null {
    return this._playerAvatar;
  }

  public set playerAvatar(avatar: string | null) {
    this._playerAvatar = avatar;
    if (avatar) {
      localStorage.setItem('player_avatar', avatar);
    } else {
      localStorage.removeItem('player_avatar');
    }
  }

  constructor() {
    this.peer = new Peer();

    this.peer.on('open', id => {
      // Dispatch event or callback to update UI with ID
      window.dispatchEvent(new CustomEvent('network-ready', { detail: id }));

      // Load saved player name if available, otherwise generate random
      let savedName = localStorage.getItem('player_name');
      if (!savedName) {
        const randomId = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, '0');
        savedName = `Player${randomId}`;
        localStorage.setItem('player_name', savedName);
      }

      this._playerName = savedName;
      window.dispatchEvent(new CustomEvent('player-name-changed', { detail: savedName }));

      // Load saved avatar if available
      const savedAvatar = localStorage.getItem('player_avatar');
      if (savedAvatar) {
        this._playerAvatar = savedAvatar;
      }
    });

    this.peer.on('error', err => {
      console.error('PeerJS error:', err);
      window.dispatchEvent(new CustomEvent('connection-error', { detail: err }));
    });

    this.peer.on('connection', conn => {
      this.handleConnection(conn);
    });
  }

  public hostGame() {
    this._isHost = true;
    this.startHeartbeat();
  }

  public joinGame(hostId: string) {
    this._isHost = false;
    this._hostId = hostId;
    const conn = this.peer.connect(hostId);
    this.handleConnection(conn);
    this.startClientHeartbeatCheck();
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.push(conn);
      this.lastPongTimes.set(conn.peer, Date.now()); // Initialize timestamp
      window.dispatchEvent(new CustomEvent('connected', { detail: conn.peer }));
    });

    conn.on('data', (data: unknown) => {
      const message = data as NetworkMessage;

      // Handle internal heartbeat messages
      if (message.type === 'PING' || message.type === 'PONG') {
        this.handlePingPong(conn.peer, message);
        return; // Don't dispatch PING/PONG to game
      }

      // Dispatch event for Game to handle
      window.dispatchEvent(
        new CustomEvent('network-data', {
          detail: { from: conn.peer, data: message },
        })
      );
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
      this.lastPongTimes.delete(conn.peer);
      window.dispatchEvent(new CustomEvent('player-disconnected', { detail: conn.peer }));
    });
  }

  public broadcast(data: NetworkMessage) {
    this.connections.forEach(conn => conn.send(data));
    // If we are host, we also need to receive the broadcast locally (as a client)
    if (this.isHost) {
      window.dispatchEvent(
        new CustomEvent('network-data', { detail: { from: this.peerId, data: data } })
      );
    }
  }

  public sendToHost(data: NetworkMessage) {
    if (this.isHost) {
      // Loopback: We are the host, so we receive our own message
      // We need to simulate receiving data from "ourselves" (client to server)
      // The GameServer listens to 'network-data'
      window.dispatchEvent(
        new CustomEvent('network-data', { detail: { from: this.peerId, data: data } })
      );
    } else if (this.connections.length > 0) {
      this.connections[0].send(data);
    }
  }

  public sendToClient(peerId: string, data: NetworkMessage) {
    if (peerId === this.peerId) {
      // Loopback: Server sending to Host Client
      window.dispatchEvent(
        new CustomEvent('network-data', { detail: { from: this.peerId, data: data } })
      );
      return;
    }

    const conn = this.connections.find(c => c.peer === peerId);
    if (conn) {
      conn.send(data);
    }
  }

  // Heartbeat Mechanism
  private heartbeatInterval: number | null = null;
  private lastPongTimes: Map<string, number> = new Map();
  private readonly PING_INTERVAL = 2000; // Send PING every 2 seconds
  private readonly CONNECTION_TIMEOUT = 5000; // Disconnect if no PONG for 5 seconds

  public startHeartbeat() {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = window.setInterval(() => {
      const now = Date.now();

      // Send PING to all connections
      this.connections.forEach(conn => {
        conn.send({ type: 'PING', timestamp: now });

        // Check for timeout
        const lastPong = this.lastPongTimes.get(conn.peer) || now; // Give grace period for new connections
        if (now - lastPong > this.CONNECTION_TIMEOUT) {
          console.warn(`Connection timed out for ${conn.peer}, forcing disconnect`);
          conn.close();
          // Force disconnect event since close event might not fire immediately
          this.connections = this.connections.filter(c => c !== conn);
          window.dispatchEvent(new CustomEvent('player-disconnected', { detail: conn.peer }));
          this.lastPongTimes.delete(conn.peer);
        }
      });
    }, this.PING_INTERVAL);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.lastPongTimes.clear();
    this.stopClientHeartbeatCheck();
  }

  public handlePingPong(peerId: string, message: NetworkMessage) {
    if (message.type === 'PING') {
      // Respond with PONG
      if (this.isHost) {
        // Host responding to client PING (if clients ping host, but currently only host pings clients)
        // For now, clients respond to host PING
      } else {
        // Client responding to Host PING
        this.lastHostPingTime = Date.now(); // Update last ping time from host
        this.sendToHost({ type: 'PONG', timestamp: Date.now() });
      }
    } else if (message.type === 'PONG') {
      // Update last PONG time
      this.lastPongTimes.set(peerId, Date.now());
    }
  }

  // Client-side Host Monitor
  private clientHeartbeatInterval: number | null = null;
  private lastHostPingTime: number = 0;

  private startClientHeartbeatCheck() {
    if (this.clientHeartbeatInterval) return;

    this.lastHostPingTime = Date.now(); // Initialize

    this.clientHeartbeatInterval = window.setInterval(() => {
      const now = Date.now();
      // If we haven't received a PING from the host in a while, assume they are gone
      if (now - this.lastHostPingTime > this.CONNECTION_TIMEOUT) {
        console.warn('Host connection timed out, triggering disconnect');

        // Trigger disconnect event
        if (this._hostId) {
          window.dispatchEvent(new CustomEvent('player-disconnected', { detail: this._hostId }));
        }

        // Stop checking
        this.stopClientHeartbeatCheck();
      }
    }, 1000); // Check every second
  }

  private stopClientHeartbeatCheck() {
    if (this.clientHeartbeatInterval) {
      clearInterval(this.clientHeartbeatInterval);
      this.clientHeartbeatInterval = null;
    }
  }
}
