// =========================================================================
// SAVE STATES ENGINE (INDEXEDDB NAMED SLOTS + QUICKSAVE + JSON IMPORT)
// =========================================================================

const VTT_IDB_NAME = 'DCC_VTT_SaveStates_DB_v1';
const VTT_IDB_STORE = 'save_slots';
const VTT_IDB_VERSION = 1;

let vttSaveSlotsCache = [];
let vttDeleteSaveArmId = null;
let vttDeleteSaveArmTimer = null;

function openVttSaveDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const req = indexedDB.open(VTT_IDB_NAME, VTT_IDB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(VTT_IDB_STORE)) {
        db.createObjectStore(VTT_IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open Save States DB'));
  });
}

function idbPutSaveSlot(record) {
  return openVttSaveDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(VTT_IDB_STORE, 'readwrite');
    tx.objectStore(VTT_IDB_STORE).put(record);
    tx.oncomplete = () => { db.close(); resolve(record); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Save failed')); };
  }));
}

function idbGetSaveSlot(id) {
  return openVttSaveDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(VTT_IDB_STORE, 'readonly');
    const req = tx.objectStore(VTT_IDB_STORE).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error || new Error('Read failed')); };
  }));
}

function idbGetAllSaveSlots() {
  return openVttSaveDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(VTT_IDB_STORE, 'readonly');
    const req = tx.objectStore(VTT_IDB_STORE).getAll();
    req.onsuccess = () => { db.close(); resolve(Array.isArray(req.result) ? req.result : []); };
    req.onerror = () => { db.close(); reject(req.error || new Error('List failed')); };
  }));
}

function idbDeleteSaveSlot(id) {
  return openVttSaveDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(VTT_IDB_STORE, 'readwrite');
    tx.objectStore(VTT_IDB_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error || new Error('Delete failed')); };
  }));
}

function buildSanitizedSaveSnapshot() {
  if (!appState) return null;
  const clone = JSON.parse(JSON.stringify(appState));
  // Never bake personal local credentials into save slots or exported files
  delete clone.sheetsWebhookUrl;
  delete clone.sheetsSecretToken;
  return clone;
}

function buildSaveSlotRecord(id, name, kind = 'manual') {
  const snapshot = buildSanitizedSaveSnapshot();
  const sc = getActiveScene();
  const tokens = sc?.tokens || [];
  const crawlers = tokens.filter(t => t.role === 'crawler').length;
  const mobs = tokens.filter(t => t.role !== 'crawler').length;
  const jsonStr = JSON.stringify(snapshot);
  return {
    id,
    name: String(name || 'Untitled Save').trim(),
    kind, // 'manual' | 'quicksave' | 'backup'
    savedAt: Date.now(),
    floor: Number(snapshot?.floor) || 1,
    round: Number(snapshot?.round) || 0,
    sceneName: sc?.name || 'Scene',
    sceneCount: (snapshot?.mapScenes || []).length,
    crawlerCount: crawlers,
    mobCount: mobs,
    sizeBytes: jsonStr.length,
    state: snapshot
  };
}

function normalizeAndApplyLoadedState(incomingState, sourceLabel = 'Save State') {
  if (!incomingState || !Array.isArray(incomingState.mapScenes) || incomingState.mapScenes.length === 0) {
    showVttToast('⚠️ Invalid save file: missing mapScenes.');
    return false;
  }

  // Preserve current browser's local Google Sheets credentials
  const preservedHook = appState?.sheetsWebhookUrl || DEFAULT_SHEETS_WEBHOOK_URL;
  const preservedToken = appState?.sheetsSecretToken || '';

  const restored = JSON.parse(JSON.stringify(incomingState));
  restored.sheetsWebhookUrl = preservedHook;
  if (preservedToken) restored.sheetsSecretToken = preservedToken;

  if (typeof restored.floor !== 'number') restored.floor = 1;
  if (typeof restored.round !== 'number') restored.round = 0;
  if (typeof restored.phaseIndex !== 'number') restored.phaseIndex = 0;
  if (typeof restored.collapseRemainingMinutes !== 'number') restored.collapseRemainingMinutes = 72 * 60;
  if (!restored.claimedCrawlers || typeof restored.claimedCrawlers !== 'object') restored.claimedCrawlers = {};
  if (!Array.isArray(restored.buffs)) restored.buffs = JSON.parse(JSON.stringify(DEFAULT_BUFFS_LIST));
  if (!Array.isArray(restored.debuffs)) restored.debuffs = JSON.parse(JSON.stringify(DEFAULT_DEBUFFS_LIST));
  if (!Array.isArray(restored.skills)) restored.skills = JSON.parse(JSON.stringify(DEFAULT_SKILLS_LIST));
  if (!Array.isArray(restored.spells)) restored.spells = JSON.parse(JSON.stringify(DEFAULT_SPELLS_LIST));
  if (!Array.isArray(restored.bestiary)) restored.bestiary = JSON.parse(JSON.stringify(DEFAULT_BESTIARY));
  if (!Array.isArray(restored.objectTemplates)) restored.objectTemplates = JSON.parse(JSON.stringify(DEFAULT_OBJECT_TEMPLATES));

  restored.mapScenes.forEach(sc => {
    if (!Array.isArray(sc.droppedLights)) sc.droppedLights = [];
    if (!Array.isArray(sc.walls)) sc.walls = [];
    if (!Array.isArray(sc.exploredSpots)) sc.exploredSpots = [];
    if (!Array.isArray(sc.ghostMarkers)) sc.ghostMarkers = [];
    if (!Array.isArray(sc.mapObjects)) sc.mapObjects = [];
    if (!Array.isArray(sc.tokens)) sc.tokens = [];
  });

  if (!restored.mapScenes.some(s => s.id === restored.activeMapId)) {
    restored.activeMapId = restored.mapScenes[0].id;
  }

  appState = restored;
  uiState.selectedTokenId = null;
  uiState.selectedLightId = null;
  uiState.activeCastPanel = null;
  uiState.previewEffectRange = null;
  visPolyCache.clear();
  exploredMemDirty = true;
  syncLoadedMapImage();
  commitStateChange();
  // Force full-image sync to any connected remote players
  if (typeof broadcastStateToOnlinePlayers === 'function') {
    broadcastStateToOnlinePlayers(true);
  }
  showVttToast(`✅ Loaded: ${sourceLabel}`);
  return true;
}

