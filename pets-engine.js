// =========================================================================
// CHAPTER 4 PETS, MOUNTS & MINIONS ENGINE (PAGES 228–232)
// =========================================================================

const PET_ATTITUDES = ['Hostile', 'Calm', 'Friendly', 'Bonded'];

const PET_ROLES = {
  Tank: {
    id: 'Tank',
    label: '🛡️ Tank',
    desc: 'DR = Floor Number + 1 Special Ability (upgrades with Floor)'
  },
  Aggressive: {
    id: 'Aggressive',
    label: '⚔️ Aggressive',
    desc: 'Back Claw & Bite (Rank = Floor) + Floor dmg to Animal Attacks; no Special Ability'
  },
  Utility: {
    id: 'Utility',
    label: '🧰 Utility',
    desc: 'Choose 2 Special Abilities (scales with Floor)'
  }
};

const PET_SPECIAL_ABILITIES = [
  'Move 60ft',
  'Taunt (Rank = Floor)',
  'Catcher (Rank = Floor)',
  'Swim (Move 30ft)',
  'Burrow (Move 30ft)',
  'Flight (Move 50ft)',
  'Jump (Move 50ft)',
  'Heightened Senses (Stat Check vs same DC)',
  'Resistance to Uncommon Damage'
];

const PET_MATURE_L15_PERKS = [
  'Earthquake (Mongo): Move before melee attack, roll 1d12; 10+ = 10–12ft Burst Take Down (5h CD)',
  'Wrecking Ball (Tummy Acher): 1/day Move+Attack Line (range = Move) for [Size]d6+F Bludgeoning',
  'Spells (Bianca): Favored Spells cost no extra Mana (must still spend Mana)',
  'Regeneration (Tummy Acher): Revives with +25% Stats & new flaw; reverts to Lvl 1 on 5th death',
  'Extra Pet Level 1 Special Ability'
];

const MOUNT_UPGRADE_COST_GOLD = 5000;
const MOUNT_BASE_COST_GOLD = 20000;

let petsUiState = {
  selectedOwnerId: '',
  tameRollLog: null,
  combatPersuadeLog: null,
  newPetName: '',
  newPetOrigin: 'dungeon', // 'earth_bonded' | 'dungeon' | 'vendor' | 'pet_reward'
  newPetSize: 2,
  newPetRole: 'Utility',
  newPetSpec1: 'Flight (Move 50ft)',
  newPetSpec2: 'Heightened Senses (Stat Check vs same DC)',
  newMountName: 'Warhorse / Mount',
  newMountSize: 5,
  mountUpgrades: { move5: 0, dr1: 0, size1: 0, trample: false },
  newMinionName: 'Skeleton / Minion',
  newMinionKind: 'Undead Minion',
  newMinionDurationRounds: 5,
  newMinionCommand: 'Guard & Attack foes'
};

function getPetOrMountHpMetrics(pet) {
  const sizeVal = Math.max(1, Math.min(8, Number(pet.size) || 2));
  const lvl = Math.max(1, Number(pet.level) || 1);
  const isMount = pet.entityKind === 'mount';
  const lvlBonus = isMount ? 0 : Math.min(10 - sizeVal, Math.max(0, lvl - 1));
  const maxPips = Math.max(1, Math.min(10, sizeVal + lvlBonus));
  const hpPerPip = Math.max(1, Number(pet.hpPerPip) || 3);
  const maxHp = maxPips * hpPerPip;
  const curHp = pet.currentHp !== undefined
    ? Math.max(0, Math.min(maxHp, Number(pet.currentHp)))
    : maxHp;
  const filledPips = curHp <= 0 ? 0 : Math.min(maxPips, Math.ceil(curHp / hpPerPip));
  return { maxPips, hpPerPip, maxHp, curHp, filledPips, sizeVal };
}

