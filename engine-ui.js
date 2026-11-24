// =========================================================================
// 7. SCENE, TOOL, AND HUD UI RENDERERS
// =========================================================================

function applyPortraitDataUrlToTarget(targetId, isTemplate, dataUrl) {
  if (typeof tokenPortraitCache !== 'undefined') tokenPortraitCache.clear();
  if (isTemplate) {
    const tpl = (appState?.bestiary || []).find(b => b.templateId === targetId);
    if (tpl) tpl.portraitDataUrl = dataUrl || '';
    const sc = getActiveScene();
    (sc?.tokens || []).forEach(t => {
      if (t.templateId === targetId) t.portraitDataUrl = dataUrl || '';
    });
  } else {
    const tok = getActiveScene()?.tokens.find(t => t.id === targetId);
    if (tok) {
      tok.portraitDataUrl = dataUrl || '';
      if (tok.templateId) {
        const tpl = (appState?.bestiary || []).find(b => b.templateId === tok.templateId);
        if (tpl) tpl.portraitDataUrl = dataUrl || '';
      }
    }
  }
  commitStateChange();
}

function uploadTokenPortraitImage(targetId, event, isTemplate = false) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const cctx = c.getContext('2d');
      const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      cctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
      const smallUrl = c.toDataURL('image/jpeg', 0.84);
      applyPortraitDataUrlToTarget(targetId, isTemplate, smallUrl);
      showVttToast('🖼️ Updated token portrait!');
    };
    img.onerror = () => {
      applyPortraitDataUrlToTarget(targetId, isTemplate, ev.target.result);
      showVttToast('🖼️ Attached token portrait!');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function clearTokenPortraitImage(targetId, isTemplate = false) {
  applyPortraitDataUrlToTarget(targetId, isTemplate, '');
  showVttToast('Cleared custom portrait (reverted to emoji / tokens folder)');
}

function selectToken(tokenId) {
  uiState.selectedTokenId = tokenId;
  uiState.activeCastPanel = null;
  uiState.previewEffectRange = null;
  renderAllUI();
}

function setCanvasTool(tool) {
  uiState.canvasTool = tool;
  ['select', 'wall', 'floor', 'dropLight', 'measure'].forEach(t => {
    const idMap = { select: 'toolSelectBtn', wall: 'toolWallBtn', floor: 'toolFloorBtn', dropLight: 'toolDropLightBtn', measure: 'toolMeasureBtn' };
    const btn = document.getElementById(idMap[t]);
    if (!btn) return;
    const active = t === tool;
    btn.className = active
      ? 'px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs transition'
      : 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs transition';
  });
  const wallBar = document.getElementById('wallToolSubBar');
  if (wallBar) wallBar.classList.toggle('hidden', tool !== 'wall');
  const floorBar = document.getElementById('floorToolSubBar');
  if (floorBar) floorBar.classList.toggle('hidden', tool !== 'floor');
  showVttToast(
    tool === 'wall' ? '🧱 Wall/Door tool: Left-drag to draw • Right-click segment to delete • Click door to toggle'
      : tool === 'floor' ? '⛰️ Floor ±5ft tool: Click tile to Raise +5ft • Shift/Right-Click to Lower -5ft • Alt+Click for 0ft'
      : tool === 'dropLight' ? '🔥 Drop Light tool: Click map to place a light source'
      : tool === 'measure' ? '📏 Ruler tool: Drag on map to measure distance in 5ft squares'
      : '✋ Select / Move tool active'
  );
}
function setWallDrawKind(kind) {
  uiState.wallDrawKind = kind;
  const wBtn = document.getElementById('wallTypeWallBtn');
  const dBtn = document.getElementById('wallTypeDoorBtn');
  if (wBtn) wBtn.className = kind === 'wall' ? 'px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[11px]' : 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]';
  if (dBtn) dBtn.className = kind === 'door' ? 'px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[11px]' : 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[11px]';
}

function resetCameraView() {
  uiState.camX = 0;
  uiState.camY = 0;
  uiState.camZoom = 1;
  exploredMemDirty = true;
}

function toggleGridVisibility() {
  uiState.gridVisible = !uiState.gridVisible;
}

function toggleTacticalOverlay() {
  uiState.showTacticalRanges = !uiState.showTacticalRanges;
  const btn = document.getElementById('toggleRangesBtn');
  if (btn) btn.textContent = `Ranges: ${uiState.showTacticalRanges ? 'ON' : 'OFF'}`;
}

function toggleAutoMoveAp() {
  uiState.autoMoveAp = !uiState.autoMoveAp;
  const btn = document.getElementById('toggleAutoApBtn');
  if (btn) btn.textContent = `Auto-AP: ${uiState.autoMoveAp ? 'ON' : 'OFF'}`;
}

function toggleGmDrawer() {
  uiState.gmDrawerOpen = !uiState.gmDrawerOpen;
  const drawer = document.getElementById('gmControlDrawer');
  if (drawer) drawer.classList.toggle('hidden', !uiState.gmDrawerOpen);
}

function setGmTab(tab) {
  uiState.activeGmTab = tab;
  const tabs = ['inspector', 'crawlers', 'bestiary', 'objects', 'skills', 'spells', 'buffs', 'debuffs', 'map'];
  tabs.forEach(t => {
    const panelId = `gmPanel${t.charAt(0).toUpperCase() + t.slice(1)}`;
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.toggle('hidden', t !== tab);
    const btn = document.getElementById(`gmTabBtn_${t}`);
    if (btn) {
      btn.className = t === tab
        ? 'gm-tab-btn px-0.5 py-1.5 rounded-lg text-[10px] font-bold bg-amber-500 text-slate-950 transition'
        : 'gm-tab-btn px-0.5 py-1.5 rounded-lg text-[10px] font-semibold bg-dungeon-850 text-slate-300 hover:bg-dungeon-800 transition';
    }
  });
  renderAllUI();
}

function setSkillSubTab(sub) {
  uiState.skillSubTab = sub;
  ['all', 'attack', 'utility'].forEach(s => {
    const btn = document.getElementById(`skillSubBtn_${s}`);
    if (!btn) return;
    btn.className = s === sub
      ? 'px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-bold'
      : 'px-2 py-1 rounded-lg bg-dungeon-950 text-slate-300 text-[11px] font-semibold';
  });
  renderSkillsCatalog();
}

function toggleGridCalibratorPopover() {
  const pop = document.getElementById('gridCalibratorPopover');
  if (!pop) return;
  pop.classList.toggle('hidden');
  if (!pop.classList.contains('hidden')) {
    syncCalibratorPopoverControls();
    syncLightCalibratorControls();
  }
}

function syncCalibratorPopoverControls() {
  const scene = getActiveScene();
  if (!scene) return;
  const gs = Number(scene.gridSize) || 56;
  const scale = Number(scene.mapScale) || 100;
  const ox = Number(scene.mapOffsetX) || 0;
  const oy = Number(scene.mapOffsetY) || 0;
  const alphaPct = Math.round((scene.gridAlpha ?? 0.2) * 100);
  const darkPct = Math.round((scene.ambientDarkness ?? 0.45) * 100);

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  setVal('calGridSizeRange', gs);
  setTxt('calGridSizeVal', `${gs} px`);
  setVal('calMapScaleRange', scale);
  setTxt('calMapScaleVal', `${scale}%`);
  setVal('calMapOffsetX', ox);
  setVal('calMapOffsetY', oy);
  setVal('calGridAlphaRange', alphaPct);
  setTxt('calGridAlphaVal', `${alphaPct}%`);
  setVal('calDarknessRange', darkPct);
  const darkLabel = darkPct <= 10 ? `Bright (${darkPct}% Dark)` : darkPct >= 85 ? `True Dark (${darkPct}%)` : `Dim (${darkPct}% Dark)`;
  setTxt('calDarknessVal', darkLabel);
}

function setSceneCalibration(prop, rawVal) {
  const scene = getActiveScene();
  if (!scene) return;
  const num = Number(rawVal);
  if (prop === 'gridAlpha' || prop === 'ambientDarkness') {
    scene[prop] = Math.max(0, Math.min(1, num / 100));
  } else {
    scene[prop] = num;
  }
  exploredMemDirty = true;
  syncCalibratorPopoverControls();
  commitStateChange();
}

function nudgeSceneCalibration(prop, delta) {
  const scene = getActiveScene();
  if (!scene) return;
  scene[prop] = (Number(scene[prop]) || (prop === 'gridSize' ? 56 : 100)) + delta;
  exploredMemDirty = true;
  syncCalibratorPopoverControls();
  commitStateChange();
}

function deleteSelectedDroppedLight() {
  const scene = getActiveScene();
  if (!scene || !uiState.selectedLightId) return;
  scene.droppedLights = (scene.droppedLights || []).filter(l => l.id !== uiState.selectedLightId);
  uiState.selectedLightId = null;
  syncLightCalibratorControls();
  commitStateChange();
  showVttToast('💨 Extinguished selected light source');
}

function clearSceneDroppedLights() {
  const scene = getActiveScene();
  if (!scene) return;
  scene.droppedLights = [];
  uiState.selectedLightId = null;
  syncLightCalibratorControls();
  commitStateChange();
  showVttToast('💨 Extinguished all dropped torches & lights');
}

function resetSceneFogOfWar() {
  const scene = getActiveScene();
  if (!scene) return;
  scene.exploredSpots = [];
  scene.ghostMarkers = [];
  exploredMemDirty = true;
  commitStateChange();
  showVttToast('🌫️ Fog of War reset to unexplored darkness');
}

function clearAllSceneWalls() {
  const scene = getActiveScene();
  if (!scene) return;
  scene.walls = [];
  visPolyCache.clear();
  exploredMemDirty = true;
  commitStateChange();
  showVttToast('🧱 Cleared all wall & door segments');
}

function clearSceneGhostMarkers() {
  const scene = getActiveScene();
  if (!scene) return;
  scene.ghostMarkers = [];
  commitStateChange();
  showVttToast('👻 Cleared last-seen ghost markers');
}

function switchMapScene(sceneId) {
  if (!appState || !sceneId) return;
  appState.activeMapId = sceneId;
  uiState.selectedTokenId = null;
  uiState.selectedLightId = null;
  exploredMemDirty = true;
  visPolyCache.clear();
  syncLoadedMapImage();
  commitStateChange();
}

function createNewMapScene() {
  if (!appState) return;
  const idx = (appState.mapScenes?.length || 0) + 1;
  const newScene = {
    id: 'scene_' + Date.now(),
    name: `New Scene ${idx}`,
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
    declaredMobAttacks: [],
    persistentEffects: [],
    tokens: []
  };
  appState.mapScenes.push(newScene);
  switchMapScene(newScene.id);
  showVttToast(`🗺️ Created ${newScene.name}`);
}

function startInlineSceneRename() {
  const sc = getActiveScene();
  const inp = document.getElementById('inlineSceneRenameInput');
  const saveBtn = document.getElementById('saveSceneRenameBtn');
  const sel = document.getElementById('mapSceneSelect');
  if (!sc || !inp) return;
  inp.value = sc.name || '';
  if (sel) sel.classList.add('hidden');
  inp.classList.remove('hidden');
  if (saveBtn) saveBtn.classList.remove('hidden');
  inp.focus();
  inp.select();
}

function syncLightCalibratorControls() {
  const scene = getActiveScene();
  const box = document.getElementById('selectedLightControls');
  if (!box || !scene) return;
  const lt = (scene.droppedLights || []).find(l => l.id === uiState.selectedLightId);
  const isDropTool = uiState.canvasTool === 'dropLight';
  if (!lt && !isDropTool) {
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  const activeCfg = lt || uiState.lightBrush;
  const hdrEl = document.getElementById('lightSettingsHeader');
  const delBtn = document.getElementById('deleteSelectedLightBtn');
  if (hdrEl) hdrEl.textContent = lt ? '🔥 Selected Light Source' : '🔥 New Light Brush Settings';
  if (delBtn) delBtn.classList.toggle('hidden', !lt);

  const bFt = activeCfg.radiusFt || 25;
  const unclippedMax = activeCfg.dimOnly ? bFt : bFt * 2;
  const curReach = (activeCfg.maxReachFt && activeCfg.maxReachFt > 0) ? Math.min(unclippedMax, activeCfg.maxReachFt) : unclippedMax;
  const angle = activeCfg.angleDeg || 360;
  const facing = activeCfg.facingDeg || 0;

  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };

  setVal('selLightColorInput', activeCfg.color || '#f97316');
  setVal('selLightRadiusInput', bFt);
  setVal('selLightAngleInput', angle);
  setTxt('selLightAngleVal', `${angle}°`);
  const facRow = document.getElementById('selLightFacingRow');
  if (facRow) facRow.classList.toggle('hidden', angle >= 360);
  setVal('selLightFacingInput', facing);
  setTxt('selLightFacingVal', formatCompassDir(facing));
  const reachEl = document.getElementById('selLightMaxReachInput');
  if (reachEl) { reachEl.max = unclippedMax; reachEl.value = curReach; }
  setTxt('selLightMaxReachVal', curReach < unclippedMax ? `${curReach}ft (Clipped)` : `Full (${unclippedMax}ft)`);
  setVal('selLightEffectSelect', resolveLightEffectMode(activeCfg));
  const brtEl = document.getElementById('selLightBrightInput');
  if (brtEl) brtEl.checked = !activeCfg.dimOnly;
}

function updateSelectedDroppedLight(prop, rawVal) {
  let normalized = rawVal;
  if (prop === 'radiusFt') normalized = Math.max(5, Math.min(120, Number(rawVal) || 25));
  else if (prop === 'angleDeg') normalized = Math.max(15, Math.min(360, Number(rawVal) || 360));
  else if (prop === 'facingDeg') normalized = ((Number(rawVal) || 0) % 360 + 360) % 360;
  else if (prop === 'maxReachFt') normalized = Math.max(5, Math.min(240, Number(rawVal) || 50));
  else if (prop === 'dimOnly') normalized = Boolean(rawVal);

  uiState.lightBrush[prop] = normalized;
  if (prop === 'lightEffect') uiState.lightBrush.flicker = normalized !== 'steady';

  const scene = getActiveScene();
  const lt = (scene?.droppedLights || []).find(l => l.id === uiState.selectedLightId);
  if (lt) {
    lt[prop] = normalized;
    if (prop === 'lightEffect') lt.flicker = normalized !== 'steady';
    if (prop === 'radiusFt' || prop === 'dimOnly') {
      const bFt = lt.radiusFt || 25;
      lt.maxReachFt = lt.dimOnly ? bFt : bFt * 2;
    }
    syncLightCalibratorControls();
    commitStateChange();
  } else {
    syncLightCalibratorControls();
  }
}

function handleInlineSceneRenameKey(e) {
  if (e.key === 'Enter') commitInlineSceneRename();
}

function commitInlineSceneRename() {
  const sc = getActiveScene();
  const inp = document.getElementById('inlineSceneRenameInput');
  const saveBtn = document.getElementById('saveSceneRenameBtn');
  const sel = document.getElementById('mapSceneSelect');
  if (sc && inp && inp.value.trim()) {
    sc.name = inp.value.trim();
    commitStateChange();
  }
  if (inp) inp.classList.add('hidden');
  if (saveBtn) saveBtn.classList.add('hidden');
  if (sel) sel.classList.remove('hidden');
}

function renameActiveMapScene(newName) {
  const sc = getActiveScene();
  if (sc && newName.trim()) {
    sc.name = newName.trim();
    commitStateChange();
  }
}

function deleteActiveMapScene() {
  if (!appState || appState.mapScenes.length <= 1) {
    showVttToast('Cannot delete the only map scene.');
    return;
  }
  appState.mapScenes = appState.mapScenes.filter(s => s.id !== appState.activeMapId);
  appState.activeMapId = appState.mapScenes[0].id;
  syncLoadedMapImage();
  commitStateChange();
}

function handleMapImageUpload(event) {
  const file = event.target.files?.[0];
  const sc = getActiveScene();
  if (!file || !sc) return;
  const reader = new FileReader();
  reader.onload = ev => {
    sc.mapImageDataUrl = ev.target.result;
    syncLoadedMapImage();
    commitStateChange();
    showVttToast('🗺️ Map image loaded');
  };
  reader.readAsDataURL(file);
}

function clearSceneMapImage() {
  const sc = getActiveScene();
  if (!sc) return;
  sc.mapImageDataUrl = null;
  syncLoadedMapImage();
  commitStateChange();
}

function updateSceneSettings() {
  const sc = getActiveScene();
  if (!sc) return;
  sc.gridSize = Number(document.getElementById('mapGridSizeInput')?.value) || 56;
  sc.mapScale = Number(document.getElementById('mapScaleInput')?.value) || 100;
  sc.mapOffsetX = Number(document.getElementById('mapOffsetXInput')?.value) || 0;
  sc.mapOffsetY = Number(document.getElementById('mapOffsetYInput')?.value) || 0;
  sc.ambientDarkness = Number(document.getElementById('mapDarknessInput')?.value) ?? 0.45;
  exploredMemDirty = true;
  commitStateChange();
}

function clearAllBoardTokens() {
  const sc = getActiveScene();
  if (!sc) return;
  sc.tokens = [];
  uiState.selectedTokenId = null;
  commitStateChange();
}

async function resetToDefaultEncounter() {
  if (typeof createAutoBackupSlot === 'function') {
    await createAutoBackupSlot('Pre-Reset');
  }
  localStorage.removeItem(STORAGE_KEY);
  appState = createInitialState();
  uiState.selectedTokenId = null;
  syncLoadedMapImage();
  commitStateChange();
  if (typeof refreshSaveStatesList === 'function') refreshSaveStatesList();
  showVttToast('↺ Reset to clean DCC arena (Auto-Backup saved)');
}

function exportSessionJson() {
  const safePayload = typeof buildSanitizedSaveSnapshot === 'function'
    ? buildSanitizedSaveSnapshot()
    : appState;
  const blob = new Blob([JSON.stringify(safePayload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `DCC_VTT_Campaign_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  showVttToast('💾 Exported sanitized Campaign JSON');
}

function toggleHostilesRailCollapse() {
  uiState.hostilesRailCollapsed = !uiState.hostilesRailCollapsed;
  const box = document.getElementById('playerHudMobs');
  const btn = document.getElementById('hostilesCollapseBtn');
  if (box) box.classList.toggle('hidden', uiState.hostilesRailCollapsed);
  if (btn) btn.textContent = uiState.hostilesRailCollapsed ? '▸' : '▾';
}

function togglePlayerHudWindow() {
  const modal = document.getElementById('floatingPlayerHudModal');
  if (!modal) return;
  modal.classList.toggle('hidden');
  renderPlayerBottomHud();
}

function renderPhaseTrackerBar() {
  const floorEl = document.getElementById('dungeonFloorText');
  if (floorEl) floorEl.textContent = appState.floor || 1;
  const roundEl = document.getElementById('roundCounterText');
  if (roundEl) roundEl.textContent = appState.round ?? 0;
  const clockEl = document.getElementById('collapseClockDisplay');
  if (clockEl) clockEl.textContent = formatCollapseClock(appState.collapseRemainingMinutes);
  const pClockEl = document.getElementById('playerCollapseClockVal');
  if (pClockEl) pClockEl.textContent = formatCollapseClock(appState.collapseRemainingMinutes);
  const shift = appState.lastClockShift;
  const recentShift = shift && shift.badgeText && (Date.now() - (shift.timestamp || 0) < 120000);
  const deltaBadge = document.getElementById('clockDeltaBadge');
  if (deltaBadge) {
    deltaBadge.classList.toggle('hidden', !recentShift);
    if (recentShift) deltaBadge.textContent = shift.badgeText;
  }
  const pActBadge = document.getElementById('playerClockActivityBadge');
  if (pActBadge) {
    if (recentShift) {
      pActBadge.textContent = shift.badgeText;
      pActBadge.className = 'text-amber-300 font-bold truncate max-w-[190px]';
    } else {
      pActBadge.textContent = 'Moves on Rests & Grinding';
      pActBadge.className = 'text-slate-400';
    }
  }

  const nextBtn = document.getElementById('nextPhaseBtn');
  if (nextBtn) {
    nextBtn.textContent = appState.round === 0 ? 'Start Combat →' : 'Next Phase →';
  }
  const expBtn = document.getElementById('toggleExplorationModeBtn');
  if (expBtn) {
    const isExp = isExplorationModeActive();
    expBtn.textContent = isExp ? '🧭 Explore: ON' : '🧭 Explore: OFF';
    expBtn.className = isExp
      ? 'px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-xs font-bold transition shrink-0'
      : 'px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-semibold transition shrink-0';
  }
  const lockBtn = document.getElementById('togglePhaseLockBtn');
  if (lockBtn) {
    const isOn = appState.phaseLockEnabled !== false;
    lockBtn.textContent = isOn ? '🔒 Phase Lock: ON' : '🔓 Phase Lock: OFF';
    lockBtn.className = isOn
      ? 'px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition'
      : 'px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs font-semibold transition';
  }
  const mmBtn = document.getElementById('toggleMinimapBtn');
  if (mmBtn) {
    const isOff = Boolean(appState.minimapOffline);
    mmBtn.textContent = isOff ? '⚠️ Minimap: OFFLINE' : '🗺️ Minimap: ON';
    mmBtn.className = isOff
      ? 'px-2.5 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/70 text-rose-200 text-xs font-bold transition animate-pulse'
      : 'px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold transition';
  }
  const mmBadge = document.getElementById('playerMinimapOfflineBadge');
  if (mmBadge) {
    mmBadge.classList.toggle('hidden', !(IS_PLAYER_WINDOW && Boolean(appState.minimapOffline)));
  }

  const pillsEl = document.getElementById('phasePillsContainer');
  if (pillsEl) {
    pillsEl.innerHTML = COMBAT_PHASES.map((p, idx) => {
      const active = appState.round > 0 && appState.phaseIndex === idx;
      if (IS_PLAYER_WINDOW) {
        return `<span class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${active ? 'bg-amber-500 text-slate-950 phase-active-glow' : 'bg-dungeon-900 text-slate-500'}">${p.short}</span>`;
      }
      return `<button onclick="setCombatPhase(${idx})" class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${active ? 'bg-amber-500 text-slate-950 phase-active-glow' : 'bg-dungeon-900 text-slate-400 hover:text-slate-200'}">${p.short}</button>`;
    }).join('');
  }

  const blackout = document.getElementById('playerSetupBlackout');
  if (blackout) blackout.classList.toggle('hidden', !(IS_PLAYER_WINDOW && appState.round === 0));

  const sceneSel = document.getElementById('mapSceneSelect');
  if (sceneSel && appState.mapScenes) {
    sceneSel.innerHTML = appState.mapScenes.map(s => `<option value="${s.id}" ${s.id === appState.activeMapId ? 'selected' : ''}>${s.name}</option>`).join('');
  }
}

function renderCrawlerPipStripHtml(tok) {
  const hm = getTokenHealthMetrics(tok);
  const shieldPips = Math.max(0, Number(tok.shieldPips) || 0);
  let html = '<div class="flex items-center gap-0.5 mt-1">';
  for (let i = 0; i < 10; i++) {
    const filled = i < hm.filledPips;
    html += `<span class="h-2 flex-1 rounded-xs border ${filled ? 'bg-emerald-400 border-emerald-200' : 'bg-slate-900 border-slate-700'}"></span>`;
  }
  for (let s = 0; s < Math.min(10, shieldPips); s++) {
    html += `<span class="h-2 w-2 rounded-xs border shield-pip-glow"></span>`;
  }
  html += '</div>';
  return html;
}

function renderPlayerBottomHud() {
  const scene = getActiveScene();
  if (!scene) return;
  const crawlers = (scene.tokens || []).filter(t => t.role === 'crawler');
  const mobs = (scene.tokens || []).filter(t => t.role === 'mob' && (!IS_PLAYER_WINDOW || !t.hiddenFromPlayers));

  const hostileBadgeEl = document.getElementById('hostileCountBadge');
  if (hostileBadgeEl) hostileBadgeEl.textContent = mobs.length;

  const mobsEl = document.getElementById('playerHudMobs');
  if (mobsEl) {
    mobsEl.innerHTML = mobs.length === 0
      ? '<span class="text-[11px] font-mono text-slate-500 italic">No active hostiles on map</span>'
      : mobs.map(m => {
          const hm = getTokenHealthMetrics(m);
          const isSel = uiState.selectedTokenId === m.id;
          return `
            <button onclick="selectToken('${m.id}')" class="flex items-center gap-2 px-2.5 py-1 rounded-xl border text-left transition shrink-0 ${isSel ? 'bg-rose-500/20 border-rose-400' : 'bg-dungeon-900 border-slate-800 hover:border-slate-700'}">
              <span class="text-base">${m.iconSymbol || '👹'}</span>
              <div>
                <div class="text-[11px] font-bold text-slate-100 leading-tight">${m.name}</div>
                <div class="w-24 h-1.5 bg-slate-950 rounded-full overflow-hidden mt-1 border border-slate-800">
                  <div class="h-full bg-rose-500" style="width:${hm.pct}%"></div>
                </div>
                ${((m.buffs && m.buffs.length) || (m.statuses && m.statuses.length)) ? `
                  <div class="flex flex-wrap gap-1 mt-1 max-w-[140px]">
                    ${(m.buffs || []).map(b => `<span onmouseenter="showEffectHoverInfo('buff', '${encodeURIComponent(String(b))}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help px-1 rounded-full text-[8px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 truncate max-w-[65px]">${String(b).replace(/^\[(?:Passive|Aura)\]\s*/i, '')}</span>`).join('')}
                    ${(m.statuses || []).map(s => `<span onmouseenter="showEffectHoverInfo('debuff', '${encodeURIComponent(String(s))}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help px-1 rounded-full text-[8px] font-semibold bg-rose-500/20 border border-rose-500/40 text-rose-200 truncate max-w-[65px]">${s}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            </button>
          `;
        }).join('');
  }

  const crawlersHtml = crawlers.length === 0
    ? '<span class="text-xs font-mono text-slate-500 italic">Deploy crawlers from the Crawlers tab →</span>'
    : crawlers.map(c => {
        const hm = getTokenHealthMetrics(c);
        const isSel = uiState.selectedTokenId === c.id;
        const illum = getIlluminationBuffForToken(c);
        return `
          <div onclick="selectToken('${c.id}')" class="cursor-pointer min-w-[185px] px-2.5 py-1.5 rounded-xl border transition shrink-0 ${isSel ? 'bg-cyan-500/15 border-cyan-400' : 'bg-dungeon-950 border-slate-800 hover:border-slate-700'}">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-xs text-slate-100 truncate">${c.iconSymbol || '⚔️'} ${c.name}</span>
              <span class="font-mono text-[10px] text-amber-300 font-bold">AP ${c.currentAp ?? 2}/${c.maxAp ?? 2}</span>
            </div>
            ${renderCrawlerPipStripHtml(c)}
            <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>HP ${hm.curHp}/${hm.maxHp}${c.shieldPips ? ` <b class="text-sky-300">+${c.shieldPips}🛡</b>` : ''}</span>
              <span class="text-indigo-300">MP ${c.currentMana ?? 0}/${c.maxMana ?? 0}</span>
            </div>
            <div class="mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${illum.badgeCls} truncate">${illum.label}</div>
            ${((c.buffs && c.buffs.length) || (c.statuses && c.statuses.length)) ? `
              <div class="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                ${(c.buffs || []).map(b => {
                  const enc = encodeURIComponent(String(b));
                  const shortName = String(b).replace(/^\[(?:Passive|Aura)\]\s*/i, '');
                  return `<span onmouseenter="showEffectHoverInfo('buff', '${enc}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 truncate max-w-[92px]">${shortName}</span>`;
                }).join('')}
                ${(c.statuses || []).map(s => {
                  const enc = encodeURIComponent(String(s));
                  return `<span onmouseenter="showEffectHoverInfo('debuff', '${enc}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-rose-500/20 border border-rose-500/40 text-rose-200 truncate max-w-[92px]">${s}</span>`;
                }).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

  const crawlersEl = document.getElementById('playerHudCrawlers');
  if (crawlersEl) crawlersEl.innerHTML = crawlersHtml;

  const floatingBody = document.getElementById('floatingPlayerHudBody');
  if (floatingBody) floatingBody.innerHTML = `<div class="flex flex-wrap gap-2">${crawlersHtml}</div>`;
}

// =========================================================================
// 8. INSPECTOR & INTERACTIVE ABILITY CASTING / TARGET RESOLUTION
// =========================================================================
function calculateWholePipDamageOutcome(tok, netDmg) {
  const hm = getTokenHealthMetrics(tok);
  const shieldPips = Math.max(0, Number(tok.shieldPips) || 0);
  const totalPipsAvailable = shieldPips + hm.filledPips;
  const pipsDestroyed = Math.min(totalPipsAvailable, Math.floor(Math.max(0, netDmg) / hm.hpPerPip));
  const effectiveHpDamage = pipsDestroyed * hm.hpPerPip;
  return {
    hpPerPip: hm.hpPerPip,
    pipsDestroyed,
    effectiveHpDamage,
    insufficientForPip: netDmg > 0 && pipsDestroyed === 0
  };
}

function adjustTokenHealth(tokenId, deltaHp) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const hm = getTokenHealthMetrics(tok);
  let remaining = deltaHp;
  if (remaining < 0 && (tok.shieldPips || 0) > 0) {
    const dmg = Math.abs(remaining);
    const absorbedPips = Math.min(tok.shieldPips, Math.floor(dmg / hm.hpPerPip));
    tok.shieldPips = Math.max(0, tok.shieldPips - absorbedPips);
    remaining = Math.min(0, remaining + absorbedPips * hm.hpPerPip);
  }
  const prevHp = hm.curHp;
  let nextHp = Math.max(0, Math.min(hm.maxHp, hm.curHp + remaining));
  if (tok.role === 'crawler' && typeof handleCrawlerZeroHpAndCockroach === 'function') {
    nextHp = handleCrawlerZeroHpAndCockroach(tok, prevHp, nextHp);
  }
  tok.currentHp = nextHp;
  const newHm = getTokenHealthMetrics(tok);
  tok.currentPips = newHm.filledPips;
  syncSwarmTokenGridSpan(tok);
  commitStateChange();
}

function adjustTokenShieldPips(tokenId, delta) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.shieldPips = Math.max(0, Math.min(20, (Number(tok.shieldPips) || 0) + delta));
  commitStateChange();
}

function adjustTokenMana(tokenId, delta) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.currentMana = Math.max(0, Math.min(tok.maxMana || 999, (Number(tok.currentMana) || 0) + delta));
  commitStateChange();
}

function adjustTokenAp(tokenId, delta) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.currentAp = Math.max(0, Math.min(tok.maxAp || 2, (Number(tok.currentAp) || 0) + delta));
  commitStateChange();
}

function setTokenGridSpan(tokenId, span) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.gridSpan = Math.max(1, Math.min(4, Number(span) || 1));
  commitStateChange();
  showVttToast(`📐 ${tok.name} footprint set to ${tok.gridSpan}×${tok.gridSpan} (${tok.gridSpan * 5}ft)`);
}

function isSameMobType(a, b) {
  if (!a || !b || a.role === 'crawler' || b.role === 'crawler') return false;
  if (a.templateId && b.templateId) return a.templateId === b.templateId;
  return String(a.name || '').trim().toLowerCase() === String(b.name || '').trim().toLowerCase();
}

function areTokensAdjacentOnGrid(a, b) {
  const spanA = Math.max(1, Math.min(4, Number(a.gridSpan) || 1));
  const spanB = Math.max(1, Math.min(4, Number(b.gridSpan) || 1));
  const reachSquares = (spanA + spanB) * 0.5 + 0.5;
  return Math.abs(a.gx - b.gx) <= reachSquares && Math.abs(a.gy - b.gy) <= reachSquares;
}

function findAdjacentSameTypeMobs(tok) {
  const scene = getActiveScene();
  if (!scene || !tok || tok.role === 'crawler') return [];
  if (getSwarmPerSquareCapacity(tok.classification) <= 0) return [];
  return (scene.tokens || []).filter(other => {
    if (other.id === tok.id) return false;
    if (!isSameMobType(tok, other)) return false;
    const otherHm = getTokenHealthMetrics(other);
    if (otherHm.curHp <= 0) return false;
    return areTokensAdjacentOnGrid(tok, other);
  });
}

function mergeAdjacentMobsIntoSwarm(tokenId) {
  const scene = getActiveScene();
  if (!scene) return;
  const tok = (scene.tokens || []).find(t => t.id === tokenId);
  if (!tok || tok.role === 'crawler') return;
  if (getSwarmPerSquareCapacity(tok.classification) <= 0) {
    showVttToast(`⚠️ ${tok.name} is Large+ and cannot merge into a swarm.`);
    return;
  }

  const adjacent = findAdjacentSameTypeMobs(tok);
  if (adjacent.length === 0) {
    showVttToast(`No adjacent ${tok.name} tokens within 5ft to merge.`);
    return;
  }

  const baseHm = getTokenHealthMetrics(tok);
  let totalUnits = baseHm.swarmCount;
  let totalCurHp = baseHm.curHp;
  const absorbedIds = new Set();

  for (const other of adjacent) {
    const oHm = getTokenHealthMetrics(other);
    if (totalUnits + oHm.swarmCount > 36) continue;
    totalUnits += oHm.swarmCount;
    totalCurHp += oHm.curHp;
    absorbedIds.add(other.id);
  }

  if (absorbedIds.size === 0) {
    showVttToast('⚠️ Swarm is already at the maximum size (×36).');
    return;
  }

  tok.swarmCount = totalUnits;
  const unitMaxHp = baseHm.baseMaxPips * baseHm.hpPerPip;
  tok.currentHp = Math.max(0, Math.min(totalUnits * unitMaxHp, totalCurHp));
  tok.currentPips = getTokenHealthMetrics(tok).filledPips;
  syncSwarmTokenGridSpan(tok);

  scene.tokens = (scene.tokens || []).filter(t => !absorbedIds.has(t.id));
  commitStateChange();
  showVttToast(`🔗 Merged ${absorbedIds.size} adjacent ${tok.name} token(s) into a ×${totalUnits} Swarm (${tok.gridSpan}×${tok.gridSpan})!`);
}

function adjustTokenSwarmCount(tokenId, delta) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok || tok.role === 'crawler') return;
  const cap = getSwarmPerSquareCapacity(tok.classification);
  if (cap <= 0 && delta > 0) {
    showVttToast(`⚠️ ${tok.name} is Large+ and cannot form multi-unit swarms.`);
    return;
  }
  const oldHm = getTokenHealthMetrics(tok);
  const nextCount = Math.max(1, Math.min(36, oldHm.swarmCount + delta));
  if (nextCount === oldHm.swarmCount) return;
  const unitMaxHp = oldHm.baseMaxPips * oldHm.hpPerPip;
  tok.swarmCount = nextCount;
  tok.currentHp = Math.max(0, Math.min(nextCount * unitMaxHp, oldHm.curHp + (nextCount - oldHm.swarmCount) * unitMaxHp));
  tok.currentPips = getTokenHealthMetrics(tok).filledPips;
  if (nextCount === 1) {
    tok.gridSpan = inferGridSpanFromClassification(tok.classification, tok.role);
  } else {
    syncSwarmTokenGridSpan(tok);
  }
  commitStateChange();
  showVttToast(`👥 ${tok.name} pack size set to ×${nextCount} (${tok.gridSpan}×${tok.gridSpan} footprint)`);
}

function adjustTokenHpPerPip(tokenId, delta) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok || tok.role === 'crawler') return;
  tok.hpPerPip = Math.max(1, (Number(tok.hpPerPip) || 2) + delta);
  const hm = getTokenHealthMetrics(tok);
  tok.currentHp = hm.filledPips * tok.hpPerPip;
  commitStateChange();
}

function toggleTokenVisibility(tokenId) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.hiddenFromPlayers = !tok.hiddenFromPlayers;
  commitStateChange();
}

function removeTokenFromMap(tokenId) {
  const sc = getActiveScene();
  if (!sc) return;
  sc.tokens = (sc.tokens || []).filter(t => t.id !== tokenId);
  if (uiState.selectedTokenId === tokenId) uiState.selectedTokenId = null;
  commitStateChange();
}

function addBuffToToken(tokenId, buffName) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok || !buffName) return;
  tok.buffs = tok.buffs || [];
  if (!tok.buffs.includes(buffName)) {
    tok.buffs.push(buffName);
    commitStateChange();
  }
}

function removeBuffFromToken(tokenId, buffName) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.buffs = (tok.buffs || []).filter(b => b !== buffName);
  commitStateChange();
}

function addStatusToToken(tokenId, statusName) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok || !statusName) return;
  if (isSwarmImmuneToSingleTargetCc(tok, statusName, false)) {
    showVttToast(`🛡️ ${tok.name} Swarm is immune to single-target CC (${statusName})!`);
    return;
  }
  tok.statuses = tok.statuses || [];
  if (!tok.statuses.includes(statusName)) {
    tok.statuses.push(statusName);
    commitStateChange();
  }
}

function isCrowdControlEffectName(name) {
  return /\b(held|prone|take\s*down|stunned|paralyzed|staggered|blinded|rooted|grappled|restrained|fear|mind\s*control|asleep|charmed|pinned|slowed)\b/i.test(String(name || ''));
}

function isSwarmImmuneToSingleTargetCc(tok, effectName, isAoe = false) {
  if (!tok || tok.role === 'crawler' || isAoe) return false;
  const hm = getTokenHealthMetrics(tok);
  if (hm.swarmCount <= 1 || hm.aliveUnits <= 1) return false;
  return isCrowdControlEffectName(effectName);
}

function removeStatusFromToken(tokenId, statusName) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  tok.statuses = (tok.statuses || []).filter(s => s !== statusName);
  commitStateChange();
}

