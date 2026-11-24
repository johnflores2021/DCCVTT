// =========================================================================
// CAMPAIGN NEIGHBORHOOD PACKS & GM REFERENCE DECK
// Modular Floor/Neighborhood Data + One-Click Spawners, Achievements & Tables
// =========================================================================

const CAMPAIGN_NEIGHBORHOODS = [
{
    id: 'nb_neon_sinkhole_flats',
    name: 'Neon Sinkhole Flats',
    floor: 1,
    tagline: 'Collapsed Strip-Mall Basin • Flickering Signs, Scavenger Gangs & Acid Runoff',
    overview: 'A sunken crater of buckled asphalt, shattered skylights, and buzzing neon billboards wired directly into the floor’s power conduits. Scavenger gangs and mutated vermin fight over salvageable copper, batteries, and rations while slick pools of chemical runoff eat away at careless boots.',
    environment: 'Sunken retail basin with cracked blacktop, rusted rebar columns, and overhanging sign frames. Flickering neon tubes cast alternating bright and dim light zones; slick chemical puddles create difficult terrain.',
    strongStarts: [
      {
        title: 'Signboard Short-Circuit & Scavenger Skirmish',
        text: 'A massive buzzing sign flickers violently above a collapsed awning as two scavenger mobs clash over a crate of flares and scrap—drawing attention from nearby stalkers when sparks rain down.'
      },
      {
        title: 'Flooded Arcade Safe-Nook',
        text: 'Crawlers spot a dry ticket booth behind a chain-link gate with a flickering CRT screen and a stash of tokens, just as acid-slicked vermin skitter out of the floor drains.'
      }
    ],
    storyArcs: [
      {
        title: 'The Dead Drop at Circuit Pawn',
        text: 'A half-buried courier satchel points to a locked storage shutter in the flats holding a coded passkey and salvaged batteries—provided crawlers survive the turf war protecting the alley.'
      },
      {
        title: 'Grid-Tap Sabotage',
        text: 'A local tinkerer wants the party to trip three junction breakers across the flats to cut power to a fortified nest, or reroute the surge to fry the hazards inside.'
      }
    ],
    debuffs: [
      {
        id: 'deb_acid_sizzle',
        name: 'Acid Sizzle',
        category: 'Chemical / DoT',
        duration: 'Until rinsed or 3 rounds',
        color: '#a3e635',
        description: 'Corrosive runoff eats into gear and skin. Target takes 1d6+F Acid damage at the end of each round unless washed off.'
      },
      {
        id: 'deb_neon_dazzle',
        name: 'Neon Dazzle',
        category: 'Sensory / Vision',
        duration: '1 Round',
        color: '#f472b6',
        description: 'Strobe-like neon glare blurs depth perception. Roll ranged attacks and sight checks with Disadvantage until the end of the round.'
      }
    ],
    mobs: [
      {
        templateId: 'tpl_spark_skitterer',
        name: 'Spark Skitterer',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Neon Sinkhole Flats',
        quarter: 'Signboard Row',
        classification: 'Mob; Small (3), Mutated Vermin',
        level: 2,
        maxPips: 3,
        hpPerPip: 2,
        pipValues: [2, 2, 2],
        maxMana: 0,
        surprise: '12+F',
        evade: '13+F',
        move: '30+S',
        dr: '1',
        stats: { Str: '2 (+1)', Int: '2 (+1)', Con: '3 (+2)', Dex: '6 (+3)', Cha: '1 (+1)' },
        lightRadiusFt: 10,
        iconSymbol: '⚡',
        color: '#facc15',
        lore: 'Wire-whiskered scavengers nesting inside high-voltage sign housings that discharge static arcs when cornered.',
        aiCommentary: 'Free surge protector—assuming you enjoy getting tased by an overgrown sewer roach.',
        attacks: [
          {
            name: 'Arc Nip',
            hitBonus: '12+F',
            rangeFt: 5,
            damage: '1d6+2 Electric',
            special: 'On an Evade Major Fail or worse, target gains Shocked.'
          }
        ],
        notes: 'Skitters along walls and sign trusses; sheds a 10ft static glow.'
      },
      {
        templateId: 'tpl_slag_bruiser',
        name: 'Slag Bruiser',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Neon Sinkhole Flats',
        quarter: 'Runoff Basin',
        classification: 'Mob; Large (5), Mutated Brute',
        gridSpan: 2,
        level: 4,
        maxPips: 5,
        hpPerPip: 3,
        pipValues: [3, 3, 3, 3, 3],
        maxMana: 0,
        surprise: '11+F',
        evade: '11+F',
        move: '20+S',
        dr: '2',
        stats: { Str: '8 (+3)', Int: '2 (+1)', Con: '7 (+3)', Dex: '3 (+2)', Cha: '2 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🪨',
        color: '#84cc16',
        lore: ' Hulking scrap-encrusted brute wadinng through chemical sumps with a heavy pipe maul.',
        aiCommentary: 'Big, angry, and dripping battery acid. Keep your distance or bring something heavy.',
        attacks: [
          {
            name: 'Pipe Slam',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d8+3 Bludgeoning',
            special: 'On an Evade Major Fail or worse, target gains Take Down.'
          },
          {
            name: 'Sludge Lob',
            hitBonus: '11+F',
            rangeFt: 25,
            damage: '1d6+2 Acid (5ft Splash)',
            special: 'Applies Acid Sizzle on failed Evade.'
          }
        ],
        notes: 'Resistant to environmental sludge; cleaves through light cover.'
      },
      {
        templateId: 'tpl_grid_warden_mk1',
        name: 'Grid Warden Mk. I',
        role: 'mob',
        tier: 'Boss',
        neighborhood: 'Neon Sinkhole Flats',
        quarter: 'Substation Bowl',
        classification: 'Neighborhood Boss; Large (5), Construct',
        gridSpan: 2,
        level: 7,
        maxPips: 9,
        hpPerPip: 4,
        pipValues: [4, 4, 4, 4, 4, 4, 4, 4, 4],
        maxMana: 0,
        surprise: '13+F',
        evade: '13+F',
        move: '25+S',
        dr: '2',
        stats: { Str: '9 (+3)', Int: '6 (+3)', Con: '9 (+3)', Dex: '6 (+3)', Cha: '3 (+2)' },
        lightRadiusFt: 25,
        iconSymbol: '🤖',
        color: '#38bdf8',
        lore: 'A patched-together security chassis wired to a buzzing transformer backpack, patrolling the central substation bowl.',
        aiCommentary: 'Maintenance bot turned territorial bouncer. Watch the arc discharge when its coils heat up.',
        attacks: [
          {
            name: 'Arc Whip',
            hitBonus: '14+F',
            rangeFt: 15,
            damage: '1d10+3 Electric',
            special: 'Pulls or shocks targets on failed Evade.'
          },
          {
            name: 'Transformer Pulse',
            hitBonus: '13+F',
            rangeFt: 20,
            damage: '1d8+3 Electric (10ft Burst)',
            special: 'Area discharge around the chassis.'
          }
        ],
        notes: 'Boss Mechanics: Sheds 25ft bright light; sparks warn of high-voltage bursts.'
      }
    ],
    quarters: [
      {
        id: 'q_signboard_row',
        name: 'Signboard Row',
        summary: 'Narrow strip-mall walkway crowded with fallen marquee frames, buzzing neon tubes, and scavenger tripwires.',
        mobTemplateIds: ['tpl_spark_skitterer'],
        beats: [
          'Flickering marquee casts shifting light and shadows; Spark Skitterers drop from overhead conduits.',
          'Salvageable copper wiring and intact bulbs can be pulled with engineering or fabrication checks.'
        ]
      },
      {
        id: 'q_runoff_basin',
        name: 'Runoff Basin',
        summary: 'Lowered parking sump pooling with stinging chemical runoff and half-submerged concrete barriers.',
        mobTemplateIds: ['tpl_slag_bruiser'],
        beats: [
          'Wading through deep pools risks Acid Sizzle unless crawlers use high ground or protective gear.',
          'Slag Bruisers guard a rusted supply van wedged against a ramp.'
        ]
      },
      {
        id: 'q_substation_bowl',
        name: 'Substation Bowl (Boss Arena)',
        summary: 'Circular concrete pit ringed by heavy power cables and humming capacitor banks.',
        mobTemplateIds: ['tpl_grid_warden_mk1', 'tpl_spark_skitterer'],
        isBossRoom: true,
        beats: [
          'Grid Warden Mk. I patrols the central transformer pad backed by Spark Skitterers.',
          'Shooting or tripping exposed junction boxes can disrupt or ground hazards in the arena.'
        ]
      }
    ],
    npcs: [
      {
        id: 'npc_jinx_splicer',
        name: 'Jinx',
        iconSymbol: '🔧',
        color: '#22d3ee',
        level: 4,
        subtitle: 'Scavenger Wire-Tapper • Human',
        bio: 'Hiding behind a reinforced vending machine in Signboard Row, trading power tips and map shortcuts for scrap or protection.',
        aiCommentary: 'Knows every live wire on the block—mostly because she’s been shocked by half of them.'
      }
    ],
    traps: [
      {
        id: 'trap_live_cable_snare',
        name: 'Exposed High-Voltage Cable',
        iconSymbol: '⚡',
        color: '#facc15',
        category: 'Hazard / Trap',
        notes: 'Frayed power line whipping across a walkway. Dex/Evade check or take Electric damage and Shocked.'
      }
    ],
    items: [
      {
        id: 'prop_junction_box',
        name: 'Breaker Junction Box',
        iconSymbol: '🔌',
        color: '#38bdf8',
        category: 'Interactive / Prop',
        notes: 'Heavy metal relay box. Can be thrown to draw attention, used as cover, or rewired.'
      }
    ],
    achievements: [
      {
        id: 'ach_short_circuit',
        name: 'Short Circuit',
        quote: 'You poked the high-voltage furniture and lived to complain about the static.',
        rewardText: 'Bronze Loot Box',
        boxTier: 'bronze',
        boxTitle: 'Bronze Loot Box',
        guaranteedItem: null
      }
    ],
    grindingComplications: [
      { roll: '1–5', text: 'A nearby transformer pops, bathing the alley in sparks and drawing a patrol of Spark Skitterers.' },
      { roll: '6–20', text: 'Quiet salvage window—pick through scrap without immediate trouble.' }
    ],
    moods: [
      {
        prompt: 'A buzzing neon sign hums in rhythm with footsteps echoing from the runoff basin.',
        outcome: 'Tension builds; crawlers have a moment to scout lanes or set up ambushes.'
      }
    ]
  },
  {
    id: 'nb_velvet_catacombs',
    name: 'Velvet Catacombs',
    floor: 1,
    tagline: 'Subterranean Ossuary • Velvet Drapery, Crypt Walkers & Whispering Niches',
    overview: 'Beneath the polished stone and neon lies an older, quieter layer of tiered burial alcoves, moth-eaten crimson velvet curtains, and narrow stone bridges over dark vaults. Silent stalkers and crypt guardians punish loud movements and careless torchlight.',
    environment: 'Dim subterranean burial galleries with stone pillars, heavy curtains blocking sightlines, and narrow ledges. High ambient gloom rewards careful scouting and controlled light.',
    strongStarts: [
      {
        title: 'Curtained Alcove Ambush',
        text: 'Heavy velvet drapes stir along a quiet gallery as crypt stalkers slip out from behind stone sarcophagi.'
      },
      {
        title: 'Ossuary Bridge Standoff',
        text: 'A narrow stone causeway crosses a shadowed vault where a crypt warden blocks the far archway.'
      }
    ],
    storyArcs: [
      {
        title: 'The Sealed Reliquary',
        text: 'Three burial niches hold clues to unlatching an ornate reliquary at the end of the gallery without triggering its ward.'
      }
    ],
    debuffs: [
      {
        id: 'deb_grave_chill',
        name: 'Grave Chill',
        category: 'Cold / Movement',
        duration: '2 Rounds',
        color: '#38bdf8',
        description: 'Biting tomb air stiffens joints. Movement is reduced by 10ft until warmed or shaken off.'
      }
    ],
    mobs: [
      {
        templateId: 'tpl_crypt_stalker',
        name: 'Crypt Stalker',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Velvet Catacombs',
        quarter: 'Curtained Gallery',
        classification: 'Mob; Medium (4), Undead Stalker',
        level: 3,
        maxPips: 4,
        hpPerPip: 2,
        pipValues: [2, 2, 2, 2],
        maxMana: 0,
        surprise: '13+F',
        evade: '13+F',
        move: '25+S',
        dr: '1',
        stats: { Str: '4 (+2)', Int: '3 (+2)', Con: '4 (+2)', Dex: '6 (+3)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🕯️',
        color: '#a855f7',
        lore: 'Agile crypt prowlers draped in tattered funeral velvet that blend into unlit corners.',
        aiCommentary: 'They don’t breathe, they don’t blink, and they really hate bright lights.',
        attacks: [
          {
            name: 'Raking Talons',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d6+3 Slashing',
            special: 'On an Evade Major Fail or worse, target gains Blood Trail.'
          }
        ],
        notes: 'High stealth in dim or dark corners; strikes quickly from cover.'
      },
      {
        templateId: 'tpl_ossuary_cantor',
        name: 'Ossuary Cantor',
        role: 'mob',
        tier: 'Boss',
        neighborhood: 'Velvet Catacombs',
        quarter: 'Sanctum Vault',
        classification: 'Neighborhood Boss; Large (5), Undead Priest',
        gridSpan: 2,
        level: 7,
        maxPips: 9,
        hpPerPip: 4,
        pipValues: [4, 4, 4, 4, 4, 4, 4, 4, 4],
        maxMana: 12,
        surprise: '12+F',
        evade: '12+F',
        move: '20+S',
        dr: '2',
        stats: { Str: '6 (+3)', Int: '8 (+3)', Con: '8 (+3)', Dex: '4 (+2)', Cha: '7 (+3)' },
        lightRadiusFt: 15,
        iconSymbol: '🔔',
        color: '#c084fc',
        lore: 'Tall robed figure ringing a resonant brass bell inside the sanctum vault, commanding nearby crypt stalkers.',
        aiCommentary: 'When the bell tolls in the dark, nobody has a good time.',
        attacks: [
          {
            name: 'Dirge Toll',
            hitBonus: '13+F',
            rangeFt: 30,
            damage: '1d8+3 Necrotic (10ft Burst)',
            special: 'Resonant chime shakes nearby targets.'
          },
          {
            name: 'Censer Swing',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d8+3 Bludgeoning',
            special: 'Heavy brass censer strike.'
          }
        ],
        notes: 'Boss Mechanics: Coordinates crypt stalkers and punishes clumped positions.'
      }
    ],
    quarters: [
      {
        id: 'q_curtained_gallery',
        name: 'Curtained Gallery',
        summary: 'Lined with floor-to-ceiling velvet hangings and burial niches.',
        mobTemplateIds: ['tpl_crypt_stalker'],
        beats: [
          'Pulling back curtains can reveal safe alcoves, loot, or a waiting stalker.'
        ]
      },
      {
        id: 'q_sanctum_vault',
        name: 'Sanctum Vault (Boss Arena)',
        summary: 'Central burial chamber with a raised dais and tolling bell.',
        mobTemplateIds: ['tpl_ossuary_cantor', 'tpl_crypt_stalker'],
        isBossRoom: true,
        beats: [
          'Ossuary Cantor opens with Dirge Toll while stalkers flank from the side aisles.'
        ]
      }
    ],
    npcs: [
      {
        id: 'npc_bram_archivist',
        name: 'Bram',
        iconSymbol: '📜',
        color: '#38bdf8',
        level: 4,
        subtitle: 'Tomb Chronicler • Human',
        bio: 'Cautious scavenger cataloging inscriptions near the gallery entrance who shares lore on the sanctum.',
        aiCommentary: 'Keeps a notebook full of names nobody else remembers.'
      }
    ],
    traps: [
      {
        id: 'trap_floor_chime_plate',
        name: 'Chime Pressure Tile',
        iconSymbol: '🔔',
        color: '#c084fc',
        category: 'Hazard / Trap',
        notes: 'Loose flagstones ring loudly when stepped on heavily, alerting nearby stalkers.'
      }
    ],
    items: [
      {
        id: 'prop_velvet_bier',
        name: 'Velvet-Draped Bier',
        iconSymbol: '⚰️',
        color: '#a855f7',
        category: 'Cover / Obstacle',
        notes: 'Sturdy stone platform draped in thick velvet; provides cover and can hide a crawler.'
      }
    ],
    achievements: [
      {
        id: 'ach_hush_now',
        name: 'Hush Now',
        quote: 'You cleared the quiet gallery without waking the whole burial wing.',
        rewardText: 'Silver Loot Box',
        boxTier: 'silver',
        boxTitle: 'Silver Loot Box',
        guaranteedItem: null
      }
    ],
    grindingComplications: [
      { roll: '1–5', text: 'Cold mist rolls through the alcoves and a Crypt Stalker tests the perimeter.' },
      { roll: '6–20', text: 'Calm gallery stretch—good pacing for checking gear and notes.' }
    ],
    moods: [
      {
        prompt: 'Distant bell chimes echo softly down the stone corridor.',
        outcome: 'Crawlers sense motion ahead and can prepare defenses or scout.'
      }
    ]
  }
,
{
    id: 'nb_serving_warrens',
    name: 'The Serving Warrens',
    floor: 1,
    tagline: 'Rat-Kin Warrens, Cold Halls & Sewers • Interim MisChief, Rat Prince & Stinkin’ Pete',
    overview: 'Home of an ambitious clan of Rat-kin seeking to supplant Goblins and Kobolds as the default Mob until their former MisChief and rightful heirs were slain—leaving hope pinned on his illegitimate child (the Rat Bastard) guarded by the Interim MisChief.',
    environment: 'Stone walls stained with battle blood, narrow low-ceilinged Tunnels with small side-passages, freezing multi-tier self-storage Cold Halls (Roman numerals, Unit 400 / CD locked by 500, 1, 1000), and 50ft-high by 30ft-wide Sewers with 5ft walkways, slender bridges, and 10ft-deep canals (usually ankle-deep, occasionally 8–9ft).',
    strongStarts: [
      {
        title: 'Fallen Goblin-Bone Crown & Carnage',
        text: 'Goblin and Rat-kin bodies lie scattered with furred hands around green throats and Goblin pineapple pikes in Rat-kin breasts. Ahead, battle still rages beside a gem-studded Goblin-bone crown pooled in blood.'
      },
      {
        title: 'Three-Headed Rat Corpse & Procession Ambush',
        text: 'Crawlers nearly trip over a three-headed Rat-kin corpse as drums beat and voices sing Queen’s “Don’t Stop Me Now.” A Rat Shaman on a Chilly Goat flanked by two Rat Brutes rounds the corner, spots the dead MisChief and crawlers, and charges.'
      }
    ],
    storyArcs: [
      {
        title: 'The Rat Bastard’s Fate',
        text: 'Blamed for slaying the former MisChief, crawlers are attacked on sight by Rat-kin and learn the Rat Bastard—a frightened child—is sole heir to the MisChief title. Slaying him stops mass Goblin slaughter if crawlers stomach killing a child.'
      },
      {
        title: 'The Rat Prince’s Dark Ritual',
        text: 'Son of the former Rat-King (non-hostile unless provoked), the Rat Prince seeks the tails of both parents plus a live Rat Shaman and Rat Brute to perform a dark ritual, ascending as a three-headed Rat King who aids against the MisChief and opens stairwell access.'
      },
      {
        title: 'Bethany Dow’s Recovery',
        text: 'Crawler #9,923,220 Bethany Dow is dazed by grief and loss after the Collapse. Three gentle, caring interactions before the end of the floor help her recover enough to fight back against Borant.'
      }
    ],
    debuffs: [],
    mobs: [
      {
        templateId: 'tpl_chilly_goat',
        name: 'Chilly Goat',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'The Serving Warrens',
        quarter: 'The Cold Halls / Sewers',
        classification: 'Mob; Petite (3), Fanged Goat',
        level: 4,
        maxPips: 4,
        hpPerPip: 3,
        pipValues: [3, 3, 3, 3],
        maxMana: 0,
        surprise: '11+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '5 (+2)', Int: '1 (+1)', Con: '6 (+3)', Dex: '4 (+2)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🐐',
        color: '#38bdf8',
        lore: 'Hardy, fanged snow-world beasts of burden notorious for devouring hungry handlers and unleashing an icy aura in fear or panic.',
        aiCommentary: 'Horns, fangs, or frozen solid—pick your favorite way to go when a Chilly Goat panics.',
        attacks: [
          {
            name: 'Horns',
            hitBonus: '12+F',
            rangeFt: 5,
            damage: '1d6+2 Piercing',
            special: ''
          },
          {
            name: 'Fangs',
            hitBonus: '11+F',
            rangeFt: 5,
            damage: '1d4+3 Piercing',
            special: ''
          },
          {
            name: 'Icy Aura',
            hitBonus: '11+F',
            rangeFt: 15,
            damage: '1d6+3 Ice (15ft Burst)',
            special: 'Once every three rounds.'
          }
        ],
        notes: 'Already Chilly—Immune to Cold Damage. Prefers Being Chilly—Fire deals ×2 damage to Chilly Goats.'
      },
      {
        templateId: 'tpl_fire_fighter',
        name: 'Fire-Fighter',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'The Serving Warrens',
        quarter: 'The Walls / The Tunnels',
        classification: 'Mob; Small (2), Minor Fire Elemental',
        level: 3,
        maxPips: 3,
        hpPerPip: 3,
        pipValues: [3, 3, 3],
        maxMana: 0,
        surprise: '11+F',
        evade: '14+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '1 (+1)', Int: '1 (+1)', Con: '6 (+3)', Dex: '10 (+4)', Cha: '1 (+1)' },
        lightRadiusFt: 15,
        iconSymbol: '🔥',
        color: '#f97316',
        lore: 'Shapeless blobs of living fire summoned from Sheol that serve as persistent foot-soldiers even after their summoner’s death.',
        aiCommentary: 'Not the brightest bulb in the pack, mostly because they’re a literal ball of fire. Bring magic or water.',
        attacks: [
          {
            name: 'Firey Touch',
            hitBonus: '14+F',
            rangeFt: 5,
            damage: '1d6+4 Fire',
            special: ''
          }
        ],
        notes: 'Intangibility—Cannot be harmed by non-Spell damage. Contact with water will destroy this creature immediately.'
      },
      {
        templateId: 'tpl_rat_brute',
        name: 'Rat Brute',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'The Serving Warrens',
        quarter: 'The Walls / The Cold Halls',
        classification: 'Mob; Medium (4), Humanoid',
        level: 4,
        maxPips: 4,
        hpPerPip: 3,
        pipValues: [3, 3, 3, 3],
        maxMana: 0,
        surprise: '11+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '6 (+3)', Int: '1 (+1)', Con: '6 (+3)', Dex: '3 (+2)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🐀',
        color: '#ef4444',
        lore: 'Loyal hulking Rat-kin soldiers in Goblin-skin leather armor with heavy crossbows and vicious mattocks.',
        aiCommentary: 'Bulging eyes, steel-shearing jaws, and zero chill when provoked.',
        attacks: [
          {
            name: 'Knife',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d6+3 Slashing',
            special: 'Roid Rage doubles Stat Mod bonus to damage rolls when triggered.'
          },
          {
            name: 'Crossbow',
            hitBonus: '12+F',
            rangeFt: 50,
            damage: '1d8 Piercing',
            special: ''
          }
        ],
        notes: 'Roid Rage—Volatile to sudden noises, bright lights, or insults: doubles Stat Mod to damage and allows one more attack after 0% HB. Weak-Minded—Hard to Intimidate, but charmed/mind-controlled with Advantage.'
      },
      {
        templateId: 'tpl_rat_hooligan',
        name: 'Rat Hooligan',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'The Serving Warrens',
        quarter: 'The Walls / The Tunnels',
        classification: 'Mob; Petite (3), Rat Hybrid',
        level: 4,
        maxPips: 4,
        hpPerPip: 2,
        pipValues: [2, 2, 2, 2],
        maxMana: 10,
        surprise: '12+F',
        evade: '12+F',
        move: '20+S',
        dr: '2',
        stats: { Str: '3 (+2)', Int: '4 (+2)', Con: '3 (+2)', Dex: '3 (+2)', Cha: '4 (+2)' },
        lightRadiusFt: 0,
        iconSymbol: '🗡️',
        color: '#a855f7',
        lore: 'Clever, quiet Rat-kin trained in both combat and magic—serving as scouts, assassins, ambushers, and healers.',
        aiCommentary: 'The Brute smashes, the Shaman burns, and the Hooligan already knows where you’re standing.',
        attacks: [
          {
            name: 'Longsword',
            hitBonus: '12+F',
            rangeFt: 5,
            damage: '1d8+2 Slashing',
            special: ''
          },
          {
            name: 'Firebolt Spell',
            hitBonus: '12+F',
            rangeFt: 30,
            damage: '1d6+2 Fire',
            special: ''
          },
          {
            name: 'Heal Others Spell',
            hitBonus: 'None',
            rangeFt: 10,
            damage: '−1d4 Heal',
            special: 'Heals one target within 10ft for 1d4 Health Bar slots.'
          }
        ],
        notes: 'Versatile hybrid capable of swordplay, firebolts, trapdoor/corpse ambushes, and healing allies.'
      },
      {
        templateId: 'tpl_rat_shaman',
        name: 'Rat Shaman',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'The Serving Warrens',
        quarter: 'The Walls / The Tunnels',
        classification: 'Mob; Petite (3), Humanoid',
        level: 5,
        maxPips: 5,
        hpPerPip: 2,
        pipValues: [2, 2, 2, 2, 2],
        maxMana: 20,
        surprise: '14+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '1 (+1)', Int: '10 (+4)', Con: '3 (+2)', Dex: '3 (+2)', Cha: '3 (+2)' },
        lightRadiusFt: 15,
        iconSymbol: '🔥',
        color: '#f97316',
        lore: 'Fire-obsessed Rat-kin spellcasters who test initiates by dancing through flames and decorate staves with failed aspirants’ bones.',
        aiCommentary: 'Listen for the hacking cough—then duck before the fire starts flying.',
        attacks: [
          {
            name: 'Clap Cloud Spell',
            hitBonus: '14+F',
            rangeFt: 50,
            damage: '1d4+4 Force (20ft Blast)',
            special: 'On an Evade Major Fail or worse, crawler gains Queasy Debuff.'
          },
          {
            name: 'Firestrike Spell',
            hitBonus: '14+F',
            rangeFt: 30,
            damage: '2d6+4 Fire',
            special: 'Once every other round.'
          },
          {
            name: 'Mini Fireball Spell',
            hitBonus: '14+F',
            rangeFt: 60,
            damage: '1d6+4 Fire (5ft Blast)',
            special: ''
          }
        ],
        notes: 'Obsessed with offensive fire and force spells; announced by dry hacking coughs.'
      },
      {
        templateId: 'tpl_mischief_boss',
        name: 'MisChief, Leader of the Rat-Kin Horde',
        role: 'mob',
        tier: 'Boss',
        neighborhood: 'The Serving Warrens',
        quarter: '10th & Baltimore Intersection (Boss Arena)',
        classification: 'Neighborhood Boss; Large (5), Rat Knight',
        gridSpan: 2,
        level: 7,
        maxPips: 11,
        hpPerPip: 4,
        pipValues: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        maxMana: 0,
        surprise: '13+F',
        evade: '14+F',
        move: '20+S',
        dr: '2',
        stats: { Str: '10 (+4)', Int: '8 (+3)', Con: '10 (+4)', Dex: '10 (+4)', Cha: '8 (+3)' },
        lightRadiusFt: 0,
        iconSymbol: '👑',
        color: '#f43f5e',
        lore: 'Grizzled nearly nine-foot-tall Rat-kin in red pants guarding the Rat Bastard at the above-ground intersection of 10th and Baltimore.',
        aiCommentary: 'Desperate, giant, swinging a massive mattock, hurling manhole covers, and summoning oncoming cars.',
        attacks: [
          {
            name: 'Mattock',
            hitBonus: '14+F',
            rangeFt: 5,
            damage: '2d10+4 Piercing',
            special: 'Heavy melee strike with the MisChief Mattock.'
          },
          {
            name: 'Manhole Cover',
            hitBonus: '14+F',
            rangeFt: 30,
            damage: '2d8+3 Bludgeoning',
            special: 'Hurls a heavy manhole cover.'
          },
          {
            name: 'Traffic Dodger',
            hitBonus: '13+F',
            rangeFt: 30,
            damage: '2d6+3 Bludgeoning (30ft Line)',
            special: 'Leaps atop a traffic light and summons cars driving in a straight line.'
          }
        ],
        notes: 'Boss Mechanics: Emerges above ground at 10th & Baltimore with the Rat Bastard. If Rat Prince completed the ritual, he fights as a three-headed Rat King healing crawlers and blasting the MisChief. On MisChief’s defeat, crawlers decide the Rat Bastard’s fate and a subway stairwell lights up.'
      }
    ],
    quarters: [
      {
        id: 'q_serving_walls',
        name: 'The Walls',
        summary: 'Blood-stained gray stone corridors echoing with ongoing Rat-kin and Goblin battle.',
        mobTemplateIds: ['tpl_rat_brute', 'tpl_rat_shaman', 'tpl_chilly_goat', 'tpl_fire_fighter', 'tpl_rat_hooligan'],
        beats: [
          'Weak Rat Brutes pick through Goblin corpses while a Rat Shaman on a Chilly Goat watches a Fire-Fighter; a hidden Rat Hooligan alerts them if not stealthy.',
          'Michael, a Rat-kin Hooligan outside a saferoom/guild, offers a truce to unseat the MisChief & Rat Bastard in exchange for both late parents’ severed tails, a live Rat Shaman, and a live Rat Brute.',
          'Tapping “Three Blind Mice” on a specific flagstone reveals a sleep potion that lets Rat-kin be added to a crawler’s Inventory for the Floor.'
        ]
      },
      {
        id: 'q_cold_halls',
        name: 'The Cold Halls',
        summary: 'Brightly lit, near-freezing multi-level self-storage complex with Roman-numeral units used as stables, cells, and living spaces.',
        mobTemplateIds: ['tpl_chilly_goat', 'tpl_rat_brute'],
        beats: [
          'Lobby has dead Rat-kin tavern workers, a facility key, and a note: “Took the Bastard to the Sewers to get him to safety. Don’t forget to make sure the trophy room CD is still sealed, DIM!”',
          'Temperature drops sharply as Chilly Goats burst through storage doors followed by more Chilly Goats and Rat Brutes.',
          'Bethany Dow is in an open storage unit tossing junk/vases and conversing erratically while missing her kettle.',
          'Unit 400 (CD) opens with code 500, 1, 1000: frozen severed heads, two knotted Rat-kin tails, and “The Rat-Snatcher 2000” (2× damage to Rodents, used untrained).'
        ]
      },
      {
        id: 'q_serving_tunnels',
        name: 'The Tunnels',
        summary: 'Cramped, dimly lit stone tubules reinforced with timber beams (7–9ft wide, down to a third that) with tiny side-passages and hanging flickering lights.',
        mobTemplateIds: ['tpl_rat_shaman', 'tpl_rat_brute', 'tpl_fire_fighter'],
        beats: [
          'Hacking coughs herald a Rat Shaman + Weak Rat Brutes, followed on Round 2 by a Weak mixed group of Fire-Fighters and Rat Brutes corralling crawlers.',
          'Stinkin’ Pete talks to weeping Bethany Dow about “comfort”; if emerged after “comfort,” crawlers find “Comfort” (enchanted fire-damage snub-nosed revolver needing no bullets, reloaded every 6 shots). If before, Pete flees and Bethany shares hope.'
        ]
      },
      {
        id: 'q_serving_sewers',
        name: 'Sewers',
        summary: 'Spacious ~50ft-high by 30ft-wide sewer with 5ft walkways, slender metal bridges, and 10ft-deep canals (ankle-deep normally, 8–9ft in spots).',
        mobTemplateIds: ['tpl_chilly_goat', 'tpl_fire_fighter', 'tpl_rat_hooligan'],
        beats: [
          'Moderate mixed Rat-kin roll Goblin knuckle-bone dice beside patient Chilly Goats and a patrolling Fire-Fighter; waiting reveals the Rat Bastard escaped through a hatch.',
          'Stinkin’ Pete in an alcove trades directions/rhyme (“Three Blind Mice”) to the right escape hatch if allied against Rat-kin; killing him yields a map and “remember the hymn of the fold rat prophets thrice bound in darkness.”',
          'Only one hatch opens—by knocking in time to “Three Blind Mice.”'
        ]
      },
      {
        id: 'q_serving_boss',
        name: 'Boss Chamber: 10th & Baltimore (MisChief)',
        summary: 'Above-ground night intersection (10th and Baltimore) with fake stars, high-rises, parking garage, and library.',
        mobTemplateIds: ['tpl_mischief_boss'],
        isBossRoom: true,
        beats: [
          'Read-Aloud: “B-B-B-Boss Battle! One group seeks escape. The other? Cold-blooded muuuurderrrr!”',
          'Tactics: MisChief (Lvl 7, ~9ft tall in red pants) swings his MisChief Mattock, hurls manhole covers, and leaps atop a traffic light summoning oncoming cars.',
          'Ritual & Climax: If aided, the Rat Prince emerges as a three-headed Rat King healing crawlers and attacking MisChief. Defeating MisChief leaves the Rat Bastard behind and lights up a subway stairwell.'
        ]
      }
    ],
    npcs: [
      {
        id: 'npc_stinkin_pete',
        name: 'Stinkin’ Pete',
        iconSymbol: '🧨',
        color: '#22c55e',
        level: 12,
        subtitle: 'Goblin Survivalist • One-Eyed Goblin',
        bio: 'Paranoid one-eyed Goblin survivalist in Chilly Goat hide and a Rat-kin skull helmet, skilled with knives, alchemy, and explosives. Won’t attack enemies of Rat-kin and knows the “Three Blind Mice” hatch clue.',
        aiCommentary: 'Smells worse than Rat-kin and Chilly Goats combined—and that’s maybe the fifth deadliest thing about him.'
      },
      {
        id: 'npc_bethany_dow',
        name: 'Bethany Dow',
        iconSymbol: '💔',
        color: '#f472b6',
        level: 3,
        subtitle: 'Crawler #9,923,220 • Human (No Class Assigned)',
        bio: 'Intelligent crawler reeling from the Collapse and losing her partner Brian. Three compassionate interactions before floor’s end can help her recover.',
        aiCommentary: 'Had it all in normal life until the Collapse—now trying to find her footing through grief.'
      },
      {
        id: 'npc_rat_prince',
        name: 'The Rat Prince',
        iconSymbol: '👑',
        color: '#c084fc',
        level: 5,
        subtitle: 'Rat Prince (Hooligan) • Rightful Heir Claimer',
        bio: 'Son of the slain Rat-King seeking his parents’ tails plus a live Rat Shaman and Rat Brute to perform a dark ritual and become the new Rat King. Neutral unless provoked.',
        aiCommentary: 'Not to be confused with the Rat Bastard—bulging eyes every time he talks about taking back the crown.'
      }
    ],
    traps: [
      {
        id: 'trap_gas_pockets',
        name: 'Gas Pockets',
        iconSymbol: '💨',
        color: '#84cc16',
        category: 'Hazard / Trap',
        notes: 'Invisible methane gas pockets in the Sewers; strong smell warns a Shaman, Hooligan, or Fire-Fighter may ignite them.'
      },
      {
        id: 'trap_murder_holes',
        name: 'Murder Holes',
        iconSymbol: '🏹',
        color: '#f97316',
        category: 'Hazard / Trap',
        notes: 'Wall/ceiling slits across quarters where Rat Brutes fire crossbow bolts or pour scalding liquid.'
      },
      {
        id: 'trap_rat_trapdoors',
        name: 'Trapdoors',
        iconSymbol: '🪤',
        color: '#a855f7',
        category: 'Hazard / Trap',
        notes: 'Concealed trapdoors used by Rat Hooligans and Shamans to slip out behind crawlers and attack.'
      },
      {
        id: 'trap_emptied_unit',
        name: 'Emptied Unit',
        iconSymbol: '🚪',
        color: '#38bdf8',
        category: 'Hazard / Trap',
        notes: 'Cold Halls storage units hiding lurking Rats or Chilly Goats ready to spring out on approach.'
      },
      {
        id: 'trap_fire_pits',
        name: 'Fire Pits',
        iconSymbol: '🔥',
        color: '#ef4444',
        category: 'Hazard / Trap',
        notes: 'Grated floor pits in dark Tunnels from which Fire-Fighters float upward through the grate to ambush.'
      },
      {
        id: 'trap_corpse_trap',
        name: 'Corpse Trap',
        iconSymbol: '🩸',
        color: '#dc2626',
        category: 'Hazard / Trap',
        notes: 'Blood-smeared Rat Hooligans posing among dead Goblins and Rats, attacking as soon as no one looks directly at them.'
      }
    ],
    items: [
      {
        id: 'prop_storage_random_crap',
        name: 'Random Crap (Storage Units)',
        iconSymbol: '🛋️',
        color: '#94a3b8',
        category: 'Container / Loot',
        notes: 'Unemptied Cold Halls storage units holding junk like furniture, makeup, and antiques (no true weapons left behind).'
      }
    ],
    achievements: [
      {
        id: 'ach_rat_regicide_ripoff',
        name: 'Rat Regicide Rip-Off',
        quote: 'You killed a king! Okay, so you didn’t actually kill a king. But his people think you did, and that’s almost as good, right?',
        rewardText: 'C’mon. You didn’t really kill a king, so you don’t really get a reward.',
        boxTier: null,
        boxTitle: '',
        guaranteedItem: null
      },
      {
        id: 'ach_bloodthirsty_butcher',
        name: 'Bloodthirsty Butcher',
        quote: 'Not content with only the reputation of wiping out a Regent, you tried to kill the rightful heir to the crown! You really don’t give a fuck, do you?',
        rewardText: 'Silver Asshole’s Box',
        boxTier: 'silver',
        boxTitle: 'Silver Asshole’s Box',
        guaranteedItem: null
      },
      {
        id: 'ach_merciful_rube',
        name: 'Merciful (Rube)',
        quote: 'You allowed the child of a charismatic, bloodthirsty dictator to go free. I’m sure that won’t come back to bite you in the ass.',
        rewardText: 'Gold Sequelbait Box',
        boxTier: 'gold',
        boxTitle: 'Gold Sequelbait Box',
        guaranteedItem: null
      }
    ],
    grindingComplications: [
      { roll: '1', text: 'A loud shriek leads to a Goblin coated in rapidly cooling molten metal as a Rat-kin Hooligan snickers above and pours more.' },
      { roll: '2', text: 'Six Rat-kin corpses sit around a birthday cake while Bethany Dow sobs happily unwrapping a silver ring and thanking a corpse.' },
      { roll: '3', text: 'Five Rat-kin surround a fire as a sixth thrusts his arm into the flame with a delighted scream and is gifted Shaman robes and staff.' },
      { roll: '4', text: 'An explosion and cackle reveal Goblin Stinkin’ Pete jamming lit dynamite down a severed Rat Brute head and hurling it: “Goblover? Or Ratmeat?”' },
      { roll: '5', text: 'A Rat-kin slips into a hidden passage; following triggers a coughing sound, a massive wall fireball, and an ambush by the Rat Shaman and Rat-kin.' },
      { roll: '6', text: 'Fire rages out of control: Rat-kin (except Shamans) flee, while Fire-Fighters and Rat Shamans aggressively hunt crawlers.' },
      { roll: '7–20', text: 'See Table 2: Tutorial Floor Grinding Complications (p. 13).' }
    ],
    moods: [
      {
        prompt: 'A Rat Shaman stands in a circle of fire, waving you to join him as you approach.',
        outcome: 'Joining gives Fatigued and −2 Mana each while granting the Shaman Advantage for 1 hour (stays in fire until party leaves); refusing triggers a Moderate Rat Hooligan group + the Rat Shaman.'
      },
      {
        prompt: 'You hear the sound of claws scrabbling behind the walls.',
        outcome: 'Crawlers can make an Unopposed Perception Skill Check or Dex Stat Check to avoid an attack and subsequent Debuff from behind the wall.'
      },
      {
        prompt: 'A dry hacking cough echoes through the halls, followed by the sinister scraping of metal on stone.',
        outcome: 'Crawlers can make an Int Stat Check to spot the Murder Hole above them and avoid the attack.'
      }
    ]
  }
,
{
    id: 'nb_bogbricks',
    name: 'Bogbricks',
    floor: 1,
    tagline: 'Red Brickwork, Bayous & Jazz Hall • Hide-Hitter Crib Daddy, Ghost & Mad Driscoll',
    overview: 'Stretching out in red brickwork with dripping water, spiced meat scents mixed with rot and fetid water, and ever-present bass drums speeding up toward the Boss Chamber—split between urban Gaslamp/Cypress Halls and flooded rural Still Waters/Vibrant Walls with 30ft overhead balconies and foliage.',
    environment: '60ft-high red brick corridors with faded yellow, pink, and blue pastel plaster; 30ft-high overhead balconies/foliage second level; standing water in corners and flooded Still Waters (1–4ft deep, 8ft deep around anchored green wood) and Vibrant Walls (dirt, moss, submerged streets, 100ft+ canopy).',
    strongStarts: [
      {
        title: 'Flickering Drums & Pilfering Scat Thugs',
        text: 'Bass drums pound in sync with flickering lights that suddenly go out amid skittering feet; when light returns, Scat Thugs taunt a crawler from high overhead holding a stolen item.'
      },
      {
        title: 'Brackish Ambush & Waving Crawler',
        text: 'Drawn by food smells beside brackish water, a crawler sees another crawler wave ahead—only for a gigantic alligator to rear out, clamp its jaws around the waving crawler’s torso, and drag them under.'
      }
    ],
    storyArcs: [
      {
        title: 'Mad Driscoll’s Gator Vendetta',
        text: 'One-legged Scat Thug hero Mad Driscoll wants Ghost dead after losing a leg to him. Helping slay Ghost earns an enchanted longsword (two Silver magic bonuses), +1 Rank in Longsword after 2 hours, Scat Thug truce, and Scat Thugs turning against the Boss.'
      },
      {
        title: 'Selina & Saving Ghost',
        text: 'Marine biologist Crawler #9,329,440 Selina Poe Deveraux entered the dungeon with an Enchanted Pet Carrier and Enhanced Pet Biscuit to protect Ghost. Helping rescue Ghost and slay Mad Driscoll gains Selina and Ghost as allies against the Boss.'
      },
      {
        title: 'Bonding with Ghost or Reptile Repose',
        text: 'Crawlers can try enticing Ghost with meat/Charisma, using a Potion of Reptile Repose (up to 60h trance), or feeding him an Enhanced Pet Biscuit—though bonding with Ghost provokes Mad Driscoll and clashes with Selina.'
      }
    ],
    debuffs: [
      {
        id: 'deb_stank_rot',
        name: 'Stank Rot',
        category: 'Poison / DoT',
        duration: 'Until Cleansed / Rest',
        color: '#84cc16',
        description: 'Fetid muck and refuse rot the target: take 1d6+F Poison damage at the end of each round.'
      },
      {
        id: 'deb_seduced',
        name: 'Seduced',
        category: 'Mental / Compulsion',
        duration: 'Next 2 Actions',
        color: '#f472b6',
        description: 'Smitten by a Trash Princess’s Seduction (Int Stat Check vs DC 14 to resist): must spend next two Actions on ill-fated Persuasion Skill Checks.'
      },
      {
        id: 'deb_stuck',
        name: 'Stuck',
        category: 'Action / Reaction',
        duration: 'Until Combat Ends',
        color: '#f59e0b',
        description: 'Hit by Hide-Hitter Crib Daddy’s Stick-Click: cannot perform Interrupt Actions until the combat ends.'
      }
    ],
    mobs: [
      {
        templateId: 'tpl_gobblin_gator',
        name: 'Gobblin’ Gator',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Bogbricks',
        quarter: 'Still Waters',
        classification: 'Mob; Petite (3), Animal',
        level: 2,
        maxPips: 2,
        hpPerPip: 1,
        pipValues: [1, 1],
        maxMana: 0,
        surprise: '11+F',
        evade: '11+F',
        move: '10+S',
        dr: '2',
        stats: { Str: '6 (+3)', Int: '1 (+1)', Con: '1 (+1)', Dex: '2 (+1)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🐊',
        color: '#22c55e',
        lore: 'Half-sized gators with oversized jaws and terrible dental hygiene lurking near water in Still Waters; ungainly on land but swift in water.',
        aiCommentary: 'Small body, massive maw, and zero dental care—keep your shins out of the water.',
        attacks: [
          {
            name: 'Bite',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d6+3 Piercing',
            special: 'On an Evade Major Fail or worse, crawler gains Sepsis Debuff.'
          },
          {
            name: 'Tail Thrash',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d8+3 Bludgeoning',
            special: 'On an Evade Major Fail or worse, crawler gains Take Down Debuff.'
          }
        ],
        notes: 'Swim—Moves twice as fast through water as on ground.'
      },
      {
        templateId: 'tpl_gnawtria',
        name: 'Gnawtria',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Bogbricks',
        quarter: 'Vibrant Walls',
        classification: 'Mob; Petite (3), Animal',
        level: 3,
        maxPips: 3,
        hpPerPip: 2,
        pipValues: [2, 2, 2],
        maxMana: 0,
        surprise: '11+F',
        evade: '13+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '3 (+2)', Int: '1 (+1)', Con: '3 (+2)', Dex: '6 (+3)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🦫',
        color: '#dc2626',
        lore: 'Dog-sized amphibious possum-beaver hybrids with prehensile tails and blood-red armor-piercing teeth prowling Vibrant Walls.',
        aiCommentary: 'Blood-red teeth chew right through armor—watch your ankles and face.',
        attacks: [
          {
            name: 'Bite',
            hitBonus: '12+F',
            rangeFt: 5,
            damage: '1d6+2 Piercing (Armor Piercing)',
            special: 'On an Evade Major Fail or worse, crawler gains Poisoned Debuff.'
          }
        ],
        notes: 'Swim—Moves through water as though on ground and treads water in place.'
      },
      {
        templateId: 'tpl_rayzer',
        name: 'Rayzer',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Bogbricks',
        quarter: 'All Quarters (Ceilings & Water)',
        classification: 'Mob; Petite (2), Beastly',
        level: 3,
        maxPips: 3,
        hpPerPip: 2,
        pipValues: [2, 2, 2],
        maxMana: 0,
        surprise: '11+F',
        evade: '13+F',
        move: '20+S',
        dr: '2',
        stats: { Str: '2 (+1)', Int: '1 (+1)', Con: '4 (+2)', Dex: '6 (+3)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: ' stingray',
        color: '#38bdf8',
        lore: 'Floating eyestalk stingrays that cling upside down or underwater for up to 60 hours, firing magic missiles and poison tail stings.',
        aiCommentary: 'If you spot one Rayzer in ambush, look up and around—there are probably two more.',
        attacks: [
          {
            name: 'Magic Missile Spell',
            hitBonus: '11+F',
            rangeFt: 60,
            damage: '1d4+3 Force',
            special: 'Line of Sight range.'
          },
          {
            name: 'Tail Sting',
            hitBonus: '11+F',
            rangeFt: 5,
            damage: '1d4+1 Poison',
            special: 'On an Evade Major Fail or worse, crawler gains The Taint Debuff.'
          }
        ],
        notes: 'Wall Cling—Lands vertically or upside down. Flight—Hovers and moves through air as on ground.'
      },
      {
        templateId: 'tpl_riff_rougher',
        name: 'Riff Rougher',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Bogbricks',
        quarter: 'Cypress Halls',
        classification: 'Mob; Petite (3), Animal',
        level: 4,
        maxPips: 4,
        hpPerPip: 3,
        pipValues: [3, 3, 3, 3],
        maxMana: 0,
        surprise: '11+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '6 (+3)', Int: '1 (+1)', Con: '6 (+3)', Dex: '3 (+2)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🏴‍☠️',
        color: '#f59e0b',
        lore: 'Nearly four-foot-tall coatimundi-headed swordsmen in 1800s garb roaming Cypress Halls with cutlasses and acid breath.',
        aiCommentary: 'Swashbuckling coatimundis with cutlasses and breath that can poison you.',
        attacks: [
          {
            name: 'Breath',
            hitBonus: '13+F',
            rangeFt: 10,
            damage: '1d4+3 Acid (10ft Cone)',
            special: 'On an Evade Major Fail or worse, crawler gains Poisoned Debuff.'
          },
          {
            name: 'Cutlass',
            hitBonus: '14+F',
            rangeFt: 5,
            damage: '1d8+3 Slashing',
            special: ''
          }
        ],
        notes: 'Swordsmen—Expert close-quarters duelist.'
      },
      {
        templateId: 'tpl_scat_thug',
        name: 'Scat Thug',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Bogbricks',
        quarter: 'Gaslamp District',
        classification: 'Mob; Petite (3), Humanoid',
        level: 3,
        maxPips: 3,
        hpPerPip: 1,
        pipValues: [1, 1, 1],
        maxMana: 0,
        surprise: '12+F',
        evade: '13+F',
        move: '30+S',
        dr: '1',
        stats: { Str: '3 (+2)', Int: '3 (+2)', Con: '1 (+1)', Dex: '6 (+3)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🦝',
        color: '#a855f7',
        lore: 'Three-foot-tall raccoon-headed thieves and trappers armed with spears and short bows in the Gaslamp District.',
        aiCommentary: 'Cute beady eyes, foul stench, and sticky fingers—check your pockets.',
        attacks: [
          {
            name: 'Spear',
            hitBonus: '12+F',
            rangeFt: 10,
            damage: '1d8+2 Piercing',
            special: ''
          },
          {
            name: 'Scat Pellet',
            hitBonus: '13+F',
            rangeFt: 30,
            damage: '1d6+3 Bludgeoning',
            special: 'On an Evade Major Fail or worse, crawler gains Stank Rot Debuff (1d6+F Poison/round).'
          }
        ],
        notes: 'Thief—Crawlers starting turn adjacent make Int Check vs DC 10+F+#adjacent thugs or drop/lose a small item on Major Fail+. Trapper—Activates 1 trap within 60ft alongside Action (1d10+F Piercing + Poison, once per trap).'
      },
      {
        templateId: 'tpl_trash_princess',
        name: 'Trash Princess',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Bogbricks',
        quarter: 'Gaslamp District / Cypress Halls',
        classification: 'Mob; Petite (3), Humanoid',
        level: 4,
        maxPips: 6,
        hpPerPip: 2,
        pipValues: [2, 2, 2, 2, 2, 2],
        maxMana: 0,
        surprise: '12+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '1 (+1)', Int: '3 (+2)', Con: '3 (+2)', Dex: '3 (+2)', Cha: '7 (+3)' },
        lightRadiusFt: 0,
        iconSymbol: '👑',
        color: '#ec4899',
        lore: 'Female Scat Thugs outnumbering males 15-to-1, wielding toxic blasts, sonic claps, and seduction.',
        aiCommentary: 'Smells like refuse, hits like a trash compactor, and doesn’t care who gets caught in the blast.',
        attacks: [
          {
            name: 'Eat Trash and Die',
            hitBonus: '13+F',
            rangeFt: 30,
            damage: '1d6+3 Poison (10ft Blast)',
            special: 'On an Evade Major Fail or worse, crawler gains Stank Rot Debuff.'
          },
          {
            name: 'Trash Thunderclap',
            hitBonus: '12+F',
            rangeFt: 15,
            damage: '1d6+3 Force (15ft Cone)',
            special: 'On an Evade Major Fail or worse, pushed back 10ft.'
          },
          {
            name: 'Seduction',
            hitBonus: '12+F',
            rangeFt: 15,
            damage: '1d6+3 Psychic (15ft Cone)',
            special: 'Free Int Stat Check vs DC 14 or Seduced Debuff (next 2 Actions spent on Persuasion checks).'
          }
        ],
        notes: 'Collateral Trashing—Area attacks hitting 3+ entities (friends or foes) deal +1d6 damage to each target.'
      },
      {
        templateId: 'tpl_hide_hitter_crib_daddy',
        name: 'Hide-Hitter Crib Daddy',
        role: 'mob',
        tier: 'Boss',
        neighborhood: 'Bogbricks',
        quarter: 'Cypress Halls Jazz Hall (Boss Arena)',
        classification: 'Neighborhood Boss; Medium (4), Humanoid',
        gridSpan: 2,
        level: 7,
        maxPips: 11,
        hpPerPip: 4,
        pipValues: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        maxMana: 0,
        surprise: '13+F',
        evade: '14+F',
        move: '30+S',
        dr: '1',
        stats: { Str: '6 (+3)', Int: '7 (+3)', Con: '10 (+4)', Dex: '12 (+4)', Cha: '11 (+4)' },
        lightRadiusFt: 0,
        iconSymbol: '🥁',
        color: '#f43f5e',
        lore: 'Oversized raccoon in a blue fedora, red tie, and nothing else laying down jazzy drumbeats in a New Orleans jazz hall backed by Trash Princesses.',
        aiCommentary: 'Keep your ears open for the beat and watch your footing—when the drums speed up, things get messy.',
        attacks: [
          {
            name: 'Pocket Groove',
            hitBonus: '14+F',
            rangeFt: 5,
            damage: '2d6+3 Psychic',
            special: 'Requires drumsticks. On Evade Major Fail+, crawler gains Woozy Debuff.'
          },
          {
            name: 'Downbeat',
            hitBonus: '13+F',
            rangeFt: 30,
            damage: '1d6+3 Sonic (30ft Burst)',
            special: 'Requires drumsticks. On Evade Major Fail+, crawler gains Fatigued Debuff.'
          },
          {
            name: 'Stick-Click',
            hitBonus: '14+F',
            rangeFt: 30,
            damage: '1d6+4 Bludgeoning',
            special: 'Requires drumsticks. On Evade Major Fail+, crawler gains Stuck Debuff (no Interrupts until combat ends).'
          }
        ],
        notes: 'Boss Mechanics: Smelly—Melee Amazing Success+ splashes musk/blood for Sepsis Debuff. Bodies Hit the Floor—Trash Princesses within 10ft while he holds drumsticks get +1d4 dmg and roll 1d6 if other Trash Princesses are near (1 = targets nearest Trash Princess). Daddy’s Princesses—Immune to Trash Princess Area damage. Hide-Hitter—Drum kit within 15ft is a weapon rack (falls back to club/throwing dagger/spear if disarmed; drum kit has 13+F Str DC to pick up and is primary Scat Thug theft target).'
      }
    ],
    quarters: [
      {
        id: 'q_gaslamp_district',
        name: 'The Gaslamp District',
        summary: 'Ancient red brickwork with faded pastel plaster, wide thoroughfares with alleys every 400ft, flickering gas lamps, and 30ft iron balconies.',
        mobTemplateIds: ['tpl_scat_thug', 'tpl_trash_princess', 'tpl_rayzer'],
        beats: [
          'Triggered Scat Thug traps draw cackling thugs down brickwork walls and alert nearby Rayzers.',
          'Parley or Mad Driscoll’s vouch lets crawlers trade food (even non-fresh) with Scat Thugs; impressing them after disarming a trap can grant +1 Rank in Detect Trap.'
        ]
      },
      {
        id: 'q_cypress_halls',
        name: 'Cypress Halls',
        summary: 'Grid of polished wooden hallways with brighter gas lamps, lower ceilings, wooden balconies, barracks, empty storefronts, and the Crib Daddy’s jazz hall.',
        mobTemplateIds: ['tpl_riff_rougher', 'tpl_trash_princess', 'tpl_hide_hitter_crib_daddy'],
        beats: [
          'Rolling floors and louder drums precede an explosive (1d6 Bludgeoning if not moved away) and rope-swinging Riff Roughers demanding gold/valuables.',
          'Selina searches empty storefronts for meat and trades Healing Potions if given meat before asking about a real alligator.',
          'Hide-Hitter Crib Daddy waits behind a second-level door; aiding Mad Driscoll distracts Trash Princesses.'
        ]
      },
      {
        id: 'q_still_waters',
        name: 'Still Waters',
        summary: 'Winding vine-draped brick paths with dappled sunlight and 1–4ft deep brackish standing water (up to 8ft deep near anchored green wood).',
        mobTemplateIds: ['tpl_gobblin_gator', 'tpl_rayzer'],
        beats: [
          'Wading attracts Gobblin’ Gators and Rayzers; makeshift boats risk losing paddles to Mobs.',
          'Mad Driscoll in a makeshift boat hunts an oversized gator after blasting one with an explosive and offers help against the Boss.',
          'Anchored green wood marks ~8ft deep water with a sunken chest holding a Potion of Reptile Repose, enchanted flintlock pistol (+1 Silver), and enchanted eyepatch (+1 Silver).'
        ]
      },
      {
        id: 'q_vibrant_walls',
        name: 'Vibrant Walls',
        summary: 'Maze-like dirt, moss, and flooded streets walled by lush flowers, vines, and a 100ft+ leaf canopy with filtered sunlight.',
        mobTemplateIds: ['tpl_gnawtria', 'tpl_rayzer'],
        beats: [
          'Gnawtria ambush from half-flooded paths, waking Rayzers from the riverbed.',
          'Selina hums in a glade beside a stream and tosses meat to Ghost; declining her Enchanted Pet Carrier request turns her hostile next encounter.',
          'Gnawtria holes can be expanded into human-sized spiral tunnels beneath water to dry areas near saferooms (lots of Gnawtria, no other hazards).'
        ]
      }
    ],
    npcs: [
      {
        id: 'npc_selina_poe',
        name: 'Selina Poe Deveraux',
        iconSymbol: '🐊',
        color: '#22d3ee',
        level: 5,
        subtitle: 'Crawler #9,329,440 (“Selina Poe”) • Human',
        bio: 'Marine biologist and environmental scientist who followed Ghost into the dungeon with an Enchanted Pet Carrier, Enhanced Pet Biscuit, magic spear, and net.',
        aiCommentary: 'Followed an alligator into the World Dungeon—she’ll do almost anything to keep Ghost safe.'
      },
      {
        id: 'npc_mad_driscoll',
        name: 'Mad Driscoll, the Scat Hero',
        iconSymbol: '🗡️',
        color: '#f59e0b',
        level: 6,
        subtitle: 'One-Legged Scat Thug Hero • NPC',
        bio: 'Master trapsmith and folk hero among Scat Thugs who lost a leg to Ghost and wants revenge—willing to bargain, grant +1 Longsword Rank over 2h, or turn Scat Thugs against the Boss.',
        aiCommentary: 'Tough, fast, and nursing a grudge against the dungeon’s only alligator crawler.'
      },
      {
        id: 'npc_ghost_gator',
        name: 'Ghost',
        iconSymbol: '🦎',
        color: '#10b981',
        level: 7,
        subtitle: 'Crawler #9,329,439 • Alligator',
        bio: 'Giant non-sapient Mississippi Delta alligator assigned a crawler number, accustomed to humans, and hunted by Mad Driscoll.',
        aiCommentary: 'Bigger and badder than early-floor expectations—watch your fingers near the water.'
      }
    ],
    traps: [
      {
        id: 'trap_bricktop_barrage',
        name: 'Bricktop Barrage',
        iconSymbol: '🧱',
        color: '#38bdf8',
        category: 'Hazard / Trap',
        notes: 'Gaslamp District tripwires/pressure plates drop blue-painted bricks from above.'
      },
      {
        id: 'trap_pothole_plot',
        name: 'Pothole Plot',
        iconSymbol: '🕳️',
        color: '#f59e0b',
        category: 'Hazard / Trap',
        notes: 'Collapsing floor in Cypress Halls or Vibrant Walls drops crawlers into a hole (risking broken leg and noise attracting Mobs).'
      },
      {
        id: 'trap_shadowfall',
        name: 'Shadowfall',
        iconSymbol: '🕯️',
        color: '#a855f7',
        category: 'Hazard / Trap',
        notes: 'Snuffs lanterns in Cypress Halls or Gaslamp District as Scat Thugs attack in dark and gas fills over 2 rounds before potential ignition.'
      },
      {
        id: 'trap_romeo_render',
        name: 'Romeo Render',
        iconSymbol: '📌',
        color: '#ef4444',
        category: 'Hazard / Trap',
        notes: 'Balcony pillars hide iron spikes triggered when hands grip near them (3 rounds to climb up, 1 round to slide down; damage each round on pillars).'
      },
      {
        id: 'trap_early_rayzer',
        name: 'Early Rayzer',
        iconSymbol: '⚡',
        color: '#22d3ee',
        category: 'Hazard / Trap',
        notes: 'Stepping on a rolled-up Rayzer outside a saferoom trips the crawler as another Rayzer drops from the ceiling toward their head.'
      }
    ],
    items: [
      {
        id: 'prop_bogbricks_chairs',
        name: 'Chairs',
        iconSymbol: '🪑',
        color: '#94a3b8',
        category: 'Interactive / Prop',
        notes: 'Ornate rockers and patio chairs on Gaslamp District iron balconies.'
      },
      {
        id: 'prop_construction_barriers',
        name: 'Construction Barriers',
        iconSymbol: '🚧',
        color: '#f97316',
        category: 'Cover / Obstacle',
        notes: 'Fences, dividers, and bright-orange traffic cones scattered across Bogbricks.'
      },
      {
        id: 'prop_floating_wood',
        name: 'Floating Wood',
        iconSymbol: '🪵',
        color: '#a16207',
        category: 'Interactive / Prop',
        notes: 'Boat pieces, shipping pallets, and house debris floating in Still Waters.'
      },
      {
        id: 'prop_bogbricks_signs',
        name: 'Signs',
        iconSymbol: '🪧',
        color: '#fbbf24',
        category: 'Interactive / Prop',
        notes: 'Political, legal, and local business signage across quarters.'
      },
      {
        id: 'prop_potion_reptile_repose',
        name: 'Potion of Reptile Repose',
        iconSymbol: '🧪',
        color: '#2563eb',
        category: 'Consumable',
        notes: 'Inky blue drink that makes a reptile lethargic and docile for up to 60 hours.'
      }
    ],
    achievements: [
      {
        id: 'ach_bog_bait',
        name: 'Bog Bait',
        quote: 'You tempted fate and stood in still water. Unfortunately for you, still did not mean empty! Better shake a leg if you want to keep the rest of your appendages attached!',
        rewardText: 'Silver Shoe Box',
        boxTier: 'silver',
        boxTitle: 'Silver Shoe Box',
        guaranteedItem: null
      },
      {
        id: 'ach_where_the_wild_things_are',
        name: 'Where the Wild Things Are',
        quote: 'You’ve spotted an earth animal the AI and showrunners did not create. They do wind up in the dungeon from time to time, but they aren’t typically that ungodly large.',
        rewardText: 'You’ve seen nature at its most majestic and terrifying! That’s reward enough.',
        boxTier: null,
        boxTitle: '',
        guaranteedItem: null
      },
      {
        id: 'ach_reality_sets_in',
        name: 'Reality Sets In',
        quote: 'You have slain a living legend. Congratulations! You killed someone who inspired hope (or terror) in people, making their already mundane lives that much more boring.',
        rewardText: 'Gold Mythbuster Box',
        boxTier: 'gold',
        boxTitle: 'Gold Mythbuster Box',
        guaranteedItem: null
      },
      {
        id: 'ach_distracted_daddy',
        name: 'Distracted Daddy',
        quote: 'You killed a Neighborhood Boss by causing enough pandemonium to steal his focus. Then you took advantage of his distractible nature and killed him. Kind of a dick move, bro.',
        rewardText: 'Gold Asshole Box',
        boxTier: 'gold',
        boxTitle: 'Gold Asshole Box',
        guaranteedItem: null
      }
    ],
    grindingComplications: [
      { roll: '1', text: 'A fleeing Mob wanders too close to the water and is devoured by Ghost, who stares daringly before sliding back into the water.' },
      { roll: '2', text: 'Drums speed up as the party retreats; a crawler trips over a concealed Rayzer into the water as something surfaces.' },
      { roll: '3', text: 'A boiling pond lures crawlers with delicious smells toward a Riff Rougher ambush trying to push them into the stew.' },
      { roll: '4', text: 'A wall explodes outward as Mad Driscoll runs past cackling, chased by Crawler Selina.' },
      { roll: '5', text: 'A frantic male crawler screams about ghosts in the water and drums in the dark while firing automatic gunfire overhead.' },
      { roll: '6', text: 'Crawlers find an open-air mead-only bar where Riff Roughers scramble over to attack another crawler at the bar.' },
      { roll: '7–20', text: 'See Table 2: Tutorial Floor Grinding Complications (p. 13).' }
    ],
    moods: [
      {
        prompt: 'As you round the corner, the smell of delicious food assaults your nose, and you hear a friendly voice calling out, beckoning you closer.',
        outcome: 'Resisting can spot the ambush; otherwise the attack surprises the crawlers.'
      },
      {
        prompt: 'As you move through the ankle-deep water, you feel something brush against your foot.',
        outcome: 'Standing completely still lets the Mob move on; doing anything else triggers a Gobblin’ Gator attack.'
      },
      {
        prompt: 'Every step resounds from the brickwork. Overhead, glowing eyes open in the shadowed heights of the iron balconies.',
        outcome: 'Focusing on the eyes risks a Bricktop Barrage trap; otherwise Scat Thugs strike when backs are turned.'
      },
      {
        prompt: 'The sound of the drums is an ever-present companion, changing in pace, faster and slower. But the worst, by far, is when it drums in a horrific monotone, each new beat pounding at your ears.',
        outcome: 'Plugging or covering ears avoids ill effects; otherwise crawlers gain the Terrified Debuff.'
      },
      {
        prompt: 'This entire area is an ambush hunter’s wet dream.',
        outcome: 'Wading draws Rayzers and Gobblin’ Gators; makeshift boats can lose paddles and leave crawlers vulnerable to Rayzers.'
      },
      {
        prompt: 'The crawlers hear Mad Driscoll shouting. As he stands atop a makeshift boat, he lights an explosive and throws it into the water.',
        outcome: 'A Gobblin’ Gator corpse surfaces and Mad Driscoll asks for help hunting a massive gator in exchange for help against the Boss.'
      },
      {
        prompt: 'The Still Waters quarter is dark, and the entire floor is covered in brackish waters.',
        outcome: 'Anchored green wood marks ~8ft deep water with a buried chest holding a Potion of Reptile Repose, enchanted flintlock pistol (+1 Silver), and enchanted eyepatch (+1 Silver).'
      }
    ]
  }
,
  {
    id: 'nb_prickly_pack_alleys',
    name: 'Prickly Pack Alleys',
    floor: 1,
    tagline: 'Tutorial Floor Labyrinth • Pack Tactics, Ambushes & Mutating Barflies',
    overview: 'If every Neighborhood on the First Floor is meant to be a tutorial, this one seems designed to teach crawlers two simple truths: the dungeon isn’t fair, and Mobs will gang up on you. Carved from bluish rock flecked with sparkling green, the twisting hallways have few main thoroughfares and endless cramped alleyways. Packs of vicious Canidnas chase crawlers into ambushes by Homogenous Humors while Barflies lurk in decaying neon-lit nests.',
    environment: 'Uniform bricks and stone carved from glittering bluish-green rock. Wide thoroughfares (car-width) curve subtly to disorient navigation. Narrow 6ft alleyways twist in a labyrinth—crawlers can avoid looping back with an Unopposed Tracking Skill Check or careful mapping.',
    strongStarts: [
      {
        title: 'Six-Alley Canidna Ambush',
        text: 'At a shadowy six-alley intersection, a Weak group of Canidnas leaps from the darkness. Each round, more Canidnas join from the alleys, forcing the party to run deeper into the Neighborhood and stay on the move.'
      },
      {
        title: 'Gunshot & Terri Campion',
        text: 'An ominous buzzing grows louder until a sharp gunshot cuts it off. Ahead stands Terri Campion in a torn police uniform holding a glittering Knight’s Shield and service pistol, wildly asking the party if they’ve been backwashed.'
      }
    ],
    storyArcs: [
      {
        title: 'Terri Campion’s Justice',
        text: 'Former Detroit officer Terri saw a crawler murder another with an enchanted pickaxe and lost them in the Packrooms. If the party finds that crawler (now a Level 5 Barflie in Pack Alley Pall), Terri will guide them to the Boss Chamber and help fight The Bar Render.'
      },
      {
        title: 'The Murdered Kua-Tin',
        text: 'If the party discovers the gunshot-killed Kua-Tin admin corpse, their Game Guide suggests earning goodwill with Borant by identifying the killer—and letting Mobs weaken whoever did it.'
      },
      {
        title: 'Jonai & Missing Apprentice Xaggra',
        text: 'Gnome SYSTEM ERROR Master Jonai is mourning in a saferoom after his apprentice Xaggra vanished toward a buzzing noise. Xaggra is mid-mutation into a Barflie inside a Sprawl nest; administering a Potion of Clarity saves him (though he will attack on sight). Saving Xaggra may resolve the glitch and assign Jonai/Xaggra as the party’s new Game Guide.'
      }
    ],
    debuffs: [
      {
        id: 'deb_washed',
        name: 'Washed',
        category: 'Mutation / Poison',
        duration: 'Until Potion of Clarity',
        color: '#84cc16',
        description: 'Coated in Barflie backwash. If a Washed crawler perishes before drinking a Potion of Clarity, they mutate into a Barflie retaining all Skills and Spells they possessed in life.'
      },
      {
        id: 'deb_blood_trail',
        name: 'Blood Trail',
        category: 'Physical / Tracking',
        duration: 'Until Cleansed / Rest',
        color: '#dc2626',
        description: 'Leaving a vivid scent of blood from Canidna spines. Nearby packs can easily track the crawler through the alleys.'
      },
      {
        id: 'deb_confused',
        name: 'Confused',
        category: 'Mental / Psychic',
        duration: '1 Round',
        color: '#c084fc',
        description: 'Disoriented by psychic interference. The crawler must spend their next Action attacking an ally.'
      },
      {
        id: 'deb_held',
        name: 'Held',
        category: 'Physical / Control',
        duration: 'Until Escaped',
        color: '#f59e0b',
        description: 'Pinned or grabbed in place (0ft movement until escaping the hold).'
      },
      {
        id: 'deb_take_down',
        name: 'Take Down',
        category: 'Physical / Movement',
        duration: 'Until Standing',
        color: '#fb923c',
        description: 'Tripped or knocked flat (Prone). Melee attackers gain Advantage against the target.'
      }
    ],
    mobs: [
      {
        templateId: 'tpl_barflie',
        name: 'Barflie',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Prickly Pack Alleys',
        quarter: 'The Sprawl',
        classification: 'Mob; Medium (4), Mutated Humanoid',
        level: 4,
        maxPips: 4,
        hpPerPip: 2,
        pipValues: [2, 2, 2, 2],
        maxMana: 0,
        surprise: '11+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '6 (+3)', Int: '1 (+1)', Con: '5 (+2)', Dex: '4 (+2)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🪰',
        color: '#84cc16',
        lore: 'Five-and-a-half-foot humanoids with ruby-red compound eyes and dripping proboscises. They travel in packs of 1–3 in the Sprawl, wielding crowbars, bats, and nailed boards.',
        aiCommentary: 'Here’s a fun fact: we only spawned a few thousand of these guys, but there’s at least three times that many now! Watch out for their backwash attack.',
        attacks: [
          {
            name: 'Backwash',
            hitBonus: '12+F',
            rangeFt: 30,
            damage: '1d6+2 Poison',
            special: 'On an Evade Major Fail or worse, the crawler gains the Washed Debuff (mutates into a Barflie on death unless cured with a Potion of Clarity).'
          },
          {
            name: 'Club',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d6+3 Bludgeoning',
            special: ''
          }
        ],
        notes: 'Flight—Barflies can move through the air as though on the ground and hover in place.'
      },
      {
        templateId: 'tpl_canidna',
        name: 'Canidna',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Prickly Pack Alleys',
        quarter: 'Packed Halls',
        classification: 'Mob; Medium (4), Animal',
        level: 3,
        maxPips: 3,
        hpPerPip: 2,
        pipValues: [2, 2, 2],
        maxMana: 0,
        surprise: '11+F',
        evade: '13+F',
        move: '30+S',
        dr: '1',
        stats: { Str: '3 (+2)', Int: '1 (+1)', Con: '3 (+2)', Dex: '6 (+3)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🐺',
        color: '#f97316',
        lore: 'Wolf-like canines covered in jagged spines across their backs and flanks. Hunt in packs of 3–7 exclusively in the Packed Halls.',
        aiCommentary: 'Don’t let their beady little eyes and adorable faces fool you—these spiky bastards want you dead. Never corner a Canidna.',
        attacks: [
          {
            name: 'Bite',
            hitBonus: '12+F',
            rangeFt: 5,
            damage: '1d6+2 Piercing',
            special: ''
          },
          {
            name: 'Spike Ball',
            hitBonus: '12+F',
            rangeFt: 5,
            damage: '1d8+2 Piercing',
            special: 'Only used when cornered or pack halved. On a Major Fail or worse, the crawler gains the Blood Trail Debuff.'
          }
        ],
        notes: 'Pack Hunting—When 2+ Canidna are adjacent to a target with no adjacent allies, the target makes Evade checks with Disadvantage. Desperation—Uses Spike Ball when cornered or pack cut in half.'
      },
      {
        templateId: 'tpl_mirror_cat',
        name: 'Mirror Cat',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Prickly Pack Alleys',
        quarter: 'The Packrooms',
        classification: 'Mob; Small (2), Animal',
        level: 2,
        maxPips: 2,
        hpPerPip: 1,
        pipValues: [1, 1],
        maxMana: 0,
        surprise: '11+F',
        evade: '13+F',
        move: '30+S',
        dr: '1',
        stats: { Str: '1 (+1)', Int: '1 (+1)', Con: '1 (+1)', Dex: '6 (+3)', Cha: '2 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🐱',
        color: '#c084fc',
        lore: 'Hairless Sphinx cats that appear cleanly bisected down the middle when viewed straight on. They phase through spatial holes, shifting between left and right halves.',
        aiCommentary: 'They pop in and out of spatial holes, only showing half of themselves at a time. If you don’t kill them, they multiply exponentially. Hope you were good at Whack-a-Mole.',
        attacks: [
          {
            name: 'Claw',
            hitBonus: '13+F',
            rangeFt: 5,
            damage: '1d6+3 Slashing',
            special: ''
          },
          {
            name: 'Phase Claw',
            hitBonus: '11+F',
            rangeFt: 30,
            damage: '1d4+1 Psychic',
            special: 'On an Evade Major Fail or worse, the crawler gains the Confused Debuff (must spend next Action attacking an ally).'
          }
        ],
        notes: 'At the end of every other round, another Mirror Cat appears until their numbers double the size of the party.'
      },
      {
        templateId: 'tpl_pack_rat',
        name: 'Pack Rat',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Prickly Pack Alleys',
        quarter: 'Packed Halls / Pack Alley Pall',
        classification: 'Mob; Tiny (1), Animal',
        level: 2,
        maxPips: 2,
        hpPerPip: 2,
        pipValues: [2, 2],
        maxMana: 0,
        surprise: '11+F',
        evade: '12+F',
        move: '20+S',
        dr: '1',
        stats: { Str: '1 (+1)', Int: '2 (+1)', Con: '3 (+2)', Dex: '4 (+2)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '🐀',
        color: '#94a3b8',
        lore: 'Giant gray rodents (or silent snow-white red-eyed variants in Pack Alley Pall) ranging up to the size of a medium dog, scavenging corpses across the Neighborhood.',
        aiCommentary: 'Rats. There’s always rats. The bad news is these rats know you’re coming, they know what you’re trying to do, and they’re ready for you.',
        attacks: [
          {
            name: 'Bite',
            hitBonus: '11+F',
            rangeFt: 5,
            damage: '1d4+1 Piercing',
            special: ''
          }
        ],
        notes: 'Ghostly snow-white variants in Pack Alley Pall make no noise and are more aggressive.'
      },
      {
        templateId: 'tpl_humors',
        name: 'Homogenous Humors',
        role: 'mob',
        tier: 'Mob',
        neighborhood: 'Prickly Pack Alleys',
        quarter: 'Packed Halls / Pack Alley Pall',
        classification: 'Mob; Medium (4), Aberration',
        level: 3,
        maxPips: 3,
        hpPerPip: 2,
        pipValues: [2, 2, 2],
        maxMana: 8,
        surprise: '13+F',
        evade: '12+F',
        move: '20+S',
        dr: '2',
        stats: { Str: '1 (+1)', Int: '6 (+3)', Con: '3 (+2)', Dex: '3 (+2)', Cha: '1 (+1)' },
        lightRadiusFt: 0,
        iconSymbol: '👁️',
        color: '#ef4444',
        lore: 'Giant floating eyeballs that lurk in ceiling shadows above torchlight, drifting down in packs of 2–6 to ambush crawlers. Largely immune to ranged and blunt weapons.',
        aiCommentary: 'Silent and vicious, the Homogenous Humors are the literal definition of the “Evil Eye.” If they merge together, you don’t want to “see” what happens.',
        attacks: [
          {
            name: 'Evil Eye',
            hitBonus: '13+F',
            rangeFt: 50,
            damage: '1d6+3 Necrotic',
            special: 'On an Evade Major Fail or worse, the crawler gains the Fatigued Debuff.'
          }
        ],
        notes: 'Flight—Hover in place. Merge—If 2+ are within 5ft, they merge into a single larger creature (+1 hit and +1 damage die per merged creature).'
      },
      {
        templateId: 'tpl_bar_render',
        name: 'The Bar Render',
        role: 'mob',
        tier: 'Boss',
        neighborhood: 'Prickly Pack Alleys',
        quarter: 'The Sprawl (Boss Chamber)',
        classification: 'Neighborhood Boss; Large (5), Humanoid',
        gridSpan: 2,
        level: 8,
        maxPips: 11,
        hpPerPip: 4,
        pipValues: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        maxMana: 0,
        surprise: '14+F',
        evade: '14+F',
        move: '30+S',
        dr: '1',
        stats: { Str: '11 (+4)', Int: '10 (+4)', Con: '11 (+4)', Dex: '11 (+4)', Cha: '6 (+3)' },
        lightRadiusFt: 0,
        iconSymbol: '👩‍⚖️',
        color: '#f43f5e',
        lore: 'Nine-foot-tall older woman in a dusty-gray suit and spectacles holding glasses in each hand. Former public defender turned bartender in “Patti Render’s Beer and Tenders — Bar and Grill.”',
        aiCommentary: 'Once upon a time, Patti crushed the BAR exam and served thirty years as a public defender. Now she’s real done with cleaning up your mess—and ready to lay down the law.',
        attacks: [
          {
            name: 'Fiery Cocktail',
            hitBonus: '14+F',
            rangeFt: 30,
            damage: '1d8+4 Fire (10ft Blast radius)',
            special: 'Explosive Molotov cocktail — 10ft Blast radius.'
          },
          {
            name: 'Punch',
            hitBonus: '14+F',
            rangeFt: 5,
            damage: '2d8+4 Bludgeoning',
            special: 'On an Evade Major Fail or worse, the crawler gains the Held Debuff.'
          }
        ],
        notes: 'Boss Mechanics: Door locks on entry. Two Barflies dressed as bailiffs join her at all times (replenishing up to 2 active) until she is defeated. Final line on death: “The defense… rests.”'
      }
    ],
    quarters: [
      {
        id: 'q_packed_halls',
        name: 'Packed Halls',
        summary: 'Largest & most "normal" quarter. Bluish-green stone, few main thoroughfares, endless narrow offshoot alleys.',
        mobTemplateIds: ['tpl_canidna', 'tpl_pack_rat', 'tpl_humors'],
        beats: [
          'Weak Canidna pack vs. Strong Pack Rats fighting over a dead crawler: Int-Opposed Animal Handling Check (pick one side). Any side with 0 Successes attacks the party.',
          'Lost & hungry in narrow alleys: Terri Campion rounds the corner with a hand-drawn notebook map to the nearest saferoom.',
          'Chess Graffiti Secret: Blank wall with “The Pawn may fear the King in his Castle, or the Priest on his Path, but safety is found in the Darkness of the Knight.” Tapping the brick closest to the knight reveals a Potion of Pack Repellant (keeps non-Barflie Mobs away for 15 hours).'
        ]
      },
      {
        id: 'q_pack_alley_pall',
        name: 'Pack Alley Pall',
        summary: 'Stone fades to pale gray, torches vanish (dull ambient stone glow), eerie silence, grid-like wide roads lined with repurposed tombs.',
        mobTemplateIds: ['tpl_pack_rat', 'tpl_barflie', 'tpl_humors'],
        beats: [
          '“We are all dead, and this is Hell” Open Grave: Ghostly white Pack Rat trips a crawler (Dex Check or Take Down) into a hole with a Weak Pack Rat group (Advantage). Next round: Level 5 crawler-turned-Barflie (extra HB slot, 16 hit, 2dX dmg) + Moderate Homogenous Humors ambush.',
          'Repurposed Tombs: Epitaph reads “beloved grandparent” while another crawler is heard cracking open a nearby tomb for valuables.',
          'Orange Sliver Sarcophagus: White Pack Rats slip into a cracked tomb wall. Breaking through reveals a skeleton with an enchanted weapon and a Potion of Clarity.'
        ]
      },
      {
        id: 'q_packrooms',
        name: 'The Packrooms',
        summary: 'Lowering ceiling opens into identical 20ft × 20ft office rooms with desk, rolling chair, filing cabinet, and restroom. No saferooms; minimap fails.',
        mobTemplateIds: ['tpl_mirror_cat'],
        beats: [
          'Minimap Failure & Mirror Cat Ambush: Half-cat sphinx on a desk attacks. Every 2 rounds, another Mirror Cat appears while one lives (up to 2× party size).',
          'Resetting Furniture & Typewriter Clue: Moved/looted office furniture resets (max 1 of each in Inventory). Every 9th room has a typewriter: “In is out, and out is in… Freedom comes from clarity, not without, but from within.”',
          'Two Escapes: (1) Drink a Potion of Clarity to turn the nearest door into an exit to Packed Halls, OR (2) Grapple a phasing Mirror Cat to warp 1 crawler to Pack Alley Pall.'
        ]
      },
      {
        id: 'q_sprawl',
        name: 'The Sprawl',
        summary: 'Sticky decaying panes of glass flashing neon signs—Barflie nests ripped from Earth taverns. Staring too long triggers Neon and Chromed.',
        mobTemplateIds: ['tpl_barflie'],
        beats: [
          'Active Barflie Nest: Decaying Earth bar with a Weak Barflie group and mutating crawler corpses. If the fight exceeds 3 rounds without stopping the mutations, another Weak Barflie group joins each round.',
          'Abandoned Nest Loot: Higher-quality alcohol, minor crawler loot, and Barflie Residue (alchemical ingredient).',
          'Boss Entrance: Grand nest marked “Patti Render’s Beer and Tenders — Bar and Grill” leads into The Bar Render Boss Chamber.'
        ]
      },
      {
        id: 'q_boss_chamber',
        name: 'Boss Chamber: Bar Render',
        summary: '“Patti Render’s Beer and Tenders — Bar and Grill.” Door locks on entry; cartoon courthouse overlay labels Bar Render “Defendant” and crawlers “Plaintiffs.”',
        mobTemplateIds: ['tpl_bar_render', 'tpl_barflie'],
        isBossRoom: true,
        beats: [
          'Read-Aloud: “Sometimes, legalities are civil. Sometimes, they’re criminal. This time? They’re a full-on battle royale. This is a bar room Boss Battle.”',
          'Tactics: Bar Render leaps atop the bar hurling Fiery Cocktails (10ft Blast) while 2 bailiff Barflies keep crawlers back (replenishing up to 2 at once until she falls).',
          'Victory: She falls back gratefully and says, “The defense… rests.”'
        ]
      }
    ],
    npcs: [
      {
        id: 'npc_jonai',
        name: 'Jonai',
        iconSymbol: '🧙',
        color: '#22d3ee',
        level: 5,
        subtitle: 'Gnome SYSTEM ERROR Master (Non-Combatant NPC)',
        bio: 'Former crawler contracted to run a scrapped Guildmaster-Apprentice Tutorial Guild. Hiding in a saferoom mourning his captured trainee Xaggra. Grateful if crawlers rescue Xaggra.',
        aiCommentary: 'This poor sucker shouldn’t be here. The mudskippers scrapped the program, and his contract keeps him here until the floor collapses.'
      },
      {
        id: 'npc_terri',
        name: 'Terri Campion',
        iconSymbol: '🛡️',
        color: '#38bdf8',
        level: 7,
        subtitle: 'Crawler #13,123,444 (“Terri Cam”) • Human',
        bio: 'Former Detroit police officer wielding a glittering Knight’s Shield and service pistol. Hunting a murderer who fled into the Packrooms (now a Barflie in Pack Alley Pall). Will guide & assist against The Bar Render.',
        aiCommentary: 'Saw herself as a knight protecting her kingdom. Her first box gave her the Knight’s Shield—she knew she’d made the right choice.'
      },
      {
        id: 'npc_xaggra',
        name: 'Xaggra',
        iconSymbol: '🪲',
        color: '#a3e635',
        level: 3,
        subtitle: 'Gnome SYSTEM ERROR Trainee (Mutating into Barflie)',
        bio: 'Jonai’s apprentice, hit by two Barflie backwashes in a Sprawl nest. Diamond-like mutating compound eyes, can only buzz, and attacks on sight—can be saved with a Potion of Clarity.',
        aiCommentary: 'Halfway through the transformation into a hideous Barflie. His head feels awfully itchy lately.'
      }
    ],
    traps: [
      {
        id: 'trap_topo_disorient',
        name: 'Topographical Disorientation Trap',
        iconSymbol: '🧭',
        color: '#a855f7',
        category: 'Hazard / Trap',
        notes: 'Hidden compass-rose ground rune. Flash draws nearby Mobs and scrambles/disables minimaps for 30 hours (or until sleep or Potion of Clarity). Awards “Flying Blind” achievement.'
      },
      {
        id: 'trap_neon_chromed',
        name: 'Neon and Chromed',
        iconSymbol: '💡',
        color: '#ec4899',
        category: 'Hazard / Trap',
        notes: 'Sprawl flashing Syndicate ads. Fail Con Stat Check = disoriented (can only Evade with Disadvantage in Round 1) as a Moderate group of Barflies attacks.'
      }
    ],
    items: [
      {
        id: 'prop_office_furniture',
        name: 'Packrooms Office Furniture',
        iconSymbol: '🪑',
        color: '#64748b',
        category: 'Interactive / Prop',
        notes: 'Desk, rolling chair, and empty filing cabinet. Reappears if taken; max 1 of each can exist in a crawler’s Inventory.'
      },
      {
        id: 'prop_packing_crates',
        name: 'Packing Crates (Rotgut Beer)',
        iconSymbol: '📦',
        color: '#d97706',
        category: 'Container / Loot',
        notes: 'Crates of cheap rotgut beer stacked outside Barflie nests in the Sprawl.'
      },
      {
        id: 'prop_cable_reels',
        name: 'Industrial Cable Reels',
        iconSymbol: '🛞',
        color: '#f59e0b',
        category: 'Cover / Obstacle',
        notes: 'Large wooden spools wrapped in electrical cabling found in the Sprawl and Pack Alley Pall.'
      },
      {
        id: 'prop_duffel_bag',
        name: 'Abandoned Duffel Bag',
        iconSymbol: '🎒',
        color: '#10b981',
        category: 'Container / Loot',
        notes: 'Overnight camping duffel emptied of everything except outdoorsy clothes.'
      }
    ],
    achievements: [
      {
        id: 'ach_flying_blind',
        name: 'Flying Blind',
        quote: 'Thanks to a trap, a Mob attack, or something else outside your control, your map failed! Hope you took notes in cartography class.',
        rewardText: 'Bronze Adventurer Box',
        boxTier: 'bronze',
        boxTitle: 'Bronze Adventurer Box',
        guaranteedItem: null
      },
      {
        id: 'ach_another_round',
        name: 'Another Round',
        quote: 'You got hit by a Barflie’s backwash attack. If I were you, I’d find something a little stronger than mouthwash to negate that stink.',
        rewardText: 'Silver That’s Enough Box (Contains Potion of Clarity)',
        boxTier: 'silver',
        boxTitle: 'Silver That’s Enough Box',
        guaranteedItem: {
          name: 'Potion of Clarity',
          icon: '🧪',
          category: 'Consumable',
          qty: 1,
          notes: 'Cures Washed debuff, restores scrambled minimaps, saves Xaggra, or opens an exit out of the Packrooms.'
        }
      },
      {
        id: 'ach_regular_customer',
        name: 'Regular Customer',
        quote: 'You just walked past the same place for the fifteenth time. You must really like this place.',
        rewardText: 'Bronze Adventurer Box',
        boxTier: 'bronze',
        boxTitle: 'Bronze Adventurer Box',
        guaranteedItem: null
      },
      {
        id: 'ach_manifest_space',
        name: 'Manifest Space',
        quote: 'You survived the Packrooms and emerged stronger for the experience! Reward: Did you not hear me? You emerged from the Packrooms, stronger for the experience.',
        rewardText: 'No Box (Bragging Rights Only)',
        boxTier: null,
        boxTitle: '',
        guaranteedItem: null
      }
    ],
    grindingComplications: [
      { roll: '1', text: 'Hopelessly lost in the Sprawl maze: lose 1d6 × 10% (10–60%) of Time to Floor Collapse. No saferooms, maps stop updating, and a Strong group of Homogenous Humors drops from the ceiling.' },
      { roll: '2', text: 'Three Pack Rats fight over a bloody last will & testament. Nearby, a crawler’s blue dot heads into a Mob-filled chamber likely holding good loot.' },
      { roll: '3', text: 'Two Barflies drag a paralyzed crawler into a Barflie nest entrance while they beg for help.' },
      { roll: '4', text: 'A smoking, broken-down Jeep at an intersection with a gnawed crawler corpse slumped over the wheel (empty Inventory). A trail of blood and oil leads deeper.' },
      { roll: '5', text: 'Corpse without a minimap dot: a Kua-Tin admin alien killed by a gunshot. The System AI warns that approaching may be dangerous.' },
      { roll: '6', text: 'A blue X on the minimap leads to three rival crawlers fighting over a Potion of Clarity next to their dead teammate. Weapons drawn; easily provoked.' },
      { roll: '7–20', text: 'Roll on Table 2: Tutorial Floor Grinding Complications (p. 13).' }
    ],
    moods: [
      {
        prompt: 'You emerge onto a main thoroughfare—finally. Right or left?',
        outcome: 'Right = Moderate Canidna ambush. Left = Strong Homogenous Humors dropping from above.'
      },
      {
        prompt: 'Alley mouths blend together; you wonder if you’ve walked in a huge circle (Tracking helps).',
        outcome: 'Minimap is useless (still updating), but checking any hand-drawn map reveals real progress.'
      },
      {
        prompt: 'A Canidna pup emerges around a corner, sits, and wags its tail—possibly too cute.',
        outcome: 'Attacking or walking away makes it bark, summoning a Strong territorial Canidna pack. Feeding it keeps it quiet.'
      }
    ]
  }
];

let gmCampaignUiState = {
  activeNeighborhoodId: 'nb_prickly_pack_alleys',
  activeTab: 'overview', // 'overview' | 'quarters' | 'npcs' | 'tables'
  activeQuarterId: 'q_packed_halls',
  targetCrawlerId: '',
  lastTableRollHtml: ''
};

function getAllKnownNeighborhoodNames() {
  const names = new Set();
  CAMPAIGN_NEIGHBORHOODS.forEach(nb => { if (nb.name) names.add(nb.name); });
  (appState?.bestiary || []).forEach(b => {
    if (b.role !== 'crawler' && b.neighborhood && String(b.neighborhood).trim()) {
      names.add(String(b.neighborhood).trim());
    }
  });
  return Array.from(names);
}

function syncCampaignNeighborhoodsIntoAppState(showToast = false) {
  if (!appState) return;
  appState.bestiary = Array.isArray(appState.bestiary) ? appState.bestiary : [];
  appState.debuffs = Array.isArray(appState.debuffs) ? appState.debuffs : [];
  let mobsAdded = 0;
  let debuffsAdded = 0;

  CAMPAIGN_NEIGHBORHOODS.forEach(nb => {
    (nb.debuffs || []).forEach(deb => {
      const exists = appState.debuffs.some(d => String(d.name || '').trim().toLowerCase() === deb.name.toLowerCase());
      if (!exists) {
        appState.debuffs.push(JSON.parse(JSON.stringify(deb)));
        debuffsAdded++;
      }
    });

    (nb.mobs || []).forEach(mob => {
      const existing = appState.bestiary.find(b =>
        b.templateId === mob.templateId ||
        (b.role !== 'crawler' && String(b.name || '').trim().toLowerCase() === mob.name.toLowerCase())
      );
      if (!existing) {
        appState.bestiary.push(JSON.parse(JSON.stringify(mob)));
        mobsAdded++;
      } else {
        if (!existing.neighborhood) existing.neighborhood = mob.neighborhood;
        if (!existing.quarter && mob.quarter) existing.quarter = mob.quarter;
        if (!existing.tier && mob.tier) existing.tier = mob.tier;
      }
    });
  });

  if (showToast) {
    commitStateChange();
    showVttToast(`🗺️ Synced Neighborhood Packs (+${mobsAdded} mobs, +${debuffsAdded} debuffs)!`);
  }
}

function setMobTemplateNeighborhood(templateId, newNeighborhood) {
  if (!appState) return;
  const tpl = (appState.bestiary || []).find(b => b.templateId === templateId);
  if (!tpl) return;
  tpl.neighborhood = String(newNeighborhood || '').trim();
  commitStateChange();
  showVttToast(`🏷️ Moved ${tpl.name} → ${tpl.neighborhood || 'Unassigned'}`);
}

function openGmCampaignModal(nbId = '') {
  if (IS_PLAYER_WINDOW) return;
  if (nbId) gmCampaignUiState.activeNeighborhoodId = nbId;
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === gmCampaignUiState.activeNeighborhoodId) || CAMPAIGN_NEIGHBORHOODS[0];
  if (nb && nb.quarters?.length && !nb.quarters.some(q => q.id === gmCampaignUiState.activeQuarterId)) {
    gmCampaignUiState.activeQuarterId = nb.quarters[0].id;
  }
  const modal = document.getElementById('gmCampaignModal');
  if (modal) modal.classList.remove('hidden');
  renderGmCampaignModal();
}

function closeGmCampaignModal() {
  const modal = document.getElementById('gmCampaignModal');
  if (modal) modal.classList.add('hidden');
}

function setGmCampaignTab(tab) {
  gmCampaignUiState.activeTab = tab;
  renderGmCampaignModal();
}

function setGmCampaignQuarter(qId) {
  gmCampaignUiState.activeQuarterId = qId;
  renderGmCampaignModal();
}

function spawnCampaignNpcOnMap(nbId, npcId) {
  if (IS_PLAYER_WINDOW) return;
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === nbId);
  const npc = (nb?.npcs || []).find(x => x.id === npcId);
  const scene = getActiveScene();
  if (!npc || !scene) return;
  const offset = (scene.tokens?.length || 0) % 6;
  const isCrawlerAlly = /crawler/i.test(npc.subtitle || '');
  const tok = {
    id: 'tok_npc_' + Date.now(),
    templateId: npc.id,
    name: npc.name,
    role: isCrawlerAlly ? 'crawler' : 'mob',
    gridSpan: 1,
    swarmCount: 1,
    hiddenFromPlayers: !isCrawlerAlly,
    classification: npc.subtitle || 'NPC',
    level: npc.level || 1,
    gx: 5 + offset,
    gy: 5,
    maxPips: isCrawlerAlly ? 10 : 3,
    currentPips: isCrawlerAlly ? 10 : 3,
    hpPerPip: isCrawlerAlly ? 4 : 2,
    currentHp: isCrawlerAlly ? 40 : 6,
    shieldPips: 0,
    maxMana: 10,
    currentMana: 10,
    maxAp: isCrawlerAlly ? 2 : 0,
    currentAp: isCrawlerAlly ? 2 : 0,
    evade: isCrawlerAlly ? '+4' : '12+F',
    move: '20+S',
    dr: '1',
    stats: { Str: '10 (+4)', Int: '10 (+4)', Con: '10 (+4)', Dex: '10 (+4)', Cha: '10 (+4)' },
    iconSymbol: npc.iconSymbol || '🧑',
    color: npc.color || '#38bdf8',
    lore: npc.bio || '',
    aiCommentary: npc.aiCommentary || '',
    attacks: [],
    assignedSkills: [],
    assignedSpells: [],
    buffs: [],
    statuses: [],
    notes: npc.bio || ''
  };
  scene.tokens.push(tok);
  uiState.selectedTokenId = tok.id;
  exploredMemDirty = true;
  commitStateChange();
  showVttToast(`🧑 Spawned NPC ${npc.name} onto map!`);
}

function dropCampaignPropOrTrap(nbId, kind, itemId, hidden = false) {
  if (IS_PLAYER_WINDOW) return;
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === nbId);
  const list = kind === 'trap' ? (nb?.traps || []) : (nb?.items || []);
  const entry = list.find(x => x.id === itemId);
  const scene = getActiveScene();
  if (!entry || !scene) return;
  scene.mapObjects = scene.mapObjects || [];
  scene.mapObjects.push({
    id: 'mapobj_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    templateId: entry.id,
    name: entry.name,
    category: entry.category || (kind === 'trap' ? 'Hazard / Trap' : 'Interactive / Prop'),
    iconSymbol: entry.iconSymbol || '📦',
    color: entry.color || '#10b981',
    lightRadiusFt: 0,
    notes: entry.notes || '',
    hiddenFromPlayers: Boolean(hidden),
    gx: 5 + (scene.mapObjects.length % 5),
    gy: 5
  });
  commitStateChange();
  showVttToast(`${entry.iconSymbol || '📦'} Dropped ${entry.name}${hidden ? ' (Hidden from Players)' : ''} onto map!`);
}

function spawnBarRenderBossEncounter() {
  if (IS_PLAYER_WINDOW) return;
  syncCampaignNeighborhoodsIntoAppState(false);
  deployCharacterTemplateToMap('tpl_bar_render');
  deployCharacterTemplateToMap('tpl_barflie');
  deployCharacterTemplateToMap('tpl_barflie');
  showVttToast('👩‍⚖️ Spawned The Bar Render + 2 Bailiff Barflies!');
}

function awardNeighborhoodAchievement(nbId, achId) {
  if (IS_PLAYER_WINDOW) return;
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === nbId);
  const ach = (nb?.achievements || []).find(a => a.id === achId);
  const scene = getActiveScene();
  if (!ach || !scene) return;

  const crawlers = (scene.tokens || []).filter(t => t.role === 'crawler');
  const selEl = document.getElementById('gmCampaignAchTarget');
  const chosenId = selEl?.value || gmCampaignUiState.targetCrawlerId || crawlers[0]?.id || '';
  const target = crawlers.find(c => c.id === chosenId) || crawlers[0] || null;

  let awardNote = ach.rewardText || 'Achievement Unlocked!';
  if (target && ach.boxTier && typeof generateDraftLootBox === 'function') {
    const draft = generateDraftLootBox(ach.boxTier, 'random');
    draft.title = ach.boxTitle || draft.title;
    if (ach.guaranteedItem) {
      draft.items = [{
        id: 'item_ach_' + Date.now(),
        ...ach.guaranteedItem
      }];
      draft.gold = 0;
    }
    target.inventory = Array.isArray(target.inventory) ? target.inventory : [];
    target.inventory.unshift({
      id: 'inv_box_' + Date.now(),
      name: draft.title,
      icon: ach.boxTier === 'silver' ? '🥈' : '🥉',
      category: 'Loot Box',
      qty: 1,
      isLootBox: true,
      boxTier: ach.boxTier,
      boxPayload: JSON.parse(JSON.stringify(draft)),
      notes: `Achievement Reward: ${ach.name}. Open in a saferoom!`
    });
    awardNote = `${draft.title} added to ${target.name}'s Inventory!`;
  }

  broadcastDiceRollEvent({
    title: `🏆 NEW ACHIEVEMENT! ${ach.name.toUpperCase()}`,
    subtitle: `${nb.name}${target ? ` • ${target.iconSymbol || '⚔️'} ${target.name}` : ''}`,
    playerSubtitle: `NEW ACHIEVEMENT! ${ach.name}`,
    flareLevel: ach.boxTier === 'silver' ? 'crit' : 'great',
    rolls: [{
      targetName: target ? `${target.iconSymbol || '⚔️'} ${target.name}` : 'Party Achievement',
      formulaText: `“${ach.quote}”`,
      playerFormulaText: `“${ach.quote}”`,
      resultLabel: awardNote,
      playerResultLabel: ach.rewardText || 'UNLOCKED',
      hit: false
    }]
  });

  commitStateChange();
  showVttToast(`🏆 Awarded "${ach.name}"${target ? ` to ${target.name}` : ''}!`);
}

function rollNeighborhoodGrindingTable(nbId) {
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === nbId);
  if (!nb || !nb.grindingComplications?.length) return;
  const d20 = Math.floor(Math.random() * 20) + 1;
  const hit = nb.grindingComplications.find(row => String(row.roll) === String(d20))
    || nb.grindingComplications[nb.grindingComplications.length - 1];
  gmCampaignUiState.lastTableRollHtml = `
    <div class="bg-amber-950/40 border border-amber-400/60 rounded-xl p-2.5 text-[11px] space-y-1">
      <div class="font-mono font-bold text-amber-300">🎲 Table 5 Grinding Complication — Rolled d20 = ${d20}</div>
      <p class="text-slate-100 leading-snug">${escapeHtmlAttr(hit.text)}</p>
    </div>
  `;
  renderGmCampaignModal();
  showVttToast(`🎲 Grinding Table 5: Rolled ${d20}`);
}

function rollNeighborhoodMood(nbId) {
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === nbId);
  if (!nb || !nb.moods?.length) return;
  const pick = nb.moods[Math.floor(Math.random() * nb.moods.length)];
  gmCampaignUiState.lastTableRollHtml = `
    <div class="bg-cyan-950/40 border border-cyan-400/60 rounded-xl p-2.5 text-[11px] space-y-1">
      <div class="font-mono font-bold text-cyan-300">🎭 Neighborhood Mood Vignette</div>
      <p class="text-slate-100 italic leading-snug">“${escapeHtmlAttr(pick.prompt)}”</p>
      <p class="text-amber-200 leading-snug"><b>Outcome:</b> ${escapeHtmlAttr(pick.outcome)}</p>
    </div>
  `;
  renderGmCampaignModal();
}

function renderGmCampaignModal() {
  const body = document.getElementById('gmCampaignModalBody');
  if (!body) return;
  const nb = CAMPAIGN_NEIGHBORHOODS.find(n => n.id === gmCampaignUiState.activeNeighborhoodId) || CAMPAIGN_NEIGHBORHOODS[0];
  if (!nb) return;

  const scene = getActiveScene();
  const crawlers = (scene?.tokens || []).filter(t => t.role === 'crawler');
  const tab = gmCampaignUiState.activeTab || 'overview';

  const topBar = `
    <div class="flex flex-wrap items-center justify-between gap-2 bg-dungeon-950 border border-slate-800 rounded-xl p-2">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-[10px] font-mono uppercase text-amber-400 font-bold">Neighborhood:</span>
        <select onchange="gmCampaignUiState.activeNeighborhoodId=this.value; renderGmCampaignModal()" class="bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-100">
          ${CAMPAIGN_NEIGHBORHOODS.map(n => `<option value="${n.id}" ${n.id === nb.id ? 'selected' : ''}>Floor ${n.floor}: ${escapeHtmlAttr(n.name)}</option>`).join('')}
        </select>
      </div>
      <button type="button" onclick="syncCampaignNeighborhoodsIntoAppState(true)" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-bold text-[10px] transition">
        🔄 Sync Mobs & Debuffs to Bestiary
      </button>
    </div>
    <div class="grid grid-cols-4 gap-1">
      <button type="button" onclick="setGmCampaignTab('overview')" class="py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition ${tab === 'overview' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">📖 Overview & Arcs</button>
      <button type="button" onclick="setGmCampaignTab('quarters')" class="py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition ${tab === 'quarters' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🧭 Quarters & Boss</button>
      <button type="button" onclick="setGmCampaignTab('npcs')" class="py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition ${tab === 'npcs' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🧑 NPCs & Traps</button>
      <button type="button" onclick="setGmCampaignTab('tables')" class="py-1.5 px-2 rounded-lg text-[10.5px] font-bold transition ${tab === 'tables' ? 'bg-amber-500 text-slate-950' : 'bg-dungeon-950 text-slate-300 border border-slate-800'}">🏆 Awards & Tables</button>
    </div>
  `;

  let contentHtml = '';
  if (tab === 'overview') {
    contentHtml = `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="font-bold text-cyan-300 text-xs uppercase tracking-wider">🌌 ${escapeHtmlAttr(nb.name)} — ${escapeHtmlAttr(nb.tagline)}</div>
        <p class="text-[11px] text-slate-200 leading-relaxed">${escapeHtmlAttr(nb.overview)}</p>
        <div class="bg-dungeon-900 border border-slate-800/80 rounded-lg p-2 text-[10.5px] text-slate-300">
          <b class="text-amber-300">Environment:</b> ${escapeHtmlAttr(nb.environment)}
        </div>
      </div>
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="font-bold text-amber-400 text-[11px] uppercase tracking-wider">⚡ Strong Starts</div>
        ${(nb.strongStarts || []).map(ss => `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-0.5">
            <div class="font-bold text-[11px] text-amber-200">${escapeHtmlAttr(ss.title)}</div>
            <p class="text-[10.5px] text-slate-300 leading-snug">${escapeHtmlAttr(ss.text)}</p>
          </div>
        `).join('')}
      </div>
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">📜 Story Arcs</div>
        ${(nb.storyArcs || []).map(sa => `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 space-y-0.5">
            <div class="font-bold text-[11px] text-emerald-200">${escapeHtmlAttr(sa.title)}</div>
            <p class="text-[10.5px] text-slate-300 leading-snug">${escapeHtmlAttr(sa.text)}</p>
          </div>
        `).join('')}
      </div>
    `;
  } else if (tab === 'quarters') {
    const activeQ = (nb.quarters || []).find(q => q.id === gmCampaignUiState.activeQuarterId) || nb.quarters[0];
    const quarterMobs = (activeQ?.mobTemplateIds || []).map(tid => (nb.mobs || []).find(m => m.templateId === tid)).filter(Boolean);
    contentHtml = `
      <div class="flex flex-wrap gap-1">
        ${(nb.quarters || []).map(q => `
          <button type="button" onclick="setGmCampaignQuarter('${q.id}')" class="px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition ${activeQ?.id === q.id ? (q.isBossRoom ? 'bg-rose-500 text-slate-950' : 'bg-cyan-500 text-slate-950') : 'bg-dungeon-950 text-slate-300 border border-slate-800 hover:border-slate-600'}">
            ${q.isBossRoom ? '👑 ' : '🧭 '}${escapeHtmlAttr(q.name)}
          </button>
        `).join('')}
      </div>
      ${activeQ ? `
        <div class="bg-dungeon-950 border ${activeQ.isBossRoom ? 'border-rose-500/60' : 'border-cyan-500/40'} rounded-xl p-3 space-y-2.5">
          <div>
            <div class="font-bold text-sm ${activeQ.isBossRoom ? 'text-rose-300' : 'text-cyan-300'}">${activeQ.isBossRoom ? '👑 ' : '🧭 '}${escapeHtmlAttr(activeQ.name)}</div>
            <p class="text-[11px] text-slate-300 mt-0.5 leading-snug">${escapeHtmlAttr(activeQ.summary)}</p>
          </div>
          <div class="space-y-1.5">
            <div class="text-[10px] font-mono uppercase text-amber-400 font-bold">👹 Quarter Mobs (One-Click Spawn)</div>
            <div class="flex flex-wrap gap-1.5">
              ${quarterMobs.map(m => `
                <button type="button" onclick="syncCampaignNeighborhoodsIntoAppState(false); deployCharacterTemplateToMap('${m.templateId}')" class="px-2.5 py-1.5 rounded-lg ${m.tier === 'Boss' ? 'bg-rose-500 hover:bg-rose-400 text-slate-950' : 'bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/50 text-rose-200'} font-bold text-[11px] transition">
                  + ${m.iconSymbol || '👹'} ${escapeHtmlAttr(m.name)} (Lvl ${m.level})
                </button>
              `).join('')}
              ${activeQ.isBossRoom ? `
                <button type="button" onclick="spawnBarRenderBossEncounter()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] shadow transition">
                  ⚔️ Spawn Full Boss Room (Boss + 2 Barflies)
                </button>
              ` : ''}
            </div>
          </div>
          <div class="space-y-1.5 pt-1 border-t border-slate-800">
            <div class="text-[10px] font-mono uppercase text-slate-400 font-bold">📌 Encounters & Room Beats</div>
            ${(activeQ.beats || []).map(b => `
              <div class="bg-dungeon-900 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 leading-snug">• ${escapeHtmlAttr(b)}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } else if (tab === 'npcs') {
    contentHtml = `
      <div class="bg-dungeon-950 border border-slate-800 rounded-xl p-3 space-y-2">
        <div class="font-bold text-cyan-400 text-[11px] uppercase tracking-wider">🧑 Neighborhood NPCs</div>
        ${(nb.npcs || []).map(npc => `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2.5 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <div>
                <div class="font-bold text-xs text-slate-100">${npc.iconSymbol || '🧑'} ${escapeHtmlAttr(npc.name)} <span class="text-amber-300 font-mono text-[10px]">Lvl ${npc.level}</span></div>
                <div class="text-[10px] font-mono text-cyan-300">${escapeHtmlAttr(npc.subtitle)}</div>
              </div>
              <button type="button" onclick="spawnCampaignNpcOnMap('${nb.id}', '${npc.id}')" class="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] shrink-0">+ Spawn</button>
            </div>
            <p class="text-[10.5px] text-slate-300 leading-snug">${escapeHtmlAttr(npc.bio)}</p>
          </div>
        `).join('')}
      </div>
      <div class="bg-dungeon-950 border border-rose-500/35 rounded-xl p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="font-bold text-rose-400 text-[11px] uppercase tracking-wider">⚠️ Traps & Hazards</span>
          <button type="button" onclick="togglePlayerMinimapStatus(); renderGmCampaignModal()" class="px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${appState?.minimapOffline ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'}">
            ${appState?.minimapOffline ? '🗺️ Restore Player Minimap' : '⚠️ Scramble Player Minimap'}
          </button>
        </div>
        ${(nb.traps || []).map(tr => `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-bold text-xs text-rose-200">${tr.iconSymbol} ${escapeHtmlAttr(tr.name)}</div>
              <p class="text-[10.5px] text-slate-300 leading-snug mt-0.5">${escapeHtmlAttr(tr.notes)}</p>
            </div>
            <button type="button" onclick="dropCampaignPropOrTrap('${nb.id}', 'trap', '${tr.id}', true)" class="px-2 py-1 rounded-lg bg-purple-500/25 hover:bg-purple-500/40 border border-purple-400/50 text-purple-200 font-bold text-[10px] shrink-0">+ Drop Hidden</button>
          </div>
        `).join('')}
      </div>
      <div class="bg-dungeon-950 border border-emerald-500/35 rounded-xl p-3 space-y-2">
        <div class="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">📦 Neighborhood Props & Items</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          ${(nb.items || []).map(it => `
            <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 flex flex-col justify-between gap-1.5">
              <div>
                <div class="font-bold text-[11px] text-emerald-200">${it.iconSymbol} ${escapeHtmlAttr(it.name)}</div>
                <p class="text-[10px] text-slate-400 leading-snug mt-0.5">${escapeHtmlAttr(it.notes)}</p>
              </div>
              <button type="button" onclick="dropCampaignPropOrTrap('${nb.id}', 'item', '${it.id}', false)" class="w-full py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-200 font-bold text-[10px]">+ Drop on Map</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    contentHtml = `
      <div class="bg-dungeon-950 border border-amber-500/40 rounded-xl p-3 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-bold text-amber-400 text-[11px] uppercase tracking-wider">🏆 Neighborhood Achievements & Rewards</span>
          <select id="gmCampaignAchTarget" onchange="gmCampaignUiState.targetCrawlerId=this.value" class="bg-dungeon-900 border border-slate-700 rounded-lg px-2 py-1 text-[10.5px] text-slate-100">
            ${crawlers.length === 0 ? '<option value="">(Broadcast Only — No Crawlers on Map)</option>' : crawlers.map(c => `<option value="${c.id}" ${c.id === gmCampaignUiState.targetCrawlerId ? 'selected' : ''}>Award to: ${c.iconSymbol || '⚔️'} ${escapeHtmlAttr(c.name)}</option>`).join('')}
          </select>
        </div>
        ${(nb.achievements || []).map(ach => `
          <div class="bg-dungeon-900 border border-slate-800 rounded-lg p-2.5 flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="font-bold text-xs text-amber-200">🏆 ${escapeHtmlAttr(ach.name)}</div>
              <p class="text-[10.5px] text-slate-300 italic mt-0.5">“${escapeHtmlAttr(ach.quote)}”</p>
              <div class="text-[10px] font-mono text-emerald-300 mt-1">Reward: ${escapeHtmlAttr(ach.rewardText)}</div>
            </div>
            <button type="button" onclick="awardNeighborhoodAchievement('${nb.id}', '${ach.id}')" class="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] shrink-0 shadow transition">
              🏆 Broadcast & Award
            </button>
          </div>
        `).join('')}
      </div>
      <div class="bg-dungeon-950 border border-cyan-500/40 rounded-xl p-3 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-bold text-cyan-300 text-[11px] uppercase tracking-wider">🎲 Grinding Table 5 & Neighborhood Moods</span>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick="rollNeighborhoodGrindingTable('${nb.id}')" class="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10.5px] transition">🎲 Roll Table 5 (1d20)</button>
            <button type="button" onclick="rollNeighborhoodMood('${nb.id}')" class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 font-bold text-[10.5px] transition">🎭 Roll Mood</button>
          </div>
        </div>
        ${gmCampaignUiState.lastTableRollHtml || ''}
        <details class="bg-dungeon-900 border border-slate-800 rounded-lg p-2 text-[10.5px]">
          <summary class="cursor-pointer font-mono font-bold text-slate-300 select-none">📋 View Full Table 5: Prickly Pack Alley Grinding Complications</summary>
          <div class="mt-2 space-y-1 text-slate-300">
            ${(nb.grindingComplications || []).map(row => `<div><b class="text-amber-300 font-mono">[${row.roll}]</b> ${escapeHtmlAttr(row.text)}</div>`).join('')}
          </div>
        </details>
      </div>
    `;
  }

  body.innerHTML = topBar + contentHtml;
}
