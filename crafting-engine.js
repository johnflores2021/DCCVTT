// =========================================================================
// CHAPTER 4 CRAFTING ENGINE (MUNDANE, ENCHANTING, TABLES, ALCHEMY & ARCANE)
// DCC Rulebook Chapter 4 — Pages 221–227 (Out-of-Combat Only)
// =========================================================================

const CRAFTING_TABLE_TYPES = [
  { id: 'Alchemy', label: 'Alchemy', creates: 'Potions & poisons' },
  { id: 'Arcanist', label: 'Arcanist', creates: 'Imbuing items with inherent Spells' },
  { id: 'Armorer', label: 'Armorer', creates: 'Armor' },
  { id: 'Engineering', label: 'Engineering', creates: 'Moving parts, fluids, chemicals (e.g. bullets)' },
  { id: 'Metalworking', label: 'Metalworking', creates: 'Weapons' },
  { id: 'Sappers', label: "Sapper's", creates: 'Explosives' },
  { id: 'Writing', label: 'Writing', creates: 'Scrolls' }
];

const MUNDANE_SIZE_TABLE = [
  { id: 'Tiny', label: 'Tiny (Soda Can)', junk: 1, hours: 1 },
  { id: 'Small', label: 'Small (Toaster)', junk: 4, hours: 4 },
  { id: 'Petite', label: 'Petite (Chair)', junk: 16, hours: 9 },
  { id: 'Medium', label: 'Medium (Desk)', junk: 32, hours: 16 },
  { id: 'Large', label: 'Large (Statue)', junk: 64, hours: 25 },
  { id: 'Huge', label: 'Huge (Dumpster)', junk: 128, hours: 36 },
  { id: 'Colossal', label: 'Colossal (Barn)', junk: 256, hours: 49 },
  { id: 'Gargantuan', label: 'Gargantuan (Grain Silo)', junk: 512, hours: 64 }
];

const ENCHANT_CATEGORIES = [
  { id: 'stat', label: 'Stat Bonus (+X)', mult: 2, formulaText: '10 + [Bonus × 2]' },
  { id: 'skill_active', label: 'Non-Passive Skill / Spell Rank', mult: 4, formulaText: '10 + [Bonus × 4]' },
  { id: 'other', label: 'Other / Explosives / Default', mult: 4, formulaText: '10 + [Bonus × 4]' },
  { id: 'dr_passive', label: 'DR / Passive Skill or Spell', mult: 6, formulaText: '10 + [Bonus × 6]' }
];


// =========================================================================
// ARCANE SPELL IMBUEMENT COOLDOWN & TATTOOS (CHAPTER 4 — PAGES 228)
// =========================================================================
function calcImbuedSpellCooldownHours(spellRank, bonusLevelDelta = 0, alreadyHadCooldown = false) {
  const rank = Math.max(1, Number(spellRank) || 1);
  const delta = Math.max(-10, Math.min(10, Number(bonusLevelDelta) || 0));
  const baseCd = alreadyHadCooldown ? 0 : (rank * 2);
  // +1 Bonus Level: -2h (min 1h); -1 Bonus Level: +5h (max 30h)
  let cd = baseCd;
  if (delta > 0) {
    cd = Math.max(1, cd - (delta * 2));
  } else if (delta < 0) {
    cd = Math.min(30, cd + (Math.abs(delta) * 5));
  }
  return { baseCd, delta, finalHours: cd };
}

function getCrawlerTattooSummary(tok) {
  const tattoos = Array.isArray(tok?.tattoos) ? tok.tattoos : [];
  let statTattoos = 0;
  let skillTattoos = 0;
  tattoos.forEach(t => {
    const kind = String(t.bonusType || '').toLowerCase();
    if (kind === 'stat') statTattoos++;
    else if (kind === 'skill') skillTattoos++;
  });
  return {
    tattoos,
    statCount: statTattoos,
    skillCount: skillTattoos,
    statRemaining: Math.max(0, 2 - statTattoos),
    skillRemaining: Math.max(0, 2 - skillTattoos)
  };
}

let craftingUiState = {
  mode: 'mundane', // 'mundane' | 'magic' | 'concoction' | 'infusion' | 'tables'
  selectedCrawlerId: '',
  mundaneSub: 'common', // 'common' | 'uncommon'
  commonItemName: '',
  commonItemNotes: '',
  uncommonSizeIdx: 1, // Small = 4 junk, 4h
  uncommonSkill: 'Fabricate', // 'Fabricate' | 'Engineering'
  uncommonItemName: '',
  uncommonItemNotes: '',
  magicCategory: 'stat',
  magicBonus: 1,
  magicSkill: 'Smithing',
  magicTableType: 'Metalworking',
  magicItemName: '',
  magicEffectSummary: '',
  magicHours: 1,
  concoctionAimBonus: 2,
  concoctionOutcome: 'standard', // 'crit' | 'amazing' | 'standard' | 'fail' | 'critfail'
  concoctionName: '',
  infusionBonus: 2,
  infusionItemName: '',
  infusionEffectSummary: '',
  deductClock: true,
  lastResult: null
};

function isCrawlerInActiveCombat() {
  return Boolean(appState && (Number(appState.round) || 0) > 0);
}

function getCrawlerMiscJunkQty(tok) {
  if (!tok || !Array.isArray(tok.inventory)) return 0;
  const entry = tok.inventory.find(i => !i.isLootBox && /^misc\.?\s*junk$/i.test(String(i.name || '').trim()));
  return entry ? Math.max(0, Number(entry.qty) || 0) : 0;
}

