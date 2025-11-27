import type { InputState, GameState, Vector3, MapConfig } from './types';
import { SkillType } from './constants';

export type MessageType =
  | 'JOIN_REQUEST'
  | 'JOIN_RESPONSE'
  | 'PLAYER_INPUT'
  | 'GAME_STATE_UPDATE'
  | 'SKILL_REQUEST'
  | 'STATE_REQUEST'
  | 'PLAYER_DIED'
  | 'START_GAME'
  | 'RESTART_GAME'
  | 'SPAWN_POINTS_REQUEST' // Legacy, might remove
  | 'SPAWN_POINT_RESPONSE' // Legacy, might remove
  | 'MAP_CONFIG'
  | 'PING'
  | 'PONG';

export interface BaseMessage {
  type: MessageType;
}

export interface JoinRequestMessage extends BaseMessage {
  type: 'JOIN_REQUEST';
  playerId: string;
  username?: string;
  avatar?: string;
}

export interface JoinResponseMessage extends BaseMessage {
  type: 'JOIN_RESPONSE';
  success: boolean;
  mapConfig?: MapConfig;
  playerId: string;
  spawnPosition: Vector3;
}

export interface InputMessage extends BaseMessage {
  type: 'PLAYER_INPUT';
  input: InputState;
  destination?: Vector3;
  stopMovement?: boolean;
  timestamp?: number;
}

export interface StateUpdateMessage extends BaseMessage {
  type: 'GAME_STATE_UPDATE';
  state: GameState;
  timestamp: number;
}

export interface SkillRequestMessage extends BaseMessage {
  type: 'SKILL_REQUEST';
  skillType: SkillType;
  target?: Vector3;
  direction?: Vector3; // For directional skills like laser beam
  timestamp: number;
}

export interface StateRequestMessage extends BaseMessage {
  type: 'STATE_REQUEST';
}

export interface PlayerDiedMessage extends BaseMessage {
  type: 'PLAYER_DIED';
  id: string;
}

export interface StartGameMessage extends BaseMessage {
  type: 'START_GAME';
}

export interface RestartGameMessage extends BaseMessage {
  type: 'RESTART_GAME';
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
  timestamp: number;
}

export interface PongMessage extends BaseMessage {
  type: 'PONG';
  timestamp: number;
}

export type NetworkMessage =
  | JoinRequestMessage
  | JoinResponseMessage
  | InputMessage
  | StateUpdateMessage
  | SkillRequestMessage
  | StateRequestMessage
  | PlayerDiedMessage
  | PlayerDiedMessage
  | StartGameMessage
  | RestartGameMessage
  | PingMessage
  | PongMessage;