function ensureCrawlerCompanionsObj(tok) {
  if (!tok) return { pets: [], mounts: [], minions: [] };
  if (!tok.companions || typeof tok.companions !== 'object') {
    tok.companions = { pets: [], mounts: [], minions: [] };
  }
  tok.companions.pets = Array.isArray(tok.companions.pets) ? tok.companions.pets : [];
  tok.companions.mounts = Array.isArray(tok.companions.mounts) ? tok.companions.mounts : [];
  tok.companions.minions = Array.isArray(tok.companions.minions) ? tok.companions.minions : [];
  return tok.companions;
}

function getActiveCompanionOwner() {
  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  if (IS_PLAYER_WINDOW) {
    return (typeof getClaimedCrawlerToken === 'function' ? getClaimedCrawlerToken() : null) || crawlers[0] || null;
  }
  const match = crawlers.find(c => c.id === petsUiState.selectedOwnerId);
  const chosen = match || crawlers[0] || null;
  if (chosen) petsUiState.selectedOwnerId = chosen.id;
  return chosen;
}

function addCrawlerPet(owner, opts = {}) {
  if (!owner) return null;
  const comp = ensureCrawlerCompanionsObj(owner);
  const origin = opts.origin || 'dungeon';
  const isEarth = origin === 'earth_bonded';
  const sizeVal = Math.max(1, Math.min(7, Number(opts.size) || 2));
  const intScore = isEarth ? 1 : Math.max(1, Number(opts.intScore) || 2);
  const pet = {
    id: 'pet_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    entityKind: 'pet',
    name: String(opts.name || 'Dungeon Critter').trim(),
    origin,
    isDungeonBorn: !isEarth,
    crawlerNumber: isEarth ? (opts.crawlerNumber || Math.floor(100000 + Math.random() * 9000000)) : null,
    attitude: opts.attitude || (isEarth || origin === 'pet_reward' || origin === 'vendor' ? 'Calm' : 'Hostile'),
    role: opts.role || 'Utility',
    specials: Array.isArray(opts.specials) ? opts.specials.slice(0, 2) : [],
    level: 1,
    size: sizeVal,
    hpPerPip: Math.max(1, Number(opts.hpPerPip) || 3),
    currentHp: sizeVal * (Math.max(1, Number(opts.hpPerPip) || 3)),
    maxMana: Math.max(0, Number(opts.maxMana) || 0),
    currentMana: Math.max(0, Number(opts.maxMana) || 0),
    stats: {
      Str: Number(opts.str) || 2,
      Int: intScore,
      Con: Number(opts.con) || 2,
      Dex: Number(opts.dex) || 2,
      Cha: Number(opts.cha) || 1
    },
    inCarrier: false,
    carrierMagic: false,
    combatEngaged: false,
    combatFreeWill: false,
    deaths: 0
  };
  comp.pets.push(pet);
  return pet;
}

function advancePetAttitude(petId) {
  const owner = getActiveCompanionOwner();
  if (!owner || isCrawlerInActiveCombat()) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  const pet = comp.pets.find(p => p.id === petId);
  if (!pet) return;

  const curIdx = PET_ATTITUDES.indexOf(pet.attitude || 'Hostile');
  const nextIdx = Math.min(PET_ATTITUDES.length - 1, curIdx + 1);
  const nextAtt = PET_ATTITUDES[nextIdx];
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const intMod = typeof getDccStatModifierFromScore === 'function'
    ? getDccStatModifierFromScore(pet.stats?.Int || 2)
    : 1;
  const dc = 10 + intMod + floorNum;

  const ahEntry = (owner.assignedSkills || []).find(s => /^animal\s*handling$/i.test(String(s.name || '').trim()));
  const ahRank = ahEntry ? Math.max(1, Number(ahEntry.rank) || 1) : 0;
  if (ahEntry) ahEntry.markedForAdvancement = true;

  const d20 = ahRank === 0
    ? Math.min(Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1)
    : (Math.floor(Math.random() * 20) + 1);
  const chaMod = typeof getCrawlerStatMod === 'function' ? getCrawlerStatMod(owner, 'Cha') : 0;
  const total = d20 + ahRank + chaMod;

  // Rulebook p. 230: Hostile -> Calm needs Amazing Success (+10 over DC); Calm -> Friendly needs Standard Success; Friendly -> Bonded needs Amazing Success
  const needsAmazing = (pet.attitude === 'Hostile' || pet.attitude === 'Friendly');
  const success = d20 !== 1 && (d20 === 20 || (needsAmazing ? total >= dc + 10 : total >= dc));

  if (success) {
    pet.attitude = nextAtt;
    petsUiState.tameRollLog = `✅ ${pet.name}: Roll ${d20} + R${ahRank} + ${chaMod} = ${total} (target ${needsAmazing ? `Amazing ≥${dc + 10}` : `≥${dc}`}) → Attitude is now ${nextAtt}! (20m contact)`;
  } else {
    petsUiState.tameRollLog = `❌ ${pet.name}: Roll ${d20} + R${ahRank} + ${chaMod} = ${total} (target ${needsAmazing ? `Amazing ≥${dc + 10}` : `≥${dc}`}) → Remained ${pet.attitude}.`;
  }
  syncCraftingStateToHost(owner);
}

