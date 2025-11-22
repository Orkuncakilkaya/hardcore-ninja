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
    | 'SPAWN_POINTS_REQUEST' // Legacy, might remove
    | 'SPAWN_POINT_RESPONSE' // Legacy, might remove
    | 'MAP_CONFIG';

export interface BaseMessage {
    type: MessageType;
}

export interface JoinRequestMessage extends BaseMessage {
    type: 'JOIN_REQUEST';
    playerId: string;
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
    timestamp: number;
}

export interface StateRequestMessage extends BaseMessage {
    type: 'STATE_REQUEST';
}

export interface PlayerDiedMessage extends BaseMessage {
    type: 'PLAYER_DIED';
    id: string;
}

export type NetworkMessage =
    | JoinRequestMessage
    | JoinResponseMessage
    | InputMessage
    | StateUpdateMessage
    | SkillRequestMessage
    | StateRequestMessage
    | PlayerDiedMessage;
