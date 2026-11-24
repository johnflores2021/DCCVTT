// =========================================================================
// CHAPTER 2 COMBAT ACTIONS, AOE/SPLASH ENGINE, CLEAN UP & NPC VS. NPC
// DCC Rulebook Chapter 2 — Pages 79–86
// =========================================================================

// -------------------------------------------------------------------------
// 1. ROLL MODE (ADVANTAGE / NORMAL / DISADVANTAGE) & AUTO-DETECTORS
// -------------------------------------------------------------------------
function setCombatRollMode(mode) {
  uiState.combatRollMode = ['adv', 'normal', 'disadv'].includes(mode) ? mode : 'normal';
  if (IS_PLAYER_WINDOW) renderPlayerControlDeck();
  else renderGmInspector();
}

function isTokenAdjacentToHostileMob(caster, scene) {
  if (!caster || !scene) return false;
  return (scene.tokens || []).some(t => {
    if (t.role === 'crawler' || t.id === caster.id) return false;
    if (t.hiddenFromPlayers) return false;
    const hm = getTokenHealthMetrics(t);
    if (hm.curHp <= 0) return false;
    const span = Math.max(1, Math.min(4, Number(t.gridSpan) || 1));
    const edgeOffsetSq = (span - 1) * 0.5;
    const dx = Math.max(0, Math.abs(caster.gx - t.gx) - edgeOffsetSq);
    const dy = Math.max(0, Math.abs(caster.gy - t.gy) - edgeOffsetSq);
    return Math.max(dx, dy) * 5 <= 5;
  });
}

function getCoverObjectsBetweenTokens(caster, target, scene = null) {
  const sc = scene || getActiveScene();
  if (!caster || !target || !sc || caster.id === target.id) return [];
  // Ch. 2 p. 84: Attacks made at melee range (<= 5ft) are unaffected by cover
  const distFt = calcGridDistanceFt(caster.gx, caster.gy, target.gx, target.gy);
  if (distFt <= 5) return [];

  const gs = Math.max(16, Math.min(240, Number(sc.gridSize) || 56));
  const x1 = (caster.gx + 0.5) * gs;
  const y1 = (caster.gy + 0.5) * gs;
  const x2 = (target.gx + 0.5) * gs;
  const y2 = (target.gy + 0.5) * gs;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const segLen = Math.hypot(dx, dy);
  if (segLen < 1e-4) return [];

  const coverProps = [];
  (sc.mapObjects || []).forEach(obj => {
    if (!obj || obj.id === target.id) return;
    if (IS_PLAYER_WINDOW && obj.hiddenFromPlayers) return;
    const cat = String(obj.category || '').toLowerCase();
    const notes = String(obj.notes || '').toLowerCase();
    const isCoverProp = cat.includes('cover') || cat.includes('obstacle') || /\bcover\b/.test(notes);
    if (!isCoverProp) return;

    const ox = (obj.gx + 0.5) * gs;
    const oy = (obj.gy + 0.5) * gs;
    const tProj = ((ox - x1) * dx + (oy - y1) * dy) / (segLen * segLen);
    if (tProj <= 0.05 || tProj >= 0.95) return;
    const nearX = x1 + tProj * dx;
    const nearY = y1 + tProj * dy;
    const perpDist = Math.hypot(ox - nearX, oy - nearY);
    if (perpDist <= gs * 0.48) {
      coverProps.push(obj);
    }
  });
  return coverProps;
}

function isTargetInCoverFromCaster(caster, target, scene = null) {
  return getCoverObjectsBetweenTokens(caster, target, scene).length > 0;
}

function resolveEffectiveAttackRollMode(caster, target, info, manualMode = 'normal', scene = null) {
  let hasAdv = manualMode === 'adv';
  let hasDisadv = manualMode === 'disadv';
  const reasons = [];
  if (manualMode === 'adv') reasons.push('Manual Adv');
  if (manualMode === 'disadv') reasons.push('Manual Disadv');

  // Evade Nat 20 / Amazing Success grants Advantage on next Attack vs that Mob (p. 79)
  if (caster && target && caster.evadeAdvVsMobId && caster.evadeAdvVsMobId === target.id) {
    hasAdv = true;
    reasons.push('Evade Counter-Adv');
  }

  // High ground / elevation buffs grant Advantage (Ch. 2 p. 84)
  if (caster && (caster.buffs || []).some(b => /high\s*ground|elevat/i.test(String(b)))) {
    hasAdv = true;
    reasons.push('High Ground');
  }

  // Ranged Weapon or Ranged Spell made within 5ft melee reach of an enemy suffers Disadvantage (p. 83)
  const isRangedAtk = Boolean(info && info.isAttack && !info.isSelfOnly && (Number(info.rangeFt) || 5) > 10);
  if (isRangedAtk && isTokenAdjacentToHostileMob(caster, scene || getActiveScene())) {
    hasDisadv = true;
    reasons.push('Ranged in Melee');
  }

  // Cover at > 5ft range imposes Disadvantage; melee range (<= 5ft) is unaffected (Ch. 2 p. 84)
  if (caster && target && info && info.isAttack && !info.isSelfOnly) {
    const distFt = calcGridDistanceFt(caster.gx, caster.gy, target.gx, target.gy);
    const hasPropCover = distFt > 5 && getCoverObjectsBetweenTokens(caster, target, scene || getActiveScene()).length > 0;
    const hasEffectCover = distFt > 5 && (target.buffs || target.statuses || []).some(e => /\bcover\b/i.test(String(e)));
    if (hasPropCover || hasEffectCover) {
      hasDisadv = true;
      reasons.push('Target in Cover');
    }
  }

  // Darkness or blinding/fatiguing conditions impose Disadvantage (Ch. 2 p. 84)
  if (caster && (caster.statuses || []).some(s => /blind|fatigu/i.test(String(s)))) {
    hasDisadv = true;
    reasons.push('Debuff');
  }
  const activeSc = scene || getActiveScene();
  if (caster && activeSc && typeof getIlluminationBuffForToken === 'function') {
    const illum = getIlluminationBuffForToken(caster);
    if (illum && illum.level === 'darkness') {
      hasDisadv = true;
      reasons.push('Darkness');
    }
  }

  // Advantage and Disadvantage cancel each other out
  const finalMode = (hasAdv && hasDisadv) ? 'normal' : (hasAdv ? 'adv' : (hasDisadv ? 'disadv' : 'normal'));
  return { mode: finalMode, reasons };
}

function rollD20WithMode(mode = 'normal') {
  const r1 = Math.floor(Math.random() * 20) + 1;
  if (mode === 'adv') {
    const r2 = Math.floor(Math.random() * 20) + 1;
    const nat = Math.max(r1, r2);
    return { nat, r1, r2, mode: 'adv', rollText: `Adv [${r1}, ${r2}] → ${nat}` };
  }
  if (mode === 'disadv') {
    const r2 = Math.floor(Math.random() * 20) + 1;
    const nat = Math.min(r1, r2);
    return { nat, r1, r2, mode: 'disadv', rollText: `Dis [${r1}, ${r2}] → ${nat}` };
  }
  return { nat: r1, r1, r2: null, mode: 'normal', rollText: `d20 (${r1})` };
}

// -------------------------------------------------------------------------
// 2. AREA OF EFFECT & SPLASH PARSER + TARGET DETECTOR (pp. 83–84)
// -------------------------------------------------------------------------
function parseAbilityAoeSpec(entry, unlockedUpgrades = []) {
  const texts = [entry?.range || '', entry?.baseDamage || '', entry?.rank1Effect || '', entry?.description || '', ...(unlockedUpgrades || [])];
  const full = texts.join(' | ');

  let shape = null;
  let primaryFt = 0;
  let splashFt = 0;

  const blastMatch = full.match(/(\d+)\s*ft\s*blast/i);
  const burstMatch = full.match(/(\d+)\s*ft\s*burst/i);
  const coneMatch = full.match(/(\d+)\s*ft\s*cone/i);
  const lineMatch = full.match(/(\d+)\s*ft\s*line/i);

  if (blastMatch) { shape = 'blast'; primaryFt = parseInt(blastMatch[1], 10); }
  else if (burstMatch) { shape = 'burst'; primaryFt = parseInt(burstMatch[1], 10); }
  else if (coneMatch) { shape = 'cone'; primaryFt = parseInt(coneMatch[1], 10); }
  else if (lineMatch) { shape = 'line'; primaryFt = parseInt(lineMatch[1], 10); }

  // Sum any unlocked "+Xft Splash" or "+Xft Blast/Burst/Cone" bonuses
  const splashMatches = [...full.matchAll(/\+?\s*(\d+)\s*ft\s*splash/gi)];
  splashMatches.forEach(m => { splashFt += parseInt(m[1], 10) || 0; });

  if (!shape && splashFt > 0) {
    shape = 'splash_only';
    primaryFt = 0;
  }

  return {
    hasAoe: Boolean(shape),
    shape, // 'blast' | 'burst' | 'cone' | 'line' | 'splash_only' | null
    primaryFt,
    splashFt
  };
}

function getTokensInAoeZones(caster, primaryTarget, aoeSpec, scene) {
  if (!aoeSpec || !aoeSpec.hasAoe || !caster || !scene) {
    return { primary: primaryTarget ? [primaryTarget] : [], splash: [] };
  }
  const primary = [];
  const splash = [];
  const allTokens = (scene.tokens || []).filter(t => !(t.role === 'mob' && t.hiddenFromPlayers) && getTokenHealthMetrics(t).curHp > 0);
  const origin = (aoeSpec.shape === 'burst' || aoeSpec.shape === 'cone' || aoeSpec.shape === 'line') ? caster : (primaryTarget || caster);

  const dirX = (primaryTarget ? primaryTarget.gx : caster.gx + 1) - caster.gx;
  const dirY = (primaryTarget ? primaryTarget.gy : caster.gy) - caster.gy;
  const dirAngle = Math.atan2(dirY, dirX);

  allTokens.forEach(tok => {
    // Caster is excluded from Burst / Cone / Line originating from them (unless Blast targeted on self)
    if ((aoeSpec.shape === 'burst' || aoeSpec.shape === 'cone' || aoeSpec.shape === 'line') && tok.id === caster.id) return;

    if (aoeSpec.shape === 'splash_only') {
      if (primaryTarget && tok.id === primaryTarget.id) {
        primary.push(tok);
      } else if (primaryTarget) {
        const dFt = calcGridDistanceFt(primaryTarget.gx, primaryTarget.gy, tok.gx, tok.gy);
        if (dFt <= aoeSpec.splashFt) splash.push(tok);
      }
      return;
    }

    const dFt = calcGridDistanceFt(origin.gx, origin.gy, tok.gx, tok.gy);
    const totalFt = aoeSpec.primaryFt + aoeSpec.splashFt;
    if (dFt > totalFt) return;

    if (aoeSpec.shape === 'blast' || aoeSpec.shape === 'burst') {
      if (dFt <= aoeSpec.primaryFt) primary.push(tok);
      else splash.push(tok);
      return;
    }

    // Cone (60 deg arc = +/- 30 deg = +/- PI/6) or Line (5ft wide along ray)
    const tx = tok.gx - caster.gx;
    const ty = tok.gy - caster.gy;
    if (tx === 0 && ty === 0) return;

    if (aoeSpec.shape === 'cone') {
      const ang = Math.atan2(ty, tx);
      let diff = Math.abs(ang - dirAngle);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff <= Math.PI / 6 + 0.08) {
        if (dFt <= aoeSpec.primaryFt) primary.push(tok);
        else splash.push(tok);
      }
    } else if (aoeSpec.shape === 'line') {
      const len = Math.hypot(dirX, dirY) || 1;
      const ux = dirX / len;
      const uy = dirY / len;
      const proj = tx * ux + ty * uy;
      const perp = Math.abs(tx * (-uy) + ty * ux);
      if (proj > 0 && perp <= 0.75) {
        if (dFt <= aoeSpec.primaryFt) primary.push(tok);
        else splash.push(tok);
      }
    }
  });

  if (primaryTarget && !primary.some(t => t.id === primaryTarget.id) && aoeSpec.shape !== 'burst') {
    primary.unshift(primaryTarget);
  }
  return { primary, splash };
}

// -------------------------------------------------------------------------
// 3. INTERVENE (1d6) & CALL A PLAY (2d6kh1 / 2d10kh1) ACTIONS (pp. 81, 86)
// -------------------------------------------------------------------------
function getAdjacentDoorsForToken(tok, scene) {
  if (!tok || !scene) return [];
  const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
  const span = Math.max(1, Math.min(4, Number(tok.gridSpan) || 1));
  const half = (span - 1) * 0.5;
  const minX = (tok.gx - half) * gs;
  const maxX = (tok.gx + half + 1) * gs;
  const minY = (tok.gy - half) * gs;
  const maxY = (tok.gy + half + 1) * gs;
  const pad = gs * 0.65;

  return (scene.walls || []).filter(w => {
    if (w.kind !== 'door') return false;
    const midX = (w.x1 + w.x2) * 0.5;
    const midY = (w.y1 + w.y2) * 0.5;
    const nearMid = midX >= minX - pad && midX <= maxX + pad && midY >= minY - pad && midY <= maxY + pad;
    const nearP1 = w.x1 >= minX - pad && w.x1 <= maxX + pad && w.y1 >= minY - pad && w.y1 <= maxY + pad;
    const nearP2 = w.x2 >= minX - pad && w.x2 <= maxX + pad && w.y2 >= minY - pad && w.y2 <= maxY + pad;
    return nearMid || nearP1 || nearP2;
  });
}