const ABILITY_EFFECT_TYPES = [
  { id: 'auto', label: '🤖 Auto-Detect (Fallback)' },
  { id: 'attack', label: '⚔️ Attack (Hit Roll + Damage)' },
  { id: 'heal', label: '💚 Heal (Restore HP Pips)' },
  { id: 'shield', label: '🛡️ Shield (Add Shield Pips)' },
  { id: 'buff', label: '✨ Buff / Utility (Apply Buff)' },
  { id: 'debuff', label: '☣️ Debuff / Control (Apply Debuff)' },
  { id: 'light', label: '💡 Light / Torch (Illumination + Light Buff)' },
  { id: 'passive', label: '🔒 Passive (Always Active)' }
];

function normalizeAbilityEffectType(rawVal) {
  const s = String(rawVal || '').trim().toLowerCase();
  if (!s || s === 'auto') return '';
  if (s.includes('attack') || s.includes('damage')) return 'attack';
  if (s.includes('heal')) return 'heal';
  if (s.includes('shield') || s.includes('ward')) return 'shield';
  if (s.includes('debuff') || s.includes('curse') || s.includes('control')) return 'debuff';
  if (s.includes('light') || s.includes('torch') || s.includes('orb')) return 'light';
  if (s.includes('buff') || s.includes('utility')) return 'buff';
  if (s.includes('passive')) return 'passive';
  return '';
}

function updateCatalogAbilityField(kind, entryId, field, value) {
  const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
  const entry = catalog.find(e => e.id === entryId);
  if (!entry) return;
  entry[field] = value;
  if (field === 'vfxType' && !entry.vfxColor) {
    entry.vfxColor = getDefaultColorForVfx(value, entry);
  }
  commitStateChange();
}

function toggleCatalogAbilityEditor(kind, entryId) {
  const key = `${kind}:${entryId}`;
  uiState.editingAbilityKey = uiState.editingAbilityKey === key ? null : key;
  if (kind === 'skill') renderSkillsCatalog();
  else renderSpellsCatalog();
}

function renderAbilityUpgradesDropdownHtml(entry, currentRank = 0) {
  const upgrades = Array.isArray(entry?.upgrades) ? entry.upgrades.filter(Boolean) : [];
  if (upgrades.length === 0) return '';
  const r = Number(currentRank) || 0;
  let unlockedCount = 0;
  const rows = upgrades.map(u => {
    const m = String(u).match(/^Rank\s+(\d+)/i);
    const reqRank = m ? parseInt(m[1], 10) : 1;
    const isUnlocked = r > 0 && r >= reqRank;
    if (isUnlocked) unlockedCount++;
    const cls = r > 0
      ? (isUnlocked ? 'text-emerald-300 font-semibold' : 'text-slate-500')
      : 'text-slate-300';
    const prefix = r > 0 ? (isUnlocked ? '✓ ' : '🔒 ') : '• ';
    return `<div class="text-[10px] leading-snug ${cls}">${prefix}${escapeHtmlAttr(u)}</div>`;
  }).join('');

  const summaryLabel = r > 0
    ? `📈 Rank Upgrades (${unlockedCount}/${upgrades.length} unlocked)`
    : `📈 Rank Upgrades (${upgrades.length} tiers)`;

  return `
    <details class="mt-1 bg-dungeon-900/70 border border-slate-800/90 rounded-lg px-2 py-1">
      <summary class="cursor-pointer text-[9.5px] font-mono font-bold text-amber-300/90 hover:text-amber-200 select-none">${summaryLabel}</summary>
      <div class="mt-1 pt-1 border-t border-slate-800/80 space-y-1">${rows}</div>
    </details>
  `;
}

function renderAbilityCatalogEditorHtml(kind, entry) {
  const isOpen = uiState.editingAbilityKey === `${kind}:${entry.id}`;
  if (!isOpen) return '';
  const effType = normalizeAbilityEffectType(entry.effectType);
  const curVfx = inferVfxFromAbility(entry);
  const buffOptions = (appState?.buffs || []).map(b =>
    `<option value="${escapeHtmlAttr(b.name)}" ${(entry.applyBuff || '') === b.name ? 'selected' : ''}>${escapeHtmlAttr(b.name)}</option>`
  ).join('');
  const debuffOptions = (appState?.debuffs || []).map(d =>
    `<option value="${escapeHtmlAttr(d.name)}" ${(entry.applyDebuff || '') === d.name ? 'selected' : ''}>${escapeHtmlAttr(d.name)}</option>`
  ).join('');

  return `
    <div class="mt-2 pt-2 border-t border-slate-800 bg-dungeon-900/90 rounded-lg p-2 space-y-2 text-[10px] font-mono">
      <div class="text-[9.5px] font-bold uppercase tracking-wider text-amber-300">⚙️ Explicit Mechanical Rules (Overrides Auto-Detect)</div>
      <div class="grid grid-cols-2 gap-1.5">
        <label class="block">
          <span class="text-slate-400">Action Behavior:</span>
          <select onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'effectType', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100">
            ${ABILITY_EFFECT_TYPES.map(t => `<option value="${t.id === 'auto' ? '' : t.id}" ${(effType || '') === (t.id === 'auto' ? '' : t.id) ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </label>
        <label class="block">
          <span class="text-slate-400">Dice / Formula:</span>
          <input type="text" value="${escapeHtmlAttr(entry.diceFormula || '')}" placeholder="e.g. 1d8 + Int or 2" onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'diceFormula', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100" />
        </label>
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        <label class="block">
          <span class="text-slate-400">Hit Stat:</span>
          <select onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'hitStat', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100">
            <option value="" ${!entry.hitStat ? 'selected' : ''}>Auto</option>
            ${['Str', 'Int', 'Con', 'Dex', 'Cha'].map(st => `<option value="${st}" ${entry.hitStat === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </label>
        <label class="block">
          <span class="text-slate-400">Range:</span>
          <input type="text" value="${escapeHtmlAttr(entry.range || '')}" placeholder="e.g. 40 Ft / Self" onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'range', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100" />
        </label>
        <label class="block">
          <span class="text-slate-400">Mana Cost:</span>
          <input type="text" value="${escapeHtmlAttr(entry.manaCost || '')}" placeholder="0" onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'manaCost', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100" />
        </label>
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        <label class="block">
          <span class="text-emerald-300">Auto-Apply Buff:</span>
          <select onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'applyBuff', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100">
            <option value="">None</option>
            ${buffOptions}
          </select>
        </label>
        <label class="block">
          <span class="text-rose-300">Auto-Apply Debuff:</span>
          <select onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'applyDebuff', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100">
            <option value="">None</option>
            ${debuffOptions}
          </select>
        </label>
      </div>
      <div class="grid grid-cols-3 gap-1.5 items-end">
        <label class="block">
          <span class="text-amber-300">Light Radius (ft):</span>
          <input type="number" min="0" step="5" value="${Number(entry.lightRadiusFt) || 0}" onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'lightRadiusFt', Number(this.value) || 0)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100" />
        </label>
        <label class="block">
          <span class="text-cyan-300">VFX Animation:</span>
          <select onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'vfxType', this.value)" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-100">
            ${VFX_PRESET_LIBRARY.map(vp => `<option value="${vp.id}" ${curVfx.vfxType === vp.id ? 'selected' : ''}>${vp.label}</option>`).join('')}
          </select>
        </label>
        <div class="flex items-center justify-between gap-1 pb-0.5">
          <input type="color" value="${curVfx.vfxColor}" onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'vfxColor', this.value)" title="VFX Color" class="w-7 h-6 bg-transparent border-0 cursor-pointer" />
          <label class="inline-flex items-center gap-1 text-[9px] text-slate-300 cursor-pointer">
            <input type="checkbox" ${entry.ignoreLos ? 'checked' : ''} onchange="updateCatalogAbilityField('${kind}', '${entry.id}', 'ignoreLos', this.checked)" class="accent-purple-400" />
            <span>No LOS</span>
          </label>
        </div>
      </div>
    </div>
  `;
}

function computeScaledAttackDamageFormula(baseExpr, unlockedUpgrades) {
  let expr = String(baseExpr || '1d6').trim();
  const upgrades = Array.isArray(unlockedUpgrades) ? unlockedUpgrades : [];
  let extraDiceCount = 0;
  let extraDieSides = 0;

  // Match "+1d6 base damage", "+2d4 base damage", "(+1D6)", "(+1D12)" in unlocked Rank 5/10/15 upgrades
  upgrades.forEach(u => {
    const str = String(u || '');
    const mBase = str.match(/\+\s*(\d+)d(\d+)\s*base\s*damage/i) || str.match(/\(\s*\+\s*(\d+)d(\d+)[^)]*\)/i);
    if (mBase) {
      const addCnt = parseInt(mBase[1], 10);
      const sides = parseInt(mBase[2], 10);
      const baseMatch = expr.match(/(\d+)d(\d+)/i);
      if (baseMatch && parseInt(baseMatch[2], 10) === sides) {
        const curCnt = parseInt(baseMatch[1], 10);
        expr = expr.replace(/(\d+)d(\d+)/i, `${curCnt + addCnt}d${sides}`);
      } else {
        extraDiceCount += addCnt;
        extraDieSides = sides;
      }
    }
  });

  if (extraDiceCount > 0 && extraDieSides > 0) {
    expr = `${expr} + ${extraDiceCount}d${extraDieSides}`;
  }
  return expr;
}

function countUnlockedRankDamageDice(entry, unlockedUpgrades) {
  const texts = [entry?.rank1Effect || '', entry?.description || '', ...(unlockedUpgrades || [])];
  let count = 0;
  texts.forEach(t => {
    const matches = [...String(t || '').matchAll(/add\s+(\d+)\s+(?:[a-z0-9’' -]+\s+)?rank\s+damage\s+di(?:e|ce)/gi)];
    matches.forEach(m => { count += parseInt(m[1], 10) || 1; });
  });
  return count;
}

function analyzeAbilityEffects(caster, kind, entryId, rank) {
  const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
  const entry = catalog.find(e => e.id === entryId);
  if (!entry) return { entry: null, isPurePassive: false };

  const r = Math.max(1, Math.min(20, Number(rank) || 1));
  const unlocked = (entry.upgrades || []).filter(u => {
    const m = String(u).match(/^Rank\s+(\d+)/i);
    return !m || r >= parseInt(m[1], 10);
  });
  const fullText = [entry.name, entry.tags, entry.baseDamage, entry.rank1Effect, entry.description, ...unlocked].join(' | ');
  const manaCost = parseInt(String(entry.manaCost || '0').replace(/\D+/g, ''), 10) || 0;
  const explicitType = normalizeAbilityEffectType(entry.effectType);
  const explicitFormula = String(entry.diceFormula || '').trim();

  // Shield detection (explicit first, fallback to text)
  let shieldSlots = 0;
  if (explicitType === 'shield' || (!explicitType && (/\bshield\b/i.test(entry.name) || /health bar slots.*absorbing/i.test(fullText)))) {
    if (explicitFormula) {
      shieldSlots = Math.max(1, rollDccExpressionForCaster(explicitFormula, caster));
    } else {
      const allSlotMatches = [...[entry.baseDamage, entry.rank1Effect, entry.description, ...unlocked].join(' | ').matchAll(/(\d+)\s*health bar slots?/gi)];
      if (allSlotMatches.length > 0) {
        shieldSlots = parseInt(allSlotMatches[allSlotMatches.length - 1][1], 10);
      } else {
        shieldSlots = r >= 15 ? 15 : r >= 10 ? 10 : r >= 5 ? 5 : 2;
      }
    }
  }

  // Healing detection (explicit first, fallback to text)
  const isHeal = explicitType === 'heal' || (!explicitType && (/\bheal\b/i.test(entry.tags || '') || /^heal\b/i.test(entry.baseDamage || '')));
  let healDice = '';
  if (isHeal) {
    if (explicitFormula) {
      healDice = explicitFormula;
    } else {
      const hm = fullText.match(/heal\s+(\d+d\d+|\d+|cha\s*mod)/i);
      healDice = hm ? hm[1] : '1d4';
    }
  }

  // Damage detection (explicit first, fallback to text)
  const isAttack = explicitType === 'attack' || (!explicitType && !isHeal && !shieldSlots && (/attack/i.test(entry.tags || '') || /\d+d\d+/i.test(entry.baseDamage || '')));
  const rawBaseDmgExpr = isAttack ? (explicitFormula || entry.baseDamage || '1d6') : '';
  const dmgExpr = isAttack ? computeScaledAttackDamageFormula(rawBaseDmgExpr, unlocked) : '';
  const rankDamageDiceCount = isAttack ? countUnlockedRankDamageDice(entry, unlocked) : 0;
  const armorPiercing = /armor-piercing|ignores dr/i.test(fullText);
  const aoeSpec = typeof parseAbilityAoeSpec === 'function' ? parseAbilityAoeSpec(entry, unlocked) : { hasAoe: false, shape: null, primaryFt: 0, splashFt: 0 };
  const isAoe = aoeSpec.hasAoe || /area of effect|burst|cone|line|splash|blast radius/i.test(fullText);

  // Buff / Debuff / Light detection (explicit first, fallback to text)
  const detectedBuffs = [];
  const detectedDebuffs = [];
  const explicitLightFt = Math.max(0, Number(entry.lightRadiusFt) || 0);

  if (explicitType === 'light' || explicitLightFt > 0) {
    const rad = explicitLightFt || 30;
    detectedBuffs.push(`${entry.name} (${rad}ft Light)`);
  } else if (!explicitType && /\btorch\b/i.test(entry.name)) {
    detectedBuffs.push(r >= 10 ? 'Torch (40ft Light)' : 'Torch (20ft Light)');
  }

  if (entry.applyBuff) {
    String(entry.applyBuff).split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(b => {
      if (!detectedBuffs.includes(b)) detectedBuffs.push(b);
    });
  }
  if (entry.applyDebuff) {
    String(entry.applyDebuff).split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(d => {
      if (!detectedDebuffs.includes(d)) detectedDebuffs.push(d);
    });
  }

  if (!explicitType && !entry.applyBuff && !entry.applyDebuff) {
    (appState?.buffs || []).forEach(b => {
      const clean = String(b.name || '').replace(/\s*\([^)]*\)\s*/g, '').trim();
      if (clean.length > 2 && new RegExp(`\\b${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullText)) {
        if (!detectedBuffs.includes(b.name)) detectedBuffs.push(b.name);
      }
    });
    (appState?.debuffs || []).forEach(d => {
      const clean = String(d.name || '').trim();
      if (clean.length > 2 && new RegExp(`\\b${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullText)) {
        if (!detectedDebuffs.includes(d.name)) detectedDebuffs.push(d.name);
      }
    });
  }

  const isSelfOnly = /^self$/i.test(String(entry.range || '').trim());
  const rangeFt = isSelfOnly ? 0 : parseRangeFtFromText(entry.range || '5', r);
  const ignoreLos = entry.ignoreLos === true || /ignore(?:s|ing)?\s*(?:line\s*of\s*sight|los|walls?|cover)|through\s*walls?|no\s*(?:line\s*of\s*sight|los)\s*(?:required|needed)|without\s*(?:line\s*of\s*sight|los)/i.test(fullText);
  const isAuraOrPassive = explicitType === 'passive' || (!explicitType && (/\baura\b/i.test(fullText) || /\bpassive\b/i.test(entry.tags || '') || /\bpassive\b/i.test(entry.description || '')));
  const isPurePassive = explicitType === 'passive' || (!explicitType && kind === 'skill' && /\bpassive\b/i.test(entry.tags || '') && !isAttack && !isHeal && shieldSlots === 0 && detectedDebuffs.length === 0);
  const isNegativeEffect = explicitType === 'attack' || explicitType === 'debuff' || (!explicitType && (isAttack || detectedDebuffs.length > 0 || /\b(debuff|curse|hex|harm|damage|stun|slow|burn|bleed|prone|poison)\b/i.test(entry.tags || '')));
  const isPositiveEffect = explicitType === 'heal' || explicitType === 'shield' || explicitType === 'buff' || explicitType === 'light' || (!explicitType && !isNegativeEffect && (isHeal || shieldSlots > 0 || detectedBuffs.length > 0 || /\b(heal|buff|shield|protect|ward|blessing|support|utility|aid|restore|cleanse)\b/i.test(fullText)));

  return {
    entry,
    rank: r,
    manaCost,
    shieldSlots,
    isHeal,
    healDice,
    isAttack,
    dmgExpr,
    rawBaseDmgExpr,
    rankDamageDiceCount,
    armorPiercing,
    isAoe,
    aoeSpec,
    rangeFt,
    isSelfOnly,
    ignoreLos,
    isAuraOrPassive,
    isNegativeEffect,
    isPositiveEffect,
    detectedBuffs,
    detectedDebuffs,
    isPurePassive
  };
}

function toggleCrawlerAbilityIgnoreLos(casterId, kind, entryId, val) {
  const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
  const entry = catalog.find(e => e.id === entryId);
  if (!entry) return;
  entry.ignoreLos = Boolean(val);
  if (uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === casterId && uiState.previewEffectRange.entryId === entryId) {
    uiState.previewEffectRange.ignoreLos = Boolean(val);
  }
  commitStateChange();
}

function toggleEffectRangePreview(sourceTokenId, rangeFt, ignoreLos, label, entryId = '') {
  const cur = uiState.previewEffectRange;
  if (cur && cur.sourceTokenId === sourceTokenId && cur.label === label) {
    uiState.previewEffectRange = null;
  } else {
    const sc = getActiveScene();
    const srcTok = (sc?.tokens || []).find(t => t.id === sourceTokenId);
    let aoeSpec = null;
    let targetId = '';
    if (srcTok && entryId) {
      const sk = (srcTok.assignedSkills || []).find(a => a.id === entryId);
      const sp = (srcTok.assignedSpells || []).find(a => a.id === entryId);
      const kind = sp ? 'spell' : 'skill';
      const rank = sp ? (sp.rank || 1) : (sk ? (sk.rank || 1) : 1);
      const info = analyzeAbilityEffects(srcTok, kind, entryId, rank);
      if (info?.aoeSpec?.hasAoe) aoeSpec = info.aoeSpec;
      const selEl = document.getElementById(`castTarget_${sourceTokenId}_${kind}_${entryId}`)
        || document.getElementById(`playerCastTarget_${kind}_${entryId}`)
        || document.getElementById(`hotlistTarget_${uiState.activeHotlistSlotIdx}`);
      if (selEl && selEl.value) targetId = selEl.value;
      if (!targetId && sc) {
        const valid = getValidAbilityTargetsForCaster(srcTok, info, sc);
        if (valid.length > 0) targetId = valid[0].id;
      }
    }
    uiState.previewEffectRange = {
      sourceTokenId,
      rangeFt: Math.max(0, Number(rangeFt) || 5),
      ignoreLos: Boolean(ignoreLos),
      label,
      entryId,
      aoeSpec,
      targetId
    };
  }
  if (IS_PLAYER_WINDOW) renderPlayerControlDeck();
  else renderGmInspector();
}

function getValidAbilityTargetsForCaster(caster, info, scene) {
  if (!caster || !info || !scene) return [];
  if (info.isSelfOnly) return [caster];
  const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
  const blockingWalls = getBlockingWallSegments(scene);
  const cWx = (caster.gx + 0.5) * gs;
  const cWy = (caster.gy + 0.5) * gs;
  const rangeFt = Math.max(5, Number(info.rangeFt) || 5);
  const cannotTargetSelf = /cannot target self/i.test(info.entry?.limitations || '');

  return (scene.tokens || []).filter(t => {
    if (cannotTargetSelf && t.id === caster.id) return false;
    // Crawlers cannot see or target GM-hidden mobs (or mobs unseen in darkness on Player Display)
    if (t.role === 'mob' && t.hiddenFromPlayers) return false;
    if (IS_PLAYER_WINDOW && t.role === 'mob') {
      const cVis = getCrawlerVisionSources(scene, gs, blockingWalls);
      if (!isPointSeenInLightOrSight((t.gx + 0.5) * gs, (t.gy + 0.5) * gs, scene, gs, cVis, blockingWalls)) return false;
    }

    // Target role rules:
    // 1. Auras & Passives only affect friendly targets (Crawlers)
    if (info.isAuraOrPassive && t.role !== 'crawler') return false;
    // 2. Attacks / negative effects only target enemies (Mobs)
    if (!info.isAuraOrPassive && info.isNegativeEffect && t.role === 'crawler') return false;
    // 3. Active positive effects (Heal, Shield, non-aura Buffs) allow anyone visible in range/LOS!

    if (t.id === caster.id) return true;

    const span = Math.max(1, Math.min(4, Number(t.gridSpan) || 1));
    const edgeOffsetSq = (span - 1) * 0.5;
    const dx = Math.max(0, Math.abs(caster.gx - t.gx) - edgeOffsetSq);
    const dy = Math.max(0, Math.abs(caster.gy - t.gy) - edgeOffsetSq);
    if (Math.max(dx, dy) * 5 > rangeFt) return false;

    if (!info.ignoreLos && blockingWalls.length > 0) {
      const tWx = (t.gx + 0.5) * gs;
      const tWy = (t.gy + 0.5) * gs;
      if (!hasLineOfSightBetweenPoints(cWx, cWy, tWx, tWy, blockingWalls)) return false;
    }
    return true;
  });
}

function rollDccExpressionForCaster(expr, caster, critDoubleDice = false) {
  // Strip parenthetical / trailing area-of-effect or duration clauses (e.g. ", 10ft Blast radius", "(10ft Burst)", "for 2 rounds") before parsing damage
  let str = String(expr || '').trim();
  if (!str) return 0;
  str = str.split(/[,;]/)[0].replace(/\([^)]*\)/g, ' ').trim();
  let total = 0;
  const diceMatches = [...str.matchAll(/(\d+)d(\d+)/gi)];
  diceMatches.forEach(m => {
    const count = parseInt(m[1], 10) * (critDoubleDice ? 2 : 1);
    const sides = parseInt(m[2], 10);
    for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
  });
  const flatMatches = [...str.matchAll(/(?:^|\s|\+)(\d+)(?!\s*(?:d\d|ft\b|feet\b|foot\b|round|min|sec|yard|mile|inch|slot|pip))/gi)];
  flatMatches.forEach(m => { total += parseInt(m[1], 10); });

  const statKeys = ['Str', 'Int', 'Con', 'Dex', 'Cha'];
  statKeys.forEach(sk => {
    if (new RegExp(`\\b${sk}\\b`, 'i').test(str)) {
      const raw = caster?.stats?.[sk] || '10';
      const sm = String(raw).match(/(\d+)/);
      total += getDccStatModifierFromScore(sm ? parseInt(sm[1], 10) : 10);
    }
  });
  return Math.max(1, total);
}

function openAbilityCastPanel(casterId, kind, entryId) {
  const caster = getActiveScene()?.tokens.find(t => t.id === casterId);
  if (!caster) return;
  const listKey = kind === 'skill' ? 'assignedSkills' : 'assignedSpells';
  const learned = (caster[listKey] || []).find(a => a.id === entryId);
  const rank = learned ? learned.rank : 1;
  const info = analyzeAbilityEffects(caster, kind, entryId, rank);
  if (!info.entry || info.isPurePassive) return;

  if (caster.role === 'crawler' && ((caster.statuses || []).includes('Dying') || getTokenHealthMetrics(caster).curHp <= 0)) {
    showVttToast(`💀 ${caster.name} is Dying (0 HP) and cannot take actions!`);
    return;
  }
  if (uiState.autoMoveAp && (appState?.round || 0) > 0 && caster.role === 'crawler' && (caster.currentAp ?? 0) <= 0) {
    showVttToast(`⚠️ ${caster.name} has 0 AP remaining this round!`);
    return;
  }

  const scene = getActiveScene();
  const validTargets = getValidAbilityTargetsForCaster(caster, info, scene);
  const selEl = document.getElementById(`castTarget_${casterId}_${kind}_${entryId}`);
  const requestedId = selEl ? selEl.value : '';
  const target = validTargets.find(t => t.id === requestedId) || validTargets[0];
  if (!target) {
    showVttToast(`⚠️ No visible target in range/LOS for ${info.entry.name} (${info.rangeFt}ft)!`);
    return;
  }
  const targetId = target.id;
  const rollMode = uiState.combatRollMode || 'normal';
  const atkCheck = info.isAttack ? rollCrawlerD20AttackCheck(caster, target, info, rollMode) : null;
  let rolledValue = 0;
  if (info.shieldSlots > 0) rolledValue = info.shieldSlots;
  else if (info.isHeal) rolledValue = rollDccExpressionForCaster(info.healDice, caster);
  else if (info.isAttack) rolledValue = rollDccExpressionForCaster(info.dmgExpr, caster, Boolean(atkCheck?.crit));

  uiState.activeCastPanel = {
    casterId,
    kind,
    entryId,
    targetId,
    rolledValue,
    atkCheck,
    rollMode,
    spendMana: info.manaCost > 0,
    applyBuffs: [...info.detectedBuffs],
    applyDebuffs: [...info.detectedDebuffs]
  };
  executeAbilityCastResolution();
}

function rerollActiveCastValue() {
  const panel = uiState.activeCastPanel;
  if (!panel) return;
  const caster = getActiveScene()?.tokens.find(t => t.id === panel.casterId);
  const target = getActiveScene()?.tokens.find(t => t.id === panel.targetId) || caster;
  const learned = (caster?.[panel.kind === 'skill' ? 'assignedSkills' : 'assignedSpells'] || []).find(a => a.id === panel.entryId);
  const info = analyzeAbilityEffects(caster, panel.kind, panel.entryId, learned?.rank || 1);
  if (info.isHeal) panel.rolledValue = rollDccExpressionForCaster(info.healDice, caster);
  else if (info.isAttack) {
    panel.rolledValue = rollDccExpressionForCaster(info.dmgExpr, caster);
    panel.atkCheck = rollCrawlerD20AttackCheck(caster, target, info);
  }
  renderGmInspector();
}

function getFlatNumericDc(rawStr, fallback = 12) {
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const str = String(rawStr || fallback).trim();
  const baseMatch = str.match(/^(\d+)/);
  let total = baseMatch ? parseInt(baseMatch[1], 10) : fallback;
  if (/\+\s*F\b/i.test(str)) total += floorNum;
  const swarmMatch = str.match(/\+(\d+)\s*Swarm/i);
  if (swarmMatch) total += parseInt(swarmMatch[1], 10);
  return total;
}

function evaluateDccCheckOutcome(naturalRoll, totalRoll, targetDc) {
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  if (naturalRoll === 1) {
    return { tier: 'Critical Fail', success: false, crit: false, amazing: false, nearMiss: false, majorFail: true, critFail: true, dmgMod: 0, floorNum };
  }
  if (naturalRoll === 20) {
    // Ch. 2 p. 79: Nat 20 doubles base damage dice (no extra Floor mod on top of Crit dice)
    return { tier: 'Critical Hit', success: true, crit: true, amazing: false, nearMiss: false, majorFail: false, critFail: false, dmgMod: 0, floorNum };
  }
  const diff = totalRoll - targetDc;
  if (diff >= 10) {
    return { tier: 'Amazing Success', success: true, crit: false, amazing: true, nearMiss: false, majorFail: false, critFail: false, dmgMod: floorNum, floorNum };
  }
  if (diff >= 0) {
    return { tier: 'Standard Success', success: true, crit: false, amazing: false, nearMiss: false, majorFail: false, critFail: false, dmgMod: 0, floorNum };
  }
  if (diff <= -10) {
    return { tier: 'Major Fail', success: false, crit: false, amazing: false, nearMiss: false, majorFail: true, critFail: false, dmgMod: floorNum, floorNum };
  }
  if (diff >= -2) {
    return { tier: 'Near Miss Fail', success: false, crit: false, amazing: false, nearMiss: true, majorFail: false, critFail: false, dmgMod: 0, floorNum };
  }
  return { tier: 'Standard Fail', success: false, crit: false, amazing: false, nearMiss: false, majorFail: false, critFail: false, dmgMod: 0, floorNum };
}

function getCrawlerAbilityAttackMod(caster, info) {
  const explicitStat = String(info?.entry?.hitStat || '').trim();
  const text = `${info?.entry?.tags || ''} ${info?.entry?.baseDamage || ''}`;
  let statKey = ['Str', 'Int', 'Con', 'Dex', 'Cha'].includes(explicitStat) ? explicitStat : 'Str';
  if (!['Str', 'Int', 'Con', 'Dex', 'Cha'].includes(explicitStat)) {
    if (/\bcha\b|charisma/i.test(text)) statKey = 'Cha';
    else if (/\bdex\b|dexterity|ranged/i.test(text) || (!info?.entry?.manaCost && (Number(info?.rangeFt) || 5) > 10)) statKey = 'Dex';
    else if (/\bint\b|intelligence/i.test(text) || info?.entry?.manaCost) statKey = 'Int';
    else if (/\bcon\b|constitution/i.test(text)) statKey = 'Con';
  }
  const raw = caster?.stats?.[statKey] || '10';
  const m = String(raw).match(/(\d+)/);
  return { statKey, mod: getDccStatModifierFromScore(m ? parseInt(m[1], 10) : 10) };
}

function getEffectiveMobEvadeNumeric(entity) {
  if (!entity) return 12;
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const statusMod = getEntityStatusEvadeModifier(entity);
  const hm = getTokenHealthMetrics(entity);
  const swarmPenalty = (hm.swarmCount > 1 && hm.aliveUnits >= 2) ? -Math.floor(hm.aliveUnits / 2) : 0;
  const rawEvade = String(entity.evade || '12+F').trim();
  const baseMatch = rawEvade.match(/^(\d+)/);
  if (baseMatch) {
    const baseVal = parseInt(baseMatch[1], 10);
    const hasFloor = /\+\s*F\b/i.test(rawEvade) || !/[+-]/.test(rawEvade);
    return baseVal + (hasFloor ? floorNum : 0) + statusMod + swarmPenalty;
  }
  return getFlatNumericDc(rawEvade, 12) + statusMod + swarmPenalty;
}

function rollCrawlerD20AttackCheck(caster, target, info, manualMode = 'normal') {
  const eff = typeof resolveEffectiveAttackRollMode === 'function'
    ? resolveEffectiveAttackRollMode(caster, target, info, manualMode)
    : { mode: manualMode, reasons: [] };
  const d20 = typeof rollD20WithMode === 'function'
    ? rollD20WithMode(eff.mode)
    : { nat: Math.floor(Math.random() * 20) + 1, rollText: '', mode: 'normal' };
  const nat = d20.nat;
  const rank = Math.max(0, Number(info?.rank) || 0);
  const { statKey, mod } = getCrawlerAbilityAttackMod(caster, info);
  const total = nat + rank + mod;
  const targetDc = target.role === 'crawler'
    ? 10 + (parseInt(getEffectiveEvadeDisplay(target), 10) || 0)
    : getEffectiveMobEvadeNumeric(target);
  const outcome = evaluateDccCheckOutcome(nat, total, targetDc);
  return {
    nat,
    rollText: d20.rollText || `d20 (${nat})`,
    rollMode: eff.mode,
    modeReasons: eff.reasons,
    rank,
    mod,
    statKey,
    total,
    targetDc,
    ...outcome
  };
}

function rollCrawlerD20SkillCheck(caster, info, manualMode = 'normal') {
  const d20 = typeof rollD20WithMode === 'function'
    ? rollD20WithMode(manualMode)
    : { nat: Math.floor(Math.random() * 20) + 1, rollText: '', mode: 'normal' };
  const nat = d20.nat;
  const rank = Math.max(0, Number(info?.rank) || 0);
  const { statKey, mod } = getCrawlerAbilityAttackMod(caster, info);
  const total = nat + rank + mod;
  return { nat, rollText: d20.rollText || `d20 (${nat})`, rollMode: d20.mode, rank, mod, statKey, total };
}

function rollCrawlerEvadeForMobAttack(crawler, flatHitDc) {
  const nat = Math.floor(Math.random() * 20) + 1;
  const evadeBonus = parseInt(getEffectiveEvadeDisplay(crawler), 10) || 0;
  const total = nat + evadeBonus;
  const outcome = evaluateDccCheckOutcome(nat, total, flatHitDc);
  return {
    crawlerId: crawler.id,
    crawlerName: crawler.name,
    iconSymbol: crawler.iconSymbol || '⚔️',
    attemptEvade: true,
    nat,
    evadeBonus,
    total,
    flatHitDc,
    ...outcome
  };
}

let lastAnimatedDiceBroadcastId = null;
let diceBannerAutoFadeTimer = null;
let diceBannerFadedOutId = null;

function scheduleDiceBannerAutoFade(broadcastId, delayMs = 4500) {
  if (diceBannerAutoFadeTimer) {
    clearTimeout(diceBannerAutoFadeTimer);
    diceBannerAutoFadeTimer = null;
  }
  if (!broadcastId) return;
  diceBannerAutoFadeTimer = setTimeout(() => {
    const el = document.getElementById('liveDiceRollBanner');
    if (!el || el.classList.contains('hidden')) return;
    if (uiState.showRollHistory) return;
    const activeData = appState?.lastDiceBroadcast;
    if (!activeData || activeData.id !== broadcastId) return;
    diceBannerFadedOutId = broadcastId;
    el.style.transition = 'opacity 0.55s ease, transform 0.55s ease';
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -10px) scale(0.97)';
    setTimeout(() => {
      const checkEl = document.getElementById('liveDiceRollBanner');
      if (checkEl && !uiState.showRollHistory && appState?.lastDiceBroadcast?.id === broadcastId) {
        checkEl.classList.add('hidden');
        checkEl.style.opacity = '';
        checkEl.style.transform = '';
      }
    }, 560);
  }, delayMs);
}

function detectDiceFlareLevel(data) {
  if (!data) return 'standard';
  if (data.flareLevel) return data.flareLevel;
  const allText = [
    data.title,
    data.subtitle,
    ...(data.rolls || []).flatMap(r => [r.resultLabel, r.playerResultLabel, r.formulaText, r.playerFormulaText])
  ].join(' | ');
  if (/critical\s*success|critical\s*hit|nat\s*20/i.test(allText)) return 'crit';
  if (/great\s*success|amazing\s*success/i.test(allText)) return 'great';
  return 'standard';
}

function playSuccessChime(level) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = level === 'crit' ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = level === 'crit' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.001, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.065 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.065 + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.36);
    });
  } catch (_) {}
}

