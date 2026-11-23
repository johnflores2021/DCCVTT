// =========================================================================
// 2. STATE MANAGEMENT & BROADCASTCHANNEL DUAL-WINDOW SYNC
// =========================================================================
let appState = null;
let uiState = {
  selectedTokenId: null,
  claimedCrawlerId: null,
  playerClaimPrompted: false,
  hoveredTokenId: null,
  activeGmTab: 'inspector',
  skillSubTab: 'all',
  gmDrawerOpen: !IS_PLAYER_WINDOW,
  playerDeckOpen: IS_PLAYER_WINDOW,
  activePlayerDeckTab: 'actions',
  playerSkillSearch: '',
  playerSkillSubTab: 'all',
  pinnedUntrainedSkillIds: [],
  hostilesRailCollapsed: false,
  showTacticalRanges: true,
  autoMoveAp: true,
  gridVisible: true,
  canvasTool: 'select',
  wallDrawKind: 'wall',
  wallSnapGrid: true,
  isDrawingWall: false,
  wallStartPt: null,
  wallPreviewPt: null,
  camX: 0,
  camY: 0,
  camZoom: 1,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  panDownClientX: 0,
  panDownClientY: 0,
  isDraggingToken: false,
  draggedTokenId: null,
  isDraggingObject: false,
  draggedObjectId: null,
  selectedLightId: null,
  lightBrush: {
    radiusFt: 25,
    color: '#f97316',
    lightEffect: 'flicker',
    flicker: true,
    dimOnly: false,
    angleDeg: 360,
    facingDeg: 0,
    maxReachFt: 50
  },
  isDraggingLight: false,
  draggedLightId: null,
  dragStartGx: 0,
  dragStartGy: 0,
  dragPreviewGx: 0,
  dragPreviewGy: 0,
  measureStart: null,
  measureEnd: null,
  clearArmedType: null,
  clearArmedTimer: null,
  activeCastPanel: null,
  previewEffectRange: null
};
function getDccStatModifierFromScore(score) {
  const s = Math.max(1, Number(score) || 1);
  if (s <= 2) return 1;
  if (s <= 5) return 2;
  if (s <= 9) return 3;
  if (s <= 19) return 4;
  if (s <= 49) return 5;
  if (s <= 99) return 6;
  if (s <= 149) return 7;
  if (s <= 199) return 8;
  if (s <= 299) return 9;
  return 10;
}

function formatDccStatDisplay(rawVal, defaultScore = 10) {
  const m = String(rawVal ?? '').match(/(\d+)/);
  const score = m ? Math.max(1, parseInt(m[1], 10)) : defaultScore;
  return `${score} (+${getDccStatModifierFromScore(score)})`;
}

function normalizeStatsObjectToDcc(statsObj) {
  const src = statsObj || {};
  return {
    Str: formatDccStatDisplay(src.Str, 10),
    Int: formatDccStatDisplay(src.Int, 10),
    Con: formatDccStatDisplay(src.Con, 10),
    Dex: formatDccStatDisplay(src.Dex, 10),
    Cha: formatDccStatDisplay(src.Cha, 10)
  };
}

function getCrawlerConModHpPerPip(entity) {
  const rawCon = entity?.stats?.Con ?? '10';
  const scoreMatch = String(rawCon).match(/(\d+)/);
  const conScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 10;
  return getDccStatModifierFromScore(conScore);
}

function getCrawlerDexMod(entity) {
  const rawDex = entity?.stats?.Dex ?? '10';
  const scoreMatch = String(rawDex).match(/(\d+)/);
  const dexScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 10;
  return getDccStatModifierFromScore(dexScore);
}

function getCrawlerDodgeSkillBonus(entity) {
  const dodgeEntry = (entity?.assignedSkills || []).find(s => /^dodge$/i.test(String(s.name || '').trim()));
  if (!dodgeEntry) return 0;
  const r = Math.max(1, Number(dodgeEntry.rank) || 1);
  return r >= 10 ? 2 : 1;
}

function getCrawlerSkillEvadeBonus(entity) {
  let bonus = getCrawlerDodgeSkillBonus(entity);
  (entity?.assignedSkills || []).forEach(s => {
    const name = String(s.name || '').trim();
    const r = Math.max(1, Number(s.rank) || 1);
    if ((/^rapier$/i.test(name) || /^quarterstaff$/i.test(name) || /^jumping$/i.test(name)) && r >= 10) bonus += 1;
    if (/^cat-like reflexes$/i.test(name) && r >= 15) bonus += 1;
  });
  return bonus;
}

function getEntityStatusEvadeModifier(entity) {
  let mod = 0;
  const allEffects = [...(entity?.statuses || []), ...(entity?.buffs || [])];
  allEffects.forEach(st => {
    const m = String(st).match(/([+-]\d+)\s*evade/i);
    if (m) mod += parseInt(m[1], 10);
  });
  return mod;
}

function getEffectiveTokenDr(entity) {
  if (!entity) return 0;
  // DR is strictly flat (base DR + active buff/debuff DR modifiers); never scales with Floor level
  const baseMatch = String(entity.dr || '0').match(/^\s*(\d+)/);
  const baseDr = baseMatch ? parseInt(baseMatch[1], 10) : 0;
  let mod = 0;
  const allEffects = [...(entity?.statuses || []), ...(entity?.buffs || [])];
  allEffects.forEach(st => {
    const m = String(st).match(/([+-]\d+)\s*dr\b/i);
    if (m) mod += parseInt(m[1], 10);
  });
  return Math.max(0, baseDr + mod);
}

function getEffectiveTokenLightRadiusFt(tok) {
  if (!tok) return 0;
  if (tok.role !== 'crawler') return Math.max(0, Number(tok.lightRadiusFt) || 0);
  let maxLightFt = 0;
  (tok.buffs || []).forEach(bf => {
    const label = String(bf);
    const catalogMatch = (appState?.buffs || []).find(b => String(b.name || '').toLowerCase() === label.toLowerCase());
    const textToScan = `${label} ${catalogMatch?.description || ''}`;
    const ftMatch = textToScan.match(/(\d+)\s*ft\s*(?:bright\s*)?light/i);
    if (ftMatch) {
      maxLightFt = Math.max(maxLightFt, parseInt(ftMatch[1], 10));
    } else if (/\btorch\b/i.test(textToScan)) {
      maxLightFt = Math.max(maxLightFt, 20);
    }
  });
  return maxLightFt;
}