function executeCrawlerToggleDoorOnHost(tokenId, fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;

  if (fromRemotePlayer && isPhaseLockActive()) {
    const perm = getCrawlerPhasePermissions(tok);
    if (perm.locked || !perm.canActFull) {
      showVttToast(`🔒 Blocked ${tok.name}'s door action (wrong combat step).`);
      return;
    }
  }

  const adjDoors = getAdjacentDoorsForToken(tok, sc);
  if (adjDoors.length === 0) {
    showVttToast(`🚪 ${tok.name} must be adjacent to a door to open or close it!`);
    return;
  }

  const inCombat = (appState?.round || 0) > 0;
  if (inCombat && (tok.currentAp ?? 0) <= 0) {
    showVttToast(`⚠️ ${tok.name} has 0 AP remaining this round!`);
    return;
  }

  const targetDoor = adjDoors[0];
  targetDoor.open = !targetDoor.open;
  if (inCombat) {
    tok.currentAp = Math.max(0, (tok.currentAp ?? 2) - 1);
  }
  if (typeof visPolyCache !== 'undefined') visPolyCache.clear();
  if (typeof exploredMemDirty !== 'undefined') exploredMemDirty = true;

  const verb = targetDoor.open ? 'opened' : 'closed';
  broadcastDiceRollEvent({
    title: `🚪 ${tok.iconSymbol || '⚔️'} ${tok.name} — ${targetDoor.open ? 'OPENED DOOR' : 'CLOSED DOOR'}`,
    subtitle: inCombat ? 'Action (-1 AP) • Adjacent Door Toggled' : 'Exploration • Adjacent Door Toggled',
    playerSubtitle: inCombat ? 'Action (-1 AP) • Adjacent Door Toggled' : 'Adjacent Door Toggled',
    flareLevel: 'standard',
    rolls: [{
      targetName: 'Door',
      formulaText: `${tok.name} ${verb} an adjacent door${inCombat ? ' (-1 AP)' : ''}`,
      playerFormulaText: `${tok.name} ${verb} an adjacent door${inCombat ? ' (-1 AP)' : ''}`,
      resultLabel: targetDoor.open ? 'OPEN' : 'CLOSED',
      playerResultLabel: targetDoor.open ? 'OPEN' : 'CLOSED',
      hit: false
    }]
  });
  commitStateChange();
  showVttToast(`🚪 ${tok.name} ${verb} the door${inCombat ? ' (-1 AP)' : ''}!`);
}

function triggerCrawlerDoorAction(tokenId) {
  const sc = getActiveScene();
  const tok = IS_PLAYER_WINDOW
    ? getClaimedCrawlerToken()
    : (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;

  const adjDoors = getAdjacentDoorsForToken(tok, sc);
  if (adjDoors.length === 0) {
    showVttToast(`🚪 ${tok.name} must be adjacent to a door to open or close it!`);
    return;
  }

  if (IS_PLAYER_WINDOW) {
    const perm = getCrawlerPhasePermissions(tok);
    if (perm.locked || !perm.canActFull) {
      showVttToast(perm.bannerText || '🔒 Door actions require Step 4: Crawler Action Phase!');
      return;
    }
    sendPlayerCombatActionToHost(tok.id, 'toggle_door');
    showVttToast(`🚪 ${tok.name} toggling adjacent door...`);
  } else {
    executeCrawlerToggleDoorOnHost(tok.id, false);
  }
}

function pickExplorationTargetMob(sc, tok, gs, blockingWalls, targetMobId = '') {
  const cWx = (tok.gx + 0.5) * gs;
  const cWy = (tok.gy + 0.5) * gs;
  const candidates = (sc.tokens || []).filter(m => {
    if (m.role === 'crawler' || getTokenHealthMetrics(m).curHp <= 0) return false;
    if (m.hiddenFromPlayers) return false;
    return true;
  });
  if (targetMobId) {
    const exact = candidates.find(m => m.id === targetMobId);
    if (exact) return exact;
  }
  const sorted = candidates.slice().sort((a, b) => {
    const da = calcGridDistanceFt(tok.gx, tok.gy, a.gx, a.gy);
    const db = calcGridDistanceFt(tok.gx, tok.gy, b.gx, b.gy);
    return da - db;
  });
  return sorted.find(m => {
    const dFt = calcGridDistanceFt(tok.gx, tok.gy, m.gx, m.gy);
    if (dFt > 60) return false;
    const mWx = (m.gx + 0.5) * gs;
    const mWy = (m.gy + 0.5) * gs;
    return hasLineOfSightBetweenPoints(cWx, cWy, mWx, mWy, blockingWalls);
  }) || sorted[0] || null;
}

function executeCrawlerExplorationActionOnHost(tokenId, kind, targetMobId = '', fromRemotePlayer = false, parleySkillKey = '') {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok || !sc) return;

  if (fromRemotePlayer && (appState?.round || 0) > 0 && isPhaseLockActive()) {
    const perm = getCrawlerPhasePermissions(tok);
    if (perm.locked || !perm.canActFull) {
      showVttToast(`🔒 Blocked ${tok.name}'s exploration action during combat.`);
      return;
    }
  }

  const gs = Math.max(16, Math.min(240, Number(sc.gridSize) || 56));
  const blockingWalls = getBlockingWallSegments(sc);
  const cWx = (tok.gx + 0.5) * gs;
  const cWy = (tok.gy + 0.5) * gs;
  const floorNum = Math.max(1, Number(appState?.floor) || 1);

  if (kind === 'search') {
    const nat = Math.floor(Math.random() * 20) + 1;
    const percRank = getCrawlerSkillRank(tok, /^perception$/i);
    const mod = getCrawlerStatMod(tok, 'Dex');
    const total = nat + percRank + mod;
    const nearObjs = (sc.mapObjects || []).filter(o => calcGridDistanceFt(tok.gx, tok.gy, o.gx, o.gy) <= 30);
    const nearMobs = (sc.tokens || []).filter(m => m.role !== 'crawler' && !m.hiddenFromPlayers && getTokenHealthMetrics(m).curHp > 0 && calcGridDistanceFt(tok.gx, tok.gy, m.gx, m.gy) <= 45);
    const clues = [];
    if (nearObjs.length > 0) clues.push(`Props: ${nearObjs.map(o => o.name).join(', ')}`);
    if (nearMobs.length > 0) clues.push(`Signatures: ${nearMobs.map(m => m.name).join(', ')}`);

    broadcastDiceRollEvent({
      title: `🔍 ${tok.iconSymbol || '⚔️'} ${tok.name} — SEARCH & SURVEY`,
      subtitle: `Exploration Check • d20 (${nat})${percRank ? ` + R${percRank} Perc` : ''} + ${mod} (Dex) = ${total}`,
      playerSubtitle: `Search Check: d20 (${nat})${percRank ? ` + R${percRank} Perc` : ''} + ${mod} (Dex) = ${total}`,
      flareLevel: nat === 20 ? 'crit' : 'standard',
      rolls: [{
        targetName: 'Surroundings',
        formulaText: clues.length ? clues.join(' • ') : 'Scanned nearby area for secrets, doors, or movement',
        playerFormulaText: clues.length ? clues.join(' • ') : 'Scanned nearby area for secrets, doors, or movement',
        resultLabel: `PERCEPTION ${total}`,
        playerResultLabel: `PERCEPTION ${total}`,
        hit: false
      }]
    });
    commitStateChange();
    showVttToast(`🔍 ${tok.name} searched surroundings (Total ${total})`);
    return;
  }

  if (kind === 'interact') {
    const adjDoors = getAdjacentDoorsForToken(tok, sc);
    if (adjDoors.length > 0) {
      executeCrawlerToggleDoorOnHost(tok.id, false);
      return;
    }
    const adjObj = (sc.mapObjects || []).find(o => calcGridDistanceFt(tok.gx, tok.gy, o.gx, o.gy) <= 10);
    if (adjObj) {
      if (adjObj.hiddenFromPlayers) adjObj.hiddenFromPlayers = false;
      broadcastDiceRollEvent({
        title: `🤲 ${tok.iconSymbol || '⚔️'} ${tok.name} — INTERACTED`,
        subtitle: `Exploration • Investigated ${adjObj.name}`,
        playerSubtitle: `Interacted with ${adjObj.name}`,
        flareLevel: 'standard',
        rolls: [{
          targetName: `${adjObj.iconSymbol || '📦'} ${adjObj.name}`,
          formulaText: adjObj.notes || `Examined / manipulated ${adjObj.name}`,
          playerFormulaText: adjObj.notes || `Examined / manipulated ${adjObj.name}`,
          resultLabel: 'INTERACTED',
          playerResultLabel: 'INTERACTED',
          hit: false
        }]
      });
      commitStateChange();
      showVttToast(`🤲 ${tok.name} interacted with ${adjObj.name}`);
      return;
    }
    showVttToast(`🤲 ${tok.name} found no adjacent door or prop within 10ft to interact with.`);
    return;
  }

  if (kind === 'sneak') {
    const nat = Math.floor(Math.random() * 20) + 1;
    const stealthRank = getCrawlerSkillRank(tok, /^stealth$/i);
    const mod = getCrawlerStatMod(tok, 'Dex');
    const total = nat + stealthRank + mod;
    const nearbyMobs = (sc.tokens || []).filter(m => {
      if (m.role === 'crawler' || getTokenHealthMetrics(m).curHp <= 0) return false;
      const dFt = calcGridDistanceFt(tok.gx, tok.gy, m.gx, m.gy);
      if (dFt > 40) return false;
      const mWx = (m.gx + 0.5) * gs;
      const mWy = (m.gy + 0.5) * gs;
      return hasLineOfSightBetweenPoints(cWx, cWy, mWx, mWy, blockingWalls);
    });

    const dc = nearbyMobs.length > 0
      ? Math.max(...nearbyMobs.map(m => getFlatNumericDc(m.surprise || '12+F', 12)))
      : 12 + floorNum;
    const out = evaluateDccCheckOutcome(nat, total, dc);
    tok.buffs = tok.buffs || [];
    if (out.success && !tok.buffs.includes('Stealth')) tok.buffs.push('Stealth');

    broadcastDiceRollEvent({
      title: `🥷 ${tok.iconSymbol || '⚔️'} ${tok.name} — STEALTH APPROACH`,
      subtitle: `d20 (${nat})${stealthRank ? ` + R${stealthRank} Stealth` : ''} + ${mod} (Dex) = ${total} vs DC ${dc}`,
      playerSubtitle: `Stealth Check: d20 (${nat})${stealthRank ? ` + R${stealthRank} Stealth` : ''} + ${mod} (Dex) = ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: nearbyMobs.length ? nearbyMobs.map(m => m.name).join(', ') : 'Unseen Patrol',
        formulaText: out.success ? 'Moved quietly without alerting nearby foes (+Stealth)' : 'Made noise or drew attention nearby',
        playerFormulaText: out.success ? 'Moved quietly without alerting nearby foes (+Stealth)' : 'Made noise or drew attention nearby',
        resultLabel: out.success ? `STEALTH (${out.tier})` : `SPOTTED (${out.tier})`,
        playerResultLabel: out.success ? `STEALTH (${out.tier})` : `SPOTTED (${out.tier})`,
        hit: !out.success
      }]
    });
    commitStateChange();
    showVttToast(`🥷 ${tok.name} Stealth: ${out.success ? `Unnoticed (${total} vs ${dc})` : `Spotted (${total} vs ${dc})`}`);
    return;
  }

  const targetMob = pickExplorationTargetMob(sc, tok, gs, blockingWalls, targetMobId);
  const dc = targetMob ? getFlatNumericDc(targetMob.surprise || '12+F', 12) : (12 + floorNum);

  if (kind === 'first_impression') {
    const nat = Math.floor(Math.random() * 20) + 1;
    const rank = getCrawlerSkillRank(tok, /^good\s*first\s*impression$/i);
    const mod = getCrawlerStatMod(tok, 'Int');
    const total = nat + rank + mod;
    const out = evaluateDccCheckOutcome(nat, total, dc);
    let perkText = out.success
      ? `${targetMob ? targetMob.name : 'Non-hostile mob/NPC'} approaches with wary curiosity`
      : `Failed to make a warm impression (${targetMob ? targetMob.name : 'nearby creature'} remains guarded)`;
    if (out.success) {
      if (rank >= 15) perkText += ' • R15: Same-type group up to 2× level holds fire unless provoked/blocked';
      else if (rank >= 10) perkText += ' • R10: Mobs up to 2× level hold fire unless provoked/blocked';
      else if (rank >= 5) perkText += ' • R5: Lower-level mobs hold fire unless attacked';
      tok.buffs = tok.buffs || [];
      if (!tok.buffs.includes('Wary Curiosity')) tok.buffs.push('Wary Curiosity');
    }
    broadcastDiceRollEvent({
      title: `🤝 ${tok.iconSymbol || '⚔️'} ${tok.name} — GOOD FIRST IMPRESSION`,
      subtitle: `Int-Opposed Check • d20 (${nat})${rank ? ` + R${rank} First Impression` : ''} + ${mod} (Int) = ${total} vs DC ${dc}`,
      playerSubtitle: `Good First Impression: d20 (${nat})${rank ? ` + R${rank}` : ''} + ${mod} (Int) = ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: targetMob ? `${targetMob.iconSymbol || '👹'} ${targetMob.name}` : 'Nearby Mob / NPC',
        formulaText: perkText,
        playerFormulaText: perkText,
        resultLabel: out.success ? `CURIOUS (${out.tier})` : `GUARDED (${out.tier})`,
        playerResultLabel: out.success ? `CURIOUS (${out.tier})` : `GUARDED (${out.tier})`,
        hit: !out.success
      }]
    });
    commitStateChange();
    showVttToast(`🤝 ${tok.name} Good First Impression: ${total} vs DC ${dc} (${out.tier})`);
    return;
  }

  if (kind === 'animal_handling') {
    const nat = Math.floor(Math.random() * 20) + 1;
    const rank = getCrawlerSkillRank(tok, /^animal\s*handling$/i);
    const mod = getCrawlerStatMod(tok, 'Int');
    const total = nat + rank + mod;
    const out = evaluateDccCheckOutcome(nat, total, dc);
    let animalNote = out.success
      ? `Animal calmed/befriended enough to avoid attacking ${tok.name}`
      : `Animal stays skittish or aggressive toward ${tok.name}`;
    if (out.success) {
      if (rank >= 15) animalNote += ' • R15: Up to 2 pets';
      else if (rank >= 10) animalNote += ' • R10: 2× bonding speed';
      else if (rank >= 5) animalNote += ' • R5: Spec animal Adv & bonus surprise action';
      tok.buffs = tok.buffs || [];
      if (!tok.buffs.includes('Animal Calm')) tok.buffs.push('Animal Calm');
    }
    broadcastDiceRollEvent({
      title: `🐾 ${tok.iconSymbol || '⚔️'} ${tok.name} — ANIMAL HANDLING`,
      subtitle: `Int-Opposed Check • d20 (${nat})${rank ? ` + R${rank} Handling` : ''} + ${mod} (Int) = ${total} vs DC ${dc}`,
      playerSubtitle: `Animal Handling: d20 (${nat})${rank ? ` + R${rank}` : ''} + ${mod} (Int) = ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: targetMob ? `${targetMob.iconSymbol || '🐾'} ${targetMob.name}` : 'Nearby Beast / Animal',
        formulaText: animalNote,
        playerFormulaText: animalNote,
        resultLabel: out.success ? `CALMED (${out.tier})` : `UNSETTLED (${out.tier})`,
        playerResultLabel: out.success ? `CALMED (${out.tier})` : `UNSETTLED (${out.tier})`,
        hit: !out.success
      }]
    });
    commitStateChange();
    showVttToast(`🐾 ${tok.name} Animal Handling: ${total} vs DC ${dc} (${out.tier})`);
    return;
  }

  if (kind === 'parley') {
    const socialSpecs = [
      { key: 'Persuasion', rx: /^persuasion$/i, stat: 'Int', note: 'Target follows reasonable suggestion if not too costly/dangerous/against nature' },
      { key: 'Negotiation', rx: /^negotiation$/i, stat: 'Int', note: 'Tentative agreement or 10%+ favorable haggle terms (note entity haggle rules)' },
      { key: 'Diplomacy', rx: /^diplomacy$/i, stat: 'Int', note: 'Opposing parties open to discussion/mediation' },
      { key: 'Deception', rx: /^deception$/i, stat: 'Int', note: 'Lie lands and target believes it (watch for Detect Lies)' },
      { key: 'Intimidate', rx: /^intimidate$/i, stat: 'Cha', note: 'Target shaken/intimidated before hostility escalates' }
    ];
    const forcedSpec = parleySkillKey
      ? socialSpecs.find(sp => sp.key.toLowerCase() === String(parleySkillKey).trim().toLowerCase())
      : null;
    let chosen = forcedSpec || socialSpecs[0];
    let bestRank = forcedSpec ? getCrawlerSkillRank(tok, forcedSpec.rx) : -1;
    if (!forcedSpec) {
      for (const sp of socialSpecs) {
        const r = getCrawlerSkillRank(tok, sp.rx);
        if (r > bestRank) {
          bestRank = r;
          chosen = sp;
        }
      }
    }
    const rank = Math.max(0, bestRank);
    const mod = getCrawlerStatMod(tok, chosen.stat);
    const detectLiesRank = getCrawlerSkillRank(tok, /^detect\s*lies$/i);
    const nat = Math.floor(Math.random() * 20) + 1;
    const total = nat + rank + mod;
    const out = evaluateDccCheckOutcome(nat, total, dc);
    const outcomeText = out.success
      ? `${chosen.note}${detectLiesRank > 0 ? ` • Detect Lies R${detectLiesRank} active` : ''}`
      : `Parley did not sway ${targetMob ? targetMob.name : 'the target'}`;

    broadcastDiceRollEvent({
      title: `💬 ${tok.iconSymbol || '⚔️'} ${tok.name} — PARLEY (${chosen.key.toUpperCase()})`,
      subtitle: `d20 (${nat})${rank ? ` + R${rank} ${chosen.key}` : ''} + ${mod} (${chosen.stat}) = ${total} vs DC ${dc}`,
      playerSubtitle: `${chosen.key} Check: d20 (${nat})${rank ? ` + R${rank}` : ''} + ${mod} (${chosen.stat}) = ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: targetMob ? `${targetMob.iconSymbol || '👹'} ${targetMob.name}` : 'Mob / NPC Parley',
        formulaText: outcomeText,
        playerFormulaText: outcomeText,
        resultLabel: out.success ? `SWAYED (${out.tier})` : `RESISTED (${out.tier})`,
        playerResultLabel: out.success ? `SWAYED (${out.tier})` : `RESISTED (${out.tier})`,
        hit: !out.success
      }]
    });
    commitStateChange();
    showVttToast(`💬 ${tok.name} (${chosen.key}): ${total} vs DC ${dc} (${out.tier})`);
    return;
  }

  if (kind === 'pickpocket') {
    const nat = Math.floor(Math.random() * 20) + 1;
    const rank = getCrawlerSkillRank(tok, /^sleight\s*of\s*hand$/i);
    const mod = getCrawlerStatMod(tok, 'Int');
    const total = nat + rank + mod;
    const out = evaluateDccCheckOutcome(nat, total, dc);
    const pocketNote = out.success
      ? `Slipped small item/pocket goods unnoticed${rank >= 5 ? ' (R5+ Mob/NPC Pickpocket)' : ''}`
      : `Fumbled or risked being noticed by ${targetMob ? targetMob.name : 'nearby target'}`;

    broadcastDiceRollEvent({
      title: `🤏 ${tok.iconSymbol || '⚔️'} ${tok.name} — SLEIGHT OF HAND`,
      subtitle: `Int-Opposed Check • d20 (${nat})${rank ? ` + R${rank} Sleight of Hand` : ''} + ${mod} (Int) = ${total} vs DC ${dc}`,
      playerSubtitle: `Sleight of Hand: d20 (${nat})${rank ? ` + R${rank}` : ''} + ${mod} (Int) = ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: targetMob ? `${targetMob.iconSymbol || '👹'} ${targetMob.name}` : 'Nearby Target',
        formulaText: pocketNote,
        playerFormulaText: pocketNote,
        resultLabel: out.success ? `UNSEEN (${out.tier})` : `CAUGHT/FAIL (${out.tier})`,
        playerResultLabel: out.success ? `UNSEEN (${out.tier})` : `CAUGHT/FAIL (${out.tier})`,
        hit: !out.success
      }]
    });
    commitStateChange();
    showVttToast(`🤏 ${tok.name} Sleight of Hand: ${total} vs DC ${dc} (${out.tier})`);
    return;
  }

  if (kind === 'lore') {
    const nat = Math.floor(Math.random() * 20) + 1;
    const rank = getCrawlerSkillRank(tok, /^lore$/i);
    const mod = getCrawlerStatMod(tok, 'Int');
    const total = nat + rank + mod;
    const out = evaluateDccCheckOutcome(nat, total, dc);
    const mobHint = targetMob
      ? `${targetMob.name} (${targetMob.classification || 'Mob'}${targetMob.neighborhood ? ` • ${targetMob.neighborhood}` : ''})`
      : (sc.name || 'Current Neighborhood');
    const loreNote = out.success
      ? `Recalled useful intel on ${mobHint} & how not to anger locals${rank >= 5 ? ' (Factions/NPCs/Group perks)' : ''}`
      : `Could not recall reliable lore on ${mobHint}`;

    broadcastDiceRollEvent({
      title: `📜 ${tok.iconSymbol || '⚔️'} ${tok.name} — LORE RECALL`,
      subtitle: `Unopposed Check • d20 (${nat})${rank ? ` + R${rank} Lore` : ''} + ${mod} (Int) = ${total} vs DC ${dc}`,
      playerSubtitle: `Lore Check: d20 (${nat})${rank ? ` + R${rank}` : ''} + ${mod} (Int) = ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: mobHint,
        formulaText: loreNote,
        playerFormulaText: loreNote,
        resultLabel: out.success ? `INTEL (${out.tier})` : `NO CLUE (${out.tier})`,
        playerResultLabel: out.success ? `INTEL (${out.tier})` : `NO CLUE (${out.tier})`,
        hit: !out.success
      }]
    });
    commitStateChange();
    showVttToast(`📜 ${tok.name} Lore: ${total} vs DC ${dc} (${out.tier})`);
  }
}