function spawnDiceBannerParticles(bannerEl, level) {
  if (!bannerEl || level === 'standard') return;
  const count = level === 'crit' ? 28 : 16;
  const palette = level === 'crit'
    ? ['#fde047', '#f59e0b', '#fb923c', '#ffffff', '#38bdf8']
    : ['#34d399', '#22d3ee', '#a7f3d0', '#fde047'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'roll-spark-particle';
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
    const dist = (level === 'crit' ? 75 : 52) + Math.random() * 65;
    const dx = Math.round(Math.cos(angle) * dist) + 'px';
    const dy = Math.round(Math.sin(angle) * dist) + 'px';
    const size = (level === 'crit' ? 5 : 4) + Math.floor(Math.random() * 4);
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = (20 + Math.random() * 60) + '%';
    p.style.top = (25 + Math.random() * 50) + '%';
    p.style.background = palette[i % palette.length];
    p.style.boxShadow = `0 0 8px ${palette[i % palette.length]}`;
    p.style.setProperty('--dx', dx);
    p.style.setProperty('--dy', dy);
    bannerEl.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

function broadcastDiceRollEvent(payload) {
  if (!appState) return;
  const ev = {
    id: 'roll_' + Date.now(),
    timestamp: Date.now(),
    ...payload
  };
  appState.lastDiceBroadcast = ev;
  appState.diceRollHistory = Array.isArray(appState.diceRollHistory) ? appState.diceRollHistory : [];
  appState.diceRollHistory.unshift(ev);
  if (appState.diceRollHistory.length > 10) appState.diceRollHistory = appState.diceRollHistory.slice(0, 10);
}

function dismissLiveDiceBanner() {
  if (diceBannerAutoFadeTimer) {
    clearTimeout(diceBannerAutoFadeTimer);
    diceBannerAutoFadeTimer = null;
  }
  const el = document.getElementById('liveDiceRollBanner');
  if (el) {
    el.classList.add('hidden');
    el.style.opacity = '';
    el.style.transform = '';
  }
  if (appState) {
    appState.lastDiceBroadcast = null;
    commitStateChange();
  }
}

function renderLiveDiceBroadcastBanner() {
  const el = document.getElementById('liveDiceRollBanner');
  if (!el) return;
  const historyList = Array.isArray(appState?.diceRollHistory) ? appState.diceRollHistory : [];
  const data = appState?.lastDiceBroadcast || (uiState.showRollHistory ? historyList[0] : null);
  if (!data) {
    el.classList.add('hidden');
    el.style.opacity = '';
    el.style.transform = '';
    lastAnimatedDiceBroadcastId = null;
    return;
  }

  if (appState?.lastDiceBroadcast && data.id === diceBannerFadedOutId && !uiState.showRollHistory) {
    el.classList.add('hidden');
    return;
  }

  el.style.transition = '';
  el.style.opacity = '';
  el.style.transform = '';

  const flare = detectDiceFlareLevel(data);
  const isNewBroadcast = data.id && data.id !== lastAnimatedDiceBroadcastId;

  if (flare === 'crit') {
    el.className = `fixed top-28 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-lg bg-gradient-to-br from-amber-950/95 via-dungeon-900/95 to-orange-950/95 border-2 border-yellow-300 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md overflow-hidden ${isNewBroadcast ? 'banner-anim-crit' : ''}`;
  } else if (flare === 'great') {
    el.className = `fixed top-28 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-lg bg-gradient-to-br from-emerald-950/95 via-dungeon-900/95 to-cyan-950/95 border-2 border-emerald-400 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md overflow-hidden ${isNewBroadcast ? 'banner-anim-great' : ''}`;
  } else {
    el.className = `fixed top-28 left-1/2 -translate-x-1/2 z-50 w-[92vw] max-w-lg bg-dungeon-900/95 border-2 border-amber-400/70 rounded-2xl p-3 shadow-2xl backdrop-blur-md overflow-hidden ${isNewBroadcast ? 'banner-anim-standard' : ''}`;
  }

  const rowsHtml = (data.rolls || []).map(r => {
    const txtCheck = `${r.resultLabel || ''} ${r.playerResultLabel || ''}`;
    const isRowCrit = /critical\s*success|critical\s*hit/i.test(txtCheck);
    const isRowGreat = /great\s*success|amazing\s*success/i.test(txtCheck);
    let badgeCls = r.hit
      ? 'bg-rose-500/25 border-rose-400/50 text-rose-200'
      : 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200';
    if (isRowCrit) {
      badgeCls = 'bg-gradient-to-r from-yellow-400 to-amber-500 border-yellow-200 text-slate-950 font-black shadow-lg shadow-amber-500/40';
    } else if (isRowGreat) {
      badgeCls = 'bg-gradient-to-r from-emerald-400 to-cyan-400 border-emerald-200 text-slate-950 font-extrabold shadow-md shadow-emerald-500/30';
    }
    const formulaShown = IS_PLAYER_WINDOW && r.playerFormulaText !== undefined ? r.playerFormulaText : r.formulaText;
    const resultShown = IS_PLAYER_WINDOW && r.playerResultLabel !== undefined ? r.playerResultLabel : r.resultLabel;
    return `
      <div class="bg-dungeon-950/90 border ${isRowCrit ? 'border-yellow-400/60' : isRowGreat ? 'border-emerald-400/50' : 'border-slate-800'} rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs relative z-10">
        <div class="min-w-0">
          <div class="font-bold text-slate-100 truncate">${r.targetName}</div>
          <div class="text-[10px] font-mono text-slate-300">${formulaShown}</div>
        </div>
        <span class="px-2.5 py-0.5 rounded-lg border font-mono font-bold text-[10px] shrink-0 ${badgeCls}">
          ${resultShown}
        </span>
      </div>
    `;
  }).join('');

  const subtitleShown = IS_PLAYER_WINDOW && data.playerSubtitle !== undefined ? data.playerSubtitle : data.subtitle;
  const kickerHtml = flare === 'crit'
    ? `<div class="text-[10px] font-mono uppercase tracking-widest text-yellow-300 font-black flex items-center gap-1">🔥 SYSTEM AI // CRITICAL SUCCESS!</div>`
    : flare === 'great'
      ? `<div class="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-extrabold flex items-center gap-1">⚡ SYSTEM AI // GREAT SUCCESS!</div>`
      : `<div class="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">🎲 System AI // Combat Roll Resolution</div>`;

  el.innerHTML = `
    ${flare !== 'standard' ? '<div class="banner-shimmer-bar"></div>' : ''}
    <div class="flex items-start justify-between gap-2 border-b ${flare === 'crit' ? 'border-yellow-400/35' : flare === 'great' ? 'border-emerald-400/35' : 'border-slate-800'} pb-2 mb-2 relative z-10">
      <div>
        ${kickerHtml}
        <div class="font-bold text-sm ${flare === 'crit' ? 'text-yellow-100' : 'text-slate-100'}">${data.title}</div>
        ${subtitleShown ? `<div class="text-[11px] font-mono ${flare === 'crit' ? 'text-amber-200' : flare === 'great' ? 'text-emerald-200' : 'text-cyan-300'}">${subtitleShown}</div>` : ''}
      </div>
      <div class="flex items-center gap-1 shrink-0">
        ${historyList.length > 1 ? `<button type="button" onclick="toggleDiceRollHistory()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono font-bold">📜 ${uiState.showRollHistory ? 'Hide' : `History (${historyList.length})`}</button>` : ''}
        ${!IS_PLAYER_WINDOW ? `<button onclick="dismissLiveDiceBanner()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">✕</button>` : (uiState.showRollHistory && !appState?.lastDiceBroadcast ? `<button onclick="toggleDiceRollHistory()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold">✕</button>` : '')}
      </div>
    </div>
    <div class="space-y-1.5 relative z-10">${rowsHtml}</div>
    ${uiState.showRollHistory && historyList.length > 1 ? `
      <div class="mt-2 pt-2 border-t border-slate-800/90 space-y-1 max-h-44 overflow-y-auto relative z-10">
        <div class="text-[9.5px] font-mono uppercase text-cyan-400 font-bold">📜 Recent Rolls (Last ${historyList.length})</div>
        ${historyList.slice(1).map(h => {
          const firstRow = (h.rolls || [])[0];
          const resTxt = firstRow ? (IS_PLAYER_WINDOW && firstRow.playerResultLabel !== undefined ? firstRow.playerResultLabel : firstRow.resultLabel) : '';
          return `
            <div class="bg-dungeon-950/80 border border-slate-800/80 rounded-lg px-2 py-1 flex items-center justify-between gap-2 text-[10px]">
              <span class="font-semibold text-slate-300 truncate">${escapeHtmlAttr(h.title || 'Roll')}</span>
              <span class="font-mono text-amber-300 shrink-0">${escapeHtmlAttr(resTxt)}</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : ''}
  `;
  el.classList.remove('hidden');

  if (isNewBroadcast) {
    lastAnimatedDiceBroadcastId = data.id;
    if (appState?.lastDiceBroadcast?.id === data.id) {
      diceBannerFadedOutId = null;
      scheduleDiceBannerAutoFade(data.id, 4500);
    }
    if (flare !== 'standard') {
      spawnDiceBannerParticles(el, flare);
      playSuccessChime(flare);
    }
  }
}

function detectDebuffsFromText(text) {
  const found = [];
  const src = String(text || '');
  (appState?.debuffs || []).forEach(d => {
    const clean = String(d.name || '').trim();
    if (clean.length > 2 && new RegExp(`\\b${clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(src)) {
      if (!found.includes(d.name)) found.push(d.name);
    }
  });
  return found;
}

function parseAttackConditionalDebuffs(atk) {
  const fullText = `${atk?.name || ''} ${atk?.special || ''} ${atk?.damage || ''}`;
  const names = detectDebuffsFromText(fullText);
  const triggerMode = /major\s*fail|crit(?:ical)?\s*fail/i.test(fullText)
    ? 'majorFail'
    : (/standard\s*fail|fail\s*evade/i.test(fullText) ? 'anyFail' : 'onHit');
  return names.map(name => ({ name, triggerMode }));
}

function getCrawlerSkillRank(crawler, skillNameRegex) {
  const found = (crawler?.assignedSkills || []).find(s => skillNameRegex.test(String(s.name || '').trim()));
  return found ? Math.max(1, Number(found.rank) || 1) : 0;
}

function getCrawlerStatMod(crawler, statKey) {
  const raw = crawler?.stats?.[statKey] || '10';
  const m = String(raw).match(/(\d+)/);
  return getDccStatModifierFromScore(m ? parseInt(m[1], 10) : 10);
}

function findEligibleCatchersForTarget(targetCrawler, allCrawlers, isAoe) {
  if (!targetCrawler || isAoe) return [];
  const scene = getActiveScene();
  const gs = Math.max(16, Math.min(240, Number(scene?.gridSize) || 56));
  const blockingWalls = getBlockingWallSegments(scene);
  return (allCrawlers || []).filter(ally => {
    if (ally.id === targetCrawler.id) return false;
    const rank = getCrawlerSkillRank(ally, /^catcher$/i);
    if (rank <= 0) return false;
    // Catcher can leap into an adjacent space (or 10ft Step + adjacent = up to 15ft / 3 squares)
    const distSquares = Math.max(Math.abs((ally.gx ?? 0) - (targetCrawler.gx ?? 0)), Math.abs((ally.gy ?? 0) - (targetCrawler.gy ?? 0)));
    if (distSquares > 3) return false;
    if (blockingWalls.length > 0 && !hasLineOfSightBetweenPoints((ally.gx + 0.5) * gs, (ally.gy + 0.5) * gs, (targetCrawler.gx + 0.5) * gs, (targetCrawler.gy + 0.5) * gs, blockingWalls)) {
      return false;
    }
    return true;
  }).map(ally => ({
    id: ally.id,
    name: ally.name,
    iconSymbol: ally.iconSymbol || '⚔️',
    rank: getCrawlerSkillRank(ally, /^catcher$/i)
  }));
}

function canCrawlerShieldBlockAttack(crawler, atk) {
  const rank = getCrawlerSkillRank(crawler, /^shield\s*block$/i);
  const hasShieldPips = (Number(crawler?.shieldPips) || 0) > 0;
  if (rank <= 0 && !hasShieldPips) return false;
  const text = `${atk?.name || ''} ${atk?.damage || ''} ${atk?.special || ''}`;
  const isAoe = /area of effect|burst|cone|line|splash|blast radius/i.test(text);
  if (isAoe) return false;
  const isMagic = /necrotic|fire|ice|electric|sonic|psychic|force|holy|radiant|spell|magic/i.test(text);
  if (isMagic && rank < 5) return false;
  return true;
}

function doesMobAttackIgnoreLos(atk) {
  if (!atk) return false;
  if (atk.ignoreLos === true) return true;
  const text = `${atk.name || ''} ${atk.special || ''} ${atk.damage || ''} ${atk.tags || ''}`;
  return /ignore(?:s|ing)?\s*(?:line\s*of\s*sight|los|walls?|cover)|through\s*walls?|no\s*(?:line\s*of\s*sight|los)\s*(?:required|needed)|without\s*(?:line\s*of\s*sight|los)/i.test(text);
}

function toggleMobAttackIgnoreLos(mobId, atkIdx, val) {
  const scene = getActiveScene();
  const mob = scene?.tokens.find(t => t.id === mobId);
  if (!mob || !Array.isArray(mob.attacks) || !mob.attacks[atkIdx]) return;
  mob.attacks[atkIdx].ignoreLos = Boolean(val);
  commitStateChange();
}

function getMobAttackInRangeCrawlers(mob, atk, scene) {
  const span = Math.max(1, Math.min(4, Number(mob.gridSpan) || 1));
  const edgeOffsetSq = (span - 1) * 0.5;
  const rangeFt = Number(atk.rangeFt) || 5;
  const gs = Math.max(16, Math.min(240, Number(scene?.gridSize) || 56));
  const blockingWalls = getBlockingWallSegments(scene);
  const ignoreLos = doesMobAttackIgnoreLos(atk);
  const mobWx = (mob.gx + 0.5) * gs;
  const mobWy = (mob.gy + 0.5) * gs;

  return (scene?.tokens || []).filter(c => {
    if (c.id === mob.id || c.role !== 'crawler') return false;
    const dx = Math.max(0, Math.abs(mob.gx - c.gx) - edgeOffsetSq);
    const dy = Math.max(0, Math.abs(mob.gy - c.gy) - edgeOffsetSq);
    if (Math.max(dx, dy) * 5 > rangeFt) return false;
    if (!ignoreLos && blockingWalls.length > 0) {
      const cWx = (c.gx + 0.5) * gs;
      const cWy = (c.gy + 0.5) * gs;
      if (!hasLineOfSightBetweenPoints(mobWx, mobWy, cWx, cWy, blockingWalls)) return false;
    }
    return true;
  });
}

function getMobAttackLosBlockedCrawlers(mob, atk, scene) {
  if (doesMobAttackIgnoreLos(atk)) return [];
  const span = Math.max(1, Math.min(4, Number(mob.gridSpan) || 1));
  const edgeOffsetSq = (span - 1) * 0.5;
  const rangeFt = Number(atk.rangeFt) || 5;
  const gs = Math.max(16, Math.min(240, Number(scene?.gridSize) || 56));
  const blockingWalls = getBlockingWallSegments(scene);
  if (blockingWalls.length === 0) return [];
  const mobWx = (mob.gx + 0.5) * gs;
  const mobWy = (mob.gy + 0.5) * gs;

  return (scene?.tokens || []).filter(c => {
    if (c.id === mob.id || c.role !== 'crawler') return false;
    const dx = Math.max(0, Math.abs(mob.gx - c.gx) - edgeOffsetSq);
    const dy = Math.max(0, Math.abs(mob.gy - c.gy) - edgeOffsetSq);
    if (Math.max(dx, dy) * 5 > rangeFt) return false;
    const cWx = (c.gx + 0.5) * gs;
    const cWy = (c.gy + 0.5) * gs;
    return !hasLineOfSightBetweenPoints(mobWx, mobWy, cWx, cWy, blockingWalls);
  });
}

function executeSingleClickMobAttack(mobId, atkIdx) {
  const scene = getActiveScene();
  const mob = scene?.tokens.find(t => t.id === mobId);
  if (!mob) return;
  const attacks = getEffectiveTokenAttacks(mob);
  const atk = attacks[atkIdx];
  if (!atk) return;

  const inRange = getMobAttackInRangeCrawlers(mob, atk, scene);
  if (inRange.length === 0) {
    const losBlocked = getMobAttackLosBlockedCrawlers(mob, atk, scene);
    if (losBlocked.length > 0) {
      showVttToast(`🧱 ${atk.name} blocked by wall/closed door (${losBlocked.map(c => c.name).join(', ')} out of LOS)!`);
    } else {
      showVttToast(`⚠️ No Crawlers within ${atk.rangeFt || 5}ft for ${atk.name}!`);
    }
    return;
  }

  const selectedTargets = inRange.filter(c => {
    const chk = document.getElementById(`mobAtkHitChk_${mobId}_${atkIdx}_${c.id}`);
    return chk ? chk.checked : true;
  });

  if (selectedTargets.length === 0) {
    showVttToast('⚠️ Check at least one target to execute the attack!');
    return;
  }

  const flatHitDc = getFlatNumericDc(atk.hitBonus, 12);
  const baseDmgRoll = rollDccExpressionForCaster(atk.damage || '1d6', mob);
  const fullText = `${atk.name} ${atk.damage || ''} ${atk.special || ''}`;
  const armorPiercing = /armor-piercing|ignores dr/i.test(fullText);
  const isAoe = /area of effect|burst|cone|line|splash|blast radius/i.test(fullText);
  const condDebuffs = parseAttackConditionalDebuffs(atk);
  const summaryParts = [];
  const broadcastRolls = [];

  selectedTargets.forEach(origTarget => {
    const evadeChk = document.getElementById(`mobAtkEvadeChk_${mobId}_${atkIdx}_${origTarget.id}`);
    const blockChk = document.getElementById(`mobAtkBlockChk_${mobId}_${atkIdx}_${origTarget.id}`);
    const catcherSel = document.getElementById(`mobAtkCatcherSel_${mobId}_${atkIdx}_${origTarget.id}`);

    const catcherId = catcherSel && catcherSel.value ? catcherSel.value : '';
    const catcherTok = catcherId ? (scene.tokens || []).find(t => t.id === catcherId) : null;
    const receiver = catcherTok || origTarget;
    const isIntercepted = Boolean(catcherTok);

    const doEvade = !isIntercepted && Boolean(evadeChk && evadeChk.checked);
    const doBlock = !isIntercepted && Boolean(blockChk && blockChk.checked);

    let evaded = false;
    let isCritHit = false;
    let isMajorFail = false;
    let floorDmgBonus = 0;
    let rollNote = `No reaction vs Flat ${flatHitDc}`;

    if (isIntercepted) {
      const cRank = getCrawlerSkillRank(catcherTok, /^catcher$/i);
      const bonusDr = cRank >= 15 ? 15 : cRank >= 10 ? 10 : cRank >= 5 ? 5 : 0;
      const baseDr = armorPiercing ? 0 : getEffectiveTokenDr(catcherTok);
      const totalDr = baseDr + bonusDr;
      const netDmg = Math.max(0, baseDmgRoll - totalDr);
      const pipOut = calculateWholePipDamageOutcome(catcherTok, netDmg);
      if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(catcherTok.id, -pipOut.effectiveHpDamage);

      const appliedDebs = [];
      if (cRank < 15) {
        condDebuffs.forEach(cd => {
          if (cd.triggerMode === 'onHit') {
            catcherTok.statuses = catcherTok.statuses || [];
            if (!catcherTok.statuses.includes(cd.name)) catcherTok.statuses.push(cd.name);
            appliedDebs.push(`+${cd.name}`);
          }
        });
      }

      const pipInfoStr = pipOut.pipsDestroyed > 0
        ? `${pipOut.effectiveHpDamage} dmg / ${pipOut.pipsDestroyed} ${pipOut.pipsDestroyed === 1 ? 'Pip' : 'Pips'}`
        : `0 dmg (${netDmg} < ${pipOut.hpPerPip} HP/Pip — Not Enough for 1 Pip)`;
      const resLabel = `INTERCEPTED by ${catcherTok.name} • ${pipInfoStr} (${totalDr} DR${cRank >= 15 ? ', Debuff Immune' : ''})${appliedDebs.length ? ` ${appliedDebs.join(' ')}` : ''}`;
      summaryParts.push(`${origTarget.name} → ${resLabel}`);
      broadcastRolls.push({
        targetName: `${origTarget.iconSymbol || '⚔️'} ${origTarget.name} (🛡️ Catcher: ${catcherTok.name})`,
        formulaText: `${catcherTok.name} leaped in (Rank ${cRank} Catcher: +${bonusDr} DR) vs Flat Hit ${flatHitDc}`,
        playerFormulaText: `${catcherTok.name} leaped in to intercept the attack!`,
        resultLabel: resLabel,
        playerResultLabel: `INTERCEPTED by ${catcherTok.name}${appliedDebs.length ? ` (${appliedDebs.join(', ')})` : ''}`,
        hit: true
      });
      return;
    }

    let aoeHalfEvade = false;
    let evadeNearMiss = false;
    let pendingInjuryNote = '';
    if (doEvade) {
      const ev = rollCrawlerEvadeForMobAttack(origTarget, flatHitDc);
      evaded = ev.success;
      isCritHit = ev.nat === 1;
      isMajorFail = ev.majorFail;
      evadeNearMiss = Boolean(ev.nearMiss);
      floorDmgBonus = Number(ev.dmgMod) || 0;
      rollNote = `Evade d20 (${ev.nat}) ${ev.evadeBonus >= 0 ? `+${ev.evadeBonus}` : ev.evadeBonus} = ${ev.total} vs Flat ${flatHitDc} (${ev.tier})${evadeNearMiss ? ' • ⚠️ NEAR MISS (Ally can Intervene 1d6!)' : ''}`;

      if (evaded) {
        let counterAdvNote = '';
        if (ev.crit || ev.amazing) {
          origTarget.evadeAdvVsMobId = mob.id;
          counterAdvNote = ` • ⚡ Adv on next Atk vs ${mob.name}!`;
        }
        if (!isAoe) {
          summaryParts.push(`${origTarget.name}: Evaded!${counterAdvNote}`);
          broadcastRolls.push({
            targetName: `${origTarget.iconSymbol || '⚔️'} ${origTarget.name}`,
            formulaText: rollNote + counterAdvNote,
            playerFormulaText: `Evade d20 (${ev.nat}) ${ev.evadeBonus >= 0 ? `+${ev.evadeBonus}` : ev.evadeBonus} = ${ev.total}${counterAdvNote}`,
            resultLabel: `EVADED (${ev.tier})`,
            playerResultLabel: `EVADED (${ev.tier})`,
            hit: false
          });
          return;
        } else {
          // Ch. 2 p. 83: Successful Evade on Area Attack reduces damage by 50%
          aoeHalfEvade = true;
          rollNote += ` • AoE Evaded (50% dmg)${counterAdvNote}`;
        }
      } else if (ev.critFail) {
        origTarget.pendingInjuries = origTarget.pendingInjuries || [];
        origTarget.pendingInjuries.push('Major Injury');
        pendingInjuryNote = ' • 🩹 Queued Major Injury (Post-Combat)';
      } else if (ev.majorFail) {
        origTarget.pendingInjuries = origTarget.pendingInjuries || [];
        origTarget.pendingInjuries.push('Minor Injury');
        pendingInjuryNote = ' • 🩹 Queued Minor Injury (Post-Combat)';
      }
    }

    let incomingDmg = (isCritHit ? baseDmgRoll * 2 : baseDmgRoll) + floorDmgBonus;
    if (aoeHalfEvade) incomingDmg = Math.floor(incomingDmg / 2);
    let blockNote = '';
    if (doBlock) {
      const sbRank = getCrawlerSkillRank(origTarget, /^shield\s*block$/i);
      const sbNat = Math.floor(Math.random() * 20) + 1;
      const sbMod = getCrawlerStatMod(origTarget, 'Str');
      const sbTotal = sbNat + sbMod;
      const sbOut = evaluateDccCheckOutcome(sbNat, sbTotal, flatHitDc);
      if (sbOut.success) {
        incomingDmg = Math.floor(incomingDmg / 2);
        if (sbRank >= 15) incomingDmg = Math.max(0, incomingDmg - sbMod);
        blockNote = `Shield Block SUCCESS (${sbTotal} vs ${flatHitDc}: ½ dmg)`;
      } else {
        blockNote = `Shield Block FAILED (${sbTotal} vs ${flatHitDc})`;
      }
      rollNote = doEvade ? `${rollNote} • ${blockNote}` : blockNote;
    }

    const dr = armorPiercing ? 0 : getEffectiveTokenDr(origTarget);
    const netDmg = Math.max(0, incomingDmg - dr);
    const pipOut = calculateWholePipDamageOutcome(origTarget, netDmg);
    if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(origTarget.id, -pipOut.effectiveHpDamage);

    const dmgTags = [];
    if (isCritHit) dmgTags.push('CRIT FAIL ×2');
    if (aoeHalfEvade) dmgTags.push('AoE ½ Evade');
    if (floorDmgBonus > 0) dmgTags.push(`+${floorDmgBonus} Floor`);
    if (doBlock && /SUCCESS/.test(blockNote)) dmgTags.push('½ Block');
    if (dr > 0) dmgTags.push(`${dr} DR`);

    const appliedDebs = [];
    condDebuffs.forEach(cd => {
      const shouldTrigger =
        cd.triggerMode === 'onHit' ||
        (cd.triggerMode === 'anyFail' && (!doEvade || !evaded)) ||
        (cd.triggerMode === 'majorFail' && doEvade && isMajorFail);
      if (shouldTrigger) {
        origTarget.statuses = origTarget.statuses || [];
        if (!origTarget.statuses.includes(cd.name)) origTarget.statuses.push(cd.name);
        appliedDebs.push(`+${cd.name}`);
      }
    });

    const pipLabel = pipOut.pipsDestroyed > 0
      ? `${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} ${pipOut.pipsDestroyed === 1 ? 'Pip' : 'Pips'})`
      : `0 dmg (${netDmg} < ${pipOut.hpPerPip} HP/Pip — Not Enough for 1 Pip)`;
    const dmgSummary = `${pipLabel}${dmgTags.length ? ` [${dmgTags.join(', ')}]` : ''}${appliedDebs.length ? ` ${appliedDebs.join(' ')}` : ''}`;
    summaryParts.push(`${origTarget.name}: ${dmgSummary}`);
    const playerRollNote = doEvade
      ? rollNote.replace(/\s*vs\s*Flat\s*\d+/gi, '')
      : (doBlock ? blockNote.replace(/\s*vs\s*Flat\s*\d+/gi, '') : 'Did not react');
    const playerPipLabel = pipOut.pipsDestroyed > 0
      ? `HIT • ${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} ${pipOut.pipsDestroyed === 1 ? 'Pip' : 'Pips'})`
      : `HIT • 0 dmg (Not Enough for 1 Pip)`;
    broadcastRolls.push({
      targetName: `${origTarget.iconSymbol || '⚔️'} ${origTarget.name}`,
      formulaText: rollNote + pendingInjuryNote,
      playerFormulaText: playerRollNote,
      resultLabel: `HIT • ${dmgSummary}`,
      playerResultLabel: `${playerPipLabel}${dmgTags.length ? ` (${dmgTags.join(', ')})` : ''}${appliedDebs.length ? ` ${appliedDebs.join(' ')}` : ''}`,
      hit: true
    });
  });

  broadcastDiceRollEvent({
    title: `${mob.iconSymbol || '👹'} ${mob.name} — ${atk.name}`,
    subtitle: `Monster Flat Hit DC: ${flatHitDc} • Damage Roll: ${baseDmgRoll} (${atk.damage || '1d6'})`,
    playerSubtitle: `${atk.name} (${atk.damage || 'Attack'})`,
    rolls: broadcastRolls
  });

  const mobVfx = inferVfxFromAbility(atk, { isAttack: true, isAoe });
  selectedTargets.forEach(t => {
    const rollEntry = broadcastRolls.find(r => r.targetName && r.targetName.endsWith(t.name));
    const didMissTarget = rollEntry ? !rollEntry.hit : false;
    triggerVfxEvent(mob, t, mobVfx.vfxType, mobVfx.vfxColor, true, didMissTarget);
  });

  let brokeInvis = false;
  if (mob.hiddenFromPlayers) {
    mob.hiddenFromPlayers = false;
    brokeInvis = true;
  }
  if (Array.isArray(mob.buffs) && mob.buffs.some(b => /invis|stealth|cloak|hidden/i.test(String(b)))) {
    mob.buffs = mob.buffs.filter(b => !/invis|stealth|cloak|hidden/i.test(String(b)));
    brokeInvis = true;
  }

  if (typeof clearDeclaredMobAttack === 'function') clearDeclaredMobAttack(mob.id, atkIdx);
  mob.mobAttacked = true;
  commitStateChange();
  showVttToast(`🗡️ ${mob.name}${brokeInvis ? ' (Revealed!)' : ''} → ${summaryParts.join(' | ')}`);
}

function executeAbilityCastResolution() {
  const panel = uiState.activeCastPanel;
  const scene = getActiveScene();
  if (!panel || !scene) return;
  const caster = scene.tokens.find(t => t.id === panel.casterId);
  const target = scene.tokens.find(t => t.id === panel.targetId) || caster;
  if (!caster || !target) return;

  const learned = (caster[panel.kind === 'skill' ? 'assignedSkills' : 'assignedSpells'] || []).find(a => a.id === panel.entryId);
  const info = analyzeAbilityEffects(caster, panel.kind, panel.entryId, learned?.rank || 1);
  const val = Math.max(0, Number(panel.rolledValue) || 0);

  // Ch. 4: Mark non-passive Skills for Skill Advancement when a Skill Check is made
  if (learned && !info.isPurePassive && !info.isAuraOrPassive) {
    learned.markedForAdvancement = true;
  }

  if (uiState.autoMoveAp && (appState?.round || 0) > 0 && caster.role === 'crawler') {
    caster.currentAp = Math.max(0, (caster.currentAp ?? 2) - 1);
  }
  if (panel.spendMana && info.manaCost > 0) {
    caster.currentMana = Math.max(0, (caster.currentMana || 0) - info.manaCost);
  }

  // Consume Evade Counter-Advantage if attacking that Mob
  if (info.isAttack && caster.evadeAdvVsMobId && caster.evadeAdvVsMobId === target.id) {
    caster.evadeAdvVsMobId = null;
  }

  const notes = [];
  let attackHit = true;
  const rollLabelStr = panel.atkCheck?.rollText || `d20 (${panel.atkCheck?.nat})`;
  const modeTagStr = (panel.atkCheck?.modeReasons && panel.atkCheck.modeReasons.length)
    ? ` [${panel.atkCheck.modeReasons.join(', ')}]`
    : '';
  if (info.isAttack && panel.atkCheck) {
    attackHit = panel.atkCheck.success;
    if (!attackHit) {
      const coverHits = typeof getCoverObjectsBetweenTokens === 'function' ? getCoverObjectsBetweenTokens(caster, target, scene) : [];
      const coverMissNote = coverHits.length > 0
        ? ` • 🧱 Missed attack may hit cover: ${coverHits.map(o => o.name).join(', ')} (check sturdiness / Str)`
        : '';
      const nearMissTag = (panel.atkCheck.nearMiss ? ' • ⚠️ NEAR MISS — Ally can Intervene (1d6)!' : '') + coverMissNote;
      notes.push(`Missed (${panel.atkCheck.tier})${coverMissNote}`);
      broadcastDiceRollEvent({
        title: `${caster.iconSymbol || '⚔️'} ${caster.name} — ${info.entry?.name}`,
        subtitle: `Attack ${rollLabelStr} + R${panel.atkCheck.rank ?? info.rank} + ${panel.atkCheck.mod} (${panel.atkCheck.statKey}) = ${panel.atkCheck.total} vs Flat Evade ${panel.atkCheck.targetDc}${modeTagStr}`,
        playerSubtitle: `Attack ${rollLabelStr} + R${panel.atkCheck.rank ?? info.rank} + ${panel.atkCheck.mod} (${panel.atkCheck.statKey}) = ${panel.atkCheck.total}${modeTagStr}`,
        rolls: [{
          targetName: `${target.iconSymbol || '👹'} ${target.name}`,
          formulaText: `Rolled ${panel.atkCheck.total} vs Flat Evade ${panel.atkCheck.targetDc}${nearMissTag}`,
          playerFormulaText: `Attack Total: ${panel.atkCheck.total}${nearMissTag}`,
          resultLabel: `MISS (${panel.atkCheck.tier})`,
          playerResultLabel: `MISS (${panel.atkCheck.tier})`,
          hit: false
        }]
      });
      const missVfxCfg = inferVfxFromAbility(info.entry, info);
      triggerVfxEvent(caster, target, missVfxCfg.vfxType, missVfxCfg.vfxColor, true, true);
      uiState.activeCastPanel = null;
      commitStateChange();
      showVttToast(`🎲 ${caster.name} missed ${target.name} (${panel.atkCheck.total} vs ${panel.atkCheck.targetDc})`);
      return;
    }
  }

  let aoeBroadcastRows = null;
  if (info.shieldSlots > 0 && val > 0) {
    const isPartyShield = info.isAoe || /(shell|burst|party|nearby|allies)/i.test(`${info.entry?.name || ''} ${info.entry?.range || ''} ${info.entry?.description || ''}`);
    if (isPartyShield) {
      const intRaw = caster?.stats?.Int || '10';
      const intScore = parseInt(String(intRaw).match(/(\d+)/)?.[1] || '10', 10);
      const intMod = getDccStatModifierFromScore(intScore);
      const burstFt = /\+\s*int/i.test(info.entry?.description || '') ? (10 + intMod) : Math.max(5, info.aoeSpec?.primaryFt || info.rangeFt || 10);
      const shieldedNames = [];
      (scene.tokens || []).forEach(ally => {
        if (ally.role !== 'crawler' || getTokenHealthMetrics(ally).curHp <= 0) return;
        if (calcGridDistanceFt(caster.gx, caster.gy, ally.gx, ally.gy) <= burstFt) {
          ally.shieldPips = Math.min(20, (ally.shieldPips || 0) + val);
          shieldedNames.push(ally.name);
        }
      });
      notes.push(`+${val} Shield Pips → ${shieldedNames.join(', ') || target.name}`);
    } else {
      target.shieldPips = Math.min(20, (target.shieldPips || 0) + val);
      notes.push(`+${val} Shield Pips`);
    }
  } else if (info.isHeal && val > 0) {
    const hm = getTokenHealthMetrics(target);
    const healHp = val * hm.hpPerPip;
    target.currentHp = Math.min(hm.maxHp, hm.curHp + healHp);
    target.currentPips = getTokenHealthMetrics(target).filledPips;
    notes.push(`Healed ${val} Pips (${healHp} HP)`);
  } else if (info.isAttack && val > 0) {
    const isCrit = Boolean(panel.atkCheck?.crit);
    const floorDmgBonus = Number(panel.atkCheck?.dmgMod) || 0;
    const rankDieRes = (info.rankDamageDiceCount > 0 && typeof rollDccRankDamageDie === 'function')
      ? rollDccRankDamageDie(info.rank, info.rankDamageDiceCount)
      : { total: 0, label: '' };
    // Ch. 2 p. 79 & Table 37: Base dice were already doubled on Nat 20; Rank dice & Floor bonus added after
    const fullRolledDmg = val + rankDieRes.total + floorDmgBonus;
    const zones = (info.aoeSpec?.hasAoe && typeof getTokensInAoeZones === 'function')
      ? getTokensInAoeZones(caster, target, info.aoeSpec, scene)
      : { primary: [target], splash: [] };

    const applyHitToVictim = (victim, isSplashZone) => {
      const zoneBase = isSplashZone ? Math.floor(fullRolledDmg / 2) : fullRolledDmg;
      const dr = info.armorPiercing ? 0 : getEffectiveTokenDr(victim);
      let netDmg = Math.max(0, zoneBase - dr);
      const dmgTags = [];
      if (isCrit) dmgTags.push('CRIT 2×DICE');
      if (isSplashZone) dmgTags.push('SPLASH ½');
      if (rankDieRes.total > 0) dmgTags.push(`+${rankDieRes.total} Rank Die ${rankDieRes.label}`);
      if (floorDmgBonus > 0) dmgTags.push(`+${floorDmgBonus} Floor`);
      if (dr > 0) dmgTags.push(`${dr} DR blocked`);

      const targetHm = getTokenHealthMetrics(victim);
      if (victim.role !== 'crawler' && targetHm.swarmCount > 1 && netDmg > 0) {
        if (info.isAoe) {
          netDmg = Math.ceil(netDmg * 1.2);
          dmgTags.unshift('🌊 Swarm AoE +20%');
        } else {
          const unitMaxHp = targetHm.baseMaxPips * targetHm.hpPerPip;
          const currentUnitHp = ((targetHm.curHp - 1) % unitMaxHp) + 1;
          if (netDmg > currentUnitHp) {
            netDmg = currentUnitHp;
            dmgTags.push('1-Hit Unit Cap');
          }
        }
      }
      const pipOut = calculateWholePipDamageOutcome(victim, netDmg);
      if (pipOut.pipsDestroyed > 0) {
        adjustTokenHealth(victim.id, -pipOut.effectiveHpDamage);
        return {
          gmNote: `${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} ${pipOut.pipsDestroyed === 1 ? 'Pip' : 'Pips'}${dmgTags.length ? ` • ${dmgTags.join(', ')}` : ''})`,
          playerNote: `${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} ${pipOut.pipsDestroyed === 1 ? 'Pip' : 'Pips'})${isSplashZone ? ' [Splash ½]' : ''}`
        };
      }
      return {
        gmNote: `0 dmg (${netDmg} < ${pipOut.hpPerPip} HP/Pip — Not Enough for 1 Pip${dmgTags.length ? ` • ${dmgTags.join(', ')}` : ''})`,
        playerNote: `0 dmg (Not Enough for 1 Pip)${isSplashZone ? ' [Splash ½]' : ''}`
      };
    };

    const totalVictims = zones.primary.length + zones.splash.length;
    if (info.aoeSpec?.hasAoe && totalVictims > 1) {
      aoeBroadcastRows = [];
      zones.primary.forEach(v => {
        const res = applyHitToVictim(v, false);
        notes.push(`${v.name}: ${res.gmNote}`);
        aoeBroadcastRows.push({
          targetName: `${v.iconSymbol || '👹'} ${v.name} (Primary)`,
          formulaText: `${panel.atkCheck?.tier || 'HIT'} • Damage Roll: ${fullRolledDmg}`,
          playerFormulaText: `Primary AoE Zone • Damage Roll: ${fullRolledDmg}`,
          resultLabel: `HIT • ${res.gmNote}`,
          playerResultLabel: `HIT • ${res.playerNote}`,
          hit: true
        });
      });
      zones.splash.forEach(v => {
        const res = applyHitToVictim(v, true);
        notes.push(`${v.name} [Splash]: ${res.gmNote}`);
        aoeBroadcastRows.push({
          targetName: `${v.iconSymbol || '👹'} ${v.name} (Splash ½)`,
          formulaText: `Splash Zone (50% dmg: ${Math.floor(fullRolledDmg / 2)})`,
          playerFormulaText: `Splash Zone (50% dmg: ${Math.floor(fullRolledDmg / 2)})`,
          resultLabel: `SPLASH • ${res.gmNote}`,
          playerResultLabel: `SPLASH • ${res.playerNote}`,
          hit: true
        });
      });
    } else {
      const res = applyHitToVictim(target, false);
      notes.push(res.gmNote);
    }
  }

  (panel.applyBuffs || []).forEach(bName => {
    target.buffs = target.buffs || [];
    if (!target.buffs.includes(bName)) target.buffs.push(bName);
    notes.push(`+${bName}`);
  });

  (panel.applyDebuffs || []).forEach(dName => {
    if (isSwarmImmuneToSingleTargetCc(target, dName, info.isAoe)) {
      notes.push(`🛡️ Immune to single-target ${dName}`);
      return;
    }
    target.statuses = target.statuses || [];
    if (!target.statuses.includes(dName)) target.statuses.push(dName);
    notes.push(`+${dName}`);
  });

  if (info.isAttack && panel.atkCheck) {
    const fBonus = Number(panel.atkCheck.dmgMod) || 0;
    const playerNotes = notes.map(n => {
      if (/Not Enough for 1 Pip/i.test(n)) return '0 dmg (Not Enough for 1 Pip)';
      const pipMatch = n.match(/^(\d+ dmg \(\d+ Pips?)/i);
      if (pipMatch) return `${pipMatch[1]})`;
      return n;
    }).filter(n => !/\bDR\b|slain/i.test(n));
    broadcastDiceRollEvent({
      title: `${caster.iconSymbol || '⚔️'} ${caster.name} — ${info.entry?.name}`,
      subtitle: `Attack ${rollLabelStr} + R${panel.atkCheck.rank ?? info.rank} + ${panel.atkCheck.mod} (${panel.atkCheck.statKey}) = ${panel.atkCheck.total} vs Flat Evade ${panel.atkCheck.targetDc}${modeTagStr}`,
      playerSubtitle: `Attack ${rollLabelStr} + R${panel.atkCheck.rank ?? info.rank} + ${panel.atkCheck.mod} (${panel.atkCheck.statKey}) = ${panel.atkCheck.total}${modeTagStr}`,
      rolls: aoeBroadcastRows || [{
        targetName: `${target.iconSymbol || '👹'} ${target.name}`,
        formulaText: `${panel.atkCheck.tier} • Damage Roll: ${val}${panel.atkCheck.crit ? ' (2× Base Dice)' : ''}${fBonus > 0 ? ` + ${fBonus} Floor` : ''}`,
        playerFormulaText: `Damage Roll: ${val}${panel.atkCheck.crit ? ' (2× Base Dice)' : ''}${fBonus > 0 ? ` + ${fBonus} Floor` : ''}`,
        resultLabel: `HIT • ${notes.join(', ')}`,
        playerResultLabel: `${panel.atkCheck.tier.toUpperCase()}${playerNotes.length ? ` • ${playerNotes.join(', ')}` : ''}`,
        hit: true
      }]
    });
  }

  if (!info.isAttack) {
    const needsSkillCheck = panel.kind === 'skill' && !info.isPurePassive && !info.isAuraOrPassive;
    const skChk = needsSkillCheck ? rollCrawlerD20SkillCheck(caster, info) : null;
    const checkFormula = skChk
      ? `Skill Check: d20 (${skChk.nat}) + R${skChk.rank} + ${skChk.mod} (${skChk.statKey}) = ${skChk.total}${notes.length ? ` • ${notes.join(' • ')}` : ''}`
      : (notes.length ? notes.join(' • ') : `Used ${info.entry?.name}`);
    const resBadge = skChk
      ? `CHECK: ${skChk.total}`
      : (info.shieldSlots > 0 ? 'SHIELDED' : info.isHeal ? 'HEALED' : 'APPLIED');
    broadcastDiceRollEvent({
      title: `${caster.iconSymbol || '⚔️'} ${caster.name} — ${info.entry?.name} (R${info.rank})`,
      subtitle: skChk
        ? `Skill Check (d20 + Rank + ${skChk.statKey} Mod)${skChk.nat === 20 ? ' • NAT 20!' : skChk.nat === 1 ? ' • NAT 1!' : ''}`
        : `${info.manaCost > 0 ? `Mana Spent: ${info.manaCost} MP` : 'Ability Activated'}`,
      playerSubtitle: skChk
        ? `Skill Check (d20 + Rank + ${skChk.statKey} Mod)${skChk.nat === 20 ? ' • NAT 20!' : skChk.nat === 1 ? ' • NAT 1!' : ''}`
        : `${info.manaCost > 0 ? `Mana Spent: ${info.manaCost} MP` : 'Ability Activated'}`,
      flareLevel: skChk && skChk.nat === 20 ? 'crit' : 'standard',
      rolls: [{
        targetName: `${target.iconSymbol || '⚔️'} ${target.name}`,
        formulaText: checkFormula,
        playerFormulaText: checkFormula,
        resultLabel: resBadge,
        playerResultLabel: resBadge,
        hit: false
      }]
    });
  }

  const explicitLightFt = Math.max(0, Number(info.entry?.lightRadiusFt) || 0);
  if ((normalizeAbilityEffectType(info.entry?.effectType) === 'light' || explicitLightFt > 0) && scene) {
    const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
    const radFt = explicitLightFt || 30;
    const vfxCol = inferVfxFromAbility(info.entry, info).vfxColor || '#fef08a';
    scene.droppedLights = scene.droppedLights || [];
    scene.droppedLights.push({
      id: 'lt_spell_' + Date.now(),
      wx: (target.gx + 0.5) * gs,
      wy: (target.gy + 0.5) * gs,
      gx: target.gx,
      gy: target.gy,
      radiusFt: radFt,
      color: vfxCol,
      lightEffect: 'pulse',
      flicker: true,
      dimOnly: false,
      angleDeg: 360,
      facingDeg: 0,
      maxReachFt: radFt * 2
    });
    notes.push(`💡 Placed ${radFt}ft Light Orb`);
  }

  const vfxCfg = inferVfxFromAbility(info.entry, info);
  triggerVfxEvent(caster, target, vfxCfg.vfxType, vfxCfg.vfxColor, true);
  if (typeof spawnPersistentSpellEffect === 'function') {
    const pe = spawnPersistentSpellEffect(caster, target, info, scene);
    if (pe) notes.push(`⏳ Persistent (${pe.remainingRounds}r)`);
  }

  uiState.activeCastPanel = null;
  commitStateChange();
  showVttToast(`✨ ${caster.name} used ${info.entry?.name} on ${target.name}${notes.length ? ` (${notes.join(', ')})` : ''}`);
}

function renderCrawlerAssignedAbilitiesHtml(tok) {
  const skills = tok.assignedSkills || [];
  const spells = tok.assignedSpells || [];
  const scene = getActiveScene();

  const renderRow = (kind, item) => {
    const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
    const full = catalog.find(e => e.id === item.id) || item;
    const name = full.name || item.name || 'Ability';
    const info = analyzeAbilityEffects(tok, kind, item.id, item.rank || 1);
    const validTargets = info.isPurePassive ? [] : getValidAbilityTargetsForCaster(tok, info, scene);
    const targetOptions = validTargets.map(t => `<option value="${t.id}">${t.iconSymbol || ''} ${t.name}</option>`).join('');
    const isPreviewing = uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === tok.id && uiState.previewEffectRange.label === name;

    let castBanner = '';
    if (uiState.activeCastPanel && uiState.activeCastPanel.casterId === tok.id && uiState.activeCastPanel.kind === kind && uiState.activeCastPanel.entryId === item.id) {
      const p = uiState.activeCastPanel;
      const hasNumericRoll = info.shieldSlots > 0 || info.isHeal || info.isAttack;
      const chk = p.atkCheck;
      castBanner = `
        <div class="mt-1.5 bg-dungeon-900 border border-amber-500/40 rounded-lg p-2 space-y-1.5 text-[10px]">
          ${chk ? `
            <div class="flex items-center justify-between gap-1 bg-dungeon-950 border ${chk.success ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'} rounded px-1.5 py-1 font-mono">
              <span>🎲 d20 (${chk.nat}) + ${chk.mod} = <b>${chk.total}</b> vs Flat ${chk.targetDc}</span>
              <span class="font-bold">${chk.tier}${chk.dmgMod > 0 ? ` (+${chk.dmgMod} Floor)` : ''}</span>
            </div>
          ` : ''}
          ${hasNumericRoll ? `
            <div class="flex items-center justify-between gap-1">
              <span class="text-amber-300 font-bold">${info.shieldSlots > 0 ? '🛡️ Shield Pips:' : info.isHeal ? '💚 Heal Pips:' : '💥 Damage:'}</span>
              <div class="flex items-center gap-1">
                <input type="number" min="0" value="${p.rolledValue}" onchange="uiState.activeCastPanel.rolledValue = Number(this.value) || 0" class="w-14 bg-dungeon-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 font-mono" />
                ${!info.shieldSlots ? `<button onclick="rerollActiveCastValue()" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold" title="Reroll Attack & Damage">🎲</button>` : ''}
              </div>
            </div>
          ` : ''}
          ${info.manaCost > 0 ? `
            <label class="flex items-center gap-1.5 text-indigo-300 cursor-pointer">
              <input type="checkbox" ${p.spendMana ? 'checked' : ''} onchange="uiState.activeCastPanel.spendMana = this.checked" class="accent-indigo-400" />
              <span>Deduct ${info.manaCost} MP</span>
            </label>
          ` : ''}
          ${(p.applyBuffs || []).length > 0 ? `
            <div class="flex flex-wrap gap-1">
              ${p.applyBuffs.map(b => `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold">✨ ${b}</span>`).join('')}
            </div>
          ` : ''}
          ${(p.applyDebuffs || []).length > 0 ? `
            <div class="flex flex-wrap gap-1">
              ${p.applyDebuffs.map(d => `<span class="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 font-semibold">☣️ ${d}</span>`).join('')}
            </div>
          ` : ''}
          <div class="flex justify-end gap-1.5 pt-1">
            <button onclick="uiState.activeCastPanel = null; renderGmInspector()" class="px-2 py-0.5 rounded bg-slate-800 text-slate-300">Cancel</button>
            <button onclick="executeAbilityCastResolution()" class="px-2.5 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">✓ Resolve & Broadcast</button>
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-dungeon-950 border border-slate-800 rounded-lg p-2 space-y-1.5">
        <div class="flex items-center justify-between gap-1">
          <div class="min-w-0 cursor-help" onmouseenter="showEffectHoverInfo('${kind}', '${encodeURIComponent(String(item.id || name))}', ${item.rank || 1}, '${tok.id}')" onmouseleave="hideEffectHoverInfo()">
            <span class="font-bold text-[11px] text-slate-100 hover:text-amber-300 underline decoration-dotted decoration-slate-600 truncate">${kind === 'skill' ? '⚔️' : '✨'} ${name}</span>
            ${info.manaCost > 0 ? `<span class="ml-1 text-[9px] font-mono text-indigo-300">${info.manaCost} MP</span>` : ''}
          </div>
          <div class="flex items-center gap-1 shrink-0 font-mono text-[10px]">
            <button onclick="adjustCrawlerAbilityRank('${tok.id}', '${kind}', '${item.id}', -1)" class="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
            ${kind === 'skill' ? `<button type="button" onclick="toggleSkillAdvancementMark('${tok.id}', '${item.id}')" title="Click to toggle Skill Advancement Mark (★)" class="px-1 py-0.2 rounded font-bold ${item.markedForAdvancement ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50' : 'text-amber-300 hover:bg-slate-800'}">R${item.rank || 1}${item.markedForAdvancement ? '★' : ''}</button>` : `<span class="text-amber-300 font-bold px-0.5">R${item.rank || 1}</span>`}
            <button onclick="adjustCrawlerAbilityRank('${tok.id}', '${kind}', '${item.id}', 1)" class="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700 font-bold">+</button>
            <button onclick="removeAbilityFromCrawler('${tok.id}', '${kind}', '${item.id}')" class="ml-1 text-rose-400 hover:text-rose-300 font-bold">✕</button>
          </div>
        </div>
        ${info.isPurePassive ? `
          <div class="text-[10px] font-mono text-emerald-300/90 bg-emerald-950/30 border border-emerald-500/30 rounded px-2 py-1">
            🔒 Passive Bonus Always Active
          </div>
        ` : `
          <div class="flex items-center justify-between gap-1.5 text-[9px] font-mono">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400">Range: <b class="text-rose-300">${info.isSelfOnly ? 'Self' : `${info.rangeFt}ft`}</b></span>
              ${!info.isSelfOnly ? `
                <button type="button" onclick="toggleEffectRangePreview('${tok.id}', ${info.rangeFt}, ${info.ignoreLos}, '${String(name).replace(/'/g, "\\'")}', '${item.id}')" class="px-1.5 py-0.2 rounded border font-semibold transition ${isPreviewing ? 'bg-rose-500/30 border-rose-400 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-400/50'}" title="Show faint red LOS-affected range overlay on map">
                  ${isPreviewing ? '🔴 Hide Area' : '⭕ Show Area'}
                </button>
              ` : ''}
            </div>
            ${!info.isSelfOnly ? `
              <label class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded border cursor-pointer ${info.ignoreLos ? 'bg-purple-500/20 border-purple-400/50 text-purple-200' : 'bg-slate-900 border-slate-700 text-slate-400'}" title="Toggle whether walls and closed doors block this skill/spell">
                <input type="checkbox" ${info.ignoreLos ? 'checked' : ''} onchange="toggleCrawlerAbilityIgnoreLos('${tok.id}', '${kind}', '${item.id}', this.checked)" class="accent-purple-400" />
                <span>${info.ignoreLos ? '👁️ Ignores LOS' : '🧱 LOS'}</span>
              </label>
            ` : ''}
          </div>
          ${validTargets.length === 0 ? `
            <div class="text-[10px] font-mono text-slate-500 italic bg-dungeon-900/70 border border-slate-800/80 rounded px-2 py-1">
              No valid target in sight/range (${info.rangeFt}ft)
            </div>
          ` : `
            <div class="flex items-center gap-1 text-[9px] font-mono">
              <span class="text-slate-400">VFX:</span>
              <select onchange="setAbilityVfxConfig('${kind}', '${item.id}', 'vfxType', this.value)" class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded px-1 py-0.5 text-slate-200">
                ${VFX_PRESET_LIBRARY.map(vp => {
                  const curVfx = inferVfxFromAbility(full, info);
                  return `<option value="${vp.id}" ${curVfx.vfxType === vp.id ? 'selected' : ''}>${vp.label}</option>`;
                }).join('')}
              </select>
              <input type="color" value="${inferVfxFromAbility(full, info).vfxColor}" onchange="setAbilityVfxConfig('${kind}', '${item.id}', 'vfxColor', this.value)" title="Customize VFX Color" class="w-5 h-5 bg-transparent border-0 cursor-pointer shrink-0" />
              <button type="button" onclick="previewAbilityVfxOnMap('${tok.id}', '${kind}', '${item.id}')" title="Preview Particle Effect on Map" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold shrink-0">✨</button>
            </div>
            <div class="flex items-center gap-1.5">
              <select id="castTarget_${tok.id}_${kind}_${item.id}" class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-slate-200">
                ${targetOptions}
              </select>
              <button onclick="openAbilityCastPanel('${tok.id}', '${kind}', '${item.id}')" class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 font-bold text-[10px] shrink-0">
                🎯 ${kind === 'skill' ? 'Use' : 'Cast'}
              </button>
            </div>
          `}
        `}
        ${renderAbilityUpgradesDropdownHtml(full, item.rank || 1)}
        ${castBanner}
      </div>
    `;
  };

  if (skills.length === 0 && spells.length === 0) {
    return `<div class="text-[11px] text-slate-500 italic">No skills or spells learned yet. Select this crawler and click "+ ${tok.name}" in the Skills or Spells tab.</div>`;
  }

  return `
    <div class="space-y-1.5">
      ${skills.map(s => renderRow('skill', s)).join('')}
      ${spells.map(sp => renderRow('spell', sp)).join('')}
    </div>
  `;
}

function renderGmInspector() {
  const panel = document.getElementById('gmPanelInspector');
  if (!panel) return;
  const scene = getActiveScene();
  const tok = scene && uiState.selectedTokenId
    ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId)
    : null;

  const pEffects = Array.isArray(scene?.persistentEffects) ? scene.persistentEffects : [];
  const persistentEffectsBoxHtml = pEffects.length > 0 ? `
    <div class="bg-dungeon-950 border border-amber-500/40 rounded-xl p-2.5 space-y-1.5 text-xs">
      <div class="flex items-center justify-between gap-2">
        <span class="font-mono font-bold uppercase text-[10px] text-amber-300">⏳ Active Persistent Spells (${pEffects.length})</span>
        <button type="button" onclick="clearAllPersistentSpellEffects()" class="px-1.5 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[9.5px] font-bold">🧹 Clear All</button>
      </div>
      <div class="space-y-1">
        ${pEffects.map(pe => `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg px-2 py-1 flex items-center justify-between gap-1.5 text-[10px]">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${pe.vfxColor || '#f97316'}"></span>
              <span class="font-bold text-slate-100 truncate">${escapeHtmlAttr(pe.name)}</span>
              <span class="font-mono text-amber-300 shrink-0">${pe.remainingRounds < 0 ? '∞' : `${pe.remainingRounds}r`}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0 font-mono">
              <button type="button" onclick="adjustPersistentEffectRounds('${pe.id}', -1)" class="px-1 rounded bg-slate-800 hover:bg-slate-700">-</button>
              <button type="button" onclick="adjustPersistentEffectRounds('${pe.id}', 1)" class="px-1 rounded bg-slate-800 hover:bg-slate-700">+</button>
              <button type="button" onclick="removePersistentSpellEffect('${pe.id}')" title="Dismiss Effect" class="text-rose-400 hover:text-rose-300 font-bold pl-0.5">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  if (!tok) {
    panel.innerHTML = `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-4 text-center space-y-1.5">
        <div class="text-2xl">🎯</div>
        <div class="font-bold text-xs text-slate-200">No Token Selected</div>
        <p class="text-[11px] text-slate-400">Click any Crawler or Mob token on the battle map or bottom HUD bar to inspect stats, adjust HP/Mana/AP, merge swarms, or resolve abilities.</p>
      </div>
      ${persistentEffectsBoxHtml}
    `;
    return;
  }

  const hm = getTokenHealthMetrics(tok);
  const illum = getIlluminationBuffForToken(tok);
  const effectiveEvade = getEffectiveEvadeDisplay(tok);
  const attacks = getEffectiveTokenAttacks(tok);
  const buffs = tok.buffs || [];
  const statuses = tok.statuses || [];
  const adjMatches = tok.role !== 'crawler' && getSwarmPerSquareCapacity(tok.classification) > 0
    ? findAdjacentSameTypeMobs(tok)
    : [];

  const resolvedPortraitImg = typeof getResolvedTokenPortraitImage === 'function' ? getResolvedTokenPortraitImage(tok) : null;
  const inspectorPortraitSrc = tok.portraitDataUrl || tok.portraitUrl || (resolvedPortraitImg && resolvedPortraitImg.src) || '';
  const inspectorBorderCol = tok.color || (tok.role === 'crawler' ? '#38bdf8' : '#ef4444');

  panel.innerHTML = `
    <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
      <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-dungeon-900 border-2 flex items-center justify-center overflow-hidden shrink-0 shadow-md" style="border-color:${escapeHtmlAttr(inspectorBorderCol)}">
            ${inspectorPortraitSrc
              ? `<img src="${escapeHtmlAttr(inspectorPortraitSrc)}" alt="${escapeHtmlAttr(tok.name || 'Unit')}" class="w-full h-full object-cover" />`
              : `<span class="text-2xl">${tok.iconSymbol || (tok.role === 'crawler' ? '⚔️' : '👹')}</span>`
            }
          </div>
          <div class="min-w-0">
            <div class="font-bold text-sm text-slate-100 truncate">${tok.name} <span class="text-xs font-mono text-amber-400">Lvl ${tok.level || 1}</span></div>
            <div class="text-[10px] text-slate-400 truncate">${tok.classification || ''}</div>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="setTokenTurnAnchor('${tok.id}')" title="Set Turn Start Anchor" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300">📍</button>
          <button onclick="mulliganTokenTurn('${tok.id}')" title="Undo Turn / Mulligan" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300">↩️</button>
          ${tok.role !== 'crawler' ? `<button onclick="toggleTokenVisibility('${tok.id}')" title="Toggle Player Visibility" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold ${tok.hiddenFromPlayers ? 'text-purple-300' : 'text-emerald-300'}">${tok.hiddenFromPlayers ? '👻' : '👁️'}</button>` : ''}
          ${tok.role !== 'crawler' ? `<button onclick="toggleTokenDetectedOnMinimap('${tok.id}')" title="Ping / Clear Red Dot on Player Minimap when out of LOS (Perception/Listening)" class="px-2 py-1 rounded text-[10px] font-bold transition ${tok.detectedOnMinimap ? 'bg-rose-500/30 border border-rose-400 text-rose-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}">🔴</button>` : ''}
          <button onclick="removeTokenFromMap('${tok.id}')" title="Remove from Map" class="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-bold">🗑️</button>
          <label title="Upload / Swap Token Portrait (PNG, JPG, WEBP, JFIF)" class="cursor-pointer px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold">
            🖼️
            <input type="file" accept="image/*,.jfif" onchange="uploadTokenPortraitImage('${tok.id}', event, false)" class="hidden" />
          </label>
        </div>
      </div>

      <div class="text-[10px] font-mono px-2 py-1 rounded-lg border ${illum.badgeCls}">${illum.label} — ${illum.effect}</div>

      <!-- Health & Shield Pips -->
      <div class="space-y-1.5 bg-dungeon-900 border border-slate-800 rounded-lg p-2">
        <div class="flex items-center justify-between font-mono text-[11px]">
          <span class="text-emerald-300 font-bold">❤️ HP: ${hm.curHp} / ${hm.maxHp} (${hm.filledPips}/${hm.maxPips} Pips)</span>
          <div class="flex items-center gap-1">
            <button onclick="adjustTokenHealth('${tok.id}', -${hm.hpPerPip})" class="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 font-bold">-1 Pip</button>
            <button onclick="adjustTokenHealth('${tok.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-1</button>
            <button onclick="adjustTokenHealth('${tok.id}', 1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">+1</button>
            <button onclick="adjustTokenHealth('${tok.id}', ${hm.hpPerPip})" class="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-200 font-bold">+1 Pip</button>
          </div>
        </div>
        <div class="flex items-center justify-between font-mono text-[10px] pt-1 border-t border-slate-800/80">
          <span class="text-sky-300 font-bold">🛡️ Shield Pips: ${tok.shieldPips || 0}</span>
          <div class="flex items-center gap-1">
            <button onclick="adjustTokenShieldPips('${tok.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
            <button onclick="adjustTokenShieldPips('${tok.id}', 1)" class="px-1.5 py-0.5 rounded bg-sky-950 hover:bg-sky-900 text-sky-200 font-bold">+1</button>
          </div>
        </div>
      </div>

      <!-- Mana & AP -->
      <div class="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
          <span class="text-indigo-300 font-bold">💧 MP: ${tok.currentMana ?? 0}/${tok.maxMana ?? 0}</span>
          <div class="flex items-center gap-1">
            <button onclick="adjustTokenMana('${tok.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
            <button onclick="adjustTokenMana('${tok.id}', 1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">+</button>
          </div>
        </div>
        ${tok.role === 'crawler' ? `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
            <span class="text-amber-300 font-bold">⚡ AP: ${tok.currentAp ?? 2}/${tok.maxAp ?? 2}</span>
            <div class="flex items-center gap-1">
              <button onclick="adjustTokenAp('${tok.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
              <button onclick="adjustTokenAp('${tok.id}', 1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">+</button>
            </div>
          </div>
        ` : `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between">
            <span class="text-slate-300">❤️ HP/Pip: <b>${hm.hpPerPip}</b></span>
            <div class="flex items-center gap-1">
              <button onclick="adjustTokenHpPerPip('${tok.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
              <button onclick="adjustTokenHpPerPip('${tok.id}', 1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">+</button>
            </div>
          </div>
        `}
      </div>

      <!-- Core Combat Stats -->
      <div class="grid grid-cols-3 gap-1.5 text-center font-mono">
        <div class="bg-dungeon-900 rounded-lg p-1.5 border border-slate-800"><div class="text-[9px] text-slate-500">EVADE</div><div class="font-bold text-cyan-300">${effectiveEvade}</div></div>
        <div class="bg-dungeon-900 rounded-lg p-1.5 border border-slate-800"><div class="text-[9px] text-slate-500">MOVE</div><div class="font-bold text-emerald-300">${tok.move || (tok.role === 'crawler' ? '20+S' : '30+S')}</div></div>
        <div class="bg-dungeon-900 rounded-lg p-1.5 border border-slate-800"><div class="text-[9px] text-slate-500">DR</div><div class="font-bold text-amber-300">${getEffectiveTokenDr(tok)}</div></div>
      </div>

      <!-- Token Footprint Size & Swarm Pack Count -->
      <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5 font-mono text-[10px]">
        <div class="flex items-center justify-between">
          <span class="text-slate-300 font-bold">📐 Map Size:</span>
          <div class="flex items-center gap-1">
            ${[1, 2, 3, 4].map(sz => {
              const active = (Number(tok.gridSpan) || 1) === sz;
              return `<button onclick="setTokenGridSpan('${tok.id}', ${sz})" class="px-1.5 py-0.5 rounded font-bold ${active ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}">${sz}×${sz}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <span class="text-cyan-300 font-bold">⛰️ Elevation (5ft): <span class="text-amber-300">${typeof formatElevationBadge === 'function' ? (formatElevationBadge(getTokenElevationFt(tok, scene)) || '0ft') : '0ft'}</span></span>
          <div class="flex items-center gap-1">
            <button onclick="adjustTokenElevationFt('${tok.id}', -5)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-5ft</button>
            <button onclick="setTokenElevationFt('${tok.id}', 0)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">0ft</button>
            <button onclick="adjustTokenElevationFt('${tok.id}', 5)" class="px-1.5 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-200 font-bold">+5ft</button>
          </div>
        </div>
        ${tok.role !== 'crawler' && getSwarmPerSquareCapacity(tok.classification) > 0 ? `
          <div class="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span class="text-rose-300 font-bold">👥 Swarm: ×${hm.swarmCount} <span class="text-slate-400 font-normal">(${hm.aliveUnits} alive • +${hm.aliveUnits} Hit)</span></span>
            <div class="flex items-center gap-1">
              <button onclick="adjustTokenSwarmCount('${tok.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
              <button onclick="adjustTokenSwarmCount('${tok.id}', 1)" class="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 font-bold">+</button>
            </div>
          </div>
          ${adjMatches.length > 0 ? `
            <button onclick="mergeAdjacentMobsIntoSwarm('${tok.id}')" class="w-full py-1 px-2 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/50 text-amber-200 font-bold text-[10px] flex items-center justify-center gap-1.5 transition">
              <span>🔗 Merge ${adjMatches.length} Adjacent ${tok.name} into Swarm</span>
            </button>
          ` : ''}
          ${hm.swarmCount > 1 ? `
            <div class="text-[9px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded px-1.5 py-1 leading-snug">
              • <b>Offense:</b> +${hm.aliveUnits} Hit • +${Math.max(0, (Number(tok.gridSpan) || 1) - 1)} combat dice (${tok.gridSpan || 1}×${tok.gridSpan || 1})<br/>
              • <b>Defense:</b> ${hm.aliveUnits >= 2 ? `-${Math.floor(hm.aliveUnits / 2)} Evade` : '0 Evade mod'} • ${hm.aliveUnits > 1 ? 'Immune to single-target CC' : 'Single unit'} • 1-Hit max 1 unit (AoE +20%)
            </div>
          ` : ''}
        ` : ''}
      </div>

      <!-- Active Buffs -->
      <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono font-bold uppercase text-emerald-400">✨ Active Buffs</span>
          <button onclick="setGmTab('buffs')" class="text-[10px] text-emerald-300 hover:underline font-semibold">+ Buffs Tab →</button>
        </div>
        <div class="flex flex-wrap gap-1">
          ${buffs.length === 0 ? '<span class="text-[10px] text-slate-500 italic">None</span>' : buffs.map(b => {
            const isPassive = String(b).startsWith('[Passive] ') || String(b).startsWith('[Aura] ');
            const enc = encodeURIComponent(String(b));
            return `<span onmouseenter="showEffectHoverInfo('buff', '${enc}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 transition">${b}${isPassive ? '' : `<button onclick="hideEffectHoverInfo(); removeBuffFromToken('${tok.id}', '${String(b).replace(/'/g, "\\'")}')" class="hover:text-white font-bold">×</button>`}</span>`;
          }).join('')}
        </div>
      </div>

      <!-- Active Debuffs -->
      <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono font-bold uppercase text-rose-400">☣️ Debuffs / Conditions</span>
          <button onclick="setGmTab('debuffs')" class="text-[10px] text-rose-300 hover:underline font-semibold">+ Debuffs Tab →</button>
        </div>
        <div class="flex flex-wrap gap-1">
          ${statuses.length === 0 ? '<span class="text-[10px] text-slate-500 italic">None</span>' : statuses.map(s => {
            const enc = encodeURIComponent(String(s));
            return `<span onmouseenter="showEffectHoverInfo('debuff', '${enc}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 transition">${s}<button onclick="hideEffectHoverInfo(); removeStatusFromToken('${tok.id}', '${String(s).replace(/'/g, "\\'")}')" class="hover:text-white font-bold">×</button></span>`;
          }).join('')}
        </div>
      </div>

      ${tok.role === 'crawler' ? `
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
          ${(appState?.round || 0) === 0 && isExplorationModeActive() ? (() => {
            const expMobs = ((typeof getActiveScene === 'function' ? getActiveScene() : null)?.tokens || [])
              .filter(m => m.role !== 'crawler' && !m.hiddenFromPlayers && getTokenHealthMetrics(m).curHp > 0);
            const mobSelectHtml = expMobs.length > 0 ? `
              <div class="flex items-center gap-1 text-[9px] font-mono">
                <span class="text-slate-400 shrink-0">🎯 Mob:</span>
                <select id="${IS_PLAYER_WINDOW ? 'playerExploreTargetMob' : `exploreTargetMob_${tok.id}`}" class="flex-1 min-w-0 bg-dungeon-950 border border-cyan-500/35 rounded px-1.5 py-0.5 text-cyan-100 text-[9px]">
                  <option value="">Nearest in Sight (Auto)</option>
                  ${expMobs.map(m => `<option value="${m.id}">${m.iconSymbol || '👹'} ${escapeHtmlAttr(m.name)} (Lvl ${m.level || 1})</option>`).join('')}
                </select>
              </div>
            ` : '';
            return `
            <div class="bg-cyan-950/35 border border-cyan-500/40 rounded-lg p-1.5 space-y-1.5">
              <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-mono uppercase font-bold text-cyan-300">🧭 Explore &amp; RP</span>
                <span class="text-[8.5px] font-mono text-slate-400">Shared Banner</span>
              </div>
              ${mobSelectHtml}
              <div class="flex items-center gap-1">
                <select id="exploreActionSelect_${tok.id}" class="flex-1 min-w-0 bg-dungeon-950 border border-cyan-500/35 rounded px-1.5 py-1 text-[9.5px] font-semibold text-slate-100">
                  <option value="exp:search">🔍 Search Area</option>
                  <option value="exp:interact">🤲 Interact / Door</option>
                  <option value="exp:sneak">🥷 Sneak Approach</option>
                  <option value="exp:first_impression">🤝 Good First Impression</option>
                  <option value="exp:animal_handling">🐾 Animal Handling</option>
                  <option value="exp:parley">💬 Parley (Social)</option>
                  <option value="exp:pickpocket">🤏 Sleight / Pickpocket</option>
                  <option value="exp:lore">📜 Lore Check</option>
                  <option value="trap:detect">🕵️ Detect Traps</option>
                  <option value="trap:disarm">🔧 Disarm Trap</option>
                </select>
                <select id="${IS_PLAYER_WINDOW ? 'playerParleySkillChoice' : `parleySkillChoice_${tok.id}`}" title="Social skill for Parley" class="bg-dungeon-950 border border-sky-500/30 rounded px-1 py-1 text-[8.5px] text-sky-100 max-w-[62px]">
                  <option value="">Best</option>
                  <option value="Persuasion">Persuade</option>
                  <option value="Negotiation">Haggle</option>
                  <option value="Diplomacy">Diplomacy</option>
                  <option value="Deception">Deceive</option>
                  <option value="Intimidate">Intimidate</option>
                </select>
                <button type="button" onclick="(function(){ const v = document.getElementById('exploreActionSelect_${tok.id}')?.value || 'exp:search'; if (v.startsWith('trap:')) triggerTrapAction('${tok.id}', v.replace('trap:','')); else triggerCrawlerExplorationAction('${tok.id}', v.replace('exp:','')); })()" class="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[9.5px] shrink-0 transition">Go</button>
              </div>
            </div>
            `;
          })() : ''}
          <div class="flex items-center justify-between gap-1 text-[10px] font-mono">
            <span class="text-slate-400 font-bold">🎲 Roll Mode:</span>
            <div class="flex items-center gap-1">
              <button type="button" onclick="setCombatRollMode('adv')" class="px-1.5 py-0.5 rounded font-bold ${uiState.combatRollMode === 'adv' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">🟢 Adv</button>
              <button type="button" onclick="setCombatRollMode('normal')" class="px-1.5 py-0.5 rounded font-bold ${uiState.combatRollMode === 'normal' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}">Norm</button>
              <button type="button" onclick="setCombatRollMode('disadv')" class="px-1.5 py-0.5 rounded font-bold ${uiState.combatRollMode === 'disadv' ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">🔴 Dis</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-1.5 pt-0.5">
            <button type="button" onclick="triggerCrawlerSupportAction('${tok.id}', 'intervene')" class="py-1 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 font-bold text-[10px] transition">🤝 Intervene (1d6)</button>
            <button type="button" onclick="triggerCrawlerSupportAction('${tok.id}', 'call_play')" class="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200 font-bold text-[10px] transition">📣 Call a Play (2d6)</button>
          </div>
          ${tok.role === 'crawler' ? (() => {
            const adj = typeof getAdjacentDoorsForToken === 'function' ? getAdjacentDoorsForToken(tok, getActiveScene()) : [];
            const nextState = adj[0]?.open ? 'Close Door' : 'Open Door';
            return `<button type="button" ${adj.length === 0 ? 'disabled' : ''} onclick="triggerCrawlerDoorAction('${tok.id}')" class="w-full py-1 px-2 rounded-lg font-bold text-[10px] transition ${adj.length === 0 ? 'bg-slate-800/70 border border-slate-700/70 text-slate-500 cursor-not-allowed' : 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200'}">🚪 ${nextState} (1 Action${adj.length === 0 ? ' • Move Adjacent' : ''})</button>`;
          })() : ''}
          ${tok.evadeAdvVsMobId ? `<div class="text-[9.5px] font-mono text-emerald-300 bg-emerald-950/35 border border-emerald-500/40 rounded px-2 py-0.5">⚡ Counter-Advantage active on next Attack!</div>` : ''}
          ${(tok.pendingInjuries || []).length > 0 ? `<div class="text-[9.5px] font-mono text-rose-300 bg-rose-950/35 border border-rose-500/40 rounded px-2 py-0.5">🩹 Post-Combat Queued: ${tok.pendingInjuries.join(', ')}</div>` : ''}
        </div>
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono font-bold uppercase text-amber-400">📚 Learned Skills & Spells</span>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="openGmAdvancementModal('${tok.id}')" class="px-1.5 py-0.2 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 text-[9.5px] font-bold">📈 Advance</button>
              <button onclick="setGmTab('skills')" class="text-[10px] text-amber-300 hover:underline font-semibold">+ Skills Tab</button>
              <button onclick="setGmTab('spells')" class="text-[10px] text-cyan-300 hover:underline font-semibold">+ Spells Tab</button>
            </div>
          </div>
          ${renderCrawlerAssignedAbilitiesHtml(tok)}
        </div>
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
          <div class="flex items-center justify-between gap-1">
            <span class="text-[10px] font-mono font-bold uppercase text-emerald-400">🎒 Inventory (${(tok.inventory || []).length})</span><button type="button" onclick="openCraftingModal('${tok.id}')" class="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 font-bold text-[9.5px] transition">🛠️ Craft</button>
            <button type="button" onclick="openGmLootBoxModal('${tok.id}')" class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold text-[10px] transition">🎁 Award Loot Box</button>
          </div>
          <div class="flex items-center justify-between bg-dungeon-950 border border-amber-500/30 rounded px-2 py-1 font-mono text-[10px]">
            <span class="text-amber-300 font-bold">🪙 Gold: ${(Number(tok.gold) || 0).toLocaleString()}g</span>
            <div class="flex items-center gap-1">
              <button type="button" onclick="adjustCrawlerGold('${tok.id}', -10)" class="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700">-10</button>
              <button type="button" onclick="adjustCrawlerGold('${tok.id}', 10)" class="px-1.5 py-0.2 rounded bg-slate-800 hover:bg-slate-700">+10</button>
              <button type="button" onclick="adjustCrawlerGold('${tok.id}', 100)" class="px-1.5 py-0.2 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200">+100</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1">
            ${DCC_QUICK_ITEMS_LIBRARY.slice(0, 4).map((it, idx) => `<button type="button" onclick="gmQuickGiveItemToCrawler('${tok.id}', ${idx})" class="px-1.5 py-0.5 rounded bg-dungeon-950 hover:bg-slate-800 border border-slate-700 text-[9.5px] text-slate-200">+ ${it.icon} ${it.name}</button>`).join('')}
          </div>
          ${(tok.inventory || []).length === 0
            ? '<div class="text-[10px] text-slate-500 italic">No items in inventory yet.</div>'
            : `<div class="space-y-1">${(tok.inventory || []).map(it => `
                <div class="bg-dungeon-950 border border-slate-800 rounded px-2 py-1 flex items-center justify-between text-[10px]">
                  <span class="truncate text-slate-200">${it.icon || '🎒'} <b>${escapeHtmlAttr(it.name)}</b> <span class="font-mono text-emerald-300">×${it.qty || 1}</span></span>
                  <div class="flex items-center gap-1 shrink-0 font-mono">
                    <button type="button" onclick="adjustCrawlerInventoryQty('${tok.id}', '${it.id}', -1)" class="px-1 rounded bg-slate-800 hover:bg-slate-700">-</button>
                    <button type="button" onclick="adjustCrawlerInventoryQty('${tok.id}', '${it.id}', 1)" class="px-1 rounded bg-slate-800 hover:bg-slate-700">+</button>
                    <button type="button" onclick="removeCrawlerInventoryItem('${tok.id}', '${it.id}')" class="text-rose-400 hover:text-rose-300 font-bold">✕</button>
                  </div>
                </div>
              `).join('')}</div>`
          }
        </div>
      ` : ''}

      ${attacks.length > 0 ? `
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-2">
          <div class="text-[10px] font-mono font-bold uppercase text-slate-400">🗡️ Attacks</div>
          ${attacks.map((a, atkIdx) => {
            const span = Math.max(1, Math.min(4, Number(tok.gridSpan) || 1));
            const edgeOffsetSq = (span - 1) * 0.5;
            const rangeFt = Number(a.rangeFt) || 5;
            const flatHitDc = getFlatNumericDc(a.hitBonus, 12);
            const fullAtkText = `${a.name} ${a.damage || ''} ${a.special || ''}`;
            const isAoe = /area of effect|burst|cone|line|splash|blast radius/i.test(fullAtkText);
            const ignoreLos = doesMobAttackIgnoreLos(a);
            const inRangeCrawlers = getMobAttackInRangeCrawlers(tok, a, scene);
            const losBlockedCrawlers = getMobAttackLosBlockedCrawlers(tok, a, scene);
            const allCrawlers = (scene.tokens || []).filter(t => t.role === 'crawler');
            const condDebuffs = parseAttackConditionalDebuffs(a);

            return `
              <div class="text-[11px] bg-dungeon-950 border border-slate-800/80 rounded-lg p-2 space-y-1.5">
                <div class="flex items-start justify-between gap-1.5">
                  <div class="min-w-0">
                    <div class="font-bold text-slate-100 cursor-help hover:text-amber-300 underline decoration-dotted decoration-slate-600" onmouseenter="showEffectHoverInfo('attack', '${encodeURIComponent(String(a.name || ''))}', 1, '${tok.id}')" onmouseleave="hideEffectHoverInfo()">${a.name} <span class="text-amber-300 font-mono text-[10px]">(Flat ${flatHitDc} • ${rangeFt}ft • ${a.damage || ''})</span></div>
                    ${a.special ? `<div class="text-[10px] text-slate-400 leading-snug mt-0.5">${a.special}</div>` : ''}
                    <div class="flex flex-wrap items-center gap-1.5 mt-1">
                      ${tok.role !== 'crawler' ? `
                        <button type="button" onclick="toggleEffectRangePreview('${tok.id}', ${rangeFt}, ${ignoreLos}, '${String(a.name || 'Attack').replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] font-mono font-semibold transition ${uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === tok.id && uiState.previewEffectRange.label === (a.name || 'Attack') ? 'bg-rose-500/30 border-rose-400 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-400/50'}" title="Show faint red LOS-affected attack range area on map">
                          <span>${uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === tok.id && uiState.previewEffectRange.label === (a.name || 'Attack') ? '🔴 Hide Area' : '⭕ Show Area'}</span>
                        </button>
                        <label class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded border text-[9px] font-mono cursor-pointer ${ignoreLos ? 'bg-purple-500/20 border-purple-400/50 text-purple-200' : 'bg-slate-900 border-slate-700 text-slate-400'}" title="When unchecked, walls and closed doors block this attack's Line of Sight">
                          <input type="checkbox" ${ignoreLos ? 'checked' : ''} onchange="toggleMobAttackIgnoreLos('${tok.id}', ${atkIdx}, this.checked)" class="accent-purple-400" />
                          <span>${ignoreLos ? '👁️ Ignores LOS / Walls' : '🧱 Requires LOS'}</span>
                        </label>
                      ` : ''}
                      ${condDebuffs.map(cd => `<span class="px-1.5 py-0.2 rounded bg-rose-500/15 border border-rose-500/35 text-rose-300 font-mono text-[9px]">Auto-Debuff: <b>${cd.name}</b> (${cd.triggerMode === 'majorFail' ? 'on Evade Major Fail+' : cd.triggerMode === 'anyFail' ? 'on Failed Evade' : 'on Hit'})</span>`).join('')}
                    </div>
                  </div>
                  ${tok.role !== 'crawler' ? (() => {
                    const isDeclared = (scene.declaredMobAttacks || []).some(d => d.id === `${tok.id}_${atkIdx}`);
                    return `
                      <div class="flex flex-col gap-1 shrink-0">
                        <button type="button" onclick="toggleDeclareMobAttack('${tok.id}', ${atkIdx})" ${inRangeCrawlers.length === 0 && !isDeclared ? 'disabled' : ''} class="px-2 py-1 rounded-lg font-extrabold text-[10px] shadow disabled:opacity-40 transition ${isDeclared ? 'bg-amber-400 hover:bg-amber-300 text-slate-950' : 'bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200'}">
                          ${isDeclared ? '🎯 Declared ✓' : '🎯 Declare Target'}
                        </button>
                        <button onclick="executeSingleClickMobAttack('${tok.id}', ${atkIdx})" ${inRangeCrawlers.length === 0 ? 'disabled' : ''} class="px-2 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-[10px] shadow disabled:opacity-40 transition">
                          ⚔️ Execute
                        </button>
                      </div>
                    `;
                  })() : ''}
                </div>
                ${tok.role !== 'crawler' ? (inRangeCrawlers.length === 0 ? `
                  <div class="text-[10px] font-mono text-slate-500 italic">
                    ${losBlockedCrawlers.length > 0
                      ? `🧱 Blocked by wall/door (${losBlockedCrawlers.map(c => c.name).join(', ')} in ${rangeFt}ft, no LOS)`
                      : `No Crawlers within ${rangeFt}ft range`}
                  </div>
                ` : `
                  ${losBlockedCrawlers.length > 0 ? `
                    <div class="text-[9px] font-mono text-amber-300/80 bg-amber-950/30 border border-amber-500/30 rounded px-1.5 py-0.5">
                      🧱 Out of LOS (Wall/Closed Door): ${losBlockedCrawlers.map(c => c.name).join(', ')}
                    </div>
                  ` : ''}
                  <div class="space-y-1 pt-1 border-t border-slate-800/80">
                    <div class="text-[9px] font-mono uppercase text-slate-400">🎯 Targets in Range & Reaction Options:</div>
                    ${inRangeCrawlers.map((c, cIdx) => {
                      const dx = Math.max(0, Math.abs(tok.gx - c.gx) - edgeOffsetSq);
                      const dy = Math.max(0, Math.abs(tok.gy - c.gy) - edgeOffsetSq);
                      const distFt = Math.round(Math.max(dx, dy) * 5);
                      const defaultChecked = a.isSwarmMultiTarget || cIdx === 0;
                      const canBlock = canCrawlerShieldBlockAttack(c, a);
                      const catchers = findEligibleCatchersForTarget(c, allCrawlers, isAoe);
                      return `
                        <div class="bg-dungeon-900 border border-slate-800 rounded px-2 py-1.5 space-y-1 text-[10px]">
                          <div class="flex items-center justify-between gap-2 flex-wrap">
                            <label class="flex items-center gap-1.5 font-bold text-slate-100 cursor-pointer">
                              <input id="mobAtkHitChk_${tok.id}_${atkIdx}_${c.id}" type="checkbox" ${defaultChecked ? 'checked' : ''} class="accent-rose-500" />
                              <span>${c.iconSymbol || '⚔️'} ${c.name} <span class="text-slate-400 font-mono font-normal">(${distFt}ft)</span></span>
                            </label>
                            <div class="flex items-center gap-2 font-mono text-[10px]">
                              ${(() => {
                                const playerEvaded = (appState?.round || 0) > 0 && c.evadeDeclaredRound === appState.round;
                                const anyDeclared = (scene.declaredMobAttacks || []).some(d => d.id === `${tok.id}_${atkIdx}`);
                                const chkDefault = playerEvaded || !anyDeclared;
                                return `
                                  <label class="flex items-center gap-1 cursor-pointer ${playerEvaded ? 'text-emerald-300 font-bold' : 'text-cyan-300'}" title="Roll d20 + Evade (${getEffectiveEvadeDisplay(c)}) vs Flat ${flatHitDc}">
                                    <input id="mobAtkEvadeChk_${tok.id}_${atkIdx}_${c.id}" type="checkbox" ${chkDefault ? 'checked' : ''} class="accent-cyan-400" />
                                    <span>${playerEvaded ? '🛡️ EVADING' : 'Evade'} (${getEffectiveEvadeDisplay(c)})</span>
                                  </label>
                                `;
                              })()}
                              ${canBlock ? `
                                <label class="flex items-center gap-1 text-amber-300 cursor-pointer" title="Roll Shield Block (1d20 + Str) for half damage">
                                  <input id="mobAtkBlockChk_${tok.id}_${atkIdx}_${c.id}" type="checkbox" class="accent-amber-400" />
                                  <span>Block</span>
                                </label>
                              ` : ''}
                            </div>
                          </div>
                          ${catchers.length > 0 ? `
                            <div class="flex items-center gap-1.5 pt-0.5 text-[9px] font-mono text-emerald-300">
                              <span>🤼 Catcher Intercept:</span>
                              <select id="mobAtkCatcherSel_${tok.id}_${atkIdx}_${c.id}" class="flex-1 bg-dungeon-950 border border-emerald-500/40 rounded px-1.5 py-0.5 text-emerald-200">
                                <option value="">None (Target takes hit)</option>
                                ${catchers.map(ct => `<option value="${ct.id}">${ct.iconSymbol} ${ct.name} (Catcher R${ct.rank})</option>`).join('')}
                              </select>
                            </div>
                          ` : ''}
                        </div>
                      `;
                    }).join('')}
                  </div>
                `) : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${tok.role !== 'crawler' ? (() => {
        const otherMobs = (scene.tokens || []).filter(m => m.role !== 'crawler' && m.id !== tok.id && getTokenHealthMetrics(m).curHp > 0);
        if (otherMobs.length === 0) return '';
        return `
          <div class="bg-dungeon-900 border border-amber-500/35 rounded-lg p-2 space-y-1.5 text-[10px]">
            <div class="font-mono font-bold uppercase text-amber-300">⚔️ Mob vs. Mob (Table 8 • 1d12)</div>
            <div class="flex items-center gap-1.5">
              <select id="npcVsNpcTarget_${tok.id}" class="flex-1 min-w-0 bg-dungeon-950 border border-slate-700 rounded px-1.5 py-1 text-slate-200">
                ${otherMobs.map(m => `<option value="${m.id}">${m.iconSymbol || '👹'} ${escapeHtmlAttr(m.name)}</option>`).join('')}
              </select>
              <button type="button" onclick="executeNpcVsNpcResolution('${tok.id}', document.getElementById('npcVsNpcTarget_${tok.id}')?.value)" class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shrink-0">🎲 Clash</button>
            </div>
          </div>
        `;
      })() : ''}

      ${tok.role !== 'crawler' && (tok.lore || tok.aiCommentary) ? `
        <details class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 text-[11px]">
          <summary class="cursor-pointer font-bold text-amber-300 text-[10px] uppercase">📖 Lore & System AI Commentary</summary>
          ${tok.lore ? `<p class="text-slate-300 mt-1.5">${tok.lore}</p>` : ''}
          ${tok.aiCommentary ? `<p class="text-amber-200/90 italic mt-1">“${tok.aiCommentary}”</p>` : ''}
        </details>
      ` : ''}
    </div>
    ${persistentEffectsBoxHtml}
  `;
}

// =========================================================================
// 9. CATALOG RENDERERS (CRAWLERS, BESTIARY, OBJECTS, SKILLS, SPELLS, BUFFS, DEBUFFS)
// =========================================================================
function renderActiveSelectionBannerHtml(tabLabel) {
  const scene = getActiveScene();
  const tok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;
  if (!tok) {
    return `<div class="bg-dungeon-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-400">💡 Click a Crawler or Mob on the map/HUD to assign ${tabLabel} with one click.</div>`;
  }
  return `<div class="bg-cyan-500/15 border border-cyan-400/50 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 flex items-center justify-between"><span>🎯 Target Selected: <b>${tok.iconSymbol || ''} ${tok.name}</b></span><span class="text-[10px] font-mono text-cyan-300">Click buttons below to toggle</span></div>`;
}

function deployCharacterTemplateToMap(templateId) {
  const tpl = (appState.bestiary || []).find(b => b.templateId === templateId);
  const scene = getActiveScene();
  if (!tpl || !scene) return;
  const offset = (scene.tokens?.length || 0) % 6;
  const tok = createTokenFromTpl(tpl, 'tok_' + Date.now(), 4 + offset, 4);
  scene.tokens.push(tok);
  uiState.selectedTokenId = tok.id;
  exploredMemDirty = true;
  commitStateChange();
  showVttToast(`Deployed ${tok.name} to map!`);
}

function deleteCatalogItem(catalogKey, idField, idVal) {
  if (!appState || !Array.isArray(appState[catalogKey])) return;
  appState[catalogKey] = appState[catalogKey].filter(item => item[idField] !== idVal);
  commitStateChange();
}

function clearCatalogWithConfirm(catalogKey) {
  const armKey = `clear_${catalogKey}`;
  if (uiState.clearArmedType !== armKey) {
    uiState.clearArmedType = armKey;
    showVttToast(`⚠️ Click "Clear All" again within 4s to confirm clearing ${catalogKey}`);
    clearTimeout(uiState.clearArmedTimer);
    uiState.clearArmedTimer = setTimeout(() => { uiState.clearArmedType = null; }, 4000);
    return;
  }
  uiState.clearArmedType = null;
  appState[catalogKey] = [];
  commitStateChange();
  showVttToast(`Cleared ${catalogKey}`);
}

function cancelEditCrawler() {
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  setVal('editingCrawlerTplId', '');
  setVal('editingCrawlerTokId', '');
  setVal('newCrawlerIcon', '⚔️');
  setVal('newCrawlerName', '');
  setVal('newCrawlerHpPerPip', 4);
  setVal('newCrawlerStr', '12 (+4)');
  setVal('newCrawlerInt', '12 (+4)');
  setVal('newCrawlerCon', '12 (+4)');
  setVal('newCrawlerDex', '12 (+4)');
  setVal('newCrawlerCha', '12 (+4)');
  setVal('newCrawlerAtkName', '');
  setVal('newCrawlerAtkHit', '');
  setVal('newCrawlerAtkRange', '');
  setVal('newCrawlerAtkDmg', '');
  setVal('newCrawlerNotes', '');
  const hdr = document.getElementById('crawlerFormHeader');
  if (hdr) hdr.textContent = '🦸 Create & Deploy Crawler';
  const subBtn = document.getElementById('crawlerFormSubmitBtn');
  if (subBtn) subBtn.textContent = '+ Save & Deploy Crawler to Map';
  const cancelBtn = document.getElementById('cancelCrawlerEditBtn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
}

function handleCreateCrawlerSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('newCrawlerName')?.value || '').trim();
  if (!name) return;

  const normalizedStats = normalizeStatsObjectToDcc({
    Str: document.getElementById('newCrawlerStr')?.value || '12',
    Int: document.getElementById('newCrawlerInt')?.value || '12',
    Con: document.getElementById('newCrawlerCon')?.value || '12',
    Dex: document.getElementById('newCrawlerDex')?.value || '12',
    Cha: document.getElementById('newCrawlerCha')?.value || '12'
  });
  const autoHpPerPip = getCrawlerConModHpPerPip({ stats: normalizedStats });
  const rawAtkName = (document.getElementById('newCrawlerAtkName')?.value || '').trim();
  const rawAtkHit = (document.getElementById('newCrawlerAtkHit')?.value || '').trim();
  const rawAtkRange = Number(document.getElementById('newCrawlerAtkRange')?.value) || 0;
  const rawAtkDmg = (document.getElementById('newCrawlerAtkDmg')?.value || '').trim();
  const primaryAtk = (rawAtkName || rawAtkDmg) ? [{ name: rawAtkName || 'Attack', hitBonus: rawAtkHit, rangeFt: Math.max(5, rawAtkRange || 5), damage: rawAtkDmg }] : [];

  const tpl = {
    templateId: 'tpl_' + Date.now(),
    name,
    role: 'crawler',
    classification: (document.getElementById('newCrawlerClass')?.value || 'Crawler; Medium, Human').trim(),
    level: Math.max(1, Number(document.getElementById('newCrawlerLevel')?.value) || 1),
    maxPips: 10,
    hpPerPip: autoHpPerPip,
    maxMana: Math.max(0, Number(document.getElementById('newCrawlerMana')?.value) || 10),
    evade: getEffectiveEvadeDisplay({ role: 'crawler', stats: normalizedStats }),
    move: '20+S',
    dr: '0',
    stats: normalizedStats,
    lightRadiusFt: 0,
    iconSymbol: (document.getElementById('newCrawlerIcon')?.value || '⚔️').trim(),
    color: document.getElementById('newCrawlerColor')?.value || '#38bdf8',
    attacks: primaryAtk,
    assignedSkills: [],
    assignedSpells: [],
    notes: (document.getElementById('newCrawlerNotes')?.value || '').trim()
  };

  appState.bestiary.push(tpl);
  deployCharacterTemplateToMap(tpl.templateId);
  cancelEditCrawler();
}

function renderCrawlersRoster() {
  const listEl = document.getElementById('crawlersRosterList');
  if (!listEl) return;
  const crawlers = (appState.bestiary || []).filter(b => b.role === 'crawler');
  listEl.innerHTML = crawlers.map(c => {
    const hpPerPip = getCrawlerConModHpPerPip(c);
    const nStats = normalizeStatsObjectToDcc(c.stats);
    return `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="font-bold text-xs text-slate-100 truncate">${c.iconSymbol || '⚔️'} ${c.name}, Lvl ${c.level || 1}</div>
          <div class="text-[10px] font-mono text-slate-400">10 Pips × ${hpPerPip} HP (${10 * hpPerPip} Max) • MP: ${c.maxMana || 0}</div>
          <div class="text-[9px] font-mono text-cyan-300/85 mt-0.5">Str ${nStats.Str} • Int ${nStats.Int} • Con ${nStats.Con} • Dex ${nStats.Dex} • Cha ${nStats.Cha}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="deployCharacterTemplateToMap('${c.templateId}')" class="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px]">+ Map</button>
          <button onclick="deleteCatalogItem('bestiary', 'templateId', '${c.templateId}')" class="px-1.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[11px]">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function setBestiaryNeighborhoodFilter(nbName) {
  uiState.bestiaryNeighborhoodFilter = nbName || 'ALL';
  renderBestiaryLibrary();
}

function renderBestiaryLibrary() {
  const listEl = document.getElementById('bestiaryLibraryList');
  if (!listEl) return;
  const q = (document.getElementById('bestiarySearchInput')?.value || '').trim().toLowerCase();
  const allMobs = (appState.bestiary || []).filter(b => b.role !== 'crawler');
  const knownNeighborhoods = typeof getAllKnownNeighborhoodNames === 'function' ? getAllKnownNeighborhoodNames() : [];

  // Build filter pills for neighborhoods present in bestiary
  const groupNamesSet = new Set();
  allMobs.forEach(m => {
    const nb = String(m.neighborhood || '').trim() || 'Unassigned';
    groupNamesSet.add(nb);
  });
  const groupNames = Array.from(groupNamesSet).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return a.localeCompare(b);
  });

  const activeFilter = uiState.bestiaryNeighborhoodFilter || 'ALL';
  const filteredMobs = allMobs.filter(m => {
    const nb = String(m.neighborhood || '').trim() || 'Unassigned';
    if (activeFilter !== 'ALL' && nb !== activeFilter) return false;
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      (m.classification || '').toLowerCase().includes(q) ||
      nb.toLowerCase().includes(q) ||
      (m.quarter || '').toLowerCase().includes(q)
    );
  });

  const filterBarHtml = `
    <div class="flex flex-wrap items-center gap-1 pb-1">
      <button type="button" onclick="setBestiaryNeighborhoodFilter('ALL')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${activeFilter === 'ALL' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-600'}">All (${allMobs.length})</button>
      ${groupNames.map(g => {
        const cnt = allMobs.filter(m => (String(m.neighborhood || '').trim() || 'Unassigned') === g).length;
        return `<button type="button" onclick="setBestiaryNeighborhoodFilter('${escapeHtmlAttr(g).replace(/'/g, "\'")}')" class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${activeFilter === g ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-600'}">${escapeHtmlAttr(g)} (${cnt})</button>`;
      }).join('')}
    </div>
  `;

  if (filteredMobs.length === 0) {
    listEl.innerHTML = filterBarHtml + '<div class="text-xs text-slate-500 italic text-center py-4">No matching mobs found.</div>';
    return;
  }

  // Group filtered mobs by neighborhood
  const groupsMap = new Map();
  filteredMobs.forEach(m => {
    const nb = String(m.neighborhood || '').trim() || 'Unassigned';
    if (!groupsMap.has(nb)) groupsMap.set(nb, []);
    groupsMap.get(nb).push(m);
  });

  const sortedGroups = Array.from(groupsMap.entries()).sort((a, b) => {
    if (a[0] === 'Unassigned') return 1;
    if (b[0] === 'Unassigned') return -1;
    return a[0].localeCompare(b[0]);
  });

  const renderMobCard = m => {
    const isBoss = m.tier === 'Boss' || /boss/i.test(m.classification || '');
    const curNb = String(m.neighborhood || '').trim();
    const nbOptions = Array.from(new Set([...knownNeighborhoods, ...(curNb ? [curNb] : [])])).sort();
    return `
      <div class="bg-dungeon-950 border ${isBoss ? 'border-amber-500/50' : 'border-slate-800'} rounded-xl p-2.5 space-y-1.5">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-xs text-slate-100 flex items-center gap-1 flex-wrap">
              <span class="truncate">${m.iconSymbol || '👹'} ${escapeHtmlAttr(m.name)}</span>
              <span class="text-rose-400 font-mono text-[10px]">Lvl ${m.level || 1}</span>
              ${isBoss ? '<span class="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-mono text-[9px] font-extrabold">👑 BOSS</span>' : ''}
            </div>
            <div class="text-[10px] font-mono text-slate-400">${m.maxPips || 3} Pips × ${m.hpPerPip || 2} HP • Evade ${getEffectiveEvadeDisplay(m)} • DR ${m.dr || 0}</div>
            ${m.quarter ? `<div class="text-[9.5px] font-mono text-cyan-300/85 mt-0.5">📍 ${escapeHtmlAttr(m.quarter)}</div>` : ''}
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button onclick="deployCharacterTemplateToMap('${m.templateId}')" class="px-2 py-1 rounded-lg ${isBoss ? 'bg-amber-500 hover:bg-amber-400' : 'bg-rose-500 hover:bg-rose-400'} text-slate-950 font-bold text-[11px]">+ Spawn</button>
            <label title="Upload / Swap Mob Portrait (PNG, JPG, WEBP, JFIF)" class="cursor-pointer px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px]">
              🖼️
              <input type="file" accept="image/*,.jfif" onchange="uploadTokenPortraitImage('${m.templateId}', event, true)" class="hidden" />
            </label>            <button onclick="deleteCatalogItem('bestiary', 'templateId', '${m.templateId}')" class="px-1.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[11px]">🗑️</button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800/70 text-[9.5px] font-mono">
          <span class="text-slate-500">Neighborhood:</span>
          <select onchange="setMobTemplateNeighborhood('${m.templateId}', this.value)" class="bg-dungeon-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 text-[9.5px] max-w-[180px]">
            <option value="" ${!curNb ? 'selected' : ''}>Unassigned</option>
            ${nbOptions.map(nb => `<option value="${escapeHtmlAttr(nb)}" ${curNb === nb ? 'selected' : ''}>${escapeHtmlAttr(nb)}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  };

  const sectionsHtml = sortedGroups.map(([nbName, mobsInGroup]) => {
    const nbPack = typeof CAMPAIGN_NEIGHBORHOODS !== 'undefined'
      ? CAMPAIGN_NEIGHBORHOODS.find(n => n.name === nbName)
      : null;
    // Sort bosses to the bottom or top? Let's put regular mobs first alphabetically, Bosses at the bottom clearly marked
    const sorted = mobsInGroup.slice().sort((a, b) => {
      const aBoss = (a.tier === 'Boss' || /boss/i.test(a.classification || '')) ? 1 : 0;
      const bBoss = (b.tier === 'Boss' || /boss/i.test(b.classification || '')) ? 1 : 0;
      if (aBoss !== bBoss) return aBoss - bBoss;
      return a.name.localeCompare(b.name);
    });
    return `
      <details open class="bg-dungeon-900/60 border border-slate-800 rounded-xl p-2 space-y-2">
        <summary class="cursor-pointer flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-amber-300 select-none">
          <span>🗺️ ${escapeHtmlAttr(nbName)} (${sorted.length})</span>
          ${nbPack ? `<button type="button" onclick="event.preventDefault(); openGmCampaignModal('${nbPack.id}')" class="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 text-[9.5px] font-bold">📖 Guide</button>` : ''}
        </summary>
        <div class="space-y-1.5 pt-1">${sorted.map(renderMobCard).join('')}</div>
      </details>
    `;
  }).join('');

  listEl.innerHTML = filterBarHtml + sectionsHtml;
}

function toggleTrapBuilderFields() {
  const cat = document.getElementById('newObjCategory')?.value || '';
  const box = document.getElementById('trapBuilderFields');
  if (box) box.classList.toggle('hidden', cat !== 'Hazard / Trap');
}

function handleCreateObjectSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('newObjName')?.value || '').trim();
  if (!name) return;
  const category = document.getElementById('newObjCategory')?.value || 'Cover / Obstacle';
  let trapConfig = null;
  if (category === 'Hazard / Trap') {
    const tpRaw = (document.getElementById('newTrapTeleportXY')?.value || '').trim();
    const tpParts = tpRaw.split(',').map(s => parseInt(s.trim(), 10));
    trapConfig = {
      isTrap: true,
      armed: true,
      detected: !Boolean(document.getElementById('newObjHidden')?.checked),
      concealment: document.getElementById('newTrapConcealment')?.value || 'somethings_off',
      trapKind: document.getElementById('newTrapKind')?.value || 'damage',
      checksRequired: Math.max(1, Math.min(6, Number(document.getElementById('newTrapChecksReq')?.value) || 1)),
      checksCompleted: 0,
      detectDcBase: Math.max(5, Number(document.getElementById('newTrapDetectDc')?.value) || 12),
      disarmDcBase: Math.max(5, Number(document.getElementById('newTrapDisarmDc')?.value) || 13),
      hitDcBase: 12,
      damageExpr: (document.getElementById('newTrapDamageExpr')?.value || 'Fd6').trim(),
      damageType: 'Piercing',
      applyDebuff: (document.getElementById('newTrapDebuff')?.value || '').trim(),
      collapseDrainHours: Math.max(0, Number(document.getElementById('newTrapClockDrain')?.value) || 0),
      teleportAnchorGx: Number.isFinite(tpParts[0]) ? tpParts[0] : null,
      teleportAnchorGy: Number.isFinite(tpParts[1]) ? tpParts[1] : null,
      aoeFt: 0
    };
  }
  const tpl = {
    id: 'obj_tpl_' + Date.now(),
    name,
    category,
    iconSymbol: (document.getElementById('newObjIcon')?.value || '📦').trim(),
    color: document.getElementById('newObjColor')?.value || '#10b981',
    lightRadiusFt: Number(document.getElementById('newObjLight')?.value) || 0,
    notes: (document.getElementById('newObjNotes')?.value || '').trim(),
    trapConfig
  };
  appState.objectTemplates.push(tpl);
  dropObjectTemplateToMap(tpl.id, Boolean(document.getElementById('newObjHidden')?.checked));
  document.getElementById('newObjName').value = '';
}