function getEffectiveEvadeDisplay(entity) {
  if (!entity) return '+1';
  if (entity.role === 'crawler') {
    const dexMod = getCrawlerDexMod(entity);
    const skillBuff = getCrawlerSkillEvadeBonus(entity);
    const statusMod = getEntityStatusEvadeModifier(entity);
    const total = dexMod + skillBuff + statusMod;
    return total >= 0 ? `+${total}` : `${total}`;
  }
  // Monsters: Base Value + Current Dungeon Floor + Active Buff/Debuff Modifiers - Swarm Size Penalty
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const statusMod = getEntityStatusEvadeModifier(entity);
  const hm = getTokenHealthMetrics(entity);
  const swarmPenalty = (hm.swarmCount > 1 && hm.aliveUnits >= 2) ? -Math.floor(hm.aliveUnits / 2) : 0;
  const netMod = statusMod + swarmPenalty;
  const rawEvade = String(entity.evade || '12+F').trim();
  const baseMatch = rawEvade.match(/^(\d+)/);
  if (baseMatch) {
    const baseVal = parseInt(baseMatch[1], 10);
    const total = baseVal + floorNum + netMod;
    const modLabel = netMod !== 0 ? (netMod > 0 ? `+${netMod}` : `${netMod}`) : '';
    return `${total} (${baseVal}+F${modLabel})`;
  }
  return rawEvade;
}

function syncCrawlerFormStatModInput(inputEl) {
  if (!inputEl) return;
  const m = String(inputEl.value || '').match(/^(\d+)/);
  if (m) {
    const score = Math.max(1, parseInt(m[1], 10));
    const mod = getDccStatModifierFromScore(score);
    inputEl.title = `DCC Stat Score ${score} → +${mod} Modifier`;
    if (inputEl.id === 'newCrawlerCon') {
      const hpPipEl = document.getElementById('newCrawlerHpPerPip');
      if (hpPipEl) hpPipEl.value = mod;
    }
  }
}

function getTokenHealthMetrics(tok) {
  const swarmCount = tok.role === 'crawler' ? 1 : Math.max(1, Number(tok.swarmCount) || 1);
  const baseMaxPips = tok.role === 'crawler' ? 10 : Math.max(1, Number(tok.maxPips) || 3);
  const maxPips = baseMaxPips * swarmCount;
  const hpPerPip = tok.role === 'crawler'
    ? getCrawlerConModHpPerPip(tok)
    : Math.max(1, Number(tok.hpPerPip) || 2);
  const maxHp = maxPips * hpPerPip;
  const curHp = tok.currentHp !== undefined
    ? Math.max(0, Math.min(maxHp, Number(tok.currentHp)))
    : Math.max(0, Math.min(maxHp, (Number(tok.currentPips) || 0) * hpPerPip));
  const filledPips = curHp <= 0 ? 0 : Math.min(maxPips, Math.ceil(curHp / hpPerPip));
  const aliveUnits = curHp <= 0 ? 0 : Math.max(1, Math.ceil(filledPips / baseMaxPips));
  const pct = Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100)));
  return { maxPips, baseMaxPips, swarmCount, aliveUnits, hpPerPip, maxHp, curHp, filledPips, pct };
}

function inferGridSpanFromClassification(classification, role) {
  if (role === 'crawler') return 1;
  const str = String(classification || '');
  if (/colossal|gargantuan|\(7\)|\bsize\s*7/i.test(str)) return 4;
  if (/huge|\(6\)|\bsize\s*6/i.test(str)) return 3;
  if (/large|\(5\)|\bsize\s*5/i.test(str)) return 2;
  return 1;
}

function getSwarmPerSquareCapacity(classification) {
  const str = String(classification || '');
  if (/colossal|gargantuan|\(7\)|\bsize\s*7|huge|\(6\)|\bsize\s*6|large|\(5\)|\bsize\s*5/i.test(str)) return 0;
  if (/tiny|diminutive|\(1\)|\bsize\s*1/i.test(str)) return 8;
  if (/very\s*small|\(2\)|\bsize\s*2/i.test(str)) return 6;
  if (/small|\(3\)|\bsize\s*3/i.test(str)) return 4;
  return 2; // Medium (4) default: 2 per 5ft square
}

function syncSwarmTokenGridSpan(tok) {
  if (!tok || tok.role === 'crawler') return;
  const hm = getTokenHealthMetrics(tok);
  if (hm.swarmCount <= 1) return;
  const cap = getSwarmPerSquareCapacity(tok.classification);
  if (cap <= 0) return;
  const units = Math.max(1, hm.aliveUnits);
  const neededSquares = Math.ceil(units / cap);
  tok.gridSpan = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(neededSquares))));
}