function triggerCrawlerExplorationAction(tokenId, kind, targetMobId = '', parleySkillKey = '') {
  const sc = getActiveScene();
  const tok = IS_PLAYER_WINDOW
    ? getClaimedCrawlerToken()
    : (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;

  if ((appState?.round || 0) === 0 && !isExplorationModeActive()) {
    showVttToast('⏸️ Exploration Mode is currently paused.');
    return;
  }

  const selEl = document.getElementById(`exploreTargetMob_${tok.id}`) || document.getElementById(`playerExploreTargetMob`);
  const chosenMobId = String(targetMobId || (selEl ? selEl.value : '') || '').trim();
  const pSelEl = document.getElementById(IS_PLAYER_WINDOW ? 'playerParleySkillChoice' : `parleySkillChoice_${tok.id}`);
  const chosenParleyKey = String(parleySkillKey || (pSelEl ? pSelEl.value : '') || '').trim();
  if (IS_PLAYER_WINDOW) {
    sendPlayerCombatActionToHost(tok.id, `explore_${kind}`, chosenMobId, chosenParleyKey);
    showVttToast(`🧭 ${tok.name} performing ${kind}...`);
  } else {
    executeCrawlerExplorationActionOnHost(tok.id, kind, chosenMobId, false, chosenParleyKey);
  }
}

function executeCrawlerSupportActionOnHost(tokenId, actionKind, fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;
  if (fromRemotePlayer && isPhaseLockActive()) {
    const perm = getCrawlerPhasePermissions(tok);
    if (perm.locked || (actionKind === 'call_play' && !perm.canActFull)) {
      showVttToast(`🔒 Blocked ${tok.name}'s ${actionKind === 'call_play' ? 'Call a Play' : 'Intervene'} (wrong combat step).`);
      return;
    }
  }

  if ((tok.currentAp ?? 0) <= 0 && (appState?.round || 0) > 0) {
    showVttToast(`⚠️ ${tok.name} has 0 AP remaining this round!`);
    return;
  }

  if ((appState?.round || 0) > 0) {
    tok.currentAp = Math.max(0, (tok.currentAp ?? 2) - 1);
  }

  if (actionKind === 'intervene') {
    const d6 = Math.floor(Math.random() * 6) + 1;
    broadcastDiceRollEvent({
      title: `🤝 ${tok.iconSymbol || '⚔️'} ${tok.name} — INTERVENE!`,
      subtitle: 'Interrupt / Action (-1 AP) • Add bonus to an ally’s d20 Check (turns Near Miss into Success!)',
      playerSubtitle: 'Interrupt / Action (-1 AP) • Add bonus to an ally’s d20 Check!',
      flareLevel: d6 === 6 ? 'great' : 'standard',
      rolls: [{
        targetName: 'Party Ally Support',
        formulaText: `Rolled 1d6 = +${d6} to ally’s d20 Check (except Stat Checks)`,
        playerFormulaText: `Rolled 1d6 = +${d6} to ally’s d20 Check`,
        resultLabel: `+${d6} BONUS`,
        playerResultLabel: `+${d6} BONUS`,
        hit: false
      }]
    });
    commitStateChange();
    showVttToast(`🤝 ${tok.name} used Intervene: +${d6} bonus!`);
  } else if (actionKind === 'call_play') {
    const tacticsEntry = (tok.assignedSkills || []).find(s => /^tactics$/i.test(String(s.name || '').trim()));
    const dieSides = (tacticsEntry && (Number(tacticsEntry.rank) || 1) >= 10) ? 10 : 6;
    const r1 = Math.floor(Math.random() * dieSides) + 1;
    const r2 = Math.floor(Math.random() * dieSides) + 1;
    const kept = Math.max(r1, r2);
    broadcastDiceRollEvent({
      title: `📣 ${tok.iconSymbol || '⚔️'} ${tok.name} — CALL A PLAY!`,
      subtitle: `Non-Skill Action (-1 AP) • 2d${dieSides} keep highest [${r1}, ${r2}] → +${kept}`,
      playerSubtitle: `Call a Play (-1 AP) • 2d${dieSides} keep highest [${r1}, ${r2}] → +${kept}`,
      flareLevel: kept >= dieSides ? 'great' : 'standard',
      rolls: [{
        targetName: 'Proposed Ally Action',
        formulaText: `Add +${kept} to ally’s Skill Check (or +${kept} Damage if already a Success!)`,
        playerFormulaText: `Add +${kept} to ally’s Skill Check (or +${kept} Damage if already a Success!)`,
        resultLabel: `+${kept} PLAY`,
        playerResultLabel: `+${kept} PLAY`,
        hit: false
      }]
    });
    commitStateChange();
    showVttToast(`📣 ${tok.name} Called a Play: +${kept} bonus!`);
  } else if (actionKind === 'trap_detect') {
    if ((appState?.round || 0) > 0) tok.currentAp = Math.min(2, (tok.currentAp ?? 0) + 1);
    executeTrapDetectionOnHost(tokenId, fromRemotePlayer);
  } else if (actionKind === 'trap_disarm') {
    if ((appState?.round || 0) > 0) tok.currentAp = Math.min(2, (tok.currentAp ?? 0) + 1);
    const reqTrapId = String(uiState?._lastRemoteTargetMobId || '').trim();
    executeDisarmTrapOnHost(tokenId, reqTrapId, fromRemotePlayer);
  } else if (/^explore_(search|interact|sneak|first_impression|animal_handling|parley|pickpocket|lore)$/.test(actionKind)) {
    const reqMobId = String(uiState?._lastRemoteTargetMobId || '').trim();
    const reqParleyKey = String(uiState?._lastRemoteParleySkillKey || '').trim();
    executeCrawlerExplorationActionOnHost(tokenId, actionKind.replace('explore_', ''), reqMobId, fromRemotePlayer, reqParleyKey);
  } else if (actionKind === 'toggle_door') {
    if (typeof executeCrawlerToggleDoorOnHost === 'function') {
      if ((appState?.round || 0) > 0) {
        tok.currentAp = Math.min(2, (tok.currentAp ?? 0) + 1);
      }
      executeCrawlerToggleDoorOnHost(tokenId, fromRemotePlayer);
    }
  }
}

function triggerCrawlerSupportAction(tokenId, actionKind) {
  if (IS_PLAYER_WINDOW) {
    const tok = getClaimedCrawlerToken();
    if (!tok) return;
    const perm = getCrawlerPhasePermissions(tok);
    if (perm.locked) {
      showVttToast(perm.bannerText || '🔒 Actions locked during this combat step.');
      return;
    }
    if (actionKind === 'call_play' && !perm.canActFull) {
      showVttToast('🔒 Call a Play can only be used in Step 4: Crawler Action Phase!');
      return;
    }
    sendPlayerCombatActionToHost(tok.id, actionKind);
    showVttToast(actionKind === 'intervene' ? '🤝 Rolling Intervene (1d6)...' : '📣 Calling a Play (2d6kh1)...');
  } else {
    executeCrawlerSupportActionOnHost(tokenId, actionKind, false);
  }
}

// -------------------------------------------------------------------------
// 4. GM NPC VS. NPC RESOLVER (TABLE 8 — p. 83)
// -------------------------------------------------------------------------
function executeNpcVsNpcResolution(attackerId, defenderId) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const atk = (sc?.tokens || []).find(t => t.id === attackerId);
  const def = (sc?.tokens || []).find(t => t.id === defenderId);
  if (!atk || !def || atk.id === def.id) {
    showVttToast('⚠️ Select a valid opposing Mob to fight.');
    return;
  }

  const d12 = Math.floor(Math.random() * 12) + 1;
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const atkFlat = getFlatNumericDc(atk.attacks?.[0]?.hitBonus || '12+F', 12);
  const defEvade = getEffectiveMobEvadeNumeric(def);
  const baseDmgExpr = atk.attacks?.[0]?.damage || '1d6';
  let resultLabel = '';
  let formulaText = '';
  let flareLevel = 'standard';

  if (d12 === 1) {
    resultLabel = 'MAJOR FAIL (ALL GET ADV)';
    formulaText = `1d12 (1): ${atk.name} misses badly! Everyone gains Advantage to Attack it until end of round.`;
  } else if (d12 <= 4) {
    resultLabel = 'MISS / LOSES';
    formulaText = `1d12 (${d12}): ${atk.name} misses ${def.name} (Action consumed).`;
  } else if (d12 <= 8) {
    if (atkFlat > defEvade) {
      const dmg = rollDccExpressionForCaster(baseDmgExpr, atk);
      const net = Math.max(0, dmg - getEffectiveTokenDr(def));
      const pipOut = calculateWholePipDamageOutcome(def, net);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(def.id, -pipOut.effectiveHpDamage);
      resultLabel = `STAT WIN • ${pipOut.effectiveHpDamage} DMG`;
      formulaText = `1d12 (${d12}): ${atk.name} Hit (${atkFlat}) > ${def.name} Evade (${defEvade}) → ${pipOut.pipsDestroyed} Pip(s)`;
    } else {
      resultLabel = 'STAT LOSS (MISS)';
      formulaText = `1d12 (${d12}): ${atk.name} Hit (${atkFlat}) ≤ ${def.name} Evade (${defEvade}) → Misses!`;
    }
  } else if (d12 <= 11) {
    const dmg = rollDccExpressionForCaster(baseDmgExpr, atk);
    const net = Math.max(0, dmg - getEffectiveTokenDr(def));
    const pipOut = calculateWholePipDamageOutcome(def, net);
    if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(def.id, -pipOut.effectiveHpDamage);
    resultLabel = `HIT • ${pipOut.effectiveHpDamage} DMG`;
    formulaText = `1d12 (${d12}): ${atk.name} hits ${def.name} for ${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} Pip(s))`;
  } else {
    const dmg = rollDccExpressionForCaster(baseDmgExpr, atk) + (floorNum * 2);
    const net = Math.max(0, dmg - getEffectiveTokenDr(def));
    const pipOut = calculateWholePipDamageOutcome(def, net);
    if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(def.id, -pipOut.effectiveHpDamage);
    resultLabel = `AMAZING! ${pipOut.effectiveHpDamage} DMG`;
    formulaText = `1d12 (12): Amazing Success! +${floorNum * 2} (2×Floor) → ${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} Pip(s))`;
    flareLevel = 'great';
  }

  atk.mobAttacked = true;
  broadcastDiceRollEvent({
    title: `👹 Mob vs. Mob (Table 8): ${atk.name} ⚔️ ${def.name}`,
    subtitle: `NPC vs. NPC Resolution • 1d12 = ${d12}`,
    playerSubtitle: `${atk.name} clashes with ${def.name}!`,
    flareLevel,
    rolls: [{
      targetName: `${def.iconSymbol || '👹'} ${def.name}`,
      formulaText,
      playerFormulaText: formulaText,
      resultLabel,
      playerResultLabel: resultLabel,
      hit: d12 >= 9 || (d12 >= 5 && atkFlat > defEvade)
    }]
  });

  commitStateChange();
  showVttToast(`👹 Table 8 (1d12=${d12}): ${resultLabel}`);
}

