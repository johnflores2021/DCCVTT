// =========================================================================
// LOOT ENGINE: MONSTER LOOTING + GM-ONLY LOOT BOX GENERATOR (DCC CH. 4)
// =========================================================================

const LOOT_BOX_TIERS = {
  bronze: {
    id: 'bronze',
    label: 'Bronze',
    icon: '🟫',
    badgeCls: 'bg-amber-900/50 border-amber-700/70 text-amber-300',
    accentHex: '#b45309',
    magicRolls: 0,
    goldFormula: '1d10',
    rollGold: () => rollNdM(1, 10),
    xSkill: '+1',
    xStat: '+1',
    consumables: [
      { name: 'Healing Potion', icon: '❤️', category: 'Consumable', qty: 1, notes: 'Heals 5 Health Bar slots.' },
      { name: 'Mana Potion', icon: '💧', category: 'Consumable', qty: 1, notes: 'Full Mana restore.' },
      { name: 'Bandages', icon: '🩹', category: 'Consumable', qtyRoll: [1, 6], notes: 'Spend an Action to remove the Blood Trail Debuff.' },
      { name: 'Torches', icon: '🔥', category: 'Utility', qty: 10, notes: '20ft bright light + 20ft dim light (~1 hr each).' },
      { name: 'Stick of Basic Dynamite', icon: '🧨', category: 'Explosive', qty: 1, notes: '1d6 Bludgeoning, 0ft Blast + 5ft Splash.' },
      { name: 'Rope (50 feet)', icon: '🪢', category: 'Utility', qty: 1, notes: '50ft adventuring rope.' },
      { name: 'Spell Scroll (Weak Spell)', icon: '📜', category: 'Consumable', qty: 1, notes: 'One-shot, no Mana casting.' },
      { name: 'Magic Tome (Weak Spell)', icon: '📘', category: 'Utility', qty: 1, notes: 'Learn a new, weak Spell.' },
      { name: 'Random Armor Piece (+1 DR)', icon: '🛡️', category: 'Gear', qty: 1, notes: '+1 Damage Resistance.' },
      { name: 'Canoe & Paddle (Staff)', icon: '🛶', category: 'Utility', qty: 1, notes: 'Mundane watercraft; paddle doubles as Staff.' },
      { name: 'Bicycle', icon: '🚲', category: 'Utility', qty: 1, notes: 'Mundane wheeled transport.' },
      { name: 'Hang Glider', icon: '🪂', category: 'Utility', qty: 1, notes: 'Mundane aerial glider.' }
    ],
    sampleGear: []
  },
  silver: {
    id: 'silver',
    label: 'Silver',
    icon: '⬜',
    badgeCls: 'bg-slate-700/60 border-slate-400/70 text-slate-100',
    accentHex: '#cbd5e1',
    magicRolls: 1,
    goldFormula: '1d10 × 100',
    rollGold: () => rollNdM(1, 10) * 100,
    xSkill: '+1',
    xStat: '+2',
    consumables: [
      { name: 'Good Healing Potion', icon: '❤️', category: 'Consumable', qty: 1, notes: 'Heals 6 Health Bar slots.' },
      { name: 'Heal Pet Potion', icon: '🐾', category: 'Consumable', qty: 1, notes: 'Heals pet 5 Health Bar slots.' },
      { name: 'Poison Antidote', icon: '🧪', category: 'Consumable', qty: 2, notes: 'Cures Poisoned debuff.' },
      { name: 'Crawler Biscuits', icon: '🍪', category: 'Consumable', qty: 100, notes: 'Rations to stave off hunger.' },
      { name: 'Stick of Good Goblin Dynamite', icon: '🧨', category: 'Explosive', qty: 1, notes: '2d6 Bludgeoning, 5ft Blast + 5ft Splash.' },
      { name: 'Potion of +1 Skill (Permanent)', icon: '⚗️', category: 'Consumable', qty: 1, notes: 'Permanently gain +1 Rank in a Skill.' },
      { name: 'Spell Scroll', icon: '📜', category: 'Consumable', qty: 1, notes: 'One-shot, no Mana casting.' },
      { name: 'Spellbook', icon: '📕', category: 'Utility', qty: 1, notes: 'Learn a new Spell.' },
      { name: 'Magic Paper', icon: '📄', category: 'Utility', qty: 1, notes: 'Rare material for Scroll-writing.' },
      { name: 'Silver Ring of +2 Stat', icon: '💍', category: 'Gear', qty: 1, notes: 'Accessory Slot: +2 to a Stat.' }
    ],
    sampleGear: [
      { name: 'Bitch-Ass Buckler', icon: '🛡️', category: 'Gear', qty: 1, notes: 'Hands/Holding • +1 Shield Block Skill, +3 DR.' },
      { name: 'Bernie Boots', icon: '🥾', category: 'Gear', qty: 1, notes: 'Feet • While Dying, can still Move and read HUD movement messages.' },
      { name: 'Big Purple Plume', icon: '🪶', category: 'Gear', qty: 1, notes: 'Accessory • +2 Charisma.' },
      { name: 'Friendship Bracelet of [Race]kind', icon: '📿', category: 'Gear', qty: 1, rollRace: true, notes: 'Accessory • Removes auto-hostility from chosen Race (if removed/broken, auto-hostile for rest of Floor).' }
    ]
  },
  gold: {
    id: 'gold',
    label: 'Gold',
    icon: '🟨',
    badgeCls: 'bg-amber-500/25 border-amber-400 text-amber-200',
    accentHex: '#f59e0b',
    magicRolls: 2,
    goldFormula: '1d6 × 1,000',
    rollGold: () => rollNdM(1, 6) * 1000,
    xSkill: '+2',
    xStat: '+3',
    consumables: [
      { name: 'Gold Standard Healing Potion', icon: '❤️', category: 'Consumable', qty: 1, notes: 'Heals 7 Health Bar slots and mends 1 Minor Injury.' },
      { name: 'Potion of +2 Skill (Permanent)', icon: '⚗️', category: 'Consumable', qty: 1, notes: 'Permanently gain +2 Ranks in a Skill.' },
      { name: 'Scroll of Upgrade', icon: '✨', category: 'Consumable', qty: 1, notes: 'Upgrades a crawler’s signature weapon.' },
      { name: 'Spellbook', icon: '📕', category: 'Utility', qty: 1, notes: 'Learn a new Spell.' },
      { name: 'Spell Scroll', icon: '📜', category: 'Consumable', qty: 1, notes: 'One-shot, no Mana casting.' },
      { name: 'Magic Paper', icon: '📄', category: 'Utility', qty: 2, notes: 'Rare material for Scroll-writing.' },
      { name: 'Crafting Table Voucher', icon: '🛠️', category: 'Quest / Misc', qty: 1, notes: 'Crafting, Sapper, Engineer, Alchemy, or Metal Working Table for Personal Space.' },
      { name: 'Golden Ring of +3 Stat', icon: '💍', category: 'Gear', qty: 1, notes: 'Accessory Slot: +3 to a Stat.' }
    ],
    sampleGear: [
      { name: 'Enchanted Elbow Pads of the Elbow Walking Turkeys', icon: '🦺', category: 'Gear', qty: 1, notes: 'Arms • +2 DR, +2 Dexterity.' },
      { name: 'Skullcap of Sucking', icon: '🧢', category: 'Gear', qty: 1, notes: 'Head • +1 DR; each time you roll a Critical Fail, gain 1 AI Favor.' },
      { name: 'Tough Guy Tattoo', icon: '🐉', category: 'Gear', qty: 1, notes: 'Accessory • +3 Constitution; add 10 to your 100% Health Bar slot.' }
    ]
  },
  platinum: {
    id: 'platinum',
    label: 'Platinum',
    icon: '💎',
    badgeCls: 'bg-cyan-500/20 border-cyan-300 text-cyan-200',
    accentHex: '#22d3ee',
    magicRolls: 3,
    goldFormula: '2d6 × 1,000',
    rollGold: () => rollNdM(2, 6) * 1000,
    xSkill: '+3',
    xStat: '+5%',
    consumables: [
      { name: 'Supreme Healing Potion', icon: '❤️', category: 'Consumable', qty: 1, notes: 'Heals 8 Health Bar slots & mends Minor/Major Injury; or 8d8 Holy to Undead.' },
      { name: 'Good Mana Refill Potion', icon: '💧', category: 'Consumable', qty: 1, notes: 'Restores 15 Mana per round for 10 rounds.' },
      { name: 'Potion of +3 Skill (Permanent)', icon: '⚗️', category: 'Consumable', qty: 1, notes: 'Permanently gain +3 Ranks in a Skill.' },
      { name: 'Scroll of Upgrade', icon: '✨', category: 'Consumable', qty: 1, notes: 'Upgrades a crawler’s signature weapon.' },
      { name: 'Personal Space Coupon', icon: '🎟️', category: 'Quest / Misc', qty: 1, notes: 'Exchange with Bopcas to expand rooms in Personal Space.' },
      { name: 'Crafting Table Upgrade Coupon', icon: '🛠️', category: 'Quest / Misc', qty: 1, notes: 'Upgrades a Personal Space crafting table.' },
      { name: 'Spellbook', icon: '📕', category: 'Utility', qty: 1, notes: 'Learn a new Spell.' },
      { name: 'Spell Scroll', icon: '📜', category: 'Consumable', qty: 1, notes: 'One-shot, no Mana casting.' }
    ],
    sampleGear: [
      { name: 'Selfie Stick of the Self-Mutilator', icon: '🤳', category: 'Weapon', qty: 1, notes: 'Hand/Holding • -1 Health Bar slot. Enter combat with Minor/Major Injury → +1/+2 Popularity & extra Actions/round.' },
      { name: 'Chesty Cheese Grater', icon: '🦺', category: 'Gear', qty: 1, notes: 'Torso • +2 DR, +5% Con, Damage Reflection 3:1 vs melee.' },
      { name: 'Enchanted Leggings of Insanity', icon: '👖', category: 'Gear', qty: 1, notes: 'Legs • +1 DR, +3 Escape Artist; fit lower body into any sized opening.' },
      { name: 'Medicine or Lube? Scratcher', icon: '🎫', category: 'Consumable', qty: 1, notes: 'Action (30m CD): 1d2 → 1: Staggered (20ft); 2: Level 15 Heal Other.' },
      { name: 'Nebular Roulette Scratcher', icon: '🎫', category: 'Consumable', qty: 1, notes: 'Action (30m CD): 1d6 → 1: you take 2d12+F Electric; 2-6: target takes 2d12+F Electric.' }
    ]
  },
  legendary: {
    id: 'legendary',
    label: 'Legendary',
    icon: '🟧',
    badgeCls: 'bg-orange-500/25 border-orange-400 text-orange-200',
    accentHex: '#f97316',
    magicRolls: 4,
    goldFormula: '1d10 × 10,000',
    rollGold: () => rollNdM(1, 10) * 10000,
    xSkill: '+5',
    xStat: '+10%',
    consumables: [
      { name: 'Heal Severe Injury Potion', icon: '❤️', category: 'Consumable', qty: 1, notes: 'Heals 9 Health Bar slots and mends ALL Injuries.' },
      { name: 'Potion of +5 Skill (Permanent)', icon: '⚗️', category: 'Consumable', qty: 1, notes: 'Permanently gain +5 Ranks in a Skill.' },
      { name: 'Rare Spellbook', icon: '📕', category: 'Utility', qty: 1, notes: 'Learn a rare new Spell.' },
      { name: 'Rare Spell Scroll', icon: '📜', category: 'Consumable', qty: 1, notes: 'One-shot rare Spell, no Mana.' },
      { name: 'Crafting Table Upgrade Coupon', icon: '🛠️', category: 'Quest / Misc', qty: 1, notes: 'Upgrades a Personal Space crafting table.' }
    ],
    sampleGear: [
      { name: 'Enchanted Cloak of the Slippery Perv', icon: '🧥', category: 'Gear', qty: 1, notes: 'Accessory • +6 Charisma; +3 Evade Buff when accusing attacker creatively.' },
      { name: 'Enchanted Wand of Incontinence', icon: '🪄', category: 'Weapon', qty: 1, notes: 'Hand/Holding • +10% Con; 1/session Action (30ft) inflicts Fatigued + bowel void.' },
      { name: 'Hand Grips of Hella Holding', icon: '🧤', category: 'Gear', qty: 1, notes: 'Hands/Holding • +10% Strength, +3 DR; unbreakable grip until you let go.' }
    ]
  },
  celestial: {
    id: 'celestial',
    label: 'Celestial',
    icon: '🌟',
    badgeCls: 'bg-fuchsia-500/25 border-fuchsia-300 text-fuchsia-200',
    accentHex: '#e879f9',
    magicRolls: 5,
    goldFormula: '0 (No Gold)',
    rollGold: () => 0,
    xSkill: '+6',
    xStat: '+20%',
    consumables: [
      { name: 'Potion of Max Skill (Rank 15)', icon: '🌟', category: 'Consumable', qty: 1, notes: 'Permanently maxes a Skill to Rank 15.' },
      { name: 'Rare Spellbook', icon: '📕', category: 'Utility', qty: 1, notes: 'Learn a rare new Spell.' },
      { name: 'Rare Spell Scroll', icon: '📜', category: 'Consumable', qty: 1, notes: 'One-shot rare Spell, no Mana.' },
      { name: 'Stat Rewrite Elixir', icon: '⚗️', category: 'Consumable', qty: 1, notes: 'Rewrites core Stat distribution (GM approved).' }
    ],
    sampleGear: [
      { name: 'Borant Corporation Reset Button', icon: '🔴', category: 'Gear', qty: 1, notes: 'Accessory • 1/Floor: restart current scene (up to 10 min, or Round 1 of combat).' },
      { name: 'Beret of Divine Intervention', icon: '👒', category: 'Gear', qty: 1, notes: 'Head • Max 1 Skill to Rank 15; ×2 rewards near a deity (×3 near your own deity).' },
      { name: 'The Sassy Stiletto', icon: '🗡️', category: 'Weapon', qty: 1, notes: 'Hand/Holding • +5 all Stats, Dagger R15, Crit on Nat 16–20, free Perception R10 Look for Clues.' }
    ]
  }
};

