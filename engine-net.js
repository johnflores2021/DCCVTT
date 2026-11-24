// =========================================================================
// 2B. ONLINE P2P PLAYER WINDOW SYNC (PASSWORD-AUTHENTICATED WEBRTC)
// =========================================================================
const ONLINE_ROOM_STORAGE_KEY = 'dcc_vtt_online_room_code_v1';
const ONLINE_PASS_STORAGE_KEY = 'dcc_vtt_online_room_pass_v1';
const URL_ROOM_PARAM = new URLSearchParams(window.location.search).get('room');
let onlinePeer = null;
let onlineHostConnections = []; // Only authenticated connections receive state!
let onlineClientConn = null;
let onlineIsLive = false;
let lastSentMapImageSig = '';
const cachedRemoteMapImages = {};

function generateSecretRoomCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(16);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return 'dcc-' + Array.from(arr, b => chars[b % chars.length]).join('');
}

function generateRandomRoomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint8Array(8);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  const part1 = Array.from(arr.slice(0, 4), b => chars[b % chars.length]).join('');
  const part2 = Array.from(arr.slice(4, 8), b => chars[b % chars.length]).join('');
  return `${part1}-${part2}`;
}

function getOrCreateOnlineRoomCode() {
  let code = localStorage.getItem(ONLINE_ROOM_STORAGE_KEY);
  if (!code || code.length < 10) {
    code = generateSecretRoomCode();
    localStorage.setItem(ONLINE_ROOM_STORAGE_KEY, code);
  }
  return code;
}

function getOrCreateOnlineRoomPassword() {
  let pass = localStorage.getItem(ONLINE_PASS_STORAGE_KEY);
  if (!pass || pass.length < 6) {
    pass = generateRandomRoomPassword();
    localStorage.setItem(ONLINE_PASS_STORAGE_KEY, pass);
  }
  return pass;
}

function buildPlayerInviteUrl(roomCode) {
  const url = new URL(window.location.href);
  url.searchParams.set('view', 'player');
  url.searchParams.set('room', roomCode);
  // Password is deliberately NOT embedded in the URL so players must enter it
  url.searchParams.delete('pass');
  return url.toString();
}

function buildSanitizedPlayerState(fullState, includeMapImages = false) {
  if (!fullState) return null;
  const clone = JSON.parse(JSON.stringify(fullState));
  // Strip private GM secrets so remote players cannot inspect them in DevTools
  delete clone.sheetsWebhookUrl;
  delete clone.sheetsSecretToken;
  if (Array.isArray(clone.mapScenes)) {
    clone.mapScenes.forEach(sc => {
      if (!includeMapImages && sc.mapImageDataUrl) {
        sc.mapImageHash = String(sc.mapImageDataUrl.length) + ':' + sc.mapImageDataUrl.slice(0, 48);
        delete sc.mapImageDataUrl;
      } else if (sc.mapImageDataUrl) {
        sc.mapImageHash = String(sc.mapImageDataUrl.length) + ':' + sc.mapImageDataUrl.slice(0, 48);
      }
      // Filter out GM-hidden mobs & hidden objects from network payload
      if (Array.isArray(sc.tokens)) {
        sc.tokens = sc.tokens.filter(t => !(t.role === 'mob' && t.hiddenFromPlayers));
      }
      if (Array.isArray(sc.mapObjects)) {
        sc.mapObjects = sc.mapObjects.filter(o => !o.hiddenFromPlayers);
      }
    });
  }
  return clone;
}

function getMapImagesSignature(state) {
  if (!state || !Array.isArray(state.mapScenes)) return '';
  return state.mapScenes.map(sc => `${sc.id}:${sc.mapImageDataUrl ? sc.mapImageDataUrl.length : 0}`).join('|');
}

function broadcastStateToOnlinePlayers(forceFullImages = false) {
  if (!onlineIsLive || onlineHostConnections.length === 0 || !appState) return;
  const curImgSig = getMapImagesSignature(appState);
  const sendImages = forceFullImages || (curImgSig !== lastSentMapImageSig);
  if (sendImages) lastSentMapImageSig = curImgSig;
  const payload = {
    type: 'VTT_ONLINE_STATE',
    includesImages: sendImages,
    state: buildSanitizedPlayerState(appState, sendImages)
  };
  onlineHostConnections = onlineHostConnections.filter(conn => conn && conn.open && conn._isAuthenticated);
  onlineHostConnections.forEach(conn => {
    try { conn.send(payload); } catch (_) {}
  });
  updateOnlineModalStatusUi();
}

function updateOnlineModalStatusUi() {
  const code = getOrCreateOnlineRoomCode();
  const pass = getOrCreateOnlineRoomPassword();
  const codeIn = document.getElementById('onlineRoomCodeInput');
  const passIn = document.getElementById('onlineRoomPasswordInput');
  const urlIn = document.getElementById('playerInviteUrlInput');
  const statusTxt = document.getElementById('onlineHostStatusText');
  const countTxt = document.getElementById('connectedPlayersCountText');
  const startBtn = document.getElementById('startOnlineHostBtn');
  const stopBtn = document.getElementById('stopOnlineHostBtn');
  const topBtnLabel = document.getElementById('hostOnlineBtnLabel');
  const fileWarn = document.getElementById('onlineFileProtocolWarning');

  if (codeIn) codeIn.value = code;
  if (passIn) passIn.value = pass;
  if (urlIn) urlIn.value = buildPlayerInviteUrl(code);
  if (fileWarn) fileWarn.classList.toggle('hidden', window.location.protocol !== 'file:');

  const activeCount = onlineHostConnections.filter(c => c && c.open && c._isAuthenticated).length;
  if (countTxt) countTxt.textContent = `Verified Players: ${activeCount}`;

  if (onlineIsLive) {
    if (statusTxt) {
      statusTxt.textContent = '🟢 LIVE & PASSWORD-LOCKED';
      statusTxt.className = 'font-mono font-bold text-emerald-400';
    }
    if (topBtnLabel) topBtnLabel.textContent = `Live (${activeCount})`;
    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');
  } else {
    if (statusTxt) {
      statusTxt.textContent = 'Offline (Local Only)';
      statusTxt.className = 'font-mono font-bold text-slate-400';
    }
    if (topBtnLabel) topBtnLabel.textContent = 'Share Online';
    if (startBtn) startBtn.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
  }
}