// -------------------------------------------------------------------------
// 5. STEP 5 CLEAN UP & POST-COMBAT INJURY APPLICATION (pp. 80, 86)
// -------------------------------------------------------------------------
function runEndOfRoundCleanUp() {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  if (!sc) return;
  const roundNum = Math.max(1, Number(appState?.round) || 1);
  const events = [];

  (sc.tokens || []).forEach(tok => {
    const hm = getTokenHealthMetrics(tok);
    if (hm.curHp <= 0) return;

    const floorNum = Math.max(1, Number(appState?.floor) || 1);
    const curSts = tok.statuses || [];

    // 1. Burned Debuff: 1d10+F Fire damage at end of each round
    const burnedCount = curSts.filter(s => /^burn(ed|ing)?$/i.test(String(s).trim())).length;
    if (burnedCount > 0) {
      let burnDmg = 0;
      for (let b = 0; b < burnedCount; b++) burnDmg += (Math.floor(Math.random() * 10) + 1) + floorNum;
      const net = Math.max(0, burnDmg - getEffectiveTokenDr(tok));
      const pipOut = calculateWholePipDamageOutcome(tok, net);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
      events.push(`🔥 ${tok.name} Burned: ${burnDmg} Fire (${pipOut.pipsDestroyed} Pip)`);
    }

    // 1b. Blood Trail Debuff: 1d6+F damage at end of each round (Stackable)
    const btCount = curSts.filter(s => /^blood\s*trail$/i.test(String(s).trim())).length;
    if (btCount > 0) {
      let btDmg = 0;
      for (let k = 0; k < btCount; k++) btDmg += (Math.floor(Math.random() * 6) + 1) + floorNum;
      const net = Math.max(0, btDmg - getEffectiveTokenDr(tok));
      const pipOut = calculateWholePipDamageOutcome(tok, net);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
      events.push(`🩸 ${tok.name} Blood Trail${btCount > 1 ? ` ×${btCount}` : ''}: ${btDmg} (${pipOut.pipsDestroyed} Pip)`);
    }

    // 1c. Drowning Debuff: 1d6+F damage at end of each round while head is below water
    const drownCount = curSts.filter(s => /^drowning$/i.test(String(s).trim())).length;
    if (drownCount > 0) {
      let drDmg = 0;
      for (let k = 0; k < drownCount; k++) drDmg += (Math.floor(Math.random() * 6) + 1) + floorNum;
      const pipOut = calculateWholePipDamageOutcome(tok, drDmg);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
      events.push(`🌊 ${tok.name} Drowning: ${drDmg} (${pipOut.pipsDestroyed} Pip)`);
    }

    // 1d. Poisoned Debuff: 1d8+F Poison damage at end of each round (Stackable)
    const poisCount = curSts.filter(s => /^poison(ed)?$/i.test(String(s).trim())).length;
    if (poisCount > 0) {
      let pDmg = 0;
      for (let k = 0; k < poisCount; k++) pDmg += (Math.floor(Math.random() * 8) + 1) + floorNum;
      const net = Math.max(0, pDmg - getEffectiveTokenDr(tok));
      const pipOut = calculateWholePipDamageOutcome(tok, net);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
      events.push(`☠️ ${tok.name} Poisoned${poisCount > 1 ? ` ×${poisCount}` : ''}: ${pDmg} Poison (${pipOut.pipsDestroyed} Pip)`);
    }

    // 1e. Sepsis Debuff: Staggered + 1d10+F Poison damage at end of each round until healed
    const sepCount = curSts.filter(s => /^sepsis$/i.test(String(s).trim())).length;
    if (sepCount > 0) {
      let sDmg = 0;
      for (let k = 0; k < sepCount; k++) sDmg += (Math.floor(Math.random() * 10) + 1) + floorNum;
      const net = Math.max(0, sDmg - getEffectiveTokenDr(tok));
      const pipOut = calculateWholePipDamageOutcome(tok, net);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
      events.push(`🦠 ${tok.name} Sepsis: ${sDmg} Poison (${pipOut.pipsDestroyed} Pip)`);
    }

    // 2. Regeneration Passive Skill (p. 196)
    if (tok.role === 'crawler') {
      const regen = (tok.assignedSkills || []).find(s => /^regeneration$/i.test(String(s.name || '').trim()));
      if (regen && hm.curHp < hm.maxHp) {
        const conScore = typeof getCrawlerNumericStat === 'function' ? getCrawlerNumericStat(tok, 'Con') : 10;
        const r = Math.max(1, Number(regen.rank) || 1);
        if (r >= conScore || (roundNum % 2 === 1)) {
          adjustTokenHealth(tok.id, hm.hpPerPip);
          events.push(`💚 ${tok.name} Regeneration: +1 Pip`);
        }
      }
    }
  });

  // 3. Tick Persistent Hazard Zone Damage & Duration on the map
  if (Array.isArray(sc.persistentEffects) && sc.persistentEffects.length > 0) {
    sc.persistentEffects.forEach(pe => {
      if (!pe.hazardDmgExpr) return;
      const casterTok = (sc.tokens || []).find(t => t.id === pe.casterId) || null;
      let hx = pe.gx;
      let hy = pe.gy;
      if (pe.attachToTokenId) {
        const host = (sc.tokens || []).find(t => t.id === pe.attachToTokenId);
        if (!host || getTokenHealthMetrics(host).curHp <= 0) return;
        hx = host.gx;
        hy = host.gy;
      }
      const radFt = Math.max(5, Number(pe.radiusFt) || 10);
      (sc.tokens || []).forEach(tok => {
        if (getTokenHealthMetrics(tok).curHp <= 0) return;
        if (pe.hazardTargetRole === 'mob' && tok.role === 'crawler') return;
        if (pe.attachToTokenId && tok.id === pe.attachToTokenId) return;
        const dFt = calcGridDistanceFt(hx, hy, tok.gx, tok.gy);
        if (dFt <= radFt) {
          const dmg = rollDccExpressionForCaster(pe.hazardDmgExpr, casterTok || tok);
          const net = Math.max(0, dmg - getEffectiveTokenDr(tok));
          const pipOut = calculateWholePipDamageOutcome(tok, net);
          if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
          events.push(`💥 ${pe.name} → ${tok.name}: ${dmg} (${pipOut.pipsDestroyed} Pip)`);
        }
      });
    });

    const expiredNames = [];
    sc.persistentEffects = sc.persistentEffects.filter(pe => {
      if (pe.remainingRounds < 0) return true; // infinite until dismissed
      pe.remainingRounds -= 1;
      if (pe.remainingRounds <= 0) {
        expiredNames.push(pe.name);
        return false;
      }
      return true;
    });
    if (expiredNames.length > 0) {
      events.push(`⏳ Expired: ${expiredNames.join(', ')}`);
    }
  }

  if (events.length > 0) {
    showVttToast(`🧹 Clean Up: ${events.join(' • ')}`);
  }
}