async function createAutoBackupSlot(reason = 'Pre-Load') {
  try {
    const rec = buildSaveSlotRecord('auto_backup_latest', `🛡️ Auto-Backup (${reason})`, 'backup');
    await idbPutSaveSlot(rec);
  } catch (_) {}
}

async function refreshSaveStatesList() {
  if (IS_PLAYER_WINDOW) return;
  try {
    const all = await idbGetAllSaveSlots();
    // Sort: quicksave first, then auto-backup, then manual saves newest first
    const rankOrder = { quicksave: 0, backup: 1, manual: 2 };
    all.sort((a, b) => {
      const ra = rankOrder[a.kind] ?? 2;
      const rb = rankOrder[b.kind] ?? 2;
      if (ra !== rb) return ra - rb;
      return (b.savedAt || 0) - (a.savedAt || 0);
    });
    vttSaveSlotsCache = all;
    renderSaveStatesUi();
  } catch (err) {
    console.warn('Could not load save states:', err);
  }
}

async function saveNamedStateSlot() {
  if (IS_PLAYER_WINDOW || !appState) return;
  const inp = document.getElementById('newSaveSlotNameInput');
  const sc = getActiveScene();
  const defaultName = `Floor ${appState.floor || 1} • ${sc?.name || 'Arena'} (R${appState.round || 0})`;
  const name = (inp?.value || '').trim() || defaultName;
  try {
    const rec = buildSaveSlotRecord('save_' + Date.now(), name, 'manual');
    await idbPutSaveSlot(rec);
    if (inp) inp.value = '';
    await refreshSaveStatesList();
    showVttToast(`💾 Saved state: "${name}"`);
  } catch (err) {
    showVttToast(`⚠️ Save failed: ${err.message}`);
  }
}

async function overwriteStateSlot(slotId) {
  if (IS_PLAYER_WINDOW || !appState || !slotId) return;
  try {
    const existing = await idbGetSaveSlot(slotId);
    const name = existing?.name || 'Saved State';
    const kind = existing?.kind || 'manual';
    const rec = buildSaveSlotRecord(slotId, name, kind);
    await idbPutSaveSlot(rec);
    await refreshSaveStatesList();
    showVttToast(`💾 Updated save slot: "${name}"`);
  } catch (err) {
    showVttToast(`⚠️ Overwrite failed: ${err.message}`);
  }
}

async function quickSaveCurrentState() {
  if (IS_PLAYER_WINDOW || !appState) return;
  try {
    const sc = getActiveScene();
    const label = `⚡ Quicksave — F${appState.floor || 1} ${sc?.name || ''}`.trim();
    const rec = buildSaveSlotRecord('quicksave', label, 'quicksave');
    await idbPutSaveSlot(rec);
    await refreshSaveStatesList();
    showVttToast(`⚡ Quicksaved (${sc?.name || 'Arena'} • Round ${appState.round || 0})`);
  } catch (err) {
    showVttToast(`⚠️ Quicksave failed: ${err.message}`);
  }
}

async function quickLoadSavedState() {
  if (IS_PLAYER_WINDOW) return;
  try {
    const rec = await idbGetSaveSlot('quicksave');
    if (!rec || !rec.state) {
      showVttToast('⚠️ No Quicksave found yet. Click ⚡ Quicksave first.');
      return;
    }
    await createAutoBackupSlot('Pre-Quickload');
    normalizeAndApplyLoadedState(rec.state, rec.name);
    await refreshSaveStatesList();
  } catch (err) {
    showVttToast(`⚠️ Quickload failed: ${err.message}`);
  }
}

