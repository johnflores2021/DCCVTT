// =========================================================================
// CRAWLER ADVANCEMENT ENGINE (LEVELS, STAT POINTS, SKILL-UPS & GRINDING)
// DCC Rulebook Chapter 3 — Pages 169–170
// =========================================================================

const DCC_BOSS_LEVEL_REWARDS = [
  { id: 'neighborhood', label: 'Neighborhood Boss', levels: 1 },
  { id: 'borough', label: 'Borough Boss', levels: 2 },
  { id: 'city', label: 'City Boss', levels: 3 },
  { id: 'province', label: 'Province Boss', levels: 4 },
  { id: 'country', label: 'Country Boss', levels: 5 },
  { id: 'floor', label: 'Floor Boss', levels: 6 }
];

let gmAdvancementState = {
  activeTab: 'milestones', // 'milestones' | 'grinding'
  selectedCrawlerId: '',
  grindHours: 5,
  grindSkillId: '',
  deductCollapseClock: true,
  lastLog: []
};

function getCrawlerNumericStat(tok, statKey) {
  const raw = tok?.stats?.[statKey] ?? '10';
  const m = String(raw).match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 10;
}

function awardLevelsToCrawler(tok, levelsGained, reason = '') {
  if (!tok || tok.role !== 'crawler') return { oldLvl: 1, newLvl: 1, statPtsAdded: 0 };
  const add = Math.max(0, Number(levelsGained) || 0);
  const oldLvl = Math.max(1, Number(tok.level) || 1);
  const newLvl = Math.min(250, oldLvl + add);
  const actualGain = newLvl - oldLvl;
  tok.level = newLvl;

  // Rulebook p. 169: On Floor 3 or lower, each Level gained grants +3 Stat points to assign in a saferoom.
  // On Tutorial Floors (Floor 1-2), track tutorial levels so they can be unlocked upon reaching Floor 3.
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  let statPtsAdded = 0;
  if (floorNum >= 3 && actualGain > 0) {
    statPtsAdded = actualGain * 3;
    tok.unspentStatPoints = Math.max(0, Number(tok.unspentStatPoints) || 0) + statPtsAdded;
  }
  return { oldLvl, newLvl, actualGain, statPtsAdded, reason };
}

function unlockTutorialFloor3StatPoints(crawlerId) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === crawlerId && t.role === 'crawler');
  if (!tok) return;
  if (tok.tutorialStatsUnlocked) {
    showVttToast(`⚠️ ${tok.name} already unlocked Tutorial Floor Stat Points.`);
    return;
  }
  const gainedLvls = Math.max(0, (Number(tok.level) || 1) - 1);
  if (gainedLvls === 0) {
    showVttToast(`${tok.name} is Level 1 (0 gained Levels to convert).`);
    return;
  }
  const pts = gainedLvls * 3;
  tok.unspentStatPoints = Math.max(0, Number(tok.unspentStatPoints) || 0) + pts;
  tok.tutorialStatsUnlocked = true;
  commitStateChange();
  renderGmAdvancementModal();
  showVttToast(`⭐ ${tok.name} unlocked +${pts} Stat Points (${gainedLvls} Tutorial Levels × 3)!`);
}

