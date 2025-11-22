import type { GameState } from '../common/types';
import { SKILL_CONFIG, SkillType } from '../common/constants';

export class UIManager {
    private healthBar: HTMLElement;
    private hud: HTMLElement;
    private teleportCdOverlay: HTMLElement;
    private homingMissileCdOverlay: HTMLElement;
    private laserBeamCdOverlay: HTMLElement;

    constructor() {
        this.healthBar = document.getElementById('health-bar')!;
        this.hud = document.getElementById('hud')!;
        // Q skill = Teleport (cd-missile)
        this.teleportCdOverlay = document.getElementById('cd-missile')!;
        // W skill = Homing Missile (cd-basic)
        this.homingMissileCdOverlay = document.getElementById('cd-basic')!;
        // E skill = Laser Beam (cd-slash)
        this.laserBeamCdOverlay = document.getElementById('cd-slash')!;

        // Hide other unused slots
        const otherSlots = ['cd-tank', 'cd-ult'];
        otherSlots.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.parentElement!.style.display = 'none';
        });
    }

    public showHUD() {
        this.hud.style.display = 'block';
    }

    public update(state: GameState, localPlayerId: string) {
        const player = state.players.find(p => p.id === localPlayerId);
        if (!player) return;

        // Update Health
        const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
        this.healthBar.style.width = `${healthPercent}%`;

        const now = Date.now();

        // Update Teleport Cooldown (Q skill)
        const teleportCooldownEnd = player.teleportCooldown;
        const teleportTotalCooldown = SKILL_CONFIG[SkillType.TELEPORT].cooldown;

        let teleportPercent = 0;
        if (now < teleportCooldownEnd) {
            const remaining = teleportCooldownEnd - now;
            teleportPercent = (remaining / teleportTotalCooldown) * 100;
        }
        this.teleportCdOverlay.style.height = `${teleportPercent}%`;

        // Update Homing Missile Cooldown (W skill)
        const homingMissileCooldownEnd = player.homingMissileCooldown;
        const homingMissileTotalCooldown = SKILL_CONFIG[SkillType.HOMING_MISSILE].cooldown;

        let homingMissilePercent = 0;
        if (now < homingMissileCooldownEnd) {
            const remaining = homingMissileCooldownEnd - now;
            homingMissilePercent = (remaining / homingMissileTotalCooldown) * 100;
        }
        this.homingMissileCdOverlay.style.height = `${homingMissilePercent}%`;

        // Update Laser Beam Cooldown (E skill)
        const laserBeamCooldownEnd = player.laserBeamCooldown;
        const laserBeamTotalCooldown = SKILL_CONFIG[SkillType.LASER_BEAM].cooldown;

        let laserBeamPercent = 0;
        if (now < laserBeamCooldownEnd) {
            const remaining = laserBeamCooldownEnd - now;
            laserBeamPercent = (remaining / laserBeamTotalCooldown) * 100;
        }
        this.laserBeamCdOverlay.style.height = `${laserBeamPercent}%`;
    }
}