function persuadePetForCombat(petId) {
  const owner = getActiveCompanionOwner();
  if (!owner) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  const pet = comp.pets.find(p => p.id === petId);
  if (!pet) return;

  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const intMod = typeof getDccStatModifierFromScore === 'function'
    ? getDccStatModifierFromScore(pet.stats?.Int || 2)
    : 1;
  const dc = 10 + intMod + floorNum;

  const ahEntry = (owner.assignedSkills || []).find(s => /^animal\s*handling$/i.test(String(s.name || '').trim()));
  const ahRank = ahEntry ? Math.max(1, Number(ahEntry.rank) || 1) : 0;
  if (ahEntry) ahEntry.markedForAdvancement = true;

  const d20 = ahRank === 0
    ? Math.min(Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1)
    : (Math.floor(Math.random() * 20) + 1);
  const chaMod = typeof getCrawlerStatMod === 'function' ? getCrawlerStatMod(owner, 'Cha') : 0;
  const total = d20 + ahRank + chaMod;

  if (d20 === 20 || (d20 !== 1 && total >= dc + 10)) {
    pet.combatEngaged = true;
    pet.combatFreeWill = true;
    petsUiState.combatPersuadeLog = `🔥 ${pet.name} (${total} vs DC ${dc}) is FROTHING AT THE MOUTH! 2 Actions (free choice) + 1 attack/round.`;
  } else if (d20 !== 1 && total >= dc) {
    pet.combatEngaged = true;
    pet.combatFreeWill = false;
    petsUiState.combatPersuadeLog = `⚔️ ${pet.name} (${total} vs DC ${dc}) enters combat! 2 Actions (Evade, Move, or 1 Attack/round).`;
  } else {
    pet.combatEngaged = false;
    petsUiState.combatPersuadeLog = `🐾 ${pet.name} (${total} vs DC ${dc}) stays out of the fight for now.`;
  }
  syncCraftingStateToHost(owner);
}

function applyEnhancedPetBiscuit(petId) {
  const owner = getActiveCompanionOwner();
  if (!owner || isCrawlerInActiveCombat()) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  const pet = comp.pets.find(p => p.id === petId);
  if (!pet) return;

  const d100 = Math.floor(Math.random() * 100) + 1;
  if (d100 <= 12) {
    pet.stats.Int = Math.max(2, (Number(pet.stats.Int) || 1) + 1);
    petsUiState.tameRollLog = `🍪 ENHANCED PET BISCUIT (d100=${d100})! ${pet.name}'s Intelligence rose to ${pet.stats.Int} (becomes full crawler at Int ≥ 2 if Earth-born)!`;
  } else {
    const quirks = ['Roadkill Opossum flavor', 'Bubblegum hiccups', 'Sparkling fur', 'Loud burps', 'Minty breath'];
    const q = quirks[d100 % quirks.length];
    petsUiState.tameRollLog = `🍪 Pet Biscuit (d100=${d100} — ${q}): No Intelligence gain (vast majority of biscuits have quirky/no Int boost).`;
  }
  syncCraftingStateToHost(owner);
}

