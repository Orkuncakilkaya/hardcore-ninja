import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { NetworkMessage } from '../common/messages';

export class NetworkManager {
  private peer: Peer;
  private connections: DataConnection[] = [];
  private _isHost: boolean = false;
  private _playerName: string = '';
  private _playerAvatar: string | null = null;

  public get isHost(): boolean {
    return this._isHost;
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

    this.peer.on('connection', conn => {
      this.handleConnection(conn);
    });
  }

  public hostGame() {
    this._isHost = true;
  }

  public joinGame(hostId: string) {
    this._isHost = false;
    const conn = this.peer.connect(hostId);
    this.handleConnection(conn);
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.push(conn);
      window.dispatchEvent(new CustomEvent('connected', { detail: conn.peer }));
    });

    conn.on('data', (data: NetworkMessage) => {
      // Dispatch event for Game to handle
      window.dispatchEvent(
        new CustomEvent('network-data', { detail: { from: conn.peer, data: data } })
      );
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c !== conn);
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
}