function createTokenFromTpl(tpl, id, gx, gy) {
  const maxP = tpl.role === 'crawler' ? 10 : (tpl.maxPips || 3);
  const hpPerPip = tpl.role === 'crawler'
    ? getCrawlerConModHpPerPip(tpl)
    : (tpl.hpPerPip || 2);
  const maxHp = maxP * hpPerPip;
  const gridSpan = Math.max(1, Math.min(4, Number(tpl.gridSpan) || inferGridSpanFromClassification(tpl.classification, tpl.role)));
  return {
    id,
    templateId: tpl.templateId,
    name: tpl.name,
    role: tpl.role,
    gridSpan,
    swarmCount: 1,
    hiddenFromPlayers: tpl.role === 'mob',
    race: tpl.race || '',
    classification: tpl.classification,
    level: tpl.level,
    gx,
    gy,
    turnStartGx: gx,
    turnStartGy: gy,
    turnStartHp: maxHp,
    turnStartPips: maxP,
    turnStartShieldPips: 0,
    turnStartMana: tpl.maxMana || 0,
    turnStartAp: tpl.role === 'crawler' ? 2 : 0,
    maxPips: maxP,
    currentPips: maxP,
    hpPerPip,
    currentHp: maxHp,
    shieldPips: 0,
    maxMana: tpl.maxMana || 0,
    currentMana: tpl.maxMana || 0,
    maxAp: tpl.role === 'crawler' ? 2 : 0,
    currentAp: tpl.role === 'crawler' ? 2 : 0,
    stepUsed: false,
    mobMoved1: false,
    mobMoved2: false,
    mobAttacked: false,
    surprise: tpl.role === 'crawler' ? '' : (tpl.surprise || '12+F'),
    evadeBuff: tpl.role === 'crawler' ? (Number(tpl.evadeBuff) || 0) : 0,
    evade: tpl.role === 'crawler' ? getEffectiveEvadeDisplay(tpl) : (tpl.evade || '12+F'),
    move: tpl.move || (tpl.role === 'crawler' ? '20+S' : '30+S'),
    dr: tpl.dr,
    atkMod: 0,
    dmgMod: 0,
    stats: { ...tpl.stats },
    lightRadiusFt: tpl.lightRadiusFt || 0,
    lightColor: tpl.lightColor || '#fbbf24',
    lightEffect: tpl.lightEffect || (tpl.lightFlicker === false ? 'steady' : 'flicker'),
    lightFlicker: tpl.lightFlicker !== false,
    lightDimOnly: Boolean(tpl.lightDimOnly),
    lightAngleDeg: tpl.lightAngleDeg || 360,
    lightFacingDeg: tpl.lightFacingDeg || 0,
    lightMaxReachFt: tpl.lightMaxReachFt || 0,
    iconSymbol: tpl.iconSymbol,
    color: tpl.color,
    lore: tpl.lore || '',
    aiCommentary: tpl.aiCommentary || '',
    attacks: JSON.parse(JSON.stringify(tpl.attacks || [])),
    assignedSkills: JSON.parse(JSON.stringify(tpl.assignedSkills || [])),
    assignedSpells: JSON.parse(JSON.stringify(tpl.assignedSpells || [])),
    buffs: [],
    statuses: [],
    notes: tpl.notes || ''
  };
}

let syncChannel = null;
try {
  if ('BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel(CHANNEL_NAME);
    syncChannel.onmessage = (ev) => {
      if (!ev.data) return;
      if (ev.data.type === 'STATE_UPDATE' && ev.data.state) {
        appState = ev.data.state;
        exploredMemDirty = true;
        syncLoadedMapImage();
        renderAllUI();
      } else if (!IS_PLAYER_WINDOW && ev.data.type === 'PLAYER_MOVE') {
        applyPlayerTokenMove(ev.data.tokenId, ev.data.targetGx, ev.data.targetGy, ev.data.movedFt);
      } else if (!IS_PLAYER_WINDOW && ev.data.type === 'PLAYER_CREATE_CRAWLER' && ev.data.crawler) {
        createAndDeployCrawlerFromPayload(ev.data.crawler, ev.data.requestedTokenId);
      } else if (!IS_PLAYER_WINDOW && ev.data.type === 'PLAYER_CAST_ABILITY' && ev.data.tokenId) {
        if (typeof executeRemotePlayerAbilityCast === 'function') {
          executeRemotePlayerAbilityCast(ev.data.tokenId, ev.data.kind, ev.data.entryId, ev.data.targetId);
        }
      } else if (!IS_PLAYER_WINDOW && ev.data.type === 'PLAYER_DEPLOY_AND_CLAIM' && ev.data.templateId) {
        deployRosterCrawlerForPlayer(ev.data.templateId, ev.data.requestedTokenId);
      } else if (!IS_PLAYER_WINDOW && ev.data.type === 'PLAYER_TRY_UNTRAINED_SKILL' && ev.data.tokenId) {
        if (typeof executeRemotePlayerUntrainedSkill === 'function') {
          executeRemotePlayerUntrainedSkill(ev.data.tokenId, ev.data.entryId, ev.data.targetId);
        }
      }
    };
  }
} catch (_) {}

window.addEventListener('storage', (ev) => {
  if (ev.key === STORAGE_KEY && ev.newValue) {
    try {
      appState = JSON.parse(ev.newValue);
      exploredMemDirty = true;
      syncLoadedMapImage();
      renderAllUI();
    } catch (_) {}
  }
});

let loadedMapImg = null;
let loadedMapDataUrl = null;
let exploredMemDirty = true;
let lastExploredCameraKey = '';
const visPolyCache = new Map();
let vttToastTimer = null;

function showVttToast(msg) {
  const wrap = document.getElementById('vttToast');
  const inner = document.getElementById('vttToastInner');
  if (!wrap || !inner) return;
  inner.textContent = msg;
  wrap.classList.remove('opacity-0');
  clearTimeout(vttToastTimer);
  vttToastTimer = setTimeout(() => wrap.classList.add('opacity-0'), 3200);
}

function parseBaseMoveFt(moveStr, defaultFt = 20) {
  const m = String(moveStr || defaultFt).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : defaultFt;
}

