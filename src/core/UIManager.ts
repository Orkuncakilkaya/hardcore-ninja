import { Player } from '../entities/Player';
import { SkillType } from '../systems/SkillSystem';

export class UIManager {
    private healthBar: HTMLElement;
    private hud: HTMLElement;
    private cdOverlays: { [key: string]: HTMLElement } = {};

    constructor() {
        this.healthBar = document.getElementById('health-bar')!;
        this.hud = document.getElementById('hud')!;

        this.cdOverlays[SkillType.MISSILE] = document.getElementById('cd-missile')!;
        this.cdOverlays[SkillType.BASIC_ATTACK] = document.getElementById('cd-basic')!;
        this.cdOverlays[SkillType.SLASH] = document.getElementById('cd-slash')!;
        this.cdOverlays[SkillType.TANK] = document.getElementById('cd-tank')!;
        this.cdOverlays[SkillType.ULTIMATE] = document.getElementById('cd-ult')!;
    }

    public showHUD() {
        this.hud.style.display = 'block';
    }

    public update(player: Player) {
        // Update Health
        const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
        this.healthBar.style.width = `${healthPercent}%`;

        // Update Cooldowns
        this.updateCooldown(player, SkillType.MISSILE);
        this.updateCooldown(player, SkillType.BASIC_ATTACK); // Mapped to W for visual consistency in HUD, though logic might differ
        this.updateCooldown(player, SkillType.SLASH);
        this.updateCooldown(player, SkillType.TANK);
        this.updateCooldown(player, SkillType.ULTIMATE);
    }

    private updateCooldown(player: Player, type: SkillType) {
        // Access private skills map via any or getter if available. 
        // For now, let's add a getter to SkillSystem or access directly if we change visibility.
        // Since we can't easily change visibility without editing multiple files, let's assume we can access it or add a method.
        // Actually, let's add a method to SkillSystem to get cooldown info.

        const skill = (player.skillSystem as any).skills.get(type);
        if (skill) {
            const percent = skill.cooldown > 0 ? (skill.currentCooldown / skill.cooldown) * 100 : 0;
            if (this.cdOverlays[type]) {
                this.cdOverlays[type].style.height = `${percent}%`;
            }
        }
    }
}