function openOnlineShareModal() {
  const modal = document.getElementById('onlineShareModal');
  if (modal) modal.classList.remove('hidden');
  // If not currently live, generate a fresh invite code & password each time the GM opens to create an invite
  if (!onlineIsLive) {
    localStorage.setItem(ONLINE_ROOM_STORAGE_KEY, generateSecretRoomCode());
    localStorage.setItem(ONLINE_PASS_STORAGE_KEY, generateRandomRoomPassword());
  }
  updateOnlineModalStatusUi();
}

function closeOnlineShareModal() {
  const modal = document.getElementById('onlineShareModal');
  if (modal) modal.classList.add('hidden');
}

function regenerateOnlineInviteAndPassword() {
  const newCode = generateSecretRoomCode();
  const newPass = generateRandomRoomPassword();
  localStorage.setItem(ONLINE_ROOM_STORAGE_KEY, newCode);
  localStorage.setItem(ONLINE_PASS_STORAGE_KEY, newPass);
  if (onlineIsLive) {
    stopHostingOnlineRoom();
    startHostingOnlineRoom();
  } else {
    updateOnlineModalStatusUi();
  }
  showVttToast(`🔄 Created new Invite Link & Password (${newPass})`);
}

function copyTextToClipboard(text, toastMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showVttToast(toastMsg);
    }).catch(() => {
      showVttToast(toastMsg);
    });
  } else {
    showVttToast(toastMsg);
  }
}

function copyRoomPasswordOnly() {
  const passIn = document.getElementById('onlineRoomPasswordInput');
  if (!passIn) return;
  passIn.select();
  copyTextToClipboard(passIn.value, `🔑 Copied Password: ${passIn.value}`);
}

function copyPlayerInviteLink() {
  const urlIn = document.getElementById('playerInviteUrlInput');
  if (!urlIn) return;
  urlIn.select();
  copyTextToClipboard(urlIn.value, '📋 Copied Player Invite Link (send password separately)!');
}