function createInitialState() {
  return {
    floor: 1,
    round: 0,
    phaseIndex: 0,
    collapseRemainingMinutes: 72 * 60,
    sheetsWebhookUrl: DEFAULT_SHEETS_WEBHOOK_URL,
    lastDiceBroadcast: null,
    claimedCrawlers: {},
    activeMapId: 'scene_default',
    mapScenes: [
      {
        id: 'scene_default',
        name: 'New Scene',
        gridSize: 56,
        mapScale: 100,
        mapOffsetX: 0,
        mapOffsetY: 0,
        gridAlpha: 0.2,
        ambientDarkness: 0.65,
        mapImageDataUrl: null,
        droppedLights: [],
        walls: [],
        exploredSpots: [],
        ghostMarkers: [],
        mapObjects: [],
        tokens: []
      }
    ],
    bestiary: JSON.parse(JSON.stringify(DEFAULT_BESTIARY)),
    objectTemplates: JSON.parse(JSON.stringify(DEFAULT_OBJECT_TEMPLATES)),
    skills: JSON.parse(JSON.stringify(DEFAULT_SKILLS_LIST)),
    spells: JSON.parse(JSON.stringify(DEFAULT_SPELLS_LIST)),
    buffs: JSON.parse(JSON.stringify(DEFAULT_BUFFS_LIST)),
    debuffs: JSON.parse(JSON.stringify(DEFAULT_DEBUFFS_LIST))
  };
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.mapScenes) && parsed.mapScenes.length > 0) {
        appState = parsed;
        if (typeof appState.floor !== 'number') appState.floor = 1;
        if (typeof appState.collapseRemainingMinutes !== 'number') appState.collapseRemainingMinutes = 72 * 60;
        if (typeof appState.sheetsWebhookUrl !== 'string' || !appState.sheetsWebhookUrl.trim()) {
          appState.sheetsWebhookUrl = DEFAULT_SHEETS_WEBHOOK_URL;
        }
        if (!appState.claimedCrawlers || typeof appState.claimedCrawlers !== 'object') appState.claimedCrawlers = {};
        if (!Array.isArray(appState.buffs)) appState.buffs = JSON.parse(JSON.stringify(DEFAULT_BUFFS_LIST));
        if (!Array.isArray(appState.debuffs)) appState.debuffs = JSON.parse(JSON.stringify(DEFAULT_DEBUFFS_LIST));
        if (!Array.isArray(appState.skills)) appState.skills = JSON.parse(JSON.stringify(DEFAULT_SKILLS_LIST));
        if (!Array.isArray(appState.spells)) appState.spells = JSON.parse(JSON.stringify(DEFAULT_SPELLS_LIST));
        if (!Array.isArray(appState.bestiary)) appState.bestiary = JSON.parse(JSON.stringify(DEFAULT_BESTIARY));
        if (!Array.isArray(appState.objectTemplates)) appState.objectTemplates = JSON.parse(JSON.stringify(DEFAULT_OBJECT_TEMPLATES));
        appState.mapScenes.forEach(sc => {
          if (!Array.isArray(sc.droppedLights)) sc.droppedLights = [];
          if (!Array.isArray(sc.walls)) sc.walls = [];
          if (!Array.isArray(sc.exploredSpots)) sc.exploredSpots = [];
          if (!Array.isArray(sc.ghostMarkers)) sc.ghostMarkers = [];
          if (!Array.isArray(sc.mapObjects)) sc.mapObjects = [];
          if (!Array.isArray(sc.tokens)) sc.tokens = [];
        });
        return;
      }
    }
  } catch (err) {
    console.warn('Resetting VTT state:', err);
  }
  appState = createInitialState();
}



function commitStateChange() {
  if (!appState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.warn('Storage quota warning:', err);
  }
  try {
    if (syncChannel) {
      syncChannel.postMessage({ type: 'STATE_UPDATE', state: appState });
    }
  } catch (_) {}
  broadcastStateToOnlinePlayers(false);
  renderAllUI();
}

function getClaimedCrawlerToken() {
  if (!uiState.claimedCrawlerId) return null;
  const sc = getActiveScene();
  return sc ? (sc.tokens || []).find(t => t.id === uiState.claimedCrawlerId && t.role === 'crawler') || null : null;
}

function applyPlayerTokenMove(tokenId, targetGx, targetGy, movedFt) {
  const sc = getActiveScene();
  if (!sc || !tokenId) return;
  const tok = (sc.tokens || []).find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;
  const nextGx = Number(targetGx);
  const nextGy = Number(targetGy);
  if (Number.isNaN(nextGx) || Number.isNaN(nextGy)) return;
  const distFt = typeof movedFt === 'number' ? movedFt : calcGridDistanceFt(tok.gx, tok.gy, nextGx, nextGy);
  tok.gx = nextGx;
  tok.gy = nextGy;
  applyAutomaticMovementEconomy(tok, distFt);
  exploredMemDirty = true;
  commitStateChange();
}

