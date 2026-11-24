// =========================================================================
// HOW-TO GUIDE, INTERACTIVE WALKTHROUGH TOUR & SEARCHABLE RULES COMPENDIUM
// =========================================================================

const RULES_COMPENDIUM_CHAPTERS = [
  {
    id: 'ch_combat_loop',
    num: 'Ch. 2',
    title: 'Combat Loop, Phases & Actions',
    summary: '5-step combat rounds, Action Points (AP), 10ft Steps, Evade, Intervene, Call a Play, and Clean Up.',
    sections: [
      {
        heading: 'The 5 Combat Steps (Per Round)',
        body: 'Combat runs in rounds with 5 structured steps: (1) Declare — Mobs declare or telegraph attacks; (2) React — Crawlers declare reactions such as Evade, Shield Block, Catcher, or 10ft Interrupt Steps; (3) Mobs — Mob actions and attacks resolve against targets; (4) Crawlers — Crawlers take full Actions, movement, skills, and spells; (5) Clean Up — Round-end damage/effects tick (such as Burning, Bleeding, Poisoned, Regeneration, and persistent spell zones/durations).'
      },
      {
        heading: 'Action Points (AP) & Movement Rings',
        body: 'Crawlers start each round with 2 AP (when Auto-AP is enabled). A 10ft Step can be used as a free/step movement (or 15ft with Dodge Rank 5+), a Move Action covers base Move + Step, and a Dash / double move spends up to 2 AP. Diagonal movement and attack distances measure 5ft per square (Chebyshev / grid square distance).'
      },
      {
        heading: 'Evade, Catcher, Shield Block & Support Actions',
        body: 'A single Evade declaration can cover incoming mob attacks in the round (rolled per attack against the mob\'s Flat Hit DC). Allies with Catcher can leap adjacent to intercept a direct non-AoE hit (granting bonus DR at higher ranks). Shield Block lets a shielded crawler roll d20 + Str vs. Flat Hit to halve physical damage (or magic at Rank 5+). Intervene (1d6) and Call a Play (2d6 keep highest, or 2d10 keep highest with Tactics Rank 10+) provide ally check/damage support.'
      },
      {
        heading: 'Cover, Environmental Modifiers, Swarms & Mob vs. Mob',
        body: 'Cover props between attacker and target at >5ft range impose Disadvantage on attacks (melee attacks at 5ft are unaffected); a missed attack can damage/destroy sturdy cover based on strength. Environmental penalties (such as Darkness) impose Disadvantage, while favorable environment (such as High Ground) grants Advantage. Swarm mobs combine pack units into larger footprints, gain +Hit and extra combat dice at larger spans, gain a swarm Evade adjustment, resist single-target crowd control while multiple units remain, and cap single-target non-AoE damage at one unit per hit while taking +20% on AoE hits. Area spells/attacks use Blast, Burst, Cone, Line, or Splash rules. Mob vs. Mob clashes resolve on a 1d12 roll.'
      }
    ]
  },
  {
    id: 'ch_stats_checks',
    num: 'Ch. 1 & 3',
    title: 'Stats, Modifiers & Check Outcomes',
    summary: 'Core attributes (Str, Int, Con, Dex, Cha), score-to-modifier tiers, and degree-of-success thresholds.',
    sections: [
      {
        heading: 'Stat Modifiers & Health / Mana Scaling',
        body: 'Modifiers scale by stat score bracket: 1–2 (+1), 3–5 (+2), 6–9 (+3), 10–19 (+4), 20–49 (+5), 50–99 (+6), 100–149 (+7), 150–199 (+8), 200–299 (+9), and 300+ (+10). Crawlers have 10 Health Bar pips scaled by their Constitution modifier (HP per pip), while Mana capacity scales with Intelligence/class/upgrades.'
      },
      {
        heading: 'Advantage, Disadvantage & Untrained Skills',
        body: 'Advantage rolls 2d20 and keeps the higher natural roll; Disadvantage rolls 2d20 and keeps the lower natural roll. Opposing Advantage and Disadvantage cancel to a normal 1d20 (for example, making a ranged attack while adjacent to an enemy or while blinded/fatigued introduces Disadvantage). Untrained active skills (Rank 0) roll at Disadvantage with 0 skill rank bonus; passive skills cannot be used untrained.'
      },
      {
        heading: 'Degrees of Success & Failure',
        body: 'A Natural 1 is a Critical Fail (automatic failure; can queue post-combat injuries on failed evades). A Natural 20 is a Critical Hit (doubles base damage dice; Rank dice and Floor modifiers are added after without being doubled). Rolling 10 or more above the target DC is an Amazing Success (adds Floor bonus damage); rolling at or above DC is a Standard Success. Missing by 1–2 is a Near Miss Fail; missing by 10 or more is a Major Fail.'
      }
    ]
  },
  {
    id: 'ch_advancement_loot',
    num: 'Ch. 3 & 4',
    title: 'Advancement, Grinding & Loot',
    summary: 'Level-ups, stat points, marked skill checks, grinding montages, and loot tiers.',
    sections: [
      {
        heading: 'Levels, Stat Points & Skill Advancement',
        body: 'Crawlers advance through milestones (such as 2-hour play intervals, quests, and boss defeats). Non-passive skills used in checks can be marked (★) for advancement; checks roll 1d20 against current rank (up to Rank 15), with lower ranks checked on 2-hour intervals and higher ranks at floor milestones. Stat points awarded on eligible floors are spent in saferooms.'
      },
      {
        heading: 'Grinding Montages & Collapse Clock',
        body: 'Grinding invests hours toward skill advancement and level progress while advancing the Floor Collapse countdown clock. Grinding beyond 5 hours in a day can trigger Endurance checks (or fatigue on failure), while certain maps/guides can add bonus grinding credit on 5+ hour sessions.'
      },
      {
        heading: 'Loot Boxes & Fallen Mob Salvage',
        body: 'Loot boxes span Bronze, Silver, Gold, Platinum, Legendary, and Celestial tiers, scaling gold payouts and magic item rolls (Tables 38–42). Defeated mobs can be looted for floor-scaled gold and Misc. Junk multiplied across bodies.'
      }
    ]
  },
  {
    id: 'ch_vision_lighting_vtt',
    num: 'VTT Rules',
    title: 'Line of Sight, Fog of War & Lighting',
    summary: 'Wall/door occlusion, ambient darkness tiers, light cones/flicker, and minimap detection.',
    sections: [
      {
        heading: 'Walls, Doors & Line of Sight',
        body: 'Wall segments block vision, light raycasts, and movement paths. Door segments block line of sight and movement while closed, and open when clicked in Wall/Door mode. Abilities and attacks check range and line of sight unless marked to ignore line of sight.'
      },
      {
        heading: 'Ambient Darkness & Light Sources',
        body: 'Map darkness ranges from bright ambient light through dim light to true darkness. In true darkness, visibility relies on personal sight/light radii and active light sources (torches, light spells, objects, and dropped lights) clipped by blocking walls, with optional cone angles, facing directions, max reach cutoffs, and animation effects.'
      },
      {
        heading: 'Fog of War, Ghost Markers & Minimap Blips',
        body: 'Explored areas remain visible as darkened memory on the Player Display unless the minimap is taken offline (such as during traps or labyrinthine hazards). Mobs spotted and then lost from sight leave last-seen ghost tracking, and perception/detection skills can reveal minimap blips.'
      }
    ]
  }
];