function applyPostCombatPendingInjuries() {
  const sc = getActiveScene();
  if (!sc) return;
  const applied = [];
  (sc.tokens || []).forEach(tok => {
    if (!Array.isArray(tok.pendingInjuries) || tok.pendingInjuries.length === 0) return;
    tok.statuses = tok.statuses || [];
    tok.pendingInjuries.forEach(inj => {
      if (!tok.statuses.includes(inj)) tok.statuses.push(inj);
      applied.push(`${tok.name}: +${inj}`);
    });
    tok.pendingInjuries = [];
  });
  if (applied.length > 0) {
    showVttToast(`🩹 Adrenaline faded — Post-Combat Injuries applied: ${applied.join(', ')}`);
  }
}

// -------------------------------------------------------------------------
// 6. MOB TELEGRAPHING, "I'M BEING TARGETED" HUD & STEP 2 EVADE ALL (p. 81)
// -------------------------------------------------------------------------
function getIncomingDeclaredAttacksForCrawler(crawlerId, scene = null) {
  const sc = scene || getActiveScene();
  if (!sc || !crawlerId) return [];
  const declared = Array.isArray(sc.declaredMobAttacks) ? sc.declaredMobAttacks : [];
  return declared.filter(d => {
    if (!Array.isArray(d.targetIds) || !d.targetIds.includes(crawlerId)) return false;
    const mob = (sc.tokens || []).find(t => t.id === d.mobId);
    if (!mob || mob.hiddenFromPlayers) return false;
    return getTokenHealthMetrics(mob).curHp > 0;
  });
}

function toggleDeclareMobAttack(mobId, atkIdx) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const mob = (sc?.tokens || []).find(t => t.id === mobId);
  if (!mob) return;
  const attacks = getEffectiveTokenAttacks(mob);
  const atk = attacks[atkIdx];
  if (!atk) return;

  sc.declaredMobAttacks = Array.isArray(sc.declaredMobAttacks) ? sc.declaredMobAttacks : [];
  const declId = `${mobId}_${atkIdx}`;
  const existingIdx = sc.declaredMobAttacks.findIndex(d => d.id === declId);

  const inRange = getMobAttackInRangeCrawlers(mob, atk, sc);
  const selectedTargets = inRange.filter(c => {
    const chk = document.getElementById(`mobAtkHitChk_${mobId}_${atkIdx}_${c.id}`);
    return chk ? chk.checked : true;
  });

  if (existingIdx !== -1 && selectedTargets.length === 0) {
    sc.declaredMobAttacks.splice(existingIdx, 1);
    commitStateChange();
    showVttToast(`🎯 Cleared attack declaration for ${mob.name} — ${atk.name}`);
    return;
  }

  if (existingIdx !== -1) {
    // Toggle off if same targets are already declared
    const prevIds = (sc.declaredMobAttacks[existingIdx].targetIds || []).slice().sort().join(',');
    const nextIds = selectedTargets.map(c => c.id).sort().join(',');
    if (prevIds === nextIds) {
      sc.declaredMobAttacks.splice(existingIdx, 1);
      commitStateChange();
      showVttToast(`🎯 Cancelled declaration for ${mob.name} — ${atk.name}`);
      return;
    }
  }

  if (selectedTargets.length === 0) {
    showVttToast(`⚠️ No Crawlers checked in range (${atk.rangeFt || 5}ft) to declare ${atk.name}.`);
    return;
  }

  const fullText = `${atk.name} ${atk.damage || ''} ${atk.special || ''}`;
  const isAoe = /area of effect|burst|cone|line|splash|blast radius/i.test(fullText);
  const entry = {
    id: declId,
    mobId: mob.id,
    mobName: mob.name,
    mobIcon: mob.iconSymbol || '👹',
    atkIdx,
    atkName: atk.name,
    rangeFt: Number(atk.rangeFt) || 5,
    damage: atk.damage || '1d6',
    hitBonus: atk.hitBonus || '12+F',
    isAoe,
    targetIds: selectedTargets.map(c => c.id)
  };

  if (existingIdx !== -1) sc.declaredMobAttacks[existingIdx] = entry;
  else sc.declaredMobAttacks.push(entry);

  commitStateChange();
  showVttToast(`🎯 Declared ${mob.name}'s ${atk.name} → ${selectedTargets.map(c => c.name).join(', ')}!`);
}

function clearDeclaredMobAttack(mobId, atkIdx) {
  const sc = getActiveScene();
  if (!sc || !Array.isArray(sc.declaredMobAttacks)) return;
  const declId = `${mobId}_${atkIdx}`;
  sc.declaredMobAttacks = sc.declaredMobAttacks.filter(d => d.id !== declId);
}

function executeCrawlerDeclareEvadeOnHost(tokenId, fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;

  const curRound = Math.max(1, Number(appState?.round) || 1);
  if (fromRemotePlayer && isPhaseLockActive()) {
    const perm = getCrawlerPhasePermissions(tok);
    if (!perm.canInterruptOnly && !perm.canActFull) {
      showVttToast(`🔒 Blocked ${tok.name}'s Evade — wait for Step 2: Reaction Phase.`);
      return;
    }
  }

  if (tok.evadeDeclaredRound === curRound) {
    showVttToast(`🛡️ ${tok.name} is already Evading all incoming attacks this round.`);
    return;
  }

  const dodgeEntry = (tok.assignedSkills || []).find(s => /^dodge$/i.test(String(s.name || '').trim()));
  const freeDodge = dodgeEntry && (Number(dodgeEntry.rank) || 1) >= 15;

  if (!freeDodge && uiState.autoMoveAp && (appState?.round || 0) > 0) {
    if ((tok.currentAp ?? 0) <= 0) {
      showVttToast(`⚠️ ${tok.name} has 0 AP left to Evade!`);
      return;
    }
    tok.currentAp = Math.max(0, (tok.currentAp ?? 2) - 1);
  }

  tok.evadeDeclaredRound = curRound;
  tok.evadeSpentAp = !freeDodge && uiState.autoMoveAp && (appState?.round || 0) > 0;
  const incomingCount = getIncomingDeclaredAttacksForCrawler(tok.id, sc).length;
  commitStateChange();
  showVttToast(`🛡️ ${tok.name} declared EVADE ALL (${freeDodge ? '0 AP • Dodge R15' : '-1 AP'}) against ${incomingCount || 'incoming'} attack(s)!`);
}

function playerDeclareEvadeAll() {
  const tok = getClaimedCrawlerToken();
  if (!tok) return;
  const perm = getCrawlerPhasePermissions(tok);
  if (perm.locked) {
    showVttToast(perm.bannerText || '🔒 Wait for Step 2: Reaction Phase to declare Evade!');
    return;
  }
  sendPlayerDeclareEvadeToHost(tok.id);
  showVttToast('🛡️ Declaring Evade ALL incoming attacks...');
}

// -------------------------------------------------------------------------
// 7. 0% HEALTH BAR (DYING) & COCKROACH SURVIVAL TRIGGER (Ch. 4 p. 191)
// -------------------------------------------------------------------------
function handleCrawlerZeroHpAndCockroach(tok, prevHp, proposedHp) {
  if (!tok || tok.role !== 'crawler') return proposedHp;
  tok.statuses = tok.statuses || [];

  if (proposedHp > 0) {
    if (tok.statuses.includes('Dying')) {
      tok.statuses = tok.statuses.filter(s => s !== 'Dying');
    }
    return proposedHp;
  }

  if (prevHp > 0 && proposedHp <= 0) {
    const hm = getTokenHealthMetrics(tok);
    const cockroach = (tok.assignedSkills || []).find(s => /^cockroach$/i.test(String(s.name || '').trim()));
    if (cockroach) {
      const rank = Math.max(1, Number(cockroach.rank) || 1);
      const maxUses = rank >= 15 ? 2 : 1;
      const used = Number(tok.cockroachUsesThisScene) || 0;

      if (used < maxUses) {
        let triggered = false;
        let checkText = `Auto-Trigger (Rank ${rank} ≥ 5)`;
        if (rank >= 5) {
          triggered = true;
        } else {
          const nat = Math.floor(Math.random() * 20) + 1;
          const conMod = getCrawlerConModHpPerPip(tok);
          const dc = 10 + Math.max(1, Number(appState?.floor) || 1);
          const total = nat + rank + conMod;
          triggered = nat === 20 || (nat !== 1 && total >= dc);
          checkText = `Unopposed Check: d20(${nat}) + R${rank} + ${conMod} = ${total} vs DC ${dc}`;
        }

        cockroach.markedForAdvancement = true;
        if (triggered) {
          tok.cockroachUsesThisScene = used + 1;
          let survivedHp = hm.hpPerPip; // 10% (1 Pip)
          let survivalNote = 'Dropped to 10% (1 Pip) instead of 0%!';
          if (rank >= 15) {
            survivedHp = hm.maxHp;
            tok.buffs = tok.buffs || [];
            const drBuff = `Cockroach (+${rank} DR)`;
            if (!tok.buffs.includes(drBuff)) tok.buffs.push(drBuff);
            survivalNote = `Healed to 100% HP and gained +${rank} DR until end of next round!`;
          } else if (rank >= 10) {
            survivedHp = prevHp;
            survivalNote = 'Unaffected by the lethal blow (HP preserved)!';
          }

          broadcastDiceRollEvent({
            title: `🪳 COCKROACH TRIGGERED! ${tok.iconSymbol || '⚔️'} ${tok.name} Refuses to Die!`,
            subtitle: `${checkText} • Uses: ${tok.cockroachUsesThisScene}/${maxUses} this scene`,
            playerSubtitle: `${checkText}`,
            flareLevel: 'crit',
            rolls: [{
              targetName: `${tok.iconSymbol || '⚔️'} ${tok.name}`,
              formulaText: survivalNote,
              playerFormulaText: survivalNote,
              resultLabel: `SURVIVED!`,
              playerResultLabel: `SURVIVED!`,
              hit: false
            }]
          });
          showVttToast(`🪳 ${tok.name}'s Cockroach (R${rank}) triggered! ${survivalNote}`);
          return survivedHp;
        } else {
          showVttToast(`💀 ${tok.name}'s Cockroach check failed (${checkText})!`);
        }
      }
    }

    if (!tok.statuses.includes('Dying')) tok.statuses.push('Dying');
    showVttToast(`💀 ${tok.name} dropped to 0% Health Bar — DYING!`);
  }
  return 0;
}

// -------------------------------------------------------------------------
// 8. COLLAPSIBLE ROLL HISTORY TOGGLE
// -------------------------------------------------------------------------
function toggleDiceRollHistory() {
  uiState.showRollHistory = !uiState.showRollHistory;
  renderLiveDiceBroadcastBanner();
}