function createAndDeployCrawlerFromPayload(payload, requestedTokenId = null) {
  const sc = getActiveScene();
  if (!sc || !payload || !String(payload.name || '').trim()) return null;
  const normalizedStats = normalizeStatsObjectToDcc(payload.stats || {});
  const autoHpPerPip = getCrawlerConModHpPerPip({ stats: normalizedStats });
  const race = String(payload.race || 'Human').trim();
  const size = String(payload.size || 'Medium').trim();
  const tpl = {
    templateId: 'tpl_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: String(payload.name).trim(),
    role: 'crawler',
    race,
    classification: String(payload.classification || `Crawler; ${size}, ${race}`).trim(),
    level: Math.max(1, Number(payload.level) || 1),
    maxPips: 10,
    hpPerPip: autoHpPerPip,
    maxMana: Math.max(0, Number(payload.maxMana) || 10),
    evade: getEffectiveEvadeDisplay({ role: 'crawler', stats: normalizedStats }),
    move: '20+S',
    dr: '0',
    stats: normalizedStats,
    lightRadiusFt: 0,
    iconSymbol: String(payload.iconSymbol || '⚔️').trim(),
    color: payload.color || '#38bdf8',
    attacks: Array.isArray(payload.attacks) ? payload.attacks : [],
    aiFavor: Number(payload.aiFavor ?? 1),
    crawlerNumber: payload.crawlerNumber || '',
    pronouns: String(payload.pronouns || '').trim(),
    assignedSkills: (payload.assignedSkillNames || []).map((item, idx) => {
      const skName = String(item.name || '').trim();
      const match = (appState.skills || []).find(s => String(s.name || '').trim().toLowerCase() === skName.toLowerCase());
      return { id: match ? match.id : `sk_wiz_${Date.now()}_${idx}`, name: match ? match.name : skName, rank: Math.max(1, Number(item.rank) || 1) };
    }),
    assignedSpells: (payload.assignedSpellNames || []).map((item, idx) => {
      const spName = String(item.name || '').trim();
      const match = (appState.spells || []).find(s => String(s.name || '').trim().toLowerCase() === spName.toLowerCase());
      return { id: match ? match.id : `sp_wiz_${Date.now()}_${idx}`, name: match ? match.name : spName, rank: Math.max(1, Number(item.rank) || 1) };
    }),
    notes: String(payload.notes || '').trim()
  };
  appState.bestiary = appState.bestiary || [];
  appState.bestiary.push(tpl);

  const offset = (sc.tokens?.length || 0) % 6;
  const tokId = requestedTokenId || ('tok_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
  const tok = createTokenFromTpl(tpl, tokId, 4 + offset, 4);
  tok.aiFavor = tpl.aiFavor;
  tok.crawlerNumber = tpl.crawlerNumber;
  tok.pronouns = tpl.pronouns;
  syncCrawlerPassiveSkillBuffs(tok);
  sc.tokens.push(tok);
  exploredMemDirty = true;
  commitStateChange();
  showVttToast(`🦸 New Crawler deployed: ${tok.name}!`);
  return tok;
}

function deployRosterCrawlerForPlayer(templateId, requestedTokenId = null) {
  const sc = getActiveScene();
  if (!sc || !templateId) return null;
  const existing = (sc.tokens || []).find(t => t.role === 'crawler' && t.templateId === templateId);
  if (existing) return existing;
  const tpl = (appState.bestiary || []).find(b => b.role === 'crawler' && b.templateId === templateId);
  if (!tpl) return null;

  const offset = (sc.tokens?.length || 0) % 6;
  const tokId = requestedTokenId || ('tok_r_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
  const tok = createTokenFromTpl(tpl, tokId, 4 + offset, 4);
  if (tpl.aiFavor !== undefined) tok.aiFavor = tpl.aiFavor;
  if (tpl.crawlerNumber) tok.crawlerNumber = tpl.crawlerNumber;
  if (tpl.pronouns) tok.pronouns = tpl.pronouns;
  syncCrawlerPassiveSkillBuffs(tok);
  sc.tokens.push(tok);
  exploredMemDirty = true;
  commitStateChange();
  showVttToast(`🎭 Player deployed ${tok.name} onto the map!`);
  return tok;
}

function getActiveScene() {
  if (!appState || !Array.isArray(appState.mapScenes)) return null;
  return appState.mapScenes.find(s => s.id === appState.activeMapId) || appState.mapScenes[0];
}

function syncLoadedMapImage() {
  const sc = getActiveScene();
  if (!sc || !sc.mapImageDataUrl) {
    loadedMapImg = null;
    loadedMapDataUrl = null;
    return;
  }
  if (loadedMapDataUrl === sc.mapImageDataUrl && loadedMapImg) return;
  loadedMapDataUrl = sc.mapImageDataUrl;
  const img = new Image();
  img.onload = () => { loadedMapImg = img; };
  img.src = sc.mapImageDataUrl;
}

function openPlayerProjectionWindow() {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'player');
  window.open(url.toString(), 'DCC_Player_Display', 'width=1280,height=800');
  showVttToast('🖥️ Opened Pop-Out Player Window');
}

// =========================================================================
// 3. TACTICAL 4-RING RANGE MATH & ACTION ECONOMY
// =========================================================================
function parseRangeFtFromText(rangeText, rank = 1) {
  const str = String(rangeText || '5');
  const rankMult = str.match(/Rank\s*[×x*]\s*(\d+)/i);
  if (rankMult && Number(rank) >= 5) {
    return Number(rank) * parseInt(rankMult[1], 10);
  }
  const numMatch = str.match(/(\d+)\s*(?:ft|feet|foot)?/i);
  return numMatch ? Math.max(5, parseInt(numMatch[1], 10)) : 5;
}

function buildDerivedAttacksForCrawler(tok) {
  if (!tok || tok.role !== 'crawler') return [];
  const derived = [];

  (tok.assignedSkills || []).forEach(item => {
    const full = (appState?.skills || []).find(s => s.id === item.id) || item;
    const isAttackSkill = full.skillGroup === 'attack' || /attack/i.test(full.tags || '');
    if (!isAttackSkill) return;

    const rank = Math.max(1, Math.min(15, Number(item.rank) || 1));
    const unlocked = (full.upgrades || []).filter(u => {
      const m = String(u).match(/^Rank\s+(\d+)/i);
      return !m || rank >= parseInt(m[1], 10);
    });

    derived.push({
      name: `${full.name} (Rank ${rank})`,
      hitBonus: '',
      rangeFt: parseRangeFtFromText(full.range, rank),
      damage: full.baseDamage || full.rank1Effect || 'See Skill',
      special: unlocked.length > 0 ? unlocked.join(' • ') : (full.rank1Effect || ''),
      derivedFromSkillId: full.id
    });
  });

  (tok.assignedSpells || []).forEach(item => {
    const full = (appState?.spells || []).find(sp => sp.id === item.id) || item;
    const isAttackSpell = /attack/i.test(full.tags || '') || Boolean(full.baseDamage && !/^heal\b/i.test(full.baseDamage.trim()));
    if (!isAttackSpell) return;

    const rank = Math.max(1, Math.min(15, Number(item.rank) || 1));
    const unlocked = (full.upgrades || []).filter(u => {
      const m = String(u).match(/^Rank\s+(\d+)/i);
      return !m || rank >= parseInt(m[1], 10);
    });

    derived.push({
      name: `${full.name} (Rank ${rank}${full.manaCost ? ` • ${full.manaCost} MP` : ''})`,
      hitBonus: '',
      rangeFt: parseRangeFtFromText(full.range, rank),
      damage: full.baseDamage || full.rank1Effect || 'See Spell',
      special: unlocked.length > 0 ? unlocked.join(' • ') : (full.rank1Effect || ''),
      derivedFromSpellId: full.id
    });
  });

  return derived;
}

function getEffectiveTokenAttacks(tok) {
  if (!tok) return [];
  const baseAttacks = (tok.attacks || []).filter(a => !a.derivedFromSkillId && !a.derivedFromSpellId);
  if (tok.role !== 'crawler') {
    const hm = getTokenHealthMetrics(tok);
    if (hm.swarmCount <= 1 || hm.aliveUnits <= 0) return baseAttacks;
    const span = Math.max(1, Math.min(4, Number(tok.gridSpan) || 1));
    const extraDice = Math.max(0, span - 1);
    const hitBonus = hm.aliveUnits;
    return baseAttacks.map(atk => {
      let scaledDmg = String(atk.damage || '');
      if (extraDice > 0) {
        scaledDmg = scaledDmg.replace(/(\d+)d(\d+)/i, (_, cnt, sides) => `${parseInt(cnt, 10) + extraDice}d${sides}`);
      }
      const baseHit = String(atk.hitBonus || '12+F').trim();
      const scaledHit = `${baseHit} +${hitBonus} Swarm`;
      const swarmNote = `🌊 Swarm (×${hm.aliveUnits}): Strikes ALL Crawlers within ${atk.rangeFt || 5}ft${extraDice > 0 ? ` • +${extraDice} combat ${extraDice === 1 ? 'die' : 'dice'} (${span}×${span})` : ''}`;
      return {
        ...atk,
        hitBonus: scaledHit,
        damage: scaledDmg,
        isSwarmMultiTarget: true,
        special: atk.special ? `${atk.special} • ${swarmNote}` : swarmNote
      };
    });
  }
  const derived = buildDerivedAttacksForCrawler(tok);
  const seenNames = new Set(baseAttacks.map(a => a.name.toLowerCase()));
  const uniqueDerived = derived.filter(d => !seenNames.has(d.name.toLowerCase()));
  return [...baseAttacks, ...uniqueDerived];
}

function getTokenRangeMetrics(tok) {
  const isSlowed = (tok.statuses || []).some(s => /slow|fatigu/i.test(s));
  const isStunned = (tok.statuses || []).some(s => /stun/i.test(s));
  const rawBase = parseBaseMoveFt(tok.move, tok.role === 'crawler' ? 20 : 30);
  const baseMoveFt = isStunned ? 0 : (isSlowed ? Math.max(0, rawBase - 10) : rawBase);
  const stepBonusFt = isStunned ? 0 : 10;

  const ring1StepFt = stepBonusFt;
  const ring2MoveStepFt = baseMoveFt + stepBonusFt;
  const ring3MoveTwoStepsFt = baseMoveFt + (stepBonusFt * 2);
  const ring4DoubleMoveFt = (baseMoveFt * 2) + (stepBonusFt * 2);

  const maxAttackFt = getEffectiveTokenAttacks(tok).reduce((mx, a) => Math.max(mx, Number(a.rangeFt) || 5), 5);
  const stepAttackFt = maxAttackFt + stepBonusFt;

  if (tok.role === 'crawler') {
    const ap = tok.currentAp || 0;
    return {
      baseMoveFt,
      ring1StepFt,
      ring2MoveStepFt,
      ring3MoveTwoStepsFt,
      ring4DoubleMoveFt,
      singleMoveFt: ring2MoveStepFt,
      doubleMoveFt: ring4DoubleMoveFt,
      maxAttackFt,
      stepAttackFt,
      canFreeStep: !isStunned && ap >= 1,
      canSingleMove: !isStunned && ap >= 1,
      canDoubleMove: !isStunned && ap >= 2,
      canAttack: !isStunned && ap >= 1
    };
  } else {
    const usedMoves = (tok.mobMoved1 ? 1 : 0) + (tok.mobMoved2 ? 1 : 0);
    const canStillMove = !isStunned && usedMoves < 2 && !(tok.mobAttacked && usedMoves >= 1);
    const canDoubleMove = !isStunned && usedMoves === 0 && !tok.mobAttacked;
    const canAttack = !isStunned && !tok.mobAttacked && !tok.mobMoved2;
    return {
      baseMoveFt,
      ring1StepFt,
      ring2MoveStepFt,
      ring3MoveTwoStepsFt,
      ring4DoubleMoveFt,
      singleMoveFt: ring2MoveStepFt,
      doubleMoveFt: ring4DoubleMoveFt,
      maxAttackFt,
      stepAttackFt,
      canFreeStep: !isStunned && !tok.stepUsed,
      canSingleMove: canStillMove,
      canDoubleMove,
      canAttack
    };
  }
}

function calcGridDistanceFt(gx1, gy1, gx2, gy2) {
  return (Math.abs(gx2 - gx1) + Math.abs(gy2 - gy1)) * 5;
}

function snapshotTurnAnchors() {
  const scene = getActiveScene();
  if (!scene) return;
  scene.tokens.forEach(t => {
    const hm = getTokenHealthMetrics(t);
    t.turnStartGx = t.gx;
    t.turnStartGy = t.gy;
    t.turnStartHp = hm.curHp;
    t.turnStartPips = hm.filledPips;
    t.turnStartShieldPips = t.shieldPips || 0;
    t.turnStartMana = t.currentMana;
    t.turnStartAp = t.role === 'crawler' ? 2 : 0;
    t.stepUsed = false;
    t.mobMoved1 = false;
    t.mobMoved2 = false;
    t.mobAttacked = false;
    if (t.role === 'crawler') t.currentAp = t.maxAp || 2;
  });
}

function setTokenTurnAnchor(tokenId) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const hm = getTokenHealthMetrics(tok);
  tok.turnStartGx = tok.gx;
  tok.turnStartGy = tok.gy;
  tok.turnStartHp = hm.curHp;
  tok.turnStartPips = hm.filledPips;
  tok.turnStartShieldPips = tok.shieldPips || 0;
  tok.turnStartMana = tok.currentMana;
  tok.turnStartAp = tok.currentAp;
  showVttToast(`📍 Anchor set for ${tok.name} at (${tok.gx}, ${tok.gy})`);
  commitStateChange();
}

