import type { GameState } from '../common/types';
import { SKILL_CONFIG, SkillType, GameMode } from '../common/constants';
import { AudioManager } from '../client/AudioManager';

export class UIManager {
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
  private tabMenu: HTMLElement | null = null;
  private leaderboard: HTMLElement | null = null;
  private loadingOverlay: HTMLElement | null = null;
  private loadingText: HTMLElement | null = null;
  private loadingProgress: HTMLElement | null = null;

  // Settings menu elements
  private settingsMenu: HTMLElement | null = null;
  private bgmVolumeSlider: HTMLInputElement | null = null;
  private sfxVolumeSlider: HTMLInputElement | null = null;

  private initialized: boolean = false;

  constructor() {
    this.initializeElements();
    this.createLoadingOverlay();
  }

  private initializeElements() {
    if (this.initialized) return;

    this.hud = document.getElementById('hud');
    // Q skill = Teleport
    this.teleportCdOverlay = document.getElementById('cd-teleport');
    // W skill = Homing Missile
    this.homingMissileCdOverlay = document.getElementById('cd-homing-missile');
    // E skill = Laser Beam
    this.laserBeamCdOverlay = document.getElementById('cd-laser-beam');
    // R skill = Invincibility
    this.invincibilityCdOverlay = document.getElementById('cd-invincibility');

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

    // Game mode display is now handled by React component

    // Only mark as initialized if critical elements are found
    if (
      this.hud &&
      this.teleportCdOverlay &&
      this.homingMissileCdOverlay &&
      this.laserBeamCdOverlay &&
      this.invincibilityCdOverlay
    ) {
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
      skillIcon.style.boxShadow =
        '0 0 20px 8px rgba(0, 255, 0, 0.8), 0 0 40px rgba(0, 255, 0, 0.4)';
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

  public showHUD() {
    if (this.hud) {
      this.hud.style.display = 'block';
    }
    // Game mode display is now handled by React component
  }

  public hideHUD() {
    if (this.hud) {
      this.hud.style.display = 'none';
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

  /**
   * Show the settings menu
   */
  public showSettingsMenu() {
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'block';
    }
  }

  /**
   * Hide the settings menu
   */
  public hideSettingsMenu() {
    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'none';
    }
  }

  /**
   * Toggle the settings menu
   */
  public toggleSettingsMenu() {
    if (this.settingsMenu) {
      if (this.settingsMenu.style.display === 'none') {
        this.showSettingsMenu();
      } else {
        this.hideSettingsMenu();
      }
    }
  }

  /**
   * Set the audio manager for the settings menu
   * @param audioManager The audio manager
   */
  public setAudioManager(audioManager: AudioManager) {
    // Update sliders with current values
    if (this.bgmVolumeSlider && audioManager) {
      const bgmVolume = Math.round(audioManager.getBgmVolume() * 100);
      this.bgmVolumeSlider.value = bgmVolume.toString();

      // Update the display next to the slider
      const bgmValueDisplay = this.bgmVolumeSlider.nextElementSibling as HTMLElement;
      if (bgmValueDisplay) {
        bgmValueDisplay.textContent = `${bgmVolume}%`;
      }

      // Add event listener to update audio manager when slider changes
      this.bgmVolumeSlider.addEventListener('change', () => {
        const value = parseInt(this.bgmVolumeSlider?.value || '0') / 100;
        audioManager.setBgmVolume(value);
      });
    }

    if (this.sfxVolumeSlider && audioManager) {
      const sfxVolume = Math.round(audioManager.getSfxVolume() * 100);
      this.sfxVolumeSlider.value = sfxVolume.toString();

      // Update the display next to the slider
      const sfxValueDisplay = this.sfxVolumeSlider.nextElementSibling as HTMLElement;
      if (sfxValueDisplay) {
        sfxValueDisplay.textContent = `${sfxVolume}%`;
      }

      // Add event listener to update audio manager when slider changes
      this.sfxVolumeSlider.addEventListener('change', () => {
        const value = parseInt(this.sfxVolumeSlider?.value || '0') / 100;
        audioManager.setSfxVolume(value);
      });
    }
  }

  // Game mode display is now handled by React component

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
      this.startButton.style.display =
        isHost && gameState.gameMode === GameMode.WARMUP && gameState.players.length >= 2
          ? 'block'
          : 'none';

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
        skillSlot?.removeAttribute('data-ready'); // Skill on cooldown, hide border
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
        skillSlot?.removeAttribute('data-ready'); // Skill on cooldown, hide border
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
        skillSlot?.removeAttribute('data-ready'); // Skill on cooldown, hide border
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
    // Game mode display is now handled by React component

    // Update leaderboard if tab menu is visible
    if (this.tabMenu && this.tabMenu.style.display === 'block') {
      this.updateLeaderboard(state, localPlayerId, isHost);
    }
  }

  private createLoadingOverlay() {
    // Create loading overlay if it doesn't exist
    if (this.loadingOverlay) return;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            color: white;
            font-family: Arial, sans-serif;
        `;

    const text = document.createElement('div');
    text.id = 'loading-text';
    text.textContent = 'Loading Resources...';
    text.style.cssText = `
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: bold;
        `;

    const progressBar = document.createElement('div');
    progressBar.id = 'loading-progress';
    progressBar.style.cssText = `
            width: 300px;
            height: 30px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            overflow: hidden;
            border: 2px solid rgba(255, 255, 255, 0.3);
        `;

    const progressFill = document.createElement('div');
    progressFill.id = 'loading-progress-fill';
    progressFill.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #00ff00, #00cc00);
            transition: width 0.3s ease;
        `;

    progressBar.appendChild(progressFill);
    overlay.appendChild(text);
    overlay.appendChild(progressBar);
    document.body.appendChild(overlay);

    this.loadingOverlay = overlay;
    this.loadingText = text;
    this.loadingProgress = progressFill;
  }

  public showLoading(message: string = 'Loading Resources...') {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'flex';
      if (this.loadingText) {
        this.loadingText.textContent = message;
      }
    }
  }

  public updateLoadingProgress(progress: number) {
    if (this.loadingProgress) {
      const percentage = Math.min(100, Math.max(0, progress * 100));
      this.loadingProgress.style.width = `${percentage}%`;
    }
  }

  public hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }
}
