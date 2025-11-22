import type { GameState } from '../common/types';
import { SKILL_CONFIG } from '../common/constants';

export class UIManager {
    private healthBar: HTMLElement;
    private hud: HTMLElement;
    private teleportCdOverlay: HTMLElement;

    constructor() {
        this.healthBar = document.getElementById('health-bar')!;
        this.hud = document.getElementById('hud')!;
        // Assuming 'cd-missile' was the Q skill slot, we'll use it for Teleport
        this.teleportCdOverlay = document.getElementById('cd-missile')!;

        // Hide other slots if possible, or just ignore them
        const otherSlots = ['cd-basic', 'cd-slash', 'cd-tank', 'cd-ult'];
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

        // Update Teleport Cooldown
        const now = Date.now();
        const cooldownEnd = player.teleportCooldown;
        const totalCooldown = SKILL_CONFIG.TELEPORT.cooldown;

        let percent = 0;
        if (now < cooldownEnd) {
            const remaining = cooldownEnd - now;
            percent = (remaining / totalCooldown) * 100;
        }

        this.teleportCdOverlay.style.height = `${percent}%`;
    }
}