function startHostingOnlineRoom() {
  if (typeof Peer === 'undefined') {
    showVttToast('⚠️ PeerJS library not loaded — check your internet connection.');
    return;
  }
  if (onlinePeer) {
    try { onlinePeer.destroy(); } catch (_) {}
    onlinePeer = null;
  }
  const roomCode = getOrCreateOnlineRoomCode();
  const statusTxt = document.getElementById('onlineHostStatusText');
  if (statusTxt) statusTxt.textContent = '⏳ Connecting to signaling server...';

  onlinePeer = new Peer(roomCode, { debug: 0 });
  onlinePeer.on('open', () => {
    onlineIsLive = true;
    lastSentMapImageSig = '';
    updateOnlineModalStatusUi();
    showVttToast('🌐 Room is LIVE! Share the Invite Link & Password with your players.');
  });
  onlinePeer.on('connection', conn => {
    conn._isAuthenticated = false;
    // Kick any unauthenticated connection that doesn't send the right password within 15 seconds
    const authTimeout = setTimeout(() => {
      if (!conn._isAuthenticated) {
        try { conn.close(); } catch (_) {}
      }
    }, 15000);

    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (!conn._isAuthenticated) {
        if (msg.type === 'AUTH_HELLO') {
          const expectedPass = getOrCreateOnlineRoomPassword().trim().toUpperCase();
          const suppliedPass = String(msg.password || '').trim().toUpperCase();
          if (suppliedPass && suppliedPass === expectedPass) {
            conn._isAuthenticated = true;
            clearTimeout(authTimeout);
            onlineHostConnections.push(conn);
            updateOnlineModalStatusUi();
            try {
              conn.send({
                type: 'AUTH_OK',
                includesImages: true,
                state: buildSanitizedPlayerState(appState, true)
              });
            } catch (_) {}
            showVttToast('🛡️ Authenticated Player joined the session!');
          } else {
            try { conn.send({ type: 'AUTH_FAILED' }); } catch (_) {}
            setTimeout(() => { try { conn.close(); } catch (_) {} }, 250);
            showVttToast('⚠️ Blocked an unauthorized join attempt (wrong password).');
          }
        }
        return;
      }

      if (msg.type === 'REQUEST_FULL_STATE') {
        try {
          conn.send({
            type: 'VTT_ONLINE_STATE',
            includesImages: true,
            state: buildSanitizedPlayerState(appState, true)
          });
        } catch (_) {}
      } else if (msg.type === 'PLAYER_CLAIM' && msg.tokenId) {
        appState.claimedCrawlers = appState.claimedCrawlers || {};
        const existingOwner = appState.claimedCrawlers[msg.tokenId];
        const ownerStillOnline = existingOwner && existingOwner !== conn.peer &&
          onlineHostConnections.some(c => c && c.open && c._isAuthenticated && c.peer === existingOwner);
        if (ownerStillOnline) {
          try { conn.send({ type: 'CLAIM_DENIED', tokenId: msg.tokenId, reason: 'Already claimed by another player.' }); } catch (_) {}
        } else {
          if (conn._claimedTokenId && appState.claimedCrawlers[conn._claimedTokenId] === conn.peer) {
            delete appState.claimedCrawlers[conn._claimedTokenId];
          }
          conn._claimedTokenId = msg.tokenId;
          appState.claimedCrawlers[msg.tokenId] = conn.peer;
          try { conn.send({ type: 'CLAIM_OK', tokenId: msg.tokenId }); } catch (_) {}
          commitStateChange();
          const claimedTok = (getActiveScene()?.tokens || []).find(t => t.id === msg.tokenId);
          if (claimedTok) showVttToast(`🎭 Player claimed ${claimedTok.name}`);
        }
      } else if (msg.type === 'PLAYER_RELEASE') {
        if (conn._claimedTokenId && appState.claimedCrawlers && appState.claimedCrawlers[conn._claimedTokenId] === conn.peer) {
          delete appState.claimedCrawlers[conn._claimedTokenId];
        }
        conn._claimedTokenId = null;
        commitStateChange();
      } else if (msg.type === 'PLAYER_MOVE' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          applyPlayerTokenMove(msg.tokenId, msg.targetGx, msg.targetGy, msg.movedFt);
        }
      } else if (msg.type === 'PLAYER_CREATE_CRAWLER' && msg.crawler) {
        const newTok = createAndDeployCrawlerFromPayload(msg.crawler, msg.requestedTokenId);
        if (newTok) {
          appState.claimedCrawlers = appState.claimedCrawlers || {};
          if (conn._claimedTokenId && appState.claimedCrawlers[conn._claimedTokenId] === conn.peer) {
            delete appState.claimedCrawlers[conn._claimedTokenId];
          }
          conn._claimedTokenId = newTok.id;
          appState.claimedCrawlers[newTok.id] = conn.peer;
          try { conn.send({ type: 'CLAIM_OK', tokenId: newTok.id }); } catch (_) {}
          commitStateChange();
        }
      } else if (msg.type === 'PLAYER_CAST_ABILITY' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeRemotePlayerAbilityCast === 'function') {
            executeRemotePlayerAbilityCast(msg.tokenId, msg.kind, msg.entryId, msg.targetId, msg.rollMode || 'normal');
          }
        }
      } else if (msg.type === 'PLAYER_DEPLOY_AND_CLAIM' && msg.templateId) {
        const deployedTok = deployRosterCrawlerForPlayer(msg.templateId, msg.requestedTokenId);
        if (deployedTok) {
          appState.claimedCrawlers = appState.claimedCrawlers || {};
          const existingOwner = appState.claimedCrawlers[deployedTok.id];
          const ownerStillOnline = existingOwner && existingOwner !== conn.peer &&
            onlineHostConnections.some(c => c && c.open && c._isAuthenticated && c.peer === existingOwner);
          if (ownerStillOnline) {
            try { conn.send({ type: 'CLAIM_DENIED', tokenId: deployedTok.id, reason: 'Already claimed by another player.' }); } catch (_) {}
          } else {
            if (conn._claimedTokenId && appState.claimedCrawlers[conn._claimedTokenId] === conn.peer) {
              delete appState.claimedCrawlers[conn._claimedTokenId];
            }
            conn._claimedTokenId = deployedTok.id;
            appState.claimedCrawlers[deployedTok.id] = conn.peer;
            try { conn.send({ type: 'CLAIM_OK', tokenId: deployedTok.id }); } catch (_) {}
            commitStateChange();
          }
        }
      } else if (msg.type === 'PLAYER_TRY_UNTRAINED_SKILL' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeRemotePlayerUntrainedSkill === 'function') {
            executeRemotePlayerUntrainedSkill(msg.tokenId, msg.entryId, msg.targetId);
          }
        }
      } else if (msg.type === 'PLAYER_UPDATE_HOTLIST' && msg.tokenId && Array.isArray(msg.hotlist)) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          applyPlayerHotlistUpdate(msg.tokenId, msg.hotlist);
        }
      } else if (msg.type === 'PLAYER_UPDATE_INVENTORY' && msg.tokenId && Array.isArray(msg.inventory)) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          applyPlayerInventoryUpdate(msg.tokenId, msg.inventory);
        }
      } else if (msg.type === 'PLAYER_LOOT_MOB' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeMobLootOnHost === 'function') executeMobLootOnHost(msg.tokenId, msg.mobId);
        }
      } else if (msg.type === 'PLAYER_OPEN_LOOT_BOX' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeOpenLootBoxOnHost === 'function') executeOpenLootBoxOnHost(msg.tokenId, msg.boxInvId);
        }
      } else if (msg.type === 'PLAYER_SPEND_STAT_POINT' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof spendCrawlerStatPointOnHost === 'function') spendCrawlerStatPointOnHost(msg.tokenId, msg.statKey);
        }
      } else if (msg.type === 'PLAYER_SUBMIT_GRIND' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeGrindForCrawlerOnHost === 'function') {
            executeGrindForCrawlerOnHost(msg.tokenId, msg.hours, msg.skillId, true, true);
          }
        }
      } else if (msg.type === 'PLAYER_COMBAT_ACTION' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeCrawlerSupportActionOnHost === 'function') executeCrawlerSupportActionOnHost(msg.tokenId, msg.actionKind, true);
        }
      } else if (msg.type === 'PLAYER_DECLARE_EVADE' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeCrawlerDeclareEvadeOnHost === 'function') executeCrawlerDeclareEvadeOnHost(msg.tokenId, true);
        }
      } else if (msg.type === 'PLAYER_CANCEL_EVADE' && msg.tokenId) {
        if (!conn._claimedTokenId || conn._claimedTokenId === msg.tokenId) {
          if (typeof executeCrawlerCancelEvadeOnHost === 'function') executeCrawlerCancelEvadeOnHost(msg.tokenId, true);
        }
      }
    });
    conn.on('close', () => {
      clearTimeout(authTimeout);
      if (conn._claimedTokenId && appState?.claimedCrawlers && appState.claimedCrawlers[conn._claimedTokenId] === conn.peer) {
        delete appState.claimedCrawlers[conn._claimedTokenId];
        commitStateChange();
      }
      onlineHostConnections = onlineHostConnections.filter(c => c !== conn);
      updateOnlineModalStatusUi();
    });
  });
  onlinePeer.on('error', err => {
    onlineIsLive = false;
    updateOnlineModalStatusUi();
    showVttToast(`⚠️ Online Room error: ${err.type || err.message}`);
  });
}

function stopHostingOnlineRoom() {
  onlineIsLive = false;
  onlineHostConnections.forEach(c => { try { c.close(); } catch (_) {} });
  onlineHostConnections = [];
  if (onlinePeer) {
    try { onlinePeer.destroy(); } catch (_) {}
    onlinePeer = null;
  }
  updateOnlineModalStatusUi();
  showVttToast('⏹️ Stopped online room hosting');
}

function applyIncomingRemoteState(incoming) {
  if (!incoming) return;
  if (Array.isArray(incoming.mapScenes)) {
    incoming.mapScenes.forEach(sc => {
      if (sc.mapImageDataUrl && sc.mapImageHash) {
        cachedRemoteMapImages[sc.mapImageHash] = sc.mapImageDataUrl;
      } else if (!sc.mapImageDataUrl && sc.mapImageHash && cachedRemoteMapImages[sc.mapImageHash]) {
        sc.mapImageDataUrl = cachedRemoteMapImages[sc.mapImageHash];
      } else if (!sc.mapImageDataUrl && sc.mapImageHash && !cachedRemoteMapImages[sc.mapImageHash]) {
        try { if (onlineClientConn) onlineClientConn.send({ type: 'REQUEST_FULL_STATE' }); } catch (_) {}
      }
    });
  }
  appState = incoming;
  exploredMemDirty = true;
  syncLoadedMapImage();
  renderAllUI();
}