function dropObjectTemplateToMap(tplId, hidden = false) {
  const tpl = (appState.objectTemplates || []).find(o => o.id === tplId);
  const scene = getActiveScene();
  if (!tpl || !scene) return;
  if ((tpl.category === 'Hazard / Trap' || (tpl.trapConfig && tpl.trapConfig.isTrap)) && /stair|descend|exit/i.test(scene.name || '')) {
    showVttToast('⚠️ Book Rule Reminder: Traps cannot be placed in rooms with stairwells to lower floors!');
  }
  const clonedTrap = tpl.trapConfig
    ? Object.assign({}, tpl.trapConfig, { armed: true, detected: !hidden, checksCompleted: 0 })
    : (tpl.category === 'Hazard / Trap' ? { isTrap: true, armed: true, detected: !hidden, concealment: 'somethings_off', trapKind: 'damage', checksRequired: 1, checksCompleted: 0, detectDcBase: 12, disarmDcBase: 13, hitDcBase: 12, damageExpr: 'Fd6', damageType: 'Piercing', applyDebuff: '', collapseDrainHours: 0, teleportAnchorGx: null, teleportAnchorGy: null, aoeFt: 0 } : null);
  scene.mapObjects = scene.mapObjects || [];
  scene.mapObjects.push({
    id: 'mapobj_' + Date.now(),
    templateId: tpl.id,
    name: tpl.name,
    category: tpl.category,
    iconSymbol: tpl.iconSymbol,
    color: tpl.color,
    lightRadiusFt: tpl.lightRadiusFt || 0,
    notes: tpl.notes || '',
    hiddenFromPlayers: hidden,
    trapConfig: clonedTrap,
    gx: 5,
    gy: 5
  });
  commitStateChange();
  showVttToast(`Dropped ${tpl.name} onto map`);
}