function adjustCrawlerMiscJunk(tok, delta) {
  if (!tok) return 0;
  tok.inventory = Array.isArray(tok.inventory) ? tok.inventory : [];
  let entry = tok.inventory.find(i => !i.isLootBox && /^misc\.?\s*junk$/i.test(String(i.name || '').trim()));
  const cur = entry ? Math.max(0, Number(entry.qty) || 0) : 0;
  const next = Math.max(0, cur + delta);
  if (next === 0) {
    if (entry) tok.inventory = tok.inventory.filter(i => i.id !== entry.id);
    return 0;
  }
  if (!entry) {
    entry = {
      id: 'inv_junk_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: 'Misc. Junk',
      icon: '🔩',
      category: 'Quest / Misc',
      qty: next,
      notes: 'Kitchen-drawer bits, scrap & salvageable materials (1 pt = 1 Misc. Junk).'
    };
    tok.inventory.unshift(entry);
  } else {
    entry.qty = next;
  }
  return next;
}

function getCrawlerCraftingTables(tok) {
  if (!tok) return {};
  if (!tok.craftingTables || typeof tok.craftingTables !== 'object') {
    tok.craftingTables = {};
  }
  return tok.craftingTables;
}

function getEffectiveTableTierForCrawler(tok, tableType) {
  const tables = getCrawlerCraftingTables(tok);
  const owned = Number(tables[tableType]) || 0;
  if (owned <= 0) return 0;
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  // Rulebook p. 223: Tables automatically level up by 1 when reaching a new floor (Floor 1 = +0 auto floor bonus, Floor 4+ = +(Floor-1) or +1/floor)
  const floorBonus = Math.max(0, floorNum - 1);
  return Math.min(10, owned + floorBonus);
}

function getItemEnchantmentCount(item) {
  if (!item) return 0;
  if (typeof item.enchantCount === 'number') return Math.max(0, item.enchantCount);
  const notes = String(item.notes || '');
  const parts = notes.split(/[|•]/).map(s => s.trim()).filter(Boolean);
  return parts.length;
}

function calcEnchantingDc(categoryId, bonusVal) {
  const cat = ENCHANT_CATEGORIES.find(c => c.id === categoryId) || ENCHANT_CATEGORIES[2];
  const b = Math.max(1, Number(bonusVal) || 1);
  return 10 + (b * cat.mult);
}

function resolveSalvageFromDiff(missedBy, hasSalvageSkill = false) {
  const m = Math.max(1, Number(missedBy) || 1);
  if (m <= 2) return { tier: 'full', label: 'Full Salvage (100% raw materials recovered)' };
  if (m <= 9) {
    return {
      tier: 'half',
      label: hasSalvageSkill
        ? 'Half+ Salvage (50%+ raw materials recovered via Salvage Skill)'
        : 'Half Salvage (50% raw materials recovered)'
    };
  }
  return {
    tier: 'none',
    label: hasSalvageSkill
      ? 'Wrecked (Salvage Skill may rescue minor scrap)'
      : 'Wrecked (Nothing left to salvage)'
  };
}

function addCraftedItemToInventory(tok, itemObj) {
  if (!tok || !itemObj) return;
  tok.inventory = Array.isArray(tok.inventory) ? tok.inventory : [];
  const cleanName = String(itemObj.name || 'Crafted Item').trim();
  const addQty = Math.max(1, Number(itemObj.qty) || 1);
  const existing = !itemObj.isEnchantedGear
    ? tok.inventory.find(i => !i.isLootBox && !i.isEnchantedGear && String(i.name || '').trim().toLowerCase() === cleanName.toLowerCase())
    : null;
  if (existing) {
    existing.qty = Math.min(999, (Number(existing.qty) || 1) + addQty);
    if (itemObj.notes) existing.notes = itemObj.notes;
  } else {
    tok.inventory.unshift({
      id: 'inv_cr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: cleanName,
      icon: itemObj.icon || '🛠️',
      category: itemObj.category || 'Gear',
      qty: addQty,
      isEnchantedGear: Boolean(itemObj.isEnchantedGear),
      enchantCount: Number(itemObj.enchantCount) || 0,
      notes: String(itemObj.notes || '').trim()
    });
  }
}

function syncCraftingStateToHost(tok) {
  if (!tok) return;
  if (IS_PLAYER_WINDOW) {
    sendPlayerInventoryUpdateToHost(tok.id, tok.inventory || []);
    renderCraftingModal();
    if (typeof renderPlayerControlDeck === 'function') renderPlayerControlDeck();
  } else {
    commitStateChange();
    renderCraftingModal();
  }
}

function applyCraftingClockCost(hours, reason) {
  const h = Math.max(0, Number(hours) || 0);
  if (h <= 0 || !craftingUiState.deductClock || IS_PLAYER_WINDOW) return;
  if (typeof recordCollapseClockShift === 'function') {
    recordCollapseClockShift(-h * 60, `${h}h ${reason}`);
  } else if (appState) {
    appState.collapseRemainingMinutes = Math.max(0, (appState.collapseRemainingMinutes ?? 72 * 60) - h * 60);
  }
}

function getActiveCraftingCrawler() {
  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  if (IS_PLAYER_WINDOW) {
    const claimed = typeof getClaimedCrawlerToken === 'function' ? getClaimedCrawlerToken() : null;
    return claimed || crawlers[0] || null;
  }
  const match = crawlers.find(c => c.id === craftingUiState.selectedCrawlerId);
  const chosen = match || crawlers[0] || null;
  if (chosen) craftingUiState.selectedCrawlerId = chosen.id;
  return chosen;
}