const HOW_TO_GUIDES = {
  gm: [
    {
      title: '1. Setting Up a Scene, Grid & Map',
      steps: [
        'Use the top Map selector to switch scenes, rename inline with ✏️, or click + Scene to add a new floor/room.',
        'Open 📐 Grid & Map (or the Map/IO tab) to adjust Grid Square Size (px), Map Scale (%), X/Y Offset, Grid Opacity, and Ambient Darkness.',
        'Switch to 🧱 Wall / Door to drag walls or doors (Snap Grid optional), click a door to open/close it, or right-click a segment to delete it.'
      ]
    },
    {
      title: '2. Deploying Crawlers, Mobs & Objects',
      steps: [
        'Use the Crawlers tab to create crawlers (manually, via the Creation Wizard, or Random Crawler) and click + Map to deploy them.',
        'Use the Bestiary tab (or the Campaign modal) to filter by neighborhood, inspect stats, and click + Spawn to place mobs (hidden from players by default until revealed).',
        'Use the Objects tab or 🔥 Drop Light tool to place props, hazards, and light sources on the map.'
      ]
    },
    {
      title: '3. Running Combat Rounds (Steps 1–5)',
      steps: [
        'Click Start Combat → to enter Round 1, then step through Declare (1), React (2), Mobs (3), Crawlers (4), and Clean Up (5).',
        'Select a mob in Inspect to declare target arrows (🎯 Declare Target) or execute an attack (⚔️ Execute) with target checkboxes, Evade/Block toggles, and Catcher intercepts.',
        'Use ⚡ Surprise for ambush checks, Mob vs. Mob (Table 8) for monster clashes, and ↩️ Mulligan to revert a token to its turn anchor.'
      ]
    },
    {
      title: '4. Saves, Loot Boxes, Advancement & Online Play',
      steps: [
        'Use 💾 Quicksave or named slots in Map/IO (IndexedDB) to save and reload full states, or export/import Campaign JSON.',
        'Open 🎁 Loot Box to roll and award Bronze–Celestial boxes, or 📈 Advance for level awards, marked skill checks, and grinding montages.',
        'Click 🌐 Share Online to start a WebRTC room, copy the invite link, and share the generated password separately with remote players.'
      ]
    }
  ],
  player: [
    {
      title: '1. Claiming or Creating Your Crawler',
      steps: [
        'Click 🎭 Claim Crawler in the top bar to take control of an existing crawler or deploy one from the roster.',
        'Click + Create New Crawler to launch the 4-step Floor 1 creation wizard (identity/origin, backgrounds & combat focus, stats & vitals, trauma & gear).',
        'Use 🎮 Crawler HUD in the top bar to open or collapse your personal control drawer on the right.'
      ]
    },
    {
      title: '2. Moving on the Grid & Action Points',
      steps: [
        'Drag your claimed crawler token on the map; tactical range rings and distance badges preview 10ft steps, single moves, and dashes.',
        'Watch your ⚡ AP counter and current combat step—Step 2 (React) restricts movement to an interrupt step, while Step 4 (Crawlers) allows full movement and actions.',
        'Use 🟢 Adv / Norm / 🔴 Dis in your control deck when a roll mode applies.'
      ]
    },
    {
      title: '3. Using Hotlist, Learned Abilities, R0 Skills & Items',
      steps: [
        '⚡ Hotlist gives quick access to your 10 bound slots (skills, spells, untrained skills, or items)—click an empty slot to assign or a filled slot to target and act.',
        '📖 Learned filters your combat skills, utility skills, and spells; 🎲 R0 lets you attempt untrained active skills (at Disadvantage with 0 skill bonus).',
        '🎒 Items tracks your inventory and gold, lets you open loot boxes or loot fallen mobs when available, and 📋 Sheet shows your stats, notes, and unspent stat points.'
      ]
    },
    {
      title: '4. Defending Yourself & Reading the Map',
      steps: [
        'When mobs declare attacks against you, a 🎯 YOU ARE BEING TARGETED card appears—click 🛡️ Evade ALL Incoming during the reaction window to evade.',
        'Hover over buffs, debuffs, skills, or spells to read their full rules and rank upgrades.',
        'Fog of war reveals explored areas as darkened memory unless the minimap is offline; ghost markers show where previously seen mobs were last spotted.'
      ]
    }
  ]
};