function syncCrawlerPassiveSkillBuffs(tok) {
  if (!tok || tok.role !== 'crawler') return;
  tok.buffs = tok.buffs || [];
  // Remove previously auto-applied passive skill buffs so rank changes or unlearning update cleanly
  tok.buffs = tok.buffs.filter(b => !String(b).startsWith('[Passive] '));

  (tok.assignedSkills || []).forEach(item => {
    const full = (appState?.skills || []).find(s => s.id === item.id) || item;
    const rank = Math.max(1, Math.min(15, Number(item.rank) || 1));
    const unlocked = (full.upgrades || []).filter(u => {
      const m = String(u).match(/^Rank\s+(\d+)/i);
      return !m || rank >= parseInt(m[1], 10);
    });
    const combinedText = [
      full.name || '',
      full.tags || '',
      full.baseDamage || '',
      full.rank1Effect || '',
      full.description || '',
      ...unlocked
    ].join(' | ');

    const isPassiveSkill = /\bpassive\b/i.test(full.tags || '') || /\bpassive\b/i.test(full.description || '') || /\bpermanent\b/i.test(combinedText) || /\bbuff\b/i.test(combinedText);
    if (!isPassiveSkill) return;

    // Check if this skill matches a known Buff in the catalog (e.g., Dodge, Cat-Like Reflexes, Running Stride)
    const baseSkillName = String(full.name || '').trim();
    const catalogBuff = (appState?.buffs || []).find(b => {
      const cleanBuffName = String(b.name || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
      return cleanBuffName.toLowerCase() === baseSkillName.toLowerCase() ||
             String(b.name || '').toLowerCase().startsWith(baseSkillName.toLowerCase());
    });

    // Extract explicit numeric modifiers from unlocked tiers (highest unlocked wins)
    const evadeMatches = [...combinedText.matchAll(/([+-]\d+)\s*evade/gi)];
    const moveMatches = [...combinedText.matchAll(/([+-]\d+\s*ft)\s*move/gi)];
    const drMatches = [...combinedText.matchAll(/([+-]\d+)\s*dr\b/gi)];

    const statTags = [];
    if (evadeMatches.length > 0) statTags.push(`${evadeMatches[evadeMatches.length - 1][1]} Evade`);
    if (moveMatches.length > 0) statTags.push(`${moveMatches[moveMatches.length - 1][1]} Move`);
    if (drMatches.length > 0) statTags.push(`${drMatches[drMatches.length - 1][1]} DR`);

    const displayName = catalogBuff
      ? (statTags.length > 0 && !/\([+-]/.test(catalogBuff.name) ? `${catalogBuff.name} (${statTags.join(', ')})` : catalogBuff.name)
      : `${baseSkillName}${statTags.length > 0 ? ` (${statTags.join(', ')})` : ` (R${rank})`}`;

    const passiveLabel = `[Passive] ${displayName}`;
    if (!tok.buffs.includes(passiveLabel)) {
      tok.buffs.push(passiveLabel);
    }
  });
}

function assignAbilityToCrawler(tokenId, kind, entryId) {
  if (!entryId) return;
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok || tok.role !== 'crawler') return;
  const catalog = kind === 'skill' ? (appState.skills || []) : (appState.spells || []);
  const entry = catalog.find(e => e.id === entryId);
  if (!entry) return;
  const listKey = kind === 'skill' ? 'assignedSkills' : 'assignedSpells';
  tok[listKey] = tok[listKey] || [];
  if (!tok[listKey].some(a => a.id === entryId)) {
    tok[listKey].push({ id: entry.id, name: entry.name, rank: 1 });
    if (kind === 'skill') syncCrawlerPassiveSkillBuffs(tok);
    commitStateChange();
    showVttToast(`📚 Learned ${entry.name} on ${tok.name}`);
  } else {
    tok[listKey] = tok[listKey].filter(a => a.id !== entryId);
    if (kind === 'skill') syncCrawlerPassiveSkillBuffs(tok);
    commitStateChange();
    showVttToast(`Removed ${entry.name} from ${tok.name}`);
  }
}

function adjustCrawlerAbilityRank(tokenId, kind, entryId, delta) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const listKey = kind === 'skill' ? 'assignedSkills' : 'assignedSpells';
  const item = (tok[listKey] || []).find(a => a.id === entryId);
  if (!item) return;
  item.rank = Math.max(1, Math.min(15, (Number(item.rank) || 1) + delta));
  if (kind === 'skill') syncCrawlerPassiveSkillBuffs(tok);
  commitStateChange();
}