async function loadStateSlot(slotId) {
  if (IS_PLAYER_WINDOW || !slotId) return;
  try {
    const rec = await idbGetSaveSlot(slotId);
    if (!rec || !rec.state) {
      showVttToast('⚠️ Save slot not found.');
      return;
    }
    if (slotId !== 'auto_backup_latest') {
      await createAutoBackupSlot('Pre-Load');
    }
    normalizeAndApplyLoadedState(rec.state, rec.name);
    await refreshSaveStatesList();
  } catch (err) {
    showVttToast(`⚠️ Load failed: ${err.message}`);
  }
}

async function deleteStateSlot(slotId) {
  if (IS_PLAYER_WINDOW || !slotId) return;
  if (vttDeleteSaveArmId !== slotId) {
    vttDeleteSaveArmId = slotId;
    clearTimeout(vttDeleteSaveArmTimer);
    vttDeleteSaveArmTimer = setTimeout(() => { vttDeleteSaveArmId = null; }, 4000);
    showVttToast('⚠️ Click 🗑️ again within 4s to confirm deleting this save slot.');
    return;
  }
  vttDeleteSaveArmId = null;
  try {
    await idbDeleteSaveSlot(slotId);
    await refreshSaveStatesList();
    showVttToast('🗑️ Deleted save slot.');
  } catch (err) {
    showVttToast(`⚠️ Delete failed: ${err.message}`);
  }
}

async function exportStateSlotJson(slotId) {
  try {
    const rec = await idbGetSaveSlot(slotId);
    if (!rec || !rec.state) return;
    const safeName = String(rec.name || 'Save').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40);
    const blob = new Blob([JSON.stringify(rec.state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DCC_Save_${safeName}_${new Date(rec.savedAt || Date.now()).toISOString().slice(0, 10)}.json`;
    a.click();
    showVttToast(`⬇️ Exported "${rec.name}" to JSON`);
  } catch (err) {
    showVttToast(`⚠️ Export failed: ${err.message}`);
  }
}

function handleImportCampaignJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      // Support importing either raw appState JSON or a wrapped slot object
      const candidate = (parsed && parsed.state && Array.isArray(parsed.state.mapScenes)) ? parsed.state : parsed;
      if (!candidate || !Array.isArray(candidate.mapScenes) || candidate.mapScenes.length === 0) {
        showVttToast('⚠️ File is not a valid DCC VTT Campaign JSON.');
        return;
      }
      await createAutoBackupSlot('Pre-Import');
      normalizeAndApplyLoadedState(candidate, file.name);
      await refreshSaveStatesList();
    } catch (err) {
      showVttToast(`⚠️ JSON Import failed: ${err.message}`);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function formatSaveSize(bytes) {
  const b = Number(bytes) || 0;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}

function formatSaveTimestamp(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '';
  }
}

function renderSaveStatesUi() {
  const listEl = document.getElementById('saveStatesList');
  if (!listEl) return;

  if (!vttSaveSlotsCache || vttSaveSlotsCache.length === 0) {
    listEl.innerHTML = '<div class="text-[11px] font-mono text-slate-500 italic text-center py-2">No saved states yet. Name a slot above or hit ⚡ Quicksave.</div>';
    return;
  }

  listEl.innerHTML = vttSaveSlotsCache.map(slot => {
    const borderCls = slot.kind === 'quicksave'
      ? 'border-amber-500/45 bg-amber-950/15'
      : slot.kind === 'backup'
        ? 'border-cyan-500/35 bg-cyan-950/15'
        : 'border-slate-800 bg-dungeon-900';
    return `
      <div class="rounded-xl border ${borderCls} p-2 space-y-1.5">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="font-bold text-[11px] text-slate-100 truncate">${escapeHtmlAttr(slot.name)}</div>
            <div class="text-[9.5px] font-mono text-slate-400">
              ${formatSaveTimestamp(slot.savedAt)} • F${slot.floor} R${slot.round} • ${slot.sceneCount} ${slot.sceneCount === 1 ? 'Map' : 'Maps'} • ${slot.crawlerCount}C/${slot.mobCount}M • ${formatSaveSize(slot.sizeBytes)}
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" onclick="loadStateSlot('${slot.id}')" title="Load this save state (auto-backs up current state first)" class="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition">
              ▶ Load
            </button>
            ${slot.kind !== 'backup' ? `
              <button type="button" onclick="overwriteStateSlot('${slot.id}')" title="Overwrite this slot with current VTT state" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold transition">
                💾
              </button>
            ` : ''}
            <button type="button" onclick="exportStateSlotJson('${slot.id}')" title="Download this save slot as a .json file" class="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-bold transition">
              ⬇
            </button>
            <button type="button" onclick="deleteStateSlot('${slot.id}')" title="Delete this save slot" class="px-1.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-[10px] font-bold transition">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