function executeMundaneCommonCraft() {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 No crafting during active combat!');
    return;
  }
  const tok = getActiveCraftingCrawler();
  if (!tok) {
    showVttToast('⚠️ No Crawler selected.');
    return;
  }
  const itemName = String(craftingUiState.commonItemName || '').trim() || 'Utility Gadget';
  const junkHave = getCrawlerMiscJunkQty(tok);
  if (junkHave < 1) {
    showVttToast(`⚠️ ${tok.name} needs 1 Misc. Junk (has ${junkHave}).`);
    return;
  }

  adjustCrawlerMiscJunk(tok, -1);
  addCraftedItemToInventory(tok, {
    name: itemName,
    icon: '🧰',
    category: 'Utility',
    qty: 1,
    notes: String(craftingUiState.commonItemNotes || '').trim() || 'Mundane common item (1 Misc. Junk; circumstantial bonus only).'
  });

  const res = {
    title: `🧰 Mundane Common Item: ${itemName}`,
    success: true,
    detail: `Spent 1 Misc. Junk (${junkHave - 1} remaining). Added to ${tok.name}'s Inventory (no inherent stat/DR bonus; circumstantial advantage only).`
  };
  craftingUiState.lastResult = res;
  craftingUiState.commonItemName = '';
  craftingUiState.commonItemNotes = '';
  syncCraftingStateToHost(tok);
  showVttToast(`🧰 Pulled ${itemName} using 1 Misc. Junk!`);
}

function executeMundaneUncommonCraft() {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 No crafting during active combat!');
    return;
  }
  const tok = getActiveCraftingCrawler();
  if (!tok) return;
  const szRow = MUNDANE_SIZE_TABLE[craftingUiState.uncommonSizeIdx] || MUNDANE_SIZE_TABLE[1];
  const itemName = String(craftingUiState.uncommonItemName || '').trim() || `${szRow.id} Crafted Item`;
  const junkHave = getCrawlerMiscJunkQty(tok);

  if (junkHave < szRow.junk) {
    showVttToast(`⚠️ Needs ${szRow.junk} Misc. Junk for ${szRow.id} item (has ${junkHave}).`);
    return;
  }

  adjustCrawlerMiscJunk(tok, -szRow.junk);
  applyCraftingClockCost(szRow.hours, 'Craft');

  const skillName = craftingUiState.uncommonSkill === 'Engineering' ? 'Engineering' : 'Fabricate';
  const skEntry = (tok.assignedSkills || []).find(s => new RegExp(`^${skillName}$`, 'i').test(String(s.name || '').trim()));
  const rank = skEntry ? Math.max(1, Number(skEntry.rank) || 1) : 0;
  if (skEntry) skEntry.markedForAdvancement = true;

  const statKey = skillName === 'Engineering' ? 'Int' : 'Int';
  const statMod = typeof getCrawlerStatMod === 'function' ? getCrawlerStatMod(tok, statKey) : 0;
  const d20 = rank === 0
    ? Math.min(Math.floor(Math.random() * 20) + 1, Math.floor(Math.random() * 20) + 1)
    : (Math.floor(Math.random() * 20) + 1);
  const total = d20 + rank + statMod;
  const dc = 10 + (craftingUiState.uncommonSizeIdx * 2);
  const success = total >= dc;

  if (success) {
    addCraftedItemToInventory(tok, {
      name: itemName,
      icon: skillName === 'Engineering' ? '⚙️' : '🛠️',
      category: 'Gear',
      qty: 1,
      notes: `${szRow.id} (${skillName}) • ${String(craftingUiState.uncommonItemNotes || '').trim() || 'Crafted mundane item.'}`
    });
  }

  const hasSalvage = (tok.assignedSkills || []).some(s => /^salvage$/i.test(String(s.name || '').trim()));
  const salvageInfo = !success ? resolveSalvageFromDiff(dc - total, hasSalvage) : null;

  craftingUiState.lastResult = {
    title: `${success ? '✅' : '❌'} ${skillName} (${szRow.id}): ${itemName}`,
    success,
    detail: `Roll ${d20} + R${rank} + ${statMod} = ${total} vs DC ${dc} (${szRow.hours}h, -${szRow.junk} Junk). ` +
      (success ? 'Item created & added to Inventory!' : `Failed by ${dc - total} — ${salvageInfo.label}.`)
  };

  syncCraftingStateToHost(tok);
  showVttToast(success ? `✅ Crafted ${itemName}!` : `❌ ${skillName} failed (${total} vs DC ${dc})`);
}