function removeAbilityFromCrawler(tokenId, kind, entryId) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const listKey = kind === 'skill' ? 'assignedSkills' : 'assignedSpells';
  tok[listKey] = (tok[listKey] || []).filter(a => a.id !== entryId);
  if (kind === 'skill') syncCrawlerPassiveSkillBuffs(tok);
  commitStateChange();
}

function mulliganTokenTurn(tokenId) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.gx = tok.turnStartGx ?? tok.gx;
  tok.gy = tok.turnStartGy ?? tok.gy;
  if (tok.turnStartHp !== undefined) tok.currentHp = tok.turnStartHp;
  tok.currentPips = tok.turnStartPips ?? tok.currentPips;
  tok.shieldPips = tok.turnStartShieldPips ?? (tok.shieldPips || 0);
  tok.currentMana = tok.turnStartMana ?? tok.currentMana;
  tok.currentAp = tok.role === 'crawler' ? (tok.turnStartAp ?? 2) : 0;
  tok.stepUsed = false;
  tok.mobMoved1 = false;
  tok.mobMoved2 = false;
  tok.mobAttacked = false;
  showVttToast(`↩️ Full Turn Mulligan: ${tok.name} restored to start of round!`);
  commitStateChange();
}

function applyAutomaticMovementEconomy(tok, movedFt) {
  if (!uiState.autoMoveAp || (appState && appState.round === 0) || movedFt <= 0) return;
  const metrics = getTokenRangeMetrics(tok);

  if (movedFt <= 10 && !tok.stepUsed) {
    tok.stepUsed = true;
    showVttToast(`${tok.name}: 10ft Free Step used (0 AP • Reaction Flagged)`);
    return;
  }

  if (tok.role === 'crawler') {
    if (movedFt <= metrics.singleMoveFt) {
      if (tok.currentAp > 0) {
        tok.currentAp = Math.max(0, tok.currentAp - 1);
        tok.stepUsed = tok.currentAp <= 0;
        showVttToast(`${tok.name} moved ${movedFt}ft (-1 AP${tok.currentAp > 0 ? ' • 10ft Step refreshed' : ''})`);
      } else {
        showVttToast(`⚠️ ${tok.name} moved ${movedFt}ft with 0 AP left!`);
      }
    } else {
      if (tok.currentAp >= 2) {
        tok.currentAp = 0;
        tok.stepUsed = true;
        showVttToast(`${tok.name} dashed ${movedFt}ft (-2 AP)`);
      } else {
        tok.currentAp = 0;
        tok.stepUsed = true;
        showVttToast(`⚠️ ${tok.name} exceeded single-move range (${movedFt}ft)!`);
      }
    }
  } else {
    if (movedFt <= metrics.singleMoveFt && !tok.mobMoved1) {
      tok.mobMoved1 = true;
      tok.stepUsed = true;
      showVttToast(`${tok.name} moved ${movedFt}ft (Move 1 used)`);
    } else {
      tok.mobMoved1 = true;
      tok.mobMoved2 = true;
      tok.stepUsed = true;
      showVttToast(`${tok.name} dashed ${movedFt}ft (2nd Move / Dash — Attack locked)`);
    }
  }
}