function submitRemotePlayerPassword(event) {
  event.preventDefault();
  if (!URL_ROOM_PARAM) return;
  const inp = document.getElementById('remotePlayerPasswordInput');
  const errEl = document.getElementById('remotePlayerPasswordError');
  const btn = document.getElementById('remotePlayerJoinBtn');
  const enteredPass = (inp?.value || '').trim().toUpperCase();
  if (!enteredPass) return;

  if (errEl) errEl.classList.add('hidden');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Verifying Password...';
  }
  connectRemotePlayerToRoom(URL_ROOM_PARAM, enteredPass);
}

function connectRemotePlayerToRoom(roomCode, password) {
  const badge = document.getElementById('remotePlayerSyncBadge');
  const gateModal = document.getElementById('playerPasswordGateModal');
  const errEl = document.getElementById('remotePlayerPasswordError');
  const joinBtn = document.getElementById('remotePlayerJoinBtn');
  const sessionKey = `dcc_vtt_auth_pass_${roomCode}`;
  const activePass = (password || sessionStorage.getItem(sessionKey) || '').trim().toUpperCase();

  if (!activePass) {
    if (gateModal) gateModal.classList.remove('hidden');
    if (badge) {
      badge.classList.remove('hidden');
      badge.textContent = '🔒 Password Required';
    }
    return;
  }

  if (badge) {
    badge.classList.remove('hidden');
    badge.textContent = '🌐 Authenticating...';
  }
  if (typeof Peer === 'undefined') {
    if (badge) badge.textContent = '⚠️ Offline';
    return;
  }

  const clientPeer = new Peer(undefined, { debug: 0 });
  clientPeer.on('open', () => {
    const conn = clientPeer.connect(roomCode, { reliable: true });
    onlineClientConn = conn;
    let wasAccepted = false;

    conn.on('open', () => {
      try { conn.send({ type: 'AUTH_HELLO', password: activePass }); } catch (_) {}
    });

    conn.on('data', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'AUTH_FAILED') {
        sessionStorage.removeItem(sessionKey);
        if (gateModal) gateModal.classList.remove('hidden');
        if (errEl) {
          errEl.textContent = '❌ Incorrect password — access denied by GM.';
          errEl.classList.remove('hidden');
        }
        if (joinBtn) {
          joinBtn.disabled = false;
          joinBtn.textContent = '🔓 Unlock Player Display';
        }
        if (badge) badge.textContent = '🔒 Access Denied';
        return;
      }

      if (msg.type === 'AUTH_OK') {
        wasAccepted = true;
        sessionStorage.setItem(sessionKey, activePass);
        if (gateModal) gateModal.classList.add('hidden');
        if (joinBtn) {
          joinBtn.disabled = false;
          joinBtn.textContent = '🔓 Unlock Player Display';
        }
        if (badge) badge.textContent = '🟢 Live Sync';
        showVttToast('🔓 Password verified — Connected to GM Session!');
        if (msg.state) applyIncomingRemoteState(msg.state);
        const savedClaim = sessionStorage.getItem('dcc_vtt_claimed_crawler_v1');
        if (savedClaim) {
          sendPlayerClaimToHost(savedClaim);
        } else if (!uiState.playerClaimPrompted) {
          uiState.playerClaimPrompted = true;
          openPlayerClaimModal();
        }
        return;
      }

      if (msg.type === 'CLAIM_OK' && msg.tokenId) {
        uiState.claimedCrawlerId = msg.tokenId;
        uiState.selectedTokenId = msg.tokenId;
        sessionStorage.setItem('dcc_vtt_claimed_crawler_v1', msg.tokenId);
        closePlayerClaimModal();
        renderAllUI();
        const tok = getClaimedCrawlerToken();
        if (tok) showVttToast(`⚔️ You are now controlling ${tok.name}!`);
        return;
      }

      if (msg.type === 'CLAIM_DENIED') {
        showVttToast(`⚠️ ${msg.reason || 'That crawler is already claimed.'}`);
        renderPlayerClaimModal();
        return;
      }

      if (msg.type === 'VTT_ONLINE_STATE' && msg.state) {
        applyIncomingRemoteState(msg.state);
      }
    });

    conn.on('close', () => {
      if (wasAccepted) {
        if (badge) badge.textContent = '🔴 Reconnecting...';
        setTimeout(() => connectRemotePlayerToRoom(roomCode, activePass), 3000);
      }
    });
  });

  clientPeer.on('error', () => {
    if (joinBtn) {
      joinBtn.disabled = false;
      joinBtn.textContent = '🔓 Unlock Player Display';
    }
    if (errEl && gateModal && !gateModal.classList.contains('hidden')) {
      errEl.textContent = '⚠️ Could not reach GM room — check that the GM is Live.';
      errEl.classList.remove('hidden');
    }
    if (badge) badge.textContent = '⚠️ Room Offline';
  });
}



function sendPlayerClaimToHost(tokenId) {
  if (!tokenId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try { onlineClientConn.send({ type: 'PLAYER_CLAIM', tokenId }); } catch (_) {}
  } else {
    // Local Pop-Out Player window (same PC)
    uiState.claimedCrawlerId = tokenId;
    uiState.selectedTokenId = tokenId;
    sessionStorage.setItem('dcc_vtt_claimed_crawler_v1', tokenId);
    closePlayerClaimModal();
    renderAllUI();
    const tok = getClaimedCrawlerToken();
    if (tok) showVttToast(`⚔️ You are now controlling ${tok.name}!`);
  }
}

function sendPlayerReleaseToHost() {
  uiState.claimedCrawlerId = null;
  sessionStorage.removeItem('dcc_vtt_claimed_crawler_v1');
  if (onlineClientConn && onlineClientConn.open) {
    try { onlineClientConn.send({ type: 'PLAYER_RELEASE' }); } catch (_) {}
  }
  renderAllUI();
  showVttToast('👁️ Switched to Spectator Mode');
}

function sendPlayerMoveToHost(tokenId, targetGx, targetGy, movedFt) {
  if (!tokenId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_MOVE', tokenId, targetGx, targetGy, movedFt });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_MOVE', tokenId, targetGx, targetGy, movedFt });
    } catch (_) {}
  }
}


function sendPlayerCreateCrawlerToHost(crawlerPayload) {
  const requestedTokenId = 'tok_p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_CREATE_CRAWLER', crawler: crawlerPayload, requestedTokenId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_CREATE_CRAWLER', crawler: crawlerPayload, requestedTokenId });
    } catch (_) {}
    uiState.claimedCrawlerId = requestedTokenId;
    uiState.selectedTokenId = requestedTokenId;
    sessionStorage.setItem('dcc_vtt_claimed_crawler_v1', requestedTokenId);
  }
}