const TOUR_STEPS_GM = [
  {
    selector: '#phasePillsContainer',
    title: 'Round & 5-Step Combat Tracker',
    text: 'Track the current Dungeon Floor, Round number, and the 5 combat steps (Declare, React, Mobs, Crawlers, Clean Up). Use ⚡ Surprise for opener checks and Next Phase → to advance.'
  },
  {
    selector: '#collapseClockDisplay',
    title: 'Collapse Clock & Rest Controls',
    text: 'Monitor remaining time before floor collapse and trigger +1h Idle, Short (2h), Long (8h), or Full Day (30h) party rests with automatic HP, MP, and condition updates.'
  },
  {
    selector: '#floatingMapTools',
    title: 'Map Tools, Walls, Lights & Grid Calibrator',
    text: 'Switch between Select/Move, Wall/Door drawing, Drop Light, and Ruler. Use 📐 Grid & Map to align grid squares and darkness, and 🌫️ Reset Fog to clear explored memory.'
  },
  {
    selector: '#gmControlDrawer',
    title: 'GM Control Deck Tabs',
    text: 'Inspect selected tokens and resolve attacks in Inspect, manage Crawlers and Bestiary mobs, drop Objects, browse Skills/Spells/Buffs/Debuffs, or configure Saves, PINs, Sheets, and JSON in Map/IO.'
  },
  {
    selector: '#gmCampaignBtn',
    title: 'Campaign, Advancement & Loot Modals',
    text: 'Open 🗺️ Campaign for neighborhood quarters, NPCs, traps, and tables; 📈 Advance for levels, skill-up checks, and grinding; and 🎁 Loot Box to generate and award loot.'
  },
  {
    selector: '#hostOnlineRoomBtn',
    title: 'Player HUD, Pop-Out & Online Sync',
    text: 'Open a local Pop-Out Player window, toggle the Player HUD overview, or click 🌐 Share Online to host a password-protected room for remote players.'
  }
];