function togglePetCarrier(petId, magicCarrier = true) {
  const owner = getActiveCompanionOwner();
  if (!owner || isCrawlerInActiveCombat()) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  const pet = comp.pets.find(p => p.id === petId);
  if (!pet) return;
  pet.inCarrier = !pet.inCarrier;
  pet.carrierMagic = Boolean(magicCarrier);
  petsUiState.tameRollLog = pet.inCarrier
    ? `🎒 ${pet.name} stowed in ${magicCarrier ? 'Magic Pet Carrier (safe & cozy in Inventory)' : 'Mundane Carrier (can still see out)'}.`
    : `🐾 ${pet.name} released from carrier.`;
  syncCraftingStateToHost(owner);
}

function createPetFromForm() {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 No pet taming/adding during active combat!');
    return;
  }
  const owner = getActiveCompanionOwner();
  if (!owner) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  if (comp.pets.length >= 1) {
    showVttToast(`⚠️ ${owner.name} already has a pet (1 pet limit per crawler unless Class/Benefit allows more).`);
    return;
  }
  const name = String(petsUiState.newPetName || '').trim() || 'Companion';
  const specs = petsUiState.newPetRole === 'Tank'
    ? [petsUiState.newPetSpec1].filter(Boolean)
    : petsUiState.newPetRole === 'Utility'
      ? [petsUiState.newPetSpec1, petsUiState.newPetSpec2].filter(Boolean)
      : [];
  addCrawlerPet(owner, {
    name,
    origin: petsUiState.newPetOrigin,
    size: petsUiState.newPetSize,
    role: petsUiState.newPetRole,
    specials: specs
  });
  petsUiState.newPetName = '';
  petsUiState.tameRollLog = `🐾 Added ${name} (${petsUiState.newPetRole}, Size ${petsUiState.newPetSize}) to ${owner.name}!`;
  syncCraftingStateToHost(owner);
}

function createMountFromForm() {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 Cannot buy/add mounts during active combat!');
    return;
  }
  const owner = getActiveCompanionOwner();
  if (!owner) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  const sz = Math.max(5, Number(petsUiState.newMountSize) || 5);
  const u = petsUiState.mountUpgrades || { move5: 0, dr1: 0, size1: 0, trample: false };
  const extraCost = ((u.move5 || 0) + (u.dr1 || 0) + (u.size1 || 0) + (u.trample ? 1 : 0)) * MOUNT_UPGRADE_COST_GOLD;
  const totalCost = MOUNT_BASE_COST_GOLD + extraCost;

  const curGold = Number(owner.gold) || 0;
  if (curGold < totalCost) {
    showVttToast(`⚠️ Needs ${totalCost.toLocaleString()}g for mount + upgrades (has ${curGold.toLocaleString()}g).`);
    return;
  }
  owner.gold = curGold - totalCost;
  const finalSize = sz + (Number(u.size1) || 0);
  const moveFt = 30 + ((Number(u.move5) || 0) * 5);
  const drVal = Number(u.dr1) || 0;
  const hpPerPip = 4;
  comp.mounts.push({
    id: 'mnt_' + Date.now(),
    entityKind: 'mount',
    name: String(petsUiState.newMountName || 'Warhorse').trim(),
    size: finalSize,
    moveFt,
    dr: drVal,
    hasTrample: Boolean(u.trample),
    attitude: 'Calm',
    hpPerPip,
    currentHp: finalSize * hpPerPip,
    mounted: false,
    inCarrier: true
  });
  petsUiState.mountUpgrades = { move5: 0, dr1: 0, size1: 0, trample: false };
  syncCraftingStateToHost(owner);
  showVttToast(`🐎 Purchased mount for ${totalCost.toLocaleString()}g!`);
}