const DCC_MAGIC_NAME_ADJECTIVES = [
  'Psychotic', 'Slippery', 'Moist', 'Screaming', 'Caffeinated', 'Feral',
  'Unhinged', 'Questionable', 'Bitch-Ass', 'Luminous', 'Cursed', 'Turbo'
];
const DCC_MAGIC_NAME_CREATURES = [
  'Bugaboo', 'Goblin', 'Bopca', 'Llama', 'Kua-Tin', 'Murder-Dozer',
  'Turkey', 'Mimic', 'Shamanka', 'Warlord', 'Rat-King', 'Dungeon AI'
];
const DCC_MAGIC_WEAPONS_ITEMS = ['Crowbar', 'Dagger', 'Club', 'Crossbow', 'Gauntlet', 'Staff', 'Machete', 'Wrench'];
const DCC_MAGIC_CLOTHING = ['Boots', 'Jacket', 'Elbow Pads', 'Leggings', 'Skullcap', 'Trenchcoat', 'Boxers', 'Gloves'];
const DCC_MAGIC_ACCESSORIES = ['Ring', 'Bracelet', 'Tattoo', 'Patch', 'Belt', 'Amulet', 'Collar', 'Pin'];
const DCC_UNCOMMON_DMG_TYPES = ['Fire', 'Ice', 'Electric', 'Necrotic', 'Acid', 'Sonic', 'Psychic', 'Poison', 'Holy'];
const DCC_TABLE_42_UNIQUE = [
  'GM’s Choice',
  'Interacts with a God',
  'The Item is Intelligent',
  'Summons Minions to Fight for You',
  'Mimics Something from the Encounter Where Box Was Earned',
  'Player’s Choice (with GM Approval)'
];