const TOUR_STEPS_PLAYER = [
  {
    selector: '#claimCrawlerBtn',
    title: 'Claim or Create Your Crawler',
    text: 'Use this button anytime to claim an available crawler on the map, switch characters, or open the Floor 1 creation wizard.'
  },
  {
    selector: '#canvasWrapper',
    title: 'Battle Map, Fog of War & Movement',
    text: 'Drag your crawler token to move across the grid. Walls and closed doors block line of sight, darkness shapes visibility, and ghost markers show last-seen mob spots.'
  },
  {
    selector: '#playerControlDeck',
    title: 'Your Crawler Control Deck',
    text: 'Use ⚡ Hotlist for 10 quick-access slots, 📖 Learned for all your skills and spells, 🎲 R0 for untrained active skills, 🎒 Items for gear/loot, and 📋 Sheet for stats and notes.'
  },
  {
    selector: '#playerHudCrawlers',
    title: 'Party & Hostiles Status Bars',
    text: 'Monitor health pips, shield pips, mana, AP, illumination, and active buffs/debuffs across the party and visible hostiles.'
  }
];

let guideModalState = {
  tab: 'howto', // 'howto' | 'compendium'
  role: IS_PLAYER_WINDOW ? 'player' : 'gm',
  chapterId: 'ch_combat_loop',
  search: ''
};

let tourState = {
  active: false,
  index: 0,
  steps: []
};

function openHowToModal(initialTab = 'howto') {
  guideModalState.tab = ['howto', 'compendium'].includes(initialTab) ? initialTab : 'howto';
  guideModalState.role = IS_PLAYER_WINDOW ? 'player' : guideModalState.role;
  const modal = document.getElementById('howToCompendiumModal');
  if (modal) modal.classList.remove('hidden');
  renderHowToCompendiumModal();
}

function closeHowToModal() {
  const modal = document.getElementById('howToCompendiumModal');
  if (modal) modal.classList.add('hidden');
}

function setGuideModalTab(tab) {
  guideModalState.tab = tab;
  renderHowToCompendiumModal();
}

function setGuideRoleTab(role) {
  guideModalState.role = role === 'player' ? 'player' : 'gm';
  renderHowToCompendiumModal();
}

function setCompendiumChapter(chapterId) {
  guideModalState.chapterId = chapterId;
  renderHowToCompendiumModal();
}