// -------------------------------------------------------------------------
// 9. PERSISTENT SPELL & SKILL EFFECTS ENGINE (ZONES, WALLS, AURAS, SUMMONS)
// -------------------------------------------------------------------------
function parsePersistentSpellSpec(entry, info, caster, target) {
  if (!entry || !info) return null;
  const name = String(entry.name || '').trim();
  const rank = Math.max(1, Number(info.rank) || 1);
  const unlocked = (entry.upgrades || []).filter(u => {
    const m = String(u).match(/^Rank\s+(\d+)/i);
    return !m || rank >= parseInt(m[1], 10);
  });
  const fullText = [name, entry.tags || '', entry.range || '', entry.baseDamage || '', entry.rank1Effect || '', entry.description || '', ...unlocked].join(' | ');

  // Exclude purely instant one-shot spells that only mention "next round" or "1 round" debuffs without a persistent field/aura
  const isKnownPersistent = /\b(wall of fire|flamewall phalanx|confusing fog|web|protective shell|aura of valor|hot stuff aura|entangling brambles|call lightning storm|corrupting miasma|hailstorm vortex|aquatic whirlpool|tremor snare|tempest siphon|static conduit|vitriolic miasma|caustic rain|grasp of the grave|hole|obsidian spire|bulwark of the earth|wisp armor|oakhide|barkcarapace|molten carapace|voltaic shroud|death's vigil|shadow cloak|cyclone stride|ballad of momentum|bulwark of faith|ward of retribution|ward of sanctuary|ward of preservation|shield of force|mistform embroidery|frostbite barrier|glacial sentinel|infernal hound|terracotta golem|conjure cinder sprite|ball lightning wisp|corrosive ooze|tidal homunculus|zephyr hawk|astral paw)\b/i.test(name);

  const hasZoneDuration = /\b(per round|each round|each turn|starting (?:its|their) turn inside|lasts for \d+|duration is \d+|for \d+ rounds?)\b/i.test(fullText);
  const isInstantAttackOnly = info.isAttack && !isKnownPersistent && !/\b(per round|each round|each turn|starting (?:its|their) turn inside|persistent|lingering|remains as|creates a \d+ft)\b/i.test(fullText);

  if ((!isKnownPersistent && !hasZoneDuration) || isInstantAttackOnly) {
    return null;
  }

  // Parse duration in rounds (check unlocked upgrades last so higher ranks override)
  let remainingRounds = 3;
  let durationLabel = '3 Rounds';
  const roundMatches = [...fullText.matchAll(/(?:duration\s*(?:is|extends\s*to)?\s*|for\s+)(\d+)\s*rounds?/gi)];
  const minMatches = [...fullText.matchAll(/(?:duration\s*(?:is|extends\s*to)?\s*|lasts\s*for\s*|for\s+)(\d+)\s*min(?:ute)?s?/gi)];
  if (roundMatches.length > 0) {
    remainingRounds = Math.max(1, parseInt(roundMatches[roundMatches.length - 1][1], 10) || 3);
    durationLabel = `${remainingRounds} Round${remainingRounds === 1 ? '' : 's'}`;
  } else if (minMatches.length > 0) {
    const mins = parseInt(minMatches[minMatches.length - 1][1], 10) || 1;
    remainingRounds = Math.min(30, mins * 6);
    durationLabel = `${mins} Min (~${remainingRounds}r)`;
  }

  // Determine visual shape & attachment
  let shape = 'circle';
  let attachToTokenId = null;
  let radiusFt = 15;

  if (/\b(wall|phalanx|conduit|rampart|bulwark of the earth)\b/i.test(name)) {
    shape = 'wall';
    const lenM = fullText.match(/(\d+)\s*ft[\s-]*(?:long|wide)/i);
    radiusFt = lenM ? Math.min(60, parseInt(lenM[1], 10)) : 25;
  } else if (/\bweb\b/i.test(name) || info.aoeSpec?.shape === 'cone') {
    shape = 'cone';
    radiusFt = info.aoeSpec?.primaryFt || parseRangeFtFromText(entry.range || '20', rank);
  } else if (
    /\b(aura|shell|armor|oakhide|carapace|shroud|vigil|cloak|stride|ballad|bulwark of faith|ward of|shield of force|mistform|barrier)\b/i.test(name) ||
    info.isSelfOnly
  ) {
    shape = 'aura';
    attachToTokenId = (target || caster)?.id || null;
    const intPlusM = fullText.match(/(\d+)\s*\+\s*int(?:elligence)?[\s-]*(?:foot|ft)/i);
    const radM = fullText.match(/(\d+)\s*(?:ft|foot)\s*(?:burst|blast|radius|aura)/i);
    if (intPlusM) {
      const intRaw = caster?.stats?.Int || '10';
      const intScore = parseInt(String(intRaw).match(/(\d+)/)?.[1] || '10', 10);
      const intMod = typeof getDccStatModifierFromScore === 'function' ? getDccStatModifierFromScore(intScore) : 4;
      radiusFt = Math.min(50, (parseInt(intPlusM[1], 10) || 10) + intMod);
    } else if (radM) {
      radiusFt = Math.min(45, parseInt(radM[1], 10) || 5);
    } else if (/\ballies\b|\bparty\b/i.test(fullText) && !info.isSelfOnly) {
      radiusFt = Math.min(45, Number(info.rangeFt) || 15);
    } else {
      radiusFt = 0; // Self/host-only personal aura
    }
  } else {
    shape = 'circle';
    if (info.aoeSpec?.primaryFt > 0) {
      radiusFt = info.aoeSpec.primaryFt;
    } else {
      const areaM = fullText.match(/(\d+)\s*(?:ft|×\s*\d+\s*ft)\s*(?:radius|diameter|blast|burst|cube|area|circle|cylinder)/i);
      if (areaM) {
        let val = parseInt(areaM[1], 10) || 15;
        if (/diameter|×/i.test(areaM[0])) val = Math.max(5, Math.round(val / 2));
        radiusFt = Math.min(45, val);
      } else {
        radiusFt = 10;
      }
    }
  }

  // Build automatic [Aura] buff label with extracted stat bonuses (+Evade, +DR, +Move)
  let auraBuffLabel = '';
  let affectsAllies = false;
  if (shape === 'aura' && !/\bholy aura\b/i.test(name)) {
    affectsAllies = radiusFt > 0 && (/\ballies\b|\bparty\b|\bnearby\b|\baura\b|\bshell\b/i.test(fullText));
    const statTags = [];
    const evM = fullText.match(/([+-]\d+)\s*(?:to\s*)?(?:saving throws and\s*)?evade/i);
    const drM = fullText.match(/(?:grants?\s*(?:caster\s*)?|have\s*)\+?(\d+)\s*(?:flat\s*)?(?:damage\s*(?:reduction|resistance)|dr)\b/i);
    const mvM = fullText.match(/([+-]\d+\s*ft)\s*movement/i);
    if (evM) statTags.push(`${evM[1]} Evade`);
    if (drM) statTags.push(`+${drM[1]} DR`);
    if (mvM) statTags.push(`${mvM[1]} Move`);
    auraBuffLabel = `[Aura] ${name}${statTags.length ? ` (${statTags.join(', ')})` : ''}`;
  }

  let hazardDmgExpr = '';
  let hazardTargetRole = 'mob';
  if (/(wall of fire|flamewall|hailstorm|call lightning storm|corrupting miasma|vitriolic miasma|caustic rain|aquatic whirlpool|holy aura|grasp of the grave|entangling brambles)/i.test(name)) {
    const dm = (entry.baseDamage || fullText).match(/(\d+d\d+(?:\s*\+\s*(?:int|str|dex|con|cha|\d+))?)/i);
    hazardDmgExpr = dm ? dm[1] : '1d6';
    hazardTargetRole = /holy aura/i.test(name) ? 'mob' : 'mob';
  }

  const vfx = inferVfxFromAbility(entry, info);
  return {
    name,
    shape,
    attachToTokenId,
    radiusFt,
    affectsAllies,
    auraBuffLabel,
    hazardDmgExpr,
    hazardTargetRole,
    remainingRounds,
    durationLabel,
    vfxType: vfx.vfxType,
    vfxColor: vfx.vfxColor
  };
}

function spawnPersistentSpellEffect(caster, target, info, scene) {
  if (!caster || !info || !info.entry || !scene) return null;
  const spec = parsePersistentSpellSpec(info.entry, info, caster, target || caster);
  if (!spec) return null;

  scene.persistentEffects = Array.isArray(scene.persistentEffects) ? scene.persistentEffects : [];
  const tgt = target || caster;
  const pe = {
    id: 'peff_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: spec.name,
    casterId: caster.id,
    casterName: caster.name,
    attachToTokenId: spec.attachToTokenId,
    gx: tgt.gx,
    gy: tgt.gy,
    srcGx: caster.gx,
    srcGy: caster.gy,
    shape: spec.shape,
    radiusFt: spec.radiusFt,
    affectsAllies: Boolean(spec.affectsAllies),
    auraBuffLabel: spec.auraBuffLabel || '',
    hazardDmgExpr: spec.hazardDmgExpr || '',
    hazardTargetRole: spec.hazardTargetRole || 'mob',
    remainingRounds: spec.remainingRounds,
    durationLabel: spec.durationLabel,
    vfxType: spec.vfxType,
    vfxColor: spec.vfxColor
  };

  // Replace identical aura on same token so re-casting refreshes duration instead of stacking duplicates
  if (pe.attachToTokenId) {
    scene.persistentEffects = scene.persistentEffects.filter(
      x => !(x.attachToTokenId === pe.attachToTokenId && x.name.toLowerCase() === pe.name.toLowerCase())
    );
  }
  scene.persistentEffects.push(pe);
  return pe;
}

function adjustPersistentEffectRounds(effectId, delta) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  if (!sc || !Array.isArray(sc.persistentEffects)) return;
  const pe = sc.persistentEffects.find(x => x.id === effectId);
  if (!pe) return;
  pe.remainingRounds = Math.max(1, (Number(pe.remainingRounds) || 1) + delta);
  commitStateChange();
}

function removePersistentSpellEffect(effectId) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  if (!sc || !Array.isArray(sc.persistentEffects)) return;
  sc.persistentEffects = sc.persistentEffects.filter(x => x.id !== effectId);
  commitStateChange();
  showVttToast('✨ Dismissed persistent spell effect');
}

function clearAllPersistentSpellEffects() {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  if (!sc) return;
  sc.persistentEffects = [];
  commitStateChange();
  showVttToast('🧹 Cleared all persistent spell effects on this map');
}

function syncAllProximityAuraBuffs(scene = null) {
  const sc = scene || getActiveScene();
  if (!sc || !Array.isArray(sc.tokens)) return;

  // 1. Strip all existing auto-managed [Aura] buffs
  sc.tokens.forEach(tok => {
    if (Array.isArray(tok.buffs)) {
      tok.buffs = tok.buffs.filter(b => !String(b).startsWith('[Aura] '));
    }
  });

  // 2. Re-apply active [Aura] buffs based on live token proximity
  const pEffects = Array.isArray(sc.persistentEffects) ? sc.persistentEffects : [];
  pEffects.forEach(pe => {
    if (pe.shape !== 'aura' || !pe.auraBuffLabel) return;
    let hx = pe.gx;
    let hy = pe.gy;
    let hostTok = null;
    if (pe.attachToTokenId) {
      hostTok = sc.tokens.find(t => t.id === pe.attachToTokenId);
      if (!hostTok || getTokenHealthMetrics(hostTok).curHp <= 0) return;
      hx = hostTok.gx;
      hy = hostTok.gy;
    }

    if (pe.affectsAllies && (Number(pe.radiusFt) || 0) > 0) {
      const radFt = Number(pe.radiusFt) || 5;
      sc.tokens.forEach(tok => {
        if (tok.role !== 'crawler') return;
        if (getTokenHealthMetrics(tok).curHp <= 0) return;
        const distFt = calcGridDistanceFt(hx, hy, tok.gx, tok.gy);
        if (distFt <= radFt) {
          tok.buffs = tok.buffs || [];
          if (!tok.buffs.includes(pe.auraBuffLabel)) tok.buffs.push(pe.auraBuffLabel);
        }
      });
    } else if (hostTok) {
      hostTok.buffs = hostTok.buffs || [];
      if (!hostTok.buffs.includes(pe.auraBuffLabel)) hostTok.buffs.push(pe.auraBuffLabel);
    }
  });
}

function executeCrawlerCancelEvadeOnHost(tokenId, fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;
  const curRound = Math.max(1, Number(appState?.round) || 1);
  if (tok.evadeDeclaredRound !== curRound) return;

  tok.evadeDeclaredRound = 0;
  if (tok.evadeSpentAp) {
    tok.currentAp = Math.min(tok.maxAp || 2, (tok.currentAp ?? 0) + 1);
    tok.evadeSpentAp = false;
  }
  commitStateChange();
  showVttToast(`↩️ ${tok.name} cancelled Evade (AP refunded).`);
}

function playerCancelEvadeAll() {
  const tok = getClaimedCrawlerToken();
  if (!tok) return;
  sendPlayerCancelEvadeToHost(tok.id);
  showVttToast('↩️ Cancelling Evade...');
}

// -------------------------------------------------------------------------
// 10. COMBAT OPENER SURPRISE CHECK (GM ONE-CLICK)
// -------------------------------------------------------------------------
function rollCombatSurpriseCheck() {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  if (!sc) return;
  const crawlers = (sc.tokens || []).filter(t => t.role === 'crawler' && getTokenHealthMetrics(t).curHp > 0);
  const mobs = (sc.tokens || []).filter(t => t.role !== 'crawler' && getTokenHealthMetrics(t).curHp > 0);
  if (crawlers.length === 0 || mobs.length === 0) {
    showVttToast('⚠️ Need at least 1 Crawler and 1 Mob on the map to roll Surprise.');
    return;
  }

  let highestDc = 12 + Math.max(1, Number(appState?.floor) || 1);
  let highestMobLvl = 1;
  mobs.forEach(m => {
    const dc = getFlatNumericDc(m.surprise || '12+F', 12);
    if (dc > highestDc) highestDc = dc;
    highestMobLvl = Math.max(highestMobLvl, Number(m.level) || 1);
  });

  const detProf = typeof getPartyMinimapDetectionProfile === 'function' ? getPartyMinimapDetectionProfile(sc) : { acuteEarsRank: 0, acuteEarsMaxLevelR10: 0 };
  const ambushImmuneR15 = detProf.acuteEarsRank >= 15;
  const ambushImmuneR10 = !ambushImmuneR15 && detProf.acuteEarsRank >= 10 && highestMobLvl < detProf.acuteEarsMaxLevelR10;

  if (ambushImmuneR15 || ambushImmuneR10) {
    const immuneReason = ambushImmuneR15
      ? 'Acute Ears Rank 15+ — Mobs cannot Ambush your party!'
      : `Acute Ears Rank 10+ — Lower-level Mobs (max Lvl ${highestMobLvl} < Crawler Lvl ${detProf.acuteEarsMaxLevelR10}) cannot Ambush your party!`;
    broadcastDiceRollEvent({
      title: `⚡ COMBAT OPENER — AMBUSH PREVENTED!`,
      subtitle: immuneReason,
      playerSubtitle: immuneReason,
      flareLevel: 'great',
      rolls: crawlers.map(c => ({
        targetName: `${c.iconSymbol || '⚔️'} ${c.name}`,
        formulaText: immuneReason,
        playerFormulaText: 'Protected by Acute Ears',
        resultLabel: 'AMBUSH IMMUNE',
        playerResultLabel: 'ALERT!',
        hit: false
      }))
    });
    commitStateChange();
    showVttToast(`👂 ${immuneReason}`);
    return;
  }

  const rolls = crawlers.map(c => {
    const nat = Math.floor(Math.random() * 20) + 1;
    const perc = (c.assignedSkills || []).find(s => /^perception$/i.test(String(s.name || '').trim()));
    const rank = perc ? (Number(perc.rank) || 1) : 0;
    const mod = getCrawlerDexMod(c);
    const total = nat + rank + mod;
    const out = evaluateDccCheckOutcome(nat, total, highestDc);
    return {
      targetName: `${c.iconSymbol || '⚔️'} ${c.name}`,
      formulaText: `d20 (${nat}) + ${rank ? `R${rank} Perc + ` : ''}${mod} (Dex) = ${total} vs Surprise DC ${highestDc}`,
      playerFormulaText: `d20 (${nat}) + ${rank ? `R${rank} Perc + ` : ''}${mod} (Dex) = ${total}`,
      resultLabel: out.success ? 'NOT SURPRISED' : 'SURPRISED!',
      playerResultLabel: out.success ? 'ALERT!' : 'SURPRISED!',
      hit: !out.success
    };
  });

  broadcastDiceRollEvent({
    title: `⚡ COMBAT OPENER — SURPRISE CHECK!`,
    subtitle: `Party vs. Highest Mob Surprise DC (${highestDc})`,
    playerSubtitle: `Ambush / Surprise Detection Check`,
    rolls
  });
  commitStateChange();
  showVttToast(`⚡ Rolled Surprise Check vs DC ${highestDc}!`);
}