function sendPlayerCastAbilityToHost(tokenId, kind, entryId, targetId, rollMode = 'normal') {
  if (!tokenId || !entryId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_CAST_ABILITY', tokenId, kind, entryId, targetId, rollMode });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_CAST_ABILITY', tokenId, kind, entryId, targetId, rollMode });
    } catch (_) {}
  }
}

function sendPlayerCombatActionToHost(tokenId, actionKind, targetMobId = '', parleySkillKey = '') {
  if (!tokenId || !actionKind) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_COMBAT_ACTION', tokenId, actionKind, targetMobId, parleySkillKey });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_COMBAT_ACTION', tokenId, actionKind, targetMobId, parleySkillKey });
    } catch (_) {}
  }
}

function sendPlayerDeclareEvadeToHost(tokenId) {
  if (!tokenId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_DECLARE_EVADE', tokenId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_DECLARE_EVADE', tokenId });
    } catch (_) {}
  }
}

function sendPlayerCancelEvadeToHost(tokenId) {
  if (!tokenId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_CANCEL_EVADE', tokenId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_CANCEL_EVADE', tokenId });
    } catch (_) {}
  }
}


function sendPlayerDeployAndClaimToHost(templateId) {
  if (!templateId) return;
  const requestedTokenId = 'tok_r_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_DEPLOY_AND_CLAIM', templateId, requestedTokenId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_DEPLOY_AND_CLAIM', templateId, requestedTokenId });
    } catch (_) {}
    uiState.claimedCrawlerId = requestedTokenId;
    uiState.selectedTokenId = requestedTokenId;
    sessionStorage.setItem('dcc_vtt_claimed_crawler_v1', requestedTokenId);
    closePlayerClaimModal();
    renderAllUI();
  }
}


function sendPlayerTryUntrainedSkillToHost(tokenId, entryId, targetId = '') {
  if (!tokenId || !entryId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_TRY_UNTRAINED_SKILL', tokenId, entryId, targetId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_TRY_UNTRAINED_SKILL', tokenId, entryId, targetId });
    } catch (_) {}
  }
}


function sendPlayerHotlistUpdateToHost(tokenId, hotlistArr) {
  if (!tokenId || !Array.isArray(hotlistArr)) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_UPDATE_HOTLIST', tokenId, hotlist: hotlistArr });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_UPDATE_HOTLIST', tokenId, hotlist: hotlistArr });
    } catch (_) {}
  }
}


function sendPlayerInventoryUpdateToHost(tokenId, invArr) {
  if (!tokenId || !Array.isArray(invArr)) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_UPDATE_INVENTORY', tokenId, inventory: invArr });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_UPDATE_INVENTORY', tokenId, inventory: invArr });
    } catch (_) {}
  }
}


function sendPlayerLootMobToHost(tokenId, mobId) {
  if (!tokenId || !mobId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_LOOT_MOB', tokenId, mobId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_LOOT_MOB', tokenId, mobId });
    } catch (_) {}
  }
}

function sendPlayerOpenLootBoxToHost(tokenId, boxInvId) {
  if (!tokenId || !boxInvId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_OPEN_LOOT_BOX', tokenId, boxInvId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_OPEN_LOOT_BOX', tokenId, boxInvId });
    } catch (_) {}
  }
}


function sendPlayerSpendStatPointToHost(tokenId, statKey) {
  if (!tokenId || !statKey) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_SPEND_STAT_POINT', tokenId, statKey });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_SPEND_STAT_POINT', tokenId, statKey });
    } catch (_) {}
  }
}

function sendPlayerGrindSubmitToHost(tokenId, sessionId, hours, skillId) {
  if (!tokenId || !skillId) return;
  if (onlineClientConn && onlineClientConn.open) {
    try {
      onlineClientConn.send({ type: 'PLAYER_SUBMIT_GRIND', tokenId, sessionId, hours, skillId });
    } catch (_) {}
  } else if (syncChannel) {
    try {
      syncChannel.postMessage({ type: 'PLAYER_SUBMIT_GRIND', tokenId, sessionId, hours, skillId });
    } catch (_) {}
  }
}

// =========================================================================
// 2C. PERSISTENT GM SCREEN PIN LOCK (NEVER AUTO-ROTATES)
// =========================================================================
const GM_PIN_STORAGE_KEY = 'dcc_vtt_gm_persistent_pin_v1';
const GM_PIN_SESSION_KEY = 'dcc_vtt_gm_unlocked_session_v1';
const DEFAULT_INITIAL_GM_PIN = '1337';

function getPersistentGmPin() {
  let pin = localStorage.getItem(GM_PIN_STORAGE_KEY);
  if (!pin || !pin.trim()) {
    pin = DEFAULT_INITIAL_GM_PIN;
    localStorage.setItem(GM_PIN_STORAGE_KEY, pin);
  }
  return pin.trim();
}

function isGmScreenUnlocked() {
  if (IS_PLAYER_WINDOW) return false;
  return sessionStorage.getItem(GM_PIN_SESSION_KEY) === getPersistentGmPin();
}

function syncGmPinSettingsUi() {
  const curIn = document.getElementById('gmCurrentPinDisplay');
  if (curIn) curIn.value = getPersistentGmPin();
}

function updatePersistentGmPin() {
  const newIn = document.getElementById('gmNewPinInput');
  const nextPin = (newIn?.value || '').trim();
  if (nextPin.length < 4) {
    showVttToast('⚠️ GM PIN must be at least 4 characters long.');
    return;
  }
  localStorage.setItem(GM_PIN_STORAGE_KEY, nextPin);
  // Keep current GM tab unlocked under the newly saved PIN
  sessionStorage.setItem(GM_PIN_SESSION_KEY, nextPin);
  if (newIn) newIn.value = '';
  syncGmPinSettingsUi();
  showVttToast(`🔐 Saved new persistent GM PIN (${nextPin})!`);
}

function lockGmScreenNow() {
  if (IS_PLAYER_WINDOW) return;
  sessionStorage.removeItem(GM_PIN_SESSION_KEY);
  const modal = document.getElementById('gmPinLockModal');
  const inp = document.getElementById('gmUnlockPinInput');
  const err = document.getElementById('gmUnlockPinError');
  if (err) err.classList.add('hidden');
  if (inp) inp.value = '';
  if (modal) modal.classList.remove('hidden');
  setTimeout(() => { if (inp) inp.focus(); }, 40);
}