function createMinionFromForm() {
  const owner = getActiveCompanionOwner();
  if (!owner) return;
  const comp = ensureCrawlerCompanionsObj(owner);
  const name = String(petsUiState.newMinionName || '').trim() || 'Minion';
  comp.minions.push({
    id: 'min_' + Date.now(),
    entityKind: 'minion',
    name,
    kind: petsUiState.newMinionKind || 'Undead Minion',
    remainingRounds: Math.max(1, Number(petsUiState.newMinionDurationRounds) || 5),
    command: String(petsUiState.newMinionCommand || 'Follow & Guard').trim(),
    bereft: false
  });
  syncCraftingStateToHost(owner);
  showVttToast(`💀 Summoned/added minion: ${name}`);
}

function renderPetsMountsMinionsHtml(tok) {
  if (!tok) return '';
  const comp = ensureCrawlerCompanionsObj(tok);
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const u = petsUiState.mountUpgrades || { move5: 0, dr1: 0, size1: 0, trample: false };
  const mountCost = MOUNT_BASE_COST_GOLD + (((u.move5 || 0) + (u.dr1 || 0) + (u.size1 || 0) + (u.trample ? 1 : 0)) * MOUNT_UPGRADE_COST_GOLD);

  return `
    <div class="bg-dungeon-950 border border-amber-500/40 rounded-xl p-3 space-y-3 text-[11px]">
      <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
        <span class="font-mono font-bold uppercase text-amber-300">🐾 Pets, Mounts & Minions (Ch. 4 pp. 228–232)</span>
        <span class="font-mono text-[10px] text-slate-400">Floor ${floorNum} • Gold: <b class="text-amber-300">${(Number(tok.gold) || 0).toLocaleString()}g</b></span>
      </div>

      ${petsUiState.tameRollLog ? `<div class="bg-dungeon-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-emerald-200">${escapeHtmlAttr(petsUiState.tameRollLog)}</div>` : ''}
      ${petsUiState.combatPersuadeLog ? `<div class="bg-dungeon-900 border border-rose-500/40 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-rose-200">${escapeHtmlAttr(petsUiState.combatPersuadeLog)}</div>` : ''}

      <!-- Active Pets -->
      <div class="space-y-1.5">
        <div class="text-[10px] font-mono uppercase text-cyan-300 font-bold">Bonded / Tamed Pets (${comp.pets.length}/1+)</div>
        ${comp.pets.length === 0
          ? `<div class="text-[10.5px] text-slate-400 bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-2">
              <div>No pet yet. Add an Earth-born pet (Int 1, crawler ID; Int ≥ 2 becomes full crawler) or Dungeon pet (Lvl 1, Pet-class Mob; dies at 0% HP):</div>
              <div class="grid grid-cols-2 gap-1.5">
                <input type="text" value="${escapeHtmlAttr(petsUiState.newPetName)}" oninput="petsUiState.newPetName=this.value" placeholder="Pet name..." class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100" />
                <select onchange="petsUiState.newPetOrigin=this.value; renderCraftingModal()" class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100">
                  <option value="dungeon" ${petsUiState.newPetOrigin === 'dungeon' ? 'selected' : ''}>Dungeon Pet (Pet-class Mob)</option>
                  <option value="earth_bonded" ${petsUiState.newPetOrigin === 'earth_bonded' ? 'selected' : ''}>Earth-Born Pet (Int 1 + ID)</option>
                  <option value="vendor" ${petsUiState.newPetOrigin === 'vendor' ? 'selected' : ''}>Vendor Pet (10,000g • Lvl 1)</option>
                  <option value="pet_reward" ${petsUiState.newPetOrigin === 'pet_reward' ? 'selected' : ''}>Pet Reward Room / Class (Calm)</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-1.5">
                <select onchange="petsUiState.newPetRole=this.value; renderCraftingModal()" class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100">
                  ${Object.values(PET_ROLES).map(r => `<option value="${r.id}" ${petsUiState.newPetRole === r.id ? 'selected' : ''}>${r.label}</option>`).join('')}
                </select>
                <input type="number" min="1" max="7" value="${petsUiState.newPetSize}" onchange="petsUiState.newPetSize=Math.max(1,Math.min(7,Number(this.value)||2))" placeholder="Size (1-7)" class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300" />
              </div>
              ${petsUiState.newPetRole !== 'Aggressive' ? `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <select onchange="petsUiState.newPetSpec1=this.value" class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-[10.5px] text-slate-200">
                    ${PET_SPECIAL_ABILITIES.map(sp => `<option value="${escapeHtmlAttr(sp)}" ${petsUiState.newPetSpec1 === sp ? 'selected' : ''}>Spec 1: ${escapeHtmlAttr(sp)}</option>`).join('')}
                  </select>
                  ${petsUiState.newPetRole === 'Utility' ? `
                    <select onchange="petsUiState.newPetSpec2=this.value" class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-[10.5px] text-slate-200">
                      ${PET_SPECIAL_ABILITIES.map(sp => `<option value="${escapeHtmlAttr(sp)}" ${petsUiState.newPetSpec2 === sp ? 'selected' : ''}>Spec 2: ${escapeHtmlAttr(sp)}</option>`).join('')}
                    </select>
                  ` : ''}
                </div>
              ` : `<div class="text-[10px] font-mono text-rose-300">Aggressive: Back Claw & Bite (Rank = Floor) + Floor dmg to Animal Attacks; no Special Ability.</div>`}
              <button type="button" onclick="createPetFromForm()" class="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs">+ Add Pet</button>
            </div>`
          : comp.pets.map(p => {
              const pm = getPetOrMountHpMetrics(p);
              return `
                <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2.5 space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <div class="font-bold text-xs text-slate-100">🐾 ${escapeHtmlAttr(p.name)} <span class="font-mono text-amber-300">Lvl ${p.level} • Size ${pm.sizeVal}</span></div>
                      <div class="text-[10px] font-mono text-slate-400">Attitude: <b class="text-cyan-300">${p.attitude}</b> • Role: <b class="text-amber-300">${p.role}</b> • HP: <b class="text-emerald-300">${pm.curHp}/${pm.maxHp} (${pm.filledPips}/${pm.maxPips} Pips)</b> • Int ${p.stats?.Int ?? 2}</div>
                      ${p.specials?.length ? `<div class="text-[9.5px] font-mono text-purple-300">Specs: ${escapeHtmlAttr(p.specials.join(', '))}</div>` : ''}
                    </div>
                    <span class="px-2 py-0.5 rounded font-mono text-[9.5px] font-bold ${p.inCarrier ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40' : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'}">${p.inCarrier ? (p.carrierMagic ? '🎒 Magic Carrier' : '🧺 Carrier') : '🐾 Active'}</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button" onclick="advancePetAttitude('${p.id}')" class="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 font-bold text-[10px]">🤝 Tame / Bond (20m)</button>
                    <button type="button" onclick="persuadePetForCombat('${p.id}')" class="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 text-rose-200 font-bold text-[10px]">⚔️ Persuade to Fight</button>
                    <button type="button" onclick="applyEnhancedPetBiscuit('${p.id}')" class="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-200 font-bold text-[10px]">🍪 Pet Biscuit</button>
                    <button type="button" onclick="togglePetCarrier('${p.id}', true)" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px]">${p.inCarrier ? '🐾 Release' : '🎒 Magic Carrier'}</button>
                  </div>
                </div>
              `;
            }).join('')
        }
      </div>

      <!-- Mounts (20,000g Base + 5,000g Upgrades) -->
      <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2.5 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono uppercase text-amber-300 font-bold">🐎 Mounts (Base 20,000g • +5,000g/Upgrade)</span>
          <span class="text-[9.5px] font-mono text-slate-400">Must be ≥ 1 size larger than rider</span>
        </div>
        ${comp.mounts.map(m => `
          <div class="bg-dungeon-950 border border-slate-800 rounded px-2 py-1 flex items-center justify-between text-[10px] font-mono">
            <span>🐎 <b>${escapeHtmlAttr(m.name)}</b> (Size ${m.size}, Move ${m.moveFt}ft, DR +${m.dr}${m.hasTrample ? ', Trample' : ''})</span>
            <span class="text-emerald-300">${m.currentHp} HP</span>
          </div>
        `).join('')}
        <div class="grid grid-cols-2 gap-1.5">
          <input type="text" value="${escapeHtmlAttr(petsUiState.newMountName)}" oninput="petsUiState.newMountName=this.value" placeholder="Mount name..." class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100" />
          <input type="number" min="5" max="8" value="${petsUiState.newMountSize}" onchange="petsUiState.newMountSize=Math.max(5,Number(this.value)||5); renderCraftingModal()" class="bg-dungeon-950 border border-slate-700 rounded px-2 py-1 font-mono text-xs text-amber-300" />
        </div>
        <div class="flex flex-wrap gap-2 font-mono text-[10px] text-slate-300">
          <label class="flex items-center gap-1">+5ft Move ×<input type="number" min="0" max="6" value="${u.move5 || 0}" onchange="petsUiState.mountUpgrades.move5=Math.max(0,Number(this.value)||0); renderCraftingModal()" class="w-10 bg-dungeon-950 border border-slate-700 rounded px-1 py-0.5 text-center" /></label>
          <label class="flex items-center gap-1">+1 DR ×<input type="number" min="0" max="6" value="${u.dr1 || 0}" onchange="petsUiState.mountUpgrades.dr1=Math.max(0,Number(this.value)||0); renderCraftingModal()" class="w-10 bg-dungeon-950 border border-slate-700 rounded px-1 py-0.5 text-center" /></label>
          <label class="flex items-center gap-1">+1 Size ×<input type="number" min="0" max="3" value="${u.size1 || 0}" onchange="petsUiState.mountUpgrades.size1=Math.max(0,Number(this.value)||0); renderCraftingModal()" class="w-10 bg-dungeon-950 border border-slate-700 rounded px-1 py-0.5 text-center" /></label>
          <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" ${u.trample ? 'checked' : ''} onchange="petsUiState.mountUpgrades.trample=this.checked; renderCraftingModal()" class="accent-amber-400" /><span>Trample</span></label>
        </div>
        <button type="button" onclick="createMountFromForm()" class="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition">
          🐎 Buy Mount (${mountCost.toLocaleString()}g)
        </button>
      </div>

      <!-- Minions & Bereft Minions -->
      <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-1.5">
        <div class="text-[10px] font-mono uppercase text-purple-300 font-bold">💀 Minions (${comp.minions.length})</div>
        ${comp.minions.map(mn => `
          <div class="bg-dungeon-950 border border-slate-800 rounded px-2 py-1 flex items-center justify-between text-[10px] font-mono">
            <span>💀 <b>${escapeHtmlAttr(mn.name)}</b> (${escapeHtmlAttr(mn.kind)}) — ${escapeHtmlAttr(mn.command)}</span>
            <span class="text-amber-300">${mn.remainingRounds}r left</span>
          </div>
        `).join('')}
        <div class="flex gap-1.5">
          <input type="text" value="${escapeHtmlAttr(petsUiState.newMinionName)}" oninput="petsUiState.newMinionName=this.value" placeholder="Minion name..." class="flex-1 bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100" />
          <input type="text" value="${escapeHtmlAttr(petsUiState.newMinionCommand)}" oninput="petsUiState.newMinionCommand=this.value" placeholder="Command..." class="flex-1 bg-dungeon-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200" />
          <button type="button" onclick="createMinionFromForm()" class="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px]">+ Minion</button>
        </div>
      </div>

      <details class="bg-dungeon-900/70 border border-slate-800 rounded-lg p-2 text-[10px] text-slate-400">
        <summary class="cursor-pointer font-mono font-bold text-amber-300 select-none">🌟 Pet Level 15 Maturity & Special Abilities Reference</summary>
        <div class="mt-1.5 space-y-1">
          ${PET_MATURE_L15_PERKS.map(p => `<div>• ${escapeHtmlAttr(p)}</div>`).join('')}
        </div>
      </details>
    </div>
  `;
}