function executeMagicEnchantCraft() {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 No crafting during active combat!');
    return;
  }
  const tok = getActiveCraftingCrawler();
  if (!tok) return;
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  if (floorNum < 4) {
    showVttToast('⚠️ Magic item enchanting is for Floor 4 & beyond (currently Floor ' + floorNum + ').');
    return;
  }

  const bonus = Math.max(1, Math.min(10, Number(craftingUiState.magicBonus) || 1));
  const hours = Math.max(1, Number(craftingUiState.magicHours) || bonus);
  const itemName = String(craftingUiState.magicItemName || '').trim() || `Enchanted Gear (+${bonus})`;
  const skName = String(craftingUiState.magicSkill || 'Smithing').trim();
  const tblType = String(craftingUiState.magicTableType || 'Metalworking').trim();

  const skEntry = (tok.assignedSkills || []).find(s => String(s.name || '').trim().toLowerCase() === skName.toLowerCase());
  const rank = skEntry ? Math.max(1, Number(skEntry.rank) || 1) : 0;
  if (skEntry) skEntry.markedForAdvancement = true;

  const tableTier = getEffectiveTableTierForCrawler(tok, tblType);
  const statMod = typeof getCrawlerStatMod === 'function' ? getCrawlerStatMod(tok, 'Int') : 0;
  const dc = calcEnchantingDc(craftingUiState.magicCategory, bonus);

  // Over-enchanting check if targeting an existing item with 3+ enchantments
  const inv = tok.inventory || [];
  const existingTarget = inv.find(i => !i.isLootBox && String(i.name || '').trim().toLowerCase() === itemName.toLowerCase());
  const curEnchCount = getItemEnchantmentCount(existingTarget);
  let overEnchantBroke = false;
  let overEnchantNote = '';

  if (existingTarget && curEnchCount >= 3) {
    const d10 = Math.floor(Math.random() * 10) + 1;
    if (d10 <= 5) {
      overEnchantBroke = true;
      tok.inventory = inv.filter(i => i.id !== existingTarget.id);
      overEnchantNote = `💥 OVER-ENCHANTED! 1d10 rolled ${d10} (≤5) on ${curEnchCount} enchantments — ${existingTarget.name} permanently broke!`;
    } else {
      overEnchantNote = `⚠️ Over-Enchant Risk: 1d10 rolled ${d10} (>5) — ${existingTarget.name} held together!`;
    }
  }

  applyCraftingClockCost(hours, 'Enchanting');
  if (overEnchantBroke) {
    craftingUiState.lastResult = {
      title: `💥 Item Destroyed: ${itemName}`,
      success: false,
      detail: overEnchantNote
    };
    syncCraftingStateToHost(tok);
    showVttToast(`💥 ${existingTarget.name} broke during over-enchanting!`);
    return;
  }

  const d20 = Math.floor(Math.random() * 20) + 1;
  const isCritFail = d20 === 1;
  const total = d20 + rank + statMod + tableTier;
  const success = !isCritFail && total >= dc;
  const effTag = String(craftingUiState.magicEffectSummary || '').trim() || `+${bonus} ${craftingUiState.magicCategory}`;

  if (success) {
    if (existingTarget) {
      existingTarget.notes = existingTarget.notes ? `${existingTarget.notes} | ${effTag}` : effTag;
      existingTarget.isEnchantedGear = true;
      existingTarget.enchantCount = curEnchCount + 1;
    } else {
      addCraftedItemToInventory(tok, {
        name: itemName,
        icon: '✨',
        category: 'Gear',
        qty: 1,
        isEnchantedGear: true,
        enchantCount: 1,
        notes: `${effTag} (Crafted via ${tblType} T${tableTier} + ${skName})`
      });
    }
  }

  const hasSalvage = (tok.assignedSkills || []).some(s => /^salvage$/i.test(String(s.name || '').trim()));
  const salvageInfo = !success && !isCritFail ? resolveSalvageFromDiff(dc - total, hasSalvage) : null;

  craftingUiState.lastResult = {
    title: `${success ? '✨' : '❌'} Enchant (${skName} + ${tblType} T${tableTier}): ${itemName}`,
    success,
    detail: `Roll d20(${d20}) + R${rank} + ${statMod} + T${tableTier} = ${total} vs DC ${dc} (${hours}h). ` +
      (overEnchantNote ? `${overEnchantNote} ` : '') +
      (success
        ? `Enchantment applied: ${effTag}!`
        : (isCritFail ? 'Critical Fail (Nat 1) — Item damaged; may be Repaired.' : `Failed by ${dc - total} — ${salvageInfo.label}.`))
  };

  syncCraftingStateToHost(tok);
  showVttToast(success ? `✨ Enchanted ${itemName}!` : `❌ Enchant check failed (${total} vs DC ${dc})`);
}