function submitGmPinUnlock(event) {
  event.preventDefault();
  const inp = document.getElementById('gmUnlockPinInput');
  const err = document.getElementById('gmUnlockPinError');
  const modal = document.getElementById('gmPinLockModal');
  const entered = (inp?.value || '').trim();
  if (entered && entered === getPersistentGmPin()) {
    sessionStorage.setItem(GM_PIN_SESSION_KEY, entered);
    if (err) err.classList.add('hidden');
    if (inp) inp.value = '';
    if (modal) modal.classList.add('hidden');
    syncGmPinSettingsUi();
    showVttToast('🔓 GM Console Unlocked!');
  } else {
    if (err) err.classList.remove('hidden');
    if (inp) {
      inp.select();
      inp.focus();
    }
  }
}

// =========================================================================
// 10. GOOGLE SHEETS SYNC & BULK IMPORTER
// =========================================================================
function classifySkillGroup(item, hint = '') {
  const explicit = String(item['Skill Group'] || item.skillGroup || item.Group || hint || '').trim().toLowerCase();
  if (explicit.includes('attack')) return 'attack';
  if (explicit.includes('utility')) return 'utility';
  const tags = String(item.Tags || item.tags || '');
  const dmg = String(item['Base Damage'] || item.baseDamage || '');
  if (/melee attack|ranged attack|damage effect/i.test(tags) || /\d+d\d+/i.test(dmg)) return 'attack';
  return 'utility';
}

function saveSheetsWebhookUrl(url) {
  appState.sheetsWebhookUrl = String(url || '').trim();
  commitStateChange();
}

function saveSheetsSecretToken(tok) {
  appState.sheetsSecretToken = String(tok || '').trim();
  commitStateChange();
}

function toggleSheetsUrlVisibility() {
  const urlIn = document.getElementById('googleSheetsWebhookInput');
  const tokIn = document.getElementById('googleSheetsSecretTokenInput');
  const nextType = urlIn?.type === 'password' ? 'text' : 'password';
  if (urlIn) urlIn.type = nextType;
  if (tokIn) tokIn.type = nextType;
}

function saveSheetsWebhookFromButton() {
  const urlIn = document.getElementById('googleSheetsWebhookInput');
  const tokIn = document.getElementById('googleSheetsSecretTokenInput');
  if (urlIn) appState.sheetsWebhookUrl = String(urlIn.value || '').trim();
  if (tokIn) appState.sheetsSecretToken = String(tokIn.value || '').trim();
  commitStateChange();
  showVttToast('💾 Saved Google Sheets credentials locally to this browser!');
}