function removeActiveSceneObject(objId) {
  const scene = getActiveScene();
  if (!scene) return;
  scene.mapObjects = (scene.mapObjects || []).filter(o => o.id !== objId);
  commitStateChange();
}

function renderObjectsCatalog() {
  const scene = getActiveScene();
  const activeEl = document.getElementById('activeSceneObjectsList');
  if (activeEl && scene) {
    activeEl.innerHTML = (scene.mapObjects || []).map(o => `
      <div class="bg-dungeon-950 border border-slate-800 rounded-lg px-2 py-1.5 flex items-center justify-between text-xs">
        <span class="truncate">${o.iconSymbol || '📦'} <b>${o.name}</b> <span class="text-[10px] font-mono text-slate-400">(${o.gx}, ${o.gy})</span></span>
        <div class="flex items-center gap-1 shrink-0">
          ${(o.category === 'Hazard / Trap' || (o.trapConfig && o.trapConfig.isTrap)) ? `<button type="button" onclick="executeSpringTrapOnHost('${o.id}', uiState.selectedTokenId || '', false)" title="Spring Trap Now" class="px-1.5 py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/40 text-rose-200 text-[9.5px] font-bold">💥 Spring</button>` : ''}
          <button onclick="removeActiveSceneObject('${o.id}')" class="text-rose-400 hover:text-rose-300 text-xs font-bold">✕</button>
        </div>
      </div>
    `).join('') || '<div class="text-[11px] text-slate-500 italic">No objects placed on this map.</div>';
  }

  const tplEl = document.getElementById('objectTemplatesList');
  if (tplEl) {
    tplEl.innerHTML = (appState.objectTemplates || []).map(o => `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2 text-xs">
        <div class="min-w-0">
          <div class="font-bold text-slate-100 truncate">${o.iconSymbol || '📦'} ${o.name}</div>
          <div class="text-[10px] text-slate-400 truncate">${o.category}${o.lightRadiusFt ? ` • ${o.lightRadiusFt}ft Light` : ''}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${o.category === 'Hazard / Trap' ? `<button onclick="dropObjectTemplateToMap('${o.id}', true)" title="Drop Hidden Trap on Map" class="px-1.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 font-bold text-[10px]">🕵️ Trap</button>` : ''}
          <button onclick="dropObjectTemplateToMap('${o.id}')" class="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px]">+ Drop</button>
        </div>
      </div>
    `).join('');
  }
}

function handleCreateCustomSkillSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('newCustomSkillName')?.value || '').trim();
  if (!name) return;
  const group = document.getElementById('newCustomSkillGroup')?.value || 'attack';
  const hitStat = document.getElementById('newCustomSkillStat')?.value || (group === 'attack' ? 'Str' : 'Dex');
  const range = (document.getElementById('newCustomSkillRange')?.value || (group === 'attack' ? '5 feet' : 'Self')).trim();
  const baseDamage = (document.getElementById('newCustomSkillDmg')?.value || '').trim();
  const desc = (document.getElementById('newCustomSkillDesc')?.value || '').trim();
  const isPassive = Boolean(document.getElementById('newCustomSkillPassive')?.checked);
  const upgrades = [
    (document.getElementById('newCustomSkillR5')?.value || '').trim(),
    (document.getElementById('newCustomSkillR10')?.value || '').trim(),
    (document.getElementById('newCustomSkillR15')?.value || '').trim()
  ].filter(Boolean).map((txt, idx) => {
    const tier = idx === 0 ? 5 : idx === 1 ? 10 : 15;
    return /^Rank\s+\d+/i.test(txt) ? txt : `Rank ${tier}: ${txt}`;
  });

  appState.skills = appState.skills || [];
  appState.skills.unshift({
    id: 'sk_custom_' + Date.now(),
    name,
    skillGroup: group,
    tags: isPassive ? 'Passive, Custom' : 'Custom',
    range,
    effectType: isPassive ? 'passive' : (group === 'attack' ? 'attack' : 'buff'),
    diceFormula: baseDamage,
    hitStat,
    applyBuff: '',
    applyDebuff: '',
    lightRadiusFt: 0,
    baseDamage,
    rank1Effect: desc,
    description: desc,
    vfxType: group === 'attack' ? 'slash' : 'aura',
    vfxColor: group === 'attack' ? '#f59e0b' : '#10b981',
    upgrades
  });

  event.target.reset();
  commitStateChange();
  showVttToast(`⚔️ Created Custom Skill: ${name}!`);
}

function renderSkillsCatalog() {
  const banner = document.getElementById('skillsTargetBanner');
  if (banner) banner.innerHTML = renderActiveSelectionBannerHtml('skills');
  const listEl = document.getElementById('skillsCatalogList');
  if (!listEl) return;

  const q = (document.getElementById('skillsSearchInput')?.value || '').trim().toLowerCase();
  const scene = getActiveScene();
  const selTok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;

  const filtered = (appState.skills || []).filter(s => {
    if (uiState.skillSubTab !== 'all' && (s.skillGroup || 'utility') !== uiState.skillSubTab) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q) || (s.tags || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
  });

  listEl.innerHTML = filtered.map(s => {
    const isAssigned = selTok && selTok.role === 'crawler' && (selTok.assignedSkills || []).some(a => a.id === s.id);
    const isAtk = (s.skillGroup || 'utility') === 'attack';
    return `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap cursor-help" onmouseenter="showEffectHoverInfo('skill', '${encodeURIComponent(String(s.id || s.name))}', 1, '${selTok ? selTok.id : ''}')" onmouseleave="hideEffectHoverInfo()">
              <span class="hover:text-amber-300 underline decoration-dotted decoration-slate-600">${s.name}</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-mono ${isAtk ? 'bg-rose-500/20 text-rose-300' : 'bg-cyan-500/20 text-cyan-300'}">${isAtk ? '⚔️ Attack' : '🛠️ Utility'}</span>
            </div>
            <div class="text-[10px] font-mono text-slate-400">${s.tags || ''}${s.range ? ` • ${s.range}` : ''}${s.baseDamage ? ` • ${s.baseDamage}` : ''}</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="toggleCatalogAbilityEditor('skill', '${s.id}')" title="Configure explicit Effect Type, Dice, Buff/Debuff, Light, and VFX" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px]">⚙️ Rules</button>
            ${selTok && selTok.role === 'crawler' ? `
              <button onclick="assignAbilityToCrawler('${selTok.id}', 'skill', '${s.id}')" class="px-2 py-1 rounded-lg font-bold text-[10px] ${isAssigned ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200'}">
                ${isAssigned ? `✓ ${selTok.name}` : `+ ${selTok.name}`}
              </button>
            ` : ''}
          </div>
        </div>
        <p class="text-[11px] text-slate-300">${s.rank1Effect || s.description || ''}</p>
        ${renderAbilityUpgradesDropdownHtml(s, 0)}
        ${renderAbilityCatalogEditorHtml('skill', s)}
      </div>
    `;
  }).join('');
}


function loadAllBuiltInSkills() {
  if (!appState) return;
  appState.skills = appState.skills || [];
  let added = 0;
  let updated = 0;
  DEFAULT_SKILLS_LIST.forEach(defSk => {
    const existing = appState.skills.find(s => String(s.name || '').trim().toLowerCase() === defSk.name.trim().toLowerCase());
    if (!existing) {
      appState.skills.push(JSON.parse(JSON.stringify(defSk)));
      added++;
    } else {
      existing.skillGroup = defSk.skillGroup || existing.skillGroup;
      existing.tags = defSk.tags || existing.tags;
      existing.range = defSk.range || existing.range;
      existing.baseDamage = defSk.baseDamage || existing.baseDamage;
      existing.description = defSk.description || existing.description;
      existing.rank1Effect = defSk.rank1Effect || existing.rank1Effect;
      existing.effectType = defSk.effectType || existing.effectType;
      existing.diceFormula = defSk.diceFormula || existing.diceFormula;
      existing.hitStat = defSk.hitStat || existing.hitStat;
      existing.applyBuff = defSk.applyBuff || existing.applyBuff;
      existing.applyDebuff = defSk.applyDebuff || existing.applyDebuff;
      existing.vfxType = defSk.vfxType || existing.vfxType;
      existing.vfxColor = defSk.vfxColor || existing.vfxColor;
      if (defSk.upgrades && defSk.upgrades.length) existing.upgrades = [...defSk.upgrades];
      updated++;
    }
  });
  commitStateChange();
  showVttToast(`⚔️ Loaded ${added} new & updated ${updated} DCC Skills!`);
}

function loadAllBuiltInSpells() {
  if (!appState) return;
  appState.spells = appState.spells || [];
  let added = 0;
  let updated = 0;
  DEFAULT_SPELLS_LIST.forEach(defSp => {
    const existing = appState.spells.find(s => String(s.name || '').trim().toLowerCase() === defSp.name.toLowerCase());
    if (existing) {
      Object.assign(existing, defSp, { id: existing.id });
      updated++;
    } else {
      appState.spells.push(JSON.parse(JSON.stringify(defSp)));
      added++;
    }
  });
  commitStateChange();
  showVttToast(`✨ Synced 95 Spells with custom VFX (${added} added, ${updated} updated)!`);
}