function executeConcoctionOrInfusion(kind = 'concoction') {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 No crafting during active combat!');
    return;
  }
  const tok = getActiveCraftingCrawler();
  if (!tok) return;

  if (kind === 'concoction') {
    const aim = Math.max(1, Number(craftingUiState.concoctionAimBonus) || 2);
    const out = craftingUiState.concoctionOutcome || 'standard';
    const name = String(craftingUiState.concoctionName || '').trim() || `Concoction (+${aim})`;
    const mins = aim;
    if (craftingUiState.deductClock && !IS_PLAYER_WINDOW && typeof recordCollapseClockShift === 'function') {
      recordCollapseClockShift(-mins, `${mins}m Concoction`);
    }

    if (out === 'critfail') {
      const acidDmg = Math.max(1, aim) * 6;
      const d6s = [];
      let sum = 0;
      for (let i = 0; i < aim; i++) {
        const r = Math.floor(Math.random() * 6) + 1;
        d6s.push(r);
        sum += r;
      }
      if (!IS_PLAYER_WINDOW && typeof adjustTokenHealth === 'function') {
        const pipOut = typeof calculateWholePipDamageOutcome === 'function'
          ? calculateWholePipDamageOutcome(tok, sum)
          : { effectiveHpDamage: sum };
        if (pipOut.effectiveHpDamage > 0) adjustTokenHealth(tok.id, -pipOut.effectiveHpDamage);
      }
      craftingUiState.lastResult = {
        title: `💥 Concoction Blew Up: ${name}`,
        success: false,
        detail: `Critical Fail! Rolled ${aim}d6 [${d6s.join(', ')}] = ${sum} Acid damage (max ${acidDmg}).`
      };
    } else if (out === 'fail') {
      craftingUiState.lastResult = {
        title: `🤢 Ruined Mixture: ${name}`,
        success: false,
        detail: 'Near Miss or Failure — mixture is unusable; no salvage possible.'
      };
    } else {
      const royaltyNote = out === 'crit' ? ' • 🌟 Unique Invention! +1g royalty each time used!' : '';
      addCraftedItemToInventory(tok, {
        name,
        icon: out === 'crit' ? '🌟' : '🧪',
        category: 'Consumable',
        qty: 1,
        notes: `Concoction (${out.toUpperCase()}, ${mins}m)${royaltyNote}`
      });
      craftingUiState.lastResult = {
        title: `🧪 Brewed ${name} (${out.toUpperCase()})`,
        success: true,
        detail: `Created in ${mins} min${royaltyNote}.`
      };
    }
    syncCraftingStateToHost(tok);
    return;
  }

  // Infusion (Table 48 / p. 227)
  const bonus = Math.max(1, Number(craftingUiState.infusionBonus) || 2);
  const itemName = String(craftingUiState.infusionItemName || '').trim() || `Infused Item (+${bonus})`;
  const eff = String(craftingUiState.infusionEffectSummary || '').trim() || `+${bonus} Infused Effect`;
  const skEntry = (tok.assignedSkills || []).find(s => /^infusion$/i.test(String(s.name || '').trim()));
  const rank = skEntry ? Math.max(1, Number(skEntry.rank) || 1) : 0;
  const statMod = typeof getCrawlerStatMod === 'function' ? getCrawlerStatMod(tok, 'Int') : 0;
  const dc = 10 + bonus;

  // Advantage roll for prepared potion infusion
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;
  const d20 = Math.max(r1, r2);
  const total = d20 + rank + statMod;
  const success = total >= dc;

  if (craftingUiState.deductClock && !IS_PLAYER_WINDOW && typeof recordCollapseClockShift === 'function') {
    recordCollapseClockShift(-bonus, `${bonus}m Infusion`);
  }

  if (success) {
    addCraftedItemToInventory(tok, {
      name: itemName,
      icon: '💧',
      category: 'Consumable',
      qty: 1,
      notes: `Infused (${bonus}m, Adv [${r1},${r2}]→${d20}): ${eff}`
    });
  }

  craftingUiState.lastResult = {
    title: `${success ? '💧' : '❌'} Infusion: ${itemName}`,
    success,
    detail: `Adv [${r1}, ${r2}]→${d20} + R${rank} + ${statMod} = ${total} vs DC ${dc} (${bonus}m). ` +
      (success ? `Added ${eff} to ${itemName}!` : 'Infusion failed; potion consumed.')
  };
  syncCraftingStateToHost(tok);
}

function setCrawlerCraftingTableTier(tableType, tierVal) {
  if (IS_PLAYER_WINDOW) return;
  const tok = getActiveCraftingCrawler();
  if (!tok) return;
  const tables = getCrawlerCraftingTables(tok);
  const nextTier = Math.max(0, Math.min(10, Number(tierVal) || 0));
  if (nextTier === 0) delete tables[tableType];
  else tables[tableType] = nextTier;
  commitStateChange();
  renderCraftingModal();
}

function openCraftingModal(preselectCrawlerId = '') {
  if (isCrawlerInActiveCombat()) {
    showVttToast('🚫 Crafting is disabled during active combat!');
    return;
  }
  const modal = document.getElementById('craftingModal');
  if (!modal) return;
  if (preselectCrawlerId) craftingUiState.selectedCrawlerId = preselectCrawlerId;
  modal.classList.remove('hidden');
  renderCraftingModal();
}

function closeCraftingModal() {
  const modal = document.getElementById('craftingModal');
  if (modal) modal.classList.add('hidden');
}