// =========================================================================
// TRAP DETECTION, MULTI-CHECK DISARMING & TRIGGER RESOLUTION ENGINE
// =========================================================================
function getTrapStateFromObject(obj) {
  if (!obj) return null;
  const cat = String(obj.category || '').toLowerCase();
  const isTrapFlag = Boolean(obj.trapConfig && obj.trapConfig.isTrap) || /trap|hazard/i.test(cat);
  if (!isTrapFlag) return null;
  if (!obj.trapConfig || typeof obj.trapConfig !== 'object') {
    obj.trapConfig = {
      isTrap: true,
      armed: true,
      detected: !obj.hiddenFromPlayers,
      concealment: 'somethings_off', // 'obvious' | 'somethings_off' | 'totally_hidden'
      trapKind: 'damage', // 'damage' | 'debuff' | 'collapse' | 'teleport'
      checksRequired: 1,
      checksCompleted: 0,
      detectDcBase: 12,
      disarmDcBase: 13,
      hitDcBase: 12,
      damageExpr: 'Fd6',
      damageType: 'Piercing',
      applyDebuff: '',
      collapseDrainHours: 0,
      teleportAnchorGx: null,
      teleportAnchorGy: null,
      aoeFt: 0
    };
  }
  const tc = obj.trapConfig;
  if (typeof tc.armed !== 'boolean') tc.armed = true;
  if (typeof tc.detected !== 'boolean') tc.detected = !obj.hiddenFromPlayers;
  if (!tc.concealment) tc.concealment = 'somethings_off';
  if (!tc.trapKind) tc.trapKind = 'damage';
  tc.checksRequired = Math.max(1, Math.min(6, Number(tc.checksRequired) || 1));
  tc.checksCompleted = Math.max(0, Math.min(tc.checksRequired, Number(tc.checksCompleted) || 0));
  return tc;
}

function getTrapScaledDc(baseDc, extraBonus = 0) {
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  return Math.max(5, (Number(baseDc) || 12) + floorNum + (Number(extraBonus) || 0));
}

function resolveTrapFloorDamageExpr(rawExpr) {
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const expr = String(rawExpr || 'Fd6').trim();
  return expr.replace(/F(?=\s*d\d+)/gi, String(floorNum)).replace(/F/gi, String(floorNum));
}

function getBestTrapScoutInParty(scene, tok, rangeFt = 35) {
  if (!scene || !tok) return null;
  const crawlers = (scene.tokens || []).filter(t => t.role === 'crawler' && getTokenHealthMetrics(t).curHp > 0);
  let best = tok;
  let bestScore = -999;
  crawlers.forEach(c => {
    if (calcGridDistanceFt(c.gx, c.gy, tok.gx, tok.gy) > rangeFt) return;
    const r = Math.max(
      getCrawlerSkillRank(c, /^detect\s*trap$/i),
      getCrawlerSkillRank(c, /^trap\s*detection$/i),
      getCrawlerSkillRank(c, /^find\s*trap$/i),
      getCrawlerSkillRank(c, /^perception$/i)
    );
    const scVal = r * 2 + getCrawlerStatMod(c, 'Int');
    if (scVal > bestScore) {
      bestScore = scVal;
      best = c;
    }
  });
  return best;
}

function findNearbyTrapsForToken(tok, scene, maxRangeFt = 30, armedOnly = false) {
  if (!tok || !scene) return [];
  return (scene.mapObjects || []).filter(obj => {
    const tc = getTrapStateFromObject(obj);
    if (!tc) return false;
    if (armedOnly && !tc.armed) return false;
    const distFt = calcGridDistanceFt(tok.gx, tok.gy, obj.gx, obj.gy);
    return distFt <= maxRangeFt;
  });
}

function executeTrapDetectionOnHost(tokenId, fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok || !sc) return;

  const detTrapRank = getCrawlerSkillRank(tok, /^detect\s*trap$/i);
  const trapDetRank = getCrawlerSkillRank(tok, /^trap\s*detection$/i);
  const findTrapRank = getCrawlerSkillRank(tok, /^find\s*trap$/i);
  const percRank = getCrawlerSkillRank(tok, /^perception$/i);
  const bonusRank = Math.max(detTrapRank, trapDetRank, findTrapRank, percRank);
  const mod = getCrawlerStatMod(tok, 'Int');
  const rangeFt = 30 + (bonusRank >= 5 ? 5 : 0);

  const traps = findNearbyTrapsForToken(tok, sc, rangeFt, false);
  if (traps.length === 0) {
    showVttToast(`🔍 ${tok.name} scanned within ${rangeFt}ft — no traps or hazards present.`);
    return;
  }

  // Book rule: Single point-crawler check (warn if another nearby crawler has a significantly better check)
  const bestScout = getBestTrapScoutInParty(sc, tok, 30);
  const scoutHint = (bestScout && bestScout.id !== tok.id) ? ` (Tip: ${bestScout.name} is the party's top trap scout)` : '';

  const nat = Math.floor(Math.random() * 20) + 1;
  const total = nat + bonusRank + mod;
  const skillLabel = detTrapRank > 0 ? `R${detTrapRank} Detect Trap`
    : (trapDetRank > 0 ? `R${trapDetRank} Trap Det`
    : (findTrapRank > 0 ? `R${findTrapRank} Find Trap`
    : (percRank > 0 ? `R${percRank} Perc` : 'Untrained')));
  const rolls = [];
  let newlyRevealed = 0;

  traps.forEach(obj => {
    const tc = getTrapStateFromObject(obj);
    const isMagicTrap = /rune|arcane|magic|ward/i.test(`${obj.name || ''} ${obj.notes || ''}`);
    const canSpotMagic = !isMagicTrap || Math.max(detTrapRank, trapDetRank) >= 5;
    const concealBonus = tc.concealment === 'obvious' ? -4 : 0;
    const dc = getTrapScaledDc(tc.detectDcBase || 12, concealBonus);
    const out = evaluateDccCheckOutcome(nat, total, dc);

    // Book rule: Obvious = easy/auto-notice on any non-nat-1; Something's Off = Standard Success; Totally Hidden = Amazing Success+
    const meetsConcealTier = tc.concealment === 'totally_hidden'
      ? (out.crit || out.amazing)
      : (tc.concealment === 'obvious' ? (nat !== 1 && (out.success || bonusRank > 0)) : out.success);

    const spotted = tc.detected || (canSpotMagic && meetsConcealTier);
    if (spotted) {
      if (!tc.detected) {
        tc.detected = true;
        obj.hiddenFromPlayers = false;
        newlyRevealed++;
      }
      if ((meetsConcealTier || tc.detected) && typeof sendPrivateAlertToCrawler === 'function') {
        const disarmDc = getTrapScaledDc(tc.disarmDcBase || 13);
        const hitDc = getTrapScaledDc(tc.hitDcBase || 12);
        const resolvedDmg = resolveTrapFloorDamageExpr(tc.damageExpr || 'Fd6');
        const kindSummary = tc.trapKind === 'teleport'
          ? `Teleport Trap → Anchor (${tc.teleportAnchorGx ?? '?'}, ${tc.teleportAnchorGy ?? '?'})`
          : (tc.trapKind === 'collapse'
            ? `Collapse Clock Drain (-${tc.collapseDrainHours || 2}h)`
            : `${resolvedDmg} ${tc.damageType || ''}${tc.applyDebuff ? ` + ${tc.applyDebuff}` : ''}`);
        const bypassTip = (out.crit || out.amazing)
          ? ' • Amazing Insight: Trigger mechanism mapped (+2 tactical edge)!'
          : '';
        sendPrivateAlertToCrawler(
          tok.id,
          `${obj.iconSymbol || '⚠️'} Trap Spotted: ${obj.name}`,
          `[${tc.concealment.replace('_', ' ').toUpperCase()}] at (${obj.gx}, ${obj.gy}) • Disarm: ${tc.checksCompleted}/${tc.checksRequired} checks (DC ${disarmDc}) • Hit DC ${hitDc} (${kindSummary})${bypassTip}`,
          tc.armed ? '🔧 Attempt Disarm' : '',
          tc.armed ? 'disarm_trap' : '',
          obj.id
        );
      }
    }

    const tierReqLabel = tc.concealment === 'totally_hidden' ? ' [Needs Amazing+]' : '';
    rolls.push({
      targetName: `${obj.iconSymbol || '⚠️'} ${spotted ? obj.name : 'Concealed Mechanism'}`,
      formulaText: !canSpotMagic
        ? `Magic trap requires Rank 5+ Detect Trap`
        : `d20 (${nat}) + ${bonusRank} (${skillLabel}) + ${mod} (Int) = ${total} vs Detect DC ${dc}${tierReqLabel}`,
      playerFormulaText: !canSpotMagic
        ? `Magic trap requires Rank 5+ Detect Trap`
        : `d20 (${nat}) + ${bonusRank} (${skillLabel}) + ${mod} (Int) = ${total}`,
      resultLabel: spotted ? `DETECTED${!tc.armed ? ' (DISARMED)' : ''}` : `UNDETECTED (${out.tier})`,
      playerResultLabel: spotted ? `DETECTED${!tc.armed ? ' (DISARMED)' : ''}` : `UNDETECTED`,
      hit: !spotted
    });
  });

  broadcastDiceRollEvent({
    title: `🕵️ ${tok.iconSymbol || '⚔️'} ${tok.name} — TRAP DETECTION`,
    subtitle: `Point-Crawler Check (${rangeFt}ft)${scoutHint} • Total ${total}`,
    playerSubtitle: `Trap Detection (${rangeFt}ft): Total ${total}`,
    flareLevel: nat === 20 ? 'crit' : (newlyRevealed > 0 ? 'great' : 'standard'),
    rolls
  });
  commitStateChange();
  showVttToast(`🕵️ ${tok.name} Trap Detection (${total}): ${newlyRevealed > 0 ? `Revealed ${newlyRevealed} trap(s)!` : 'Scan complete.'}`);
}