function renderSpellsCatalog() {
  const banner = document.getElementById('spellsTargetBanner');
  if (banner) banner.innerHTML = renderActiveSelectionBannerHtml('spells');
  const listEl = document.getElementById('spellsCatalogList');
  if (!listEl) return;

  const q = (document.getElementById('spellsSearchInput')?.value || '').trim().toLowerCase();
  const scene = getActiveScene();
  const selTok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;

  const filtered = (appState.spells || []).filter(sp => !q || sp.name.toLowerCase().includes(q) || (sp.tags || '').toLowerCase().includes(q) || (sp.description || '').toLowerCase().includes(q));

  listEl.innerHTML = filtered.map(sp => {
    const isAssigned = selTok && selTok.role === 'crawler' && (selTok.assignedSpells || []).some(a => a.id === sp.id);
    return `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap cursor-help" onmouseenter="showEffectHoverInfo('spell', '${encodeURIComponent(String(sp.id || sp.name))}', 1, '${selTok ? selTok.id : ''}')" onmouseleave="hideEffectHoverInfo()">
              <span class="hover:text-indigo-300 underline decoration-dotted decoration-slate-600">${sp.name}</span>
              <span class="text-[10px] font-mono text-indigo-300">${sp.manaCost ? `(${sp.manaCost} MP)` : ''}</span>
              ${(() => {
                const v = inferVfxFromAbility(sp);
                const pLabel = (VFX_PRESET_LIBRARY.find(x => x.id === v.vfxType)?.label || v.vfxType).split(' ')[0];
                return `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono border" style="border-color:${v.vfxColor}66; color:${v.vfxColor}; background:${v.vfxColor}18">${pLabel} VFX</span>`;
              })()}
            </div>
            <div class="text-[10px] font-mono text-slate-400">${sp.tags || ''}${sp.range ? ` • ${sp.range}` : ''}${sp.baseDamage ? ` • ${sp.baseDamage}` : ''}</div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="toggleCatalogAbilityEditor('spell', '${sp.id}')" title="Configure explicit Effect Type, Dice, Buff/Debuff, Light, and VFX" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px]">⚙️ Rules</button>
            ${selTok && selTok.role === 'crawler' ? `
              <button onclick="assignAbilityToCrawler('${selTok.id}', 'spell', '${sp.id}')" class="px-2 py-1 rounded-lg font-bold text-[10px] ${isAssigned ? 'bg-emerald-500 text-slate-950' : 'bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200'}">
                ${isAssigned ? `✓ ${selTok.name}` : `+ ${selTok.name}`}
              </button>
            ` : ''}
          </div>
        </div>
        <p class="text-[11px] text-slate-300">${sp.rank1Effect || sp.description || ''}</p>
        ${renderAbilityUpgradesDropdownHtml(sp, 0)}
        ${renderAbilityCatalogEditorHtml('spell', sp)}
      </div>
    `;
  }).join('');
}

function handleCreateBuffSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('newBuffName')?.value || '').trim();
  if (!name) return;
  appState.buffs = appState.buffs || [];
  appState.buffs.unshift({
    id: 'buf_' + Date.now(),
    name,
    category: (document.getElementById('newBuffTags')?.value || 'Custom Buff').trim(),
    duration: (document.getElementById('newBuffDuration')?.value || 'Combat').trim(),
    color: document.getElementById('newBuffColor')?.value || '#10b981',
    description: (document.getElementById('newBuffDescription')?.value || '').trim()
  });
  document.getElementById('newBuffName').value = '';
  document.getElementById('newBuffDescription').value = '';
  commitStateChange();
  showVttToast(`✨ Created Buff: ${name}`);
}

function toggleCatalogBuffOnSelected(buffName) {
  const scene = getActiveScene();
  const tok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;
  if (!tok) return;
  tok.buffs = tok.buffs || [];
  if (tok.buffs.includes(buffName)) removeBuffFromToken(tok.id, buffName);
  else addBuffToToken(tok.id, buffName);
}

function renderBuffsCatalog() {
  const banner = document.getElementById('buffsTargetBanner');
  if (banner) banner.innerHTML = renderActiveSelectionBannerHtml('buffs');
  const listEl = document.getElementById('buffsCatalogList');
  if (!listEl) return;

  const q = (document.getElementById('buffsSearchInput')?.value || '').trim().toLowerCase();
  const scene = getActiveScene();
  const selTok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;

  const filtered = (appState.buffs || []).filter(b => !q || b.name.toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q));
  listEl.innerHTML = filtered.map(b => {
    const isActive = selTok && (selTok.buffs || []).includes(b.name);
    return `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-emerald-300 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${b.color || '#10b981'}"></span>
              <span>${b.name}</span>
            </div>
            <div class="text-[10px] font-mono text-slate-400">${b.category || ''}${b.duration ? ` • ${b.duration}` : ''}</div>
          </div>
          ${selTok ? `
            <button onclick="toggleCatalogBuffOnSelected('${String(b.name).replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-lg font-bold text-[10px] shrink-0 ${isActive ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200'}">
              ${isActive ? `✓ ${selTok.name}` : `+ ${selTok.name}`}
            </button>
          ` : ''}
        </div>
        <p class="text-[11px] text-slate-300">${b.description || ''}</p>
      </div>
    `;
  }).join('');
}

function handleCreateDebuffSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('newDebuffName')?.value || '').trim();
  if (!name) return;
  appState.debuffs = appState.debuffs || [];
  appState.debuffs.unshift({
    id: 'deb_' + Date.now(),
    name,
    category: (document.getElementById('newDebuffTags')?.value || 'Custom Debuff').trim(),
    duration: (document.getElementById('newDebuffDuration')?.value || '1 Round').trim(),
    color: document.getElementById('newDebuffColor')?.value || '#ef4444',
    description: (document.getElementById('newDebuffDescription')?.value || '').trim()
  });
  document.getElementById('newDebuffName').value = '';
  document.getElementById('newDebuffDescription').value = '';
  commitStateChange();
  showVttToast(`☣️ Created Debuff: ${name}`);
}

function toggleCatalogDebuffOnSelected(debuffName) {
  const scene = getActiveScene();
  const tok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;
  if (!tok) return;
  tok.statuses = tok.statuses || [];
  if (tok.statuses.includes(debuffName)) removeStatusFromToken(tok.id, debuffName);
  else addStatusToToken(tok.id, debuffName);
}

function renderDebuffsCatalog() {
  const banner = document.getElementById('debuffsTargetBanner');
  if (banner) banner.innerHTML = renderActiveSelectionBannerHtml('debuffs');
  const listEl = document.getElementById('debuffsCatalogList');
  if (!listEl) return;

  const q = (document.getElementById('debuffsSearchInput')?.value || '').trim().toLowerCase();
  const scene = getActiveScene();
  const selTok = scene && uiState.selectedTokenId ? (scene.tokens || []).find(t => t.id === uiState.selectedTokenId) : null;

  const filtered = (appState.debuffs || []).filter(d => !q || d.name.toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q));
  listEl.innerHTML = filtered.map(d => {
    const isActive = selTok && (selTok.statuses || []).includes(d.name);
    return `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-1 text-xs">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-rose-300 flex items-center gap-1.5">
              <span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${d.color || '#ef4444'}"></span>
              <span>${d.name}</span>
            </div>
            <div class="text-[10px] font-mono text-slate-400">${d.category || ''}${d.duration ? ` • ${d.duration}` : ''}</div>
          </div>
          ${selTok ? `
            <button onclick="toggleCatalogDebuffOnSelected('${String(d.name).replace(/'/g, "\\'")}')" class="px-2 py-1 rounded-lg font-bold text-[10px] shrink-0 ${isActive ? 'bg-rose-500 text-slate-950' : 'bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200'}">
              ${isActive ? `✓ ${selTok.name}` : `+ ${selTok.name}`}
            </button>
          ` : ''}
        </div>
        <p class="text-[11px] text-slate-300">${d.description || ''}</p>
      </div>
    `;
  }).join('');
}


const CRAWLER_RACE_SIZE_MAP = {
  Human: 'Medium',
  Primal: 'Medium',
  Cat: 'Small',
  Elf: 'Medium',
  Dwarf: 'Medium',
  Gnome: 'Small',
  Goblin: 'Small',
  Orc: 'Medium',
  Changeling: 'Medium',
  Bopca: 'Medium',
  Skyfowl: 'Medium',
  'Kua-Tin': 'Small',
  Ogre: 'Large'
};

function getCrawlerSizeForRace(race) {
  return CRAWLER_RACE_SIZE_MAP[race] || 'Medium';
}

function syncPlayerCrawlerRaceSize() {
  const race = document.getElementById('pNewCrawlerRace')?.value || 'Human';
  const size = getCrawlerSizeForRace(race);
  const badge = document.getElementById('pNewCrawlerSizeBadge');
  if (badge) badge.textContent = `Size: ${size}`;
}

function openPlayerCreateCrawlerModal() {
  openCrawlerCreationWizard('player');
}

function closePlayerCreateCrawlerModal() {
  const modal = document.getElementById('playerCreateCrawlerModal');
  if (modal) modal.classList.add('hidden');
}

function syncPlayerCrawlerStatInput(inputEl) {
  if (!inputEl) return;
  const m = String(inputEl.value || '').match(/^(\d+)/);
  if (m) {
    const score = Math.max(1, parseInt(m[1], 10));
    const mod = getDccStatModifierFromScore(score);
    inputEl.title = `DCC Stat Score ${score} → +${mod} Modifier`;
    if (inputEl.id === 'pNewCrawlerCon') {
      const hpPipEl = document.getElementById('pNewCrawlerHpPerPip');
      if (hpPipEl) hpPipEl.value = mod;
    }
  }
}

function handlePlayerCreateCrawlerSubmit(event) {
  event.preventDefault();
  const name = (document.getElementById('pNewCrawlerName')?.value || '').trim();
  if (!name) return;

  const rawAtkName = (document.getElementById('pNewCrawlerAtkName')?.value || '').trim();
  const rawAtkHit = (document.getElementById('pNewCrawlerAtkHit')?.value || '').trim();
  const rawAtkRange = Number(document.getElementById('pNewCrawlerAtkRange')?.value) || 0;
  const rawAtkDmg = (document.getElementById('pNewCrawlerAtkDmg')?.value || '').trim();
  const primaryAtk = (rawAtkName || rawAtkDmg)
    ? [{ name: rawAtkName || 'Attack', hitBonus: rawAtkHit, rangeFt: Math.max(5, rawAtkRange || 5), damage: rawAtkDmg }]
    : [];

  const race = (document.getElementById('pNewCrawlerRace')?.value || 'Human').trim();
  const size = getCrawlerSizeForRace(race);
  const crawlerPayload = {
    name,
    iconSymbol: (document.getElementById('pNewCrawlerIcon')?.value || '⚔️').trim(),
    race,
    size,
    classification: `Crawler; ${size}, ${race}`,
    color: document.getElementById('pNewCrawlerColor')?.value || '#38bdf8',
    level: Math.max(1, Number(document.getElementById('pNewCrawlerLevel')?.value) || 1),
    maxMana: Math.max(0, Number(document.getElementById('pNewCrawlerMana')?.value) || 10),
    stats: {
      Str: document.getElementById('pNewCrawlerStr')?.value || '12',
      Int: document.getElementById('pNewCrawlerInt')?.value || '12',
      Con: document.getElementById('pNewCrawlerCon')?.value || '12',
      Dex: document.getElementById('pNewCrawlerDex')?.value || '12',
      Cha: document.getElementById('pNewCrawlerCha')?.value || '12'
    },
    attacks: primaryAtk,
    notes: (document.getElementById('pNewCrawlerNotes')?.value || '').trim()
  };

  sendPlayerCreateCrawlerToHost(crawlerPayload);
  closePlayerCreateCrawlerModal();
  const form = document.getElementById('playerCrawlerBuilderForm');
  if (form) form.reset();
  const hpPipEl = document.getElementById('pNewCrawlerHpPerPip');
  if (hpPipEl) hpPipEl.value = 4;
  syncPlayerCrawlerRaceSize();
  showVttToast(`🦸 Creating ${name} and deploying to map...`);
}

function openPlayerClaimModal() {
  const modal = document.getElementById('playerClaimCrawlerModal');
  if (modal) modal.classList.remove('hidden');
  renderPlayerClaimModal();
}

function closePlayerClaimModal() {
  const modal = document.getElementById('playerClaimCrawlerModal');
  if (modal) modal.classList.add('hidden');
}

function releaseClaimedCrawler() {
  sendPlayerReleaseToHost();
  closePlayerClaimModal();
}

function renderPlayerClaimModal() {
  const listEl = document.getElementById('playerClaimCrawlerList');
  if (!listEl) return;
  const scene = getActiveScene();
  const onMapCrawlers = (scene?.tokens || []).filter(t => t.role === 'crawler');
  const deployedTplIds = new Set(onMapCrawlers.map(t => t.templateId).filter(Boolean));
  const rosterCrawlers = (appState?.bestiary || []).filter(b => b.role === 'crawler' && !deployedTplIds.has(b.templateId));
  const claimedMap = appState?.claimedCrawlers || {};

  if (onMapCrawlers.length === 0 && rosterCrawlers.length === 0) {
    listEl.innerHTML = '<div class="text-xs font-mono text-slate-400 text-center py-4">No crawlers available yet. Click "+ Create New Crawler" below to build one!</div>';
    return;
  }

  let html = '';

  if (onMapCrawlers.length > 0) {
    html += `<div class="text-[10px] font-mono uppercase text-cyan-400 font-bold px-0.5">🗺️ On Current Map</div>`;
    html += onMapCrawlers.map(c => {
      const isMine = uiState.claimedCrawlerId === c.id;
      const claimedByOther = Boolean(claimedMap[c.id]) && !isMine;
      const hm = getTokenHealthMetrics(c);
      return `
        <div class="bg-dungeon-950 border ${isMine ? 'border-cyan-400' : 'border-slate-800'} rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-xs text-slate-100 truncate">${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)} <span class="text-[10px] font-mono text-amber-400">Lvl ${c.level || 1}</span></div>
            <div class="text-[10px] font-mono text-slate-400">HP ${hm.curHp}/${hm.maxHp} • MP ${c.currentMana ?? 0}/${c.maxMana ?? 0} • AP ${c.currentAp ?? 2}/${c.maxAp ?? 2}</div>
          </div>
          <button type="button" onclick="sendPlayerClaimToHost('${c.id}')" ${claimedByOther ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${isMine ? 'bg-emerald-500 text-slate-950' : claimedByOther ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'}">
            ${isMine ? '✓ Controlling' : claimedByOther ? '🔒 Taken' : 'Claim'}
          </button>
        </div>
      `;
    }).join('');
  }

  if (rosterCrawlers.length > 0) {
    html += `<div class="text-[10px] font-mono uppercase text-emerald-400 font-bold px-0.5 ${onMapCrawlers.length > 0 ? 'pt-2 border-t border-slate-800' : ''}">📚 Saved Roster (Deploy & Claim)</div>`;
    html += rosterCrawlers.map(c => {
      const hpPerPip = getCrawlerConModHpPerPip(c);
      return `
        <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-xs text-slate-100 truncate">${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)} <span class="text-[10px] font-mono text-amber-400">Lvl ${c.level || 1}</span></div>
            <div class="text-[10px] font-mono text-slate-400">Max HP ${10 * hpPerPip} • Max MP ${c.maxMana || 0} • Ready to Deploy</div>
          </div>
          <button type="button" onclick="sendPlayerDeployAndClaimToHost('${c.templateId}')" class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 transition">
            + Deploy & Claim
          </button>
        </div>
      `;
    }).join('');
  }

  listEl.innerHTML = html;
}

function updatePlayerClaimButtonUi() {
  if (!IS_PLAYER_WINDOW) return;
  const btn = document.getElementById('claimCrawlerBtn');
  const lbl = document.getElementById('claimCrawlerBtnLabel');
  if (btn) btn.classList.remove('hidden');
  const claimedTok = getClaimedCrawlerToken();
  if (lbl) {
    lbl.textContent = claimedTok ? `Playing: ${claimedTok.name}` : 'Claim Crawler';
  }
  const modal = document.getElementById('playerClaimCrawlerModal');
  if (modal && !modal.classList.contains('hidden')) {
    renderPlayerClaimModal();
  }
}


// =========================================================================
// 10B. PLAYER CRAWLER CONTROL HUD (10-SLOT HOTLIST, LEARNED, R0 SKILLS, SHEET)
// =========================================================================
function togglePlayerControlDeck() {
  if (!IS_PLAYER_WINDOW) return;
  uiState.playerDeckOpen = !uiState.playerDeckOpen;
  const deck = document.getElementById('playerControlDeck');
  if (deck) deck.classList.toggle('hidden', !uiState.playerDeckOpen);
  if (uiState.playerDeckOpen) renderPlayerControlDeck();
}

function setPlayerDeckTab(tab) {
  uiState.activePlayerDeckTab = ['actions', 'learned', 'skills', 'items', 'sheet'].includes(tab) ? tab : 'actions';
  ['actions', 'learned', 'skills', 'items', 'sheet'].forEach(t => {
    const btn = document.getElementById(`playerDeckTabBtn_${t}`);
    if (!btn) return;
    btn.className = uiState.activePlayerDeckTab === t
      ? 'px-1 py-1.5 rounded-lg text-[10px] font-bold bg-cyan-500 text-slate-950 transition'
      : 'px-1 py-1.5 rounded-lg text-[10px] font-semibold bg-dungeon-850 text-slate-300 hover:bg-dungeon-800 transition';
  });
  renderPlayerControlDeck();
}

function setPlayerLearnedSubTab(sub) {
  uiState.playerLearnedSubTab = ['combat', 'utility', 'spells'].includes(sub) ? sub : 'combat';
  renderPlayerControlDeck();
}

function setPlayerSkillSubTab(sub) {
  uiState.playerSkillSubTab = sub;
  renderPlayerControlDeck();
}

const DCC_QUICK_ITEMS_LIBRARY = [
  { name: 'Healing Potion', icon: '❤️', category: 'Consumable', qty: 1, notes: 'Restores 5 Health Bar slots.' },
  { name: 'Mana Potion', icon: '💧', category: 'Consumable', qty: 1, notes: 'Restores full Mana.' },
  { name: 'Torch', icon: '🔥', category: 'Utility', qty: 1, notes: '20ft bright light / 20ft dim light.' },
  { name: 'Goblin Dynamite', icon: '🧨', category: 'Explosive', qty: 1, notes: '1d6+ Bludgeoning + 5ft Splash (unstable!).' },
  { name: 'Bandages', icon: '🩹', category: 'Consumable', qty: 1, notes: 'Stops bleeding / First Aid aid.' },
  { name: 'Antidote', icon: '🧪', category: 'Consumable', qty: 1, notes: 'Clears Poisoned / Washed debuffs.' },
  { name: '50ft Rope', icon: '🪢', category: 'Utility', qty: 1, notes: 'Climbing, tying, or makeshift harness.' }
];

function getCrawlerInventory(tok) {
  if (!tok) return [];
  if (!Array.isArray(tok.inventory)) tok.inventory = [];
  return tok.inventory;
}

function commitPlayerInventory(tok, nextInv) {
  if (!tok) return;
  tok.inventory = Array.isArray(nextInv) ? nextInv : [];
  if (IS_PLAYER_WINDOW) {
    sendPlayerInventoryUpdateToHost(tok.id, tok.inventory);
    renderPlayerControlDeck();
  } else {
    commitStateChange();
  }
}

function addItemToCrawlerInventory(tok, itemObj) {
  if (!tok || !itemObj || !String(itemObj.name || '').trim()) return;
  const inv = [...getCrawlerInventory(tok)];
  const cleanName = String(itemObj.name).trim();
  const addQty = Math.max(1, Math.min(999, Number(itemObj.qty) || 1));
  const existing = inv.find(i => String(i.name || '').trim().toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    existing.qty = Math.min(999, (Number(existing.qty) || 1) + addQty);
  } else {
    inv.unshift({
      id: 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: cleanName,
      icon: itemObj.icon || '🎒',
      category: itemObj.category || 'Utility',
      qty: addQty,
      notes: String(itemObj.notes || '').trim()
    });
  }
  commitPlayerInventory(tok, inv);
  showVttToast(`🎒 Added ${addQty}× ${cleanName} to ${tok.name}'s Inventory`);
}

function playerAddQuickItem(idx) {
  const tok = getClaimedCrawlerToken();
  const tpl = DCC_QUICK_ITEMS_LIBRARY[idx];
  if (!tok || !tpl) return;
  addItemToCrawlerInventory(tok, tpl);
}

function playerAddCustomInventoryItem(event) {
  if (event) event.preventDefault();
  const tok = getClaimedCrawlerToken();
  if (!tok) return;
  const name = (document.getElementById('pInvCustomName')?.value || '').trim();
  if (!name) return;
  addItemToCrawlerInventory(tok, {
    name,
    icon: document.getElementById('pInvCustomIcon')?.value || '🎒',
    category: document.getElementById('pInvCustomCat')?.value || 'Utility',
    qty: Number(document.getElementById('pInvCustomQty')?.value) || 1,
    notes: (document.getElementById('pInvCustomNotes')?.value || '').trim()
  });
}

function adjustCrawlerInventoryQty(tokenId, itemId, delta) {
  const tok = IS_PLAYER_WINDOW
    ? getClaimedCrawlerToken()
    : getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const inv = [...getCrawlerInventory(tok)];
  const item = inv.find(i => i.id === itemId);
  if (!item) return;
  const nextQty = (Number(item.qty) || 1) + delta;
  if (nextQty <= 0) {
    commitPlayerInventory(tok, inv.filter(i => i.id !== itemId));
    showVttToast(`Removed ${item.name} from Inventory`);
  } else {
    item.qty = Math.min(999, nextQty);
    commitPlayerInventory(tok, inv);
  }
}

function removeCrawlerInventoryItem(tokenId, itemId) {
  const tok = IS_PLAYER_WINDOW
    ? getClaimedCrawlerToken()
    : getActiveScene()?.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const inv = getCrawlerInventory(tok).filter(i => i.id !== itemId);
  commitPlayerInventory(tok, inv);
}

function bindInventoryItemToHotlist(itemId) {
  const tok = getClaimedCrawlerToken();
  if (!tok || !itemId) return;
  const item = getCrawlerInventory(tok).find(i => i.id === itemId);
  if (!item) return;
  const slots = [...getOrBuildCrawlerHotlist(tok)];
  const existingIdx = slots.findIndex(s => s && s.type === 'item' && (s.invId === item.id || String(s.name || '').toLowerCase() === String(item.name || '').toLowerCase()));
  if (existingIdx !== -1) {
    slots[existingIdx] = null;
    commitPlayerHotlist(tok, slots);
    showVttToast(`Removed ${item.name} from Hotlist Slot #${existingIdx + 1}`);
    return;
  }
  const emptyIdx = slots.findIndex(s => !s);
  if (emptyIdx === -1) {
    showVttToast('⚠️ All 10 Hotlist slots are full! Clear a slot on ⚡ Hotlist first.');
    return;
  }
  slots[emptyIdx] = {
    type: 'item',
    id: 'item_' + Date.now(),
    invId: item.id,
    name: item.name,
    icon: item.icon || '🎒',
    qty: item.qty || 1,
    note: item.notes || 'Instant Hotlist access'
  };
  uiState.activeHotlistSlotIdx = emptyIdx;
  commitPlayerHotlist(tok, slots);
  showVttToast(`⚡ Bound ${item.name} to Hotlist Slot #${emptyIdx + 1}!`);
}

function gmQuickGiveItemToCrawler(tokenId, idx) {
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId && t.role === 'crawler');
  const tpl = DCC_QUICK_ITEMS_LIBRARY[idx];
  if (!tok || !tpl) return;
  addItemToCrawlerInventory(tok, tpl);
}


function getOrBuildCrawlerHotlist(tok) {
  if (!tok) return Array(10).fill(null);
  if (Array.isArray(tok.hotlist)) {
    const arr = tok.hotlist.slice(0, 10);
    while (arr.length < 10) arr.push(null);
    return arr;
  }
  // Auto-seed sensible initial Hotlist slots (Heal + Attack Spells + Combat Skills)
  const slots = Array(10).fill(null);
  let idx = 0;
  const spells = tok.assignedSpells || [];
  const skills = tok.assignedSkills || [];

  const healSp = spells.find(sp => /^heal$/i.test(String(sp.name || '').trim()));
  if (healSp && idx < 10) slots[idx++] = { type: 'spell', id: healSp.id };

  spells.forEach(sp => {
    if (idx >= 5) return;
    if (healSp && sp.id === healSp.id) return;
    slots[idx++] = { type: 'spell', id: sp.id };
  });

  skills.forEach(sk => {
    if (idx >= 8) return;
    const full = (appState?.skills || []).find(s => s.id === sk.id) || sk;
    const isCombat = (full.skillGroup === 'attack') || /attack/i.test(full.tags || '') || /\d+d\d+/i.test(full.baseDamage || '');
    if (isCombat) slots[idx++] = { type: 'skill', id: sk.id };
  });

  tok.hotlist = slots;
  return slots;
}

function commitPlayerHotlist(tok, nextSlots) {
  if (!tok) return;
  const cleaned = nextSlots.slice(0, 10);
  while (cleaned.length < 10) cleaned.push(null);
  tok.hotlist = cleaned;
  sendPlayerHotlistUpdateToHost(tok.id, cleaned);
  renderPlayerControlDeck();
}

function findHotlistSlotIndex(tok, type, id) {
  const slots = getOrBuildCrawlerHotlist(tok);
  return slots.findIndex(s => s && s.type === type && s.id === id);
}

function toggleAbilityOnHotlist(type, id) {
  const tok = getClaimedCrawlerToken();
  if (!tok || !id) return;
  const slots = [...getOrBuildCrawlerHotlist(tok)];
  const existingIdx = slots.findIndex(s => s && s.type === type && s.id === id);
  if (existingIdx !== -1) {
    slots[existingIdx] = null;
    if (uiState.activeHotlistSlotIdx === existingIdx) uiState.activeHotlistSlotIdx = null;
    commitPlayerHotlist(tok, slots);
    showVttToast(`Removed from Hotlist Slot #${existingIdx + 1}`);
    return;
  }
  const emptyIdx = slots.findIndex(s => !s);
  if (emptyIdx === -1) {
    showVttToast('⚠️ All 10 Hotlist slots are full! Clear a slot on the ⚡ Hotlist tab first.');
    return;
  }
  slots[emptyIdx] = { type, id };
  uiState.activeHotlistSlotIdx = emptyIdx;
  uiState.hotlistAssignSlotIdx = null;
  commitPlayerHotlist(tok, slots);
  showVttToast(`⚡ Bound to Hotlist Slot #${emptyIdx + 1}!`);
}

function assignEntryToHotlistSlot(slotIdx, type, id) {
  const tok = getClaimedCrawlerToken();
  if (!tok || slotIdx < 0 || slotIdx > 9) return;
  const slots = [...getOrBuildCrawlerHotlist(tok)];
  // Avoid duplicates of same ability on hotbar
  const dupIdx = slots.findIndex(s => s && s.type === type && s.id === id);
  if (dupIdx !== -1) slots[dupIdx] = null;
  slots[slotIdx] = { type, id };
  uiState.activeHotlistSlotIdx = slotIdx;
  uiState.hotlistAssignSlotIdx = null;
  commitPlayerHotlist(tok, slots);
  showVttToast(`⚡ Assigned to Hotlist Slot #${slotIdx + 1}`);
}

function assignQuickItemToHotlistSlot(slotIdx, name, icon = '🧪', qty = 1, note = '') {
  const tok = getClaimedCrawlerToken();
  if (!tok || slotIdx < 0 || slotIdx > 9) return;
  const cleanName = String(name || '').trim();
  if (!cleanName) return;
  const slots = [...getOrBuildCrawlerHotlist(tok)];
  slots[slotIdx] = {
    type: 'item',
    id: 'item_' + Date.now(),
    name: cleanName,
    icon: icon || '🧪',
    qty: Math.max(1, Math.min(999, Number(qty) || 1)),
    note: String(note || '').trim()
  };
  uiState.activeHotlistSlotIdx = slotIdx;
  uiState.hotlistAssignSlotIdx = null;
  commitPlayerHotlist(tok, slots);
  showVttToast(`🎒 Placed ${cleanName} in Hotlist Slot #${slotIdx + 1}`);
}

function handleAddCustomHotlistItem(slotIdx) {
  const nameIn = document.getElementById('hotlistCustomItemName');
  const qtyIn = document.getElementById('hotlistCustomItemQty');
  const iconIn = document.getElementById('hotlistCustomItemIcon');
  const name = (nameIn?.value || '').trim();
  if (!name) {
    showVttToast('Enter an item name first.');
    return;
  }
  assignQuickItemToHotlistSlot(slotIdx, name, iconIn?.value || '🎒', Number(qtyIn?.value) || 1, 'Hotlist item (instant swap)');
}

function adjustHotlistItemQty(slotIdx, delta) {
  const tok = getClaimedCrawlerToken();
  if (!tok) return;
  const slots = [...getOrBuildCrawlerHotlist(tok)];
  const item = slots[slotIdx];
  if (!item || item.type !== 'item') return;
  const nextQty = (Number(item.qty) || 1) + delta;
  if (nextQty <= 0) {
    slots[slotIdx] = null;
    showVttToast(`Used last ${item.name} (Slot #${slotIdx + 1} cleared)`);
  } else {
    slots[slotIdx] = { ...item, qty: Math.min(999, nextQty) };
    if (delta < 0) showVttToast(`Used ${item.name} (${nextQty} left)`);
  }
  commitPlayerHotlist(tok, slots);
}

function clearHotlistSlot(slotIdx) {
  const tok = getClaimedCrawlerToken();
  if (!tok || slotIdx < 0 || slotIdx > 9) return;
  const slots = [...getOrBuildCrawlerHotlist(tok)];
  slots[slotIdx] = null;
  uiState.hotlistAssignSlotIdx = null;
  commitPlayerHotlist(tok, slots);
  showVttToast(`Cleared Hotlist Slot #${slotIdx + 1}`);
}

function selectHotlistSlot(slotIdx) {
  const tok = getClaimedCrawlerToken();
  if (!tok) return;
  const slots = getOrBuildCrawlerHotlist(tok);
  const slot = slots[slotIdx];
  if (!slot) {
    uiState.hotlistAssignSlotIdx = (uiState.hotlistAssignSlotIdx === slotIdx) ? null : slotIdx;
    uiState.activeHotlistSlotIdx = null;
  } else {
    uiState.activeHotlistSlotIdx = slotIdx;
    uiState.hotlistAssignSlotIdx = null;
  }
  renderPlayerControlDeck();
}

function playerCastAbility(kind, entryId, targetSelectId = null) {
  const caster = getClaimedCrawlerToken();
  const scene = getActiveScene();
  if (!caster || !scene) {
    showVttToast('🎭 Claim your Crawler first to use abilities!');
    return;
  }
  const listKey = kind === 'skill' ? 'assignedSkills' : 'assignedSpells';
  const learned = (caster[listKey] || []).find(a => a.id === entryId);
  const rank = learned ? learned.rank : 1;
  const info = analyzeAbilityEffects(caster, kind, entryId, rank);
  if (!info.entry || info.isPurePassive) return;

  const perm = getCrawlerPhasePermissions(caster);
  if (perm.locked) {
    showVttToast(perm.bannerText || '🔒 Actions are locked during this combat step.');
    return;
  }
  if (perm.canInterruptOnly && !isAbilityAnInterrupt(info.entry, info)) {
    showVttToast(`🔒 Step 2 (React): Only Interrupt actions & ${perm.maxPhaseMoveFt || 10}ft Step are allowed! (${info.entry.name} requires Step 4)`);
    return;
  }

  if (caster.role === 'crawler' && ((caster.statuses || []).includes('Dying') || getTokenHealthMetrics(caster).curHp <= 0)) {
    showVttToast(`💀 ${caster.name} is Dying (0 HP) and cannot take actions!`);
    return;
  }
  if (uiState.autoMoveAp && (appState?.round || 0) > 0 && caster.role === 'crawler' && (caster.currentAp ?? 0) <= 0) {
    showVttToast(`⚠️ ${caster.name} has 0 AP remaining this round!`);
    return;
  }
  if (info.manaCost > 0 && (Number(caster.currentMana) || 0) < info.manaCost) {
    showVttToast(`💧 Not enough Mana for ${info.entry.name} (needs ${info.manaCost} MP, you have ${caster.currentMana || 0} MP).`);
    return;
  }

  const validTargets = getValidAbilityTargetsForCaster(caster, info, scene);
  const selEl = document.getElementById(targetSelectId || `playerCastTarget_${kind}_${entryId}`);
  const requestedId = selEl ? selEl.value : '';
  const target = validTargets.find(t => t.id === requestedId) || validTargets[0];
  if (!target) {
    showVttToast(`⚠️ No visible target in range/LOS for ${info.entry.name} (${info.rangeFt}ft)!`);
    return;
  }

  sendPlayerCastAbilityToHost(caster.id, kind, entryId, target.id, uiState.combatRollMode || 'normal');
  showVttToast(`🎯 Casting ${info.entry.name} on ${target.name}...`);
}

function playerTryUntrainedSkill(entryId, domPrefix = 'untrainedTarget') {
  const caster = getClaimedCrawlerToken();
  const scene = getActiveScene();
  if (!caster || !scene) {
    showVttToast('🎭 Claim your Crawler first to attempt skills!');
    return;
  }
  const entry = (appState?.skills || []).find(s => s.id === entryId);
  if (!entry) return;
  const info = analyzeAbilityEffects(caster, 'skill', entryId, 1);
  const perm = getCrawlerPhasePermissions(caster);
  if (perm.locked || (perm.canInterruptOnly && !isAbilityAnInterrupt(entry, info))) {
    showVttToast(perm.canInterruptOnly ? `🔒 Step 2 (React): ${entry.name} is not an Interrupt (wait for Step 4).` : (perm.bannerText || '🔒 Actions locked during this combat step.'));
    return;
  }

  let targetId = '';
  if (info.isAttack) {
    const validTargets = getValidAbilityTargetsForCaster(caster, info, scene);
    const selEl = document.getElementById(`${domPrefix}_${entryId}`);
    const requestedId = selEl ? selEl.value : '';
    const target = validTargets.find(t => t.id === requestedId) || validTargets[0];
    if (!target) {
      showVttToast(`⚠️ No visible target in range/LOS for ${entry.name} (${info.rangeFt}ft)!`);
      return;
    }
    targetId = target.id;
  }

  sendPlayerTryUntrainedSkillToHost(caster.id, entryId, targetId);
  showVttToast(`🎲 Trying ${entry.name} untrained (Rank 0 • Disadvantage)...`);
}

function executeRemotePlayerUntrainedSkill(tokenId, entryId, targetId = '') {
  if (IS_PLAYER_WINDOW) return;
  const scene = getActiveScene();
  const caster = scene?.tokens.find(t => t.id === tokenId && t.role === 'crawler');
  const entry = (appState?.skills || []).find(s => s.id === entryId);
  if (!caster || !entry) return;

  const info = analyzeAbilityEffects(caster, 'skill', entryId, 1);
  const perm = getCrawlerPhasePermissions(caster);
  if (perm.locked || (perm.canInterruptOnly && !isAbilityAnInterrupt(entry, info))) {
    showVttToast(`🔒 Blocked ${caster.name}'s untrained ${entry.name} (wrong combat step).`);
    return;
  }
  if (uiState.autoMoveAp && (appState?.round || 0) > 0 && caster.role === 'crawler') {
    if ((caster.currentAp ?? 0) <= 0) {
      showVttToast(`⚠️ ${caster.name} has 0 AP remaining this round!`);
      return;
    }
    caster.currentAp = Math.max(0, (caster.currentAp ?? 2) - 1);
  }
  const { statKey, mod } = getCrawlerAbilityAttackMod(caster, info);

  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;
  const nat = Math.min(r1, r2);
  const total = nat + mod;

  if (info.isAttack) {
    const validTargets = getValidAbilityTargetsForCaster(caster, info, scene);
    const target = validTargets.find(t => t.id === targetId) || validTargets[0];
    if (!target) return;

    const targetDc = target.role === 'crawler'
      ? 10 + (parseInt(getEffectiveEvadeDisplay(target), 10) || 0)
      : getEffectiveMobEvadeNumeric(target);
    const outcome = evaluateDccCheckOutcome(nat, total, targetDc);
    const vfxCfg = inferVfxFromAbility(entry, info);

    if (!outcome.success) {
      broadcastDiceRollEvent({
        title: `${caster.iconSymbol || '⚔️'} ${caster.name} — ${entry.name} (Untrained R0)`,
        subtitle: `Disadvantage 2d20 [${r1}, ${r2}] → ${nat} + 0 (R0) + ${mod} (${statKey}) = ${total} vs Flat Evade ${targetDc}`,
        playerSubtitle: `Untrained (Rank 0 • Disadvantage): 2d20 [${r1}, ${r2}] → ${nat} + ${mod} (${statKey}) = ${total}`,
        rolls: [{
          targetName: `${target.iconSymbol || '👹'} ${target.name}`,
          formulaText: `Untrained Attack: ${total} vs Flat Evade ${targetDc} (Not Learned)`,
          playerFormulaText: `Untrained Attack Total: ${total} (Not Learned)`,
          resultLabel: `MISS (${outcome.tier})`,
          playerResultLabel: `MISS (${outcome.tier})`,
          hit: false
        }]
      });
      triggerVfxEvent(caster, target, vfxCfg.vfxType, vfxCfg.vfxColor, true, true);
      commitStateChange();
      showVttToast(`🎲 ${caster.name} tried ${entry.name} untrained (Disadvantage) and missed (${total} vs ${targetDc})`);
      return;
    }

    const baseDmg = rollDccExpressionForCaster(info.dmgExpr || '1d4', caster);
    const critMult = outcome.crit ? 2 : 1;
    const floorDmgBonus = Number(outcome.dmgMod) || 0;
    const rolledDmg = (baseDmg * critMult) + floorDmgBonus;
    const dr = info.armorPiercing ? 0 : getEffectiveTokenDr(target);
    let netDmg = Math.max(0, rolledDmg - dr);
    const pipOut = calculateWholePipDamageOutcome(target, netDmg);
    if (pipOut.pipsDestroyed > 0) {
      adjustTokenHealth(target.id, -pipOut.effectiveHpDamage);
    }
    const dmgNote = pipOut.pipsDestroyed > 0
      ? `${pipOut.effectiveHpDamage} dmg (${pipOut.pipsDestroyed} ${pipOut.pipsDestroyed === 1 ? 'Pip' : 'Pips'})`
      : `0 dmg (Not Enough for 1 Pip)`;

    broadcastDiceRollEvent({
      title: `${caster.iconSymbol || '⚔️'} ${caster.name} — ${entry.name} (Untrained R0)`,
      subtitle: `Disadvantage 2d20 [${r1}, ${r2}] → ${nat} + 0 (R0) + ${mod} (${statKey}) = ${total} vs Flat Evade ${targetDc}`,
      playerSubtitle: `Untrained (Rank 0 • Disadvantage): 2d20 [${r1}, ${r2}] → ${nat} + ${mod} (${statKey}) = ${total}`,
      rolls: [{
        targetName: `${target.iconSymbol || '👹'} ${target.name}`,
        formulaText: `${outcome.tier} • Damage Roll: ${baseDmg}${outcome.crit ? ' ×2' : ''}${floorDmgBonus > 0 ? ` + ${floorDmgBonus} Floor` : ''} (Not Learned)`,
        playerFormulaText: `Damage Roll: ${baseDmg}${outcome.crit ? ' ×2' : ''}${floorDmgBonus > 0 ? ` + ${floorDmgBonus} Floor` : ''} (Not Learned)`,
        resultLabel: `HIT • ${dmgNote}`,
        playerResultLabel: `${outcome.tier.toUpperCase()} • ${dmgNote}`,
        hit: true
      }]
    });
    triggerVfxEvent(caster, target, vfxCfg.vfxType, vfxCfg.vfxColor, true, false);
    commitStateChange();
    showVttToast(`🎲 ${caster.name} landed untrained ${entry.name} (Disadvantage: ${total}) → ${dmgNote}!`);
    return;
  }

  const flareLevel = nat === 20 ? 'crit' : 'standard';
  broadcastDiceRollEvent({
    title: `${caster.iconSymbol || '⚔️'} ${caster.name} — ${entry.name} (Untrained R0)`,
    subtitle: `Untrained Skill Attempt • Rank 0 (0 Bonus) • Rolled at Disadvantage`,
    playerSubtitle: `Untrained Skill Attempt • Rank 0 (0 Bonus) • Rolled at Disadvantage`,
    flareLevel,
    rolls: [{
      targetName: `${caster.iconSymbol || '⚔️'} ${caster.name}`,
      formulaText: `2d20 [${r1}, ${r2}] → Low ${nat} + 0 (Rank 0) + ${mod} (${statKey})`,
      playerFormulaText: `2d20 [${r1}, ${r2}] → Low ${nat} + 0 (Rank 0) + ${mod} (${statKey})`,
      resultLabel: `CHECK TOTAL: ${total}`,
      playerResultLabel: `CHECK TOTAL: ${total}`,
      hit: false
    }]
  });
  commitStateChange();
  showVttToast(`🎲 ${caster.name} tried ${entry.name} untrained (Disadvantage): [${r1}, ${r2}] → ${nat} + ${mod} (${statKey}) = ${total}`);
}

