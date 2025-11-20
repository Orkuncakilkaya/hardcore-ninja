import * as THREE from 'three';
import { Player } from '../entities/Player';
import { EntityManager } from '../entities/EntityManager';

export const SkillType = {
    BASIC_ATTACK: 'BASIC_ATTACK',
    MISSILE: 'MISSILE',
    SLASH: 'SLASH',
    TANK: 'TANK',
    ULTIMATE: 'ULTIMATE'
} as const;

export type SkillType = typeof SkillType[keyof typeof SkillType];

export interface Skill {
    type: SkillType;
    cooldown: number;
    currentCooldown: number;
    activate(player: Player, entityManager: EntityManager, target?: THREE.Vector3): void;
    update(delta: number): void;
}

export class SkillSystem {
    private skills: Map<SkillType, Skill> = new Map();
    private player: Player;
    private entityManager: EntityManager;

    constructor(player: Player, entityManager: EntityManager) {
        this.player = player;
        this.entityManager = entityManager;
        this.skills.set(SkillType.BASIC_ATTACK, new BasicAttack());
        this.skills.set(SkillType.MISSILE, new MissileSkill());
        this.skills.set(SkillType.SLASH, new SlashSkill());
        this.skills.set(SkillType.TANK, new TankSkill());
        this.skills.set(SkillType.ULTIMATE, new UltimateSkill(this));
    }

    public activateSkill(type: SkillType, target?: THREE.Vector3) {
        const skill = this.skills.get(type);
        if (skill && skill.currentCooldown <= 0) {
            skill.activate(this.player, this.entityManager, target);
        }
    }

    public update(delta: number) {
        this.skills.forEach(skill => skill.update(delta));
    }

    public resetCooldowns(except: SkillType) {
        this.skills.forEach(skill => {
            if (skill.type !== except) {
                skill.currentCooldown = 0;
            }
        });
    }
}

class BasicAttack implements Skill {
    type = SkillType.BASIC_ATTACK;
    cooldown = 0.5; // Short cooldown
    currentCooldown = 0;
    range = 3.0;
    damage = 10;

    activate(player: Player, entityManager: EntityManager, _target?: THREE.Vector3) {
        console.log('Basic Attack!');
        this.currentCooldown = this.cooldown;

        // Simple distance check against all other players
        entityManager.players.forEach(otherPlayer => {
            if (otherPlayer.id !== player.id) {
                const dist = player.mesh.position.distanceTo(otherPlayer.mesh.position);
                if (dist <= this.range) {
                    otherPlayer.takeDamage(this.damage);
                }
            }
        });
    }

    update(delta: number) {
        if (this.currentCooldown > 0) this.currentCooldown -= delta;
    }
}

class MissileSkill implements Skill {
    type = SkillType.MISSILE;
    cooldown = 30;
    currentCooldown = 0;

    activate(player: Player, entityManager: EntityManager, _target?: THREE.Vector3) {
        console.log('Missile Fired!');
        this.currentCooldown = this.cooldown;
        entityManager.spawnMissile(player.id, player.mesh.position, player.mesh.rotation);
    }

    update(delta: number) {
        if (this.currentCooldown > 0) this.currentCooldown -= delta;
    }
}

class SlashSkill implements Skill {
    type = SkillType.SLASH;
    cooldown = 10;
    currentCooldown = 0;

    activate(player: Player, entityManager: EntityManager, _target?: THREE.Vector3) {
        console.log('Slash Attack!');
        this.currentCooldown = this.cooldown;
        entityManager.spawnSlash(player.id, player.mesh.position, player.mesh.rotation);
    }

    update(delta: number) {
        if (this.currentCooldown > 0) this.currentCooldown -= delta;
    }
}

class TankSkill implements Skill {
    type = SkillType.TANK;
    cooldown = 30;
    currentCooldown = 0;
    duration = 5.0;

    activate(player: Player, _entityManager: EntityManager, _target?: THREE.Vector3) {
        console.log('Tank Mode!');
        this.currentCooldown = this.cooldown;
        player.setInvulnerable(this.duration);
    }

    update(delta: number) {
        if (this.currentCooldown > 0) this.currentCooldown -= delta;
    }
}

class UltimateSkill implements Skill {
    type = SkillType.ULTIMATE;
    cooldown = 60;
    currentCooldown = 0;
    system: SkillSystem;

    constructor(system: SkillSystem) {
        this.system = system;
    }

    activate(_player: Player, _entityManager: EntityManager, _target?: THREE.Vector3) {
        console.log('ULTIMATE!');
        this.currentCooldown = this.cooldown;
        this.system.resetCooldowns(SkillType.ULTIMATE);
    }

    update(delta: number) {
        if (this.currentCooldown > 0) this.currentCooldown -= delta;
    }
}