function renderCraftingModal() {
  const body = document.getElementById('craftingModalBody');
  if (!body) return;

  if (isCrawlerInActiveCombat()) {
    body.innerHTML = `
      <div class="bg-rose-950/40 border border-rose-500/60 rounded-xl p-4 text-center space-y-1.5">
        <div class="text-2xl">⚔️</div>
        <div class="font-bold text-xs text-rose-200">No Crafting During Combat</div>
        <p class="text-[11px] text-rose-100/80">End combat (Round 0) or step out of combat before crafting or enchanting gear.</p>
      </div>
    `;
    return;
  }

  const sc = getActiveScene();
  const crawlers = (sc?.tokens || []).filter(t => t.role === 'crawler');
  const tok = getActiveCraftingCrawler();

  if (!tok) {
    body.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">Deploy or claim a Crawler first to craft items.</div>`;
    return;
  }

  const junkHave = getCrawlerMiscJunkQty(tok);
  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  const mode = craftingUiState.mode || 'mundane';

  const topBanner = `
    <div class="flex flex-wrap items-center justify-between gap-2 bg-dungeon-950 border border-slate-800 rounded-xl p-2.5">
      <div class="flex items-center gap-2">
        ${!IS_PLAYER_WINDOW ? `
          <select onchange="craftingUiState.selectedCrawlerId=this.value; craftingUiState.lastResult=null; renderCraftingModal()" class="bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-100">
            ${crawlers.map(c => `<option value="${c.id}" ${c.id === tok.id ? 'selected' : ''}>${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)} (Lvl ${c.level || 1})</option>`).join('')}
          </select>
        ` : `<span class="font-bold text-xs text-cyan-300">${tok.iconSymbol || '⚔️'} ${escapeHtmlAttr(tok.name)} (Lvl ${tok.level || 1})</span>`}
        <span class="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 font-mono text-[10.5px] font-bold text-amber-200">🔩 Misc. Junk: ${junkHave}</span>
        <span class="font-mono text-[10px] text-slate-400">Floor ${floorNum}</span>
      </div>
      ${!IS_PLAYER_WINDOW ? `
        <div class="flex items-center gap-1 font-mono text-[10px]">
          <button type="button" onclick="adjustCrawlerMiscJunk(getActiveCraftingCrawler(), -1); syncCraftingStateToHost(getActiveCraftingCrawler())" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700">-1</button>
          <button type="button" onclick="adjustCrawlerMiscJunk(getActiveCraftingCrawler(), 1); syncCraftingStateToHost(getActiveCraftingCrawler())" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700">+1</button>
          <button type="button" onclick="adjustCrawlerMiscJunk(getActiveCraftingCrawler(), 10); syncCraftingStateToHost(getActiveCraftingCrawler())" class="px-1.5 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200">+10</button>
        </div>
      ` : ''}
    </div>

    <div class="grid grid-cols-6 gap-1">
      ${[
        { id: 'mundane', lbl: '🛠️ Mundane' },
        { id: 'magic', lbl: '✨ Enchant' },
        { id: 'concoction', lbl: '🧪 Brew' },
        { id: 'infusion', lbl: '💧 Infuse' },
        { id: 'pets', lbl: '🐾 Pets' },
        { id: 'tables', lbl: '🪑 Tables' }
      ].map(t => `
        <button type="button" onclick="craftingUiState.mode='${t.id}'; craftingUiState.lastResult=null; renderCraftingModal()" class="py-1.5 px-1 rounded-lg text-[10px] font-bold transition ${mode === t.id ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">${t.lbl}</button>
      `).join('')}
    </div>
  `;

  let modeBody = '';
  if (mode === 'mundane') {
    const sub = craftingUiState.mundaneSub || 'common';
    const szRow = MUNDANE_SIZE_TABLE[craftingUiState.uncommonSizeIdx] || MUNDANE_SIZE_TABLE[1];
    const dc = 10 + (craftingUiState.uncommonSizeIdx * 2);
    modeBody = `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div class="grid grid-cols-2 gap-1.5">
          <button type="button" onclick="craftingUiState.mundaneSub='common'; renderCraftingModal()" class="py-1.5 rounded-lg text-[10.5px] font-bold ${sub === 'common' ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-900 text-slate-300 border border-slate-800'}">🧰 Common (1 Junk)</button>
          <button type="button" onclick="craftingUiState.mundaneSub='uncommon'; renderCraftingModal()" class="py-1.5 rounded-lg text-[10.5px] font-bold ${sub === 'uncommon' ? 'bg-emerald-500 text-slate-950' : 'bg-dungeon-900 text-slate-300 border border-slate-800'}">📐 Uncommon (Table 43)</button>
        </div>

        ${sub === 'common' ? `
          <div class="space-y-2 text-[11px]">
            <p class="text-slate-400 text-[10.5px]">Spend <b>1 Misc. Junk</b> to pull a small household/grocery item (limited moving parts; no food/water). Circumstantial bonus only.</p>
            <input type="text" value="${escapeHtmlAttr(craftingUiState.commonItemName)}" oninput="craftingUiState.commonItemName=this.value" placeholder="Item name (e.g. Roll of Tape, Rubber Gloves, Ladder)..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100" />
            <input type="text" value="${escapeHtmlAttr(craftingUiState.commonItemNotes)}" oninput="craftingUiState.commonItemNotes=this.value" placeholder="Circumstantial note (e.g. +Adv on Climbing)..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" />
            <button type="button" ${junkHave < 1 ? 'disabled' : ''} onclick="executeMundaneCommonCraft()" class="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs disabled:opacity-40 transition">
              🧰 Spend 1 Misc. Junk & Add Item
            </button>
          </div>
        ` : `
          <div class="space-y-2 text-[11px]">
            <div class="grid grid-cols-2 gap-2">
              <label class="block text-[10px] font-mono text-slate-400">Item Size (Table 43)
                <select onchange="craftingUiState.uncommonSizeIdx=Number(this.value)||0; renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100">
                  ${MUNDANE_SIZE_TABLE.map((r, idx) => `<option value="${idx}" ${craftingUiState.uncommonSizeIdx === idx ? 'selected' : ''}>${r.label} — ${r.junk} Junk • ${r.hours}h</option>`).join('')}
                </select>
              </label>
              <label class="block text-[10px] font-mono text-slate-400">Crafting Skill
                <select onchange="craftingUiState.uncommonSkill=this.value; renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100">
                  <option value="Fabricate" ${craftingUiState.uncommonSkill === 'Fabricate' ? 'selected' : ''}>Fabricate (No moving parts)</option>
                  <option value="Engineering" ${craftingUiState.uncommonSkill === 'Engineering' ? 'selected' : ''}>Engineering (Moving parts)</option>
                </select>
              </label>
            </div>
            <input type="text" value="${escapeHtmlAttr(craftingUiState.uncommonItemName)}" oninput="craftingUiState.uncommonItemName=this.value" placeholder="Uncommon item name..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100" />
            <input type="text" value="${escapeHtmlAttr(craftingUiState.uncommonItemNotes)}" oninput="craftingUiState.uncommonItemNotes=this.value" placeholder="Notes / dimensions / material..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" />
            <div class="bg-dungeon-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-slate-300 flex justify-between">
              <span>Cost: <b class="text-amber-300">${szRow.junk} Misc. Junk</b> • Time: <b class="text-cyan-300">${szRow.hours}h</b></span>
              <span>Est. DC: <b class="text-emerald-300">${dc}</b></span>
            </div>
            <button type="button" ${junkHave < szRow.junk ? 'disabled' : ''} onclick="executeMundaneUncommonCraft()" class="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs disabled:opacity-40 transition">
              🛠️ Roll ${craftingUiState.uncommonSkill} Check (${szRow.junk} Junk • ${szRow.hours}h)
            </button>
          </div>
        `}
      </div>
    `;
  } else if (mode === 'magic') {
    const bonus = Math.max(1, Math.min(10, Number(craftingUiState.magicBonus) || 1));
    const dc = calcEnchantingDc(craftingUiState.magicCategory, bonus);
    const tblTier = getEffectiveTableTierForCrawler(tok, craftingUiState.magicTableType);
    const catObj = ENCHANT_CATEGORIES.find(c => c.id === craftingUiState.magicCategory) || ENCHANT_CATEGORIES[2];

    modeBody = `
      <div class="bg-dungeon-950 border border-purple-500/40 rounded-xl p-3 space-y-2.5 text-[11px]">
        ${floorNum < 4 ? `<div class="bg-amber-950/50 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-amber-200">Note: Book rules unlock Magic Item Enchanting on <b>Floor 4+</b> (currently Floor ${floorNum}); GM override allowed.</div>` : ''}
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-mono text-slate-400">Enchantment Category
            <select onchange="craftingUiState.magicCategory=this.value; renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100">
              ${ENCHANT_CATEGORIES.map(c => `<option value="${c.id}" ${craftingUiState.magicCategory === c.id ? 'selected' : ''}>${c.label} (${c.formulaText})</option>`).join('')}
            </select>
          </label>
          <label class="block text-[10px] font-mono text-slate-400">Bonus Level (+1 to +10)
            <input type="number" min="1" max="10" value="${bonus}" onchange="craftingUiState.magicBonus=Math.max(1,Math.min(10,Number(this.value)||1)); craftingUiState.magicHours=craftingUiState.magicBonus; renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-xs text-amber-300 font-bold" />
          </label>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-mono text-slate-400">Crafting Skill
            <input type="text" value="${escapeHtmlAttr(craftingUiState.magicSkill)}" oninput="craftingUiState.magicSkill=this.value" placeholder="Smithing, Arcane, Alchemy..." class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100" />
          </label>
          <label class="block text-[10px] font-mono text-slate-400">Crafting Table (Tier +${tblTier})
            <select onchange="craftingUiState.magicTableType=this.value; renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100">
              ${CRAFTING_TABLE_TYPES.map(tt => `<option value="${tt.id}" ${craftingUiState.magicTableType === tt.id ? 'selected' : ''}>${tt.label} (${tt.creates})</option>`).join('')}
            </select>
          </label>
        </div>
        <input type="text" value="${escapeHtmlAttr(craftingUiState.magicItemName)}" oninput="craftingUiState.magicItemName=this.value" placeholder="Target Item Name (matches existing inventory item to add enchant, or creates new)..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100" />
        <input type="text" value="${escapeHtmlAttr(craftingUiState.magicEffectSummary)}" oninput="craftingUiState.magicEffectSummary=this.value" placeholder="Enchantment benefit (e.g. +3 Str, AS: Burned, +2 DR)..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" />
        <div class="bg-dungeon-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-slate-300 flex justify-between">
          <span>DC: <b class="text-rose-300">${dc}</b> (${catObj.formulaText})</span>
          <span>Table Bonus: <b class="text-cyan-300">+${tblTier}</b> • Time: <b class="text-amber-300">${bonus}h</b></span>
        </div>
        <button type="button" onclick="executeMagicEnchantCraft()" class="w-full py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-extrabold text-xs shadow transition">
          ✨ Roll Enchanting Check (DC ${dc})
        </button>
      </div>
    `;
  } else if (mode === 'concoction') {
    const aim = Math.max(1, Number(craftingUiState.concoctionAimBonus) || 2);
    modeBody = `
      <div class="bg-dungeon-950 border border-emerald-500/40 rounded-xl p-3 space-y-2.5 text-[11px]">
        <div class="text-[10px] font-mono text-emerald-300 font-bold uppercase">🧪 Alchemy Concoction (Table 48 • 1 Min per Aimed Bonus)</div>
        <p class="text-[10.5px] text-slate-400">Max <b>2 Stat potions</b> & <b>2 Skill potions</b> per crawler lifetime. Mixing takes <b>1 min per desired bonus level</b>; aiming above combined potion bonus requires Amazing Success or Critical Hit.</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-mono text-slate-400">Aimed Bonus Level (${aim} min)
            <input type="number" min="1" max="15" value="${aim}" onchange="craftingUiState.concoctionAimBonus=Math.max(1,Number(this.value)||1); renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-xs text-amber-300 font-bold" />
          </label>
          <label class="block text-[10px] font-mono text-slate-400">Roll Outcome (Table 48)
            <select onchange="craftingUiState.concoctionOutcome=this.value; renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100">
              <option value="standard" ${craftingUiState.concoctionOutcome === 'standard' ? 'selected' : ''}>Standard Success (Minor blend)</option>
              <option value="amazing" ${craftingUiState.concoctionOutcome === 'amazing' ? 'selected' : ''}>Amazing Success (Full/bitchin' blend)</option>
              <option value="crit" ${craftingUiState.concoctionOutcome === 'crit' ? 'selected' : ''}>Critical Hit (Unique + 1g/use royalty)</option>
              <option value="fail" ${craftingUiState.concoctionOutcome === 'fail' ? 'selected' : ''}>Near Miss / Fail (Ruined, no salvage)</option>
              <option value="critfail" ${craftingUiState.concoctionOutcome === 'critfail' ? 'selected' : ''}>Critical Fail (${aim}d6 Acid blowup!)</option>
            </select>
          </label>
        </div>
        <input type="text" value="${escapeHtmlAttr(craftingUiState.concoctionName)}" oninput="craftingUiState.concoctionName=this.value" placeholder="Concoction Name (e.g. Mordecai's Special Brew)..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100" />
        <button type="button" onclick="executeConcoctionOrInfusion('concoction')" class="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition">
          🧪 Resolve Concoction (${aim} min)
        </button>
      </div>
    `;
  } else if (mode === 'infusion') {
    const bonus = Math.max(1, Number(craftingUiState.infusionBonus) || 2);
    const dc = 10 + bonus;
    modeBody = `
      <div class="bg-dungeon-950 border border-cyan-500/40 rounded-xl p-3 space-y-2.5 text-[11px]">
        <div class="text-[10px] font-mono text-cyan-300 font-bold uppercase">💧 Potion Infusion onto Consumable (Advantage • In Minutes)</div>
        <p class="text-[10.5px] text-slate-400">Dunk a consumable into a prepared potion (Alchemy Table or Tier-3+ Sapper's Infusion Station). Rolls with <b>Advantage</b>; takes <b>1 min per bonus level</b> (DC 10 + Bonus).</p>
        <div class="grid grid-cols-2 gap-2">
          <label class="block text-[10px] font-mono text-slate-400">Potion Bonus Level (${bonus} min • DC ${dc})
            <input type="number" min="1" max="15" value="${bonus}" onchange="craftingUiState.infusionBonus=Math.max(1,Number(this.value)||1); renderCraftingModal()" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-xs text-cyan-300 font-bold" />
          </label>
          <input type="text" value="${escapeHtmlAttr(craftingUiState.infusionItemName)}" oninput="craftingUiState.infusionItemName=this.value" placeholder="Consumable target (e.g. Smoke Curtain)..." class="mt-4 bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100" />
        </div>
        <input type="text" value="${escapeHtmlAttr(craftingUiState.infusionEffectSummary)}" oninput="craftingUiState.infusionEffectSummary=this.value" placeholder="Infused effect (e.g. +Invisibility / +2 DR)..." class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200" />
        <button type="button" onclick="executeConcoctionOrInfusion('infusion')" class="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs transition">
          💧 Roll Infusion Check at Advantage (DC ${dc})
        </button>
      </div>
    `;
  } else if (mode === 'pets') {
    modeBody = typeof renderPetsMountsMinionsHtml === 'function' ? renderPetsMountsMinionsHtml(tok) : '';
  } else {
    // Tables Tab (Table 44)
    const tables = getCrawlerCraftingTables(tok);
    modeBody = `
      <div class="bg-dungeon-950 border border-amber-500/40 rounded-xl p-3 space-y-2 text-[11px]">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-mono text-amber-300 font-bold uppercase">🪑 Personal Space Crafting Tables (Tier 1–10)</span>
          <span class="text-[9.5px] font-mono text-slate-400">Tier 1 = 25,000g • Upgrade = 250,000g or Coupon</span>
        </div>
        <div class="space-y-1.5 max-h-64 overflow-y-auto">
          ${CRAFTING_TABLE_TYPES.map(tt => {
            const baseTier = Number(tables[tt.id]) || 0;
            const effTier = getEffectiveTableTierForCrawler(tok, tt.id);
            return `
              <div class="bg-dungeon-900 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-bold text-xs text-slate-100">${escapeHtmlAttr(tt.label)} <span class="text-[9.5px] font-mono text-cyan-300">${baseTier > 0 ? `(Eff +${effTier})` : '(None)'}</span></div>
                  <div class="text-[9.5px] text-slate-400 truncate">${escapeHtmlAttr(tt.creates)}</div>
                </div>
                ${!IS_PLAYER_WINDOW ? `
                  <div class="flex items-center gap-1 font-mono text-[10px] shrink-0">
                    <button type="button" onclick="setCrawlerCraftingTableTier('${tt.id}', ${baseTier - 1})" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700">-</button>
                    <span class="w-10 text-center font-bold text-amber-300">T${baseTier}</span>
                    <button type="button" onclick="setCrawlerCraftingTableTier('${tt.id}', ${baseTier + 1})" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700">+</button>
                  </div>
                ` : `<span class="font-mono text-[10px] text-amber-300 font-bold">Tier ${baseTier}</span>`}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const clockToggleHtml = !IS_PLAYER_WINDOW ? `
    <label class="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 cursor-pointer">
      <input type="checkbox" ${craftingUiState.deductClock ? 'checked' : ''} onchange="craftingUiState.deductClock=this.checked" class="accent-rose-400" />
      <span>Deduct craft time from Collapse Clock</span>
    </label>
  ` : '';

  const resHtml = craftingUiState.lastResult ? `
    <div class="bg-dungeon-950 border ${craftingUiState.lastResult.success ? 'border-emerald-500/60' : 'border-rose-500/60'} rounded-xl p-2.5 space-y-1">
      <div class="font-bold text-xs ${craftingUiState.lastResult.success ? 'text-emerald-300' : 'text-rose-300'}">${escapeHtmlAttr(craftingUiState.lastResult.title)}</div>
      <p class="text-[11px] font-mono text-slate-200 leading-snug">${escapeHtmlAttr(craftingUiState.lastResult.detail)}</p>
    </div>
  ` : '';

  body.innerHTML = topBanner + modeBody + clockToggleHtml + resHtml;
}