function executeRemotePlayerAbilityCast(tokenId, kind, entryId, targetId, rollMode = 'normal') {
  if (IS_PLAYER_WINDOW) return;
  const scene = getActiveScene();
  const caster = scene?.tokens.find(t => t.id === tokenId && t.role === 'crawler');
  if (!caster) return;
  const listKey = kind === 'skill' ? 'assignedSkills' : 'assignedSpells';
  const learned = (caster[listKey] || []).find(a => a.id === entryId);
  const rank = learned ? learned.rank : 1;
  const info = analyzeAbilityEffects(caster, kind, entryId, rank);
  if (!info.entry || info.isPurePassive) return;

  const perm = getCrawlerPhasePermissions(caster);
  if (perm.locked) {
    showVttToast(perm.bannerText || '🔒 Actions are locked during this combat step.');
    return;
  }
  if (perm.canInterruptOnly && !isAbilityAnInterrupt(info.entry, info)) {
    showVttToast(`🔒 Step 2 (React): Only Interrupt actions & ${perm.maxPhaseMoveFt || 10}ft Step are allowed! (${info.entry.name} requires Step 4)`);
    return;
  }

  if (caster.role === 'crawler' && ((caster.statuses || []).includes('Dying') || getTokenHealthMetrics(caster).curHp <= 0)) {
    showVttToast(`💀 ${caster.name} is Dying (0 HP) and cannot take actions!`);
    return;
  }
  if (uiState.autoMoveAp && (appState?.round || 0) > 0 && caster.role === 'crawler' && (caster.currentAp ?? 0) <= 0) {
    showVttToast(`⚠️ ${caster.name} has 0 AP remaining this round!`);
    return;
  }
  if (info.manaCost > 0 && (Number(caster.currentMana) || 0) < info.manaCost) {
    showVttToast(`💧 ${caster.name} tried to cast ${info.entry.name} without enough Mana!`);
    return;
  }

  const validTargets = getValidAbilityTargetsForCaster(caster, info, scene);
  const target = validTargets.find(t => t.id === targetId) || validTargets[0];
  if (!target) return;

  const atkCheck = info.isAttack ? rollCrawlerD20AttackCheck(caster, target, info, rollMode) : null;
  let rolledValue = 0;
  if (info.shieldSlots > 0) rolledValue = info.shieldSlots;
  else if (info.isHeal) rolledValue = rollDccExpressionForCaster(info.healDice, caster);
  else if (info.isAttack) rolledValue = rollDccExpressionForCaster(info.dmgExpr, caster, Boolean(atkCheck?.crit));

  uiState.activeCastPanel = {
    casterId: caster.id,
    kind,
    entryId,
    targetId: target.id,
    rolledValue,
    atkCheck,
    spendMana: info.manaCost > 0,
    applyBuffs: [...info.detectedBuffs],
    applyDebuffs: [...info.detectedDebuffs]
  };
  executeAbilityCastResolution();
}

function resolveHotlistSlotDisplay(tok, slot) {
  if (!slot) return null;
  if (slot.type === 'item') {
    return {
      type: 'item',
      icon: slot.icon || '🧪',
      name: slot.name || 'Item',
      badge: `×${slot.qty || 1}`,
      badgeCls: 'text-emerald-300',
      slot
    };
  }
  if (slot.type === 'spell') {
    const learned = (tok.assignedSpells || []).find(a => a.id === slot.id);
    const full = (appState?.spells || []).find(sp => sp.id === slot.id) || learned;
    if (!full) return null;
    const mp = parseInt(String(full.manaCost || '0').replace(/\D+/g, ''), 10) || 0;
    return {
      type: 'spell',
      icon: '✨',
      name: full.name || 'Spell',
      badge: mp > 0 ? `${mp} MP` : `R${learned?.rank || 1}`,
      badgeCls: (mp > 0 && (Number(tok.currentMana) || 0) < mp) ? 'text-rose-400' : 'text-indigo-300',
      full,
      rank: learned?.rank || 1,
      slot
    };
  }
  if (slot.type === 'untrained') {
    const full = (appState?.skills || []).find(s => s.id === slot.id);
    if (!full) return null;
    return {
      type: 'untrained',
      icon: (full.skillGroup === 'attack') ? '⚔️' : '🎲',
      name: full.name,
      badge: 'R0 Dis',
      badgeCls: 'text-amber-300',
      full,
      rank: 0,
      slot
    };
  }
  // learned skill
  const learned = (tok.assignedSkills || []).find(a => a.id === slot.id);
  const full = (appState?.skills || []).find(s => s.id === slot.id) || learned;
  if (!full) return null;
  const isAtk = (full.skillGroup === 'attack') || /attack/i.test(full.tags || '');
  return {
    type: 'skill',
    icon: isAtk ? '⚔️' : '🛠️',
    name: full.name || 'Skill',
    badge: `R${learned?.rank || 1}`,
    badgeCls: 'text-amber-300',
    full,
    rank: learned?.rank || 1,
    slot
  };
}

function renderPlayerHotlistActiveSlotBarHtml(tok, scene, slotIdx) {
  const slots = getOrBuildCrawlerHotlist(tok);
  const rawSlot = slots[slotIdx];
  const disp = resolveHotlistSlotDisplay(tok, rawSlot);
  if (!disp) return '';

  if (disp.type === 'item') {
    return `
      <div class="bg-dungeon-950 border border-emerald-500/40 rounded-xl p-2.5 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-xs text-emerald-200 truncate">${disp.icon} ${escapeHtmlAttr(disp.name)} <span class="font-mono text-amber-300">(×${disp.slot.qty || 1})</span></div>
            <div class="text-[10px] text-slate-400">${escapeHtmlAttr(disp.slot.note || 'Instant Hotlist access (no extra inventory action)')}</div>
          </div>
          <button type="button" onclick="clearHotlistSlot(${slotIdx})" title="Remove from Hotlist" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px] font-bold shrink-0">✕</button>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" onclick="adjustHotlistItemQty(${slotIdx}, -1)" class="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition">✓ Use 1</button>
          <button type="button" onclick="adjustHotlistItemQty(${slotIdx}, 1)" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-[11px]">+1</button>
        </div>
      </div>
    `;
  }

  if (disp.type === 'untrained') {
    const sk = disp.full;
    const info = analyzeAbilityEffects(tok, 'skill', sk.id, 1);
    const { statKey, mod } = getCrawlerAbilityAttackMod(tok, info);
    const validTargets = info.isAttack ? getValidAbilityTargetsForCaster(tok, info, scene) : [];
    const targetOptions = validTargets.map(t => `<option value="${t.id}">${t.iconSymbol || ''} ${t.name}</option>`).join('');
    return `
      <div class="bg-dungeon-950 border border-amber-500/45 rounded-xl p-2.5 space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 cursor-help" onmouseenter="showEffectHoverInfo('skill', '${encodeURIComponent(String(sk.id))}', 1, '${tok.id}')" onmouseleave="hideEffectHoverInfo()">
            <div class="font-bold text-xs text-amber-200 truncate">🎲 ${escapeHtmlAttr(sk.name)} <span class="text-[10px] font-mono text-amber-400">(R0 • Disadv)</span></div>
            <div class="text-[9.5px] font-mono text-slate-400">2d20-low + ${mod} (${statKey}) • 0 Skill Bonus</div>
          </div>
          <button type="button" onclick="clearHotlistSlot(${slotIdx})" title="Remove from Hotlist" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px] font-bold shrink-0">✕</button>
        </div>
        ${info.isAttack ? (validTargets.length === 0 ? `
          <div class="text-[10px] font-mono text-slate-500 italic">No visible target in range (${info.rangeFt}ft)</div>
        ` : `
          <div class="flex items-center gap-1.5">
            <select id="hotlistUntrainedTarget_${sk.id}" class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] text-slate-200">${targetOptions}</select>
            <button type="button" onclick="playerTryUntrainedSkill('${sk.id}', 'hotlistUntrainedTarget')" class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0">🎲 Try (Dis)</button>
          </div>
        `) : `
          <button type="button" onclick="playerTryUntrainedSkill('${sk.id}', 'hotlistUntrainedTarget')" class="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px]">🎲 Try Untrained Check (2d20-low + ${mod} ${statKey})</button>
        `}
      </div>
    `;
  }

  // Learned Skill or Spell
  const kind = disp.type;
  const full = disp.full;
  const info = analyzeAbilityEffects(tok, kind, full.id, disp.rank);
  const validTargets = info.isPurePassive ? [] : getValidAbilityTargetsForCaster(tok, info, scene);
  const targetOptions = validTargets.map(t => `<option value="${t.id}">${t.iconSymbol || ''} ${t.name}</option>`).join('');
  const lowMana = info.manaCost > 0 && (Number(tok.currentMana) || 0) < info.manaCost;
  const isPreviewing = uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === tok.id && uiState.previewEffectRange.label === full.name;

  return `
    <div class="bg-dungeon-950 border border-cyan-500/45 rounded-xl p-2.5 space-y-1.5">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 cursor-help" onmouseenter="showEffectHoverInfo('${kind}', '${encodeURIComponent(String(full.id))}', ${disp.rank}, '${tok.id}')" onmouseleave="hideEffectHoverInfo()">
          <div class="font-bold text-xs text-slate-100 truncate">${disp.icon} ${escapeHtmlAttr(full.name)} <span class="text-[10px] font-mono text-amber-300">R${disp.rank}</span>${info.manaCost > 0 ? ` <span class="text-[10px] font-mono ${lowMana ? 'text-rose-400' : 'text-indigo-300'}">• ${info.manaCost} MP</span>` : ''}</div>
          <div class="text-[9.5px] font-mono text-slate-400">Range: <b class="text-rose-300">${info.isSelfOnly ? 'Self' : `${info.rangeFt}ft`}</b>${full.baseDamage ? ` • ${escapeHtmlAttr(String(full.baseDamage).slice(0, 34))}` : ''}</div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${!info.isSelfOnly && !info.isPurePassive ? `
            <button type="button" onclick="toggleEffectRangePreview('${tok.id}', ${info.rangeFt}, ${info.ignoreLos}, '${String(full.name).replace(/'/g, "\\'")}', '${full.id}')" class="px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold ${isPreviewing ? 'bg-rose-500/30 border-rose-400 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-300'}">${isPreviewing ? '🔴' : '⭕'}</button>
          ` : ''}
          <button type="button" onclick="clearHotlistSlot(${slotIdx})" title="Remove from Hotlist" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[10px] font-bold">✕</button>
        </div>
      </div>
      ${info.isPurePassive ? `
        <div class="text-[10px] font-mono text-emerald-300">🔒 Passive — Always Active</div>
      ` : validTargets.length === 0 ? `
        <div class="text-[10px] font-mono text-slate-500 italic">No visible target in range (${info.rangeFt}ft)</div>
      ` : `
        <div class="flex items-center gap-1.5">
          <select id="hotlistTarget_${slotIdx}" class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] text-slate-200">${targetOptions}</select>
          ${(() => {
            const pPerm = getCrawlerPhasePermissions(tok);
            const isInt = isAbilityAnInterrupt(full, info);
            const phaseBlocked = pPerm.locked || (pPerm.canInterruptOnly && !isInt);
            const dis = lowMana || phaseBlocked;
            const lbl = phaseBlocked ? (pPerm.canInterruptOnly ? '🔒 Step 4' : '🔒 Wait') : (pPerm.canInterruptOnly && isInt ? '⚡ Interrupt' : `🎯 ${kind === 'skill' ? 'Use' : 'Cast'}`);
            return `<button type="button" ${dis ? 'disabled' : ''} onclick="playerCastAbility('${kind}', '${full.id}', 'hotlistTarget_${slotIdx}')" class="px-3 py-1 rounded-lg font-bold text-[10px] shrink-0 transition ${dis ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : (pPerm.canInterruptOnly ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow')}">${lbl}</button>`;
          })()}
        </div>
      `}
      ${renderAbilityUpgradesDropdownHtml(full, disp.rank)}
    </div>
  `;
}

function renderHotlistAssignPickerHtml(tok, slotIdx) {
  const spells = tok.assignedSpells || [];
  const skills = tok.assignedSkills || [];
  return `
    <div class="bg-dungeon-950 border border-amber-500/45 rounded-xl p-2.5 space-y-2 text-[10px]">
      <div class="flex items-center justify-between">
        <span class="font-mono font-bold text-amber-300 uppercase">➕ Assign Hotlist Slot #${slotIdx + 1}</span>
        <button type="button" onclick="uiState.hotlistAssignSlotIdx=null; renderPlayerControlDeck()" class="text-slate-400 hover:text-slate-200 font-bold">✕</button>
      </div>
      ${spells.length > 0 ? `
        <div class="space-y-1">
          <div class="text-[9px] font-mono text-indigo-300 uppercase">Learned Spells</div>
          <div class="flex flex-wrap gap-1">
            ${spells.map(sp => `<button type="button" onclick="assignEntryToHotlistSlot(${slotIdx}, 'spell', '${sp.id}')" class="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-200 font-semibold">✨ ${escapeHtmlAttr(sp.name)}</button>`).join('')}
          </div>
        </div>
      ` : ''}
      ${skills.length > 0 ? `
        <div class="space-y-1">
          <div class="text-[9px] font-mono text-amber-300 uppercase">Learned Skills</div>
          <div class="flex flex-wrap gap-1">
            ${skills.map(sk => `<button type="button" onclick="assignEntryToHotlistSlot(${slotIdx}, 'skill', '${sk.id}')" class="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/35 text-amber-200 font-semibold">⚔️ ${escapeHtmlAttr(sk.name)}</button>`).join('')}
          </div>
        </div>
      ` : ''}
      <div class="space-y-1 pt-1 border-t border-slate-800">
        <div class="text-[9px] font-mono text-emerald-300 uppercase">Quick Consumables / Gear (Up to 999 per Slot)</div>
        <div class="flex flex-wrap gap-1">
          <button type="button" onclick="assignQuickItemToHotlistSlot(${slotIdx}, 'Healing Potion', '❤️', 2, 'Heals 5 Health Bar slots')" class="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200">❤️ Healing Potion</button>
          <button type="button" onclick="assignQuickItemToHotlistSlot(${slotIdx}, 'Mana Potion', '💧', 5, 'Restores full Mana')" class="px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200">💧 Mana Potion</button>
          <button type="button" onclick="assignQuickItemToHotlistSlot(${slotIdx}, 'Torch', '🔥', 5, '20ft bright / 20ft dim light')" class="px-2 py-0.5 rounded bg-orange-500/15 hover:bg-orange-500/30 border border-orange-500/40 text-orange-200">🔥 Torch</button>
          <button type="button" onclick="assignQuickItemToHotlistSlot(${slotIdx}, 'Dynamite', '🧨', 1, '1d6 Bludgeoning + 5ft Splash')" class="px-2 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200">🧨 Dynamite</button>
        </div>
        <div class="flex gap-1 pt-1">
          <select id="hotlistCustomItemIcon" class="bg-dungeon-900 border border-slate-700 rounded px-1 py-1 text-xs">
            <option value="🧪">🧪</option><option value="🗡️">🗡️</option><option value="📜">📜</option><option value="🧨">🧨</option><option value="🔥">🔥</option><option value="🎒">🎒</option>
          </select>
          <input id="hotlistCustomItemName" type="text" placeholder="Custom item/weapon..." class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-100" />
          <input id="hotlistCustomItemQty" type="number" value="1" min="1" max="999" class="w-12 bg-dungeon-900 border border-slate-700 rounded px-1 py-1 text-center font-mono text-[10px] text-slate-100" />
          <button type="button" onclick="handleAddCustomHotlistItem(${slotIdx})" class="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold">Add</button>
        </div>
      </div>
    </div>
  `;
}

