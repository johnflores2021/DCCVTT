// =========================================================================
// DCC FLOOR 1 CHARACTER CREATION WIZARD & RANDOM CRAWLER GENERATOR
// =========================================================================

const DCC_CHARGEN_DATA = {
  icons: [
    { v: '⚔️', l: '⚔️ Sword' }, { v: '💣', l: '💣 Bomb' }, { v: '🐱', l: '🐱 Cat' },
    { v: '🛡️', l: '🛡️ Shield' }, { v: '🏹', l: '🏹 Bow' }, { v: '🔮', l: '🔮 Magic' },
    { v: '🗡️', l: '🗡️ Dagger' }, { v: '🪓', l: '🪓 Axe' }, { v: '🥊', l: '🥊 Brawler' },
    { v: '🔥', l: '🔥 Fire' }, { v: '⚡', l: '⚡ Storm' }, { v: '🩺', l: '🩺 Medic' },
    { v: '🐾', l: '🐾 Beast' }, { v: '🦖', l: '🦖 Dino' }, { v: '👑', l: '👑 Crown' },
    { v: '💀', l: '💀 Skull' }, { v: '🎭', l: '🎭 Mask' }, { v: '🧙', l: '🧙 Wizard' }
  ],
  randomNames: [
    'Marcus Vance', 'Tessa Kowalski', 'Devon Briggs', 'Nadia Okafor', 'Eli Mercer',
    'Sloane Reyes', 'Caleb Thornton', 'Juno Park', 'Gideon Shaw', 'Mina Alvarez',
    'Rory Gallagher', 'Kira Novak', 'Hector Cruz', 'Wren Sato', 'Dante Morales',
    'Biscuit', 'Sir Pounce', 'Barnaby', 'Mochi', 'Pickles'
  ],
  randomColors: ['#38bdf8', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#ef4444', '#22d3ee', '#84cc16'],

  // Table 12: Childhood (Rank 1)
  humanChildhood: [
    { name: 'Latchkey Kid', skills: ['Streetwise', 'Perception', 'Stealth'] },
    { name: 'Crafty Kid', skills: ['Fabricate', 'Repair', 'Salvage'] },
    { name: 'Excitable Kid', skills: ['Escape Artist', 'Endurance', 'Running'] },
    { name: 'Gymnast', skills: ['Endurance', 'Jumping', 'Performance'] },
    { name: 'Military Brat', skills: ['Deception', 'Streetwise', 'Tactics'] },
    { name: 'MMO Kid', skills: ['Fabricate', 'Engineering', 'Tactics'] },
    { name: 'Only Child', skills: ['Good First Impression', 'Investigation', 'Negotiation'] },
    { name: 'Outdoor Kid', skills: ['Animal Handling', 'Climbing', 'Swimming'] },
    { name: 'Problem Child', skills: ['Intimidate', 'Deception', 'Pugilism'] },
    { name: 'Scamp', skills: ['Hide in Shadows', 'Jumping', 'Throwing'] },
    { name: "Teacher's Pet", skills: ['Catcher', 'Perception', 'Good First Impression'] },
    { name: 'Wild Child', skills: ['Stealth', 'Survival', 'Running'] }
  ],
  // Table 13: Adolescence (Rank 1)
  humanAdolescence: [
    { name: 'Family Farm', skills: ['Animal Handling', 'Fabricate', 'Tracking'] },
    { name: 'Drama Nerd', skills: ['Fabricate', 'Deception', 'Performance'] },
    { name: 'Drop-Out', skills: ['Chopper Pilot', 'Streetwise', 'Survival'] },
    { name: 'Greek Life', skills: ['Negotiation', 'Intimidate', 'Taunt'] },
    { name: 'Influencer', skills: ['Negotiation', 'Persuasion', 'Performance'] },
    { name: 'Jock', skills: ['Endurance', 'Jumping', 'Throwing'] },
    { name: 'McJob', skills: ['Determine Value', 'Negotiation', 'Repair'] },
    { name: 'Popular', skills: ['Good First Impression', 'Perception', 'Persuasion'] },
    { name: 'Religious', skills: ['Catcher', 'First Aid', 'Persuasion'] },
    { name: 'Student Government', skills: ['Deception', 'Persuasion', 'Investigation'] },
    { name: 'Nerd', skills: ['Investigation', 'Repair', 'Fabricate'] },
    { name: 'Weirdo', skills: ['Streetwise', 'Intimidate', 'Fabricate'] }
  ],
  // Table 15: Hobby (Rank 2)
  humanHobby: [
    { name: 'Collector', skills: ['Fabricate', 'Determine Value', 'Investigation'] },
    { name: 'Cosplay', skills: ['Fabricate', 'Performance', 'Salvage'] },
    { name: 'Drinker', skills: ['Deception', 'Intimidate', 'Streetwise'] },
    { name: 'Gamer', skills: ['Aiming', 'Perception', 'Tactics'] },
    { name: 'Gym Rat', skills: ['Running', 'Endurance', 'Swimming'] },
    { name: 'Hunting', skills: ['Tracking', 'Shotgun', 'Stealth'] },
    { name: 'Music', skills: ['Perception', 'Performance', 'Sleight of Hand'] },
    { name: 'Motorsports', skills: ['Driving', 'Repair', 'Salvage'] },
    { name: 'Climber', skills: ['Climbing', 'Jumping', 'Endurance'] },
    { name: 'Pop Culture', skills: ['Determine Value', 'Investigation', 'Perception'] },
    { name: 'Tinkering', skills: ['Engineering', 'Repair', 'Salvage'] },
    { name: 'Travel', skills: ['Endurance', 'Negotiation', 'Streetwise'] }
  ],
  // Table 14: Career (Rank 3)
  humanCareer: [
    { name: 'Criminal', skills: ['Deception', 'Stealth', 'Streetwise'] },
    { name: 'Service Industry', skills: ['Dagger', 'Endurance', 'Sleight of Hand'] },
    { name: 'Small Business Owner', skills: ['Determine Value', 'Negotiation', 'Perception'] },
    { name: 'Medical', skills: ['Sleight of Hand', 'Detect Lies', 'First Aid'] },
    { name: 'Law Enforcement', skills: ['Detect Lies', 'Handgun', 'Investigation'] },
    { name: 'Gig Worker', skills: ['Driving', 'Escape Artist', 'Negotiation'] },
    { name: 'Teacher', skills: ['Detect Lies', 'Perception', 'Performance'] },
    { name: 'Office Drone', skills: ['Dumpster Diving', 'Endurance', 'Investigation'] },
    { name: 'Entertainer', skills: ['Deception', 'Good First Impression', 'Performance'] },
    { name: 'Unhoused', skills: ['Dumpster Diving', 'Streetwise', 'Survival'] },
    { name: 'Middle Manager', skills: ['Deception', 'Intimidate', 'Negotiation'] },
    { name: 'Military', skills: ['Handgun', 'Survival', 'Tactics'] }
  ],

  // Tables 16-19: Animal Backgrounds
  animalYouth: [
    { name: 'Abandoned', skills: ['Hide in Shadows', 'Endurance', 'Survival'] },
    { name: 'Farmed', skills: ['Escape Artist', 'Climbing', 'Light on Your Feet'] },
    { name: 'Litter-Raised', skills: ['Animal Handling', 'Detect Lies', 'Back Claw'] },
    { name: 'Pampered', skills: ['Negotiation', 'Good First Impression', 'Persuasion'] },
    { name: 'Runt', skills: ['Hide in Shadows', 'Escape Artist', 'Stealth'] },
    { name: 'Stray', skills: ['Back Claw', 'Streetwise', 'Survival'] }
  ],
  animalTraining: [
    { name: 'Clever', skills: ['Investigation', 'Detect Lies', 'Dodge'] },
    { name: 'Free Range', skills: ['Escape Artist', 'Survival', 'Tracking'] },
    { name: 'Pack Mentality', skills: ['Animal Handling', 'Persuasion', 'Tactics'] },
    { name: 'Mischievous', skills: ['Deception', 'Persuasion', 'Sleight of Hand'] },
    { name: 'Watcher', skills: ['Ambush', 'Investigation', 'Perception'] },
    { name: 'Well-Trained', skills: ['Light on Your Feet', 'Catcher', 'Performance'] }
  ],
  animalQuirk: [
    { name: 'Chow Hound', skills: ['Dumpster Diving', 'Investigation', 'Intimidate'] },
    { name: 'Cuddly', skills: ['Good First Impression', 'Persuasion', 'Negotiation'] },
    { name: 'Curious', skills: ['Climbing', 'Perception', 'Swimming'] },
    { name: 'Hunter', skills: ['Hide in Shadows', 'Stealth', 'Tracking'] },
    { name: 'Playful', skills: ['Persuasion', 'Dodge', 'Intimidate'] },
    { name: 'Social', skills: ['Animal Handling', 'Taunt', 'Perception'] }
  ],
  animalAdult: [
    { name: 'Guard', skills: ['Catcher', 'Perception', 'Taunt'] },
    { name: 'Pile of Floof', skills: ['Escape Artist', 'Deception', 'Persuasion'] },
    { name: 'Scrapper', skills: ['Light on Your Feet', 'Streetwise', 'Survival'] },
    { name: 'Show Animal', skills: ['Good First Impression', 'Light on Your Feet', 'Performance'] },
    { name: 'Support Animal', skills: ['Determine Value', 'First Aid', 'Perception'] },
    { name: 'Working', skills: ['Animal Handling', 'Endurance', 'Perception'] }
  ],

  weapons: [
    { group: 'Bashing', name: 'Club' }, { group: 'Bashing', name: 'Improvised Weapons' }, { group: 'Bashing', name: 'Warhammer' },
    { group: 'Edged', name: 'Axe' }, { group: 'Edged', name: 'Dagger' }, { group: 'Edged', name: 'Longsword' }, { group: 'Edged', name: 'Rapier' },
    { group: 'Ranged', name: 'Bow' }, { group: 'Ranged', name: 'Crossbow' }, { group: 'Ranged', name: 'Handgun' }, { group: 'Ranged', name: 'Shotgun' },
    { group: 'Ranged', name: 'Javelin' }, { group: 'Ranged', name: 'Shuriken' }, { group: 'Ranged', name: 'Slingshot' },
    { group: 'Reach', name: 'Herding Weapons' }, { group: 'Reach', name: 'Lance' }, { group: 'Reach', name: 'Polearm' }, { group: 'Reach', name: 'Quarterstaff' }
  ],
  startingSpells: ['Dirt Clod', 'Fire Fingers', 'Frost Scar', 'Mind Tickle', 'Shock Treatment', 'Soul Collector', 'Vine Porn'],
  handToHand: [
    { skill: 'Pugilism', effect: 'Iron Punch' },
    { skill: 'Foot Soldier', effect: 'Smush' },
    { skill: 'Noggin Nocker', effect: 'Skullcracker' },
    { skill: "Wrasslin'", effect: 'Toss' }
  ],
  animalSizes: [
    { val: 'Small (2)', label: 'Small (2) — Cat, Raccoon' },
    { val: 'Petite (3)', label: 'Petite (3) — Dog, Boar' },
    { val: 'Medium (4)', label: 'Medium (4) — Chimpanzee, Wolf' }
  ],

  traumas: [
    'I was abused by someone I trusted.',
    'I was in a terrible accident.',
    'I witnessed a death.',
    'I was betrayed by a family member, friend, or lover.',
    'I was abandoned by one or more parents.',
    'I have a fear of open spaces.',
    'I have a fear of the dark or being alone.',
    'My home burned down.',
    'I was falsely accused of a betrayal or crime.',
    'I was deeply humiliated by a family member, friend, or lover.',
    'I let someone take the blame for something terrible that I did.',
    'I have a fear of heights.'
  ],
  looseEnds: [
    'I never finished high school or my college degree.',
    'I was about to open a restaurant or other business.',
    "I didn't finish writing my novel.",
    "A family member, friend, or lover recently died, but I couldn't say my goodbyes.",
    'I was on the verge of inventing or discovering something.',
    'I made a promise that I might no longer be able to fulfill.',
    'My collection was almost complete.',
    'I was about to perform for the first time when the collapse happened.',
    'I wanted to dump my partner, but...',
    'I was just about to buy or finish renovating my home.',
    'I never sent that letter to a family member, friend, or loved one.',
    'I never got to travel to my dream destination.'
  ],
  regrets: [
    "I didn't ask them to marry me.",
    'I turned down the perfect job.',
    "I stayed quiet when I shouldn't have.",
    'I never said goodbye.',
    'I chose my own safety when I should have leapt into action.',
    'I spent way too much time on something pointless.',
    'I did something illegal, immoral, and probably both.',
    'I lied to avoid an event important to those close to me.',
    'I kept a secret that hurt someone badly.',
    "I didn't apologize for something terrible that I did.",
    'I abandoned someone when they needed me the most.',
    'I trusted the wrong people.'
  ],
  gearPresets: {
    Athlete: 'Clothing: Jogging attire | Weapon: Barbell (Club) | Item: Headphones & music player | Weird: 3-pack of condoms',
    'Gaming Geek': 'Clothing: T-shirt, hoodie, jeans | Weapon: Boffer sword (d4 Longsword) | Item: Game book | Weird: 12 googly eyes & 1 Lego minifig',
    Militant: 'Clothing: Military fatigues | Weapon: Handgun | Item: 2 snack bars | Weird: Morale patch ("No Plan Survives First Contact")',
    Outdoorsy: 'Clothing: Weather gear & orange safety jacket | Weapon: Bow & arrow | Item: Lighter | Weird: Duck call on leather cord'
  }
};

let wizState = null;

function rollCrawlerNumber() {
  return Math.floor(500000 + Math.random() * 12400000);
}

function createFreshWizardState(mode = 'player') {
  return {
    mode, // 'player' | 'gm'
    step: 1,
    name: '',
    iconSymbol: '⚔️',
    color: '#38bdf8',
    pronouns: '',
    crawlerNumber: rollCrawlerNumber(),
    origin: 'human', // 'human' | 'animal'
    animalSpecies: 'Cat',
    size: 'Medium (4)',
    // 4 background slots: [{ bgIdx, picked: [skillA, skillB] }]
    bgs: [
      { bgIdx: 0, picked: ['Streetwise', 'Perception'] },
      { bgIdx: 0, picked: ['Animal Handling', 'Fabricate'] },
      { bgIdx: 0, picked: ['Determine Value', 'Investigation'] },
      { bgIdx: 0, picked: ['Deception', 'Stealth'] }
    ],
    combatType: 'weapon', // 'weapon' | 'spell' | 'hand'
    weaponName: 'Club',
    weaponCustomLabel: '',
    spellName: 'Fire Fingers',
    handIndex: 0,
    statMethod: 'array', // 'array' | 'roll'
    stats: { Str: 4, Int: 5, Con: 6, Dex: 3, Cha: 2 },
    trauma: DCC_CHARGEN_DATA.traumas[0],
    looseEnd: DCC_CHARGEN_DATA.looseEnds[0],
    regret: DCC_CHARGEN_DATA.regrets[0],
    gear: DCC_CHARGEN_DATA.gearPresets.Athlete
  };
}

function getWizardBgTables(origin) {
  if (origin === 'animal') {
    return [
      { label: 'Youth (Rank 1)', rank: 1, list: DCC_CHARGEN_DATA.animalYouth },
      { label: 'Training (Rank 1)', rank: 1, list: DCC_CHARGEN_DATA.animalTraining },
      { label: 'Quirk (Rank 2)', rank: 2, list: DCC_CHARGEN_DATA.animalQuirk },
      { label: 'Adult (Rank 3)', rank: 3, list: DCC_CHARGEN_DATA.animalAdult }
    ];
  }
  return [
    { label: 'Childhood (Rank 1)', rank: 1, list: DCC_CHARGEN_DATA.humanChildhood },
    { label: 'Adolescence (Rank 1)', rank: 1, list: DCC_CHARGEN_DATA.humanAdolescence },
    { label: 'Hobby (Rank 2)', rank: 2, list: DCC_CHARGEN_DATA.humanHobby },
    { label: 'Career (Rank 3)', rank: 3, list: DCC_CHARGEN_DATA.humanCareer }
  ];
}

function pickTwoUniqueFromBg(bgEntry, usedSet) {
  const picks = [];
  for (const sk of bgEntry.skills) {
    if (!usedSet.has(sk.toLowerCase()) && picks.length < 2) {
      picks.push(sk);
      usedSet.add(sk.toLowerCase());
    }
  }
  return picks;
}

function openCrawlerCreationWizard(mode = 'player') {
  if (typeof closePlayerClaimModal === 'function') closePlayerClaimModal();
  wizState = createFreshWizardState(mode);
  const modal = document.getElementById('playerCreateCrawlerModal');
  if (modal) modal.classList.remove('hidden');
  renderCrawlerWizard();
}

function closeCrawlerCreationWizard() {
  const modal = document.getElementById('playerCreateCrawlerModal');
  if (modal) modal.classList.add('hidden');
}

function wizSetOrigin(origin) {
  if (!wizState) return;
  wizState.origin = origin;
  wizState.size = origin === 'animal' ? 'Small (2)' : 'Medium (4)';
  const tables = getWizardBgTables(origin);
  const used = new Set();
  wizState.bgs = tables.map(t => {
    const picked = pickTwoUniqueFromBg(t.list[0], used);
    return { bgIdx: 0, picked };
  });
  renderCrawlerWizard();
}

function wizSelectBg(slotIdx, bgIdx) {
  if (!wizState) return;
  const tables = getWizardBgTables(wizState.origin);
  const idx = Math.max(0, Math.min(tables[slotIdx].list.length - 1, Number(bgIdx) || 0));
  const usedOther = new Set();
  wizState.bgs.forEach((b, i) => {
    if (i !== slotIdx) b.picked.forEach(s => usedOther.add(s.toLowerCase()));
  });
  wizState.bgs[slotIdx] = {
    bgIdx: idx,
    picked: pickTwoUniqueFromBg(tables[slotIdx].list[idx], usedOther)
  };
  renderCrawlerWizard();
}

function wizRollBg(slotIdx) {
  if (!wizState) return;
  const tables = getWizardBgTables(wizState.origin);
  const r = Math.floor(Math.random() * tables[slotIdx].list.length);
  wizSelectBg(slotIdx, r);
}

function wizToggleBgSkill(slotIdx, skillName) {
  if (!wizState) return;
  const slot = wizState.bgs[slotIdx];
  const exists = slot.picked.includes(skillName);
  if (exists) {
    slot.picked = slot.picked.filter(s => s !== skillName);
  } else {
    // Check no double-dipping across other slots
    const usedElsewhere = wizState.bgs.some((b, i) => i !== slotIdx && b.picked.some(s => s.toLowerCase() === skillName.toLowerCase()));
    if (usedElsewhere) {
      showVttToast(`⚠️ No double-dipping: ${skillName} is already picked in another background.`);
      return;
    }
    if (slot.picked.length >= 2) {
      slot.picked.shift();
    }
    slot.picked.push(skillName);
  }
  renderCrawlerWizard();
}

function wizAssignArrayStat(statKey, val) {
  if (!wizState) return;
  const num = Number(val);
  const oldVal = wizState.stats[statKey];
  // Swap with whichever stat currently holds num so 2,3,4,5,6 stays unique
  const otherKey = Object.keys(wizState.stats).find(k => k !== statKey && wizState.stats[k] === num);
  wizState.stats[statKey] = num;
  if (otherKey) wizState.stats[otherKey] = oldVal;
  renderCrawlerWizard();
}

function wizRollChanceStats() {
  if (!wizState) return;
  wizState.statMethod = 'roll';
  const roll2to6 = () => Math.floor(Math.random() * 5) + 2; // 1d6 reroll 1s
  wizState.stats = {
    Str: roll2to6(),
    Int: roll2to6(),
    Con: roll2to6(),
    Dex: roll2to6(),
    Cha: roll2to6()
  };
  renderCrawlerWizard();
}

function wizShuffleStandardArray() {
  if (!wizState) return;
  wizState.statMethod = 'array';
  const arr = [2, 3, 4, 5, 6];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const keys = ['Str', 'Int', 'Con', 'Dex', 'Cha'];
  keys.forEach((k, idx) => { wizState.stats[k] = arr[idx]; });
  renderCrawlerWizard();
}

function wizRollTableField(field, tableKey) {
  if (!wizState) return;
  const list = DCC_CHARGEN_DATA[tableKey];
  if (!list || list.length === 0) return;
  wizState[field] = list[Math.floor(Math.random() * list.length)];
  renderCrawlerWizard();
}

function wizRandomizeAll() {
  if (!wizState) return;
  const mode = wizState.mode;
  const rand = buildRandomCrawlerWizardState(mode, wizState.origin);
  rand.step = wizState.step;
  wizState = rand;
  renderCrawlerWizard();
  showVttToast('🎲 Randomized full Floor 1 Crawler!');
}

function buildRandomCrawlerWizardState(mode = 'gm', forcedOrigin = null) {
  const st = createFreshWizardState(mode);
  const origin = forcedOrigin || (Math.random() < 0.85 ? 'human' : 'animal');
  st.origin = origin;
  st.name = DCC_CHARGEN_DATA.randomNames[Math.floor(Math.random() * DCC_CHARGEN_DATA.randomNames.length)];
  st.iconSymbol = DCC_CHARGEN_DATA.icons[Math.floor(Math.random() * DCC_CHARGEN_DATA.icons.length)].v;
  st.color = DCC_CHARGEN_DATA.randomColors[Math.floor(Math.random() * DCC_CHARGEN_DATA.randomColors.length)];
  st.crawlerNumber = rollCrawlerNumber();
  st.size = origin === 'animal'
    ? DCC_CHARGEN_DATA.animalSizes[Math.floor(Math.random() * DCC_CHARGEN_DATA.animalSizes.length)].val
    : 'Medium (4)';
  st.animalSpecies = ['Cat', 'Dog', 'Goat', 'Raccoon', 'Ferret'][Math.floor(Math.random() * 5)];

  // 4 random backgrounds with 2 non-duplicate skills each
  const tables = getWizardBgTables(origin);
  const used = new Set();
  st.bgs = tables.map(t => {
    let chosenIdx = Math.floor(Math.random() * t.list.length);
    let picks = pickTwoUniqueFromBg(t.list[chosenIdx], new Set(used));
    // Retry if fewer than 2 unique skills available
    for (let tries = 0; tries < 8 && picks.length < 2; tries++) {
      chosenIdx = Math.floor(Math.random() * t.list.length);
      picks = pickTwoUniqueFromBg(t.list[chosenIdx], new Set(used));
    }
    picks.forEach(p => used.add(p.toLowerCase()));
    return { bgIdx: chosenIdx, picked: picks };
  });

  // Combat focus
  const rCombat = Math.random();
  if (rCombat < 0.65) {
    st.combatType = 'weapon';
    st.weaponName = DCC_CHARGEN_DATA.weapons[Math.floor(Math.random() * DCC_CHARGEN_DATA.weapons.length)].name;
  } else if (rCombat < 0.85) {
    st.combatType = 'spell';
    st.spellName = DCC_CHARGEN_DATA.startingSpells[Math.floor(Math.random() * DCC_CHARGEN_DATA.startingSpells.length)];
  } else {
    st.combatType = 'hand';
    st.handIndex = Math.floor(Math.random() * DCC_CHARGEN_DATA.handToHand.length);
  }

  // Standard Array shuffled; guarantee Int >= 4 if Spell chosen
  const arr = [2, 3, 4, 5, 6];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  st.stats = { Str: arr[0], Int: arr[1], Con: arr[2], Dex: arr[3], Cha: arr[4] };
  if (st.combatType === 'spell' && st.stats.Int < 4) {
    const hiKey = Object.keys(st.stats).find(k => st.stats[k] >= 5) || 'Str';
    const tmp = st.stats.Int;
    st.stats.Int = st.stats[hiKey];
    st.stats[hiKey] = tmp;
  }

  st.trauma = DCC_CHARGEN_DATA.traumas[Math.floor(Math.random() * DCC_CHARGEN_DATA.traumas.length)];
  st.looseEnd = DCC_CHARGEN_DATA.looseEnds[Math.floor(Math.random() * DCC_CHARGEN_DATA.looseEnds.length)];
  st.regret = DCC_CHARGEN_DATA.regrets[Math.floor(Math.random() * DCC_CHARGEN_DATA.regrets.length)];
  const presetKeys = Object.keys(DCC_CHARGEN_DATA.gearPresets);
  st.gear = DCC_CHARGEN_DATA.gearPresets[presetKeys[Math.floor(Math.random() * presetKeys.length)]];
  return st;
}

function buildCrawlerPayloadFromWizardState(st) {
  const tables = getWizardBgTables(st.origin);
  const skillsToAssign = [];
  const spellsToAssign = [{ name: 'Heal', rank: 1 }];

  // Background skills
  st.bgs.forEach((slot, idx) => {
    const rank = tables[idx].rank;
    (slot.picked || []).forEach(skName => {
      if (!skillsToAssign.some(s => s.name.toLowerCase() === skName.toLowerCase())) {
        skillsToAssign.push({ name: skName, rank });
      }
    });
  });

  // Base racial combat skill (Rank 3)
  const baseCombatSkill = st.origin === 'animal' ? 'Slice Attack' : 'Unarmed Combat';
  if (!skillsToAssign.some(s => s.name.toLowerCase() === baseCombatSkill.toLowerCase())) {
    skillsToAssign.push({ name: baseCombatSkill, rank: 3 });
  }

  // Secondary combat focus (Rank 3)
  let hotlistNote = 'Heal (R1, 2 MP)';
  if (st.combatType === 'weapon') {
    const wName = st.weaponName;
    if (!skillsToAssign.some(s => s.name.toLowerCase() === wName.toLowerCase())) {
      skillsToAssign.push({ name: wName, rank: 3 });
    }
    if (st.weaponCustomLabel && st.weaponCustomLabel.trim()) {
      hotlistNote += ` | Weapon: ${st.weaponCustomLabel.trim()} (${wName})`;
    }
  } else if (st.combatType === 'spell') {
    spellsToAssign.push({ name: st.spellName, rank: 3 });
    hotlistNote += ` | ${st.spellName} (R3) | 5x Standard Mana Potions`;
  } else {
    const h = DCC_CHARGEN_DATA.handToHand[st.handIndex] || DCC_CHARGEN_DATA.handToHand[0];
    if (!skillsToAssign.some(s => s.name.toLowerCase() === h.skill.toLowerCase())) {
      skillsToAssign.push({ name: h.skill, rank: 3 });
    }
    if (!skillsToAssign.some(s => s.name.toLowerCase() === h.effect.toLowerCase())) {
      skillsToAssign.push({ name: h.effect, rank: 3 });
    }
  }

  const raceLabel = st.origin === 'animal' ? (st.animalSpecies || 'Enhanced Pet') : 'Human';
  const aiFavor = st.origin === 'animal' ? 0 : 1;
  const notesLines = [
    `Crawler #${Number(st.crawlerNumber || rollCrawlerNumber()).toLocaleString()}${st.pronouns ? ` (${st.pronouns})` : ''} • AI Favor: ${aiFavor}`,
    `Hotlist: ${hotlistNote}`,
    `Trauma: ${st.trauma}`,
    `Loose End: ${st.looseEnd}`,
    `Regret: ${st.regret}`,
    `Gear: ${st.gear}`
  ];

  return {
    name: (st.name || 'Unnamed Crawler').trim(),
    iconSymbol: st.iconSymbol || '⚔️',
    race: raceLabel,
    size: st.size || 'Medium (4)',
    classification: `Crawler; ${st.size || 'Medium (4)'}, ${raceLabel}`,
    color: st.color || '#38bdf8',
    level: 1,
    maxMana: Math.max(1, Number(st.stats.Int) || 4),
    aiFavor,
    crawlerNumber: st.crawlerNumber,
    pronouns: st.pronouns || '',
    stats: {
      Str: String(st.stats.Str),
      Int: String(st.stats.Int),
      Con: String(st.stats.Con),
      Dex: String(st.stats.Dex),
      Cha: String(st.stats.Cha)
    },
    assignedSkillNames: skillsToAssign,
    assignedSpellNames: spellsToAssign,
    attacks: [],
    notes: notesLines.join(' || ')
  };
}

function gmGenerateRandomCrawler() {
  const randState = buildRandomCrawlerWizardState('gm');
  const payload = buildCrawlerPayloadFromWizardState(randState);
  const tok = createAndDeployCrawlerFromPayload(payload);
  if (tok) {
    uiState.selectedTokenId = tok.id;
    renderAllUI();
  }
}

function wizSubmitFinalCrawler() {
  if (!wizState) return;
  if (!String(wizState.name || '').trim()) {
    wizState.step = 1;
    renderCrawlerWizard();
    showVttToast('⚠️ Please enter a Crawler Name in Step 1.');
    return;
  }
  if (wizState.combatType === 'spell' && (Number(wizState.stats.Int) || 0) < 4) {
    wizState.step = 3;
    renderCrawlerWizard();
    showVttToast('⚠️ Starting Attack Spells require Intelligence 4 or higher!');
    return;
  }

  const payload = buildCrawlerPayloadFromWizardState(wizState);
  if (IS_PLAYER_WINDOW || wizState.mode === 'player') {
    sendPlayerCreateCrawlerToHost(payload);
    showVttToast(`🦸 Creating ${payload.name} and deploying to map...`);
  } else {
    const tok = createAndDeployCrawlerFromPayload(payload);
    if (tok) {
      uiState.selectedTokenId = tok.id;
      renderAllUI();
    }
  }
  closeCrawlerCreationWizard();
}

function renderCrawlerWizard() {
  const box = document.getElementById('crawlerWizardBody');
  if (!box || !wizState) return;
  const st = wizState;
  const steps = ['1. Identity', '2. Backgrounds & Combat', '3. Stats & Vitals', '4. Trauma & Gear'];

  const stepTabsHtml = steps.map((lbl, idx) => {
    const n = idx + 1;
    const active = st.step === n;
    return `<button type="button" onclick="wizState.step=${n}; renderCrawlerWizard()" class="px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${active ? 'bg-emerald-500 text-slate-950' : 'bg-dungeon-950 text-slate-400 hover:text-slate-200 border border-slate-800'}">${lbl}</button>`;
  }).join('');

  let contentHtml = '';

  if (st.step === 1) {
    contentHtml = `
      <div class="space-y-3">
        <div class="grid grid-cols-4 gap-2">
          <label class="block text-[10px] font-mono text-slate-400">Icon
            <select onchange="wizState.iconSymbol=this.value" class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded-lg px-1.5 py-1.5 text-center text-sm cursor-pointer">
              ${DCC_CHARGEN_DATA.icons.map(ic => `<option value="${ic.v}" ${st.iconSymbol === ic.v ? 'selected' : ''}>${ic.l}</option>`).join('')}
            </select>
          </label>
          <label class="col-span-3 block text-[10px] font-mono text-slate-400">Crawler Name *
            <input type="text" value="${escapeHtmlAttr(st.name)}" oninput="wizState.name=this.value" placeholder="e.g. Carl, Princess Donut..." class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none" />
          </label>
        </div>

        <div class="grid grid-cols-3 gap-2">
          <label class="block text-[10px] font-mono text-slate-400">Pronouns (Optional)
            <input type="text" value="${escapeHtmlAttr(st.pronouns)}" oninput="wizState.pronouns=this.value" placeholder="he/him, she/her..." class="mt-0.5 w-full bg-dungeon-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200" />
          </label>
          <label class="block text-[10px] font-mono text-slate-400">Crawler #
            <div class="flex gap-1 mt-0.5">
              <input type="number" value="${st.crawlerNumber}" oninput="wizState.crawlerNumber=Number(this.value)||500000" class="w-full min-w-0 bg-dungeon-950 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-amber-300" />
              <button type="button" onclick="wizState.crawlerNumber=rollCrawlerNumber(); renderCrawlerWizard()" title="Randomize Crawler Number" class="px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs">🎲</button>
            </div>
          </label>
          <label class="block text-[10px] font-mono text-slate-400">Token Color
            <input type="color" value="${st.color}" onchange="wizState.color=this.value" class="mt-0.5 w-full h-8 bg-dungeon-950 border border-slate-700 rounded-lg cursor-pointer p-0.5" />
          </label>
        </div>

        <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2.5 space-y-2">
          <div class="text-[10px] font-mono uppercase text-cyan-400 font-bold">Floor 1 Origin</div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" onclick="wizSetOrigin('human')" class="p-2 rounded-xl border text-left transition ${st.origin === 'human' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100' : 'bg-dungeon-900 border-slate-800 text-slate-400 hover:border-slate-700'}">
              <div class="font-bold text-xs">🧑 Human Crawler</div>
              <div class="text-[10px] font-mono text-slate-400 mt-0.5">Size: Medium (4) • AI Favor: 1 • Unarmed Combat R3</div>
            </button>
            <button type="button" onclick="wizSetOrigin('animal')" class="p-2 rounded-xl border text-left transition ${st.origin === 'animal' ? 'bg-amber-500/20 border-amber-400 text-amber-100' : 'bg-dungeon-900 border-slate-800 text-slate-400 hover:border-slate-700'}">
              <div class="font-bold text-xs">🐾 Enhanced Pet (Animal)</div>
              <div class="text-[10px] font-mono text-slate-400 mt-0.5">Size: 2–4 • AI Favor: 0 (Pet Biscuit) • Slice Attack R3</div>
            </button>
          </div>
          ${st.origin === 'animal' ? `
            <div class="grid grid-cols-2 gap-2 pt-1">
              <label class="block text-[10px] font-mono text-slate-400">Animal Species
                <input type="text" value="${escapeHtmlAttr(st.animalSpecies)}" oninput="wizState.animalSpecies=this.value" placeholder="Cat, Dog, Goat..." class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100" />
              </label>
              <label class="block text-[10px] font-mono text-slate-400">Size (Table 21)
                <select onchange="wizState.size=this.value" class="mt-0.5 w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-100">
                  ${DCC_CHARGEN_DATA.animalSizes.map(s => `<option value="${s.val}" ${st.size === s.val ? 'selected' : ''}>${s.label}</option>`).join('')}
                </select>
              </label>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  } else if (st.step === 2) {
    const tables = getWizardBgTables(st.origin);
    const allPickedElsewhere = (slotIdx, sk) => st.bgs.some((b, i) => i !== slotIdx && b.picked.some(x => x.toLowerCase() === sk.toLowerCase()));

    contentHtml = `
      <div class="space-y-2.5">
        <div class="text-[10px] font-mono text-slate-400">Pick 1 background per stage and select <b>2 of its 3 Skills</b> (no double-dipping). Base combat skill (<b>${st.origin === 'animal' ? 'Slice Attack' : 'Unarmed Combat'} R3</b>) + <b>Heal Spell (R1)</b> are granted automatically.</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          ${tables.map((t, idx) => {
            const slot = st.bgs[idx];
            const entry = t.list[slot.bgIdx] || t.list[0];
            return `
              <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1.5">
                <div class="flex items-center justify-between gap-1">
                  <span class="text-[10px] font-mono font-bold text-cyan-300 uppercase">${t.label}</span>
                  <button type="button" onclick="wizRollBg(${idx})" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-amber-300">🎲 Roll</button>
                </div>
                <select onchange="wizSelectBg(${idx}, this.value)" class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100">
                  ${t.list.map((bg, bi) => `<option value="${bi}" ${slot.bgIdx === bi ? 'selected' : ''}>${bi + 1}. ${bg.name}</option>`).join('')}
                </select>
                <div class="flex flex-wrap gap-1 pt-0.5">
                  ${entry.skills.map(sk => {
                    const checked = slot.picked.includes(sk);
                    const dup = !checked && allPickedElsewhere(idx, sk);
                    return `<button type="button" ${dup ? 'disabled' : ''} onclick="wizToggleBgSkill(${idx}, '${sk.replace(/'/g, "\\'")}')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition ${checked ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-bold' : dup ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed line-through' : 'bg-dungeon-900 text-slate-300 border-slate-700 hover:border-cyan-400'}">${checked ? '✓ ' : ''}${sk}</button>`;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="bg-dungeon-950 border border-amber-500/35 rounded-xl p-2.5 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-mono font-bold uppercase text-amber-300">Step 2: Starting Combat Focus (Rank 3)</span>
            <div class="flex gap-1">
              <button type="button" onclick="wizState.combatType='weapon'; renderCrawlerWizard()" class="px-2 py-0.5 rounded text-[10px] font-bold ${st.combatType === 'weapon' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">🗡️ Weapon</button>
              <button type="button" onclick="wizState.combatType='spell'; renderCrawlerWizard()" class="px-2 py-0.5 rounded text-[10px] font-bold ${st.combatType === 'spell' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'}">✨ Spell</button>
              <button type="button" onclick="wizState.combatType='hand'; renderCrawlerWizard()" class="px-2 py-0.5 rounded text-[10px] font-bold ${st.combatType === 'hand' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'}">🥊 Unarmed</button>
            </div>
          </div>
          ${st.combatType === 'weapon' ? `
            <div class="grid grid-cols-2 gap-2">
              <select onchange="wizState.weaponName=this.value" class="bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-100">
                ${DCC_CHARGEN_DATA.weapons.map(w => `<option value="${w.name}" ${st.weaponName === w.name ? 'selected' : ''}>${w.group}: ${w.name}</option>`).join('')}
              </select>
              <input type="text" value="${escapeHtmlAttr(st.weaponCustomLabel)}" oninput="wizState.weaponCustomLabel=this.value" placeholder="Custom flavor (e.g. Tire Iron)" class="bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-200" />
            </div>
          ` : st.combatType === 'spell' ? `
            <div class="space-y-1">
              <select onchange="wizState.spellName=this.value" class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-indigo-200">
                ${DCC_CHARGEN_DATA.startingSpells.map(sp => `<option value="${sp}" ${st.spellName === sp ? 'selected' : ''}>${sp} (Rank 3)</option>`).join('')}
              </select>
              <div class="text-[10px] font-mono text-indigo-300">Requires Int ≥ 4 in Step 3 • Grants 5 Standard Mana Potions in Hotlist.</div>
            </div>
          ` : `
            <select onchange="wizState.handIndex=Number(this.value)||0" class="w-full bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-rose-200">
              ${DCC_CHARGEN_DATA.handToHand.map((h, i) => `<option value="${i}" ${st.handIndex === i ? 'selected' : ''}>${h.skill} + ${h.effect} Damage Effect (Both Rank 3)</option>`).join('')}
            </select>
          `}
        </div>
      </div>
    `;
  } else if (st.step === 3) {
    const conMod = getDccStatModifierFromScore(st.stats.Con);
    const dexMod = getDccStatModifierFromScore(st.stats.Dex);
    const maxHp = conMod * 10;
    const maxMp = Number(st.stats.Int) || 2;
    const spellIntWarn = st.combatType === 'spell' && maxMp < 4;

    contentHtml = `
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 bg-dungeon-950 border border-slate-800 rounded-xl p-2">
          <div class="flex gap-1.5">
            <button type="button" onclick="wizShuffleStandardArray()" class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${st.statMethod === 'array' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">Standard Array (2,3,4,5,6)</button>
            <button type="button" onclick="wizRollChanceStats()" class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${st.statMethod === 'roll' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}">🎲 Roll 1d6 (Reroll 1s)</button>
          </div>
          <span class="text-[10px] font-mono text-slate-400">Mods: 1–2 (+1), 3–5 (+2), 6–9 (+3)</span>
        </div>

        <div class="grid grid-cols-5 gap-2 text-center font-mono">
          ${['Str', 'Int', 'Con', 'Dex', 'Cha'].map(k => {
            const val = st.stats[k];
            const mod = getDccStatModifierFromScore(val);
            return `
              <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-2 space-y-1">
                <div class="text-[10px] font-bold text-slate-400 uppercase">${k}</div>
                ${st.statMethod === 'array' ? `
                  <select onchange="wizAssignArrayStat('${k}', this.value)" class="w-full bg-dungeon-900 border border-slate-700 rounded px-1 py-1 text-center font-bold text-sm text-slate-100">
                    ${[2, 3, 4, 5, 6].map(n => `<option value="${n}" ${val === n ? 'selected' : ''}>${n}</option>`).join('')}
                  </select>
                ` : `
                  <div class="py-1 font-extrabold text-base text-amber-300">${val}</div>
                `}
                <div class="text-[11px] font-bold text-emerald-300">+${mod}</div>
              </div>
            `;
          }).join('')}
        </div>

        ${spellIntWarn ? `<div class="bg-rose-950/60 border border-rose-500/50 rounded-xl px-3 py-2 text-[11px] font-mono text-rose-200">⚠️ You selected a Starting Attack Spell (${st.spellName}), which requires <b>Intelligence 4 or higher</b>.</div>` : ''}

        <div class="grid grid-cols-4 gap-2 text-center font-mono bg-dungeon-950 border border-slate-800 rounded-xl p-2.5">
          <div><div class="text-[9px] text-slate-500">HEALTH BAR</div><div class="font-bold text-emerald-300 text-xs">10×${conMod} (${maxHp} HP)</div></div>
          <div><div class="text-[9px] text-slate-500">MAX MANA</div><div class="font-bold text-indigo-300 text-xs">${maxMp} MP</div></div>
          <div><div class="text-[9px] text-slate-500">EVADE</div><div class="font-bold text-cyan-300 text-xs">+${dexMod}</div></div>
          <div><div class="text-[9px] text-slate-500">MOVE / STEP</div><div class="font-bold text-amber-300 text-xs">20ft / 10ft</div></div>
        </div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="space-y-2.5">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono text-rose-300 font-bold">
            <span>Past Trauma (Table 22)</span>
            <button type="button" onclick="wizRollTableField('trauma','traumas')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300">🎲 1d12</button>
          </div>
          <input type="text" value="${escapeHtmlAttr(st.trauma)}" oninput="wizState.trauma=this.value" class="w-full bg-dungeon-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200" />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono text-amber-300 font-bold">
            <span>Loose Ends (Table 23)</span>
            <button type="button" onclick="wizRollTableField('looseEnd','looseEnds')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300">🎲 1d12</button>
          </div>
          <input type="text" value="${escapeHtmlAttr(st.looseEnd)}" oninput="wizState.looseEnd=this.value" class="w-full bg-dungeon-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200" />
        </div>

        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono text-purple-300 font-bold">
            <span>Regrets (Table 24)</span>
            <button type="button" onclick="wizRollTableField('regret','regrets')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300">🎲 1d12</button>
          </div>
          <input type="text" value="${escapeHtmlAttr(st.regret)}" oninput="wizState.regret=this.value" class="w-full bg-dungeon-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200" />
        </div>

        <div class="space-y-1.5 pt-1 border-t border-slate-800">
          <div class="flex items-center justify-between flex-wrap gap-1">
            <span class="text-[10px] font-mono text-emerald-300 font-bold">Starting Gear (Step 10)</span>
            <div class="flex flex-wrap gap-1">
              ${Object.keys(DCC_CHARGEN_DATA.gearPresets).map(k => `<button type="button" onclick="wizState.gear=DCC_CHARGEN_DATA.gearPresets['${k}']; renderCrawlerWizard()" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200">${k}</button>`).join('')}
            </div>
          </div>
          <textarea rows="2" oninput="wizState.gear=this.value" class="w-full bg-dungeon-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200">${escapeHtmlAttr(st.gear)}</textarea>
        </div>
      </div>
    `;
  }

  box.innerHTML = `
    <div class="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2">
      <div class="flex flex-wrap gap-1">${stepTabsHtml}</div>
      <button type="button" onclick="wizRandomizeAll()" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shrink-0">🎲 Randomize All</button>
    </div>
    <div class="py-1">${contentHtml}</div>
    <div class="flex items-center justify-between pt-2 border-t border-slate-800">
      <button type="button" onclick="${st.step > 1 ? `wizState.step=${st.step - 1}; renderCrawlerWizard()` : 'closeCrawlerCreationWizard()'}" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold">${st.step > 1 ? '← Back' : 'Cancel'}</button>
      ${st.step < 4
        ? `<button type="button" onclick="wizState.step=${st.step + 1}; renderCrawlerWizard()" class="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold">Next Step →</button>`
        : `<button type="button" onclick="wizSubmitFinalCrawler()" class="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow">✓ Finish & Deploy Crawler</button>`
      }
    </div>
  `;
}