async function pullFromGoogleSheets() {
  const url = (appState.sheetsWebhookUrl || '').trim();
  if (!url) {
    showVttToast('⚠️ Paste your Google Apps Script Web App URL in Map/IO first.');
    return;
  }
  const token = (appState.sheetsSecretToken || '').trim();
  const badge = document.getElementById('sheetsSyncStatusBadge');
  if (badge) badge.textContent = 'Pulling...';
  try {
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}action=pull${tokenParam}`);
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Pull failed');

    if (Array.isArray(data.Skills) && data.Skills.length > 0) {
      appState.skills = data.Skills.map((r, i) => ({
        id: 'sk_' + i + '_' + Date.now(),
        name: String(r.Name || '').trim(),
        skillGroup: classifySkillGroup(r),
        tags: String(r.Tags || '').trim(),
        range: String(r.Range || '').trim(),
        baseDamage: String(r['Base Damage'] || '').trim(),
        description: String(r.Description || '').trim(),
        effectType: normalizeAbilityEffectType(r['Effect Type'] || r.effectType),
        diceFormula: String(r['Dice Formula'] || r.diceFormula || '').trim(),
        hitStat: String(r['Hit Stat'] || r.hitStat || '').trim(),
        applyBuff: String(r['Apply Buff'] || r.applyBuff || '').trim(),
        applyDebuff: String(r['Apply Debuff'] || r.applyDebuff || '').trim(),
        lightRadiusFt: Number(r['Light Radius'] || r.lightRadiusFt || 0) || 0,
        vfxType: String(r['VFX Type'] || r.vfxType || '').trim(), vfxColor: String(r['VFX Color'] || r.vfxColor || '').trim(), upgrades: [r['Rank 5'], r['Rank 10'], r['Rank 15']].filter(Boolean)
      })).filter(x => x.name);
    }

    if (Array.isArray(data.Spells) && data.Spells.length > 0) {
      appState.spells = data.Spells.map((r, i) => ({
        id: 'sp_' + i + '_' + Date.now(),
        name: String(r.Name || '').trim(),
        quote: String(r.Quote || '').trim(),
        tags: String(r.Tags || '').trim(),
        manaCost: String(r['Mana Cost'] ?? '').trim(),
        range: String(r.Range || '').trim(),
        baseDamage: String(r['Base Damage'] || '').trim(),
        description: String(r.Description || '').trim(),
        effectType: normalizeAbilityEffectType(r['Effect Type'] || r.effectType),
        diceFormula: String(r['Dice Formula'] || r.diceFormula || '').trim(),
        hitStat: String(r['Hit Stat'] || r.hitStat || '').trim(),
        applyBuff: String(r['Apply Buff'] || r.applyBuff || '').trim(),
        applyDebuff: String(r['Apply Debuff'] || r.applyDebuff || '').trim(),
        lightRadiusFt: Number(r['Light Radius'] || r.lightRadiusFt || 0) || 0,
        vfxType: String(r['VFX Type'] || r.vfxType || '').trim(), vfxColor: String(r['VFX Color'] || r.vfxColor || '').trim(), upgrades: [r['Rank 5'], r['Rank 10'], r['Rank 15']].filter(Boolean)
      })).filter(x => x.name);
    }

    if (Array.isArray(data.Buffs) && data.Buffs.length > 0) {
      appState.buffs = data.Buffs.map((r, i) => ({
        id: 'buf_' + i + '_' + Date.now(),
        name: String(r.Name || '').trim(),
        category: String(r.Tags || '').trim(),
        duration: String(r.Duration || '').trim(),
        color: String(r.Color || '#10b981').trim(),
        description: String(r.Description || '').trim()
      })).filter(x => x.name);
    }

    if (Array.isArray(data.Debuffs) && data.Debuffs.length > 0) {
      appState.debuffs = data.Debuffs.map((r, i) => ({
        id: 'deb_' + i + '_' + Date.now(),
        name: String(r.Name || '').trim(),
        category: String(r.Tags || '').trim(),
        duration: String(r.Duration || '').trim(),
        color: String(r.Color || '#ef4444').trim(),
        description: String(r.Description || '').trim()
      })).filter(x => x.name);
    }

    if (badge) badge.textContent = 'Synced ✓';
    commitStateChange();
    showVttToast('⬇️ Pulled latest data from Google Sheets!');
  } catch (err) {
    if (badge) badge.textContent = 'Error';
    showVttToast(`⚠️ Pull failed: ${err.message}`);
  }
}

async function pushToGoogleSheets(mode = 'merge') {
  const url = (appState.sheetsWebhookUrl || '').trim();
  if (!url) {
    showVttToast('⚠️ Paste your Google Apps Script Web App URL in Map/IO first.');
    return;
  }
  const token = (appState.sheetsSecretToken || '').trim();
  const badge = document.getElementById('sheetsSyncStatusBadge');
  if (badge) badge.textContent = 'Pushing...';
  try {
    const tabs = {
      Skills: (appState.skills || []).map(s => ({
        Name: s.name,
        'Skill Group': s.skillGroup || 'utility',
        Tags: s.tags || '',
        Range: s.range || '',
        'Base Damage': s.baseDamage || '',
        Description: s.description || '',
        'Effect Type': s.effectType || '',
        'Dice Formula': s.diceFormula || '',
        'Hit Stat': s.hitStat || '',
        'Apply Buff': s.applyBuff || '',
        'Apply Debuff': s.applyDebuff || '',
        'Light Radius': s.lightRadiusFt || 0,
        'VFX Type': s.vfxType || '',
        'VFX Color': s.vfxColor || '',
        'Rank 5': s.upgrades?.[0] || '',
        'Rank 10': s.upgrades?.[1] || '',
        'Rank 15': s.upgrades?.[2] || ''
      })),
      Spells: (appState.spells || []).map(sp => ({
        Name: sp.name,
        Quote: sp.quote || '',
        Tags: sp.tags || '',
        'Mana Cost': sp.manaCost || '',
        Range: sp.range || '',
        'Base Damage': sp.baseDamage || '',
        Description: sp.description || '',
        'Effect Type': sp.effectType || '',
        'Dice Formula': sp.diceFormula || '',
        'Hit Stat': sp.hitStat || '',
        'Apply Buff': sp.applyBuff || '',
        'Apply Debuff': sp.applyDebuff || '',
        'Light Radius': sp.lightRadiusFt || 0,
        'VFX Type': sp.vfxType || '',
        'VFX Color': sp.vfxColor || '',
        'Rank 5': sp.upgrades?.[0] || '',
        'Rank 10': sp.upgrades?.[1] || '',
        'Rank 15': sp.upgrades?.[2] || ''
      })),
      Buffs: (appState.buffs || []).map(b => ({
        Name: b.name,
        Tags: b.category || '',
        Duration: b.duration || '',
        Color: b.color || '#10b981',
        Description: b.description || ''
      })),
      Debuffs: (appState.debuffs || []).map(d => ({
        Name: d.name,
        Tags: d.category || '',
        Duration: d.duration || '',
        Color: d.color || '#ef4444',
        Description: d.description || ''
      }))
    };

    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'push', mode, token, tabs })
    });
    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message || 'Push failed');
    if (badge) badge.textContent = 'Pushed ✓';
    showVttToast(`⬆️ ${mode === 'replace' ? 'Replaced' : 'Merged'} VTT catalogs to Google Sheets!`);
  } catch (err) {
    if (badge) badge.textContent = 'Error';
    showVttToast(`⚠️ Push failed: ${err.message}`);
  }
}

function openBulkModal(target = 'auto') {
  const modal = document.getElementById('bulkImportModal');
  const sel = document.getElementById('bulkTargetSelect');
  if (sel) sel.value = target;
  if (modal) modal.classList.remove('hidden');
}

function closeBulkModal() {
  const modal = document.getElementById('bulkImportModal');
  if (modal) modal.classList.add('hidden');
}

function fillBulkSampleTemplate() {
  const ta = document.getElementById('bulkPasteTextarea');
  if (ta) {
    ta.value = JSON.stringify([
      { Name: 'FIREBALL', Tags: 'Attack, Fire, Area of Effect', 'Mana Cost': 45, Range: '80 feet', 'Base Damage': '1d12 + Int Fire', Description: 'Slow-moving fire sphere.' }
    ], null, 2);
  }
}

function importParsedRowsIntoCatalog(rows, targetHint = 'auto') {
  let count = 0;
  rows.forEach((r, idx) => {
    const name = String(r.Name || r.name || '').trim();
    if (!name) return;
    const t = targetHint.toLowerCase();
    if (t.includes('spell') || ('Mana Cost' in r) || ('manaCost' in r)) {
      appState.spells.push({
        id: `sp_imp_${Date.now()}_${idx}`,
        name,
        quote: String(r.Quote || '').trim(),
        tags: String(r.Tags || '').trim(),
        manaCost: String(r['Mana Cost'] ?? r.manaCost ?? '').trim(),
        range: String(r.Range || '').trim(),
        baseDamage: String(r['Base Damage'] || r.baseDamage || '').trim(),
        description: String(r.Description || '').trim(),
        effectType: normalizeAbilityEffectType(r['Effect Type'] || r.effectType),
        diceFormula: String(r['Dice Formula'] || r.diceFormula || '').trim(),
        hitStat: String(r['Hit Stat'] || r.hitStat || '').trim(),
        applyBuff: String(r['Apply Buff'] || r.applyBuff || '').trim(),
        applyDebuff: String(r['Apply Debuff'] || r.applyDebuff || '').trim(),
        lightRadiusFt: Number(r['Light Radius'] || r.lightRadiusFt || 0) || 0,
        vfxType: String(r['VFX Type'] || r.vfxType || '').trim(), vfxColor: String(r['VFX Color'] || r.vfxColor || '').trim(), upgrades: [r['Rank 5'], r['Rank 10'], r['Rank 15']].filter(Boolean)
      });
      count++;
    } else if (t.includes('buff') && !t.includes('debuff')) {
      appState.buffs.push({
        id: `buf_imp_${Date.now()}_${idx}`,
        name,
        category: String(r.Tags || r.Category || '').trim(),
        duration: String(r.Duration || '').trim(),
        color: String(r.Color || '#10b981').trim(),
        description: String(r.Description || '').trim()
      });
      count++;
    } else if (t.includes('debuff')) {
      appState.debuffs.push({
        id: `deb_imp_${Date.now()}_${idx}`,
        name,
        category: String(r.Tags || r.Category || '').trim(),
        duration: String(r.Duration || '').trim(),
        color: String(r.Color || '#ef4444').trim(),
        description: String(r.Description || '').trim()
      });
      count++;
    } else if (t.includes('bestiary') || t.includes('mob') || ('Evade' in r) || ('Surprise' in r) || ('Neighborhood' in r)) {
      const maxPips = Math.max(1, Number(r['Max Pips'] || r.maxPips || r.Pips || 3) || 3);
      const hpPerPip = Math.max(1, Number(r['HP/Pip'] || r.hpPerPip || 2) || 2);
      appState.bestiary.push({
        templateId: `tpl_imp_${Date.now()}_${idx}`,
        name,
        role: 'mob',
        tier: String(r.Tier || r.tier || (/boss/i.test(String(r.Classification || '')) ? 'Boss' : 'Mob')).trim(),
        neighborhood: String(r.Neighborhood || r.neighborhood || r.Area || '').trim(),
        quarter: String(r.Quarter || r.quarter || '').trim(),
        classification: String(r.Classification || r.classification || 'Mob; Medium (4)').trim(),
        level: Math.max(1, Number(r.Level || r.level || 1) || 1),
        maxPips,
        hpPerPip,
        maxMana: Math.max(0, Number(r['Max Mana'] || r.maxMana || 0) || 0),
        surprise: String(r.Surprise || r.surprise || '12+F').trim(),
        evade: String(r.Evade || r.evade || '12+F').trim(),
        move: String(r.Move || r.move || '30+S').trim(),
        dr: String(r.DR ?? r.dr ?? '1').trim(),
        stats: {
          Str: String(r.Str || '3 (+2)'),
          Int: String(r.Int || '2 (+1)'),
          Con: String(r.Con || '3 (+2)'),
          Dex: String(r.Dex || '3 (+2)'),
          Cha: String(r.Cha || '1 (+1)')
        },
        iconSymbol: String(r.Icon || r.iconSymbol || '👹').trim(),
        color: String(r.Color || r.color || '#ef4444').trim(),
        lore: String(r.Lore || r.lore || '').trim(),
        aiCommentary: String(r['AI Commentary'] || r.aiCommentary || '').trim(),
        attacks: Array.isArray(r.attacks) ? r.attacks : (r.Attack ? [{ name: String(r.Attack), hitBonus: String(r.Hit || '12+F'), rangeFt: Number(r.Range || 5) || 5, damage: String(r.Damage || '1d6'), special: String(r.Special || '') }] : []),
        notes: String(r.Notes || r.notes || '').trim()
      });
      count++;
    } else {
      appState.skills.push({
        id: `sk_imp_${Date.now()}_${idx}`,
        name,
        skillGroup: classifySkillGroup(r, targetHint),
        tags: String(r.Tags || '').trim(),
        range: String(r.Range || '').trim(),
        baseDamage: String(r['Base Damage'] || r.baseDamage || '').trim(),
        description: String(r.Description || '').trim(),
        effectType: normalizeAbilityEffectType(r['Effect Type'] || r.effectType),
        diceFormula: String(r['Dice Formula'] || r.diceFormula || '').trim(),
        hitStat: String(r['Hit Stat'] || r.hitStat || '').trim(),
        applyBuff: String(r['Apply Buff'] || r.applyBuff || '').trim(),
        applyDebuff: String(r['Apply Debuff'] || r.applyDebuff || '').trim(),
        lightRadiusFt: Number(r['Light Radius'] || r.lightRadiusFt || 0) || 0,
        vfxType: String(r['VFX Type'] || r.vfxType || '').trim(), vfxColor: String(r['VFX Color'] || r.vfxColor || '').trim(), upgrades: [r['Rank 5'], r['Rank 10'], r['Rank 15']].filter(Boolean)
      });
      count++;
    }
  });
  return count;
}

function handleBulkFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const targetHint = document.getElementById('bulkTargetSelect')?.value || 'auto';
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      let total = 0;
      wb.SheetNames.forEach(sheetName => {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
        const effectiveHint = targetHint === 'auto' ? sheetName : targetHint;
        total += importParsedRowsIntoCatalog(rows, effectiveHint);
      });
      closeBulkModal();
      commitStateChange();
      showVttToast(`📥 Imported ${total} entries from ${file.name}!`);
    } catch (err) {
      showVttToast(`⚠️ Import failed: ${err.message}`);
    }
  };
  reader.readAsArrayBuffer(file);
}

function processBulkPasteImport() {
  const raw = (document.getElementById('bulkPasteTextarea')?.value || '').trim();
  if (!raw) return;
  const targetHint = document.getElementById('bulkTargetSelect')?.value || 'auto';
  try {
    let rows = [];
    if (raw.startsWith('[') || raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      const wb = XLSX.read(raw, { type: 'string' });
      rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    }
    const total = importParsedRowsIntoCatalog(rows, targetHint);
    closeBulkModal();
    commitStateChange();
    showVttToast(`📥 Imported ${total} pasted entries!`);
  } catch (err) {
    showVttToast(`⚠️ Paste import error: ${err.message}`);
  }
}



function sendPrivateAlertToCrawler(tokenId, title, bodyText, actionLabel = '', actionKind = '', actionArg = '') {
  if (!tokenId) return;
  const payload = {
    type: 'PRIVATE_CRAWLER_ALERT',
    tokenId,
    title: String(title || 'Trap Intel'),
    body: String(bodyText || ''),
    actionLabel: String(actionLabel || ''),
    actionKind: String(actionKind || ''),
    actionArg: String(actionArg || ''),
    timestamp: Date.now()
  };
  if (IS_PLAYER_WINDOW) {
    if (uiState.claimedCrawlerId === tokenId && typeof showPrivateCrawlerAlertPopup === 'function') {
      showPrivateCrawlerAlertPopup(payload);
    }
    return;
  }
  if (uiState.selectedTokenId === tokenId && typeof showPrivateCrawlerAlertPopup === 'function') {
    showPrivateCrawlerAlertPopup(payload);
  }
  if (Array.isArray(onlineHostConnections)) {
    onlineHostConnections.forEach(c => {
      if (c && c.open && c._isAuthenticated && c._claimedTokenId === tokenId) {
        try { c.send(payload); } catch (_) {}
      }
    });
  }
}