function executeDisarmTrapOnHost(tokenId, trapObjId = '', fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok || !sc) return;

  const adjTraps = findNearbyTrapsForToken(tok, sc, 10, true);
  const targetObj = (trapObjId ? adjTraps.find(t => t.id === trapObjId) : null) || adjTraps[0];
  if (!targetObj) {
    showVttToast(`🔧 ${tok.name} must be adjacent (<=10ft) to an armed trap to disarm it!`);
    return;
  }

  const tc = getTrapStateFromObject(targetObj);
  const disarmRank = getCrawlerSkillRank(tok, /^disarm\s*trap$/i);
  const backfireRank = getCrawlerSkillRank(tok, /^backfire$/i);
  const trapEngRank = getCrawlerSkillRank(tok, /^trap\s*engineer$/i);
  const detectRank = Math.max(
    getCrawlerSkillRank(tok, /^detect\s*trap$/i),
    getCrawlerSkillRank(tok, /^trap\s*detection$/i)
  );
  const effectiveRank = Math.max(disarmRank, backfireRank, trapEngRank);
  const skillLabel = backfireRank >= effectiveRank && backfireRank > 0 ? `R${backfireRank} Backfire`
    : (trapEngRank >= effectiveRank && trapEngRank > 0 ? `R${trapEngRank} Trap Eng`
    : (disarmRank > 0 ? `R${disarmRank} Disarm Trap` : 'Untrained'));

  // Book rule: Other adjacent crawlers can Help the disarmer (+2 per adjacent helper, max +4)
  const helpers = (sc.tokens || []).filter(c =>
    c.role === 'crawler' &&
    c.id !== tok.id &&
    getTokenHealthMetrics(c).curHp > 0 &&
    calcGridDistanceFt(c.gx, c.gy, targetObj.gx, targetObj.gy) <= 10
  );
  const helpBonus = Math.min(4, helpers.length * 2);
  const synergyBonus = (tc.detected && detectRank >= 15) ? 3 : 0;
  const mod = getCrawlerStatMod(tok, 'Dex');
  const dc = getTrapScaledDc(tc.disarmDcBase || 13);

  const useAdv = effectiveRank >= 15;
  const d20 = typeof rollD20WithMode === 'function'
    ? rollD20WithMode(useAdv ? 'adv' : 'normal')
    : { nat: Math.floor(Math.random() * 20) + 1, rollText: '' };
  const nat = d20.nat;
  const total = nat + effectiveRank + mod + synergyBonus + helpBonus;
  const out = evaluateDccCheckOutcome(nat, total, dc);

  if (out.success) {
    const stepGain = (out.crit || out.amazing) ? 2 : 1;
    tc.checksCompleted = Math.min(tc.checksRequired, (tc.checksCompleted || 0) + stepGain);
    tc.detected = true;
    targetObj.hiddenFromPlayers = false;

    const fullyDisarmed = tc.checksCompleted >= tc.checksRequired;
    if (fullyDisarmed) {
      tc.armed = false;
      if (effectiveRank >= 10 || backfireRank > 0) {
        tok.inventory = tok.inventory || [];
        tok.inventory.unshift({
          id: 'inv_parts_' + Date.now(),
          name: `${targetObj.name} Mechanism`,
          icon: '⚙️',
          category: 'Gear',
          qty: 1,
          notes: 'Neutralized/deconstructed trap trigger mechanism.'
        });
      }
    } else if (typeof sendPrivateAlertToCrawler === 'function') {
      sendPrivateAlertToCrawler(
        tok.id,
        `🔧 Complex Trap Progress: ${targetObj.name}`,
        `Disarm stage ${tc.checksCompleted}/${tc.checksRequired} complete! Keep working the mechanism before it triggers.`,
        '🔧 Continue Disarming',
        'disarm_trap',
        targetObj.id
      );
    }

    const helpText = helpBonus > 0 ? ` +${helpBonus} Help (${helpers.map(h => h.name).join(', ')})` : '';
    const progressLabel = fullyDisarmed
      ? `DISARMED (${tc.checksCompleted}/${tc.checksRequired})`
      : `STAGE ${tc.checksCompleted}/${tc.checksRequired} (${out.tier})`;
    broadcastDiceRollEvent({
      title: `🔧 ${tok.iconSymbol || '⚔️'} ${tok.name} — ${fullyDisarmed ? 'TRAP DISARMED!' : 'DISARM PROGRESS'}`,
      subtitle: `${d20.rollText || `d20 (${nat})`} + ${skillLabel} + ${mod} (Dex)${helpText}${synergyBonus ? ` +${synergyBonus} DetR15` : ''} = ${total} vs DC ${dc}`,
      playerSubtitle: `${fullyDisarmed ? 'Trap Disarmed' : `Disarm Progress ${tc.checksCompleted}/${tc.checksRequired}`}: Total ${total}`,
      flareLevel: out.crit ? 'crit' : (out.amazing ? 'great' : 'standard'),
      rolls: [{
        targetName: `${targetObj.iconSymbol || '⚠️'} ${targetObj.name}`,
        formulaText: fullyDisarmed
          ? `All ${tc.checksRequired} check(s) completed${(effectiveRank >= 10 || backfireRank > 0) ? ' • Salvaged Trap Mechanism!' : ''}`
          : `Completed ${tc.checksCompleted} of ${tc.checksRequired} required disarm checks`,
        playerFormulaText: fullyDisarmed
          ? `All ${tc.checksRequired} check(s) completed`
          : `Completed ${tc.checksCompleted} of ${tc.checksRequired} required disarm checks`,
        resultLabel: progressLabel,
        playerResultLabel: progressLabel,
        hit: false
      }]
    });
    commitStateChange();
    showVttToast(fullyDisarmed
      ? `🔧 ${tok.name} disarmed ${targetObj.name}!`
      : `🔧 ${tok.name} disarm progress: ${tc.checksCompleted}/${tc.checksRequired} checks!`);
    return;
  }

  // Book rule: Crawlers work through checks before arbitrary punishments—only Nat 1 or Major Fail (by >=5) springs the trap early
  const shouldSpring = out.critFail || out.majorFail || (dc - total) >= 6;
  broadcastDiceRollEvent({
    title: `🔧 ${tok.iconSymbol || '⚔️'} ${tok.name} — DISARM CHECK FAILED`,
    subtitle: `${d20.rollText || `d20 (${nat})`} + ${skillLabel} + ${mod} (Dex) = ${total} vs DC ${dc} (${tc.checksCompleted}/${tc.checksRequired})`,
    playerSubtitle: `Disarm Check Failed: Total ${total} (${out.tier})`,
    flareLevel: 'standard',
    rolls: [{
      targetName: `${targetObj.iconSymbol || '⚠️'} ${targetObj.name}`,
      formulaText: shouldSpring ? 'Catastrophic slip — trap sprang!' : `Check failed (${tc.checksCompleted}/${tc.checksRequired}), mechanism held steady.`,
      playerFormulaText: shouldSpring ? 'Catastrophic slip — trap sprang!' : `Check failed (${tc.checksCompleted}/${tc.checksRequired}), mechanism held steady.`,
      resultLabel: shouldSpring ? 'SPRUNG!' : `FAILED (${out.tier})`,
      playerResultLabel: shouldSpring ? 'SPRUNG!' : `FAILED (${out.tier})`,
      hit: shouldSpring
    }]
  });
  commitStateChange();
  if (shouldSpring) {
    executeSpringTrapOnHost(targetObj.id, tok.id, false);
  } else {
    showVttToast(`🔧 ${tok.name} failed disarm check (${total} vs DC ${dc}) — trap held.`);
  }
}

function executeSpringTrapOnHost(trapObjId, victimTokenId = '', fromRemotePlayer = false) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  if (!sc) return;
  const trapObj = (sc.mapObjects || []).find(o => o.id === trapObjId);
  if (!trapObj) return;
  const tc = getTrapStateFromObject(trapObj);
  if (!tc.armed) {
    showVttToast(`ℹ️ ${trapObj.name} is already disarmed.`);
    return;
  }

  const crawlers = (sc.tokens || []).filter(t => t.role === 'crawler' && getTokenHealthMetrics(t).curHp > 0);
  if (crawlers.length === 0) return;

  let primaryVictim = (victimTokenId ? crawlers.find(c => c.id === victimTokenId) : null)
    || crawlers.slice().sort((a, b) => calcGridDistanceFt(a.gx, a.gy, trapObj.gx, trapObj.gy) - calcGridDistanceFt(b.gx, b.gy, trapObj.gx, trapObj.gy))[0];

  const aoeFt = Math.max(0, Number(tc.aoeFt) || 0);
  const victims = aoeFt > 0
    ? crawlers.filter(c => calcGridDistanceFt(c.gx, c.gy, trapObj.gx, trapObj.gy) <= Math.max(5, aoeFt))
    : [primaryVictim];

  const hitDc = getTrapScaledDc(tc.hitDcBase || 12);
  const resolvedDmgExpr = resolveTrapFloorDamageExpr(tc.damageExpr || 'Fd6');
  const isDamageTrap = tc.trapKind === 'damage' || (tc.trapKind !== 'debuff' && tc.trapKind !== 'collapse' && tc.trapKind !== 'teleport');
  const baseDmg = isDamageTrap ? rollDccExpressionForCaster(resolvedDmgExpr, { stats: {} }) : 0;
  const rolls = [];
  let clockDrained = 0;

  victims.forEach(v => {
    const ev = rollCrawlerEvadeForMobAttack(v, hitDc);
    let dmg = baseDmg;
    let note = '';
    if (ev.success) {
      dmg = aoeFt > 0 ? Math.floor(baseDmg / 2) : 0;
      note = `Evade ${ev.total} vs Hit DC ${hitDc} (${ev.tier})${dmg > 0 ? ' → Half AoE dmg' : ' → Avoided!'}`;
    } else {
      note = `Failed Evade ${ev.total} vs Hit DC ${hitDc} (${ev.tier})`;
    }

    const net = Math.max(0, dmg - getEffectiveTokenDr(v));
    const pipOut = calculateWholePipDamageOutcome(v, net);
    if (pipOut.pipsDestroyed > 0) adjustTokenHealth(v.id, -pipOut.effectiveHpDamage);

    let extraTags = [];
    if (!ev.success && tc.applyDebuff) {
      v.statuses = v.statuses || [];
      if (!v.statuses.includes(tc.applyDebuff)) v.statuses.push(tc.applyDebuff);
      extraTags.push(`+${tc.applyDebuff}`);
    }

    // Teleport Trap: move victim to synced anchor coordinates if failed evade
    if (!ev.success && tc.trapKind === 'teleport' && Number.isFinite(Number(tc.teleportAnchorGx)) && Number.isFinite(Number(tc.teleportAnchorGy))) {
      v.gx = Number(tc.teleportAnchorGx);
      v.gy = Number(tc.teleportAnchorGy);
      extraTags.push(`Teleported → (${v.gx}, ${v.gy})`);
    }

    // Collapse Clock Drain Trap: subtract hours from Time to Floor Collapse
    if (!ev.success && (tc.trapKind === 'collapse' || (Number(tc.collapseDrainHours) || 0) > 0)) {
      const drainHrs = Math.max(1, Number(tc.collapseDrainHours) || 2);
      if (clockDrained === 0 && typeof adjustCollapseHours === 'function') {
        adjustCollapseHours(-drainHrs);
        clockDrained = drainHrs;
      }
      extraTags.push(`-${drainHrs}h Collapse Clock`);
    }

    const extraSuffix = extraTags.length ? ` • ${extraTags.join(', ')}` : '';
    const resTxt = pipOut.pipsDestroyed > 0
      ? `${pipOut.effectiveHpDamage} ${tc.damageType || 'Dmg'} (${pipOut.pipsDestroyed} Pip)${extraSuffix}`
      : (ev.success && dmg === 0 ? 'EVADED' : `${extraTags.join(', ') || '0 Pip'}`);

    rolls.push({
      targetName: `${v.iconSymbol || '⚔️'} ${v.name}`,
      formulaText: isDamageTrap ? `${note} • Raw ${baseDmg} (${resolvedDmgExpr} ${tc.damageType || 'Dmg'})` : note,
      playerFormulaText: isDamageTrap ? `${note} • Raw ${baseDmg} (${resolvedDmgExpr} ${tc.damageType || 'Dmg'})` : note,
      resultLabel: resTxt,
      playerResultLabel: resTxt,
      hit: !ev.success || dmg > 0
    });
  });

  tc.detected = true;
  trapObj.hiddenFromPlayers = false;
  tc.armed = false;

  broadcastDiceRollEvent({
    title: `${trapObj.iconSymbol || '⚠️'} TRAP SPRUNG — ${trapObj.name}`,
    subtitle: `Trap Hit DC: ${hitDc}${isDamageTrap ? ` • Roll: ${baseDmg} (${resolvedDmgExpr})` : ''}${clockDrained ? ` • -${clockDrained}h Collapse Clock` : ''}`,
    playerSubtitle: `${trapObj.name} sprung!`,
    rolls
  });
  commitStateChange();
  showVttToast(`⚠️ ${trapObj.name} sprung on ${victims.map(v => v.name).join(', ')}!`);
}

function triggerTrapAction(tokenId, trapActionKind, trapObjId = '') {
  const sc = getActiveScene();
  const tok = IS_PLAYER_WINDOW
    ? getClaimedCrawlerToken()
    : (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;

  if (trapActionKind === 'detect') {
    if (IS_PLAYER_WINDOW) {
      sendPlayerCombatActionToHost(tok.id, 'trap_detect', trapObjId);
      showVttToast(`🕵️ ${tok.name} scanning for traps...`);
    } else {
      executeTrapDetectionOnHost(tok.id, false);
    }
  } else if (trapActionKind === 'disarm') {
    if (IS_PLAYER_WINDOW) {
      sendPlayerCombatActionToHost(tok.id, 'trap_disarm', trapObjId);
      showVttToast(`🔧 ${tok.name} attempting to disarm trap...`);
    } else {
      executeDisarmTrapOnHost(tok.id, trapObjId, false);
    }
  } else if (trapActionKind === 'spring') {
    if (!IS_PLAYER_WINDOW) {
      executeSpringTrapOnHost(trapObjId, tok.id, false);
    }
  }
}

let privateAlertDismissTimer = null;

function dismissPrivateCrawlerAlert() {
  if (privateAlertDismissTimer) {
    clearTimeout(privateAlertDismissTimer);
    privateAlertDismissTimer = null;
  }
  const el = document.getElementById('privateCrawlerAlertPopup');
  if (el) el.classList.add('hidden');
}

function runPrivateAlertAction(actionKind, actionArg = '') {
  dismissPrivateCrawlerAlert();
  const tok = IS_PLAYER_WINDOW
    ? (typeof getClaimedCrawlerToken === 'function' ? getClaimedCrawlerToken() : null)
    : ((getActiveScene()?.tokens || []).find(t => t.id === uiState.selectedTokenId));
  if (!tok) return;
  if (actionKind === 'disarm_trap') {
    triggerTrapAction(tok.id, 'disarm', actionArg);
  } else if (actionKind === 'detect_traps') {
    triggerTrapAction(tok.id, 'detect', actionArg);
  }
}

function showPrivateCrawlerAlertPopup(payload) {
  const el = document.getElementById('privateCrawlerAlertPopup');
  const titleEl = document.getElementById('privateCrawlerAlertTitle');
  const bodyEl = document.getElementById('privateCrawlerAlertBody');
  const actEl = document.getElementById('privateCrawlerAlertActions');
  if (!el || !titleEl || !bodyEl) return;

  titleEl.textContent = payload.title || 'Trap Intel';
  bodyEl.textContent = payload.body || '';
  if (actEl) {
    if (payload.actionLabel && payload.actionKind) {
      actEl.innerHTML = `<button type="button" onclick="runPrivateAlertAction('${escapeHtmlAttr(payload.actionKind)}', '${escapeHtmlAttr(payload.actionArg || '')}')" class="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] shadow transition">${escapeHtmlAttr(payload.actionLabel)}</button>`;
    } else {
      actEl.innerHTML = '';
    }
  }
  el.classList.remove('hidden');
  if (privateAlertDismissTimer) clearTimeout(privateAlertDismissTimer);
  privateAlertDismissTimer = setTimeout(() => {
    dismissPrivateCrawlerAlert();
  }, 8500);
}