function renderHowToCompendiumModal() {
  const body = document.getElementById('howToCompendiumBody');
  if (!body) return;

  const isComp = guideModalState.tab === 'compendium';
  const topTabs = `
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
      <div class="flex items-center gap-1.5">
        <button type="button" onclick="setGuideModalTab('howto')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${!isComp ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">📖 How To Guide</button>
        <button type="button" onclick="setGuideModalTab('compendium')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${isComp ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">📚 Rules Compendium</button>
      </div>
      <button type="button" onclick="closeHowToModal(); startGuidedTour();" class="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-200 font-bold text-xs transition">
        🎓 Start Interactive Tour
      </button>
    </div>
  `;

  if (!isComp) {
    const role = guideModalState.role || 'gm';
    const blocks = HOW_TO_GUIDES[role] || HOW_TO_GUIDES.gm;
    body.innerHTML = `
      ${topTabs}
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          ${!IS_PLAYER_WINDOW ? `<button type="button" onclick="setGuideRoleTab('gm')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${role === 'gm' ? 'bg-amber-500/25 border border-amber-400 text-amber-200' : 'bg-dungeon-950 text-slate-400 border border-slate-800'}">🛠️ GM Guide</button>` : ''}
          <button type="button" onclick="setGuideRoleTab('player')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${role === 'player' ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200' : 'bg-dungeon-950 text-slate-400 border border-slate-800'}">🦸 Player Guide</button>
        </div>
        <span class="text-[10px] font-mono text-slate-400">Tip: Hover buffs, debuffs & abilities for details</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        ${blocks.map(b => `
          <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <div class="font-bold text-xs text-amber-300">${escapeHtmlAttr(b.title)}</div>
            <ul class="space-y-1 text-[11px] text-slate-300 leading-snug list-disc pl-4">
              ${b.steps.map(s => `<li>${escapeHtmlAttr(s)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
    return;
  }

  const q = String(guideModalState.search || '').trim().toLowerCase();
  const activeChId = guideModalState.chapterId || RULES_COMPENDIUM_CHAPTERS[0].id;
  const activeCh = RULES_COMPENDIUM_CHAPTERS.find(c => c.id === activeChId) || RULES_COMPENDIUM_CHAPTERS[0];

  const matchingChapters = q
    ? RULES_COMPENDIUM_CHAPTERS.map(ch => {
        const filteredSecs = ch.sections.filter(sec =>
          sec.heading.toLowerCase().includes(q) ||
          sec.body.toLowerCase().includes(q) ||
          ch.title.toLowerCase().includes(q)
        );
        return { ...ch, filteredSecs };
      }).filter(ch => ch.filteredSecs.length > 0)
    : [{ ...activeCh, filteredSecs: activeCh.sections }];

  const activeElId = document.activeElement?.id;
  const selPos = document.activeElement?.selectionStart;

  body.innerHTML = `
    ${topTabs}
    <div class="flex flex-wrap items-center gap-1.5">
      ${RULES_COMPENDIUM_CHAPTERS.map(ch => `
        <button type="button" onclick="guideModalState.search=''; setCompendiumChapter('${ch.id}')" class="px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition ${!q && ch.id === activeCh.id ? 'bg-cyan-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-700'}">
          ${escapeHtmlAttr(ch.num)}: ${escapeHtmlAttr(ch.title)}
        </button>
      `).join('')}
    </div>
    <div>
      <input id="compendiumSearchInput" type="text" value="${escapeHtmlAttr(guideModalState.search || '')}" oninput="guideModalState.search=this.value; renderHowToCompendiumModal()" placeholder="Search rules (e.g. evade, crit, swarm, stat, fog, grind, shield)..." class="w-full bg-dungeon-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none" />
    </div>
    <div class="space-y-3 max-h-[56vh] overflow-y-auto pr-0.5">
      ${matchingChapters.length === 0
        ? '<div class="text-xs text-slate-500 italic text-center py-6">No matching rules found. Try another keyword or clear search.</div>'
        : matchingChapters.map(ch => `
          <div class="space-y-2">
            <div class="bg-dungeon-950/90 border border-cyan-500/30 rounded-xl px-3 py-2">
              <div class="font-display font-bold text-xs text-cyan-300 uppercase tracking-wider">${escapeHtmlAttr(ch.num)} — ${escapeHtmlAttr(ch.title)}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtmlAttr(ch.summary)}</div>
            </div>
            ${ch.filteredSecs.map(sec => `
              <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-1">
                <div class="font-bold text-xs text-amber-200">${escapeHtmlAttr(sec.heading)}</div>
                <p class="text-[11.5px] text-slate-200 leading-relaxed">${escapeHtmlAttr(sec.body)}</p>
              </div>
            `).join('')}
          </div>
        `).join('')
      }
    </div>
  `;

  if (activeElId === 'compendiumSearchInput') {
    const inp = document.getElementById('compendiumSearchInput');
    if (inp) {
      inp.focus();
      if (typeof selPos === 'number') inp.setSelectionRange(selPos, selPos);
    }
  }
}

function clearTourHighlight() {
  document.querySelectorAll('.vtt-tour-highlight').forEach(el => {
    el.classList.remove('vtt-tour-highlight');
  });
}

function startGuidedTour() {
  if (IS_PLAYER_WINDOW && !uiState.playerDeckOpen && typeof togglePlayerControlDeck === 'function') {
    togglePlayerControlDeck();
  }
  const rawSteps = IS_PLAYER_WINDOW ? TOUR_STEPS_PLAYER : TOUR_STEPS_GM;
  const visibleSteps = rawSteps.filter(st => {
    const el = document.querySelector(st.selector);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  if (visibleSteps.length === 0) {
    showVttToast('No visible tour targets on screen right now.');
    return;
  }
  tourState = { active: true, index: 0, steps: visibleSteps };
  renderGuidedTourStep();
}

function stopGuidedTour() {
  tourState.active = false;
  clearTourHighlight();
  const overlay = document.getElementById('guidedTourOverlay');
  if (overlay) overlay.classList.add('hidden');
}

function stepGuidedTour(delta) {
  if (!tourState.active || tourState.steps.length === 0) return;
  const nextIdx = tourState.index + delta;
  if (nextIdx < 0) return;
  if (nextIdx >= tourState.steps.length) {
    stopGuidedTour();
    showVttToast('🎓 Tour complete! Open 📖 How To anytime for guides & rules.');
    return;
  }
  tourState.index = nextIdx;
  renderGuidedTourStep();
}

function renderGuidedTourStep() {
  const overlay = document.getElementById('guidedTourOverlay');
  const card = document.getElementById('guidedTourCard');
  if (!overlay || !card || !tourState.active) return;

  clearTourHighlight();
  const step = tourState.steps[tourState.index];
  if (step?.selector === '#playerControlDeck' && IS_PLAYER_WINDOW && !uiState.playerDeckOpen && typeof togglePlayerControlDeck === 'function') {
    togglePlayerControlDeck();
  }
  const targetEl = step ? document.querySelector(step.selector) : null;
  const isFullCanvasTarget = step?.selector === '#canvasWrapper';
  if (targetEl && !isFullCanvasTarget) {
    targetEl.classList.add('vtt-tour-highlight');
  }

  overlay.classList.remove('hidden');

  const rect = targetEl ? targetEl.getBoundingClientRect() : null;
  const cardW = Math.min(360, window.innerWidth - 32);
  let left = Math.max(16, (window.innerWidth - cardW) / 2);
  let top = Math.max(76, (window.innerHeight - 210) / 2);

  if (rect && !isFullCanvasTarget) {
    if (rect.bottom + 195 < window.innerHeight) {
      top = rect.bottom + 12;
      left = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left));
    } else if (rect.top - 195 > 56) {
      top = rect.top - 185;
      left = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left));
    } else if (rect.left - cardW - 16 > 16) {
      left = rect.left - cardW - 14;
      top = Math.max(72, Math.min(window.innerHeight - 210, rect.top));
    }
  } else if (rect && isFullCanvasTarget) {
    // Center inside the visible battle map area so it never clips off-screen
    left = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left + (rect.width - cardW) / 2));
    top = Math.max(76, Math.min(window.innerHeight - 220, rect.top + (rect.height - 190) / 2));
  }

  // Final viewport safety clamp so the tour popup can never go off any edge
  left = Math.max(16, Math.min(window.innerWidth - cardW - 16, left));
  top = Math.max(64, Math.min(window.innerHeight - 220, top));

  card.style.width = `${cardW}px`;
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;

  const isFirst = tourState.index === 0;
  const isLast = tourState.index === tourState.steps.length - 1;

  card.innerHTML = `
    <div class="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
      <span class="text-[10px] font-mono uppercase font-bold text-emerald-400">🎓 Tour Step ${tourState.index + 1} of ${tourState.steps.length}</span>
      <button type="button" onclick="stopGuidedTour()" class="text-slate-400 hover:text-slate-200 text-xs font-bold px-1">✕</button>
    </div>
    <div class="font-bold text-sm text-amber-300 mb-1">${escapeHtmlAttr(step.title)}</div>
    <p class="text-xs text-slate-200 leading-relaxed mb-3">${escapeHtmlAttr(step.text)}</p>
    <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
      <button type="button" onclick="stopGuidedTour()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold">Skip</button>
      <div class="flex items-center gap-1.5">
        <button type="button" ${isFirst ? 'disabled' : ''} onclick="stepGuidedTour(-1)" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-semibold">← Prev</button>
        <button type="button" onclick="stepGuidedTour(1)" class="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold">${isLast ? 'Finish ✓' : 'Next →'}</button>
      </div>
    </div>
  `;
}