function spendCrawlerStatPointOnHost(tokenId, statKey) {
  if (IS_PLAYER_WINDOW) return;
  const validKeys = ['Str', 'Int', 'Con', 'Dex', 'Cha'];
  if (!validKeys.includes(statKey)) return;
  const sc = getActiveScene();
  const tok = (sc?.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;
  const avail = Math.max(0, Number(tok.unspentStatPoints) || 0);
  if (avail <= 0) {
    showVttToast(`⚠️ ${tok.name} has no unspent Stat points.`);
    return;
  }

  const oldScore = getCrawlerNumericStat(tok, statKey);
  const newScore = oldScore + 1;
  tok.stats = tok.stats || normalizeStatsObjectToDcc({});
  tok.stats[statKey] = formatDccStatDisplay(newScore);
  tok.unspentStatPoints = avail - 1;

  // Recalculate derived HP/Pip if Con increased, and Evade if Dex increased
  if (statKey === 'Con') {
    const oldHpPerPip = Math.max(1, Number(tok.hpPerPip) || getDccStatModifierFromScore(oldScore));
    const newHpPerPip = getCrawlerConModHpPerPip(tok);
    tok.hpPerPip = newHpPerPip;
    if (newHpPerPip > oldHpPerPip) {
      const filled = Math.max(0, Number(tok.currentPips) || 10);
      tok.currentHp = filled * newHpPerPip;
    }
  }
  if (statKey === 'Dex') {
    tok.evade = getEffectiveEvadeDisplay(tok);
  }

  commitStateChange();
  showVttToast(`📈 ${tok.name}: ${statKey} → ${tok.stats[statKey]} (${tok.unspentStatPoints} pts left)`);
}

function playerSpendStatPoint(statKey) {
  const tok = getClaimedCrawlerToken();
  if (!tok || (Number(tok.unspentStatPoints) || 0) <= 0) return;
  sendPlayerSpendStatPointToHost(tok.id, statKey);
  showVttToast(`📈 Assigning +1 to ${statKey}...`);
}

function toggleSkillAdvancementMark(tokenId, entryId) {
  if (IS_PLAYER_WINDOW) return;
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;
  const item = (tok.assignedSkills || []).find(s => s.id === entryId);
  if (!item) return;
  item.markedForAdvancement = !item.markedForAdvancement;
  commitStateChange();
}

function rollSingleSkillAdvancementCheck(tok, skillEntry, applyDebuffPenalty = false) {
  const curRank = Math.max(1, Number(skillEntry.rank) || 1);
  if (curRank >= 15) {
    return {
      skillName: skillEntry.name,
      curRank,
      newRank: curRank,
      roll: null,
      succeeded: false,
      note: 'Already at Rank 15 Advancement Cap'
    };
  }
  const sts = tok.statuses || [];
  const hasDisadv = applyDebuffPenalty && sts.some(s => /(fatigu|shit-?faced|stiff\s*legs|blind)/i.test(String(s)));
  let checkPen = 0;
  if (applyDebuffPenalty) {
    sts.forEach(s => {
      const str = String(s);
      if (/fatigu|sore\s*as\s*shit/i.test(str)) checkPen -= 1;
      if (/long-?term\s*minor\s*injury|^minor\s*injury$/i.test(str)) checkPen -= 2;
      if (/long-?term\s*major\s*injury|^major\s*injury$/i.test(str)) checkPen -= 5;
    });
  }
  let roll = Math.floor(Math.random() * 20) + 1;
  let rollText = `1d20 (${roll})`;
  if (hasDisadv) {
    const r2 = Math.floor(Math.random() * 20) + 1;
    const low = Math.min(roll, r2);
    rollText = `Disadv [${roll}, ${r2}] → ${low}`;
    roll = low;
  }
  if (checkPen !== 0) {
    rollText = `${rollText} ${checkPen}`;
  }
  const succeeded = (roll + checkPen) >= curRank;
  let newRank = curRank;
  if (succeeded) {
    newRank = Math.min(15, curRank + 1);
    skillEntry.rank = newRank;
  }
  return {
    skillName: skillEntry.name,
    curRank,
    newRank,
    roll,
    rollText,
    succeeded,
    note: succeeded ? `RANK UP! R${curRank} → R${newRank}` : `No change (needed ≥ ${curRank})`
  };
}

function runPartySkillAdvancementChecks(mode = 'two_hour') {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  if (crawlers.length === 0) {
    showVttToast('⚠️ No crawlers deployed on the map.');
    return;
  }

  const isTwoHour = mode === 'two_hour';
  const broadcastRolls = [];
  const logLines = [];

  crawlers.forEach(c => {
    const eligibleSkills = (c.assignedSkills || []).filter(sk => {
      if (!sk.markedForAdvancement) return false;
      const r = Math.max(1, Number(sk.rank) || 1);
      return isTwoHour ? (r <= 4) : (r >= 5);
    });

    const skResults = [];
    eligibleSkills.forEach(sk => {
      const res = rollSingleSkillAdvancementCheck(c, sk, false);
      sk.markedForAdvancement = false;
      skResults.push(`${sk.name} [${res.rollText} vs ${res.curRank}]: ${res.succeeded ? `⬆ R${res.newRank}` : '—'}`);
    });

    if (eligibleSkills.length > 0) syncCrawlerPassiveSkillBuffs(c);

    const formulaText = skResults.length > 0
      ? skResults.join(' | ')
      : (isTwoHour ? 'No marked Skills at Rank ≤ 4' : 'No marked Skills at Rank ≥ 5');
    const resultLabel = eligibleSkills.length > 0 ? `${eligibleSkills.length} CHECKED` : 'NO MARKS';

    broadcastRolls.push({
      targetName: `${c.iconSymbol || '⚔️'} ${c.name}`,
      formulaText,
      playerFormulaText: formulaText,
      resultLabel,
      playerResultLabel: resultLabel,
      hit: false
    });
    logLines.push(`${c.name}: ${skResults.join(' • ') || 'No marked skills'}`);
  });

  gmAdvancementState.lastLog = logLines;
  broadcastDiceRollEvent({
    title: isTwoHour
      ? '⚔️ 2-Hour Skill Checks: Marked Skills (Rank ≤ 4)'
      : '🏰 End of Floor: Marked Skill Advancement Checks (Rank ≥ 5)',
    subtitle: 'Marked skills rolled (1d20 ≥ Current Rank) and marks cleared',
    playerSubtitle: 'Marked skills rolled (1d20 ≥ Current Rank) and marks cleared',
    flareLevel: 'great',
    rolls: broadcastRolls
  });

  commitStateChange();
  renderGmAdvancementModal();
  showVttToast(isTwoHour ? '⚔️ Resolved 2-Hour Marked Skill Checks (Rank ≤ 4)!' : '🏰 Resolved End-of-Floor Rank ≥ 5 Skill-Ups!');
}

function awardPartyLevelsMilestone(levels, titleLabel) {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  if (crawlers.length === 0) {
    showVttToast('⚠️ No crawlers on map.');
    return;
  }

  const broadcastRolls = [];
  const logLines = [];
  crawlers.forEach(c => {
    const r = awardLevelsToCrawler(c, levels, titleLabel);
    const statNote = r.statPtsAdded > 0
      ? `+${r.statPtsAdded} Stat Points (spend in Saferoom)`
      : (appState.floor < 3 ? 'Tutorial Floor (Stat points unlock on Floor 3)' : '');
    broadcastRolls.push({
      targetName: `${c.iconSymbol || '⚔️'} ${c.name}`,
      formulaText: `Level ${r.oldLvl} → ${r.newLvl}${statNote ? ` • ${statNote}` : ''}`,
      playerFormulaText: `Level ${r.oldLvl} → ${r.newLvl}${statNote ? ` • ${statNote}` : ''}`,
      resultLabel: `+${r.actualGain} LVL`,
      playerResultLabel: `+${r.actualGain} LVL`,
      hit: false
    });
    logLines.push(`${c.name}: Lvl ${r.oldLvl}→${r.newLvl}${r.statPtsAdded > 0 ? ` (+${r.statPtsAdded} pts)` : ''}`);
  });

  gmAdvancementState.lastLog = logLines;
  broadcastDiceRollEvent({
    title: `🏆 ${titleLabel}`,
    subtitle: `Each party crawler gained +${levels} Level${levels === 1 ? '' : 's'}!`,
    playerSubtitle: `Each party crawler gained +${levels} Level${levels === 1 ? '' : 's'}!`,
    flareLevel: levels >= 3 ? 'crit' : 'great',
    rolls: broadcastRolls
  });

  commitStateChange();
  renderGmAdvancementModal();
  showVttToast(`🏆 ${titleLabel}: Party gained +${levels} Level(s)!`);
}

function executeCrawlerKillerLevelAward() {
  if (IS_PLAYER_WINDOW) return;
  const sc = getActiveScene();
  const killer = (sc?.tokens || []).find(t => t.id === gmAdvancementState.selectedCrawlerId && t.role === 'crawler');
  const victimLvl = Math.max(1, Number(document.getElementById('gmAdvVictimLvlInput')?.value) || 1);
  if (!killer) {
    showVttToast('⚠️ Select the killer Crawler first.');
    return;
  }
  const killerLvl = Math.max(1, Number(killer.level) || 1);
  const d6 = Math.floor(Math.random() * 6) + 1;
  const diff = victimLvl - killerLvl;
  const gained = Math.max(1, Math.min(15, d6 + diff));
  const r = awardLevelsToCrawler(killer, gained, 'Crawler Killer');

  gmAdvancementState.lastLog = [
    `💀 ${killer.name} (Lvl ${killerLvl}) killed a Lvl ${victimLvl} Crawler: 1d6 (${d6}) ${diff >= 0 ? `+ ${diff}` : `- ${Math.abs(diff)}`} = +${gained} Levels → Lvl ${r.newLvl}`
  ];

  broadcastDiceRollEvent({
    title: `💀 PLAYER KILLER! ${killer.name} Gained +${gained} Levels`,
    subtitle: `1d6 (${d6}) ${diff >= 0 ? `+ ${diff}` : `- ${Math.abs(diff)}`} Level Diff = +${gained} Levels (Min 1, Max 15)`,
    playerSubtitle: `1d6 (${d6}) ${diff >= 0 ? `+ ${diff}` : `- ${Math.abs(diff)}`} Level Diff = +${gained} Levels`,
    flareLevel: 'crit',
    rolls: [{
      targetName: `${killer.iconSymbol || '⚔️'} ${killer.name}`,
      formulaText: `Level ${r.oldLvl} → ${r.newLvl}${r.statPtsAdded > 0 ? ` • +${r.statPtsAdded} Stat Pts` : ''}`,
      playerFormulaText: `Level ${r.oldLvl} → ${r.newLvl}${r.statPtsAdded > 0 ? ` • +${r.statPtsAdded} Stat Pts` : ''}`,
      resultLabel: `LVL ${r.newLvl}`,
      playerResultLabel: `LVL ${r.newLvl}`,
      hit: false
    }]
  });

  commitStateChange();
  renderGmAdvancementModal();
  showVttToast(`💀 ${killer.name} gained +${gained} Levels!`);
}

// =========================================================================
// GRINDING MONTAGE ENGINE (p. 170)
// =========================================================================
function detectCrawlerMapGrindBonus(tok) {
  const inv = Array.isArray(tok?.inventory) ? tok.inventory : [];
  if (inv.some(i => /borough\s*field\s*guide/i.test(String(i.name || '')))) {
    return { bonusHrs: 2, source: '🧭 Borough Field Guide (+2h on 5+h grind)' };
  }
  if (inv.some(i => /neighborhood\s*map/i.test(String(i.name || '')))) {
    return { bonusHrs: 1, source: '🗺️ Neighborhood Map (+1h on 5+h grind)' };
  }
  return { bonusHrs: 0, source: 'No Boss Map (standard grinding speed)' };
}

function resolveNeighborhoodGrindingComplication(nbId = '') {
  if (typeof CAMPAIGN_NEIGHBORHOODS === 'undefined' || !Array.isArray(CAMPAIGN_NEIGHBORHOODS) || CAMPAIGN_NEIGHBORHOODS.length === 0) {
    return null;
  }
  const nb = (nbId && CAMPAIGN_NEIGHBORHOODS.find(n => n.id === nbId)) || CAMPAIGN_NEIGHBORHOODS[0];
  const table = Array.isArray(nb?.grindingComplications) ? nb.grindingComplications : [];
  if (table.length === 0) return null;

  const d20 = Math.floor(Math.random() * 20) + 1;
  let matched = table.find(row => String(row.roll).trim() === String(d20));
  if (!matched) {
    matched = table.find(row => {
      const m = String(row.roll || '').trim().match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (!m) return false;
      const lo = parseInt(m[1], 10);
      const hi = parseInt(m[2], 10);
      return d20 >= lo && d20 <= hi;
    });
  }
  if (!matched) matched = table[table.length - 1];

  let text = String(matched.text || '');
  let extraCollapseMinutes = 0;

  // Roll 1d6 x 10% of remaining Floor Collapse clock if triggered (e.g. Prickly Pack Alleys roll 1)
  if (/1d6\s*[×x*]\s*10%/i.test(text)) {
    const d6 = Math.floor(Math.random() * 6) + 1;
    const pct = d6 * 10;
    const curMin = Math.max(0, Number(appState?.collapseRemainingMinutes) || 0);
    extraCollapseMinutes = Math.round(curMin * (pct / 100));
    if (extraCollapseMinutes > 0 && typeof recordCollapseClockShift === 'function') {
      recordCollapseClockShift(-extraCollapseMinutes, `Complication #${d20} (-${pct}%)`);
    } else if (extraCollapseMinutes > 0 && appState) {
      appState.collapseRemainingMinutes = Math.max(0, curMin - extraCollapseMinutes);
    }
    text = `${text} [Rolled 1d6 = ${d6} → -${pct}% Collapse Clock (${typeof formatCollapseClock === 'function' ? formatCollapseClock(extraCollapseMinutes) : `${extraCollapseMinutes}m`})]`;
  }

  return {
    neighborhoodId: nb.id,
    neighborhoodName: nb.name,
    roll: d20,
    slotLabel: matched.roll,
    text,
    extraCollapseMinutes,
    summaryLine: `🎲 Grinding Complication (${nb.name} • d20=${d20}): ${text}`
  };
}

function executeGrindForCrawlerOnHost(tokenId, declaredHoursRaw, skillId, deductClock = true, isPlayerSubmission = false) {
  if (IS_PLAYER_WINDOW) return null;
  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  const tok = crawlers.find(c => c.id === tokenId);
  if (!tok) {
    showVttToast('⚠️ Select a Crawler to grind.');
    return null;
  }

  const declaredHours = Math.max(1, Math.min(16, Number(declaredHoursRaw) || 5));
  const skillEntry = (tok.assignedSkills || []).find(s => s.id === skillId);
  if (!skillEntry) {
    showVttToast('⚠️ Select a learned Skill to accrue grinding hours.');
    return null;
  }

  const log = [];
  let productiveHours = Math.min(5, declaredHours);
  const extraHours = Math.max(0, declaredHours - 5);

  // Rulebook p. 170: Past 5 hours in a day, make an Unopposed Endurance Check per extra hour
  if (extraHours > 0) {
    const endSkill = (tok.assignedSkills || []).find(s => /^endurance$/i.test(String(s.name || '').trim()));
    const endRank = endSkill ? Math.max(1, Number(endSkill.rank) || 1) : 0;
    const conMod = getCrawlerConModHpPerPip(tok);
    const floorDc = 10 + Math.max(1, Number(appState?.floor) || 1);

    for (let h = 1; h <= extraHours; h++) {
      let nat = Math.floor(Math.random() * 20) + 1;
      let rollStr = `d20(${nat})`;
      if (endRank === 0) {
        const r2 = Math.floor(Math.random() * 20) + 1;
        rollStr = `R0 Disadv[${nat},${r2}]`;
        nat = Math.min(nat, r2);
      }
      const total = nat + endRank + conMod;
      if (total >= floorDc) {
        productiveHours += 1;
        log.push(`Hour ${5 + h} Endurance: ${rollStr} + R${endRank} + ${conMod} = ${total} vs DC ${floorDc} → ✓ Productive`);
      } else {
        tok.statuses = tok.statuses || [];
        if (!tok.statuses.includes('Fatigued')) tok.statuses.push('Fatigued');
        log.push(`Hour ${5 + h} Endurance: ${rollStr} + R${endRank} + ${conMod} = ${total} vs DC ${floorDc} → ✕ Unproductive (+Fatigued)`);
      }
    }
  }

  // Boss Map Bonus (if grinding 5+ hours)
  const mapBonus = detectCrawlerMapGrindBonus(tok);
  let bonusAdded = 0;
  if (declaredHours >= 5 && mapBonus.bonusHrs > 0) {
    bonusAdded = mapBonus.bonusHrs;
    productiveHours += bonusAdded;
    log.push(`${mapBonus.source} → Total Credit: ${productiveHours}h`);
  } else {
    log.push(`Total Productive Grinding Time: ${productiveHours}h`);
  }

  // 1. Skill Grinding Progress
  const skRank = Math.max(1, Number(skillEntry.rank) || 1);
  skillEntry.grindHours = (Number(skillEntry.grindHours) || 0) + productiveHours;
  let skillOutcomeText = `${skillEntry.name}: ${skillEntry.grindHours}/${skRank}h banked`;

  if (skillEntry.grindHours >= skRank) {
    const excess = skillEntry.grindHours - skRank;
    skillEntry.grindHours = 0;
    const res = rollSingleSkillAdvancementCheck(tok, skillEntry, true);
    syncCrawlerPassiveSkillBuffs(tok);
    skillOutcomeText = `${skillEntry.name} Grind Check [${res.rollText} vs R${res.curRank}]: ${res.note}${excess > 0 ? ` (${excess}h excess — apply to another skill)` : ''}`;
    log.push(`⚔️ ${skillOutcomeText}`);
  } else {
    log.push(`⏳ ${skillOutcomeText}`);
  }

  // 2. Leveling Up via Grinding (running total equal to current Level)
  tok.levelGrindHours = (Number(tok.levelGrindHours) || 0) + productiveHours;
  let lvlText = `Level Progress: ${tok.levelGrindHours}/${tok.level || 1}h`;
  const curLvl = Math.max(1, Number(tok.level) || 1);
  if (tok.levelGrindHours >= curLvl) {
    tok.levelGrindHours = 0;
    const allLevels = crawlers.map(c => Math.max(1, Number(c.level) || 1));
    const minLvl = Math.min(...allLevels);
    const countAtMin = allLevels.filter(l => l === minLvl).length;
    const isStrictlyLowest = crawlers.length > 1 && curLvl === minLvl && countAtMin === 1;
    const levelsGained = isStrictlyLowest ? (Math.floor(Math.random() * 2) + 1) : 1;
    const lvlRes = awardLevelsToCrawler(tok, levelsGained, 'Grinding');
    lvlText = `LEVEL UP! Lvl ${lvlRes.oldLvl} → ${lvlRes.newLvl}${isStrictlyLowest ? ` (Lowest-Lvl 1d2 = ${levelsGained})` : ''}${lvlRes.statPtsAdded > 0 ? ` • +${lvlRes.statPtsAdded} Stat Pts` : ''}`;
    log.push(`🏆 ${lvlText}`);
  } else {
    log.push(`📊 ${lvlText}`);
  }

  const complication = resolveNeighborhoodGrindingComplication(
    typeof gmCampaignUiState !== 'undefined' ? gmCampaignUiState.activeNeighborhoodId : ''
  );
  if (complication) {
    log.push(complication.summaryLine);
  }

  if (isPlayerSubmission && appState?.activeGrindSession?.active) {
    appState.activeGrindSession.submissions = appState.activeGrindSession.submissions || {};
    appState.activeGrindSession.submissions[tok.id] = {
      crawlerName: tok.name,
      iconSymbol: tok.iconSymbol || '⚔️',
      declaredHours,
      productiveHours,
      skillName: skillEntry.name,
      skillOutcomeText,
      lvlText,
      complication,
      log,
      submittedAt: Date.now()
    };
    // Deduct max declared hours once across the shared party grind session if enabled
    if (appState.activeGrindSession.deductCollapseClock) {
      const prevMax = Number(appState.activeGrindSession.maxHoursDeducted) || 0;
      if (declaredHours > prevMax) {
        const deltaH = declaredHours - prevMax;
        appState.activeGrindSession.maxHoursDeducted = declaredHours;
        if (typeof recordCollapseClockShift === 'function') {
          recordCollapseClockShift(-deltaH * 60, `${declaredHours}h Grind`);
        } else {
          appState.collapseRemainingMinutes = Math.max(0, (appState.collapseRemainingMinutes ?? 72 * 60) - deltaH * 60);
        }
      }
    }
  } else if (deductClock) {
    if (typeof recordCollapseClockShift === 'function') {
      recordCollapseClockShift(-declaredHours * 60, `${tok.name} ${declaredHours}h Grind`);
    } else {
      appState.collapseRemainingMinutes = Math.max(0, (appState.collapseRemainingMinutes ?? 72 * 60) - declaredHours * 60);
    }
  }

  gmAdvancementState.lastLog = log;
  const broadcastRolls = [{
    targetName: `${tok.iconSymbol || '⚔️'} ${tok.name}`,
    formulaText: lvlText,
    playerFormulaText: lvlText,
    resultLabel: `${productiveHours}H GRIND`,
    playerResultLabel: `${productiveHours}H GRIND`,
    hit: false
  }];
  if (complication) {
    broadcastRolls.push({
      targetName: `🎲 Complication (${complication.neighborhoodName} • d20=${complication.roll})`,
      formulaText: complication.text,
      playerFormulaText: complication.text,
      resultLabel: complication.roll <= 6 ? `COMPLICATION #${complication.roll}` : `ROLL ${complication.roll}`,
      playerResultLabel: complication.roll <= 6 ? `COMPLICATION #${complication.roll}` : `ROLL ${complication.roll}`,
      hit: complication.roll <= 6
    });
  }

  broadcastDiceRollEvent({
    title: `🏋️ ${tok.iconSymbol || '⚔️'} ${tok.name} Grinding Montage (${declaredHours}h${bonusAdded > 0 ? ` + ${bonusAdded}h Map` : ''})`,
    subtitle: complication ? `${skillOutcomeText} • Complication d20=${complication.roll}` : skillOutcomeText,
    playerSubtitle: complication ? `${skillOutcomeText} • Complication d20=${complication.roll}` : skillOutcomeText,
    flareLevel: /RANK UP|LEVEL UP/i.test(skillOutcomeText + ' ' + lvlText) ? 'great' : 'standard',
    rolls: broadcastRolls
  });

  commitStateChange();
  if (!IS_PLAYER_WINDOW) renderGmAdvancementModal();
  showVttToast(`🏋️ ${tok.name} completed ${declaredHours}h grind (${productiveHours}h credited)!`);
  return { declaredHours, productiveHours, skillOutcomeText, lvlText, log };
}

function executeCrawlerGrindMontage() {
  executeGrindForCrawlerOnHost(
    gmAdvancementState.selectedCrawlerId,
    gmAdvancementState.grindHours,
    gmAdvancementState.grindSkillId,
    gmAdvancementState.deductCollapseClock,
    false
  );
}

// =========================================================================
// INTERACTIVE PARTY GRINDING SESSION (GM INITIATES -> PLAYERS PICK IN HUD)
// =========================================================================
let playerGrindDraft = {
  sessionId: '',
  hours: 5,
  skillId: '',
  dismissedSessionId: ''
};

function startPartyGrindingSession() {
  if (IS_PLAYER_WINDOW || !appState) return;
  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  if (crawlers.length === 0) {
    showVttToast('⚠️ Deploy at least one Crawler on the map before starting a Party Grind.');
    return;
  }
  appState.activeGrindSession = {
    id: 'grind_' + Date.now(),
    active: true,
    startedAt: Date.now(),
    deductCollapseClock: Boolean(gmAdvancementState.deductCollapseClock),
    maxHoursDeducted: 0,
    submissions: {}
  };
  commitStateChange();
  renderGmAdvancementModal();
  showVttToast('🏋️ Party Grinding HUD opened on all Player screens!');
}

function closePartyGrindingSession() {
  if (IS_PLAYER_WINDOW || !appState) return;
  appState.activeGrindSession = null;
  commitStateChange();
  renderGmAdvancementModal();
  showVttToast('✅ Closed Party Grinding Session');
}

function updatePlayerGrindSliderLive(rawVal) {
  const hrs = Math.max(1, Math.min(12, Number(rawVal) || 5));
  playerGrindDraft.hours = hrs;
  const maxSliderH = 12;
  const pct = Math.round(((hrs - 1) / (maxSliderH - 1)) * 100);
  const safeStopPct = Math.round(((5 - 1) / (maxSliderH - 1)) * 100);
  const extraHrs = Math.max(0, hrs - 5);
  const isDanger = hrs > 5;
  const isAtLimit = hrs === 5;
  const activeHex = isDanger ? '#f43f5e' : isAtLimit ? '#f59e0b' : '#10b981';
  const glowRgba = isDanger ? 'rgba(244, 63, 94, 0.8)' : isAtLimit ? 'rgba(245, 158, 11, 0.75)' : 'rgba(16, 185, 129, 0.75)';
  const trackBg = isDanger
    ? `linear-gradient(90deg, #10b981 0%, #f59e0b ${safeStopPct}%, #f43f5e ${safeStopPct}%, #f43f5e ${pct}%, #1e293b ${pct}%, #1e293b 100%)`
    : `linear-gradient(90deg, #10b981 0%, ${activeHex} ${pct}%, #1e293b ${pct}%, #1e293b 100%)`;

  const slider = document.getElementById('playerGrindHoursSlider');
  if (slider) {
    slider.style.background = trackBg;
    slider.style.setProperty('--thumb-bg', activeHex);
    slider.style.setProperty('--thumb-glow', glowRgba);
  }

  const box = document.getElementById('playerGrindHoursBox');
  if (box) {
    box.className = `rounded-xl border p-2.5 space-y-2 transition-colors duration-200 ${isDanger ? 'bg-rose-950/25 border-rose-500/60' : isAtLimit ? 'bg-amber-950/20 border-amber-500/50' : 'bg-emerald-950/20 border-emerald-500/45'}`;
  }

  const badge = document.getElementById('playerGrindHoursBadge');
  if (badge) {
    const badgeCls = isDanger
      ? 'bg-rose-500/20 border-rose-400 text-rose-200 animate-pulse'
      : isAtLimit
        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
        : 'bg-emerald-500/20 border-emerald-400 text-emerald-200';
    const zoneTag = isDanger
      ? `⚠️ OVERTIME (+${extraHrs}h Endurance Risk)`
      : isAtLimit
        ? '🛡️ MAX SAFE LIMIT (5h)'
        : '✓ SAFE ZONE';
    badge.className = `px-2 py-0.5 rounded-lg border font-mono text-xs font-extrabold ${badgeCls}`;
    badge.textContent = `${hrs}h • ${zoneTag}`;
  }

  const warn = document.getElementById('playerGrindSafeWarning');
  if (warn) {
    warn.className = `text-[10px] font-mono ${isDanger ? 'text-rose-300 font-semibold' : 'text-emerald-300'}`;
    warn.textContent = isDanger
      ? `⚠️ ${extraHrs} hour(s) past the 5h daily safe limit — rolls Unopposed Endurance Checks per extra hour (fail = 0h + Fatigued).`
      : '✓ Within 5-hour safe daily limit (100% productive hours, no Endurance fatigue check required).';
  }

  const btn = document.getElementById('playerGrindSubmitBtn');
  if (btn) {
    btn.className = `w-full py-2 rounded-xl ${isDanger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'} font-extrabold text-xs shadow disabled:opacity-40 transition`;
    btn.textContent = `🏋️ Lock In & Roll ${hrs}h Grind${isDanger ? ' (Endurance Check!)' : '!'}`;
  }

  const summary = document.getElementById('playerGrindSummaryText');
  if (summary && summary.dataset.skillName) {
    const skName = summary.dataset.skillName;
    const skRank = Number(summary.dataset.skillRank) || 1;
    const mapBonusHrs = Number(summary.dataset.mapBonusHrs) || 0;
    const bonusStr = (hrs >= 5 && mapBonusHrs > 0) ? ` (+${mapBonusHrs}h Map Bonus)` : '';
    summary.innerHTML = `Training <b>${escapeHtmlAttr(skName)} (R${skRank})</b> for <b>${hrs}h</b>${bonusStr}. Reaching ${skRank}h triggers a <b>1d20 ≥ ${skRank}</b> Rank-Up Check!`;
  }
}

function submitPlayerGrindChoice() {
  if (!IS_PLAYER_WINDOW) return;
  const tok = getClaimedCrawlerToken();
  const sess = appState?.activeGrindSession;
  if (!tok || !sess || !sess.active) return;

  const hours = Math.max(1, Math.min(16, Number(playerGrindDraft.hours) || 5));
  const nonPassiveSkills = (tok.assignedSkills || []).filter(sk => {
    const full = (appState?.skills || []).find(s => s.id === sk.id) || sk;
    return normalizeAbilityEffectType(full.effectType) !== 'passive' && !/\bpassive\b/i.test(full.tags || '');
  });
  const chosenSkillId = playerGrindDraft.skillId && nonPassiveSkills.some(s => s.id === playerGrindDraft.skillId)
    ? playerGrindDraft.skillId
    : (nonPassiveSkills[0]?.id || '');

  if (!chosenSkillId) {
    showVttToast('⚠️ You have no non-passive learned skills to grind!');
    return;
  }

  sendPlayerGrindSubmitToHost(tok.id, sess.id, hours, chosenSkillId);
  showVttToast(`🏋️ Submitting ${hours}h grind for ${tok.name}...`);
}

function renderPlayerGrindingSessionModal() {
  const modal = document.getElementById('playerGrindSessionModal');
  const body = document.getElementById('playerGrindSessionBody');
  if (!modal || !body) return;

  if (!IS_PLAYER_WINDOW) {
    modal.classList.add('hidden');
    return;
  }

  const sess = appState?.activeGrindSession;
  if (!sess || !sess.active || playerGrindDraft.dismissedSessionId === sess.id) {
    modal.classList.add('hidden');
    return;
  }

  const tok = getClaimedCrawlerToken();
  modal.classList.remove('hidden');

  if (!tok) {
    body.innerHTML = `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-4 text-center space-y-2.5">
        <div class="text-2xl">🏋️</div>
        <div class="font-bold text-xs text-amber-300">The GM Initiated a Party Grinding Montage!</div>
        <p class="text-[11px] text-slate-300">Claim your Crawler first so you can choose how many hours to grind and which skill to train.</p>
        <button type="button" onclick="openPlayerClaimModal()" class="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs">🎭 Claim Crawler</button>
      </div>
    `;
    return;
  }

  if (playerGrindDraft.sessionId !== sess.id) {
    playerGrindDraft.sessionId = sess.id;
    playerGrindDraft.hours = 5;
    playerGrindDraft.skillId = '';
  }

  const existingSub = sess.submissions?.[tok.id] || null;
  const learnedSkills = (tok.assignedSkills || []).filter(sk => {
    const full = (appState?.skills || []).find(s => s.id === sk.id) || sk;
    return normalizeAbilityEffectType(full.effectType) !== 'passive' && !/\bpassive\b/i.test(full.tags || '');
  });

  if (!playerGrindDraft.skillId || !learnedSkills.some(s => s.id === playerGrindDraft.skillId)) {
    playerGrindDraft.skillId = learnedSkills[0]?.id || '';
  }

  const mapBonus = detectCrawlerMapGrindBonus(tok);
  const selectedSk = learnedSkills.find(s => s.id === playerGrindDraft.skillId) || null;
  const hrs = Math.max(1, Math.min(16, Number(playerGrindDraft.hours) || 5));
  const extraHrs = Math.max(0, hrs - 5);

  if (existingSub) {
    body.innerHTML = `
      <div class="bg-emerald-950/35 border border-emerald-500/50 rounded-xl p-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-xs text-emerald-300">✅ Grind Montage Complete — ${escapeHtmlAttr(tok.name)}</span>
          <span class="font-mono text-[10px] text-amber-300">${existingSub.declaredHours}h Declared • ${existingSub.productiveHours}h Credited</span>
        </div>
        <div class="bg-dungeon-950 border border-slate-800 rounded-lg p-2.5 space-y-1 font-mono text-[11px] text-slate-200">
          ${(existingSub.log || []).map(l => `<div>${escapeHtmlAttr(l)}</div>`).join('')}
        </div>
        <div class="flex items-center justify-between pt-1">
          <span class="text-[10px] font-mono text-slate-400">Waiting for GM to wrap up the montage...</span>
          <button type="button" onclick="playerGrindDraft.dismissedSessionId='${sess.id}'; renderPlayerGrindingSessionModal()" class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px]">Minimize</button>
        </div>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="bg-dungeon-950 border border-amber-500/40 rounded-xl p-3 space-y-3">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <div class="font-bold text-xs text-slate-100">${tok.iconSymbol || '⚔️'} ${escapeHtmlAttr(tok.name)} <span class="font-mono text-amber-300">Lvl ${tok.level || 1}</span></div>
          <div class="text-[10px] font-mono text-slate-400">Level Progress: <b class="text-cyan-300">${tok.levelGrindHours || 0}/${tok.level || 1}h</b> • ${mapBonus.source}</div>
        </div>
      </div>

      ${(() => {
        const maxSliderH = 12;
        const pct = Math.round(((Math.min(maxSliderH, hrs) - 1) / (maxSliderH - 1)) * 100);
        const safeStopPct = Math.round(((5 - 1) / (maxSliderH - 1)) * 100); // ~36.4% is 5h
        const isDanger = hrs > 5;
        const isAtLimit = hrs === 5;
        const activeHex = isDanger ? '#f43f5e' : isAtLimit ? '#f59e0b' : '#10b981';
        const glowRgba = isDanger ? 'rgba(244, 63, 94, 0.8)' : isAtLimit ? 'rgba(245, 158, 11, 0.75)' : 'rgba(16, 185, 129, 0.75)';
        const trackBg = isDanger
          ? `linear-gradient(90deg, #10b981 0%, #f59e0b ${safeStopPct}%, #f43f5e ${safeStopPct}%, #f43f5e ${pct}%, #1e293b ${pct}%, #1e293b 100%)`
          : `linear-gradient(90deg, #10b981 0%, ${activeHex} ${pct}%, #1e293b ${pct}%, #1e293b 100%)`;
        const badgeCls = isDanger
          ? 'bg-rose-500/20 border-rose-400 text-rose-200 animate-pulse'
          : isAtLimit
            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
            : 'bg-emerald-500/20 border-emerald-400 text-emerald-200';
        const zoneTag = isDanger
          ? `⚠️ OVERTIME (+${extraHrs}h Endurance Risk)`
          : isAtLimit
            ? '🛡️ MAX SAFE LIMIT (5h)'
            : '✓ SAFE ZONE';
        return `
          <div id="playerGrindHoursBox" class="rounded-xl border p-2.5 space-y-2 transition-colors duration-200 ${isDanger ? 'bg-rose-950/25 border-rose-500/60' : isAtLimit ? 'bg-amber-950/20 border-amber-500/50' : 'bg-emerald-950/20 border-emerald-500/45'}">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-mono uppercase text-slate-300 font-bold">1. Slide Hours to Grind</span>
              <span id="playerGrindHoursBadge" class="px-2 py-0.5 rounded-lg border font-mono text-xs font-extrabold ${badgeCls}">
                ${hrs}h • ${zoneTag}
              </span>
            </div>
            <div class="pt-1 pb-0.5">
              <input id="playerGrindHoursSlider" type="range" min="1" max="${maxSliderH}" step="1" value="${Math.min(maxSliderH, hrs)}"
                oninput="updatePlayerGrindSliderLive(this.value)"
                style="background: ${trackBg}; --thumb-bg: ${activeHex}; --thumb-glow: ${glowRgba};"
                class="grind-hours-slider w-full" />
              <div class="relative flex justify-between text-[9px] font-mono text-slate-400 mt-1.5 px-0.5 select-none">
                <span class="text-emerald-400 font-bold">1h</span>
                <span class="text-emerald-400">3h</span>
                <span class="text-amber-300 font-extrabold">5h Safe Cap</span>
                <span class="text-rose-400">8h</span>
                <span class="text-rose-400 font-bold">12h</span>
              </div>
            </div>
            <div id="playerGrindSafeWarning" class="text-[10px] font-mono ${isDanger ? 'text-rose-300 font-semibold' : 'text-emerald-300'}">
              ${isDanger
                ? `⚠️ ${extraHrs} hour(s) past the 5h daily safe limit — rolls Unopposed Endurance Checks per extra hour (fail = 0h + Fatigued).`
                : '✓ Within 5-hour safe daily limit (100% productive hours, no Endurance fatigue check required).'}
            </div>
          </div>
        `;
      })()}

      <div class="space-y-1.5">
        <span class="block text-[10px] font-mono uppercase text-cyan-300 font-bold">2. Choose Skill to Train</span>
        ${learnedSkills.length === 0
          ? '<div class="text-xs text-rose-300 italic">You have no active/non-passive learned skills to train.</div>'
          : `<div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
              ${learnedSkills.map(sk => {
                const isSel = sk.id === playerGrindDraft.skillId;
                const r = Math.max(1, Number(sk.rank) || 1);
                const banked = Number(sk.grindHours) || 0;
                return `
                  <button type="button" onclick="playerGrindDraft.skillId='${sk.id}'; renderPlayerGrindingSessionModal()" class="p-2 rounded-xl border text-left transition ${isSel ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100' : 'bg-dungeon-900 border-slate-800 text-slate-300 hover:border-slate-700'}">
                    <div class="font-bold text-[11px] truncate">${escapeHtmlAttr(sk.name)} <span class="font-mono text-amber-300">R${r}</span></div>
                    <div class="text-[9.5px] font-mono text-slate-400 mt-0.5">Progress: <b class="text-emerald-300">${banked}/${r}h</b> toward check</div>
                  </button>
                `;
              }).join('')}
            </div>`
        }
      </div>

      ${selectedSk ? `
        <div id="playerGrindSummaryText" data-skill-name="${escapeHtmlAttr(selectedSk.name)}" data-skill-rank="${selectedSk.rank || 1}" data-map-bonus-hrs="${mapBonus.bonusHrs || 0}" class="bg-dungeon-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-slate-300">
          Training <b>${escapeHtmlAttr(selectedSk.name)} (R${selectedSk.rank || 1})</b> for <b>${hrs}h</b>${hrs >= 5 && mapBonus.bonusHrs > 0 ? ` (+${mapBonus.bonusHrs}h Map Bonus)` : ''}. Reaching ${selectedSk.rank || 1}h triggers a <b>1d20 ≥ ${selectedSk.rank || 1}</b> Rank-Up Check!
        </div>
      ` : ''}

      <div class="flex items-center justify-end gap-2 pt-1">
        <button id="playerGrindSubmitBtn" type="button" ${learnedSkills.length === 0 ? 'disabled' : ''} onclick="submitPlayerGrindChoice()" class="w-full py-2 rounded-xl ${hrs > 5 ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'} font-extrabold text-xs shadow disabled:opacity-40 transition">
          🏋️ Lock In & Roll ${hrs}h Grind${hrs > 5 ? ' (Endurance Check!)' : '!'}
        </button>
      </div>
    </div>
  `;
}

// =========================================================================
// GM ADVANCEMENT & GRINDING MODAL UI
// =========================================================================
function openGmAdvancementModal(preselectCrawlerId = '') {
  if (IS_PLAYER_WINDOW) return;
  const modal = document.getElementById('gmAdvancementModal');
  if (!modal) return;
  const crawlers = (getActiveScene()?.tokens || []).filter(t => t.role === 'crawler');
  if (preselectCrawlerId) {
    gmAdvancementState.selectedCrawlerId = preselectCrawlerId;
  } else if (!crawlers.some(c => c.id === gmAdvancementState.selectedCrawlerId)) {
    gmAdvancementState.selectedCrawlerId = crawlers[0]?.id || '';
  }
  const sel = crawlers.find(c => c.id === gmAdvancementState.selectedCrawlerId);
  if (sel && (!gmAdvancementState.grindSkillId || !(sel.assignedSkills || []).some(s => s.id === gmAdvancementState.grindSkillId))) {
    gmAdvancementState.grindSkillId = (sel.assignedSkills || [])[0]?.id || '';
  }
  modal.classList.remove('hidden');
  renderGmAdvancementModal();
}

function closeGmAdvancementModal() {
  const modal = document.getElementById('gmAdvancementModal');
  if (modal) modal.classList.add('hidden');
}

function renderGmAdvancementModal() {
  const body = document.getElementById('gmAdvancementModalBody');
  if (!body || IS_PLAYER_WINDOW) return;

  const crawlers = (getActiveScene()?.tokens || []).filter(t => t.role === 'crawler');
  const selCrawler = crawlers.find(c => c.id === gmAdvancementState.selectedCrawlerId) || crawlers[0] || null;
  if (selCrawler) gmAdvancementState.selectedCrawlerId = selCrawler.id;

  const tab = gmAdvancementState.activeTab || 'milestones';
  const floorNum = Math.max(1, Number(appState?.floor) || 1);

  const tabsHtml = `
    <div class="grid grid-cols-2 gap-1.5">
      <button type="button" onclick="gmAdvancementState.activeTab='milestones'; renderGmAdvancementModal()" class="py-1.5 rounded-xl text-xs font-bold transition ${tab === 'milestones' ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🏆 Levels & Skill-Ups</button>
      <button type="button" onclick="gmAdvancementState.activeTab='grinding'; renderGmAdvancementModal()" class="py-1.5 rounded-xl text-xs font-bold transition ${tab === 'grinding' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🏋️ Grinding Montage</button>
    </div>
  `;

  let contentHtml = '';
  if (tab === 'milestones') {
    contentHtml = `
      <div class="bg-dungeon-950 border border-cyan-500/40 rounded-xl p-3 space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-cyan-300 uppercase text-[11px]">⏱️ Session & Floor Skill Advancement Checks</span>
          <span class="text-[10px] font-mono text-slate-400">Floor ${floorNum} • 1d20 ≥ Current Rank (Cap 15)</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button type="button" onclick="awardPartyLevelsMilestone(1, '2-Hour Play Milestone')" class="py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow transition">
            ⏱️ 2-Hour Level-Up (+1 Lvl)
          </button>
          <button type="button" onclick="runPartySkillAdvancementChecks('two_hour')" class="py-2 px-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs shadow transition">
            ⚔️ 2-Hour Skills (Roll R1–4 ★)
          </button>
          <button type="button" onclick="runPartySkillAdvancementChecks('end_floor')" class="py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow transition">
            🏰 End of Floor (Roll R5+ ★)
          </button>
        </div>
      </div>

      <div class="bg-dungeon-950 border border-amber-500/35 rounded-xl p-3 space-y-2">
        <div class="font-bold text-amber-300 uppercase text-[11px]">🏆 Quest & Boss Level Awards (Entire Party)</div>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" onclick="awardPartyLevelsMilestone(1, 'Quest Completed')" class="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 font-bold text-[11px]">📜 Quest Complete (+1 Lvl)</button>
          ${DCC_BOSS_LEVEL_REWARDS.map(b => `
            <button type="button" onclick="awardPartyLevelsMilestone(${b.levels}, '${b.label} Defeated')" class="px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-bold text-[10.5px]">💀 ${b.label} (+${b.levels})</button>
          `).join('')}
        </div>
      </div>

      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="font-bold text-slate-200 uppercase text-[11px]">👥 Party Advancement Overview</div>
        <div class="space-y-1.5 max-h-48 overflow-y-auto">
          ${crawlers.length === 0
            ? '<div class="text-xs text-slate-500 italic">No crawlers deployed on map.</div>'
            : crawlers.map(c => {
                const markedLow = (c.assignedSkills || []).filter(s => s.markedForAdvancement && (s.rank || 1) <= 4).length;
                const markedHigh = (c.assignedSkills || []).filter(s => s.markedForAdvancement && (s.rank || 1) >= 5).length;
                const unspent = Number(c.unspentStatPoints) || 0;
                const canUnlockTut = floorNum >= 3 && !c.tutorialStatsUnlocked && (Number(c.level) || 1) > 1;
                return `
                  <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      <div class="font-bold text-slate-100">${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)} <span class="font-mono text-amber-300">Lvl ${c.level || 1}</span></div>
                      <div class="text-[10px] font-mono text-slate-400">★ Marked: <b class="text-emerald-300">${markedLow} (R≤4)</b> • <b class="text-indigo-300">${markedHigh} (R≥5)</b> • Unspent Stats: <b class="text-cyan-300">${unspent}</b></div>
                    </div>
                    <div class="flex items-center gap-1">
                      ${canUnlockTut ? `<button type="button" onclick="unlockTutorialFloor3StatPoints('${c.id}')" class="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px]">🔓 Unlock Floor 3 Stats (+${((c.level||1)-1)*3})</button>` : ''}
                    </div>
                  </div>
                `;
              }).join('')
          }
        </div>
      </div>

      <div class="bg-dungeon-950 border border-rose-500/35 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span class="font-bold text-rose-300">💀 Crawler Killer (1d6 + Lvl Diff):</span>
        <div class="flex items-center gap-1.5">
          <select onchange="gmAdvancementState.selectedCrawlerId=this.value" class="bg-dungeon-900 border border-slate-700 rounded px-2 py-1 text-[11px]">
            ${crawlers.map(c => `<option value="${c.id}" ${c.id === gmAdvancementState.selectedCrawlerId ? 'selected' : ''}>${escapeHtmlAttr(c.name)} (L${c.level||1})</option>`).join('')}
          </select>
          <input id="gmAdvVictimLvlInput" type="number" value="3" min="1" max="250" title="Victim Crawler Level" class="w-16 bg-dungeon-900 border border-slate-700 rounded px-2 py-1 font-mono text-center" />
          <button type="button" onclick="executeCrawlerKillerLevelAward()" class="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-[11px]">Award Kill</button>
        </div>
      </div>
    `;
  } else {
    const mapBonus = selCrawler ? detectCrawlerMapGrindBonus(selCrawler) : { bonusHrs: 0, source: '' };
    const learnedSkills = (selCrawler?.assignedSkills || []).filter(sk => {
      const full = (appState?.skills || []).find(s => s.id === sk.id) || sk;
      return normalizeAbilityEffectType(full.effectType) !== 'passive' && !/\bpassive\b/i.test(full.tags || '');
    });
    if (selCrawler && !learnedSkills.some(s => s.id === gmAdvancementState.grindSkillId)) {
      gmAdvancementState.grindSkillId = learnedSkills[0]?.id || '';
    }

    const activeSess = appState?.activeGrindSession;
    const subs = activeSess?.submissions ? Object.values(activeSess.submissions) : [];
    const partyGrindLauncherHtml = `
      <div class="bg-dungeon-950 border ${activeSess?.active ? 'border-emerald-400/70' : 'border-cyan-500/45'} rounded-xl p-3 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="font-bold text-xs ${activeSess?.active ? 'text-emerald-300' : 'text-cyan-300'} uppercase tracking-wider">
              ${activeSess?.active ? '🟢 Live Party Grinding HUD Active on Player Screens' : '🎮 Interactive Party Grinding HUD'}
            </div>
            <p class="text-[10.5px] text-slate-400 mt-0.5">Push a Grinding prompt to every player's HUD so they pick their own hours and skill to train.</p>
          </div>
          ${activeSess?.active
            ? `<button type="button" onclick="closePartyGrindingSession()" class="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-xs shrink-0 transition">✓ End Party Grind</button>`
            : `<button type="button" onclick="startPartyGrindingSession()" class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow shrink-0 transition">🚀 Open Grinding HUD for Players</button>`
          }
        </div>
        ${activeSess?.active ? `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1 text-[10.5px]">
            <div class="font-mono font-bold text-amber-300">Player Submissions (${subs.length}/${crawlers.length}):</div>
            ${crawlers.map(c => {
              const s = activeSess.submissions?.[c.id];
              return s
                ? `<div class="text-emerald-300 font-mono">✓ <b>${escapeHtmlAttr(c.name)}</b>: ${s.declaredHours}h (${s.productiveHours}h credited) on <b>${escapeHtmlAttr(s.skillName)}</b> — ${escapeHtmlAttr(s.skillOutcomeText)}</div>`
                : `<div class="text-slate-400 font-mono">⏳ <b>${escapeHtmlAttr(c.name)}</b>: Choosing hours & skill...</div>`;
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;

    contentHtml = partyGrindLauncherHtml + `
      <div class="bg-dungeon-950 border border-amber-500/40 rounded-xl p-3 space-y-2.5">
        <div class="text-[10px] font-mono uppercase text-slate-400 font-bold">🛠️ Or Run Single Crawler Grind Directly (GM Override)</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label class="block">
            <span class="text-[10px] font-mono uppercase text-cyan-400 font-bold">Crawler</span>
            <select onchange="gmAdvancementState.selectedCrawlerId=this.value; renderGmAdvancementModal()" class="mt-1 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100">
              ${crawlers.map(c => `<option value="${c.id}" ${c.id === gmAdvancementState.selectedCrawlerId ? 'selected' : ''}>${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)} (Lvl ${c.level||1} • ${c.levelGrindHours||0}/${c.level||1}h)</option>`).join('')}
            </select>
          </label>
          <label class="block">
            <span class="text-[10px] font-mono uppercase text-amber-400 font-bold">Target Skill to Grind</span>
            <select onchange="gmAdvancementState.grindSkillId=this.value; renderGmAdvancementModal()" class="mt-1 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100">
              ${learnedSkills.length === 0
                ? '<option value="">No non-passive skills learned</option>'
                : learnedSkills.map(s => `<option value="${s.id}" ${s.id === gmAdvancementState.grindSkillId ? 'selected' : ''}>${escapeHtmlAttr(s.name)} (R${s.rank||1} • ${s.grindHours||0}/${s.rank||1}h)</option>`).join('')
              }
            </select>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-2 items-center">
          <label class="block">
            <span class="text-[10px] font-mono uppercase text-slate-400 font-bold">Hours to Grind (Safe Limit: 5h/day)</span>
            <input type="number" min="1" max="16" value="${gmAdvancementState.grindHours}" onchange="gmAdvancementState.grindHours=Math.max(1,Math.min(16,Number(this.value)||5)); renderGmAdvancementModal()" class="mt-1 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-xs text-amber-200 font-bold" />
          </label>
          <div class="pt-4">
            <label class="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input type="checkbox" ${gmAdvancementState.deductCollapseClock ? 'checked' : ''} onchange="gmAdvancementState.deductCollapseClock=this.checked" class="accent-rose-400" />
              <span>Subtract from Collapse Clock</span>
            </label>
          </div>
        </div>

        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 text-[10.5px] font-mono text-slate-300 space-y-0.5">
          <div>${mapBonus.source}</div>
          ${gmAdvancementState.grindHours > 5 ? `<div class="text-rose-300">⚠️ ${gmAdvancementState.grindHours - 5} extra hour(s) past 5h will auto-roll Unopposed Endurance Checks (Fail = 0h + Fatigued).</div>` : ''}
        </div>

        <button type="button" ${!selCrawler || learnedSkills.length === 0 ? 'disabled' : ''} onclick="executeCrawlerGrindMontage()" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow disabled:opacity-40 transition">
          🏋️ Run ${gmAdvancementState.grindHours}h Grinding Montage
        </button>
      </div>
    `;
  }

  const logHtml = (gmAdvancementState.lastLog || []).length > 0 ? `
    <div class="bg-dungeon-950 border border-emerald-500/35 rounded-xl p-2.5 space-y-1">
      <div class="text-[10px] font-mono uppercase text-emerald-400 font-bold">📋 Latest Advancement Log</div>
      ${gmAdvancementState.lastLog.map(line => `<div class="text-[11px] font-mono text-slate-200">${escapeHtmlAttr(line)}</div>`).join('')}
    </div>
  ` : '';

  body.innerHTML = tabsHtml + contentHtml + logHtml;
}