function advanceCombatPhase() {
  if (IS_PLAYER_WINDOW) return;
  if (appState.round === 0) {
    appState.round = 1;
    appState.phaseIndex = 0;
    snapshotTurnAnchors();
    exploredMemDirty = true;
    showVttToast(`⚔️ Combat Started — Round 1 (${COMBAT_PHASES[0].label})!`);
    commitStateChange();
    return;
  }
  appState.phaseIndex = (appState.phaseIndex + 1) % COMBAT_PHASES.length;
  if (appState.phaseIndex === 0) {
    appState.round += 1;
    snapshotTurnAnchors();
    showVttToast(`⚔️ Round ${appState.round} Started — AP, Mob Actions & 10ft Steps Reset!`);
  } else {
    showVttToast(`${COMBAT_PHASES[appState.phaseIndex].label}`);
  }
  commitStateChange();
}

function adjustCombatRound(delta) {
  if (IS_PLAYER_WINDOW) return;
  const nextRound = Math.max(0, (appState.round ?? 0) + delta);
  appState.round = nextRound;
  if (nextRound === 0) {
    appState.phaseIndex = 0;
    snapshotTurnAnchors();
    showVttToast('🛠️ Round 0: Setup Mode — Position tokens & walls freely (Player view blacked out)');
  } else {
    snapshotTurnAnchors();
    exploredMemDirty = true;
    showVttToast(`⚔️ Set to Round ${nextRound}`);
  }
  commitStateChange();
}

function adjustDungeonFloor(delta) {
  if (IS_PLAYER_WINDOW) return;
  appState.floor = Math.max(1, (Number(appState.floor) || 1) + delta);
  commitStateChange();
  showVttToast(`🏰 Dungeon Floor ${appState.floor} — Monster Evade updated (+${appState.floor})`);
}

function setCombatPhase(idx) {
  if (IS_PLAYER_WINDOW) return;
  appState.phaseIndex = idx;
  commitStateChange();
}

function formatCollapseClock(totalMinutes) {
  const mins = Math.max(0, Math.floor(totalMinutes || 0));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return d > 0 ? `${d}d ${hh}h ${mm}m` : `${hh}h ${mm}m`;
}

function adjustCollapseHours(deltaHours) {
  if (IS_PLAYER_WINDOW) return;
  appState.collapseRemainingMinutes = Math.max(0, (appState.collapseRemainingMinutes ?? 72 * 60) + Math.round(deltaHours * 60));
  commitStateChange();
  showVttToast(`⏳ Floor Collapse Clock: ${formatCollapseClock(appState.collapseRemainingMinutes)}`);
}

function applyPartyRest(restType) {
  if (IS_PLAYER_WINDOW) return;
  const scene = getActiveScene();
  if (!scene) return;
  const crawlers = scene.tokens.filter(t => t.role === 'crawler');
  let hoursSpent = 0;
  let summary = '';

  if (restType === 'hour') {
    hoursSpent = 1;
    crawlers.forEach(c => {
      const hm = getTokenHealthMetrics(c);
      const nextHp = Math.min(hm.maxHp, hm.curHp + hm.hpPerPip);
      c.currentHp = nextHp;
      c.currentPips = nextHp <= 0 ? 0 : Math.min(10, Math.ceil(nextHp / hm.hpPerPip));
      c.currentMana = Math.min(c.maxMana || 0, (c.currentMana || 0) + 5);
    });
    summary = '1h Out of Combat (+1 HB slot, +5 MP)';
  } else if (restType === 'short') {
    hoursSpent = 2;
    crawlers.forEach(c => {
      const hm = getTokenHealthMetrics(c);
      const nextHp = Math.min(hm.maxHp, hm.curHp + (5 * hm.hpPerPip));
      c.currentHp = nextHp;
      c.currentPips = nextHp <= 0 ? 0 : Math.min(10, Math.ceil(nextHp / hm.hpPerPip));
      const manaGain = Math.floor((c.maxMana || 0) / 2);
      c.currentMana = Math.min(c.maxMana || 0, (c.currentMana || 0) + manaGain);
    });
    summary = 'Short Rest (2h): +5 HB slots & +50% Max MP';
  } else if (restType === 'long') {
    hoursSpent = 8;
    crawlers.forEach(c => {
      const hm = getTokenHealthMetrics(c);
      c.currentHp = hm.maxHp;
      c.currentPips = hm.maxPips;
      c.currentMana = c.maxMana || 0;
      c.statuses = (c.statuses || []).filter(s => !/fatigu/i.test(s));
    });
    summary = 'Long Rest (8h): Full HB & MP, Fatigued cleared';
  } else if (restType === 'fullday') {
    hoursSpent = 30;
    crawlers.forEach(c => {
      const hm = getTokenHealthMetrics(c);
      c.currentHp = hm.maxHp;
      c.currentPips = hm.maxPips;
      c.currentMana = c.maxMana || 0;
      c.statuses = (c.statuses || []).filter(s => !/(fatigu|injur)/i.test(s));
    });
    summary = 'Full Day’s Rest (30h): Full HB, Full MP, Fatigued & Injuries cleared';
  }

  appState.collapseRemainingMinutes = Math.max(0, (appState.collapseRemainingMinutes ?? 72 * 60) - hoursSpent * 60);
  commitStateChange();
  showVttToast(`🏕️ ${summary} • Clock: ${formatCollapseClock(appState.collapseRemainingMinutes)}`);
}

