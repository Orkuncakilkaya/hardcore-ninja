import type { GameState } from '../common/types';
import { SKILL_CONFIG, SkillType, GameMode } from '../common/constants';

export class UIManager {
    private healthBar: HTMLElement | null = null;
    private hud: HTMLElement | null = null;
    private teleportCdOverlay: HTMLElement | null = null;
    private homingMissileCdOverlay: HTMLElement | null = null;
    private laserBeamCdOverlay: HTMLElement | null = null;
    private invincibilityCdOverlay: HTMLElement | null = null;
    private teleportSkillIcon: HTMLElement | null = null;
    private homingMissileSkillIcon: HTMLElement | null = null;
    private laserBeamSkillIcon: HTMLElement | null = null;
    private startButton: HTMLElement | null = null;
    private restartButton: HTMLElement | null = null;
    private gameModeDisplay: HTMLElement | null = null;
    private tabMenu: HTMLElement | null = null;
    private leaderboard: HTMLElement | null = null;
    private initialized: boolean = false;

    constructor() {
        this.initializeElements();
    }

    private initializeElements() {
        if (this.initialized) return;

        this.healthBar = document.getElementById('health-bar');
        // Hide the health bar in the HUD since we're displaying health in 3D
        if (this.healthBar) {
            this.healthBar.style.display = 'none';
        }
        this.hud = document.getElementById('hud');
        // Q skill = Teleport (cd-missile)
        this.teleportCdOverlay = document.getElementById('cd-missile');
        // W skill = Homing Missile (cd-basic)
        this.homingMissileCdOverlay = document.getElementById('cd-basic');
        // E skill = Laser Beam (cd-slash)
        this.laserBeamCdOverlay = document.getElementById('cd-slash');
        // R skill = Invincibility (cd-tank)
        this.invincibilityCdOverlay = document.getElementById('cd-tank');

        // Get skill icons (parent elements of the cooldown overlays)
        // Check if elements exist before accessing parentElement
        if (this.teleportCdOverlay && this.teleportCdOverlay.parentElement) {
            this.teleportSkillIcon = this.teleportCdOverlay.parentElement;
        }
        if (this.homingMissileCdOverlay && this.homingMissileCdOverlay.parentElement) {
            this.homingMissileSkillIcon = this.homingMissileCdOverlay.parentElement;
        }
        if (this.laserBeamCdOverlay && this.laserBeamCdOverlay.parentElement) {
            this.laserBeamSkillIcon = this.laserBeamCdOverlay.parentElement;
        }

        // Hide other unused slots
        const otherSlots = ['cd-ult'];
        otherSlots.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.parentElement) {
                el.parentElement.style.display = 'none';
            }
        });

        // Create game mode display and tab menu (these don't depend on React elements)
        this.createGameModeDisplay();
        this.createTabMenu();

        // Only mark as initialized if critical elements are found
        if (this.hud && this.teleportCdOverlay && this.homingMissileCdOverlay && 
            this.laserBeamCdOverlay && this.invincibilityCdOverlay) {
            this.initialized = true;
        }
    }


    // Set glow effect for a skill when it's in pressed state
    public setSkillGlow(skillType: SkillType) {
        let skillIcon = null;

        switch (skillType) {
            case SkillType.TELEPORT:
                skillIcon = this.teleportSkillIcon;
                break;
            case SkillType.HOMING_MISSILE:
                skillIcon = this.homingMissileSkillIcon;
                break;
            case SkillType.LASER_BEAM:
                skillIcon = this.laserBeamSkillIcon;
                break;
        }

        if (skillIcon) {
            skillIcon.setAttribute('data-active', 'true');
            skillIcon.style.boxShadow = '0 0 20px 8px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4)';
            skillIcon.style.borderColor = '#0f0';
            skillIcon.style.transform = 'scale(1.05)';
        }
    }

    // Clear glow effect for a skill
    public clearSkillGlow(skillType: SkillType) {
        let skillIcon = null;

        switch (skillType) {
            case SkillType.TELEPORT:
                skillIcon = this.teleportSkillIcon;
                break;
            case SkillType.HOMING_MISSILE:
                skillIcon = this.homingMissileSkillIcon;
                break;
            case SkillType.LASER_BEAM:
                skillIcon = this.laserBeamSkillIcon;
                break;
        }

        if (skillIcon) {
            skillIcon.removeAttribute('data-active');
            skillIcon.style.boxShadow = '';
            skillIcon.style.borderColor = '';
            skillIcon.style.transform = '';
        }
    }

    // Set border for a skill when it's ready to be cast
    public setSkillBorder(skillType: SkillType) {
        let skillIcon = null;

        switch (skillType) {
            case SkillType.TELEPORT:
                skillIcon = this.teleportSkillIcon;
                break;
            case SkillType.HOMING_MISSILE:
                skillIcon = this.homingMissileSkillIcon;
                break;
            case SkillType.LASER_BEAM:
                skillIcon = this.laserBeamSkillIcon;
                break;
        }

        if (skillIcon) {
            skillIcon.setAttribute('data-ready', 'true');
        }
    }

    // Clear border for a skill
    public clearSkillBorder(skillType: SkillType) {
        let skillIcon = null;

        switch (skillType) {
            case SkillType.TELEPORT:
                skillIcon = this.teleportSkillIcon;
                break;
            case SkillType.HOMING_MISSILE:
                skillIcon = this.homingMissileSkillIcon;
                break;
            case SkillType.LASER_BEAM:
                skillIcon = this.laserBeamSkillIcon;
                break;
        }

        if (skillIcon) {
            skillIcon.removeAttribute('data-ready');
        }
    }

    private createGameModeDisplay() {
        this.gameModeDisplay = document.createElement('div');
        this.gameModeDisplay.id = 'game-mode-display';
        this.gameModeDisplay.style.position = 'absolute';
        this.gameModeDisplay.style.top = '10px';
        this.gameModeDisplay.style.left = '50%';
        this.gameModeDisplay.style.transform = 'translateX(-50%)';
        this.gameModeDisplay.style.color = 'white';
        this.gameModeDisplay.style.fontSize = '24px';
        this.gameModeDisplay.style.fontWeight = 'bold';
        this.gameModeDisplay.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        this.gameModeDisplay.style.display = 'none'; // Hidden by default
        this.gameModeDisplay.textContent = 'Warmup';
        document.body.appendChild(this.gameModeDisplay);
    }

    private createTabMenu() {
        // Create tab menu container
        this.tabMenu = document.createElement('div');
        this.tabMenu.id = 'tab-menu';
        this.tabMenu.style.position = 'absolute';
        this.tabMenu.style.top = '50%';
        this.tabMenu.style.left = '50%';
        this.tabMenu.style.transform = 'translate(-50%, -50%)';
        this.tabMenu.style.width = '600px';
        this.tabMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.tabMenu.style.border = '2px solid #444';
        this.tabMenu.style.borderRadius = '5px';
        this.tabMenu.style.padding = '20px';
        this.tabMenu.style.display = 'none';

        // Create leaderboard
        this.leaderboard = document.createElement('div');
        this.leaderboard.id = 'leaderboard';
        this.leaderboard.style.width = '100%';
        this.leaderboard.style.marginBottom = '20px';
        this.tabMenu.appendChild(this.leaderboard);

        // Create host actions container
        const hostActions = document.createElement('div');
        hostActions.id = 'host-actions';
        hostActions.style.display = 'flex';
        hostActions.style.justifyContent = 'space-between';

        // Create start button
        this.startButton = document.createElement('button');
        this.startButton.id = 'btn-start-game';
        this.startButton.textContent = 'Start Game';
        this.startButton.style.padding = '10px 20px';
        this.startButton.style.fontSize = '16px';
        this.startButton.style.backgroundColor = '#4CAF50';
        this.startButton.style.color = 'white';
        this.startButton.style.border = 'none';
        this.startButton.style.borderRadius = '5px';
        this.startButton.style.cursor = 'pointer';
        hostActions.appendChild(this.startButton);

        // Create restart button
        this.restartButton = document.createElement('button');
        this.restartButton.id = 'btn-restart-game';
        this.restartButton.textContent = 'Restart Game';
        this.restartButton.style.padding = '10px 20px';
        this.restartButton.style.fontSize = '16px';
        this.restartButton.style.backgroundColor = '#f44336';
        this.restartButton.style.color = 'white';
        this.restartButton.style.border = 'none';
        this.restartButton.style.borderRadius = '5px';
        this.restartButton.style.cursor = 'pointer';
        hostActions.appendChild(this.restartButton);

        this.tabMenu.appendChild(hostActions);
        document.body.appendChild(this.tabMenu);
    }

    public showHUD() {
        if (this.hud) {
            this.hud.style.display = 'block';
        }
        // Show game mode display when HUD is shown
        if (this.gameModeDisplay) {
            this.gameModeDisplay.style.display = 'block';
        }
    }

    public showTabMenu() {
        if (this.tabMenu) {
            this.tabMenu.style.display = 'block';
        }
    }

    public hideTabMenu() {
        if (this.tabMenu) {
            this.tabMenu.style.display = 'none';
        }
    }

    public updateGameMode(gameState: GameState) {
        if (!this.gameModeDisplay) return;

        let modeText = '';

        switch (gameState.gameMode) {
            case GameMode.WARMUP:
                modeText = 'Warmup';
                break;
            case GameMode.FREEZE_TIME:
                // Calculate remaining seconds in freeze time
                if (gameState.freezeTimeEnd) {
                    const now = Date.now();
                    const remainingMs = Math.max(0, gameState.freezeTimeEnd - now);
                    const remainingSeconds = Math.ceil(remainingMs / 1000);
                    modeText = `Round ${gameState.currentRound}/${gameState.totalRounds} - Freeze Time (${remainingSeconds}s)`;
                } else {
                    modeText = `Round ${gameState.currentRound}/${gameState.totalRounds} - Freeze Time`;
                }
                break;
            case GameMode.ROUND:
                modeText = `Round ${gameState.currentRound}/${gameState.totalRounds}`;
                break;
            case GameMode.ROUND_END:
                // Show who won the round
                if (gameState.roundWinnerId) {
                    const winner = gameState.players.find(p => p.id === gameState.roundWinnerId);
                    if (winner) {
                        // Calculate remaining seconds in round end
                        if (gameState.freezeTimeEnd) {
                            const now = Date.now();
                            const remainingMs = Math.max(0, gameState.freezeTimeEnd - now);
                            const remainingSeconds = Math.ceil(remainingMs / 1000);
                            modeText = `Round ${gameState.currentRound-1}/${gameState.totalRounds} - Player ${winner.username || winner.id.substring(0, 4)} Wins! (${remainingSeconds}s)`;
                        } else {
                            modeText = `Round ${gameState.currentRound-1}/${gameState.totalRounds} - Player ${winner.username || winner.id.substring(0, 4)} Wins!`;
                        }
                    } else {
                        modeText = `Round ${gameState.currentRound-1}/${gameState.totalRounds} - Round End`;
                    }
                } else {
                    modeText = `Round ${gameState.currentRound-1}/${gameState.totalRounds} - Round End`;
                }
                break;
            case GameMode.GAME_OVER:
                if (gameState.winnerId) {
                    const winner = gameState.players.find(p => p.id === gameState.winnerId);
                    modeText = winner ? `Game Over - Player ${winner.username || winner.id.substring(0, 4)} Wins!` : 'Game Over';
                } else {
                    modeText = 'Game Over';
                }
                break;
        }

        this.gameModeDisplay.textContent = modeText;
    }

    public updateLeaderboard(gameState: GameState, localPlayerId: string, isHost: boolean) {
        if (!this.leaderboard) return;

        // Clear leaderboard
        this.leaderboard.innerHTML = '';

        // Create header
        const header = document.createElement('div');
        header.style.display = 'grid';
        header.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
        header.style.padding = '10px';
        header.style.borderBottom = '1px solid #444';
        header.style.fontWeight = 'bold';
        header.style.color = 'white';

        const playerHeader = document.createElement('div');
        playerHeader.textContent = 'Player';
        header.appendChild(playerHeader);

        const killsHeader = document.createElement('div');
        killsHeader.textContent = 'Kills';
        header.appendChild(killsHeader);

        const deathsHeader = document.createElement('div');
        deathsHeader.textContent = 'Deaths';
        header.appendChild(deathsHeader);

        const lastPlayerAliveHeader = document.createElement('div');
        lastPlayerAliveHeader.textContent = 'Last Player Alive';
        header.appendChild(lastPlayerAliveHeader);

        if (this.leaderboard) {
            this.leaderboard.appendChild(header);
        }

        // Sort players by kills (descending)
        const sortedPlayers = [...gameState.players].sort((a, b) => {
            return (b.kills || 0) - (a.kills || 0);
        });

        // Add player rows
        sortedPlayers.forEach(player => {
            const row = document.createElement('div');
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
            row.style.padding = '10px';
            row.style.borderBottom = '1px solid #333';
            row.style.color = player.id === localPlayerId ? '#4CAF50' : 'white';

            const playerName = document.createElement('div');
            playerName.textContent = player.username || player.id.substring(0, 4); // Show username if available, otherwise first 4 chars of ID
            row.appendChild(playerName);

            const kills = document.createElement('div');
            kills.textContent = (player.kills || 0).toString();
            row.appendChild(kills);

            const deaths = document.createElement('div');
            deaths.textContent = (player.deaths || 0).toString();
            row.appendChild(deaths);

            const lastPlayerAlive = document.createElement('div');
            lastPlayerAlive.textContent = (player.lastPlayerAlive || 0).toString();
            row.appendChild(lastPlayerAlive);

            if (this.leaderboard) {
                this.leaderboard.appendChild(row);
            }
        });

        // Update host action buttons visibility
        if (this.startButton && this.restartButton) {
            // Start button only visible in warmup mode with enough players
            this.startButton.style.display = (isHost && gameState.gameMode === GameMode.WARMUP && gameState.players.length >= 2) ? 'block' : 'none';

            // Restart button always visible for host
            this.restartButton.style.display = isHost ? 'block' : 'none';
        }
    }

    public update(state: GameState, localPlayerId: string, isHost: boolean = false) {
        // Try to initialize elements if not already done
        if (!this.initialized) {
            this.initializeElements();
        }

        const player = state.players.find(p => p.id === localPlayerId);
        if (!player) return;

        // Health is now displayed in 3D above player meshes

        const now = Date.now();

        // Update Teleport Cooldown (Q skill)
        if (this.teleportCdOverlay) {
            const teleportCooldownEnd = player.teleportCooldown;
            const teleportTotalCooldown = SKILL_CONFIG[SkillType.TELEPORT].cooldown;
            const skillSlot = this.teleportCdOverlay.parentElement;
            const cooldownText = skillSlot?.querySelector('.cooldownText') as HTMLElement;

            let teleportPercent = 0;
            if (now < teleportCooldownEnd) {
                const remaining = teleportCooldownEnd - now;
                teleportPercent = (remaining / teleportTotalCooldown) * 100;
                const remainingSeconds = Math.ceil(remaining / 1000);
                this.teleportCdOverlay.style.height = `${teleportPercent}%`;
                if (cooldownText) {
                    cooldownText.textContent = remainingSeconds.toString();
                    skillSlot?.setAttribute('data-cooldown-active', 'true');
                }
                this.clearSkillBorder(SkillType.TELEPORT); // Skill on cooldown, hide border
            } else {
                this.teleportCdOverlay.style.height = '0%';
                if (cooldownText) {
                    cooldownText.textContent = '';
                    skillSlot?.removeAttribute('data-cooldown-active');
                }
                this.setSkillBorder(SkillType.TELEPORT); // Skill ready, show border
            }
        }

        // Update Homing Missile Cooldown (W skill)
        if (this.homingMissileCdOverlay) {
            const homingMissileCooldownEnd = player.homingMissileCooldown;
            const homingMissileTotalCooldown = SKILL_CONFIG[SkillType.HOMING_MISSILE].cooldown;
            const skillSlot = this.homingMissileCdOverlay.parentElement;
            const cooldownText = skillSlot?.querySelector('.cooldownText') as HTMLElement;

            let homingMissilePercent = 0;
            if (now < homingMissileCooldownEnd) {
                const remaining = homingMissileCooldownEnd - now;
                homingMissilePercent = (remaining / homingMissileTotalCooldown) * 100;
                const remainingSeconds = Math.ceil(remaining / 1000);
                this.homingMissileCdOverlay.style.height = `${homingMissilePercent}%`;
                if (cooldownText) {
                    cooldownText.textContent = remainingSeconds.toString();
                    skillSlot?.setAttribute('data-cooldown-active', 'true');
                }
                this.clearSkillBorder(SkillType.HOMING_MISSILE); // Skill on cooldown, hide border
            } else {
                this.homingMissileCdOverlay.style.height = '0%';
                if (cooldownText) {
                    cooldownText.textContent = '';
                    skillSlot?.removeAttribute('data-cooldown-active');
                }
                this.setSkillBorder(SkillType.HOMING_MISSILE); // Skill ready, show border
            }
        }

        // Update Laser Beam Cooldown (E skill)
        if (this.laserBeamCdOverlay) {
            const laserBeamCooldownEnd = player.laserBeamCooldown;
            const laserBeamTotalCooldown = SKILL_CONFIG[SkillType.LASER_BEAM].cooldown;
            const skillSlot = this.laserBeamCdOverlay.parentElement;
            const cooldownText = skillSlot?.querySelector('.cooldownText') as HTMLElement;

            let laserBeamPercent = 0;
            if (now < laserBeamCooldownEnd) {
                const remaining = laserBeamCooldownEnd - now;
                laserBeamPercent = (remaining / laserBeamTotalCooldown) * 100;
                const remainingSeconds = Math.ceil(remaining / 1000);
                this.laserBeamCdOverlay.style.height = `${laserBeamPercent}%`;
                if (cooldownText) {
                    cooldownText.textContent = remainingSeconds.toString();
                    skillSlot?.setAttribute('data-cooldown-active', 'true');
                }
                this.clearSkillBorder(SkillType.LASER_BEAM); // Skill on cooldown, hide border
            } else {
                this.laserBeamCdOverlay.style.height = '0%';
                if (cooldownText) {
                    cooldownText.textContent = '';
                    skillSlot?.removeAttribute('data-cooldown-active');
                }
                this.setSkillBorder(SkillType.LASER_BEAM); // Skill ready, show border
            }
        }

        // Update Invincibility Cooldown (R skill)
        if (this.invincibilityCdOverlay) {
            const invincibilityCooldownEnd = player.invincibilityCooldown;
            const invincibilityTotalCooldown = SKILL_CONFIG[SkillType.INVINCIBILITY].cooldown;
            const skillSlot = this.invincibilityCdOverlay.parentElement;
            const cooldownText = skillSlot?.querySelector('.cooldownText') as HTMLElement;

            let invincibilityPercent = 0;
            if (now < invincibilityCooldownEnd) {
                const remaining = invincibilityCooldownEnd - now;
                invincibilityPercent = (remaining / invincibilityTotalCooldown) * 100;
                const remainingSeconds = Math.ceil(remaining / 1000);
                this.invincibilityCdOverlay.style.height = `${invincibilityPercent}%`;
                if (cooldownText) {
                    cooldownText.textContent = remainingSeconds.toString();
                    skillSlot?.setAttribute('data-cooldown-active', 'true');
                }
            } else {
                this.invincibilityCdOverlay.style.height = '0%';
                if (cooldownText) {
                    cooldownText.textContent = '';
                    skillSlot?.removeAttribute('data-cooldown-active');
                }
                if (skillSlot) {
                    skillSlot.setAttribute('data-ready', 'true');
                }
            }
        }

        // Update game mode display
        this.updateGameMode(state);

        // Update leaderboard if tab menu is visible
        if (this.tabMenu && this.tabMenu.style.display === 'block') {
            this.updateLeaderboard(state, localPlayerId, isHost);
        }
    }
}