let gmLootGenState = {
  tier: 'silver',
  targetCrawlerId: '',
  magicMode: 'random', // 'random' | 'sample'
  draftBox: null
};

function rollNdM(count, sides) {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += Math.floor(Math.random() * sides) + 1;
  return sum;
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// =========================================================================
// RANDOMIZED MAGIC ITEM GENERATOR (TABLES 38–42)
// =========================================================================

// =========================================================================
// STRUCTURED UNIQUE FEATURES ON ITEMS (LOOT BOXES, CRAFTING & INSPECTOR)
// =========================================================================
const DCC_UNIQUE_FEATURE_PRESETS = [
  {
    id: 'uf_deity_bond',
    label: '⛪ Interacts with a God / Deity',
    kind: 'deity_bond',
    summary: 'Divine favor or wrath triggers near deities or altars.',
    mechanicalNote: 'GM triggers divine reaction or bonus near altars/deities.'
  },
  {
    id: 'uf_intelligent',
    label: '🧠 Intelligent Item',
    kind: 'intelligent',
    summary: 'Possesses personality, opinions, or independent will.',
    mechanicalNote: 'May speak/protest or act on its own (GM/Int check).'
  },
  {
    id: 'uf_summon_minions',
    label: '💀 Summons Minions',
    kind: 'summon_minions',
    summary: 'Can summon subservient minions or animated helpers.',
    mechanicalNote: 'Spawns minions that follow commands until dismissed/duration ends.'
  },
  {
    id: 'uf_encounter_mimic',
    label: '🎭 Mimics Encounter Feature',
    kind: 'encounter_mimic',
    summary: 'Echoes a trait, hazard, or creature from where it was earned.',
    mechanicalNote: 'Mirrors an ability/theme from the floor or encounter.'
  },
  {
    id: 'uf_custom',
    label: '✨ Custom Unique Feature',
    kind: 'custom',
    summary: 'Bespoke narrative or mechanical quirk.',
    mechanicalNote: 'Custom GM/player-defined unique feature.'
  }
];

function ensureItemUniqueFeatures(item) {
  if (!item || typeof item !== 'object') return [];
  if (!Array.isArray(item.uniqueFeatures)) {
    item.uniqueFeatures = [];
  }
  return item.uniqueFeatures;
}

function attachUniqueFeatureToItem(item, featureObj) {
  if (!item || !featureObj) return [];
  const list = ensureItemUniqueFeatures(item);
  const entry = {
    id: featureObj.id || ('uf_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
    label: String(featureObj.label || 'Unique Feature').trim(),
    kind: String(featureObj.kind || 'custom').trim(),
    summary: String(featureObj.summary || '').trim(),
    mechanicalNote: String(featureObj.mechanicalNote || '').trim(),
    source: String(featureObj.source || 'Loot Box').trim()
  };
  list.push(entry);

  // Keep human-readable notes in sync for inventory cards & tooltips
  const tagLine = `Unique [${entry.label}]: ${entry.summary || entry.mechanicalNote}`;
  const curNotes = String(item.notes || '').trim();
  if (!curNotes.includes(entry.label)) {
    item.notes = curNotes ? `${curNotes} | ${tagLine}` : tagLine;
  }
  return list;
}

function addUniqueFeatureToDraftBoxItem(itemId, presetId, customSummary = '') {
  if (!gmLootGenState.draftBox) return;
  const item = (gmLootGenState.draftBox.items || []).find(i => i.id === itemId);
  if (!item) return;
  const preset = DCC_UNIQUE_FEATURE_PRESETS.find(p => p.id === presetId) || DCC_UNIQUE_FEATURE_PRESETS[4];
  const summary = String(customSummary || '').trim() || preset.summary;
  attachUniqueFeatureToItem(item, {
    label: preset.label,
    kind: preset.kind,
    summary,
    mechanicalNote: preset.mechanicalNote,
    source: `${gmLootGenState.draftBox.title || 'Loot Box'}`
  });
  renderGmLootBoxModal();
}

function removeUniqueFeatureFromDraftBoxItem(itemId, featureId) {
  if (!gmLootGenState.draftBox) return;
  const item = (gmLootGenState.draftBox.items || []).find(i => i.id === itemId);
  if (!item || !Array.isArray(item.uniqueFeatures)) return;
  item.uniqueFeatures = item.uniqueFeatures.filter(f => f.id !== featureId);
  renderGmLootBoxModal();
}

function generateRandomMagicItemByTier(tierId) {
  const tier = LOOT_BOX_TIERS[tierId] || LOOT_BOX_TIERS.silver;
  const floorNum = Math.max(1, Number(appState?.floor) || 1);

  if (tier.magicRolls <= 0) {
    const itemBase = pickRandom([...DCC_MAGIC_WEAPONS_ITEMS, ...DCC_MAGIC_CLOTHING]);
    return {
      name: `Mundane ${itemBase}`,
      icon: '🧰',
      category: 'Gear',
      qty: 1,
      notes: 'Bronze Tier (0 magic rolls — mundane quality).'
    };
  }

  // Table 38: Item Type
  const t38 = rollNdM(1, 6);
  let tableType = 'weapon';
  let baseNoun = pickRandom(DCC_MAGIC_WEAPONS_ITEMS);
  let icon = '🗡️';
  let category = 'Weapon';
  if (t38 >= 3 && t38 <= 4) {
    tableType = 'clothing';
    baseNoun = pickRandom(DCC_MAGIC_CLOTHING);
    icon = '🦺';
    category = 'Gear';
  } else if (t38 >= 5) {
    tableType = 'accessory';
    baseNoun = pickRandom(DCC_MAGIC_ACCESSORIES);
    icon = '💍';
    category = 'Gear';
  }

  const statList = ['Str', 'Int', 'Con', 'Dex', 'Cha'];
  const allSkills = appState?.skills || [];
  const allSpells = appState?.spells || [];
  const allBuffs = appState?.buffs || [];
  const passiveSkills = allSkills.filter(s => /passive/i.test(s.tags || '') || s.effectType === 'passive');

  const effects = [];
  let hitUnique = false;

  for (let i = 0; i < tier.magicRolls; i++) {
    const r = rollNdM(1, 6);
    if (r === 6) {
      hitUnique = true;
      const remainingPower = tier.magicRolls - i;
      const uRoll = rollNdM(1, 6);
      const uText = DCC_TABLE_42_UNIQUE[uRoll - 1];
      const kindMap = ['custom', 'deity_bond', 'intelligent', 'summon_minions', 'encounter_mimic', 'custom'];
      effects.push(`🌟 Unique [T42 #${uRoll}${remainingPower > 1 ? `, ×${remainingPower} Power` : ''}]: ${uText}`);
      return {
        name: `${['gold', 'platinum', 'legendary'].includes(tier.id) ? 'Enchanted ' : ''}${baseNoun} of the ${pickRandom(DCC_MAGIC_NAME_ADJECTIVES)} ${pickRandom(DCC_MAGIC_NAME_CREATURES)}`,
        icon: '🌟',
        category,
        qty: 1,
        notes: `${tier.label} ${tableType === 'weapon' ? 'Hand/Holding' : tableType === 'clothing' ? 'Clothing' : 'Accessory'} • ${effects.join(' | ')}`,
        uniqueFeatures: [{
          id: 'uf_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          label: `🌟 T42 #${uRoll}: ${uText}`,
          kind: kindMap[uRoll - 1] || 'custom',
          summary: uText,
          mechanicalNote: remainingPower > 1 ? `Carries ×${remainingPower} remaining power rolls.` : 'Unique item feature.',
          source: `${tier.label} Loot Box (Table 42)`
        }]
      };
    }

    if (r === 1) {
      const stat = pickRandom(statList);
      const statVal = tier.id === 'platinum' ? '+5% (or +4)' : tier.xStat;
      effects.push(`${statVal} ${stat}`);
    } else if (r === 2) {
      const sk = pickRandom(allSkills);
      const skVal = tier.id === 'platinum' ? `+${rollNdM(1, 3) + 1}` : tier.xSkill;
      effects.push(`${skVal} ${sk ? sk.name : 'Random'} Skill`);
    } else if (r === 3) {
      const bf = pickRandom(allBuffs);
      effects.push(`Buff: ${bf ? bf.name : 'Special Combat Buff'}`);
    } else if (r === 4) {
      if (tableType === 'weapon') {
        const pSk = pickRandom(passiveSkills.length ? passiveSkills : allSkills);
        effects.push(`Passive Skill: ${pSk ? pSk.name : 'Passive'} (Rank ${floorNum})`);
      } else if (tableType === 'clothing') {
        effects.push(`Resistance to ${pickRandom(DCC_UNCOMMON_DMG_TYPES)} Damage`);
      } else {
        const ext = Math.random() < 0.5 ? 'Recovery (Full Health)' : 'Restore (Full Mana)';
        effects.push(`External Buff: ${ext} 1/Floor`);
      }
    } else if (r === 5) {
      if (tableType === 'clothing') {
        effects.push('+1 Damage Resistance');
      } else {
        const sp = pickRandom(allSpells);
        const spRank = parseInt(String(tier.xSkill).replace(/\D+/g, ''), 10) || 1;
        effects.push(`Inherent Spell: ${sp ? sp.name : 'Random Spell'} R${spRank} (0 MP, ${spRank * 2}h CD)`);
      }
    }
  }

  const useEnchantedPrefix = ['gold', 'platinum', 'legendary'].includes(tier.id);
  const adj = pickRandom(DCC_MAGIC_NAME_ADJECTIVES);
  const critter = pickRandom(DCC_MAGIC_NAME_CREATURES);
  const name = `${useEnchantedPrefix ? 'Enchanted ' : ''}${baseNoun} of the ${adj} ${critter}`;
  const slotHint = tableType === 'weapon' ? 'Hand/Holding' : tableType === 'clothing' ? 'Clothing' : 'Accessory';

  return {
    name,
    icon: hitUnique ? '🌟' : icon,
    category,
    qty: 1,
    notes: `${tier.label} ${slotHint} • ${effects.join(' | ')}`
  };
}

function generateDraftLootBox(tierId, magicMode = 'random') {
  const tier = LOOT_BOX_TIERS[tierId] || LOOT_BOX_TIERS.silver;
  const gold = tier.rollGold();
  const items = [];

  // 1. Magic Item (or Mundane for Bronze)
  if (tier.id !== 'bronze') {
    if (magicMode === 'sample' && tier.sampleGear.length > 0) {
      const sample = JSON.parse(JSON.stringify(pickRandom(tier.sampleGear)));
      if (sample.rollRace) {
        const r = rollNdM(1, 10);
        const race = r <= 2 ? 'Dwarven' : r <= 4 ? 'Elven' : r <= 6 ? 'Fairy' : r <= 8 ? 'Orc' : 'Skyfowl';
        sample.name = sample.name.replace('[Race]', race);
      }
      items.push({ id: 'lb_i_' + Date.now() + '_m', ...sample });
    } else {
      items.push({ id: 'lb_i_' + Date.now() + '_m', ...generateRandomMagicItemByTier(tier.id) });
    }
  }

  // 2. 1-2 Consumables / Adventuring items from tier pool
  const numExtras = tier.id === 'bronze' ? 2 : (Math.random() < 0.65 ? 2 : 1);
  const pool = [...tier.consumables];
  for (let i = 0; i < numExtras && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const picked = JSON.parse(JSON.stringify(pool.splice(idx, 1)[0]));
    if (Array.isArray(picked.qtyRoll)) {
      picked.qty = rollNdM(picked.qtyRoll[0], picked.qtyRoll[1]);
      delete picked.qtyRoll;
    }
    items.push({ id: `lb_i_${Date.now()}_${i}`, ...picked });
  }

  return {
    id: 'box_' + Date.now(),
    tier: tier.id,
    title: `${tier.label} Loot Box`,
    gold,
    items
  };
}

// =========================================================================
// MONSTER LOOTING (FLOOR GOLD + 1d6 MISC JUNK × BODIES)
// =========================================================================
function rollFloorMobGold(floorNum) {
  const f = Math.max(1, Number(floorNum) || 1);
  if (f <= 1) return { roll: 0, formula: 'Floor 1 (0 Gold)' };
  if (f === 2) return { roll: rollNdM(1, 6), formula: '1d6' };
  if (f === 3) return { roll: rollNdM(2, 4), formula: '2d4' };
  if (f === 4) return { roll: rollNdM(2, 6), formula: '2d6' };
  return { roll: rollNdM(2, 8), formula: '2d8' };
}

function getDeadUnlootedMobsInScene(scene) {
  if (!scene) return [];
  return (scene.tokens || []).filter(t => {
    if (t.role === 'crawler' || t.hiddenFromPlayers || t.looted) return false;
    const hm = getTokenHealthMetrics(t);
    return hm.curHp <= 0;
  });
}

function executeMobLootOnHost(crawlerId, mobId) {
  if (IS_PLAYER_WINDOW) return;
  const scene = getActiveScene();
  if (!scene) return;
  const crawler = (scene.tokens || []).find(t => t.id === crawlerId && t.role === 'crawler');
  if (!crawler) return;

  const targetMobs = mobId === '__ALL__'
    ? getDeadUnlootedMobsInScene(scene)
    : (scene.tokens || []).filter(t => t.id === mobId && t.role !== 'crawler' && !t.looted && getTokenHealthMetrics(t).curHp <= 0);

  if (targetMobs.length === 0) {
    showVttToast('No unlooted dead mobs available.');
    return;
  }

  const floorNum = Math.max(1, Number(appState?.floor) || 1);
  let totalBodies = 0;
  targetMobs.forEach(m => {
    totalBodies += Math.max(1, Number(m.swarmCount) || 1);
    m.looted = true;
    m.lootedBy = crawler.name;
  });

  // Rulebook: Roll once for Misc. Junk (1d6) and Gold (by Floor), then multiply by number of bodies
  const junkRoll = rollNdM(1, 6);
  const totalJunk = junkRoll * totalBodies;
  const goldRes = rollFloorMobGold(floorNum);
  const totalGold = goldRes.roll * totalBodies;

  crawler.gold = Math.max(0, Number(crawler.gold) || 0) + totalGold;
  crawler.inventory = Array.isArray(crawler.inventory) ? crawler.inventory : [];
  const existingJunk = crawler.inventory.find(i => String(i.name || '').trim().toLowerCase() === 'misc. junk');
  if (existingJunk) {
    existingJunk.qty = Math.min(99999, (Number(existingJunk.qty) || 0) + totalJunk);
  } else {
    crawler.inventory.push({
      id: 'inv_junk_' + Date.now(),
      name: 'Misc. Junk',
      icon: '🔩',
      category: 'Quest / Misc',
      qty: totalJunk,
      notes: 'Salvaged crafting scrap from defeated mobs.'
    });
  }

  const mobNames = targetMobs.map(m => m.name).join(', ');
  const bodyNote = totalBodies > 1 ? ` × ${totalBodies} bodies` : '';

  broadcastDiceRollEvent({
    title: `💰 ${crawler.iconSymbol || '⚔️'} ${crawler.name} Looted ${mobNames}`,
    subtitle: `Floor ${floorNum} Mob Loot${bodyNote}`,
    playerSubtitle: `Floor ${floorNum} Mob Loot${bodyNote}`,
    rolls: [{
      targetName: `${crawler.iconSymbol || '⚔️'} ${crawler.name}`,
      formulaText: `Misc. Junk: 1d6 (${junkRoll})${bodyNote} • Gold: ${goldRes.formula}${goldRes.roll > 0 ? ` (${goldRes.roll})${bodyNote}` : ''}`,
      playerFormulaText: `Misc. Junk: 1d6 (${junkRoll})${bodyNote} • Gold: ${goldRes.formula}${goldRes.roll > 0 ? ` (${goldRes.roll})${bodyNote}` : ''}`,
      resultLabel: `+${totalJunk} Junk${totalGold > 0 ? ` • +${totalGold}g` : ''}`,
      playerResultLabel: `+${totalJunk} Junk${totalGold > 0 ? ` • +${totalGold}g` : ''}`,
      hit: false
    }]
  });

  commitStateChange();
  showVttToast(`💰 ${crawler.name} looted +${totalJunk} Misc. Junk${totalGold > 0 ? ` & +${totalGold} Gold` : ''}!`);
}

function playerRequestLootMob(mobId) {
  const tok = getClaimedCrawlerToken();
  if (!tok) {
    showVttToast('🎭 Claim your Crawler first to loot mobs!');
    return;
  }
  sendPlayerLootMobToHost(tok.id, mobId);
  showVttToast('💰 Looting fallen mob...');
}

function executeOpenLootBoxOnHost(crawlerId, boxInvId) {
  if (IS_PLAYER_WINDOW) return;
  const scene = getActiveScene();
  const crawler = scene?.tokens.find(t => t.id === crawlerId && t.role === 'crawler');
  if (!crawler || !Array.isArray(crawler.inventory)) return;

  const boxIdx = crawler.inventory.findIndex(i => i.id === boxInvId && i.isLootBox && i.boxPayload);
  if (boxIdx === -1) return;
  const boxEntry = crawler.inventory[boxIdx];
  const payload = boxEntry.boxPayload;
  crawler.inventory.splice(boxIdx, 1);

  const goldAmt = Math.max(0, Number(payload.gold) || 0);
  if (goldAmt > 0) crawler.gold = Math.max(0, Number(crawler.gold) || 0) + goldAmt;

  const itemNames = [];
  (payload.items || []).forEach((it, idx) => {
    const cleanName = String(it.name || '').trim();
    if (!cleanName) return;
    const qty = Math.max(1, Number(it.qty) || 1);
    itemNames.push(`${qty > 1 ? `${qty}× ` : ''}${cleanName}`);
    const existing = crawler.inventory.find(x => !x.isLootBox && String(x.name || '').trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      existing.qty = Math.min(9999, (Number(existing.qty) || 1) + qty);
    } else {
      crawler.inventory.unshift({
        id: `inv_lb_${Date.now()}_${idx}`,
        name: cleanName,
        icon: it.icon || '🎁',
        category: it.category || 'Gear',
        qty,
        notes: String(it.notes || '').trim(),
        uniqueFeatures: itemUfs
      });
    }
  });

  broadcastDiceRollEvent({
    title: `🎁 ${crawler.iconSymbol || '⚔️'} ${crawler.name} Opened ${boxEntry.name}!`,
    subtitle: 'NEW LOOT UNPACKED INTO INVENTORY',
    playerSubtitle: 'NEW LOOT UNPACKED INTO INVENTORY',
    flareLevel: ['platinum', 'legendary', 'celestial'].includes(payload.tier) ? 'crit' : 'great',
    rolls: [{
      targetName: `${crawler.iconSymbol || '⚔️'} ${crawler.name}`,
      formulaText: itemNames.join(' • ') || 'Loot Box Contents',
      playerFormulaText: itemNames.join(' • ') || 'Loot Box Contents',
      resultLabel: goldAmt > 0 ? `+${goldAmt.toLocaleString()} GOLD` : 'UNPACKED!',
      playerResultLabel: goldAmt > 0 ? `+${goldAmt.toLocaleString()} GOLD` : 'UNPACKED!',
      hit: false
    }]
  });

  commitStateChange();
  showVttToast(`🎁 ${crawler.name} opened ${boxEntry.name}!`);
}

function playerOpenLootBox(boxInvId) {
  const tok = getClaimedCrawlerToken();
  if (!tok || !boxInvId) return;
  sendPlayerOpenLootBoxToHost(tok.id, boxInvId);
  showVttToast('🎁 Opening Loot Box...');
}

function adjustCrawlerGold(tokenId, delta) {
  if (IS_PLAYER_WINDOW) return;
  const tok = getActiveScene()?.tokens.find(t => t.id === tokenId && t.role === 'crawler');
  if (!tok) return;
  tok.gold = Math.max(0, (Number(tok.gold) || 0) + Number(delta || 0));
  commitStateChange();
}

// =========================================================================
// GM-ONLY LOOT BOX GENERATOR MODAL UI
// =========================================================================
function openGmLootBoxModal(preselectCrawlerId = '') {
  if (IS_PLAYER_WINDOW) return;
  const modal = document.getElementById('gmLootBoxModal');
  if (!modal) return;
  const crawlers = (getActiveScene()?.tokens || []).filter(t => t.role === 'crawler');
  if (preselectCrawlerId) {
    gmLootGenState.targetCrawlerId = preselectCrawlerId;
  } else if (!crawlers.some(c => c.id === gmLootGenState.targetCrawlerId)) {
    gmLootGenState.targetCrawlerId = crawlers[0]?.id || '';
  }
  if (!gmLootGenState.draftBox) {
    gmLootGenState.draftBox = generateDraftLootBox(gmLootGenState.tier, gmLootGenState.magicMode);
  }
  modal.classList.remove('hidden');
  renderGmLootBoxModal();
}

function closeGmLootBoxModal() {
  const modal = document.getElementById('gmLootBoxModal');
  if (modal) modal.classList.add('hidden');
}

function setGmLootBoxTier(tierId) {
  if (!LOOT_BOX_TIERS[tierId]) return;
  gmLootGenState.tier = tierId;
  gmLootGenState.draftBox = generateDraftLootBox(tierId, gmLootGenState.magicMode);
  renderGmLootBoxModal();
}

function setGmLootMagicMode(mode) {
  gmLootGenState.magicMode = mode === 'sample' ? 'sample' : 'random';
  gmLootGenState.draftBox = generateDraftLootBox(gmLootGenState.tier, gmLootGenState.magicMode);
  renderGmLootBoxModal();
}

function rerollGmDraftLootBox() {
  gmLootGenState.draftBox = generateDraftLootBox(gmLootGenState.tier, gmLootGenState.magicMode);
  renderGmLootBoxModal();
}

function removeItemFromDraftBox(itemId) {
  if (!gmLootGenState.draftBox) return;
  gmLootGenState.draftBox.items = (gmLootGenState.draftBox.items || []).filter(i => i.id !== itemId);
  renderGmLootBoxModal();
}

function addBossMapToDraftBox(mapKind) {
  if (!gmLootGenState.draftBox) return;
  const isField = mapKind === 'borough';
  gmLootGenState.draftBox.items.push({
    id: 'lb_map_' + Date.now(),
    name: isField ? 'Borough Field Guide' : 'Neighborhood Map',
    icon: isField ? '🧭' : '🗺️',
    category: 'Quest / Misc',
    qty: 1,
    notes: isField
      ? 'Outlines Borough quadrants & Mob level/type tooltips. Grinding 5+ hrs grants +2 hrs credit (7 hrs).'
      : 'Reveals Neighborhood minimap & Mob dots. Grinding 5+ hrs grants +1 hr credit (6 hrs).'
  });
  renderGmLootBoxModal();
}

function addCustomItemToDraftBox() {
  if (!gmLootGenState.draftBox) return;
  const nameEl = document.getElementById('gmLbCustomName');
  const noteEl = document.getElementById('gmLbCustomNote');
  const qtyEl = document.getElementById('gmLbCustomQty');
  const name = (nameEl?.value || '').trim();
  if (!name) return;
  gmLootGenState.draftBox.items.push({
    id: 'lb_cust_' + Date.now(),
    name,
    icon: '🎁',
    category: 'Gear',
    qty: Math.max(1, Number(qtyEl?.value) || 1),
    notes: (noteEl?.value || '').trim()
  });
  renderGmLootBoxModal();
}

function awardDraftLootBoxToCrawler(mode = 'sealed') {
  if (IS_PLAYER_WINDOW || !gmLootGenState.draftBox) return;
  const scene = getActiveScene();
  const crawler = (scene?.tokens || []).find(t => t.id === gmLootGenState.targetCrawlerId && t.role === 'crawler');
  if (!crawler) {
    showVttToast('⚠️ Select a Crawler on the map to receive this Loot Box!');
    return;
  }

  const box = gmLootGenState.draftBox;
  const tier = LOOT_BOX_TIERS[box.tier] || LOOT_BOX_TIERS.silver;
  crawler.inventory = Array.isArray(crawler.inventory) ? crawler.inventory : [];

  if (mode === 'sealed') {
    const sealedId = 'inv_box_' + Date.now();
    crawler.inventory.unshift({
      id: sealedId,
      name: box.title || `${tier.label} Loot Box`,
      icon: tier.icon || '🎁',
      category: 'Loot Box',
      qty: 1,
      isLootBox: true,
      boxTier: tier.id,
      boxPayload: JSON.parse(JSON.stringify(box)),
      notes: `Unopened ${tier.label} Loot Box (${box.items.length} items${box.gold > 0 ? `, ${box.gold.toLocaleString()}g` : ''}). Open in a saferoom!`
    });

    broadcastDiceRollEvent({
      title: `🎁 NEW ACHIEVEMENT! ${tier.label.toUpperCase()} LOOT BOX AWARDED`,
      subtitle: `Awarded to ${crawler.iconSymbol || '⚔️'} ${crawler.name}`,
      playerSubtitle: `Awarded to ${crawler.iconSymbol || '⚔️'} ${crawler.name}`,
      flareLevel: ['platinum', 'legendary', 'celestial'].includes(tier.id) ? 'crit' : 'great',
      rolls: [{
        targetName: `${crawler.iconSymbol || '⚔️'} ${crawler.name}`,
        formulaText: `${tier.icon} ${box.title} added to Inventory (Unopened)`,
        playerFormulaText: `${tier.icon} ${box.title} added to Inventory (Open in Saferoom!)`,
        resultLabel: `${tier.label.toUpperCase()} BOX`,
        playerResultLabel: `${tier.label.toUpperCase()} BOX`,
        hit: false
      }]
    });

    commitStateChange();
    showVttToast(`🎁 Awarded unopened ${box.title} to ${crawler.name}!`);
    closeGmLootBoxModal();
    return;
  }

  // Direct Award: unpack straight into crawler inventory + gold
  const goldAmt = Math.max(0, Number(box.gold) || 0);
  if (goldAmt > 0) crawler.gold = Math.max(0, Number(crawler.gold) || 0) + goldAmt;
  const itemNames = [];
  (box.items || []).forEach((it, idx) => {
    const cleanName = String(it.name || '').trim();
    if (!cleanName) return;
    const qty = Math.max(1, Number(it.qty) || 1);
    itemNames.push(`${qty > 1 ? `${qty}× ` : ''}${cleanName}`);
    const existing = crawler.inventory.find(x => !x.isLootBox && String(x.name || '').trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      existing.qty = Math.min(9999, (Number(existing.qty) || 1) + qty);
    } else {
      crawler.inventory.unshift({
        id: `inv_aw_${Date.now()}_${idx}`,
        name: cleanName,
        icon: it.icon || '🎁',
        category: it.category || 'Gear',
        qty,
        notes: String(it.notes || '').trim(),
        uniqueFeatures: itemUfs
      });
    }
  });

  broadcastDiceRollEvent({
    title: `🎁 ${tier.label.toUpperCase()} LOOT AWARDED TO ${crawler.name.toUpperCase()}!`,
    subtitle: `${box.title} Contents Added Directly`,
    playerSubtitle: `${box.title} Contents Added Directly`,
    flareLevel: ['platinum', 'legendary', 'celestial'].includes(tier.id) ? 'crit' : 'great',
    rolls: [{
      targetName: `${crawler.iconSymbol || '⚔️'} ${crawler.name}`,
      formulaText: itemNames.join(' • ') || 'Loot Awarded',
      playerFormulaText: itemNames.join(' • ') || 'Loot Awarded',
      resultLabel: goldAmt > 0 ? `+${goldAmt.toLocaleString()} GOLD` : 'AWARDED!',
      playerResultLabel: goldAmt > 0 ? `+${goldAmt.toLocaleString()} GOLD` : 'AWARDED!',
      hit: false
    }]
  });

  commitStateChange();
  showVttToast(`✨ Awarded ${box.title} contents directly to ${crawler.name}!`);
  closeGmLootBoxModal();
}

function renderGmLootBoxModal() {
  const body = document.getElementById('gmLootBoxModalBody');
  if (!body || IS_PLAYER_WINDOW) return;

  const crawlers = (getActiveScene()?.tokens || []).filter(t => t.role === 'crawler');
  const box = gmLootGenState.draftBox || generateDraftLootBox(gmLootGenState.tier, gmLootGenState.magicMode);
  gmLootGenState.draftBox = box;
  const tier = LOOT_BOX_TIERS[gmLootGenState.tier] || LOOT_BOX_TIERS.silver;
  const targetCrawler = crawlers.find(c => c.id === gmLootGenState.targetCrawlerId) || crawlers[0] || null;
  if (targetCrawler) gmLootGenState.targetCrawlerId = targetCrawler.id;

  body.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label class="block">
        <span class="text-[10px] font-mono uppercase text-cyan-400 font-bold">🎯 Award To Crawler</span>
        <select onchange="gmLootGenState.targetCrawlerId=this.value; renderGmLootBoxModal()" class="mt-1 w-full bg-dungeon-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100">
          ${crawlers.length === 0
            ? '<option value="">No Crawlers deployed on map</option>'
            : crawlers.map(c => `<option value="${c.id}" ${c.id === gmLootGenState.targetCrawlerId ? 'selected' : ''}>${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)} (Lvl ${c.level || 1} • ${(c.gold || 0).toLocaleString()}g)</option>`).join('')
          }
        </select>
      </label>
      <div class="space-y-1">
        <span class="text-[10px] font-mono uppercase text-amber-400 font-bold">✨ Magic Gear Mode</span>
        <div class="grid grid-cols-2 gap-1 pt-0.5">
          <button type="button" onclick="setGmLootMagicMode('random')" class="py-1.5 px-2 rounded-lg text-[10px] font-bold transition ${gmLootGenState.magicMode === 'random' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🎲 Tables 38–42</button>
          <button type="button" onclick="setGmLootMagicMode('sample')" class="py-1.5 px-2 rounded-lg text-[10px] font-bold transition ${gmLootGenState.magicMode === 'sample' ? 'bg-indigo-500 text-white' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">📖 Book Samples</button>
        </div>
      </div>
    </div>

    <div class="space-y-1">
      <div class="text-[10px] font-mono uppercase text-slate-400 font-bold">📦 Select Loot Box Tier</div>
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-1">
        ${Object.values(LOOT_BOX_TIERS).map(t => `
          <button type="button" onclick="setGmLootBoxTier('${t.id}')" class="py-1.5 px-1 rounded-xl border text-[10px] font-bold transition ${gmLootGenState.tier === t.id ? `${t.badgeCls} ring-2 ring-white/40` : 'bg-dungeon-950 border-slate-800 text-slate-400 hover:text-slate-200'}">
            ${t.icon} ${t.label}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div class="flex items-center gap-2 flex-1 min-w-[180px]">
          <span class="text-lg">${tier.icon}</span>
          <input type="text" value="${escapeHtmlAttr(box.title)}" onchange="gmLootGenState.draftBox.title=this.value" class="flex-1 bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-100" />
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono text-amber-300 font-bold">🪙 Gold:</span>
          <input type="number" min="0" value="${box.gold || 0}" onchange="gmLootGenState.draftBox.gold=Math.max(0, Number(this.value)||0)" class="w-24 bg-dungeon-900 border border-amber-500/40 rounded-lg px-2 py-1 font-mono text-xs text-amber-200 font-bold" />
          <button type="button" onclick="rerollGmDraftLootBox()" class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition">🎲 Reroll Box</button>
        </div>
      </div>

      <div class="text-[10px] font-mono text-slate-400 flex flex-wrap justify-between gap-1">
        <span>Gold Rule: <b class="text-amber-300">${tier.goldFormula}</b> • Magic Rolls: <b class="text-cyan-300">${tier.magicRolls}</b></span>
        <div class="flex gap-1.5">
          <button type="button" onclick="addBossMapToDraftBox('neighborhood')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold">+ 🗺️ Neighborhood Map</button>
          <button type="button" onclick="addBossMapToDraftBox('borough')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold">+ 🧭 Borough Guide</button>
        </div>
      </div>

      <div class="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
        ${(box.items || []).length === 0
          ? '<div class="text-xs text-slate-500 italic text-center py-3">No items in this box yet. Click 🎲 Reroll Box or add a custom item below.</div>'
          : box.items.map(it => `
            <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-bold text-xs text-slate-100">${it.icon || '🎁'} ${escapeHtmlAttr(it.name)} <span class="font-mono text-[10px] text-emerald-300">×${it.qty || 1}</span></div>
                ${it.notes ? `<div class="text-[10px] text-slate-300 leading-snug mt-0.5">${escapeHtmlAttr(it.notes)}</div>` : ''}
              </div>
              <button type="button" onclick="removeItemFromDraftBox('${it.id}')" class="text-rose-400 hover:text-rose-300 font-bold text-xs px-1 shrink-0">✕</button>
            ${Array.isArray(it.uniqueFeatures) && it.uniqueFeatures.length > 0 ? `
              <div class="w-full pt-1 border-t border-slate-800/80 flex flex-wrap gap-1">
                ${it.uniqueFeatures.map(uf => `
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200 text-[9px] font-mono">
                    ${escapeHtmlAttr(uf.label)}
                    <button type="button" onclick="removeUniqueFeatureFromDraftBoxItem('${it.id}', '${uf.id}')" class="text-rose-300 hover:text-white font-bold">×</button>
                  </span>
                `).join('')}
              </div>
            ` : ''}
            <div class="w-full pt-1 flex items-center gap-1 text-[9.5px] font-mono">
              <select id="ufPreset_${it.id}" class="bg-dungeon-950 border border-slate-700 rounded px-1.5 py-0.5 text-fuchsia-200">
                ${DCC_UNIQUE_FEATURE_PRESETS.map(p => `<option value="${p.id}">${escapeHtmlAttr(p.label)}</option>`).join('')}
              </select>
              <input id="ufCustom_${it.id}" type="text" placeholder="Unique quirk / effect..." class="flex-1 min-w-0 bg-dungeon-950 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200" />
              <button type="button" onclick="addUniqueFeatureToDraftBoxItem('${it.id}', document.getElementById('ufPreset_${it.id}')?.value, document.getElementById('ufCustom_${it.id}')?.value)" class="px-2 py-0.5 rounded bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold shrink-0">+ Unique</button>
            </div>
            </div>
          `).join('')
        }
      </div>

      <div class="flex gap-1.5 pt-2 border-t border-slate-800">
        <input id="gmLbCustomName" type="text" placeholder="Add custom item..." class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100" />
        <input id="gmLbCustomNote" type="text" placeholder="Stats / effect..." class="flex-1 min-w-0 bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200" />
        <input id="gmLbCustomQty" type="number" value="1" min="1" max="999" class="w-12 bg-dungeon-900 border border-slate-700 rounded-lg px-1 py-1 text-center font-mono text-[11px]" />
        <button type="button" onclick="addCustomItemToDraftBox()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] shrink-0">+ Add</button>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
      <button type="button" ${!targetCrawler ? 'disabled' : ''} onclick="awardDraftLootBoxToCrawler('sealed')" class="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow disabled:opacity-40 transition">
        🎁 Award Unopened Box${targetCrawler ? ` to ${escapeHtmlAttr(targetCrawler.name)}` : ''}
      </button>
      <button type="button" ${!targetCrawler ? 'disabled' : ''} onclick="awardDraftLootBoxToCrawler('direct')" class="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow disabled:opacity-40 transition">
        ✨ Award Contents Directly
      </button>
    </div>
  `;
}