function renderPlayerAbilityRowHtml(tok, kind, item, scene) {
  const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
  const full = catalog.find(e => e.id === item.id) || item;
  const name = full.name || item.name || 'Ability';
  const info = analyzeAbilityEffects(tok, kind, item.id, item.rank || 1);
  const validTargets = info.isPurePassive ? [] : getValidAbilityTargetsForCaster(tok, info, scene);
  const targetOptions = validTargets.map(t => `<option value="${t.id}">${t.iconSymbol || ''} ${t.name}</option>`).join('');
  const isPreviewing = uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === tok.id && uiState.previewEffectRange.label === name;
  const lowMana = info.manaCost > 0 && (Number(tok.currentMana) || 0) < info.manaCost;
  const hotlistIdx = findHotlistSlotIndex(tok, kind, item.id);

  return `
    <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1.5">
      <div class="flex items-center justify-between gap-1.5">
        <div class="min-w-0 cursor-help" onmouseenter="showEffectHoverInfo('${kind}', '${encodeURIComponent(String(item.id || name))}', ${item.rank || 1}, '${tok.id}')" onmouseleave="hideEffectHoverInfo()">
          <span class="font-bold text-[11px] text-slate-100 hover:text-amber-300 underline decoration-dotted decoration-slate-600 truncate">${kind === 'skill' ? '⚔️' : '✨'} ${escapeHtmlAttr(name)}</span>
          ${info.manaCost > 0 ? `<span class="ml-1 text-[9px] font-mono ${lowMana ? 'text-rose-400 font-bold' : 'text-indigo-300'}">${info.manaCost} MP</span>` : ''}
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button type="button" onclick="toggleAbilityOnHotlist('${kind}', '${item.id}')" title="${hotlistIdx !== -1 ? 'Remove from 10-slot Hotlist' : 'Add to 10-slot Hotlist'}" class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border transition ${hotlistIdx !== -1 ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-400'}">
            ${hotlistIdx !== -1 ? `⚡ #${hotlistIdx + 1}` : '+ Hotlist'}
          </button>
          <span title="${item.markedForAdvancement ? 'Marked for Skill Advancement Check' : 'Skill Rank'}" class="px-1.5 py-0.2 rounded bg-slate-900 border ${item.markedForAdvancement ? 'border-amber-400 text-amber-200' : 'border-slate-700 text-amber-300'} font-mono text-[10px] font-bold">R${item.rank || 1}${item.markedForAdvancement ? '★' : ''}</span>
        </div>
      </div>
      ${info.isPurePassive ? `
        <div class="text-[10px] font-mono text-emerald-300/90 bg-emerald-950/30 border border-emerald-500/30 rounded px-2 py-1">
          🔒 Passive Bonus Always Active
        </div>
      ` : `
        <div class="flex items-center justify-between gap-1.5 text-[9px] font-mono">
          <span class="text-slate-400">Range: <b class="text-rose-300">${info.isSelfOnly ? 'Self' : `${info.rangeFt}ft`}</b> ${info.ignoreLos ? '• 👁️ No LOS' : ''}</span>
          ${!info.isSelfOnly ? `
            <button type="button" onclick="toggleEffectRangePreview('${tok.id}', ${info.rangeFt}, ${info.ignoreLos}, '${String(name).replace(/'/g, "\\'")}', '${item.id}')" class="px-1.5 py-0.2 rounded border font-semibold transition ${isPreviewing ? 'bg-rose-500/30 border-rose-400 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-400/50'}">
              ${isPreviewing ? '🔴 Hide Area' : '⭕ Show Area'}
            </button>
          ` : ''}
        </div>
        ${validTargets.length === 0 ? `
          <div class="text-[10px] font-mono text-slate-500 italic bg-dungeon-900/70 border border-slate-800/80 rounded px-2 py-1">
            No visible target in range (${info.rangeFt}ft)
          </div>
        ` : `
          <div class="flex items-center gap-1.5">
            <select id="playerCastTarget_${kind}_${item.id}" class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] text-slate-200">
              ${targetOptions}
            </select>
            ${(() => {
              const pPerm = getCrawlerPhasePermissions(tok);
              const isInt = isAbilityAnInterrupt(full, info);
              const phaseBlocked = pPerm.locked || (pPerm.canInterruptOnly && !isInt);
              const dis = lowMana || phaseBlocked;
              const lbl = phaseBlocked ? (pPerm.canInterruptOnly ? '🔒 Step 4' : '🔒 Wait') : (pPerm.canInterruptOnly && isInt ? '⚡ Interrupt' : `🎯 ${kind === 'skill' ? 'Use' : 'Cast'}`);
              return `<button type="button" ${dis ? 'disabled' : ''} onclick="playerCastAbility('${kind}', '${item.id}')" class="px-2.5 py-1 rounded-lg font-bold text-[10px] shrink-0 transition ${dis ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : (pPerm.canInterruptOnly ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow' : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow')}">${lbl}</button>`;
            })()}
          </div>
        `}
      `}
      ${renderAbilityUpgradesDropdownHtml(full, item.rank || 1)}
    </div>
  `;
}

function renderPlayerUntrainedSkillRowHtml(tok, sk, scene) {
  const info = analyzeAbilityEffects(tok, 'skill', sk.id, 1);
  const { statKey, mod } = getCrawlerAbilityAttackMod(tok, info);
  const isAtk = info.isAttack;
  const hotlistIdx = findHotlistSlotIndex(tok, 'untrained', sk.id);
  const domPrefix = 'browseUntrainedTarget';
  const validTargets = isAtk ? getValidAbilityTargetsForCaster(tok, info, scene) : [];
  const targetOptions = validTargets.map(t => `<option value="${t.id}">${t.iconSymbol || ''} ${t.name}</option>`).join('');
  const isPreviewing = uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === tok.id && uiState.previewEffectRange.label === sk.name;

  return `
    <div class="bg-dungeon-950 border border-amber-500/25 rounded-xl p-2 space-y-1.5">
      <div class="flex items-start justify-between gap-1.5">
        <div class="min-w-0 cursor-help" onmouseenter="showEffectHoverInfo('skill', '${encodeURIComponent(String(sk.id || sk.name))}', 1, '${tok.id}')" onmouseleave="hideEffectHoverInfo()">
          <div class="font-bold text-[11px] text-slate-100 hover:text-amber-300 underline decoration-dotted decoration-slate-600 flex items-center gap-1 flex-wrap">
            <span>${isAtk ? '⚔️' : '🛠️'} ${escapeHtmlAttr(sk.name)}</span>
            <span class="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/35 text-[9px] font-mono text-amber-300">R0 • Disadv</span>
          </div>
          <div class="text-[9.5px] font-mono text-slate-400 mt-0.5">2d20-low + ${mod} (${statKey}) • 0 Skill Bonus</div>
        </div>
        <button type="button" onclick="toggleAbilityOnHotlist('untrained', '${sk.id}')" title="${hotlistIdx !== -1 ? 'Remove from Hotlist' : 'Bind to 10-slot Hotlist (does not learn)'}" class="px-1.5 py-0.5 rounded-lg text-[9.5px] font-bold shrink-0 border transition ${hotlistIdx !== -1 ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-slate-700 text-cyan-200 hover:border-cyan-400'}">
          ${hotlistIdx !== -1 ? `⚡ #${hotlistIdx + 1}` : '+ Hotlist'}
        </button>
      </div>
      ${(sk.rank1Effect || sk.description) ? `<p class="text-[10.5px] text-slate-300 leading-snug">${escapeHtmlAttr(sk.rank1Effect || sk.description)}</p>` : ''}
      ${isAtk ? `
        <div class="flex items-center justify-between gap-1.5 text-[9px] font-mono">
          <span class="text-slate-400">Range: <b class="text-rose-300">${info.rangeFt}ft</b></span>
          <button type="button" onclick="toggleEffectRangePreview('${tok.id}', ${info.rangeFt}, ${info.ignoreLos}, '${String(sk.name).replace(/'/g, "\\'")}', '${sk.id}')" class="px-1.5 py-0.2 rounded border font-semibold transition ${isPreviewing ? 'bg-rose-500/30 border-rose-400 text-rose-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-rose-400/50'}">
            ${isPreviewing ? '🔴 Hide Area' : '⭕ Show Area'}
          </button>
        </div>
        ${validTargets.length === 0 ? `
          <div class="text-[10px] font-mono text-slate-500 italic bg-dungeon-900/70 border border-slate-800/80 rounded px-2 py-1">
            No visible target in range (${info.rangeFt}ft)
          </div>
        ` : `
          <div class="flex items-center gap-1.5">
            <select id="${domPrefix}_${sk.id}" class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] text-slate-200">
              ${targetOptions}
            </select>
            <button type="button" onclick="playerTryUntrainedSkill('${sk.id}', '${domPrefix}')" class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold text-[10px] shrink-0 transition">
              🎲 Try (Dis)
            </button>
          </div>
        `}
      ` : `
        <button type="button" onclick="playerTryUntrainedSkill('${sk.id}', '${domPrefix}')" class="w-full py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold text-[10px] transition">
          🎲 Try Untrained Check (2d20-low + ${mod} ${statKey})
        </button>
      `}
      ${renderAbilityUpgradesDropdownHtml(sk, 0)}
    </div>
  `;
}

function renderPlayerControlDeck() {
  if (!IS_PLAYER_WINDOW) return;
  const body = document.getElementById('playerControlDeckBody');
  const deck = document.getElementById('playerControlDeck');
  if (!body || !deck) return;

  const tok = getClaimedCrawlerToken();
  const scene = getActiveScene();

  if (!tok) {
    body.innerHTML = `
      <div class="bg-dungeon-950 border border-slate-800 rounded-2xl p-5 text-center space-y-3">
        <div class="text-3xl">🎭</div>
        <div class="font-display font-bold text-sm text-cyan-300">No Crawler Claimed</div>
        <p class="text-[11px] text-slate-400 leading-relaxed">Claim an existing crawler on the map or build a brand-new Floor 1 crawler to unlock your live stats, 10-slot Hotlist, and skills.</p>
        <div class="flex flex-col gap-2 pt-1">
          <button type="button" onclick="openPlayerClaimModal()" class="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition">🎭 Claim Existing Crawler</button>
          <button type="button" onclick="openPlayerCreateCrawlerModal()" class="w-full py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/50 text-emerald-200 font-bold text-xs transition">🧙 Create New Crawler</button>
        </div>
      </div>
    `;
    return;
  }

  const hm = getTokenHealthMetrics(tok);
  const illum = getIlluminationBuffForToken(tok);
  const effectiveEvade = getEffectiveEvadeDisplay(tok);
  const nStats = normalizeStatsObjectToDcc(tok.stats);
  const buffs = tok.buffs || [];
  const statuses = tok.statuses || [];
  const skills = tok.assignedSkills || [];
  const spells = tok.assignedSpells || [];

  const headerCard = `
    <div class="bg-dungeon-950 border border-cyan-500/40 rounded-xl p-2.5 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="font-bold text-sm text-slate-100 truncate">${tok.iconSymbol || '⚔️'} ${escapeHtmlAttr(tok.name)} <span class="text-xs font-mono text-amber-400">Lvl ${tok.level || 1}</span></div>
          <div class="text-[10px] font-mono text-slate-400 truncate">${escapeHtmlAttr(tok.classification || 'Crawler')}${tok.crawlerNumber ? ` • #${Number(tok.crawlerNumber).toLocaleString()}` : ''}</div>
        </div>
        <button type="button" onclick="openPlayerClaimModal()" title="Switch Crawler" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold shrink-0">🎭 Switch</button>
      </div>
      <div class="text-[10px] font-mono px-2 py-1 rounded-lg border ${illum.badgeCls}">${illum.label}</div>
      <div>
        <div class="flex items-center justify-between text-[10px] font-mono mb-0.5">
          <span class="text-emerald-300 font-bold">❤️ HP ${hm.curHp}/${hm.maxHp} (${hm.filledPips}/10 Pips)</span>
          ${tok.shieldPips ? `<span class="text-sky-300 font-bold">+${tok.shieldPips} 🛡</span>` : ''}
        </div>
        ${renderCrawlerPipStripHtml(tok)}
      </div>
      <div class="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5">
          <div class="text-[9px] text-slate-500">ACTION PTS</div>
          <div class="font-bold text-amber-300">⚡ ${tok.currentAp ?? 2}/${tok.maxAp ?? 2}</div>
        </div>
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5">
          <div class="text-[9px] text-slate-500">MANA</div>
          <div class="font-bold text-indigo-300">💧 ${tok.currentMana ?? 0}/${tok.maxMana ?? 0}</div>
        </div>
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5">
          <div class="text-[9px] text-slate-500">AI FAVOR</div>
          <div class="font-bold text-yellow-300">⭐ ${tok.aiFavor ?? 1}</div>
        </div>
      </div>
    </div>
  `;

  const incomingAtks = typeof getIncomingDeclaredAttacksForCrawler === 'function'
    ? getIncomingDeclaredAttacksForCrawler(tok.id, scene)
    : [];
  const isEvadingThisRound = (appState?.round || 0) > 0 && tok.evadeDeclaredRound === appState.round;
  const dodgeR15 = (tok.assignedSkills || []).some(s => /^dodge$/i.test(String(s.name || '').trim()) && (Number(s.rank) || 1) >= 15);
  const pPermNow = getCrawlerPhasePermissions(tok);
  const targetedHudHtml = incomingAtks.length > 0 ? `
    <div class="bg-rose-950/60 border-2 border-rose-500/80 rounded-xl p-2.5 space-y-2 shadow-lg shadow-rose-950/60">
      <div class="flex items-center justify-between gap-2">
        <span class="font-display font-bold text-xs text-rose-200 tracking-wide">🎯 YOU ARE BEING TARGETED (${incomingAtks.length})</span>
        <span class="text-[9.5px] font-mono text-rose-300">Evade ${effectiveEvade}</span>
      </div>
      <div class="space-y-1">
        ${incomingAtks.map(d => `
          <div class="bg-dungeon-950/90 border border-rose-500/35 rounded-lg px-2 py-1 flex items-center justify-between gap-2 text-[10px]">
            <span class="font-bold text-slate-100 truncate">${d.mobIcon || '👹'} ${escapeHtmlAttr(d.mobName)} — <span class="text-amber-300">${escapeHtmlAttr(d.atkName)}</span></span>
            <span class="font-mono text-[9.5px] text-rose-300 shrink-0">${d.isAoe ? '💥 AoE • ' : ''}${escapeHtmlAttr(d.damage)}</span>
          </div>
        `).join('')}
      </div>
      <div class="text-[9.5px] font-mono text-rose-200/85 leading-snug">
        1 Evade Action covers <b>all ${incomingAtks.length} incoming ${incomingAtks.length === 1 ? 'attack' : 'attacks'}</b> (separate Evade Check rolled per attack).
      </div>
      ${isEvadingThisRound ? `
        <div class="flex items-center gap-1.5">
          <div class="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/25 border border-emerald-400 text-emerald-200 font-mono font-extrabold text-[10px] text-center">
            ✓ EVADE DECLARED (${incomingAtks.length})
          </div>
          <button type="button" onclick="playerCancelEvadeAll()" title="Cancel Evade & refund AP" class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-rose-300 font-bold text-[10px] shrink-0 transition">✕ Undo</button>
        </div>
      ` : `
        <button type="button" ${pPermNow.locked ? 'disabled' : ''} onclick="playerDeclareEvadeAll()" class="w-full py-1.5 px-2.5 rounded-lg font-extrabold text-[11px] shadow transition ${pPermNow.locked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}">
          ${pPermNow.locked ? '🔒 Wait for Step 2 (React) to Evade' : `🛡️ Evade ALL Incoming (${dodgeR15 ? '0 AP • Dodge R15' : '-1 AP'})`}
        </button>
      `}
    </div>
  ` : '';

  // TAB 2: DEDICATED LEARNED SKILLS & SPELLS TAB (COMBAT / UTILITY / SPELLS TOGGLES)
  if (uiState.activePlayerDeckTab === 'learned') {
    const sub = uiState.playerLearnedSubTab || 'combat';
    const q = String(uiState.playerLearnedSearch || '').trim().toLowerCase();
    const combatSkills = skills.filter(sk => {
      const full = (appState?.skills || []).find(s => s.id === sk.id) || sk;
      return (full.skillGroup === 'attack') || /attack/i.test(full.tags || '') || /\d+d\d+/i.test(full.baseDamage || '');
    });
    const combatIds = new Set(combatSkills.map(s => s.id));
    const utilitySkills = skills.filter(sk => !combatIds.has(sk.id));

    const activeElId = document.activeElement?.id;
    const selPos = document.activeElement?.selectionStart;

    let listHtml = '';
    if (sub === 'combat') {
      const shown = combatSkills.filter(sk => !q || String(sk.name || '').toLowerCase().includes(q));
      listHtml = shown.length === 0
        ? '<div class="text-xs text-slate-500 italic text-center py-4">No learned combat skills match.</div>'
        : shown.map(sk => renderPlayerAbilityRowHtml(tok, 'skill', sk, scene)).join('');
    } else if (sub === 'utility') {
      const shown = utilitySkills.filter(sk => !q || String(sk.name || '').toLowerCase().includes(q));
      listHtml = shown.length === 0
        ? '<div class="text-xs text-slate-500 italic text-center py-4">No learned utility skills match.</div>'
        : shown.map(sk => renderPlayerAbilityRowHtml(tok, 'skill', sk, scene)).join('');
    } else {
      const shown = spells.filter(sp => !q || String(sp.name || '').toLowerCase().includes(q));
      listHtml = shown.length === 0
        ? '<div class="text-xs text-slate-500 italic text-center py-4">No learned spells match.</div>'
        : shown.map(sp => renderPlayerAbilityRowHtml(tok, 'spell', sp, scene)).join('');
    }

    body.innerHTML = `
      ${targetedHudHtml}
      <div class="grid grid-cols-3 gap-1">
        <button type="button" onclick="setPlayerLearnedSubTab('combat')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold transition ${sub === 'combat' ? 'bg-rose-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">⚔️ Combat (${combatSkills.length})</button>
        <button type="button" onclick="setPlayerLearnedSubTab('utility')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold transition ${sub === 'utility' ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">🛠️ Utility (${utilitySkills.length})</button>
        <button type="button" onclick="setPlayerLearnedSubTab('spells')" class="py-1.5 px-1 rounded-lg text-[10px] font-bold transition ${sub === 'spells' ? 'bg-indigo-500 text-white' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">✨ Spells (${spells.length})</button>
      </div>
      <input id="playerLearnedSearchInput" type="text" value="${escapeHtmlAttr(uiState.playerLearnedSearch || '')}" oninput="uiState.playerLearnedSearch=this.value; renderPlayerControlDeck()" placeholder="Filter learned abilities..." class="w-full bg-dungeon-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none" />
      <div class="space-y-2">${listHtml}</div>
    `;

    if (activeElId === 'playerLearnedSearchInput') {
      const inp = document.getElementById('playerLearnedSearchInput');
      if (inp) {
        inp.focus();
        if (typeof selPos === 'number') inp.setSelectionRange(selPos, selPos);
      }
    }
    return;
  }

  // TAB 3: UNTRAINED (RANK 0 • DISADVANTAGE) SKILL BROWSER
  if (uiState.activePlayerDeckTab === 'skills') {
    const learnedIds = new Set(skills.map(s => s.id));
    const q = String(uiState.playerSkillSearch || '').trim().toLowerCase();
    const sub = uiState.playerSkillSubTab || 'all';
    const allSkills = (appState?.skills || []).filter(s => {
      if (learnedIds.has(s.id)) return false;
      // Ch. 4 Rule: Passive Skills cannot be used untrained (Rank 0)
      if (normalizeAbilityEffectType(s.effectType) === 'passive' || /\bpassive\b/i.test(s.tags || '')) return false;
      if (sub !== 'all' && (s.skillGroup || 'utility') !== sub) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || (s.tags || '').toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    });

    const activeElId = document.activeElement?.id;
    const selPos = document.activeElement?.selectionStart;

    body.innerHTML = `
      <div class="bg-amber-950/35 border border-amber-500/40 rounded-xl p-2 text-[10px] text-amber-200/95 space-y-0.5">
        <div class="font-bold text-amber-300">🎲 Untrained Skills (Rank 0 • Disadvantage)</div>
        <p class="leading-snug text-amber-100/85">Roll <b>2d20 (lowest) + base Stat Mod</b> with <b>0 skill bonus</b>. Passive Skills cannot be used untrained (Rank 0).</p>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" onclick="setPlayerSkillSubTab('all')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${sub === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">All</button>
        <button type="button" onclick="setPlayerSkillSubTab('attack')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${sub === 'attack' ? 'bg-rose-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">⚔️ Combat</button>
        <button type="button" onclick="setPlayerSkillSubTab('utility')" class="px-2 py-1 rounded-lg text-[10px] font-bold ${sub === 'utility' ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🛠️ Utility</button>
      </div>
      <input id="playerSkillsSearchInput" type="text" value="${escapeHtmlAttr(uiState.playerSkillSearch || '')}" oninput="uiState.playerSkillSearch=this.value; renderPlayerControlDeck()" placeholder="Search untrained skills..." class="w-full bg-dungeon-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none" />
      <div class="space-y-2">
        ${allSkills.length === 0
          ? '<div class="text-xs text-slate-500 italic text-center py-4">No matching untrained skills found.</div>'
          : allSkills.map(sk => renderPlayerUntrainedSkillRowHtml(tok, sk, scene)).join('')
        }
      </div>
    `;

    if (activeElId === 'playerSkillsSearchInput') {
      const inp = document.getElementById('playerSkillsSearchInput');
      if (inp) {
        inp.focus();
        if (typeof selPos === 'number') inp.setSelectionRange(selPos, selPos);
      }
    }
    return;
  }

  // TAB 4: ITEMS & UNLIMITED WEIGHTLESS INVENTORY
  if (uiState.activePlayerDeckTab === 'items') {
    const inv = getCrawlerInventory(tok);
    const q = String(uiState.playerItemSearch || '').trim().toLowerCase();
    const cat = uiState.playerItemCategory || 'All';
    const slots = getOrBuildCrawlerHotlist(tok);

    const filtered = inv.filter(it => {
      if (cat !== 'All' && (it.category || 'Utility') !== cat) return false;
      if (!q) return true;
      return String(it.name || '').toLowerCase().includes(q) || String(it.notes || '').toLowerCase().includes(q);
    });

    const activeElId = document.activeElement?.id;
    const selPos = document.activeElement?.selectionStart;

    body.innerHTML = `
      <div class="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-2 text-[10px] text-emerald-200/95 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5"><span class="font-bold text-emerald-300">🎒 Unlimited Inventory (${inv.length})</span><button type="button" onclick="openCraftingModal()" class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold text-[9.5px]">🛠️ Craft</button></div>
          <span class="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/50 font-mono font-bold text-amber-200">🪙 ${(Number(tok.gold) || 0).toLocaleString()} Gold</span>
        </div>
        <p class="leading-snug text-emerald-100/80">Items have <b>0 weight</b> while stored here. All Gold fits in a single protected Inventory slot.</p>
      </div>
      ${(() => {
        const deadMobs = typeof getDeadUnlootedMobsInScene === 'function' ? getDeadUnlootedMobsInScene(scene) : [];
        if (deadMobs.length === 0) return '';
        return `
          <div class="bg-amber-950/35 border border-amber-500/50 rounded-xl p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-1">
              <span class="text-[10px] font-mono font-bold uppercase text-amber-300">💀 Fallen Mobs Ready to Loot (${deadMobs.length})</span>
              ${deadMobs.length > 1 ? `<button type="button" onclick="playerRequestLootMob('__ALL__')" class="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px]">💰 Loot All</button>` : ''}
            </div>
            <div class="flex flex-wrap gap-1">
              ${deadMobs.map(m => `<button type="button" onclick="playerRequestLootMob('${m.id}')" class="px-2 py-1 rounded-lg bg-dungeon-950 hover:bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold text-[10px] transition">💰 Loot ${escapeHtmlAttr(m.name)}${(Number(m.swarmCount) || 1) > 1 ? ` (×${m.swarmCount})` : ''}</button>`).join('')}
            </div>
          </div>
        `;
      })()}

      <div class="space-y-1">
        <div class="text-[9.5px] font-mono uppercase text-slate-400 font-bold">⚡ Quick Add Common Dungeon Gear</div>
        <div class="flex flex-wrap gap-1">
          ${DCC_QUICK_ITEMS_LIBRARY.map((it, idx) => `
            <button type="button" onclick="playerAddQuickItem(${idx})" class="px-2 py-1 rounded-lg bg-dungeon-950 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-200 font-semibold transition">
              + ${it.icon} ${escapeHtmlAttr(it.name)}
            </button>
          `).join('')}
        </div>
      </div>

      <form onsubmit="playerAddCustomInventoryItem(event)" class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1.5 text-[10px]">
        <div class="font-mono font-bold uppercase text-cyan-300 text-[9.5px]">➕ Add Custom Item to Inventory</div>
        <div class="flex gap-1">
          <select id="pInvCustomIcon" class="bg-dungeon-900 border border-slate-700 rounded px-1 py-1 text-xs">
            <option value="🧪">🧪</option><option value="❤️">❤️</option><option value="💧">💧</option><option value="🔥">🔥</option><option value="🧨">🧨</option><option value="🗡️">🗡️</option><option value="🛡️">🛡️</option><option value="📜">📜</option><option value="🔑">🔑</option><option value="🎒">🎒</option>
          </select>
          <input id="pInvCustomName" type="text" required placeholder="Item name (e.g. Goblin Dynamite)..." class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded px-2 py-1 text-slate-100" />
          <input id="pInvCustomQty" type="number" value="1" min="1" max="999" class="w-12 bg-dungeon-900 border border-slate-700 rounded px-1 py-1 text-center font-mono text-slate-100" />
        </div>
        <div class="flex gap-1">
          <select id="pInvCustomCat" class="bg-dungeon-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200">
            <option value="Consumable">Consumable</option>
            <option value="Explosive">Explosive</option>
            <option value="Weapon">Weapon</option>
            <option value="Utility">Utility</option>
            <option value="Quest / Misc">Quest / Misc</option>
          </select>
          <input id="pInvCustomNotes" type="text" placeholder="Effect / notes (optional)..." class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded px-2 py-1 text-slate-200" />
          <button type="submit" class="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shrink-0">Add</button>
        </div>
      </form>

      <div class="flex items-center gap-1 overflow-x-auto pb-0.5">
        ${['All', 'Loot Box', 'Consumable', 'Explosive', 'Weapon', 'Gear', 'Utility'].map(c => `
          <button type="button" onclick="uiState.playerItemCategory='${c}'; renderPlayerControlDeck()" class="px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 ${cat === c ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">${c}</button>
        `).join('')}
      </div>

      <input id="playerItemsSearchInput" type="text" value="${escapeHtmlAttr(uiState.playerItemSearch || '')}" oninput="uiState.playerItemSearch=this.value; renderPlayerControlDeck()" placeholder="Search inventory..." class="w-full bg-dungeon-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none" />

      <div class="space-y-1.5">
        ${filtered.length === 0
          ? '<div class="text-xs text-slate-500 italic text-center py-4">Inventory is empty. Use Quick Add or the form above to stash items!</div>'
          : filtered.map(it => {
              if (it.isLootBox) {
                return `
                  <div class="bg-amber-950/30 border border-amber-400/60 rounded-xl p-2.5 space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                      <div class="min-w-0">
                        <div class="font-bold text-xs text-amber-200 truncate">${it.icon || '🎁'} ${escapeHtmlAttr(it.name)}</div>
                        <div class="text-[9.5px] font-mono text-amber-300/80">${escapeHtmlAttr(it.notes || 'Unopened Loot Box')}</div>
                      </div>
                      <button type="button" onclick="playerOpenLootBox('${it.id}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] shrink-0 shadow transition">
                        🎁 Open Box
                      </button>
                    </div>
                  </div>
                `;
              }
              const hotIdx = slots.findIndex(s => s && s.type === 'item' && (s.invId === it.id || String(s.name || '').toLowerCase() === String(it.name || '').toLowerCase()));
              return `
                <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1">
                  <div class="flex items-center justify-between gap-1.5">
                    <div class="min-w-0">
                      <div class="font-bold text-[11px] text-slate-100 truncate">${it.icon || '🎒'} ${escapeHtmlAttr(it.name)}</div>
                      <div class="text-[9.5px] font-mono text-slate-400">${escapeHtmlAttr(it.category || 'Utility')}${it.notes ? ` • ${escapeHtmlAttr(it.notes)}` : ''}</div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      <button type="button" onclick="bindInventoryItemToHotlist('${it.id}')" class="px-1.5 py-0.5 rounded border text-[9px] font-bold transition ${hotIdx !== -1 ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-cyan-400'}">${hotIdx !== -1 ? `⚡ #${hotIdx + 1}` : '+ Hotlist'}</button>
                      <button type="button" onclick="adjustCrawlerInventoryQty('${tok.id}', '${it.id}', -1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">-</button>
                      <span class="text-emerald-300 font-bold px-0.5">×${it.qty || 1}</span>
                      <button type="button" onclick="adjustCrawlerInventoryQty('${tok.id}', '${it.id}', 1)" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 font-bold">+</button>
                      <button type="button" onclick="removeCrawlerInventoryItem('${tok.id}', '${it.id}')" class="text-rose-400 hover:text-rose-300 font-bold pl-0.5">✕</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>
    `;

    if (activeElId === 'playerItemsSearchInput') {
      const inp = document.getElementById('playerItemsSearchInput');
      if (inp) {
        inp.focus();
        if (typeof selPos === 'number') inp.setSelectionRange(selPos, selPos);
      }
    }
    return;
  }

function renderPaperDollSlotNodeHtml(tok, eqMap, slotId, shortTitle, badgeIcon, accentCls = 'cyan') {
  const occ = (eqMap[slotId] || [])[0] || null;
  const activeBorder = occ
    ? (accentCls === 'amber' ? 'border-amber-400/80 bg-amber-950/35 text-amber-100' : 'border-cyan-400/80 bg-cyan-950/35 text-cyan-100')
    : 'border-slate-800 bg-dungeon-900/85 text-slate-500 hover:border-slate-600';
  return `
    <div class="rounded-xl border ${activeBorder} p-1.5 flex flex-col justify-between min-h-[58px] transition">
      <div class="flex items-center justify-between gap-1 text-[8.5px] font-mono uppercase tracking-wider text-slate-400">
        <span>${badgeIcon} ${escapeHtmlAttr(shortTitle)}</span>
        ${occ ? `<button type="button" onclick="toggleEquipCrawlerItem('${occ.id}')" title="Unequip ${escapeHtmlAttr(occ.name)}" class="text-rose-400 hover:text-rose-200 font-bold leading-none">✕</button>` : ''}
      </div>
      ${occ
        ? `<div class="text-[9.5px] font-bold truncate leading-tight mt-0.5" title="${escapeHtmlAttr(occ.name)}">${occ.icon || '🛡️'} ${escapeHtmlAttr(occ.name)}</div>`
        : `<div class="text-[9px] italic text-slate-600 mt-0.5">Empty</div>`
      }
    </div>
  `;
}

function renderCrawlerGearSlotsCardHtml(tok) {
  const eqMap = getCrawlerEquippedMap(tok);
  const eqBonuses = getEquippedGearBonuses(tok);
  const inv = getCrawlerInventory(tok);
  const equippableItems = inv.filter(i => !i.isLootBox && inferItemGearSlot(i) !== null);
  const bonusSummary = [];
  if (eqBonuses.dr > 0) bonusSummary.push(`+${eqBonuses.dr} DR`);
  if (eqBonuses.evade > 0) bonusSummary.push(`+${eqBonuses.evade} Evade`);
  if (eqBonuses.moveFt > 0) bonusSummary.push(`+${eqBonuses.moveFt}ft Move`);
  ['Str', 'Int', 'Con', 'Dex', 'Cha'].forEach(k => {
    if (eqBonuses.stats[k] > 0) bonusSummary.push(`+${eqBonuses.stats[k]} ${k}`);
  });

  const accItems = eqMap.Accessories || [];
  const hasBelt = accItems.some(a => /\bbelt\b/i.test(`${a.name || ''} ${a.notes || ''}`));
  const hasCape = accItems.some(a => /\b(cape|cloak)\b/i.test(`${a.name || ''} ${a.notes || ''}`));
  const hasPortrait = Boolean(typeof getResolvedTokenPortraitImage === 'function' && getResolvedTokenPortraitImage(tok));
  const dollSilhouette = /cat|persian|feline|canine|dog|wolf|animal|pet|beast/i.test(`${tok.classification || ''} ${tok.race || ''}`) ? '🐾' : '🧍';

  return `
    <div class="bg-dungeon-950 border border-cyan-500/40 rounded-xl p-2.5 space-y-2.5">
      <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <span class="text-[10px] font-mono font-bold uppercase text-cyan-300">🧍 Gear Paper Doll</span>
        <span class="text-[9.5px] font-mono text-emerald-300 truncate">${bonusSummary.length ? bonusSummary.join(' • ') : 'Only equipped gear grants bonuses'}</span>
      </div>

      <!-- Visual Paper Doll Silhouette + Anatomical Slot Layout -->
      <div class="bg-dungeon-900/60 border border-slate-800/90 rounded-xl p-2 space-y-2">
        <div class="grid grid-cols-3 gap-1.5 items-center">
          <div class="text-[8.5px] font-mono text-slate-500 px-1 leading-tight">1 item/slot<br/>(Accessories: 10)</div>
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'Head', 'Head', '🪖', 'cyan')}
          <div class="text-[8.5px] font-mono text-right text-slate-500 px-1 leading-tight">Max 1 Belt<br/>&amp; 1 Cape</div>
        </div>

        <div class="grid grid-cols-3 gap-1.5 items-center">
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'Arms', 'Arms', '🦾', 'cyan')}
          <div class="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-dungeon-950 border border-slate-800 relative">
            <div class="w-11 h-11 rounded-full border-2 border-cyan-500/40 bg-dungeon-900 flex items-center justify-center overflow-hidden shadow-inner">
              ${hasPortrait
                ? `<img src="${escapeHtmlAttr(tok.portraitDataUrl || tok.portraitUrl || getResolvedTokenPortraitImage(tok)?.src || '')}" alt="${escapeHtmlAttr(tok.name)}" class="w-full h-full object-cover" />`
                : `<span class="text-xl">${tok.iconSymbol || dollSilhouette}</span>`
              }
            </div>
            <div class="text-[8.5px] font-mono font-bold text-slate-300 mt-1 truncate max-w-full">${escapeHtmlAttr(tok.name || 'Crawler')}</div>
          </div>
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'Torso', 'Torso', '🦺', 'cyan')}
        </div>

        <div class="grid grid-cols-3 gap-1.5 items-center">
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'HoldingLeft', 'Hold L', '🛡️', 'amber')}
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'Legs', 'Legs', '👖', 'cyan')}
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'HoldingRight', 'Hold R', '⚔️', 'amber')}
        </div>

        <div class="grid grid-cols-2 gap-1.5">
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'Hands', 'Gloves', '🧤', 'cyan')}
          ${renderPaperDollSlotNodeHtml(tok, eqMap, 'Feet', 'Feet', '🥾', 'cyan')}
        </div>

        <div class="bg-dungeon-950 border border-amber-500/35 rounded-lg p-1.5 space-y-1">
          <div class="flex items-center justify-between text-[9px] font-mono">
            <span class="text-amber-300 font-bold">💍 Accessories (${accItems.length}/10)</span>
            <span class="text-slate-400">Belt: ${hasBelt ? '✓' : '—'} • Cape: ${hasCape ? '✓' : '—'}</span>
          </div>
          ${accItems.length === 0
            ? '<div class="text-slate-600 italic text-[9px] font-mono">No accessories equipped.</div>'
            : `<div class="flex flex-wrap gap-1">
                ${accItems.map(a => `
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-dungeon-900 border border-amber-500/40 text-amber-200 text-[9px] font-mono">
                    ${a.icon || '💍'} ${escapeHtmlAttr(a.name)}
                    <button type="button" onclick="toggleEquipCrawlerItem('${a.id}')" class="text-rose-400 hover:text-rose-200 font-bold">×</button>
                  </span>
                `).join('')}
              </div>`
          }
        </div>
      </div>

      ${equippableItems.length > 0 ? `
        <div class="pt-1 border-t border-slate-800/80 space-y-1">
          <div class="text-[9px] font-mono uppercase text-slate-400">Click to Equip / Unequip Inventory Gear</div>
          <div class="flex flex-wrap gap-1">
            ${equippableItems.map(it => `
              <button type="button" onclick="toggleEquipCrawlerItem('${it.id}')" class="px-2 py-0.5 rounded-lg border text-[9.5px] font-mono transition ${it.equipped ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold' : 'bg-dungeon-900 border-slate-700 text-slate-300 hover:border-cyan-400'}">
                ${it.equipped ? '✓ ' : '+ '}${escapeHtmlAttr(it.name)}
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}


  // TAB 5: CHARACTER SHEET & GEAR
  if (uiState.activePlayerDeckTab === 'sheet') {
    const noteParts = String(tok.notes || '').split(' || ').map(s => s.trim()).filter(Boolean);
    body.innerHTML = `
      ${headerCard}
      ${(Number(tok.unspentStatPoints) || 0) > 0 ? `
        <div class="bg-amber-950/35 border border-amber-400/60 rounded-xl p-2.5 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono font-bold uppercase text-amber-300">⭐ Unspent Stat Points: ${tok.unspentStatPoints}</span>
            <span class="text-[9.5px] font-mono text-amber-200/80">Assign in Saferoom</span>
          </div>
          <div class="grid grid-cols-5 gap-1">
            ${['Str', 'Int', 'Con', 'Dex', 'Cha'].map(k => `
              <button type="button" onclick="playerSpendStatPoint('${k}')" class="py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-extrabold text-[10px] transition">+1 ${k}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono font-bold uppercase text-cyan-400">📊 Core Attributes</span>
          <span class="text-[9.5px] font-mono text-slate-400">Grind: ${tok.levelGrindHours || 0}/${tok.level || 1}h</span>
        </div>
        <div class="grid grid-cols-5 gap-1 text-center font-mono">
          ${['Str', 'Int', 'Con', 'Dex', 'Cha'].map(k => `
            <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5">
              <div class="text-[9px] text-slate-500">${k.toUpperCase()}</div>
              <div class="font-bold text-[10px] text-slate-100">${nStats[k]}</div>
            </div>
          `).join('')}
        </div>
        <div class="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5"><div class="text-[9px] text-slate-500">EVADE</div><div class="font-bold text-cyan-300">${effectiveEvade}</div></div>
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5"><div class="text-[9px] text-slate-500">MOVE / STEP</div><div class="font-bold text-emerald-300">${tok.move || '20+S'}</div></div>
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-1.5"><div class="text-[9px] text-slate-500">DR</div><div class="font-bold text-amber-300">${getEffectiveTokenDr(tok)}</div></div>
        </div>
      </div>

      ${renderCrawlerGearSlotsCardHtml(tok)}
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
        <div class="text-[10px] font-mono font-bold uppercase text-amber-400">🎒 Backstory, Trauma & Starting Gear</div>
        ${noteParts.length === 0
          ? '<div class="text-[11px] text-slate-500 italic">No notes or gear recorded yet.</div>'
          : noteParts.map(line => `<div class="bg-dungeon-900 border border-slate-800/80 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 leading-snug">${escapeHtmlAttr(line)}</div>`).join('')
        }
      </div>
    `;
    return;
  }

  // TAB 1 (DEFAULT): CLEAN VITALS + 10-BUTTON HOTLIST BAR (ZERO CLUTTER)
  const slots = getOrBuildCrawlerHotlist(tok);
  const usedCount = slots.filter(Boolean).length;
  // Auto-select first filled slot if activeHotlistSlotIdx points to an empty slot and picker isn't open
  if (uiState.hotlistAssignSlotIdx === null && (uiState.activeHotlistSlotIdx === null || !slots[uiState.activeHotlistSlotIdx])) {
    const firstFilled = slots.findIndex(Boolean);
    uiState.activeHotlistSlotIdx = firstFilled !== -1 ? firstFilled : null;
  }

  const hotbarGridHtml = slots.map((slot, idx) => {
    const disp = resolveHotlistSlotDisplay(tok, slot);
    const isSelected = uiState.activeHotlistSlotIdx === idx || uiState.hotlistAssignSlotIdx === idx;
    if (!disp) {
      return `
        <button type="button" onclick="selectHotlistSlot(${idx})" class="h-12 rounded-xl border border-dashed flex flex-col items-center justify-center transition ${isSelected ? 'border-amber-400 bg-amber-500/15 text-amber-200' : 'border-slate-800 bg-dungeon-950/60 text-slate-600 hover:border-slate-600 hover:text-slate-400'}">
          <span class="text-[9px] font-mono font-bold">#${idx + 1}</span>
          <span class="text-[9px]">+ Empty</span>
        </button>
      `;
    }
    return `
      <button type="button" onclick="selectHotlistSlot(${idx})" title="Slot #${idx + 1}: ${escapeHtmlAttr(disp.name)}" class="h-12 px-1.5 rounded-xl border flex flex-col justify-between py-1 text-left transition overflow-hidden ${isSelected ? 'border-cyan-400 bg-cyan-500/20 shadow-md shadow-cyan-500/10' : 'border-slate-800 bg-dungeon-950 hover:border-slate-600'}">
        <div class="flex items-center justify-between w-full gap-0.5">
          <span class="text-[9px] font-mono text-slate-500 font-bold">${idx + 1}</span>
          <span class="text-[9px] font-mono font-bold ${disp.badgeCls} truncate">${disp.badge}</span>
        </div>
        <div class="text-[10px] font-bold text-slate-100 truncate w-full leading-tight">${disp.icon} ${escapeHtmlAttr(disp.name)}</div>
      </button>
    `;
  }).join('');

  body.innerHTML = `
    ${headerCard}
    ${targetedHudHtml}

    <div class="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
      <div class="bg-dungeon-950 border border-slate-800 rounded-lg p-1.5"><div class="text-[9px] text-slate-500">EVADE</div><div class="font-bold text-cyan-300">${effectiveEvade}</div></div>
      <div class="bg-dungeon-950 border border-slate-800 rounded-lg p-1.5"><div class="text-[9px] text-slate-500">MOVE</div><div class="font-bold text-emerald-300">${tok.move || '20+S'}</div></div>
      <div class="bg-dungeon-950 border border-slate-800 rounded-lg p-1.5"><div class="text-[9px] text-slate-500">DR</div><div class="font-bold text-amber-300">${getEffectiveTokenDr(tok)}</div></div>
    </div>
          ${(appState?.round || 0) === 0 && isExplorationModeActive() ? `
            <div class="bg-cyan-950/35 border border-cyan-500/40 rounded-lg p-1.5 space-y-1.5">
              <div class="flex items-center justify-between gap-1">
                <span class="text-[9px] font-mono uppercase font-bold text-cyan-300">🧭 Exploration &amp; Social RP</span>
                <span class="text-[8.5px] font-mono text-slate-400">Shared Roll Banner</span>
              </div>
              <div class="grid grid-cols-3 gap-1">
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'search')" class="py-1 px-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200 font-bold text-[9.5px] transition">🔍 Search</button>
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'interact')" class="py-1 px-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-bold text-[9.5px] transition">🤲 Interact</button>
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'sneak')" class="py-1 px-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/40 text-indigo-200 font-bold text-[9.5px] transition">🥷 Sneak</button>
              </div>
              <div class="grid grid-cols-2 gap-1 pt-0.5 border-t border-cyan-500/20">
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'first_impression')" class="py-1 px-1.5 rounded bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[9px] transition truncate">🤝 First Impression</button>
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'animal_handling')" class="py-1 px-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-bold text-[9px] transition truncate">🐾 Animal Handle</button>
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'parley')" class="py-1 px-1.5 rounded bg-sky-500/15 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-bold text-[9px] transition truncate">💬 Parley / Social</button>
                <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'pickpocket')" class="py-1 px-1.5 rounded bg-purple-500/15 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 font-bold text-[9px] transition truncate">🤏 Sleight / Pocket</button>
              </div>
              <button type="button" onclick="triggerCrawlerExplorationAction('${tok.id}', 'lore')" class="w-full py-1 px-1.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-amber-200 font-bold text-[9px] transition">📜 Lore Check (Area &amp; Mob Intel)</button>
            </div>
          ` : ''}
    <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1.5">
      <div class="flex items-center justify-between gap-1 text-[10px] font-mono">
        <span class="text-slate-400 font-bold">🎲 Roll Mode:</span>
        <div class="flex items-center gap-1">
          <button type="button" onclick="setCombatRollMode('adv')" class="px-2 py-0.5 rounded font-bold ${uiState.combatRollMode === 'adv' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">🟢 Adv</button>
          <button type="button" onclick="setCombatRollMode('normal')" class="px-2 py-0.5 rounded font-bold ${uiState.combatRollMode === 'normal' ? 'bg-slate-200 text-slate-950' : 'bg-slate-800 text-slate-300'}">Norm</button>
          <button type="button" onclick="setCombatRollMode('disadv')" class="px-2 py-0.5 rounded font-bold ${uiState.combatRollMode === 'disadv' ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">🔴 Dis</button>
        </div>
      </div>
      ${(() => {
        const pPerm = getCrawlerPhasePermissions(tok);
        const bannerHtml = pPerm.bannerText
          ? `<div class="text-[10px] font-mono font-bold px-2 py-1 rounded-lg border ${pPerm.bannerTone === 'emerald' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' : pPerm.bannerTone === 'amber' ? 'bg-amber-950/45 border-amber-400/60 text-amber-200' : 'bg-rose-950/45 border-rose-500/50 text-rose-200'}">${pPerm.bannerText}</div>`
          : '';
        const intDisabled = pPerm.locked;
        const playDisabled = !pPerm.canActFull;
        return `
          ${bannerHtml}
          <div class="grid grid-cols-2 gap-1.5">
            <button type="button" ${intDisabled ? 'disabled' : ''} onclick="triggerCrawlerSupportAction('${tok.id}', 'intervene')" class="py-1 px-2 rounded-lg font-bold text-[10px] transition ${intDisabled ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-500/40 text-cyan-200'}">🤝 Intervene (1d6)</button>
            <button type="button" ${playDisabled ? 'disabled' : ''} onclick="triggerCrawlerSupportAction('${tok.id}', 'call_play')" class="py-1 px-2 rounded-lg font-bold text-[10px] transition ${playDisabled ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/40 text-amber-200'}">📣 Call a Play (2d6)</button>
          </div>
          ${(() => {
            const adj = typeof getAdjacentDoorsForToken === 'function' ? getAdjacentDoorsForToken(tok, getActiveScene()) : [];
            const doorDisabled = !pPerm.canActFull || adj.length === 0;
            const nextState = adj[0]?.open ? 'Close Door' : 'Open Door';
            return `<button type="button" ${doorDisabled ? 'disabled' : ''} onclick="triggerCrawlerDoorAction('${tok.id}')" class="w-full mt-1.5 py-1 px-2 rounded-lg font-bold text-[10px] transition ${doorDisabled ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200'}">🚪 ${nextState} (1 Action${adj.length === 0 ? ' • Adjacent Only' : ''})</button>`;
          })()}`;
      })()}
      ${tok.evadeAdvVsMobId ? `<div class="text-[9.5px] font-mono text-emerald-300">⚡ Counter-Advantage ready on next Attack!</div>` : ''}
    </div>

    ${(buffs.length > 0 || statuses.length > 0) ? `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1">
        <div class="text-[9.5px] font-mono font-bold uppercase text-slate-400">✨ Active Buffs & Debuffs</div>
        <div class="flex flex-wrap gap-1">
          ${buffs.map(b => `<span onmouseenter="showEffectHoverInfo('buff', '${encodeURIComponent(String(b))}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-200">${escapeHtmlAttr(String(b).replace(/^\[(?:Passive|Aura)\]\s*/i, ''))}</span>`).join('')}
          ${statuses.map(s => `<span onmouseenter="showEffectHoverInfo('debuff', '${encodeURIComponent(String(s))}')" onmouseleave="hideEffectHoverInfo()" class="cursor-help px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 border border-rose-500/40 text-rose-200">${escapeHtmlAttr(s)}</span>`).join('')}
        </div>
      </div>
    ` : ''}

    ${(() => {
      const deadMobs = typeof getDeadUnlootedMobsInScene === 'function' ? getDeadUnlootedMobsInScene(scene) : [];
      const unopenedBoxes = getCrawlerInventory(tok).filter(i => i.isLootBox);
      if (deadMobs.length === 0 && unopenedBoxes.length === 0) return '';
      return `
        <div class="space-y-1.5">
          ${unopenedBoxes.length > 0 ? `
            <div class="bg-amber-950/35 border border-amber-400/60 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
              <span class="text-[10px] font-bold text-amber-200">🎁 ${unopenedBoxes.length} Unopened Loot ${unopenedBoxes.length === 1 ? 'Box' : 'Boxes'} in Inventory!</span>
              <button type="button" onclick="setPlayerDeckTab('items')" class="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px]">Open →</button>
            </div>
          ` : ''}
          ${deadMobs.length > 0 ? `
            <div class="bg-emerald-950/30 border border-emerald-500/45 rounded-xl p-2 space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-[9.5px] font-mono font-bold uppercase text-emerald-300">💀 Dead Mobs to Loot (${deadMobs.length})</span>
                ${deadMobs.length > 1 ? `<button type="button" onclick="playerRequestLootMob('__ALL__')" class="px-2 py-0.2 rounded bg-emerald-500 text-slate-950 font-bold text-[9.5px]">💰 Loot All</button>` : ''}
              </div>
              <div class="flex flex-wrap gap-1">
                ${deadMobs.map(m => `<button type="button" onclick="playerRequestLootMob('${m.id}')" class="px-2 py-0.5 rounded-lg bg-dungeon-950 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-bold text-[10px] transition">💰 ${escapeHtmlAttr(m.name)}</button>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    })()}

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono font-bold uppercase text-cyan-300">⚡ 10-Slot Hotlist (${usedCount}/10)</span>
        <button type="button" onclick="setPlayerDeckTab('learned')" class="text-[10px] text-amber-300 hover:underline font-semibold">📖 All Learned (${skills.length + spells.length}) →</button>
      </div>
      <div class="grid grid-cols-2 gap-1.5">${hotbarGridHtml}</div>
      ${uiState.hotlistAssignSlotIdx !== null
        ? renderHotlistAssignPickerHtml(tok, uiState.hotlistAssignSlotIdx)
        : (uiState.activeHotlistSlotIdx !== null ? renderPlayerHotlistActiveSlotBarHtml(tok, scene, uiState.activeHotlistSlotIdx) : '')
      }
    </div>
  `;
}

// =========================================================================
// 11. MASTER UI SYNC & INITIALIZATION
// =========================================================================
function renderAllUI() {
  if (!appState) return;
  renderPhaseTrackerBar();
  renderLiveDiceBroadcastBanner();
  renderPlayerBottomHud();
  renderGmInspector();
  renderCrawlersRoster();
  renderBestiaryLibrary();
  renderObjectsCatalog();
  renderSkillsCatalog();
  renderSpellsCatalog();
  renderBuffsCatalog();
  renderDebuffsCatalog();

  const sc = getActiveScene();
  if (sc) {
    syncCalibratorPopoverControls();
    syncLightCalibratorControls();
    const nameIn = document.getElementById('mapSceneNameInput');
    if (nameIn && document.activeElement !== nameIn) nameIn.value = sc.name || '';
    const gsIn = document.getElementById('mapGridSizeInput');
    if (gsIn) gsIn.value = sc.gridSize || 56;
    const scIn = document.getElementById('mapScaleInput');
    if (scIn) scIn.value = sc.mapScale || 100;
    const oxIn = document.getElementById('mapOffsetXInput');
    if (oxIn) oxIn.value = sc.mapOffsetX || 0;
    const oyIn = document.getElementById('mapOffsetYInput');
    if (oyIn) oyIn.value = sc.mapOffsetY || 0;
    const dkIn = document.getElementById('mapDarknessInput');
    if (dkIn) dkIn.value = sc.ambientDarkness ?? 0.45;
  }

  const hookIn = document.getElementById('googleSheetsWebhookInput');
  if (hookIn && document.activeElement !== hookIn) {
    hookIn.value = appState.sheetsWebhookUrl || '';
  }
  const tokIn = document.getElementById('googleSheetsSecretTokenInput');
  if (tokIn && document.activeElement !== tokIn) {
    tokIn.value = appState.sheetsSecretToken || '';
  }
  syncGmPinSettingsUi();
  updatePlayerClaimButtonUi();
  if (IS_PLAYER_WINDOW) {
    renderPlayerControlDeck();
    if (typeof renderPlayerGrindingSessionModal === 'function') renderPlayerGrindingSessionModal();
  }
}

function initVttApplication() {
  loadStateFromStorage();
  if (!IS_PLAYER_WINDOW && typeof syncCampaignNeighborhoodsIntoAppState === 'function') syncCampaignNeighborhoodsIntoAppState(false);
  if (IS_PLAYER_WINDOW) {
    const badge = document.getElementById('windowModeBadge');
    if (badge) badge.textContent = 'PLAYER DISPLAY';
    const drawer = document.getElementById('gmControlDrawer');
    if (drawer) drawer.classList.add('hidden');
    const toggleBtn = document.getElementById('toggleGmDrawerBtn');
    if (toggleBtn) toggleBtn.classList.add('hidden');
    const popBtn = document.getElementById('openPlayerWindowBtn');
    if (popBtn) popBtn.classList.add('hidden');
    const hostBtn = document.getElementById('hostOnlineRoomBtn');
    if (hostBtn) hostBtn.classList.add('hidden');
    const lockBtn = document.getElementById('lockGmScreenBtn');
    if (lockBtn) lockBtn.classList.add('hidden');
    const qsBtn = document.getElementById('gmQuickSaveBtn');
    if (qsBtn) qsBtn.classList.add('hidden');
    const lbBtn = document.getElementById('gmLootBoxBtn');
    if (lbBtn) lbBtn.classList.add('hidden');
    const advBtn = document.getElementById('gmAdvancementBtn');
    if (advBtn) advBtn.classList.add('hidden');
    const campBtn = document.getElementById('gmCampaignBtn');
    if (campBtn) campBtn.classList.add('hidden');
    const tools = document.getElementById('floatingMapTools');
    if (tools) tools.classList.add('hidden');

    // Make top-bar GM controls read-only / hidden for players while keeping status visible
    const hideIds = [
      'renameSceneBtn', 'deleteSceneBtn', 'decRoundBtn', 'incRoundBtn',
      'rollSurpriseBtn', 'nextPhaseBtn', 'editCollapseClockBtn', 'restButtonsGroup', 'toggleAutoApBtn', 'togglePhaseLockBtn', 'toggleMinimapBtn'
    ];
    hideIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const sceneGroup = document.getElementById('sceneControlsGroup');
    if (sceneGroup) {
      sceneGroup.querySelectorAll('button').forEach(b => b.classList.add('hidden'));
    }
    const sceneSelect = document.getElementById('mapSceneSelect');
    if (sceneSelect) {
      sceneSelect.disabled = true;
      sceneSelect.classList.add('opacity-90', 'cursor-default', 'pointer-events-none');
    }
    document.querySelectorAll('header button[onclick^="adjustDungeonFloor"]').forEach(b => b.classList.add('hidden'));
    const deckBtn = document.getElementById('togglePlayerDeckBtn');
    if (deckBtn) deckBtn.classList.remove('hidden');
    const deckEl = document.getElementById('playerControlDeck');
    if (deckEl && uiState.playerDeckOpen) deckEl.classList.remove('hidden');
    const savedClaim = sessionStorage.getItem('dcc_vtt_claimed_crawler_v1');
    if (savedClaim) {
      uiState.claimedCrawlerId = savedClaim;
      uiState.selectedTokenId = savedClaim;
    }
    if (URL_ROOM_PARAM) {
      connectRemotePlayerToRoom(URL_ROOM_PARAM);
    } else if (!savedClaim) {
      setTimeout(() => {
        const onMap = (getActiveScene()?.tokens || []).filter(t => t.role === 'crawler');
        const roster = (appState?.bestiary || []).filter(b => b.role === 'crawler');
        if ((onMap.length > 0 || roster.length > 0) && !uiState.claimedCrawlerId) openPlayerClaimModal();
      }, 300);
    }
  } else {
    const lockBtn = document.getElementById('lockGmScreenBtn');
    if (lockBtn) lockBtn.classList.remove('hidden');
    if (typeof refreshSaveStatesList === 'function') refreshSaveStatesList();
    if (!isGmScreenUnlocked()) {
      lockGmScreenNow();
    }
  }
  window.addEventListener('resize', resizeBattleCanvas);
  resizeBattleCanvas();
  syncLoadedMapImage();
  renderAllUI();
  requestAnimationFrame(renderBattleCanvas);
}

initVttApplication();
