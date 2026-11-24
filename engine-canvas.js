// =========================================================================
// 4. 2D RAYCAST WALL OCCLUSION, FOG OF WAR & GHOST TRACKING
// =========================================================================
const canvas = document.getElementById('battleCanvas');
const ctx = canvas.getContext('2d');
const darknessCanvas = document.createElement('canvas');
const darknessCtx = darknessCanvas.getContext('2d');
const fowCanvas = document.createElement('canvas');
const fowCtx = fowCanvas.getContext('2d');
const exploredMemCanvas = document.createElement('canvas');
const exploredMemCtx = exploredMemCanvas.getContext('2d');

// Seamless tileable procedural smoke/mist texture for tangible Fog of War
const fogSmokeTileSize = 256;
const fogSmokeTileCanvas = document.createElement('canvas');
fogSmokeTileCanvas.width = fogSmokeTileSize;
fogSmokeTileCanvas.height = fogSmokeTileSize;
const fogSmokeTileCtx = fogSmokeTileCanvas.getContext('2d');
let fogSmokePattern = null;

(function buildProceduralFogSmokeTile() {
  const s = fogSmokeTileSize;
  const tctx = fogSmokeTileCtx;
  tctx.clearRect(0, 0, s, s);
  let seed = 133742;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Layer 56 toroidal soft smoke puffs so tiling has zero seams
  for (let i = 0; i < 56; i++) {
    const cx = rand() * s;
    const cy = rand() * s;
    const r = 28 + rand() * 54;
    const kind = i % 3;
    let cInner, cMid;
    if (kind === 0) {
      cInner = `rgba(51, 65, 85, ${(0.20 + rand() * 0.14).toFixed(3)})`;
      cMid = `rgba(30, 41, 59, ${(0.10 + rand() * 0.08).toFixed(3)})`;
    } else if (kind === 1) {
      cInner = `rgba(148, 163, 184, ${(0.11 + rand() * 0.08).toFixed(3)})`;
      cMid = `rgba(71, 85, 105, ${(0.06 + rand() * 0.05).toFixed(3)})`;
    } else {
      cInner = `rgba(4, 8, 18, ${(0.34 + rand() * 0.18).toFixed(3)})`;
      cMid = `rgba(15, 23, 42, ${(0.16 + rand() * 0.10).toFixed(3)})`;
    }
    for (let ox = -s; ox <= s; ox += s) {
      for (let oy = -s; oy <= s; oy += s) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + r < 0 || px - r > s || py + r < 0 || py - r > s) continue;
        const g = tctx.createRadialGradient(px, py, r * 0.08, px, py, r);
        g.addColorStop(0, cInner);
        g.addColorStop(0.55, cMid);
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        tctx.fillStyle = g;
        tctx.beginPath();
        tctx.arc(px, py, r, 0, Math.PI * 2);
        tctx.fill();
      }
    }
  }
})();

function resizeBattleCanvas() {
  const wrap = document.getElementById('canvasWrapper');
  if (!wrap) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, wrap.clientWidth);
  const h = Math.max(1, wrap.clientHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  darknessCanvas.width = w;
  darknessCanvas.height = h;
  fowCanvas.width = w;
  fowCanvas.height = h;
  exploredMemCanvas.width = w;
  exploredMemCanvas.height = h;
  exploredMemDirty = true;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function getBlockingWallSegments(scene) {
  return (scene?.walls || []).filter(w => !(w.kind === 'door' && w.open));
}

function getWallsSignature(walls) {
  if (!walls || walls.length === 0) return 'none';
  return walls.map(w => `${Math.round(w.x1)},${Math.round(w.y1)}-${Math.round(w.x2)},${Math.round(w.y2)}`).join(';');
}

function raySegmentIntersect(rx, ry, rdx, rdy, x1, y1, x2, y2) {
  const sdx = x2 - x1;
  const sdy = y2 - y1;
  const denom = rdx * sdy - rdy * sdx;
  if (Math.abs(denom) < 1e-8) return null;
  const t = ((x1 - rx) * sdy - (y1 - ry) * sdx) / denom;
  const u = ((x1 - rx) * rdy - (y1 - ry) * rdx) / denom;
  if (t >= 0 && u >= -1e-6 && u <= 1 + 1e-6) return t;
  return null;
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    wx: (clientX - rect.left - uiState.camX) / uiState.camZoom,
    wy: (clientY - rect.top - uiState.camY) / uiState.camZoom
  };
}

function worldToGrid(wx, wy) {
  const gs = getActiveScene()?.gridSize || 56;
  return { gx: Math.floor(wx / gs), gy: Math.floor(wy / gs) };
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-8) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function findWallSegmentAtWorld(wx, wy, maxDist = 12) {
  const walls = getActiveScene()?.walls || [];
  let best = null;
  let bestDist = maxDist;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    const d = pointToSegmentDist(wx, wy, w.x1, w.y1, w.x2, w.y2);
    if (d <= bestDist) { bestDist = d; best = w; }
  }
  return best;
}

function snapPointIfNeeded(wx, wy, gs) {
  if (!uiState.wallSnapGrid) return { x: wx, y: wy };
  const half = gs / 2;
  return { x: Math.round(wx / half) * half, y: Math.round(wy / half) * half };
}

function computeVisibilityPolygon(ox, oy, maxDistPx, blockingWalls, angleDeg = 360, facingDeg = 0) {
  const spread = Math.max(15, Math.min(360, Number(angleDeg) || 360));
  const isFull = spread >= 359.5;
  const wallSig = getWallsSignature(blockingWalls);
  const cacheKey = `${Math.round(ox)},${Math.round(oy)},${Math.round(maxDistPx)},${spread},${Math.round(facingDeg)},${wallSig}`;
  if (visPolyCache.has(cacheKey)) return visPolyCache.get(cacheKey);

  const numRays = isFull ? 144 : Math.max(24, Math.ceil((spread / 360) * 144));
  const startAngle = isFull ? 0 : ((facingDeg - spread / 2) * Math.PI) / 180;
  const totalRad = isFull ? Math.PI * 2 : (spread * Math.PI) / 180;
  const pts = [];

  for (let i = 0; i <= numRays; i++) {
    if (isFull && i === numRays) break;
    const ang = startAngle + (i / numRays) * totalRad;
    const rdx = Math.cos(ang);
    const rdy = Math.sin(ang);
    let closestT = maxDistPx;
    for (let j = 0; j < blockingWalls.length; j++) {
      const w = blockingWalls[j];
      const t = raySegmentIntersect(ox, oy, rdx, rdy, w.x1, w.y1, w.x2, w.y2);
      if (t !== null && t < closestT) closestT = t;
    }
    pts.push({ x: ox + rdx * closestT, y: oy + rdy * closestT });
  }
  if (visPolyCache.size > 200) visPolyCache.clear();
  visPolyCache.set(cacheKey, pts);
  return pts;
}

function traceRayPolygonPath(targetCtx, ox, oy, poly, isFullCircle = true) {
  if (!poly || poly.length === 0) return;
  targetCtx.beginPath();
  if (!isFullCircle) {
    targetCtx.moveTo(ox, oy);
    targetCtx.lineTo(poly[0].x, poly[0].y);
  } else {
    targetCtx.moveTo(poly[0].x, poly[0].y);
  }
  for (let i = 1; i < poly.length; i++) targetCtx.lineTo(poly[i].x, poly[i].y);
  targetCtx.closePath();
}

function getCrawlerVisionSources(scene, gs, blockingWalls) {
  const crawlers = (scene?.tokens || []).filter(t => t.role === 'crawler');
  return crawlers.map(c => {
    const gx = c.gx;
    const gy = c.gy;
    const ox = (gx + 0.5) * gs;
    const oy = (gy + 0.5) * gs;
    const effLightFt = getEffectiveTokenLightRadiusFt(c);
    const personalSightFt = Math.max(10, effLightFt > 0 ? effLightFt * 2 : 10);
    const radiusPx = (personalSightFt / 5) * gs;
    const losRadiusPx = 100 * gs; // 500ft unobstructed Line of Sight (impeded only by walls & darkness)
    return {
      tokenId: c.id,
      gx,
      gy,
      ox,
      oy,
      radiusPx,
      losRadiusPx,
      poly: computeVisibilityPolygon(ox, oy, radiusPx, blockingWalls, 360, 0),
      losPoly: computeVisibilityPolygon(ox, oy, losRadiusPx, blockingWalls, 360, 0)
    };
  });
}

function isPointSeenInLightOrSight(wx, wy, scene, gs, crawlerVisList, blockingWalls) {
  if (!crawlerVisList || crawlerVisList.length === 0) return true;

  // 1. Must have unobstructed Line of Sight from at least one Crawler (walls & closed doors block LOS)
  const hasCrawlerLos = crawlerVisList.some(cv => hasLineOfSightBetweenPoints(cv.ox, cv.oy, wx, wy, blockingWalls));
  if (!hasCrawlerLos) return false;

  // 2. If ambient map lighting is Bright or Dim (not True Darkness), unobstructed LOS sees as far as the eye can see!
  const darkness = Math.max(0, Math.min(1, scene?.ambientDarkness ?? 0.45));
  if (darkness < 0.85) return true;

  // 3. In True Darkness, crawlers see within their personal close/torch radius OR anywhere illuminated by a light source (even if the light source itself is around a wall!)
  for (let i = 0; i < crawlerVisList.length; i++) {
    const cv = crawlerVisList[i];
    if (Math.hypot(wx - cv.ox, wy - cv.oy) <= cv.radiusPx) {
      return true;
    }
  }

  const checkLit = (lx, ly, radFt, dimOnly = false, angleDeg = 360, facingDeg = 0, maxReachFt = 0) => {
    if (!radFt || radFt <= 0) return false;
    const dx = wx - lx;
    const dy = wy - ly;
    const distFt = (Math.hypot(dx, dy) / gs) * 5;
    const unclipped = dimOnly ? radFt : radFt * 2;
    const effMax = (maxReachFt && maxReachFt > 0) ? Math.min(unclipped, maxReachFt) : unclipped;
    if (distFt > effMax) return false;
    if (distFt > 0.25 && !isAngleInsideLightCone(Math.atan2(dy, dx), facingDeg, angleDeg)) return false;
    return hasLineOfSightBetweenPoints(lx, ly, wx, wy, blockingWalls);
  };

  for (const t of (scene?.tokens || [])) {
    if (t.role === 'mob' && t.hiddenFromPlayers) continue;
    const effLight = getEffectiveTokenLightRadiusFt(t);
    if (effLight > 0) {
      const tx = ((t.role === 'crawler' ? t.gx : (uiState.isDraggingToken && uiState.draggedTokenId === t.id ? uiState.dragPreviewGx : t.gx)) + 0.5) * gs;
      const ty = ((t.role === 'crawler' ? t.gy : (uiState.isDraggingToken && uiState.draggedTokenId === t.id ? uiState.dragPreviewGy : t.gy)) + 0.5) * gs;
      if (checkLit(tx, ty, effLight, Boolean(t.lightDimOnly), t.lightAngleDeg || 360, t.lightFacingDeg || 0, t.lightMaxReachFt || 0)) return true;
    }
  }
  for (const obj of (scene?.mapObjects || [])) {
    if (obj.hiddenFromPlayers) continue;
    if ((obj.lightRadiusFt || 0) > 0 && checkLit((obj.gx + 0.5) * gs, (obj.gy + 0.5) * gs, obj.lightRadiusFt)) return true;
  }
  for (const lt of (scene?.droppedLights || [])) {
    const pos = getDroppedLightWorldPos(lt, gs);
    if (checkLit(pos.wx, pos.wy, lt.radiusFt || 25, Boolean(lt.dimOnly), lt.angleDeg || 360, lt.facingDeg || 0, lt.maxReachFt || 0)) return true;
  }
  return false;
}

function isLightVisibleToCrawlers(lwx, lwy, clipPx, crawlerVisList, blockingWalls, angleDeg = 360, facingDeg = 0) {
  if (!crawlerVisList || crawlerVisList.length === 0) return true;
  // Compute the light's actual wall-clipped illuminated polygon, then check if a crawler can see either the source OR any lit perimeter point around a corner!
  const lightPoly = computeVisibilityPolygon(lwx, lwy, clipPx, blockingWalls, angleDeg, facingDeg);
  for (let i = 0; i < crawlerVisList.length; i++) {
    const cv = crawlerVisList[i];
    // Direct LOS to the distant light source itself (unlimited distance if unobstructed!)
    if (hasLineOfSightBetweenPoints(cv.ox, cv.oy, lwx, lwy, blockingWalls)) {
      return true;
    }
    // Indirect LOS to light spilling around a wall/corner (sample perimeter & midpoints of the light's visibility polygon)
    const step = Math.max(1, Math.floor(lightPoly.length / 36));
    for (let pIdx = 0; pIdx < lightPoly.length; pIdx += step) {
      const pt = lightPoly[pIdx];
      if (hasLineOfSightBetweenPoints(cv.ox, cv.oy, pt.x, pt.y, blockingWalls)) return true;
      const midX = (lwx + pt.x) * 0.5;
      const midY = (lwy + pt.y) * 0.5;
      if (hasLineOfSightBetweenPoints(cv.ox, cv.oy, midX, midY, blockingWalls)) return true;
    }
  }
  return false;
}

function updateExplorationMemoryAndGhosts(scene, gs, crawlerVisList, blockingWalls) {
  if (!scene) return;
  scene.exploredSpots = scene.exploredSpots || [];
  scene.ghostMarkers = scene.ghostMarkers || [];

  if (!appState?.minimapOffline) {
    crawlerVisList.forEach(cv => {
      const radFt = Math.round((cv.radiusPx / gs) * 5);
      const exists = scene.exploredSpots.some(sp => Math.hypot(sp.wx - cv.ox, sp.wy - cv.oy) < gs * 0.6 && sp.radiusFt >= radFt);
      if (!exists) {
        scene.exploredSpots.push({ wx: cv.ox, wy: cv.oy, radiusFt: radFt });
        exploredMemDirty = true;
      }
    });
  }

  (scene.tokens || []).forEach(tok => {
    if (tok.role !== 'mob') return;
    const mx = (tok.gx + 0.5) * gs;
    const my = (tok.gy + 0.5) * gs;
    const currentlyVisible = !tok.hiddenFromPlayers && isPointSeenInLightOrSight(mx, my, scene, gs, crawlerVisList, blockingWalls);
    if (currentlyVisible) {
      tok.wasSeenByCrawlers = true;
      tok.lastSeenGx = tok.gx;
      tok.lastSeenGy = tok.gy;
      if (appState) {
        appState.encounteredMobTypes = Array.isArray(appState.encounteredMobTypes) ? appState.encounteredMobTypes : [];
        const mobKey = String(tok.templateId || tok.name || '').trim().toLowerCase();
        if (mobKey && !appState.encounteredMobTypes.includes(mobKey)) {
          appState.encounteredMobTypes.push(mobKey);
        }
      }
      scene.ghostMarkers = scene.ghostMarkers.filter(g => g.sourceTokenId !== tok.id);
    } else if (tok.wasSeenByCrawlers && tok.lastSeenGx !== undefined) {
      const existingGhost = scene.ghostMarkers.find(g => g.sourceTokenId === tok.id);
      if (!existingGhost) {
        scene.ghostMarkers.push({
          id: 'ghost_' + tok.id,
          sourceTokenId: tok.id,
          name: tok.name,
          iconSymbol: tok.iconSymbol || '👹',
          color: tok.color || '#ef4444',
          gx: tok.lastSeenGx,
          gy: tok.lastSeenGy
        });
      }
    }
  });
}

function rebuildExploredMemoryBuffer(scene, gs, blockingWalls, w, h) {
  // Alpha mask of UNEXPLORED territory: 1.0 = unexplored (thick rolling smoke), 0.0 = explored (darkened memory only)
  exploredMemCtx.save();
  exploredMemCtx.globalCompositeOperation = 'source-over';
  exploredMemCtx.clearRect(0, 0, w, h);
  exploredMemCtx.fillStyle = 'rgba(0, 0, 0, 1)';
  exploredMemCtx.fillRect(0, 0, w, h);

  if (!appState?.minimapOffline) {
    exploredMemCtx.globalCompositeOperation = 'destination-out';
    (scene?.exploredSpots || []).forEach(sp => {
      const sx = sp.wx * uiState.camZoom + uiState.camX;
      const sy = sp.wy * uiState.camZoom + uiState.camY;
      const sr = ((sp.radiusFt || 25) / 5) * gs * uiState.camZoom;
      const poly = computeVisibilityPolygon(sp.wx, sp.wy, ((sp.radiusFt || 25) / 5) * gs, blockingWalls, 360, 0);
      const screenPoly = poly.map(p => ({ x: p.x * uiState.camZoom + uiState.camX, y: p.y * uiState.camZoom + uiState.camY }));
      const g = exploredMemCtx.createRadialGradient(sx, sy, sr * 0.62, sx, sy, sr);
      g.addColorStop(0, 'rgba(0, 0, 0, 1)');
      g.addColorStop(0.78, 'rgba(0, 0, 0, 0.85)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      exploredMemCtx.fillStyle = g;
      traceRayPolygonPath(exploredMemCtx, sx, sy, screenPoly, true);
      exploredMemCtx.fill();
    });
  }
  exploredMemCtx.restore();

  exploredMemDirty = false;
  lastExploredCameraKey = `${uiState.camX.toFixed(1)}|${uiState.camY.toFixed(1)}|${uiState.camZoom.toFixed(3)}|${appState?.minimapOffline ? 1 : 0}`;
}

function carveLiveVisionMask(targetCtx, crawlerVisList, lightSources, gs, blockingWalls, darknessAlpha, innerSoftFrac = 0.68) {
  targetCtx.save();
  targetCtx.beginPath();
  crawlerVisList.forEach(cv => {
    const screenLosPoly = cv.losPoly.map(p => ({
      x: p.x * uiState.camZoom + uiState.camX,
      y: p.y * uiState.camZoom + uiState.camY
    }));
    if (screenLosPoly.length > 0) {
      targetCtx.moveTo(screenLosPoly[0].x, screenLosPoly[0].y);
      for (let i = 1; i < screenLosPoly.length; i++) {
        targetCtx.lineTo(screenLosPoly[i].x, screenLosPoly[i].y);
      }
      targetCtx.closePath();
    }
  });
  targetCtx.clip();
  targetCtx.globalCompositeOperation = 'destination-out';

  const isTrueDark = darknessAlpha >= 0.85;
  crawlerVisList.forEach(cv => {
    const sx = cv.ox * uiState.camZoom + uiState.camX;
    const sy = cv.oy * uiState.camZoom + uiState.camY;
    if (!isTrueDark) {
      const fullSr = cv.losRadiusPx * uiState.camZoom;
      const screenLosPoly = cv.losPoly.map(p => ({ x: p.x * uiState.camZoom + uiState.camX, y: p.y * uiState.camZoom + uiState.camY }));
      const grad = targetCtx.createRadialGradient(sx, sy, fullSr * 0.84, sx, sy, fullSr);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      targetCtx.fillStyle = grad;
      traceRayPolygonPath(targetCtx, sx, sy, screenLosPoly, true);
      targetCtx.fill();
    } else {
      const sr = cv.radiusPx * uiState.camZoom;
      const screenPoly = cv.poly.map(p => ({ x: p.x * uiState.camZoom + uiState.camX, y: p.y * uiState.camZoom + uiState.camY }));
      const grad = targetCtx.createRadialGradient(sx, sy, sr * innerSoftFrac, sx, sy, sr);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      targetCtx.fillStyle = grad;
      traceRayPolygonPath(targetCtx, sx, sy, screenPoly, true);
      targetCtx.fill();
    }
  });

  lightSources.forEach(src => {
    const unclippedFt = src.dimOnly ? src.radiusFt : src.radiusFt * 2;
    const effMaxFt = (src.maxReachFt && src.maxReachFt > 0) ? Math.min(unclippedFt, src.maxReachFt) : unclippedFt;
    const maxPx = (effMaxFt / 5) * gs;
    const sx = src.wx * uiState.camZoom + uiState.camX;
    const sy = src.wy * uiState.camZoom + uiState.camY;
    const sr = maxPx * uiState.camZoom;
    const poly = computeVisibilityPolygon(src.wx, src.wy, maxPx, blockingWalls, src.angleDeg, src.facingDeg);
    const screenPoly = poly.map(p => ({ x: p.x * uiState.camZoom + uiState.camX, y: p.y * uiState.camZoom + uiState.camY }));
    const grad = targetCtx.createRadialGradient(sx, sy, sr * 0.28, sx, sy, sr);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(0.72, 'rgba(0, 0, 0, 0.92)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    targetCtx.fillStyle = grad;
    traceRayPolygonPath(targetCtx, sx, sy, screenPoly, src.angleDeg >= 359.5);
    targetCtx.fill();
  });

  targetCtx.restore();
}

function drawScrollingSmokeFill(targetCtx, w, h, nowMs, zoom, camX, camY) {
  if (!fogSmokePattern) {
    fogSmokePattern = targetCtx.createPattern(fogSmokeTileCanvas, 'repeat');
  }
  if (!fogSmokePattern) return;
  const s = fogSmokeTileSize;

  // Layer 1: Primary drifting mist (world-anchored + slow NE drift)
  targetCtx.save();
  targetCtx.globalAlpha = 0.88;
  const drift1X = ((camX + nowMs * 0.011 * zoom) % (s * zoom));
  const drift1Y = ((camY - nowMs * 0.007 * zoom) % (s * zoom));
  targetCtx.translate(drift1X, drift1Y);
  targetCtx.scale(zoom, zoom);
  targetCtx.fillStyle = fogSmokePattern;
  const pad = s * 2;
  targetCtx.fillRect(-pad, -pad, (w / zoom) + pad * 2, (h / zoom) + pad * 2);
  targetCtx.restore();

  // Layer 2: Secondary larger billowing mist (counter-drift SW for depth)
  targetCtx.save();
  targetCtx.globalAlpha = 0.58;
  const z2 = zoom * 1.45;
  const drift2X = ((camX - nowMs * 0.008 * z2) % (s * z2));
  const drift2Y = ((camY + nowMs * 0.005 * z2) % (s * z2));
  targetCtx.translate(drift2X, drift2Y);
  targetCtx.scale(z2, z2);
  targetCtx.fillStyle = fogSmokePattern;
  targetCtx.fillRect(-pad, -pad, (w / z2) + pad * 2, (h / z2) + pad * 2);
  targetCtx.restore();
}

function getSegmentBoundaryEdgesFromZones(scene, gs) {
  const zones = typeof getTerrainZonesForScene === 'function' ? getTerrainZonesForScene(scene) : [];
  const edges = [];
  zones.forEach(z => {
    if (IS_PLAYER_WINDOW && z.hiddenFromPlayers) return;
    const zElev = clampElevationFt(z.elevationFt);
    if (zElev === 0) return;
    const x1 = Math.min(z.gx1, z.gx2) * gs;
    const x2 = (Math.max(z.gx1, z.gx2) + 1) * gs;
    const y1 = Math.min(z.gy1, z.gy2) * gs;
    const y2 = (Math.max(z.gy1, z.gy2) + 1) * gs;
    edges.push({ x1, y1, x2, y1, zHeight: zElev });
    edges.push({ x2, y1, x2, y2, zHeight: zElev });
    edges.push({ x2, y2, x1, y2, zHeight: zElev });
    edges.push({ x1, y2, x1, y1, zHeight: zElev });
  });
  return edges;
}

function hasLineOfSightBetweenPoints(x1, y1, x2, y2, blockingWalls, z1 = 0, z2 = 0, scene = null, gs = 56) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) return true;
  const rdx = dx / dist;
  const rdy = dy / dist;

  if (blockingWalls && blockingWalls.length > 0) {
    for (let i = 0; i < blockingWalls.length; i++) {
      const w = blockingWalls[i];
      const t = raySegmentIntersect(x1, y1, rdx, rdy, w.x1, w.y1, w.x2, w.y2);
      if (t !== null && t < dist - 0.5) {
        const wElev = Number(w.wallHeightFt) || 0;
        if (wElev > 0) {
          const rayZAtWall = (Number(z1) || 0) + ((Number(z2) || 0) - (Number(z1) || 0)) * (t / dist);
          if (rayZAtWall >= wElev) continue;
        }
        return false;
      }
    }
  }

  // 2.5D Elevation Rim / Edge Occlusion (5ft steps):
  // If a ray crosses a raised/lowered zone boundary, compare interpolated ray height against the step height.
  if (scene && (Math.abs((Number(z1) || 0) - (Number(z2) || 0)) > 0 || (scene.terrainZones && scene.terrainZones.length > 0))) {
    const stepEdges = getSegmentBoundaryEdgesFromZones(scene, gs);
    for (let e = 0; e < stepEdges.length; e++) {
      const ed = stepEdges[e];
      const t = raySegmentIntersect(x1, y1, rdx, rdy, ed.x1, ed.y1, ed.x2, ed.y2);
      if (t !== null && t > 1.5 && t < dist - 1.5) {
        const rayZ = (Number(z1) || 0) + ((Number(z2) || 0) - (Number(z1) || 0)) * (t / dist);
        const rimZ = ed.zHeight;
        // High viewer away from edge looking down into a low spot near the rim can be lip-occluded
        if (rimZ > 0 && (Number(z1) || 0) >= rimZ && rayZ < rimZ - 1e-6) {
          return false;
        }
        // Low viewer inside a sunken pit looking up over a rim can be blocked by rim height
        if (rimZ < 0 && (Number(z1) || 0) <= rimZ && rayZ < 0) {
          return false;
        }
      }
    }
  }

  return true;
}

function isGridCellBlockedByWall(gx, gy, scene, blockingWalls) {
  const gs = scene?.gridSize || 56;
  const walls = blockingWalls || getBlockingWallSegments(scene);
  if (!walls || walls.length === 0) return false;
  const cx = (gx + 0.5) * gs;
  const cy = (gy + 0.5) * gs;
  const pad = gs * 0.24;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (pointToSegmentDist(cx, cy, w.x1, w.y1, w.x2, w.y2) <= pad) return true;
  }
  return false;
}

function computeReachableGridMap(startGx, startGy, maxFt, scene) {
  const gs = scene?.gridSize || 56;
  const blockingWalls = getBlockingWallSegments(scene);
  const maxSteps = Math.max(0, Math.floor(maxFt / 5));
  const distMap = new Map();
  distMap.set(`${startGx},${startGy}`, 0);
  if (maxSteps <= 0) return distMap;

  const queue = [{ gx: startGx, gy: startGy, dist: 0 }];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.dist >= maxSteps) continue;
    const p1x = (cur.gx + 0.5) * gs;
    const p1y = (cur.gy + 0.5) * gs;

    const neighbors = [
      { gx: cur.gx + 1, gy: cur.gy },
      { gx: cur.gx - 1, gy: cur.gy },
      { gx: cur.gx, gy: cur.gy + 1 },
      { gx: cur.gx, gy: cur.gy - 1 },
      { gx: cur.gx + 1, gy: cur.gy + 1 },
      { gx: cur.gx + 1, gy: cur.gy - 1 },
      { gx: cur.gx - 1, gy: cur.gy + 1 },
      { gx: cur.gx - 1, gy: cur.gy - 1 }
    ];
    for (let i = 0; i < neighbors.length; i++) {
      const nb = neighbors[i];
      const key = `${nb.gx},${nb.gy}`;
      if (distMap.has(key)) continue;
      if (isGridCellBlockedByWall(nb.gx, nb.gy, scene, blockingWalls)) continue;
      const p2x = (nb.gx + 0.5) * gs;
      const p2y = (nb.gy + 0.5) * gs;
      if (!hasLineOfSightBetweenPoints(p1x, p1y, p2x, p2y, blockingWalls)) continue;
      distMap.set(key, cur.dist + 1);
      queue.push({ gx: nb.gx, gy: nb.gy, dist: cur.dist + 1 });
    }
  }
  return distMap;
}

function findWallBlockedCrawlerStep(startGx, startGy, targetGx, targetGy, scene) {
  if (!scene || (appState && appState.round === 0)) return null;
  if (startGx === targetGx && startGy === targetGy) return null;
  const blockingWalls = getBlockingWallSegments(scene);
  if (!blockingWalls || blockingWalls.length === 0) return null;
  if (isGridCellBlockedByWall(targetGx, targetGy, scene, blockingWalls)) {
    return { blocked: true, reason: 'wall_cell' };
  }
  const maxSearchFt = (Math.abs(targetGx - startGx) + Math.abs(targetGy - startGy) + 12) * 5;
  const distMap = computeReachableGridMap(startGx, startGy, maxSearchFt, scene);
  if (!distMap.has(`${targetGx},${targetGy}`)) {
    return { blocked: true, reason: 'path_blocked' };
  }
  return null;
}

function findTokenAtGrid(gx, gy) {
  const tokens = getActiveScene()?.tokens || [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    const span = Math.max(1, Math.min(4, Number(t.gridSpan) || 1));
    const half = (span - 1) * 0.5;
    const minX = t.gx - half;
    const maxX = t.gx + half + 1;
    const minY = t.gy - half;
    const maxY = t.gy + half + 1;
    if (gx + 0.5 >= minX && gx + 0.5 <= maxX && gy + 0.5 >= minY && gy + 0.5 <= maxY) return t;
  }
  return null;
}

function findTokenAtWorldOrGrid(wx, wy, gx, gy, gs) {
  const tokens = getActiveScene()?.tokens || [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (IS_PLAYER_WINDOW && t.role === 'mob' && t.hiddenFromPlayers) continue;
    const span = Math.max(1, Math.min(4, Number(t.gridSpan) || 1));
    const hitRadius = gs * span * 0.48;
    const cx = (t.gx + 0.5) * gs;
    const cy = (t.gy + 0.5) * gs;
    if (Math.hypot(wx - cx, wy - cy) <= hitRadius) return t;
  }
  return findTokenAtGrid(gx, gy);
}

function findObjectAtWorldOrGrid(wx, wy, gx, gy, gs) {
  const objs = getActiveScene()?.mapObjects || [];
  const hitRadius = gs * 0.44;
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i];
    if (IS_PLAYER_WINDOW && o.hiddenFromPlayers) continue;
    const cx = (o.gx + 0.5) * gs;
    const cy = (o.gy + 0.5) * gs;
    if (Math.hypot(wx - cx, wy - cy) <= hitRadius || (o.gx === gx && o.gy === gy)) return o;
  }
  return null;
}

function getDroppedLightWorldPos(lt, gs) {
  if (typeof lt.wx === 'number' && typeof lt.wy === 'number') {
    return { wx: lt.wx, wy: lt.wy };
  }
  return { wx: ((lt.gx ?? 0) + 0.5) * gs, wy: ((lt.gy ?? 0) + 0.5) * gs };
}

function findDroppedLightAtWorld(wx, wy, gs) {
  const lights = getActiveScene()?.droppedLights || [];
  const hitRadius = Math.max(16, gs * 0.34);
  for (let i = lights.length - 1; i >= 0; i--) {
    const pos = getDroppedLightWorldPos(lights[i], gs);
    if (Math.hypot(wx - pos.wx, wy - pos.wy) <= hitRadius) return lights[i];
  }
  return null;
}

function formatCompassDir(deg) {
  const d = ((Math.round(Number(deg) || 0) % 360) + 360) % 360;
  const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  return `${d}° (${dirs[Math.round(d / 45) % 8]})`;
}

function isAngleInsideLightCone(pointAngleRad, facingDeg = 0, spreadDeg = 360) {
  const spread = Math.max(15, Math.min(360, Number(spreadDeg) || 360));
  if (spread >= 359.5) return true;
  const facingRad = ((Number(facingDeg) || 0) * Math.PI) / 180;
  const halfRad = (spread * Math.PI) / 360;
  let diff = pointAngleRad - facingRad;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfRad;
}

function resolveLightEffectMode(srcObj) {
  if (srcObj && srcObj.lightEffect) return srcObj.lightEffect;
  if (srcObj && srcObj.flicker === false) return 'steady';
  if (srcObj && srcObj.lightFlicker === false) return 'steady';
  return 'flicker';
}

function getLightAnimationFactors(effectMode, now, seed) {
  if (effectMode === 'steady') return { radiusMult: 1, alphaMult: 1, wobbleAmp: 0.1 };
  if (effectMode === 'pulse') {
    const wave = Math.sin(now * 2.2 + seed * 1.3);
    return { radiusMult: 0.98 + wave * 0.08, alphaMult: 0.86 + wave * 0.14, wobbleAmp: 0.08 };
  }
  if (effectMode === 'strobe') {
    const s1 = Math.sin(now * 23 + seed * 3.1);
    const s2 = Math.cos(now * 37 + seed * 1.7);
    const dip = (s1 > 0.72 && s2 > 0.3) ? 0.52 : 1.0;
    return { radiusMult: dip * (0.97 + s1 * 0.04), alphaMult: dip, wobbleAmp: 0.95 };
  }
  const radiusMult = 1 + Math.sin(now * 6.8 + seed * 1.9) * 0.035 + Math.cos(now * 12.1 + seed) * 0.018;
  const alphaMult = 0.95 + Math.sin(now * 8.5 + seed) * 0.05;
  return { radiusMult, alphaMult, wobbleAmp: 1.0 };
}

function getIlluminationBuffForToken(tok) {
  const sc = getActiveScene();
  if (!sc) return { level: 'bright', label: '☀️ Bright Light', effect: 'Clear Visibility (Normal)', badgeCls: 'bg-amber-500/20 border-amber-400/50 text-amber-200' };

  const tokGx = (tok.role !== 'crawler' && uiState.isDraggingToken && uiState.draggedTokenId === tok.id) ? uiState.dragPreviewGx : tok.gx;
  const tokGy = (tok.role !== 'crawler' && uiState.isDraggingToken && uiState.draggedTokenId === tok.id) ? uiState.dragPreviewGy : tok.gy;
  const blockingWalls = getBlockingWallSegments(sc);
  const darkness = Math.max(0, Math.min(1, sc.ambientDarkness ?? 0.45));
  const ambientTier = darkness < 0.25 ? 2 : darkness < 0.72 ? 1 : 0;
  let bestLightTier = ambientTier;
  const gs = sc.gridSize || 56;
  const tokWx = (tokGx + 0.5) * gs;
  const tokWy = (tokGy + 0.5) * gs;

  const checkLightReachWorld = (lwx, lwy, brightFt, dimOnly = false, angleDeg = 360, facingDeg = 0, maxReachFt = 0) => {
    if (!brightFt || brightFt <= 0) return;
    const dx = tokWx - lwx;
    const dy = tokWy - lwy;
    const distFt = (Math.hypot(dx, dy) / gs) * 5;
    const unclippedMaxFt = dimOnly ? brightFt : brightFt * 2;
    const effectiveMaxFt = (maxReachFt && maxReachFt > 0) ? Math.min(unclippedMaxFt, maxReachFt) : unclippedMaxFt;
    if (distFt > effectiveMaxFt) return;
    if (distFt > 0.25 && !isAngleInsideLightCone(Math.atan2(dy, dx), facingDeg, angleDeg)) return;
    if (!hasLineOfSightBetweenPoints(lwx, lwy, tokWx, tokWy, blockingWalls)) return;

    if (!dimOnly && distFt <= brightFt) bestLightTier = Math.max(bestLightTier, 2);
    else bestLightTier = Math.max(bestLightTier, 1);
  };

  (sc.tokens || []).forEach(other => {
    const effLight = getEffectiveTokenLightRadiusFt(other);
    if (effLight > 0) {
      const ogx = (other.role !== 'crawler' && uiState.isDraggingToken && uiState.draggedTokenId === other.id) ? uiState.dragPreviewGx : other.gx;
      const ogy = (other.role !== 'crawler' && uiState.isDraggingToken && uiState.draggedTokenId === other.id) ? uiState.dragPreviewGy : other.gy;
      checkLightReachWorld((ogx + 0.5) * gs, (ogy + 0.5) * gs, effLight, Boolean(other.lightDimOnly), other.lightAngleDeg || 360, other.lightFacingDeg || 0, other.lightMaxReachFt || 0);
    }
  });

  (sc.mapObjects || []).forEach(obj => {
    if ((obj.lightRadiusFt || 0) > 0) {
      checkLightReachWorld((obj.gx + 0.5) * gs, (obj.gy + 0.5) * gs, obj.lightRadiusFt, false, 360, 0, 0);
    }
  });

  (sc.droppedLights || []).forEach(lt => {
    const pos = getDroppedLightWorldPos(lt, gs);
    checkLightReachWorld(pos.wx, pos.wy, lt.radiusFt || 25, Boolean(lt.dimOnly), lt.angleDeg || 360, lt.facingDeg || 0, lt.maxReachFt || 0);
  });

  if (bestLightTier === 2) {
    return { level: 'bright', label: '☀️ Bright Light', effect: 'Clear Vision (Within Bright Light Range)', badgeCls: 'bg-amber-500/20 border-amber-400/50 text-amber-200' };
  }
  if (bestLightTier === 1) {
    return { level: 'dim', label: '🕯️ Dim Light', effect: 'Shadowed (Within Dim Light Halo • +1 Stealth)', badgeCls: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200' };
  }
  return { level: 'darkness', label: '🌑 In Darkness', effect: 'Blinded in True Dark • Disadvantage on Attacks/Spot (+2 Stealth)', badgeCls: 'bg-purple-500/25 border-purple-400/50 text-purple-200' };
}


// =========================================================================
// 4B. SPELL & SKILL PARTICLE VFX LIBRARY (COLOR-MODIFIABLE & DUAL-SCREEN SYNCED)
// =========================================================================
const VFX_PRESET_LIBRARY = [
  { id: 'lightning', label: '🌩️ Crackling Lightning Arc', defaultColor: '#facc15' },
  { id: 'beam', label: '⚡ Beam / Laser Ray', defaultColor: '#38bdf8' },
  { id: 'projectile', label: '☄️ Bolt / Lance / Orb', defaultColor: '#f97316' },
  { id: 'burst', label: '💥 AoE Explosion / Cloud', defaultColor: '#ef4444' },
  { id: 'slash', label: '⚔️ Melee Slash / Smite', defaultColor: '#fde047' },
  { id: 'shield', label: '🛡️ Glowy Shield / Ward', defaultColor: '#38bdf8' },
  { id: 'heal', label: '💚 Healing Mote Spire', defaultColor: '#10b981' },
  { id: 'aura', label: '✨ Buff / Fog / Illusion', defaultColor: '#fbbf24' },
  { id: 'nova', label: '🌀 Shockwave / Sonic Ring', defaultColor: '#22d3ee' },
  { id: 'vortex', label: '💀 Soul Drain / Curse', defaultColor: '#a855f7' },
  { id: 'teleport', label: '💨 Blink / Leap / Portal', defaultColor: '#818cf8' },
  { id: 'summon', label: '🌿 Roots / Minion Erupt', defaultColor: '#22c55e' },
  { id: 'miss', label: '💨 Whiff / Deflect / Fizzle', defaultColor: '#94a3b8' }
];

const activeCanvasVfxInstances = [];
let lastProcessedVfxBroadcastId = null;

function inferVfxFromAbility(entry, info = null) {
  if (entry && entry.vfxType) {
    return {
      vfxType: entry.vfxType,
      vfxColor: entry.vfxColor || getDefaultColorForVfx(entry.vfxType, entry)
    };
  }
  const text = `${entry?.name || ''} ${entry?.tags || ''} ${entry?.baseDamage || ''} ${entry?.description || ''}`;
  let vfxType = 'beam';
  if (info?.shieldSlots > 0 || /\b(shield|ward|armor|barrier)\b/i.test(text)) vfxType = 'shield';
  else if (info?.isHeal || /\b(heal|restore|regenerat)/i.test(text)) vfxType = 'heal';
  else if (info?.isAoe || /\b(burst|explosion|fireball|blast|splash|nova|cone)\b/i.test(text)) vfxType = 'burst';
  else if (/\b(lightning|electric|voltaic|shock|spark|thunder|arc)\b/i.test(text) && !/melee/i.test(text)) vfxType = 'lightning';
  else if (/\b(punch|beam|ray|laser|bolt|lance|dart|missile|icicle|shard|spear|arrow)\b/i.test(text) && !/melee/i.test(text)) vfxType = 'beam';
  else if (/melee|unarmed|improvised|slash|strike|cleave|smack|bite|claw/i.test(text)) vfxType = 'slash';
  else if (!info?.isAttack && (info?.isPositiveEffect || info?.isAuraOrPassive)) vfxType = 'aura';

  return {
    vfxType,
    vfxColor: entry?.vfxColor || getDefaultColorForVfx(vfxType, entry)
  };
}

function getDefaultColorForVfx(vfxType, entry) {
  const text = `${entry?.name || ''} ${entry?.tags || ''} ${entry?.baseDamage || ''}`;
  if (/necrotic|shadow|curse|hex|unholy|bad faith/i.test(text)) return '#a855f7';
  if (/fire|burn|flame|inferno|explos/i.test(text)) return '#f97316';
  if (/ice|frost|cold|freeze/i.test(text)) return '#38bdf8';
  if (/electric|lightning|shock|spark/i.test(text)) return '#facc15';
  if (/poison|acid|venom|toxic/i.test(text)) return '#84cc16';
  if (/force|arcane|magic/i.test(text)) return '#6366f1';
  if (/holy|radiant|light|heal/i.test(text)) return '#10b981';
  if (vfxType === 'shield') return '#38bdf8';
  if (vfxType === 'heal') return '#10b981';
  if (vfxType === 'slash') return '#e2e8f0';
  if (vfxType === 'burst') return '#ef4444';
  return '#fbbf24';
}

function hexToRgba(hex, alpha = 1) {
  const clean = String(hex || '#38bdf8').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, '0');
  const num = parseInt(full.slice(0, 6), 16);
  if (isNaN(num)) return `rgba(56, 189, 248, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setAbilityVfxConfig(kind, entryId, prop, val) {
  const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
  const entry = catalog.find(e => e.id === entryId);
  if (!entry) return;
  entry[prop] = val;
  if (prop === 'vfxType' && !entry.vfxColor) {
    entry.vfxColor = getDefaultColorForVfx(val, entry);
  }
  commitStateChange();
}

function triggerVfxEvent(casterTok, targetTok, vfxType = 'burst', vfxColor = '#38bdf8', broadcast = true, isMiss = false) {
  const scene = getActiveScene();
  if (!scene) return;
  const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
  const src = casterTok || targetTok;
  const dst = targetTok || casterTok;
  if (!src || !dst) return;

  const vfxPayload = {
    id: 'vfx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    sceneId: scene.id,
    vfxType: vfxType || 'burst',
    vfxColor: vfxColor || '#38bdf8',
    isMiss: Boolean(isMiss),
    missSide: Math.random() < 0.5 ? -1 : 1,
    srcGx: src.gx,
    srcGy: src.gy,
    dstGx: dst.gx,
    dstGy: dst.gy,
    dstSpan: Math.max(1, Math.min(4, Number(dst.gridSpan) || 1))
  };

  spawnVfxInstanceOnCanvas(vfxPayload, gs);
  if (broadcast && appState) {
    appState.lastVfxEvent = vfxPayload;
  }
}

function spawnVfxInstanceOnCanvas(ev, gs) {
  const sx = (ev.srcGx + 0.5) * gs;
  const sy = (ev.srcGy + 0.5) * gs;
  const dx = (ev.dstGx + 0.5) * gs;
  const dy = (ev.dstGy + 0.5) * gs;
  const span = ev.dstSpan || 1;
  const particles = [];
  const count = ev.vfxType === 'burst' ? 42 : ev.vfxType === 'shield' ? 28 : ev.vfxType === 'heal' ? 26 : 24;

  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
    const speed = (0.4 + Math.random() * 1.1) * gs * (ev.vfxType === 'burst' ? 1.5 : 0.9);
    particles.push({
      ang,
      speed,
      offsetX: (Math.random() - 0.5) * gs * 0.6 * span,
      offsetY: (Math.random() - 0.5) * gs * 0.6 * span,
      size: 2.2 + Math.random() * 3.8,
      phase: Math.random() * Math.PI * 2
    });
  }

  activeCanvasVfxInstances.push({
    ...ev,
    sx,
    sy,
    dx,
    dy,
    gs,
    startTime: performance.now(),
    durationMs: ev.vfxType === 'shield' || ev.vfxType === 'heal' ? 1350 : 950,
    particles
  });
}

function previewAbilityVfxOnMap(casterId, kind, entryId) {
  const scene = getActiveScene();
  const caster = scene?.tokens.find(t => t.id === casterId);
  if (!caster) return;
  const learned = (caster[kind === 'skill' ? 'assignedSkills' : 'assignedSpells'] || []).find(a => a.id === entryId);
  const info = analyzeAbilityEffects(caster, kind, entryId, learned?.rank || 1);
  const validTargets = getValidAbilityTargetsForCaster(caster, info, scene);
  const selEl = document.getElementById(`castTarget_${casterId}_${kind}_${entryId}`);
  const target = validTargets.find(t => t.id === selEl?.value) || validTargets[0] || caster;
  const vfx = inferVfxFromAbility(info.entry, info);
  triggerVfxEvent(caster, target, vfx.vfxType, vfx.vfxColor, true);
  commitStateChange();
}

function renderActiveVfxLayer(ctx, scene, gs, nowMs) {
  if (appState?.lastVfxEvent && appState.lastVfxEvent.id !== lastProcessedVfxBroadcastId) {
    lastProcessedVfxBroadcastId = appState.lastVfxEvent.id;
    if (appState.lastVfxEvent.sceneId === scene.id && !activeCanvasVfxInstances.some(v => v.id === appState.lastVfxEvent.id)) {
      spawnVfxInstanceOnCanvas(appState.lastVfxEvent, gs);
    }
  }

  // Persistent Spell & Skill Effects (Walls, Ground Zones, Cones, Auras)
  const pEffects = Array.isArray(scene.persistentEffects) ? scene.persistentEffects : [];
  if (pEffects.length > 0) {
    const tSec = nowMs * 0.001;
    pEffects.forEach((pe, peIdx) => {
      let cx = (pe.gx + 0.5) * gs;
      let cy = (pe.gy + 0.5) * gs;
      if (pe.attachToTokenId) {
        const hostTok = (scene.tokens || []).find(t => t.id === pe.attachToTokenId);
        if (!hostTok || (IS_PLAYER_WINDOW && hostTok.role === 'mob' && hostTok.hiddenFromPlayers)) return;
        const visP = getTokenVisualGridPos(hostTok, nowMs);
        cx = (visP.gx + 0.5) * gs;
        cy = (visP.gy + 0.5) * gs;
      }
      const col = pe.vfxColor || '#f97316';
      const radPx = Math.max(gs * 0.65, ((Number(pe.radiusFt) || 10) / 5) * gs);
      const pulse = 0.86 + Math.sin(tSec * 2.8 + peIdx) * 0.14;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (pe.shape === 'wall') {
        // Wall of Fire / Flamewall / Static Conduit / Rampart strip perpendicular to caster->target
        const sWx = ((pe.srcGx ?? pe.gx) + 0.5) * gs;
        const sWy = ((pe.srcGy ?? pe.gy) + 0.5) * gs;
        const baseAng = (cx === sWx && cy === sWy) ? 0 : Math.atan2(cy - sWy, cx - sWx) + Math.PI / 2;
        const halfLen = Math.max(gs * 1.2, radPx * 0.5);
        const x1 = cx - Math.cos(baseAng) * halfLen;
        const y1 = cy - Math.sin(baseAng) * halfLen;
        const x2 = cx + Math.cos(baseAng) * halfLen;
        const y2 = cy + Math.sin(baseAng) * halfLen;

        ctx.lineCap = 'round';
        ctx.strokeStyle = hexToRgba(col, 0.32 * pulse);
        ctx.lineWidth = gs * 0.52;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = hexToRgba(col, 0.85 * pulse);
        ctx.lineWidth = gs * 0.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.strokeStyle = hexToRgba('#ffffff', 0.85 * pulse);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Flickering flames / sparks dancing along the wall
        const nodes = Math.max(5, Math.floor((halfLen * 2) / 18));
        for (let k = 0; k <= nodes; k++) {
          const ft = k / nodes;
          const fx = x1 + (x2 - x1) * ft + Math.sin(tSec * 7 + k * 2.1) * 4;
          const fy = y1 + (y2 - y1) * ft - Math.abs(Math.sin(tSec * 5 + k * 1.7)) * 12;
          ctx.fillStyle = hexToRgba(k % 2 === 0 ? '#ffffff' : col, 0.85);
          ctx.beginPath();
          ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (pe.shape === 'cone') {
        // Persistent Cone (e.g. Web)
        const sWx = ((pe.srcGx ?? pe.gx) + 0.5) * gs;
        const sWy = ((pe.srcGy ?? pe.gy) + 0.5) * gs;
        const dirAng = (cx === sWx && cy === sWy) ? 0 : Math.atan2(cy - sWy, cx - sWx);
        const halfArc = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(sWx, sWy);
        ctx.arc(sWx, sWy, radPx, dirAng - halfArc, dirAng + halfArc);
        ctx.closePath();
        ctx.fillStyle = hexToRgba(col, 0.22 * pulse);
        ctx.fill();
        ctx.strokeStyle = hexToRgba(col, 0.78 * pulse);
        ctx.lineWidth = 2.2;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -tSec * 14;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (pe.shape === 'aura') {
        // Token-attached Aura / Protective Shell / Wisp Armor / Oakhide
        const auraR = Math.max(gs * 0.58, radPx);
        const grad = ctx.createRadialGradient(cx, cy, auraR * 0.25, cx, cy, auraR);
        grad.addColorStop(0, hexToRgba(col, 0.04));
        grad.addColorStop(0.75, hexToRgba(col, 0.16 * pulse));
        grad.addColorStop(1, hexToRgba(col, 0.36 * pulse));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hexToRgba(col, 0.82 * pulse);
        ctx.lineWidth = 2.2;
        ctx.setLineDash([9, 6]);
        ctx.lineDashOffset = -tSec * 18;
        ctx.beginPath();
        ctx.arc(cx, cy, auraR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        for (let m = 0; m < 4; m++) {
          const a = tSec * 1.6 + (Math.PI * 2 * m) / 4 + peIdx;
          ctx.fillStyle = hexToRgba('#ffffff', 0.85);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * auraR, cy + Math.sin(a) * auraR, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Persistent Ground Zone Circle (Fog, Storm, Vortex, Whirlpool, Miasma, Brambles, Rain, Hole)
        const grad = ctx.createRadialGradient(cx, cy, radPx * 0.1, cx, cy, radPx);
        grad.addColorStop(0, hexToRgba(col, 0.34 * pulse));
        grad.addColorStop(0.65, hexToRgba(col, 0.2 * pulse));
        grad.addColorStop(1, hexToRgba(col, 0.04));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radPx, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hexToRgba(col, 0.8 * pulse);
        ctx.lineWidth = 2.4;
        ctx.setLineDash([10, 6]);
        ctx.lineDashOffset = -tSec * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, radPx, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Swirling interior motes
        const moteCount = 8;
        for (let m = 0; m < moteCount; m++) {
          const a = tSec * (1.2 + (m % 2) * 0.6) + (Math.PI * 2 * m) / moteCount;
          const dist = radPx * (0.28 + ((m * 0.17) % 0.62));
          ctx.fillStyle = hexToRgba(m % 3 === 0 ? '#ffffff' : col, 0.78);
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Subtle label pill for persistent zone (skip on tiny self-auras so token nameplate stays clean)
      if (pe.shape !== 'aura' || pe.radiusFt >= 10) {
        ctx.globalCompositeOperation = 'source-over';
        const tag = `${pe.name} (${pe.remainingRounds < 0 ? '∞' : `${pe.remainingRounds}r`})`;
        ctx.font = 'bold 9.5px JetBrains Mono, monospace';
        const tw = ctx.measureText(tag).width + 10;
        const ly = pe.shape === 'cone' ? ((pe.srcGy ?? pe.gy) + 0.5) * gs - 18 : cy - (pe.shape === 'wall' ? 18 : radPx * 0.45);
        ctx.fillStyle = 'rgba(7, 9, 14, 0.85)';
        ctx.strokeStyle = hexToRgba(col, 0.85);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, ly - 8, tw, 16, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, cx, ly);
      }

      ctx.restore();
    });
  }

  // Persistent Glowy Shield Dome & Buff Aura Animation on Tokens with Active Shields or Buffs
  (scene.tokens || []).forEach((tok, tIdx) => {
    if (IS_PLAYER_WINDOW && tok.role === 'mob' && tok.hiddenFromPlayers) return;
    const shields = Math.max(0, Number(tok.shieldPips) || 0);
    const buffs = Array.isArray(tok.buffs) ? tok.buffs : (Array.isArray(tok.activeBuffs) ? tok.activeBuffs : []);
    const hasBuff = buffs.length > 0;
    if (shields <= 0 && !hasBuff) return;

    const span = Math.max(1, Math.min(4, Number(tok.gridSpan) || 1));
    const vis = getTokenVisualGridPos(tok, nowMs);
    const drawGx = vis.gx;
    const drawGy = vis.gy;
    const cx = (drawGx + 0.5) * gs;
    const cy = (drawGy + 0.5) * gs;
    const domeR = gs * span * 0.47;
    const tSec = nowMs * 0.001;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (hasBuff) {
      const bPulse = 0.84 + Math.sin(tSec * 2.5 + tIdx) * 0.16;
      const bCol = '#10b981';
      const bGrad = ctx.createRadialGradient(cx, cy, domeR * 0.2, cx, cy, domeR * 1.18);
      bGrad.addColorStop(0, hexToRgba(bCol, 0.03));
      bGrad.addColorStop(0.75, hexToRgba(bCol, 0.14 * bPulse));
      bGrad.addColorStop(1, hexToRgba(bCol, 0.30 * bPulse));
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, domeR * 1.14, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = hexToRgba(bCol, 0.68 * bPulse);
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -tSec * 16;
      ctx.beginPath();
      ctx.arc(cx, cy, domeR * 1.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      for (let m = 0; m < 3; m++) {
        const a = tSec * 1.4 + (Math.PI * 2 * m) / 3 + tIdx;
        ctx.fillStyle = hexToRgba('#a7f3d0', 0.82 * bPulse);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * domeR * 1.12, cy + Math.sin(a) * domeR * 1.12, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (shields > 0) {
      const pulse = 0.85 + Math.sin(tSec * 3.4 + tIdx) * 0.15;
      const grad = ctx.createRadialGradient(cx, cy, domeR * 0.2, cx, cy, domeR * 1.15);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.04)');
      grad.addColorStop(0.75, `rgba(56, 189, 248, ${0.18 * pulse})`);
      grad.addColorStop(1, `rgba(186, 230, 253, ${0.42 * pulse})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, domeR * 1.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(125, 211, 252, ${0.75 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -tSec * 22;
      ctx.beginPath();
      ctx.arc(cx, cy, domeR * 1.08, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const moteCount = Math.min(6, Math.max(2, shields));
      for (let m = 0; m < moteCount; m++) {
        const a = tSec * 1.8 + (Math.PI * 2 * m) / moteCount;
        const mx = cx + Math.cos(a) * domeR * 1.08;
        const my = cy + Math.sin(a) * domeR * 1.08;
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(mx, my, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  });

  // Active One-Shot Spell / Skill Particle Animations
  for (let i = activeCanvasVfxInstances.length - 1; i >= 0; i--) {
    const v = activeCanvasVfxInstances[i];
    const elapsed = nowMs - v.startTime;
    if (elapsed >= v.durationMs) {
      activeCanvasVfxInstances.splice(i, 1);
      continue;
    }
    const p = Math.max(0, Math.min(1, elapsed / v.durationMs));
    const fade = p < 0.15 ? p / 0.15 : 1 - Math.pow((p - 0.15) / 0.85, 1.6);
    const col = v.vfxColor || '#38bdf8';
    const targetRadius = gs * (v.dstSpan || 1) * 0.5;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (v.isMiss || v.vfxType === 'miss') {
      const side = v.missSide || 1;
      const vecX = v.dx - v.sx;
      const vecY = v.dy - v.sy;
      const dist = Math.hypot(vecX, vecY);
      const isMeleeWhiff = v.vfxType === 'slash' || dist <= gs * 1.45;

      if (isMeleeWhiff) {
        // Deflected melee slash / whiff arc + sparks
        const arcR = targetRadius * 1.25;
        const baseAng = dist > 1 ? Math.atan2(vecY, vecX) : -Math.PI * 0.5;
        const sweep = baseAng + side * (-0.9 + p * 1.9);
        ctx.strokeStyle = hexToRgba('#cbd5e1', 0.8 * fade);
        ctx.lineWidth = 5 * (1 - p * 0.45);
        ctx.lineCap = 'round';
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, arcR, sweep - 0.65, sweep);
        ctx.stroke();
        ctx.setLineDash([]);

        // Metallic deflect glint
        const gx = v.dx + Math.cos(sweep) * arcR;
        const gy = v.dy + Math.sin(sweep) * arcR;
        ctx.fillStyle = hexToRgba('#ffffff', 0.9 * fade);
        ctx.beginPath();
        ctx.arc(gx, gy, 3.5 * (1 - p * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ranged Spell / Bolt / Lightning veers wide past target & fizzles out!
        const ux = vecX / (dist || 1);
        const uy = vecY / (dist || 1);
        const perpX = -uy * side;
        const perpY = ux * side;
        const missOffset = targetRadius * 1.15 + gs * 0.35;
        const overshoot = gs * 0.85;
        const missEndX = v.dx + perpX * missOffset + ux * overshoot;
        const missEndY = v.dy + perpY * missOffset + uy * overshoot;

        const travel = Math.min(1, p * 2.2);
        const tailT = Math.max(0, travel - 0.45);
        const hx = v.sx + (missEndX - v.sx) * travel;
        const hy = v.sy + (missEndY - v.sy) * travel;
        const tx = v.sx + (missEndX - v.sx) * tailT;
        const ty = v.sy + (missEndY - v.sy) * tailT;

        ctx.strokeStyle = hexToRgba(col, 0.5 * fade);
        ctx.lineWidth = 6 * (1 - p * 0.5);
        ctx.lineCap = 'round';
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = hexToRgba('#e2e8f0', 0.85 * fade);
        ctx.lineWidth = 2.5 * (1 - p * 0.5);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(hx, hy);
        ctx.stroke();

        // Fizzle puff where it sails past
        v.particles.slice(0, 12).forEach(pt => {
          const px = missEndX + Math.cos(pt.ang) * pt.speed * p * 0.45;
          const py = missEndY + Math.sin(pt.ang) * pt.speed * p * 0.45;
          ctx.fillStyle = hexToRgba('#94a3b8', 0.7 * fade);
          ctx.beginPath();
          ctx.arc(px, py, pt.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Floating "MISS!" / "EVADED!" callout pill rising over the target
      ctx.globalCompositeOperation = 'source-over';
      const floatY = v.dy - targetRadius - 14 - p * 18;
      const badgeTxt = v.missLabel || 'MISS!';
      ctx.font = '900 11px JetBrains Mono, monospace';
      const tw = ctx.measureText(badgeTxt).width + 12;
      ctx.fillStyle = `rgba(15, 23, 42, ${0.92 * fade})`;
      ctx.strokeStyle = `rgba(148, 163, 184, ${0.85 * fade})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(v.dx - tw / 2, floatY - 9, tw, 18, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `rgba(226, 232, 240, ${fade})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeTxt, v.dx, floatY);

      ctx.restore();
      continue;
    }

    if (v.vfxType === 'lightning') {
      // Multi-segment jagged crackling lightning bolts + forked sub-arcs & electric sparks
      const boltProgress = Math.min(1, p * 2.8);
      const endX = v.sx + (v.dx - v.sx) * boltProgress;
      const endY = v.sy + (v.dy - v.sy) * boltProgress;
      const dx = endX - v.sx;
      const dy = endY - v.sy;
      const dist = Math.hypot(dx, dy) || 1;
      const segments = Math.max(6, Math.min(22, Math.floor(dist / 16)));
      const tick = Math.floor(elapsed / 45);
      const hashJitter = (seed) => {
        const s = Math.sin(seed * 127.1 + tick * 311.7) * 43758.5453;
        return (s - Math.floor(s)) * 2 - 1;
      };

      const drawJaggedBolt = (sx, sy, ex, ey, amp, lineW, alpha, seedOffset) => {
        const bdx = ex - sx;
        const bdy = ey - sy;
        const bdist = Math.hypot(bdx, bdy) || 1;
        const bnx = -bdy / bdist;
        const bny = bdx / bdist;
        const pts = [{ x: sx, y: sy }];
        for (let s = 1; s < segments; s++) {
          const t = s / segments;
          const env = Math.sin(t * Math.PI);
          const off = hashJitter(s + seedOffset) * amp * env;
          pts.push({ x: sx + bdx * t + bnx * off, y: sy + bdy * t + bny * off });
        }
        pts.push({ x: ex, y: ey });

        ctx.strokeStyle = hexToRgba(col, 0.45 * alpha);
        ctx.lineWidth = lineW * 3.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();

        ctx.strokeStyle = hexToRgba('#ffffff', 0.96 * alpha);
        ctx.lineWidth = lineW;
        ctx.beginPath();
        pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
        ctx.stroke();
        return pts;
      };

      const mainPts = drawJaggedBolt(v.sx, v.sy, endX, endY, gs * 0.34, 3.2, fade, 1);
      drawJaggedBolt(v.sx, v.sy, endX, endY, gs * 0.48, 1.5, fade * 0.78, 41);

      if (mainPts.length > 4) {
        const branchIdx = Math.floor(mainPts.length * 0.55);
        const bp = mainPts[branchIdx];
        const forkAngle = Math.atan2(dy, dx) + hashJitter(99) * 0.75;
        const forkLen = Math.min(dist * 0.45, gs * 1.4);
        drawJaggedBolt(bp.x, bp.y, bp.x + Math.cos(forkAngle) * forkLen, bp.y + Math.sin(forkAngle) * forkLen, gs * 0.18, 1.4, fade * 0.85, 77);
      }

      const arcR = targetRadius * (0.7 + 0.45 * Math.abs(hashJitter(13)));
      ctx.strokeStyle = hexToRgba(col, 0.8 * fade);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, arcR, 0, Math.PI * 2);
      ctx.stroke();

      v.particles.forEach((pt, idx) => {
        const jx = hashJitter(idx * 3 + 5) * gs * 0.25;
        const jy = hashJitter(idx * 3 + 9) * gs * 0.25;
        const px = v.dx + Math.cos(pt.ang) * pt.speed * p * 0.85 + jx;
        const py = v.dy + Math.sin(pt.ang) * pt.speed * p * 0.85 + jy;
        ctx.fillStyle = hexToRgba(idx % 2 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'beam') {
      // High-energy laser / lance beam with muzzle flash, helical energy ribbon & impact shock-cone
      const beamProgress = Math.min(1, p * 2.8);
      const bx = v.sx + (v.dx - v.sx) * beamProgress;
      const by = v.sy + (v.dy - v.sy) * beamProgress;
      const bdx = bx - v.sx;
      const bdy = by - v.sy;
      const bdist = Math.hypot(bdx, bdy) || 1;
      const nx = -bdy / bdist;
      const ny = bdx / bdist;

      // Muzzle flash ring at caster
      const muzR = gs * (0.18 + 0.24 * Math.sin(Math.min(1, p * 2) * Math.PI));
      ctx.strokeStyle = hexToRgba(col, 0.8 * fade);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(v.sx, v.sy, muzR, 0, Math.PI * 2);
      ctx.stroke();

      // Wide outer bloom + mid beam + hot white core
      ctx.lineCap = 'round';
      ctx.strokeStyle = hexToRgba(col, 0.28 * fade);
      ctx.lineWidth = (20 + Math.sin(p * 28) * 3) * (1 - p * 0.35);
      ctx.beginPath();
      ctx.moveTo(v.sx, v.sy);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(col, 0.72 * fade);
      ctx.lineWidth = 9 * (1 - p * 0.4);
      ctx.beginPath();
      ctx.moveTo(v.sx, v.sy);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba('#ffffff', 0.96 * fade);
      ctx.lineWidth = 3.5 * (1 - p * 0.45);
      ctx.beginPath();
      ctx.moveTo(v.sx, v.sy);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Helical energy ribbon spiraling along the beam
      const helixSteps = Math.max(10, Math.min(36, Math.floor(bdist / 10)));
      ctx.strokeStyle = hexToRgba(col, 0.85 * fade);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let s = 0; s <= helixSteps; s++) {
        const t = s / helixSteps;
        const wave = Math.sin(t * Math.PI * 6 - p * 24) * gs * 0.16 * Math.sin(t * Math.PI);
        const hx = v.sx + bdx * t + nx * wave;
        const hy = v.sy + bdy * t + ny * wave;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();

      // Impact flare & directional sparks at target
      if (beamProgress >= 0.85) {
        const impP = Math.min(1, (p - 0.28) / 0.72);
        const impR = targetRadius * (0.45 + impP * 0.85);
        const grad = ctx.createRadialGradient(v.dx, v.dy, 1, v.dx, v.dy, impR);
        grad.addColorStop(0, hexToRgba('#ffffff', 0.9 * fade));
        grad.addColorStop(0.5, hexToRgba(col, 0.55 * fade));
        grad.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, impR, 0, Math.PI * 2);
        ctx.fill();

        v.particles.forEach((pt, idx) => {
          const px = v.dx + Math.cos(pt.ang) * pt.speed * impP * 1.05;
          const py = v.dy + Math.sin(pt.ang) * pt.speed * impP * 1.05;
          ctx.fillStyle = hexToRgba(idx % 3 === 0 ? '#ffffff' : col, fade);
          ctx.beginPath();
          ctx.arc(px, py, pt.size * (1 - impP * 0.45), 0, Math.PI * 2);
          ctx.fill();
        });
      }
    } else if (v.vfxType === 'projectile') {
      // Blazing comet bolt with spinning star core, flickering ember tail & multi-ring impact detonation
      const travel = Math.min(1, p * 2.15);
      const tailTravel = Math.max(0, travel - 0.42);
      const headX = v.sx + (v.dx - v.sx) * travel;
      const headY = v.sy + (v.dy - v.sy) * travel;
      const tailX = v.sx + (v.dx - v.sx) * tailTravel;
      const tailY = v.sy + (v.dy - v.sy) * tailTravel;
      const impactP = p > 0.46 ? (p - 0.46) / 0.54 : 0;

      if (travel < 1) {
        const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
        grad.addColorStop(0, hexToRgba(col, 0));
        grad.addColorStop(0.7, hexToRgba(col, 0.78 * fade));
        grad.addColorStop(1, hexToRgba('#ffffff', 0.98 * fade));
        ctx.strokeStyle = grad;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        // Spinning 4-point star head
        const starR = 9;
        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(p * 18);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const r = k % 2 === 0 ? starR : starR * 0.35;
          const a = (Math.PI * k) / 4;
          if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Trailing ember sparks along flight path
        for (let k = 0; k < 6; k++) {
          const ft = tailTravel + (travel - tailTravel) * (k / 6);
          const ex = v.sx + (v.dx - v.sx) * ft + Math.sin(p * 30 + k * 2.1) * 6;
          const ey = v.sy + (v.dy - v.sy) * ft + Math.cos(p * 26 + k * 1.7) * 6;
          ctx.fillStyle = hexToRgba(col, 0.75 * fade);
          ctx.beginPath();
          ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Crisp 2-ring detonation + radial shrapnel
        const ring1 = targetRadius * (0.35 + impactP * 1.25);
        const ring2 = targetRadius * (0.2 + impactP * 0.8);
        ctx.strokeStyle = hexToRgba(col, 0.9 * fade);
        ctx.lineWidth = 3.5 * (1 - impactP * 0.6);
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, ring1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = hexToRgba('#ffffff', 0.85 * fade);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, ring2, 0, Math.PI * 2);
        ctx.stroke();

        v.particles.forEach((pt, idx) => {
          const px = v.dx + Math.cos(pt.ang) * pt.speed * impactP * 1.05;
          const py = v.dy + Math.sin(pt.ang) * pt.speed * impactP * 1.05;
          ctx.fillStyle = hexToRgba(idx % 3 === 0 ? '#ffffff' : col, fade);
          ctx.beginPath();
          ctx.arc(px, py, pt.size * (1 - impactP * 0.45), 0, Math.PI * 2);
          ctx.fill();
        });
      }
    } else if (v.vfxType === 'burst') {
      // 3-Stage Cinematic Explosion: white flash -> billowing elemental cloud lobes -> dual shockwaves + embers
      const easeOut = 1 - Math.pow(1 - p, 2.4);
      const blastR = targetRadius + gs * 1.65 * easeOut;

      // Billowing cloud lobes around center
      const lobeCount = 7;
      for (let l = 0; l < lobeCount; l++) {
        const la = (Math.PI * 2 * l) / lobeCount + p * 0.5;
        const ld = blastR * 0.36 * easeOut;
        const lx = v.dx + Math.cos(la) * ld;
        const ly = v.dy + Math.sin(la) * ld;
        const lr = blastR * (0.48 + (l % 2) * 0.14);
        const lGrad = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr);
        lGrad.addColorStop(0, hexToRgba('#ffffff', 0.42 * fade));
        lGrad.addColorStop(0.42, hexToRgba(col, 0.48 * fade));
        lGrad.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = lGrad;
        ctx.beginPath();
        ctx.arc(lx, ly, lr, 0, Math.PI * 2);
        ctx.fill();
      }

      // White-hot core flash in first 35%
      if (p < 0.4) {
        const flashFade = 1 - p / 0.4;
        const cGrad = ctx.createRadialGradient(v.dx, v.dy, 1, v.dx, v.dy, targetRadius * 1.2);
        cGrad.addColorStop(0, hexToRgba('#ffffff', 0.95 * flashFade));
        cGrad.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, targetRadius * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dual expanding shockwave rings
      ctx.strokeStyle = hexToRgba(col, 0.9 * fade);
      ctx.lineWidth = 4 * (1 - p * 0.55);
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, blastR * 0.92, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba('#ffffff', 0.65 * fade);
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, blastR * 0.64, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Embers & debris sparks
      v.particles.forEach((pt, idx) => {
        const px = v.dx + Math.cos(pt.ang) * pt.speed * p * 1.38;
        const py = v.dy + Math.sin(pt.ang) * pt.speed * p * 1.38 - p * gs * 0.25;
        ctx.fillStyle = hexToRgba(idx % 4 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * (1 - p * 0.35), 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'slash') {
      // Tapered glowing crescent blade-wave + cross-cut glint + directional hit sparks
      const baseAng = Math.hypot(v.dx - v.sx, v.dy - v.sy) > 2 ? Math.atan2(v.dy - v.sy, v.dx - v.sx) : -Math.PI * 0.25;
      const arcR = targetRadius * (1.1 + p * 0.35);
      const sweepStart = baseAng - 1.35 + p * 0.6;
      const sweepEnd = baseAng - 0.55 + p * 1.85;

      // Outer energy crescent
      ctx.strokeStyle = hexToRgba(col, 0.45 * fade);
      ctx.lineWidth = 16 * (1 - p * 0.55);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, arcR, sweepStart, sweepEnd);
      ctx.stroke();

      // Main colored blade arc
      ctx.strokeStyle = hexToRgba(col, 0.92 * fade);
      ctx.lineWidth = 7 * (1 - p * 0.5);
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, arcR, sweepStart + 0.15, sweepEnd);
      ctx.stroke();

      // Razor white edge
      ctx.strokeStyle = hexToRgba('#ffffff', 0.98 * fade);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, arcR + 1.5, sweepStart + 0.25, sweepEnd);
      ctx.stroke();

      // Cross-cut impact star flash
      if (p > 0.15 && p < 0.7) {
        const xf = Math.sin(((p - 0.15) / 0.55) * Math.PI);
        const len = targetRadius * 0.95 * xf;
        ctx.strokeStyle = hexToRgba('#ffffff', 0.9 * xf);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(v.dx - Math.cos(baseAng + 0.7) * len, v.dy - Math.sin(baseAng + 0.7) * len);
        ctx.lineTo(v.dx + Math.cos(baseAng + 0.7) * len, v.dy + Math.sin(baseAng + 0.7) * len);
        ctx.stroke();
      }

      v.particles.forEach((pt, idx) => {
        const px = v.dx + Math.cos(pt.ang) * pt.speed * p * 0.95;
        const py = v.dy + Math.sin(pt.ang) * pt.speed * p * 0.95;
        ctx.fillStyle = hexToRgba(idx % 2 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'shield') {
      // Interlocking hexagonal rune-barrier dome + rotating geometric ward arcs
      const domeR = targetRadius * (0.7 + 0.58 * Math.min(1, p * 2.2));
      const grad = ctx.createRadialGradient(v.dx, v.dy, domeR * 0.15, v.dx, v.dy, domeR * 1.2);
      grad.addColorStop(0, hexToRgba(col, 0.06 * fade));
      grad.addColorStop(0.68, hexToRgba(col, 0.42 * fade));
      grad.addColorStop(1, hexToRgba('#ffffff', 0.85 * fade));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, domeR * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // Rotating hexagon lattice
      ctx.save();
      ctx.translate(v.dx, v.dy);
      ctx.rotate(p * 1.6);
      ctx.strokeStyle = hexToRgba('#ffffff', 0.75 * fade);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let h = 0; h < 6; h++) {
        const ha = (Math.PI * 2 * h) / 6;
        const hx = Math.cos(ha) * domeR * 0.92;
        const hy = Math.sin(ha) * domeR * 0.92;
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Counter-rotating segmented ward ring
      ctx.strokeStyle = hexToRgba(col, 0.9 * fade);
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = p * 55;
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, domeR * 1.12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      v.particles.forEach(pt => {
        const a = pt.ang + p * 3.8;
        const px = v.dx + Math.cos(a) * domeR * 1.12;
        const py = v.dy + Math.sin(a) * domeR * 1.12;
        ctx.fillStyle = hexToRgba('#ffffff', fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'heal') {
      // Warm ground bloom + twin rising light ribbons + floating glowing "+" healing crosses
      const ringR = targetRadius * (0.75 + p * 0.65);
      const gGrad = ctx.createRadialGradient(v.dx, v.dy, 2, v.dx, v.dy, ringR);
      gGrad.addColorStop(0, hexToRgba('#ffffff', 0.45 * fade));
      gGrad.addColorStop(0.55, hexToRgba(col, 0.35 * fade));
      gGrad.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, ringR, 0, Math.PI * 2);
      ctx.fill();

      // Twin rising spiral ribbons
      for (let rIdx = 0; rIdx < 2; rIdx++) {
        ctx.strokeStyle = hexToRgba(rIdx === 0 ? col : '#ffffff', 0.85 * fade);
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        for (let s = 0; s <= 18; s++) {
          const t = s / 18;
          const ang = t * Math.PI * 3 + p * 8 + rIdx * Math.PI;
          const rx = v.dx + Math.cos(ang) * targetRadius * (0.85 - t * 0.25);
          const ry = v.dy + targetRadius * 0.35 - t * gs * 1.35 * Math.min(1, p * 1.6);
          if (s === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.stroke();
      }

      // Floating "+" sparkles
      v.particles.slice(0, 14).forEach((pt, idx) => {
        const px = v.dx + pt.offsetX * 1.25 + Math.sin(p * 6 + pt.phase) * 5;
        const py = v.dy + pt.offsetY * 0.7 - p * gs * 1.15;
        const sz = 4.5 * (1 - p * 0.3);
        ctx.strokeStyle = hexToRgba(idx % 2 === 0 ? '#ffffff' : col, fade);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - sz, py);
        ctx.lineTo(px + sz, py);
        ctx.moveTo(px, py - sz);
        ctx.lineTo(px, py + sz);
        ctx.stroke();
      });
    } else if (v.vfxType === 'aura') {
      // Rotating arcane glyph / rune ring + shimmering upward motes
      const ringR = targetRadius * (0.85 + p * 0.45);
      ctx.save();
      ctx.translate(v.dx, v.dy);
      ctx.rotate(p * 2.4);
      ctx.strokeStyle = hexToRgba(col, 0.85 * fade);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = hexToRgba('#ffffff', 0.7 * fade);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.74, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 8 radial rune ticks
      for (let t = 0; t < 8; t++) {
        const a = (Math.PI * 2 * t) / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * ringR * 0.76, Math.sin(a) * ringR * 0.76);
        ctx.lineTo(Math.cos(a) * ringR * 1.06, Math.sin(a) * ringR * 1.06);
        ctx.stroke();
      }
      ctx.restore();

      v.particles.forEach((pt, idx) => {
        const px = v.dx + pt.offsetX * 1.3 + Math.sin(p * 5 + pt.phase) * 6;
        const py = v.dy + pt.offsetY - p * gs * 0.9;
        ctx.fillStyle = hexToRgba(idx % 3 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * (1 - p * 0.35), 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'vortex') {
      // Swirling dark-core maelstrom at target + 4 curved soul-siphon tendrils back to caster
      const coreR = targetRadius * (1.2 - p * 0.4);
      for (let arm = 0; arm < 3; arm++) {
        const startA = p * 7 + (Math.PI * 2 * arm) / 3;
        ctx.strokeStyle = hexToRgba(arm === 0 ? '#ffffff' : col, 0.85 * fade);
        ctx.lineWidth = arm === 0 ? 2 : 3.2;
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, coreR * (0.7 + arm * 0.16), startA, startA + Math.PI * 1.15);
        ctx.stroke();
      }

      // 4 curved siphon ribbons traveling from target -> caster
      const dist = Math.hypot(v.sx - v.dx, v.sy - v.dy) || 1;
      const perpX = -(v.sy - v.dy) / dist;
      const perpY = (v.sx - v.dx) / dist;
      for (let r = 0; r < 4; r++) {
        const side = r % 2 === 0 ? 1 : -1;
        const amp = gs * (0.28 + r * 0.1) * side;
        ctx.strokeStyle = hexToRgba(r === 0 ? '#ffffff' : col, 0.65 * fade);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let s = 0; s <= 16; s++) {
          const t = (s / 16) * Math.min(1, p * 1.5);
          const swirl = Math.sin(t * Math.PI * 2 + p * 10 + r) * amp * Math.sin(t * Math.PI);
          const px = v.dx + (v.sx - v.dx) * t + perpX * swirl;
          const py = v.dy + (v.sy - v.dy) * t + perpY * swirl;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      v.particles.forEach((pt, idx) => {
        const t = Math.min(1, Math.max(0, p * 1.25 - (idx % 6) * 0.04));
        const swirl = Math.sin(t * Math.PI * 2 + pt.phase) * gs * 0.35 * (1 - t);
        const px = v.dx + (v.sx - v.dx) * t + perpX * swirl;
        const py = v.dy + (v.sy - v.dy) * t + perpY * swirl;
        ctx.fillStyle = hexToRgba(idx % 3 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'teleport') {
      // Collapsing origin portal + vertical blink pillar + erupting destination portal
      const p1R = Math.max(4, targetRadius * (1.25 - p * 0.95));
      const p2R = Math.max(4, targetRadius * (0.25 + p * 1.05));
      [ { x: v.sx, y: v.sy, r: p1R }, { x: v.dx, y: v.dy, r: p2R } ].forEach((ptl, idx) => {
        const g = ctx.createRadialGradient(ptl.x, ptl.y, 1, ptl.x, ptl.y, ptl.r * 1.2);
        g.addColorStop(0, hexToRgba('#ffffff', 0.7 * fade));
        g.addColorStop(0.5, hexToRgba(col, 0.45 * fade));
        g.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ptl.x, ptl.y, ptl.r * 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = hexToRgba(idx === 0 ? col : '#ffffff', 0.9 * fade);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ptl.x, ptl.y, ptl.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Afterimage warp streak
      ctx.strokeStyle = hexToRgba(col, 0.65 * fade);
      ctx.lineWidth = 4 * (1 - p * 0.6);
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(v.sx, v.sy);
      ctx.lineTo(v.dx, v.dy);
      ctx.stroke();
      ctx.setLineDash([]);

      v.particles.forEach((pt, idx) => {
        const originX = idx % 2 === 0 ? v.sx : v.dx;
        const originY = idx % 2 === 0 ? v.sy : v.dy;
        const px = originX + Math.cos(pt.ang) * pt.speed * p * 0.9;
        const py = originY + Math.sin(pt.ang) * pt.speed * p * 0.9;
        ctx.fillStyle = hexToRgba(idx % 3 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (v.vfxType === 'summon') {
      // Glowing summoning pentagram/star circle + jagged erupting ground spikes/roots + rising motes
      const ringR = targetRadius * 1.2;
      ctx.save();
      ctx.translate(v.dx, v.dy);
      ctx.rotate(p * 1.5);
      ctx.strokeStyle = hexToRgba(col, 0.9 * fade);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Inner 5-point summoning star
      ctx.strokeStyle = hexToRgba('#ffffff', 0.72 * fade);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = ((i * 2) % 5) * ((Math.PI * 2) / 5) - Math.PI / 2;
        const sx = Math.cos(a) * ringR * 0.92;
        const sy = Math.sin(a) * ringR * 0.92;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
      ctx.restore();

      // Erupting jagged spikes / tendrils
      const spikeCount = 8;
      for (let s = 0; s < spikeCount; s++) {
        const a = (Math.PI * 2 * s) / spikeCount + p * 0.35;
        const baseR = ringR * 0.42;
        const tipR = ringR * (0.65 + Math.sin(p * Math.PI) * 0.85);
        ctx.strokeStyle = hexToRgba(s % 2 === 0 ? col : '#ffffff', fade);
        ctx.lineWidth = 3.6 * (1 - p * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(v.dx + Math.cos(a) * baseR, v.dy + Math.sin(a) * baseR);
        ctx.lineTo(v.dx + Math.cos(a) * tipR, v.dy + Math.sin(a) * tipR);
        ctx.stroke();
      }

      v.particles.forEach((pt, idx) => {
        const px = v.dx + pt.offsetX * 1.3;
        const py = v.dy + pt.offsetY - p * gs * 0.85;
        ctx.fillStyle = hexToRgba(idx % 3 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.85, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // nova: Triple staggered concentric sonic / shockwave rings + radial crest sparks
      const ring1 = targetRadius * 0.4 + gs * 1.75 * p;
      const ring2 = targetRadius * 0.3 + gs * 1.35 * Math.max(0, p - 0.1);
      const ring3 = targetRadius * 0.25 + gs * 0.95 * Math.max(0, p - 0.2);

      ctx.strokeStyle = hexToRgba(col, 0.92 * fade);
      ctx.lineWidth = 5.5 * (1 - p * 0.6);
      ctx.beginPath();
      ctx.arc(v.dx, v.dy, ring1, 0, Math.PI * 2);
      ctx.stroke();

      if (p > 0.1) {
        ctx.strokeStyle = hexToRgba('#ffffff', 0.82 * fade);
        ctx.lineWidth = 3 * (1 - p * 0.5);
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, ring2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (p > 0.2) {
        ctx.strokeStyle = hexToRgba(col, 0.65 * fade);
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(v.dx, v.dy, ring3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      v.particles.forEach((pt, idx) => {
        const px = v.dx + Math.cos(pt.ang) * ring1;
        const py = v.dy + Math.sin(pt.ang) * ring1;
        ctx.fillStyle = hexToRgba(idx % 2 === 0 ? '#ffffff' : col, fade);
        ctx.beginPath();
        ctx.arc(px, py, pt.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }
}


// Token portrait image cache (custom uploaded data URLs + tokens/<name>.{png,jpg,jpeg,webp,jfif})
const tokenPortraitCache = new Map();

function getTokenPortraitCandidates(tok) {
  if (!tok) return [];
  const list = [];
  if (tok.portraitDataUrl) list.push(tok.portraitDataUrl);
  if (tok.portraitUrl) list.push(tok.portraitUrl);

  const tpl = (appState?.bestiary || []).find(b =>
    (tok.templateId && b.templateId === tok.templateId) ||
    (String(b.name || '').trim().toLowerCase() === String(tok.name || '').trim().toLowerCase())
  );
  if (tpl?.portraitDataUrl) list.push(tpl.portraitDataUrl);
  if (tpl?.portraitUrl) list.push(tpl.portraitUrl);

  const rawName = String(tpl?.name || tok.name || '').trim();
  if (rawName) {
    const lowerName = rawName.toLowerCase();
    const slugUnderscore = lowerName.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const slugHyphen = lowerName.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const slugCompact = lowerName.replace(/[^a-z0-9]+/g, '');
    const titleUnderscore = rawName.replace(/\s+/g, '_');
    const exts = ['png', 'jpg', 'jpeg', 'webp', 'jfif', 'svg', 'PNG', 'JPG', 'JPEG', 'WEBP', 'JFIF', 'SVG'];
    const prefixes = ['tokens/tokens_', 'token/tokens_', 'tokens_', 'tokens/', 'token/'];

    const addCandidatesForName = (n) => {
      if (!n) return;
      prefixes.forEach(pfx => {
        exts.forEach(ext => list.push(`${pfx}${n}.${ext}`));
      });
    };

    [slugUnderscore, slugHyphen, slugCompact, titleUnderscore, rawName].forEach(addCandidatesForName);
    if (tok.templateId) {
      const tplSlug = String(tok.templateId).replace(/^tpl_/, '').toLowerCase();
      if (tplSlug) addCandidatesForName(tplSlug);
    }
  }
  return Array.from(new Set(list));
}

function getResolvedTokenPortraitImage(tok) {
  const candidates = getTokenPortraitCandidates(tok);
  if (!candidates || candidates.length === 0) return null;
  const key = candidates.join('|');
  let entry = tokenPortraitCache.get(key);
  if (entry) {
    return entry.status === 'loaded' ? entry.img : null;
  }

  entry = { status: 'loading', img: null };
  tokenPortraitCache.set(key, entry);

  const tryIdx = (idx) => {
    if (idx >= candidates.length) {
      entry.status = 'failed';
      return;
    }
    const url = candidates[idx];
    const img = new Image();
    img.onload = () => {
      entry.status = 'loaded';
      entry.img = img;
    };
    img.onerror = () => {
      tryIdx(idx + 1);
    };
    img.src = url;
  };
  tryIdx(0);
  return null;
}

function drawSwarmCrowdTokenArtwork(targetCtx, tok, cx, cy, r, span, gs, aliveUnits, nowMs) {
  const count = Math.max(2, Math.min(7, Number(aliveUnits) || 2));
  const img = getResolvedTokenPortraitImage(tok);
  const tSec = (nowMs || 0) * 0.001;
  const subR = Math.max(9, r * (count <= 3 ? 0.54 : 0.46));
  const orbitR = Math.max(6, r * (count <= 3 ? 0.44 : 0.52));
  const strokeCol = tok.color || '#ef4444';

  // Arrange rear/flanking pack members first, then foreground leader last so depth/stacking reads clearly
  const offsets = [];
  if (count === 2) {
    offsets.push({ dx: -orbitR * 0.85, dy: -orbitR * 0.35, scale: 0.9, z: 0 });
    offsets.push({ dx: orbitR * 0.72, dy: orbitR * 0.38, scale: 1.0, z: 1 });
  } else if (count === 3) {
    offsets.push({ dx: 0, dy: -orbitR * 0.85, scale: 0.86, z: 0 });
    offsets.push({ dx: -orbitR * 0.82, dy: orbitR * 0.42, scale: 0.96, z: 1 });
    offsets.push({ dx: orbitR * 0.82, dy: orbitR * 0.42, scale: 1.0, z: 2 });
  } else {
    const shown = Math.min(6, count);
    const backCount = Math.ceil(shown / 2);
    for (let i = 0; i < shown; i++) {
      const isBack = i < backCount;
      const idxInRow = isBack ? i : (i - backCount);
      const rowLen = isBack ? backCount : (shown - backCount);
      const frac = rowLen === 1 ? 0 : (idxInRow / (rowLen - 1)) * 2 - 1;
      offsets.push({
        dx: frac * orbitR * 0.95,
        dy: (isBack ? -0.58 : 0.54) * orbitR,
        scale: isBack ? 0.86 : 1.0,
        z: isBack ? 0 : 1
      });
    }
  }

  offsets.sort((a, b) => a.z - b.z);

  offsets.forEach((off, idx) => {
    const bob = Math.sin(tSec * 3.8 + idx * 1.35) * 1.4;
    const sx = cx + off.dx;
    const sy = cy + off.dy + bob;
    const sr = subR * off.scale;

    targetCtx.save();
    // Subtle dark drop shadow behind each member so overlapping crowd silhouettes separate cleanly
    targetCtx.fillStyle = 'rgba(2, 6, 15, 0.78)';
    targetCtx.beginPath();
    targetCtx.arc(sx + 1.5, sy + 2, sr, 0, Math.PI * 2);
    targetCtx.fill();

    targetCtx.fillStyle = '#0f172a';
    targetCtx.strokeStyle = idx === offsets.length - 1 ? '#fde047' : strokeCol;
    targetCtx.lineWidth = idx === offsets.length - 1 ? 2.2 : 1.7;
    targetCtx.beginPath();
    targetCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      targetCtx.beginPath();
      targetCtx.arc(sx, sy, Math.max(2, sr - 1.2), 0, Math.PI * 2);
      targetCtx.clip();
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const sc = Math.max((sr * 2) / nw, (sr * 2) / nh);
      const dw = nw * sc;
      const dh = nh * sc;
      targetCtx.drawImage(img, sx - dw / 2, sy - dh / 2, dw, dh);
    } else {
      targetCtx.font = `${Math.max(10, Math.round(sr * 1.18))}px sans-serif`;
      targetCtx.textAlign = 'center';
      targetCtx.textBaseline = 'middle';
      targetCtx.fillStyle = '#f8fafc';
      targetCtx.fillText(tok.iconSymbol || '👹', sx, sy + 0.5);
    }
    targetCtx.restore();
  });
}

const TOKEN_PUCK_TILT_Y = 0.84;

function drawPhysicalMiniaturePedestal(targetCtx, tok, baseCx, baseCy, r, elevFt, isDragging, nowMs = 0) {
  const z = clampElevationFt(elevFt);
  const liftPx = (z / 5) * 4.2 + (isDragging ? 7 : 0);
  const topCx = baseCx + (isDragging ? 2.5 : 0);
  const topCy = baseCy - liftPx;
  const topR = r;
  const topRy = topR * TOKEN_PUCK_TILT_Y;
  const col = tok.color || (tok.role === 'crawler' ? '#38bdf8' : '#ef4444');
  const wallH = Math.max(6, Math.min(12, topR * 0.27));

  targetCtx.save();

  // Soft ground shadow underneath the tilted puck
  targetCtx.fillStyle = 'rgba(2, 5, 12, 0.50)';
  targetCtx.beginPath();
  targetCtx.ellipse(baseCx, baseCy + wallH + 2, topR * 0.96, topRy * 0.56, 0, 0, Math.PI * 2);
  targetCtx.fill();

  // 3D cylindrical puck side wall (100% opaque with shaded cylindrical wrap & seamless outer edge)
  targetCtx.beginPath();
  targetCtx.moveTo(topCx + topR, topCy);
  targetCtx.lineTo(topCx + topR, topCy + wallH);
  targetCtx.ellipse(topCx, topCy + wallH, topR, topRy, 0, 0, Math.PI, false);
  targetCtx.lineTo(topCx - topR, topCy);
  targetCtx.ellipse(topCx, topCy, topR, topRy, 0, Math.PI, 0, true);
  targetCtx.closePath();

  // Solid opaque dark backing so the board never bleeds through the token wall
  targetCtx.fillStyle = '#090d16';
  targetCtx.fill();

  // Opaque-looking cylindrical color shading layered over the solid backing
  const wallGrad = targetCtx.createLinearGradient(topCx - topR, topCy, topCx + topR, topCy);
  wallGrad.addColorStop(0, hexToRgba(col, 0.45));
  wallGrad.addColorStop(0.32, hexToRgba(col, 0.95));
  wallGrad.addColorStop(0.68, hexToRgba(col, 0.85));
  wallGrad.addColorStop(1, hexToRgba(col, 0.40));
  targetCtx.fillStyle = wallGrad;
  targetCtx.fill();

  // Continuous U-shaped outer rim stroke connecting left/right sides smoothly into the bottom ring (no divots)
  targetCtx.strokeStyle = col;
  targetCtx.lineWidth = 2.4;
  targetCtx.lineJoin = 'round';
  targetCtx.lineCap = 'round';
  targetCtx.beginPath();
  targetCtx.moveTo(topCx + topR, topCy);
  targetCtx.lineTo(topCx + topR, topCy + wallH);
  targetCtx.ellipse(topCx, topCy + wallH, topR, topRy, 0, 0, Math.PI, false);
  targetCtx.lineTo(topCx - topR, topCy);
  targetCtx.stroke();

  // Tilted top face of puck
  targetCtx.fillStyle = '#0f172a';
  targetCtx.strokeStyle = col;
  targetCtx.lineWidth = 2.6;
  targetCtx.beginPath();
  targetCtx.ellipse(topCx, topCy, topR, topRy, 0, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.stroke();

  // Subtle upper-rim specular glint to sell the angled 3D bevel
  targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
  targetCtx.lineWidth = 1.4;
  targetCtx.beginPath();
  targetCtx.ellipse(topCx, topCy, Math.max(2, topR - 1.2), Math.max(2, topRy - 1.0), 0, Math.PI * 1.12, Math.PI * 1.88, false);
  targetCtx.stroke();

  targetCtx.restore();
  return { cx: topCx, cy: topCy, r: topR, ry: topRy, liftPx };
}

function drawTokenArtwork(targetCtx, tok, cx, cy, r, span, gs, nowMs = 0) {
  const isDragging = Boolean(uiState.isDraggingToken && uiState.draggedTokenId === tok.id);
  const elevFt = typeof getTokenElevationFt === 'function' ? getTokenElevationFt(tok, getActiveScene()) : 0;
  const mini = drawPhysicalMiniaturePedestal(targetCtx, tok, cx, cy, r, elevFt, isDragging, nowMs);
  const drawCx = mini.cx;
  const drawCy = mini.cy;
  const drawR = mini.r;
  const drawRy = mini.ry;

  if (tok && tok.role !== 'crawler') {
    const hm = getTokenHealthMetrics(tok);
    if (hm.swarmCount > 1 && hm.aliveUnits > 1) {
      drawSwarmCrowdTokenArtwork(targetCtx, tok, drawCx, drawCy, drawR, span, gs, hm.aliveUnits, nowMs);
      return;
    }
  }
  const img = getResolvedTokenPortraitImage(tok);
  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.ellipse(drawCx, drawCy, Math.max(2, drawR - 1.5), Math.max(2, drawRy - 1.3), 0, 0, Math.PI * 2);
    targetCtx.clip();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const scale = Math.max((drawR * 2) / nw, (drawR * 2) / nh);
    const dw = nw * scale;
    const dh = nh * scale * TOKEN_PUCK_TILT_Y;
    targetCtx.drawImage(img, drawCx - dw / 2, drawCy - dh / 2, dw, dh);
    targetCtx.restore();
    return;
  }

  targetCtx.save();
  targetCtx.translate(drawCx, drawCy);
  targetCtx.scale(1, TOKEN_PUCK_TILT_Y);
  targetCtx.font = `${Math.round(gs * span * 0.44)}px sans-serif`;
  targetCtx.textAlign = 'center';
  targetCtx.textBaseline = 'middle';
  targetCtx.fillStyle = '#f8fafc';
  targetCtx.fillText(tok.iconSymbol || (tok.role === 'crawler' ? '⚔️' : '👹'), 0, 0);
  targetCtx.restore();
}

const tokenVisualPos = new Map();
let lastVisualSceneId = null;

function getTokenVisualGridPos(tok, nowMs) {
  if (uiState.isDraggingToken && uiState.draggedTokenId === tok.id) {
    tokenVisualPos.set(tok.id, {
      x: uiState.dragPreviewGx,
      y: uiState.dragPreviewGy,
      startX: uiState.dragPreviewGx,
      startY: uiState.dragPreviewGy,
      targetX: uiState.dragPreviewGx,
      targetY: uiState.dragPreviewGy,
      startTime: nowMs,
      durationMs: 0,
      trailUntil: 0
    });
    return { gx: uiState.dragPreviewGx, gy: uiState.dragPreviewGy, anim: null };
  }

  let st = tokenVisualPos.get(tok.id);
  if (!st) {
    st = {
      x: tok.gx,
      y: tok.gy,
      startX: tok.gx,
      startY: tok.gy,
      targetX: tok.gx,
      targetY: tok.gy,
      startTime: nowMs,
      durationMs: 0,
      trailUntil: 0
    };
    tokenVisualPos.set(tok.id, st);
    return { gx: tok.gx, gy: tok.gy, anim: st };
  }

  if (st.targetX !== tok.gx || st.targetY !== tok.gy) {
    const distSq = Math.hypot(tok.gx - st.x, tok.gy - st.y);
    st.startX = st.x;
    st.startY = st.y;
    st.targetX = tok.gx;
    st.targetY = tok.gy;
    st.startTime = nowMs;
    st.durationMs = Math.min(730, Math.max(290, distSq * 92));
    st.trailUntil = nowMs + st.durationMs + 550;
  }

  if (st.durationMs > 0) {
    const t = Math.max(0, Math.min(1, (nowMs - st.startTime) / st.durationMs));
    const ease = 1 - Math.pow(1 - t, 3);
    st.x = st.startX + (st.targetX - st.startX) * ease;
    st.y = st.startY + (st.targetY - st.startY) * ease;
    if (t >= 1) {
      st.x = st.targetX;
      st.y = st.targetY;
      st.durationMs = 0;
    }
  } else {
    st.x = tok.gx;
    st.y = tok.gy;
  }

  return { gx: st.x, gy: st.y, anim: st };
}

function drawTokenMotionTrail(targetCtx, tok, anim, gs, nowMs) {
  if (!anim || !anim.trailUntil || nowMs >= anim.trailUntil) return;
  const distSq = Math.hypot(anim.x - anim.startX, anim.y - anim.startY);
  if (distSq < 0.15) return;
  const remaining = Math.max(0, anim.trailUntil - nowMs);
  const fade = Math.min(1, remaining / 550);
  const sx = (anim.startX + 0.5) * gs;
  const sy = (anim.startY + 0.5) * gs;
  const ex = (anim.x + 0.5) * gs;
  const ey = (anim.y + 0.5) * gs;
  const col = tok.color || (tok.role === 'crawler' ? '#38bdf8' : '#ef4444');

  targetCtx.save();
  targetCtx.strokeStyle = hexToRgba(col, 0.45 * fade);
  targetCtx.lineWidth = 2;
  targetCtx.setLineDash([4, 4]);
  targetCtx.beginPath();
  targetCtx.arc(sx, sy, gs * 0.24, 0, Math.PI * 2);
  targetCtx.stroke();

  const grad = targetCtx.createLinearGradient(sx, sy, ex, ey);
  grad.addColorStop(0, hexToRgba(col, 0.08 * fade));
  grad.addColorStop(1, hexToRgba(col, 0.72 * fade));
  targetCtx.strokeStyle = grad;
  targetCtx.lineWidth = Math.max(3, gs * 0.12);
  targetCtx.lineCap = 'round';
  targetCtx.setLineDash([]);
  targetCtx.beginPath();
  targetCtx.moveTo(sx, sy);
  targetCtx.lineTo(ex, ey);
  targetCtx.stroke();
  targetCtx.restore();
}

// =========================================================================
// 5. MAIN 60FPS BATTLE CANVAS RENDERER
// =========================================================================
function drawTacticalGridLines(targetCtx, scene, gs, minWorldX, minWorldY, maxWorldX, maxWorldY, subtleOverDarkness = false) {
  if (!uiState.gridVisible || !scene) return;
  const baseAlpha = scene.gridAlpha ?? 0.2;
  const alpha = subtleOverDarkness ? Math.max(0.08, Math.min(0.22, baseAlpha * 0.65)) : Math.max(0.14, baseAlpha);
  const startCol = Math.floor(minWorldX / gs) - 1;
  const endCol = Math.min(startCol + 260, Math.ceil(maxWorldX / gs) + 1);
  const startRow = Math.floor(minWorldY / gs) - 1;
  const endRow = Math.min(startRow + 260, Math.ceil(maxWorldY / gs) + 1);

  targetCtx.save();
  targetCtx.strokeStyle = `rgba(148, 163, 184, ${alpha.toFixed(3)})`;
  targetCtx.lineWidth = 1 / uiState.camZoom;
  targetCtx.beginPath();
  for (let c = startCol; c <= endCol; c++) {
    targetCtx.moveTo(c * gs, startRow * gs);
    targetCtx.lineTo(c * gs, endRow * gs);
  }
  for (let r = startRow; r <= endRow; r++) {
    targetCtx.moveTo(startCol * gs, r * gs);
    targetCtx.lineTo(endCol * gs, r * gs);
  }
  targetCtx.stroke();
  targetCtx.restore();
}

function renderBattleCanvas(timestamp) {
  const wrap = document.getElementById('canvasWrapper');
  const dpr = window.devicePixelRatio || 1;
  if (wrap) {
    const targetW = Math.floor(Math.max(1, wrap.clientWidth) * dpr);
    const targetH = Math.floor(Math.max(1, wrap.clientHeight) * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      resizeBattleCanvas();
    }
  }

  const scene = getActiveScene();
  if (!scene) {
    requestAnimationFrame(renderBattleCanvas);
    return;
  }

  const setupBlackout = document.getElementById('playerSetupBlackout');
  if (IS_PLAYER_WINDOW) {
    if ((appState?.round ?? 0) === 0) {
      if (setupBlackout) setupBlackout.classList.remove('hidden');
      requestAnimationFrame(renderBattleCanvas);
      return;
    } else if (setupBlackout) {
      setupBlackout.classList.add('hidden');
    }
  }

  const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
  const nowMs = timestamp || performance.now();
  const now = nowMs * 0.001;
  if (lastVisualSceneId !== scene.id) {
    tokenVisualPos.clear();
    lastVisualSceneId = scene.id;
  }
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  const blockingWalls = getBlockingWallSegments(scene);
  const crawlerVisList = getCrawlerVisionSources(scene, gs, blockingWalls);
  updateExplorationMemoryAndGhosts(scene, gs, crawlerVisList, blockingWalls);

  // Clear full backing pixel buffer cleanly so no trails ever remain on resize/pan
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07090e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(uiState.camX, uiState.camY);
  ctx.scale(uiState.camZoom, uiState.camZoom);

  const minWorldX = -uiState.camX / uiState.camZoom;
  const minWorldY = -uiState.camY / uiState.camZoom;
  const maxWorldX = minWorldX + w / uiState.camZoom;
  const maxWorldY = minWorldY + h / uiState.camZoom;

  // 1. Background Map Image or Checkerboard Floor
  if (loadedMapImg) {
    const scale = (scene.mapScale ?? 100) / 100;
    ctx.drawImage(loadedMapImg, scene.mapOffsetX ?? 0, scene.mapOffsetY ?? 0, loadedMapImg.width * scale, loadedMapImg.height * scale);
  } else {
    const startCol = Math.floor(minWorldX / gs) - 1;
    const endCol = Math.min(startCol + 260, Math.ceil(maxWorldX / gs) + 1);
    const startRow = Math.floor(minWorldY / gs) - 1;
    const endRow = Math.min(startRow + 260, Math.ceil(maxWorldY / gs) + 1);
    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        ctx.fillStyle = ((c + r) & 1) === 0 ? '#0b0f17' : '#0e131d';
        ctx.fillRect(c * gs, r * gs, gs, gs);
      }
    }
  }

  // 1b. Raised / Lowered 2.5D Terrain Zones (5ft steps) — Progressive Surface Shading & Extruded Depth
  if (typeof getTerrainZonesForScene === 'function') {
    const tZones = getTerrainZonesForScene(scene);
    const activeSet = new Set();
    const cellElevMap = new Map();
    tZones.forEach(z => {
      if (IS_PLAYER_WINDOW && z.hiddenFromPlayers) return;
      const zElev = clampElevationFt(z.elevationFt);
      if (zElev === 0) return;
      const x1 = Math.min(z.gx1, z.gx2);
      const x2 = Math.max(z.gx1, z.gx2);
      const y1 = Math.min(z.gy1, z.gy2);
      const y2 = Math.max(z.gy1, z.gy2);
      for (let gx = x1; gx <= x2; gx++) {
        for (let gy = y1; gy <= y2; gy++) {
          activeSet.add(`${gx},${gy}`);
          cellElevMap.set(`${gx},${gy}`, zElev);
        }
      }
    });

    if (activeSet.size > 0) {
      const getElev = (gx, gy) => cellElevMap.get(`${gx},${gy}`) || 0;
      const maxStepsScale = 8; // steps (40ft) until near-peak shading saturation

      // Pass A: Progressive surface tint + darkening as elevation moves higher (+5ft, +10ft...) or lower (-5ft, -10ft...)
      activeSet.forEach(key => {
        const [gxS, gyS] = key.split(',');
        const gx = Number(gxS);
        const gy = Number(gyS);
        const zElev = getElev(gx, gy);
        const absSteps = Math.max(1, Math.abs(zElev) / 5);
        const intensity = Math.min(1, absSteps / maxStepsScale);
        const x0 = gx * gs;
        const y0 = gy * gs;

        ctx.save();
        if (zElev < 0) {
          // Starts with a light cyan surface shift at -5ft, then deepens & darkens progressively as it goes deeper
          const tintAlpha = (0.09 + intensity * 0.14).toFixed(3);
          const darkAlpha = (0.08 + Math.pow(intensity, 0.85) * 0.56).toFixed(3);
          ctx.fillStyle = `rgba(56, 189, 248, ${tintAlpha})`;
          ctx.fillRect(x0, y0, gs, gs);
          ctx.fillStyle = `rgba(2, 6, 16, ${darkAlpha})`;
          ctx.fillRect(x0, y0, gs, gs);

          // Inner pit wall drop-offs where neighbors are higher
          const nTop = getElev(gx, gy - 1);
          if (nTop > zElev) {
            const diffSteps = Math.max(1, (nTop - zElev) / 5);
            const wallH = Math.min(gs * 0.36, diffSteps * 5.5);
            const gTop = ctx.createLinearGradient(x0, y0, x0, y0 + wallH);
            gTop.addColorStop(0, `rgba(2, 6, 16, ${Math.min(0.96, 0.55 + diffSteps * 0.1).toFixed(3)})`);
            gTop.addColorStop(1, 'rgba(14, 116, 144, 0.12)');
            ctx.fillStyle = gTop;
            ctx.fillRect(x0, y0, gs, wallH);
          }
          const nLeft = getElev(gx - 1, gy);
          if (nLeft > zElev) {
            const diffSteps = Math.max(1, (nLeft - zElev) / 5);
            const wallW = Math.min(gs * 0.36, diffSteps * 5.5);
            const gLeft = ctx.createLinearGradient(x0, y0, x0 + wallW, y0);
            gLeft.addColorStop(0, `rgba(2, 6, 16, ${Math.min(0.96, 0.55 + diffSteps * 0.1).toFixed(3)})`);
            gLeft.addColorStop(1, 'rgba(14, 116, 144, 0.12)');
            ctx.fillStyle = gLeft;
            ctx.fillRect(x0, y0, wallW, gs);
          }

          // Stepped contour lines inside pit
          const contourCount = Math.min(4, absSteps);
          for (let c = 1; c <= contourCount; c++) {
            const inset = (c / (contourCount + 1)) * (gs * 0.34);
            ctx.strokeStyle = `rgba(56, 189, 248, ${(0.14 + intensity * 0.2).toFixed(3)})`;
            ctx.lineWidth = 1 / uiState.camZoom;
            ctx.strokeRect(x0 + inset, y0 + inset, gs - inset * 2, gs - inset * 2);
          }
        } else {
          // Raised platform: shifts deck up-left, starts with light warm amber shift at +5ft, darkens progressively as it rises
          const liftX = -Math.min(gs * 0.26, absSteps * 3.0);
          const liftY = -Math.min(gs * 0.34, absSteps * 4.2);

          // Extruded south/east cliff face from ground to raised deck
          const sElev = getElev(gx, gy + 1);
          if (sElev < zElev) {
            const diffSteps = Math.max(1, (zElev - sElev) / 5);
            const cliffH = Math.max(4, Math.min(gs * 0.42, diffSteps * 6.0));
            const grad = ctx.createLinearGradient(x0 + liftX, y0 + gs + liftY, x0 + liftX, y0 + gs + liftY + cliffH);
            grad.addColorStop(0, `rgba(217, 119, 6, ${Math.min(0.85, 0.42 + intensity * 0.4).toFixed(3)})`);
            grad.addColorStop(1, `rgba(38, 16, 4, ${Math.min(0.96, 0.68 + intensity * 0.28).toFixed(3)})`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(x0 + liftX, y0 + gs + liftY);
            ctx.lineTo(x0 + gs + liftX, y0 + gs + liftY);
            ctx.lineTo(x0 + gs, y0 + gs + Math.max(0, cliffH + liftY));
            ctx.lineTo(x0, y0 + gs + Math.max(0, cliffH + liftY));
            ctx.closePath();
            ctx.fill();
          }

          const eElev = getElev(gx + 1, gy);
          if (eElev < zElev) {
            const diffSteps = Math.max(1, (zElev - eElev) / 5);
            const cliffW = Math.max(3, Math.min(gs * 0.32, diffSteps * 4.2));
            ctx.fillStyle = `rgba(120, 53, 15, ${Math.min(0.92, 0.48 + intensity * 0.42).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(x0 + gs + liftX, y0 + liftY);
            ctx.lineTo(x0 + gs + liftX, y0 + gs + liftY);
            ctx.lineTo(x0 + gs + cliffW, y0 + gs);
            ctx.lineTo(x0 + gs + cliffW, y0);
            ctx.closePath();
            ctx.fill();
          }

          // Top surface: light amber tint at +5ft that deepens and darkens progressively as elevation climbs
          const tintAlpha = (0.09 + intensity * 0.14).toFixed(3);
          const darkAlpha = (0.05 + Math.pow(intensity, 0.85) * 0.50).toFixed(3);
          ctx.fillStyle = `rgba(251, 191, 36, ${tintAlpha})`;
          ctx.fillRect(x0 + liftX, y0 + liftY, gs, gs);
          ctx.fillStyle = `rgba(18, 10, 4, ${darkAlpha})`;
          ctx.fillRect(x0 + liftX, y0 + liftY, gs, gs);

          // Top bevel highlight
          ctx.strokeStyle = `rgba(254, 240, 138, ${(0.55 + intensity * 0.35).toFixed(3)})`;
          ctx.lineWidth = 1.6 / uiState.camZoom;
          ctx.strokeRect(x0 + liftX + 0.5, y0 + liftY + 0.5, gs - 1, gs - 1);
        }
        ctx.restore();
      });

      // Pass B: Crisp step rim borders & elevation badges on GM view
      activeSet.forEach(key => {
        const [gxS, gyS] = key.split(',');
        const gx = Number(gxS);
        const gy = Number(gyS);
        const zElev = getElev(gx, gy);
        const absSteps = Math.max(1, Math.abs(zElev) / 5);
        const liftX = zElev > 0 ? -Math.min(gs * 0.26, absSteps * 3.0) : 0;
        const liftY = zElev > 0 ? -Math.min(gs * 0.34, absSteps * 4.2) : 0;
        const x0 = gx * gs + liftX;
        const y0 = gy * gs + liftY;
        const x1 = x0 + gs;
        const y1 = y0 + gs;

        ctx.save();
        ctx.strokeStyle = zElev > 0 ? 'rgba(251, 191, 36, 0.85)' : 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.2 / uiState.camZoom;
        ctx.beginPath();
        if (getElev(gx, gy - 1) !== zElev) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
        if (getElev(gx, gy + 1) !== zElev) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
        if (getElev(gx - 1, gy) !== zElev) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
        if (getElev(gx + 1, gy) !== zElev) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
        ctx.stroke();

        const badge = formatElevationBadge(zElev);
        if (badge && !IS_PLAYER_WINDOW) {
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          const tw = ctx.measureText(badge).width + 8;
          ctx.fillStyle = 'rgba(7, 9, 14, 0.88)';
          ctx.beginPath();
          ctx.roundRect(x0 + 4, y0 + 4, tw, 15, 4);
          ctx.fill();
          ctx.fillStyle = zElev > 0 ? '#fbbf24' : '#7dd3fc';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(badge, x0 + 8, y0 + 11.5);
        }
        ctx.restore();
      });
    }
  }

  // 2. Tactical Square Grid Lines
  drawTacticalGridLines(ctx, scene, gs, minWorldX, minWorldY, maxWorldX, maxWorldY, false);

  // 3. Tactical 4-Ring Movement Overlays (GM sees any selected token; Player sees own claimed crawler clipped under FoW)
  const drawGmTacticalOverlays = () => {
    const overlayTokenId = IS_PLAYER_WINDOW ? uiState.claimedCrawlerId : uiState.selectedTokenId;
    const selTok = overlayTokenId
      ? (scene.tokens || []).find(t => t.id === overlayTokenId)
      : null;

    if (selTok && uiState.showTacticalRanges) {
      const metrics = getTokenRangeMetrics(selTok);
      const anchorGx = (uiState.isDraggingToken && uiState.draggedTokenId === selTok.id)
        ? uiState.dragStartGx
        : ((appState && appState.round > 0 && selTok.turnStartGx !== undefined) ? selTok.turnStartGx : selTok.gx);
      const anchorGy = (uiState.isDraggingToken && uiState.draggedTokenId === selTok.id)
        ? uiState.dragStartGy
        : ((appState && appState.round > 0 && selTok.turnStartGy !== undefined) ? selTok.turnStartGy : selTok.gy);
      const pulse = 0.88 + Math.sin(now * 2.6) * 0.12;
      const maxOverlayFt = metrics.canDoubleMove
        ? metrics.ring4DoubleMoveFt
        : metrics.canSingleMove
        ? metrics.ring2MoveStepFt
        : metrics.canFreeStep
        ? metrics.ring1StepFt
        : 0;
      const reachMap = computeReachableGridMap(anchorGx, anchorGy, maxOverlayFt, scene);

      const drawGridMovementTier = (radiusFt, r, g, b, alphaScale = 1, isSecondary = false) => {
        const maxSteps = Math.max(0, Math.floor(radiusFt / 5));
        if (maxSteps <= 0) return;
        const cells = [];
        const cellSet = new Set();
        reachMap.forEach((steps, key) => {
          if (steps > 0 && steps <= maxSteps) {
            const [gxStr, gyStr] = key.split(',');
            cells.push({ gx: Number(gxStr), gy: Number(gyStr) });
            cellSet.add(key);
          }
        });
        if (cells.length === 0) return;

        ctx.save();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(isSecondary ? 0.08 : 0.13) * alphaScale * pulse})`;
        cells.forEach(({ gx, gy }) => {
          ctx.fillRect(gx * gs + 1, gy * gs + 1, gs - 2, gs - 2);
        });

        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(isSecondary ? 0.58 : 0.85) * alphaScale * pulse})`;
        ctx.lineWidth = (isSecondary ? 1.8 : 2.5) / uiState.camZoom;
        if (isSecondary) ctx.setLineDash([6 / uiState.camZoom, 5 / uiState.camZoom]);
        ctx.beginPath();
        cells.forEach(({ gx, gy }) => {
          const x0 = gx * gs;
          const y0 = gy * gs;
          const x1 = x0 + gs;
          const y1 = y0 + gs;
          if (!cellSet.has(`${gx},${gy - 1}`) && !(gx === anchorGx && gy - 1 === anchorGy)) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
          if (!cellSet.has(`${gx},${gy + 1}`) && !(gx === anchorGx && gy + 1 === anchorGy)) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
          if (!cellSet.has(`${gx - 1},${gy}`) && !(gx - 1 === anchorGx && gy === anchorGy)) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
          if (!cellSet.has(`${gx + 1},${gy}`) && !(gx + 1 === anchorGx && gy === anchorGy)) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
        });
        ctx.stroke();
        ctx.restore();
      };

      if (metrics.canDoubleMove) {
        drawGridMovementTier(metrics.ring4DoubleMoveFt, 56, 189, 248, 0.9, true);
        drawGridMovementTier(metrics.ring3MoveTwoStepsFt, 34, 197, 94, 0.95, true);
      }
      if (metrics.canSingleMove) {
        drawGridMovementTier(metrics.ring2MoveStepFt, 56, 189, 248, 1.0, false);
      }
      if (metrics.canFreeStep) {
        drawGridMovementTier(metrics.ring1StepFt, 34, 197, 94, 1.0, false);
      }
    }

    // 3a-ii. Faint Red Effect Range Area (LOS-Clipped unless ability/attack Ignores LOS)
    const effPrev = (!IS_PLAYER_WINDOW || (uiState.previewEffectRange && uiState.previewEffectRange.sourceTokenId === uiState.claimedCrawlerId)) ? uiState.previewEffectRange : null;
    if (effPrev && effPrev.rangeFt > 0) {
      const srcTok = (scene.tokens || []).find(t => t.id === effPrev.sourceTokenId);
      if (srcTok) {
        const sGx = (uiState.isDraggingToken && uiState.draggedTokenId === srcTok.id) ? uiState.dragPreviewGx : srcTok.gx;
        const sGy = (uiState.isDraggingToken && uiState.draggedTokenId === srcTok.id) ? uiState.dragPreviewGy : srcTok.gy;
        const span = Math.max(1, Math.min(4, Number(srcTok.gridSpan) || 1));
        const ox = (sGx + 0.5) * gs;
        const oy = (sGy + 0.5) * gs;
        const radiusPx = ((effPrev.rangeFt / 5) + (span - 1) * 0.5) * gs;
        const activeWalls = effPrev.ignoreLos ? [] : blockingWalls;
        const poly = computeVisibilityPolygon(ox, oy, radiusPx, activeWalls, 360, 0);

        ctx.save();
        traceRayPolygonPath(ctx, ox, oy, poly, true);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 113, 133, 0.65)';
        ctx.lineWidth = 2 / uiState.camZoom;
        ctx.setLineDash([6 / uiState.camZoom, 4 / uiState.camZoom]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Visual AoE & 50% Splash Footprint Preview (Blast / Burst / Cone / Line / Splash)
        const aoe = effPrev.aoeSpec;
        if (aoe && aoe.hasAoe) {
          const tgtTok = effPrev.targetId ? (scene.tokens || []).find(t => t.id === effPrev.targetId) : null;
          const isFromTarget = aoe.shape === 'blast' || aoe.shape === 'splash_only';
          const aOx = (isFromTarget && tgtTok) ? (tgtTok.gx + 0.5) * gs : ox;
          const aOy = (isFromTarget && tgtTok) ? (tgtTok.gy + 0.5) * gs : oy;
          const primPx = (aoe.primaryFt / 5) * gs;
          const totalPx = ((aoe.primaryFt + aoe.splashFt) / 5) * gs;
          const dirAng = tgtTok ? Math.atan2((tgtTok.gy - sGy), (tgtTok.gx - sGx)) : 0;

          if (aoe.shape === 'blast' || aoe.shape === 'burst' || aoe.shape === 'splash_only') {
            if (aoe.splashFt > 0 && totalPx > 0) {
              ctx.beginPath();
              ctx.arc(aOx, aOy, totalPx, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(251, 191, 36, 0.14)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
              ctx.lineWidth = 2 / uiState.camZoom;
              ctx.setLineDash([5 / uiState.camZoom, 4 / uiState.camZoom]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            if (primPx > 0) {
              ctx.beginPath();
              ctx.arc(aOx, aOy, primPx, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(249, 115, 22, 0.26)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.95)';
              ctx.lineWidth = 2.4 / uiState.camZoom;
              ctx.stroke();
            }
          } else if (aoe.shape === 'cone') {
            const halfArc = Math.PI / 6; // 60 deg cone
            if (aoe.splashFt > 0 && totalPx > 0) {
              ctx.beginPath();
              ctx.moveTo(ox, oy);
              ctx.arc(ox, oy, totalPx, dirAng - halfArc, dirAng + halfArc);
              ctx.closePath();
              ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
              ctx.lineWidth = 2 / uiState.camZoom;
              ctx.setLineDash([5 / uiState.camZoom, 4 / uiState.camZoom]);
              ctx.stroke();
              ctx.setLineDash([]);
            }
            if (primPx > 0) {
              ctx.beginPath();
              ctx.moveTo(ox, oy);
              ctx.arc(ox, oy, primPx, dirAng - halfArc, dirAng + halfArc);
              ctx.closePath();
              ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
              ctx.fill();
              ctx.strokeStyle = 'rgba(249, 115, 22, 0.95)';
              ctx.lineWidth = 2.4 / uiState.camZoom;
              ctx.stroke();
            }
          } else if (aoe.shape === 'line') {
            const drawLineRect = (lenPx, fill, stroke, dashed) => {
              ctx.save();
              ctx.translate(ox, oy);
              ctx.rotate(dirAng);
              ctx.fillStyle = fill;
              ctx.strokeStyle = stroke;
              ctx.lineWidth = 2 / uiState.camZoom;
              if (dashed) ctx.setLineDash([5 / uiState.camZoom, 4 / uiState.camZoom]);
              ctx.fillRect(0, -gs * 0.5, lenPx, gs);
              ctx.strokeRect(0, -gs * 0.5, lenPx, gs);
              ctx.restore();
            };
            if (aoe.splashFt > 0 && totalPx > 0) {
              drawLineRect(totalPx, 'rgba(251, 191, 36, 0.15)', 'rgba(251, 191, 36, 0.85)', true);
            }
            if (primPx > 0) {
              drawLineRect(primPx, 'rgba(249, 115, 22, 0.28)', 'rgba(249, 115, 22, 0.95)', false);
            }
          }
        }
        ctx.restore();
      }
    }

    // 3a-iii. Step 1/2 Mob Telegraph Intent Arrows (Dashed Red Lines to Targeted Crawlers)
    const declaredAtks = Array.isArray(scene.declaredMobAttacks) ? scene.declaredMobAttacks : [];
    if (declaredAtks.length > 0 && (appState?.round || 0) > 0) {
      ctx.save();
      declaredAtks.forEach(decl => {
        const mob = (scene.tokens || []).find(t => t.id === decl.mobId);
        if (!mob || mob.hiddenFromPlayers || getTokenHealthMetrics(mob).curHp <= 0) return;
        const mVis = getTokenVisualGridPos(mob, nowMs);
        const mx = (mVis.gx + 0.5) * gs;
        const my = (mVis.gy + 0.5) * gs;
        (decl.targetIds || []).forEach(tid => {
          const tgt = (scene.tokens || []).find(t => t.id === tid);
          if (!tgt) return;
          const tVis = getTokenVisualGridPos(tgt, nowMs);
          const tx = (tVis.gx + 0.5) * gs;
          const ty = (tVis.gy + 0.5) * gs;
          const ang = Math.atan2(ty - my, tx - mx);
          const dist = Math.hypot(tx - mx, ty - my);
          if (dist < 10) return;
          const endX = tx - Math.cos(ang) * (gs * 0.44);
          const endY = ty - Math.sin(ang) * (gs * 0.44);

          ctx.strokeStyle = 'rgba(244, 63, 94, 0.88)';
          ctx.lineWidth = 2.6 / uiState.camZoom;
          ctx.setLineDash([8 / uiState.camZoom, 5 / uiState.camZoom]);
          ctx.lineDashOffset = -now * 28;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrowhead
          const headLen = 10 / uiState.camZoom;
          ctx.fillStyle = 'rgba(251, 113, 133, 0.95)';
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLen * Math.cos(ang - Math.PI / 6), endY - headLen * Math.sin(ang - Math.PI / 6));
          ctx.lineTo(endX - headLen * Math.cos(ang + Math.PI / 6), endY - headLen * Math.sin(ang + Math.PI / 6));
          ctx.closePath();
          ctx.fill();

          // Red targeting reticle pulse around targeted crawler
          const rPulse = 0.55 + Math.sin(now * 5) * 0.25;
          ctx.strokeStyle = `rgba(244, 63, 94, ${rPulse})`;
          ctx.lineWidth = 2.5 / uiState.camZoom;
          ctx.beginPath();
          ctx.arc(tx, ty, gs * 0.52, 0, Math.PI * 2);
          ctx.stroke();
        });
      });
      ctx.restore();
    }

    // 3b. Drag Origin Ghost & Live Distance Readout
    if (uiState.isDraggingToken && uiState.draggedTokenId && (!IS_PLAYER_WINDOW || uiState.draggedTokenId === uiState.claimedCrawlerId)) {
      const dragTok = (scene.tokens || []).find(t => t.id === uiState.draggedTokenId);
      if (dragTok) {
        const sx = (uiState.dragStartGx + 0.5) * gs;
        const sy = (uiState.dragStartGy + 0.5) * gs;
        const ex = (uiState.dragPreviewGx + 0.5) * gs;
        const ey = (uiState.dragPreviewGy + 0.5) * gs;
        const movedFt = calcGridDistanceFt(uiState.dragStartGx, uiState.dragStartGy, uiState.dragPreviewGx, uiState.dragPreviewGy);
        const metrics = getTokenRangeMetrics(dragTok);
        const wallCollision = dragTok.role === 'crawler'
          ? findWallBlockedCrawlerStep(uiState.dragStartGx, uiState.dragStartGy, uiState.dragPreviewGx, uiState.dragPreviewGy, scene)
          : null;

        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = wallCollision ? 'rgba(244, 63, 94, 0.95)' : 'rgba(148, 163, 184, 0.85)';
        ctx.lineWidth = 2 / uiState.camZoom;
        ctx.beginPath();
        ctx.arc(sx, sy, gs * 0.36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);

        let badgeColor = '#34d399';
        let badgeText = `Moved ${movedFt}ft`;
        if (wallCollision) {
          badgeColor = '#f43f5e';
          badgeText = '🧱 Blocked';
        } else if (movedFt > metrics.doubleMoveFt) {
          badgeColor = '#f43f5e';
        } else if (movedFt > metrics.singleMoveFt) {
          badgeColor = '#fbbf24';
        } else if (movedFt > 10) {
          badgeColor = '#38bdf8';
        }

        ctx.fillStyle = 'rgba(13, 17, 26, 0.95)';
        ctx.beginPath();
        ctx.roundRect(ex - 44, ey - gs * 0.65, 88, 20, 6);
        ctx.fill();
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.5 / uiState.camZoom;
        ctx.stroke();

        ctx.fillStyle = badgeColor;
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, ex, ey - gs * 0.65 + 10);
        ctx.restore();
      }
    }
  };

  drawGmTacticalOverlays();

  // 4. Map Objects & Props
  (scene.mapObjects || []).forEach(obj => {
    if (IS_PLAYER_WINDOW && obj.hiddenFromPlayers) return;
    const ox = (obj.gx + 0.5) * gs;
    const oy = (obj.gy + 0.5) * gs;
    if (IS_PLAYER_WINDOW && !isPointSeenInLightOrSight(ox, oy, scene, gs, crawlerVisList, blockingWalls)) return;

    ctx.save();
    if (obj.hiddenFromPlayers) ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = obj.color || '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(obj.gx * gs + 6, obj.gy * gs + 6, gs - 12, gs - 12, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `${Math.round(gs * 0.44)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(obj.iconSymbol || '📦', ox, oy);
    ctx.restore();
  });
  // 6. Tokens (Crawlers & Mobs — supports 1x1 to 4x4 centered footprints & Swarm Pack counts)
  (scene.tokens || []).forEach(tok => {
    if (IS_PLAYER_WINDOW && tok.role === 'mob' && tok.hiddenFromPlayers) return;
    const span = Math.max(1, Math.min(4, Number(tok.gridSpan) || 1));
    const vis = getTokenVisualGridPos(tok, nowMs);
    const drawGx = vis.gx;
    const drawGy = vis.gy;
    const cx = (drawGx + 0.5) * gs;
    const cy = (drawGy + 0.5) * gs;
    drawTokenMotionTrail(ctx, tok, vis.anim, gs, nowMs);

    if (IS_PLAYER_WINDOW && tok.role === 'mob' && !isPointSeenInLightOrSight(cx, cy, scene, gs, crawlerVisList, blockingWalls)) {
      return;
    }

    const r = gs * span * 0.4;
    const isSelected = uiState.selectedTokenId === tok.id;
    const hm = getTokenHealthMetrics(tok);

    ctx.save();
    if (tok.hiddenFromPlayers) ctx.globalAlpha = 0.52;

    if (span > 1) {
      const halfSpanPx = gs * span * 0.5;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(cx - halfSpanPx + 2, cy - halfSpanPx + 2, gs * span - 4, gs * span - 4);
      ctx.setLineDash([]);
    }

    if (isSelected) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r + 5, (r + 5) * TOKEN_PUCK_TILT_Y, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    drawTokenArtwork(ctx, tok, cx, cy, r, span, gs, nowMs);

    // Swarm / Pack count badge (e.g., ×4)
    if (tok.role !== 'crawler' && hm.swarmCount > 1) {
      const badgeTxt = `×${hm.aliveUnits}`;
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      const bw = ctx.measureText(badgeTxt).width + 8;
      const bx = cx + r * 0.65 - bw / 2;
      const by = cy - r * 0.78 - 7;
      ctx.fillStyle = '#be123c';
      ctx.strokeStyle = '#fecdd3';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 15, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(badgeTxt, bx + bw / 2, by + 7.5);
    }

    ctx.restore();
  });

  // 7. Walls & Doors (GM sees all; Player Display only sees Doors within light/vision, never Wall lines)
  (scene.walls || []).forEach(wall => {
    if (IS_PLAYER_WINDOW) {
      if (wall.kind !== 'door') return;
      const midX = (wall.x1 + wall.x2) / 2;
      const midY = (wall.y1 + wall.y2) / 2;
      const doorVisible =
        isPointSeenInLightOrSight(midX, midY, scene, gs, crawlerVisList, blockingWalls) ||
        isPointSeenInLightOrSight(wall.x1, wall.y1, scene, gs, crawlerVisList, blockingWalls) ||
        isPointSeenInLightOrSight(wall.x2, wall.y2, scene, gs, crawlerVisList, blockingWalls);
      if (!doorVisible) return;
    }
    ctx.save();
    if (wall.kind === 'door') {
      ctx.strokeStyle = wall.open ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 5;
      if (wall.open) ctx.setLineDash([6, 6]);
    } else {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
    }
    ctx.beginPath();
    ctx.moveTo(wall.x1, wall.y1);
    ctx.lineTo(wall.x2, wall.y2);
    ctx.stroke();
    ctx.restore();
  });

  if (!IS_PLAYER_WINDOW && uiState.isDrawingWall && uiState.wallStartPt && uiState.wallPreviewPt) {
    ctx.save();
    ctx.strokeStyle = uiState.wallDrawKind === 'door' ? '#f59e0b' : '#22d3ee';
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(uiState.wallStartPt.x, uiState.wallStartPt.y);
    ctx.lineTo(uiState.wallPreviewPt.x, uiState.wallPreviewPt.y);
    ctx.stroke();
    ctx.restore();
  }

  // 8. Dropped Torches / Light Icons (GM View Only — Hidden from Player Display)
  if (!IS_PLAYER_WINDOW) {
    (scene.droppedLights || []).forEach(lt => {
      const pos = getDroppedLightWorldPos(lt, gs);
      ctx.save();
      if (uiState.selectedLightId === lt.id) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.wx, pos.wy, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔥', pos.wx, pos.wy);
      ctx.restore();
    });
  }

  // 9. Ruler Measurement Line
  if (uiState.measureStart && uiState.measureEnd) {
    const dx = uiState.measureEnd.wx - uiState.measureStart.wx;
    const dy = uiState.measureEnd.wy - uiState.measureStart.wy;
    const distFt = Math.round((Math.hypot(dx, dy) / gs) * 5);
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(uiState.measureStart.wx, uiState.measureStart.wy);
    ctx.lineTo(uiState.measureEnd.wx, uiState.measureEnd.wy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect((uiState.measureStart.wx + uiState.measureEnd.wx) / 2 - 24, (uiState.measureStart.wy + uiState.measureEnd.wy) / 2 - 10, 48, 20);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${distFt} ft`, (uiState.measureStart.wx + uiState.measureEnd.wx) / 2, (uiState.measureStart.wy + uiState.measureEnd.wy) / 2);
    ctx.restore();
  }

  ctx.restore();

  // 10. Dynamic Darkness & Raycast Lighting Overlay
  const lightSources = [];
  scene.tokens.forEach((t, idx) => {
    if (IS_PLAYER_WINDOW && t.role === 'mob' && t.hiddenFromPlayers) return;
    const effLightFt = getEffectiveTokenLightRadiusFt(t);
    if (effLightFt > 0) {
      const visL = getTokenVisualGridPos(t, nowMs);
      const gx = (t.role === 'crawler' && uiState.isDraggingToken && uiState.draggedTokenId === t.id) ? t.gx : visL.gx;
      const gy = (t.role === 'crawler' && uiState.isDraggingToken && uiState.draggedTokenId === t.id) ? t.gy : visL.gy;
      const lwx = (gx + 0.5) * gs;
      const lwy = (gy + 0.5) * gs;
      const anim = getLightAnimationFactors(resolveLightEffectMode(t), now, idx + 1);
      lightSources.push({
        wx: lwx,
        wy: lwy,
        radiusFt: effLightFt * anim.radiusMult,
        color: t.lightColor || '#fbbf24',
        dimOnly: Boolean(t.lightDimOnly),
        angleDeg: t.lightAngleDeg || 360,
        facingDeg: t.lightFacingDeg || 0,
        maxReachFt: t.lightMaxReachFt || 0,
        alphaMult: anim.alphaMult
      });
    }
  });

  (scene.mapObjects || []).forEach((obj, idx) => {
    if (IS_PLAYER_WINDOW && obj.hiddenFromPlayers) return;
    if ((obj.lightRadiusFt || 0) > 0) {
      lightSources.push({
        wx: (obj.gx + 0.5) * gs,
        wy: (obj.gy + 0.5) * gs,
        radiusFt: obj.lightRadiusFt,
        color: obj.color || '#34d399',
        dimOnly: false,
        angleDeg: 360,
        facingDeg: 0,
        maxReachFt: 0,
        alphaMult: 1
      });
    }
  });

  (scene.droppedLights || []).forEach((lt, idx) => {
    const pos = getDroppedLightWorldPos(lt, gs);
    const anim = getLightAnimationFactors(resolveLightEffectMode(lt), now, idx + 20);
    lightSources.push({
      wx: pos.wx,
      wy: pos.wy,
      radiusFt: (lt.radiusFt || 25) * anim.radiusMult,
      color: lt.color || '#f97316',
      dimOnly: Boolean(lt.dimOnly),
      angleDeg: lt.angleDeg || 360,
      facingDeg: lt.facingDeg || 0,
      maxReachFt: lt.maxReachFt || 0,
      alphaMult: anim.alphaMult
    });
  });

  const darknessAlpha = Math.max(0, Math.min(1, scene.ambientDarkness ?? 0.45));
  if (darknessAlpha > 0.01) {
    darknessCtx.save();
    darknessCtx.globalCompositeOperation = 'source-over';
    darknessCtx.clearRect(0, 0, w, h);
    darknessCtx.fillStyle = `rgba(4, 6, 12, ${darknessAlpha})`;
    darknessCtx.fillRect(0, 0, w, h);

    darknessCtx.globalCompositeOperation = 'destination-out';
    lightSources.forEach(src => {
      const unclippedFt = src.dimOnly ? src.radiusFt : src.radiusFt * 2;
      const effMaxFt = (src.maxReachFt && src.maxReachFt > 0) ? Math.min(unclippedFt, src.maxReachFt) : unclippedFt;
      const maxPx = (effMaxFt / 5) * gs;
      if (IS_PLAYER_WINDOW && !isLightVisibleToCrawlers(src.wx, src.wy, maxPx, crawlerVisList, blockingWalls, src.angleDeg, src.facingDeg)) return;

      const sx = src.wx * uiState.camZoom + uiState.camX;
      const sy = src.wy * uiState.camZoom + uiState.camY;
      const sr = maxPx * uiState.camZoom;
      const poly = computeVisibilityPolygon(src.wx, src.wy, maxPx, blockingWalls, src.angleDeg, src.facingDeg);
      const screenPoly = poly.map(p => ({ x: p.x * uiState.camZoom + uiState.camX, y: p.y * uiState.camZoom + uiState.camY }));

      const grad = darknessCtx.createRadialGradient(sx, sy, sr * 0.1, sx, sy, sr);
      grad.addColorStop(0, `rgba(0, 0, 0, ${src.dimOnly ? 0.55 : 1})`);
      grad.addColorStop(0.55, `rgba(0, 0, 0, ${src.dimOnly ? 0.3 : 0.72})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      darknessCtx.fillStyle = grad;
      traceRayPolygonPath(darknessCtx, sx, sy, screenPoly, src.angleDeg >= 359.5);
      darknessCtx.fill();
    });
    darknessCtx.restore();
    ctx.drawImage(darknessCanvas, 0, 0);
  }

  // Colored Light Pools & Cast Tint Overlay (for dropped lights, tokens, and lit map objects)
  if (lightSources.length > 0) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    lightSources.forEach(src => {
      const unclippedFt = src.dimOnly ? src.radiusFt : src.radiusFt * 2;
      const effMaxFt = (src.maxReachFt && src.maxReachFt > 0) ? Math.min(unclippedFt, src.maxReachFt) : unclippedFt;
      const maxPx = (effMaxFt / 5) * gs;
      if (IS_PLAYER_WINDOW && !isLightVisibleToCrawlers(src.wx, src.wy, maxPx, crawlerVisList, blockingWalls, src.angleDeg, src.facingDeg)) return;

      const sx = src.wx * uiState.camZoom + uiState.camX;
      const sy = src.wy * uiState.camZoom + uiState.camY;
      const sr = maxPx * uiState.camZoom;
      const poly = computeVisibilityPolygon(src.wx, src.wy, maxPx, blockingWalls, src.angleDeg, src.facingDeg);
      const screenPoly = poly.map(p => ({ x: p.x * uiState.camZoom + uiState.camX, y: p.y * uiState.camZoom + uiState.camY }));
      const aScale = Math.max(0.2, Math.min(1.3, Number(src.alphaMult ?? 1))) * (0.22 + darknessAlpha * 0.24);
      const col = src.color || '#f97316';

      const grad = ctx.createRadialGradient(sx, sy, sr * 0.04, sx, sy, sr);
      grad.addColorStop(0, hexToRgba(col, Math.min(0.65, (src.dimOnly ? 0.24 : 0.42) * aScale)));
      grad.addColorStop(0.55, hexToRgba(col, Math.min(0.42, (src.dimOnly ? 0.12 : 0.22) * aScale)));
      grad.addColorStop(1, hexToRgba(col, 0));
      ctx.fillStyle = grad;
      traceRayPolygonPath(ctx, sx, sy, screenPoly, src.angleDeg >= 359.5);
      ctx.fill();
    });
    ctx.restore();
  }

  // 10b. GM Screen Overlay: Keep Tactical Grid, Movement Rings, Tokens, Objects, Light Markers & Walls Crisp Above Darkness
  if (!IS_PLAYER_WINDOW) {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(uiState.camX, uiState.camY);
    ctx.scale(uiState.camZoom, uiState.camZoom);

    drawTacticalGridLines(ctx, scene, gs, minWorldX, minWorldY, maxWorldX, maxWorldY, true);
    drawGmTacticalOverlays();

    // Walls & Doors visible to GM even in 100% darkness
    (scene.walls || []).forEach(wall => {
      ctx.save();
      if (wall.kind === 'door') {
        ctx.strokeStyle = wall.open ? '#10b981' : '#f59e0b';
        ctx.lineWidth = 4;
        if (wall.open) ctx.setLineDash([6, 6]);
      } else {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
        ctx.lineWidth = 3;
      }
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.restore();
    });

    // Map Objects & Props visible to GM in darkness
    (scene.mapObjects || []).forEach(obj => {
      const ox = (obj.gx + 0.5) * gs;
      const oy = (obj.gy + 0.5) * gs;
      ctx.save();
      if (obj.hiddenFromPlayers) ctx.globalAlpha = 0.65;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = obj.color || '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(obj.gx * gs + 6, obj.gy * gs + 6, gs - 12, gs - 12, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = `${Math.round(gs * 0.44)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(obj.iconSymbol || '📦', ox, oy);
      ctx.restore();
    });

    // Dropped Light Icons visible to GM in darkness
    (scene.droppedLights || []).forEach(lt => {
      const pos = getDroppedLightWorldPos(lt, gs);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = uiState.selectedLightId === lt.id ? '#fbbf24' : (lt.color || '#f97316');
      ctx.lineWidth = uiState.selectedLightId === lt.id ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(pos.wx, pos.wy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔥', pos.wx, pos.wy);
      ctx.restore();
    });

    // Crawler & Mob Tokens visible to GM even in 100% darkness
    (scene.tokens || []).forEach(tok => {
      const span = Math.max(1, Math.min(4, Number(tok.gridSpan) || 1));
      const vis = getTokenVisualGridPos(tok, nowMs);
      const drawGx = vis.gx;
      const drawGy = vis.gy;
      const cx = (drawGx + 0.5) * gs;
      const cy = (drawGy + 0.5) * gs;
      drawTokenMotionTrail(ctx, tok, vis.anim, gs, nowMs);
      const r = gs * span * 0.4;
      const isSelected = uiState.selectedTokenId === tok.id;
      const hm = getTokenHealthMetrics(tok);

      ctx.save();
      if (tok.hiddenFromPlayers) ctx.globalAlpha = 0.65;

      if (span > 1) {
        const halfSpanPx = gs * span * 0.5;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(cx - halfSpanPx + 2, cy - halfSpanPx + 2, gs * span - 4, gs * span - 4);
        ctx.setLineDash([]);
      }

      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r + 5, (r + 5) * TOKEN_PUCK_TILT_Y, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      drawTokenArtwork(ctx, tok, cx, cy, r, span, gs, nowMs);

      if (tok.role !== 'crawler' && hm.swarmCount > 1) {
        const badgeTxt = `×${hm.aliveUnits}`;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        const bw = ctx.measureText(badgeTxt).width + 8;
        const bx = cx + r * 0.65 - bw / 2;
        const by = cy - r * 0.78 - 7;
        ctx.fillStyle = '#be123c';
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 15, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(badgeTxt, bx + bw / 2, by + 7.5);
      }

      ctx.restore();
    });

    if (!IS_PLAYER_WINDOW && uiState.canvasTool === 'floor' && typeof uiState.hoverGx === 'number' && typeof uiState.hoverGy === 'number') {
      const bMode = uiState.floorBrushMode || 'raise5';
      const hx = uiState.hoverGx * gs;
      const hy = uiState.hoverGy * gs;
      ctx.save();
      ctx.fillStyle = bMode === 'raise5' ? 'rgba(34, 211, 238, 0.16)' : bMode === 'lower5' ? 'rgba(251, 191, 36, 0.16)' : 'rgba(148, 163, 184, 0.14)';
      ctx.strokeStyle = bMode === 'raise5' ? '#22d3ee' : bMode === 'lower5' ? '#fbbf24' : '#cbd5e1';
      ctx.lineWidth = 2 / uiState.camZoom;
      ctx.setLineDash([4 / uiState.camZoom, 3 / uiState.camZoom]);
      ctx.fillRect(hx + 1, hy + 1, gs - 2, gs - 2);
      ctx.strokeRect(hx + 1, hy + 1, gs - 2, gs - 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // 11. Player Fog of War (Darkened Explored Memory + Tangible Drifting Smoke in Unexplored & Edge of Vision)
  if (IS_PLAYER_WINDOW && crawlerVisList.length > 0) {
    const isMinimapOffline = Boolean(appState?.minimapOffline);
    const camKey = `${uiState.camX.toFixed(1)}|${uiState.camY.toFixed(1)}|${uiState.camZoom.toFixed(3)}|${isMinimapOffline ? 1 : 0}`;
    if (exploredMemDirty || camKey !== lastExploredCameraKey) {
      rebuildExploredMemoryBuffer(scene, gs, blockingWalls, w, h);
    }
    const nowMs = timestamp || performance.now();

    // PASS 1: Explored-but-unseen darkened shroud (clean darkened map memory when Minimap is Online)
    if (!isMinimapOffline) {
      fowCtx.save();
      fowCtx.globalCompositeOperation = 'source-over';
      fowCtx.clearRect(0, 0, w, h);
      fowCtx.fillStyle = 'rgba(4, 7, 16, 0.62)';
      fowCtx.fillRect(0, 0, w, h);
      carveLiveVisionMask(fowCtx, crawlerVisList, lightSources, gs, blockingWalls, darknessAlpha, 0.72);
      fowCtx.restore();
      ctx.drawImage(fowCanvas, 0, 0);
    }

    // PASS 2: Tangible rolling smoke/mist for Unexplored Fog of War (or everything outside vision if Minimap Offline)
    fowCtx.save();
    fowCtx.globalCompositeOperation = 'source-over';
    fowCtx.clearRect(0, 0, w, h);
    fowCtx.fillStyle = 'rgba(4, 7, 15, 0.95)';
    fowCtx.fillRect(0, 0, w, h);
    drawScrollingSmokeFill(fowCtx, w, h, nowMs, uiState.camZoom, uiState.camX, uiState.camY);

    // Clip smoke to unexplored territory (when Minimap is Online)
    if (!isMinimapOffline) {
      fowCtx.globalCompositeOperation = 'destination-in';
      fowCtx.drawImage(exploredMemCanvas, 0, 0);
    }

    // Carve live vision out of the smoke with a soft feathered edge so smoke curls at the edge of vision
    carveLiveVisionMask(fowCtx, crawlerVisList, lightSources, gs, blockingWalls, darknessAlpha, 0.62);
    fowCtx.restore();
    ctx.drawImage(fowCanvas, 0, 0);

    // PASS 3: Wispy smoke fringe curling gently along the outer edge of live vision (tangible mist border)
    fowCtx.save();
    fowCtx.globalCompositeOperation = 'source-over';
    fowCtx.clearRect(0, 0, w, h);
    fowCtx.globalAlpha = 0.34;
    drawScrollingSmokeFill(fowCtx, w, h, nowMs * 1.15 + 9000, uiState.camZoom, uiState.camX, uiState.camY);
    fowCtx.globalAlpha = 1;
    // Keep only a soft ring around each crawler's vision perimeter
    fowCtx.globalCompositeOperation = 'destination-in';
    crawlerVisList.forEach(cv => {
      const sx = cv.ox * uiState.camZoom + uiState.camX;
      const sy = cv.oy * uiState.camZoom + uiState.camY;
      const baseR = (darknessAlpha >= 0.85 ? cv.radiusPx : Math.min(cv.radiusPx * 1.45, cv.losRadiusPx)) * uiState.camZoom;
      const outerR = baseR * 1.24;
      const ringGrad = fowCtx.createRadialGradient(sx, sy, baseR * 0.68, sx, sy, outerR);
      ringGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      ringGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.85)');
      ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      fowCtx.fillStyle = ringGrad;
      fowCtx.beginPath();
      fowCtx.arc(sx, sy, outerR, 0, Math.PI * 2);
      fowCtx.fill();
    });
    // Ensure live interior stays crystal clear
    carveLiveVisionMask(fowCtx, crawlerVisList, lightSources, gs, blockingWalls, darknessAlpha, 0.72);
    fowCtx.restore();
    ctx.drawImage(fowCanvas, 0, 0);
  }

  // 11b. DCC HUD Minimap Detection Blips (Red Dots for Detected Mobs, Blue Dots / Blue X for Crawlers)
  if (IS_PLAYER_WINDOW && !appState?.minimapOffline && typeof isMobDetectedOnMinimap === 'function') {
    const detProfile = getPartyMinimapDetectionProfile(scene);
    const pulseWave = (now % 1.8) / 1.8;
    const dotPulse = 0.86 + Math.sin(now * 4.2) * 0.14;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(uiState.camX, uiState.camY);
    ctx.scale(uiState.camZoom, uiState.camZoom);

    (scene.tokens || []).forEach(tok => {
      const vis = getTokenVisualGridPos(tok, nowMs);
      const cx = (vis.gx + 0.5) * gs;
      const cy = (vis.gy + 0.5) * gs;
      const inLiveLos = isPointSeenInLightOrSight(cx, cy, scene, gs, crawlerVisList, blockingWalls);

      if (tok.role === 'mob') {
        if (inLiveLos) return;
        const det = isMobDetectedOnMinimap(tok, scene);
        if (!det.detected) return;

        const baseR = Math.max(6.5, gs * 0.16) * (det.showSizeAndKnown ? det.dotScale : 1);
        const pingR = baseR * (1.2 + pulseWave * 1.9);

        // Expanding radar ping ring
        ctx.strokeStyle = `rgba(244, 63, 94, ${(1 - pulseWave) * 0.72})`;
        ctx.lineWidth = 2 / uiState.camZoom;
        ctx.beginPath();
        ctx.arc(cx, cy, pingR, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing crimson core dot
        const g = ctx.createRadialGradient(cx, cy, baseR * 0.15, cx, cy, baseR * 1.65);
        g.addColorStop(0, `rgba(255, 228, 230, ${0.95 * dotPulse})`);
        g.addColorStop(0.45, `rgba(239, 68, 68, ${0.95 * dotPulse})`);
        g.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 1.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#fecdd3';
        ctx.lineWidth = 1.6 / uiState.camZoom;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Acute Ears Rank 5+: Size & Known/Unknown tag beneath red dot
        if (det.showSizeAndKnown) {
          const tag = `${det.sizeLabel} • ${det.known ? 'Known' : 'Unknown'}`;
          ctx.font = 'bold 9.5px JetBrains Mono, monospace';
          const tw = ctx.measureText(tag).width + 8;
          const ty = cy + baseR + 9;
          ctx.fillStyle = 'rgba(7, 9, 14, 0.88)';
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
          ctx.lineWidth = 1 / uiState.camZoom;
          ctx.beginPath();
          ctx.roundRect(cx - tw / 2, ty - 7, tw, 14, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fecdd3';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tag, cx, ty);
        }
      } else if (tok.role === 'crawler') {
        const hm = getTokenHealthMetrics(tok);
        if (hm.curHp <= 0) {
          // Dead Crawler: Blue X marker on minimap (even through smoke/walls)
          const xr = Math.max(7, gs * 0.19);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3 / uiState.camZoom;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx - xr, cy - xr);
          ctx.lineTo(cx + xr, cy + xr);
          ctx.moveTo(cx + xr, cy - xr);
          ctx.lineTo(cx - xr, cy + xr);
          ctx.stroke();
        } else if (!inLiveLos) {
          // Out-of-LOS Crawler / Ally: Blue Dot on minimap
          const br = Math.max(6, gs * 0.15);
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 1.6 / uiState.camZoom;
          ctx.beginPath();
          ctx.arc(cx, cy, br, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          if (detProfile.hasFindCrawler) {
            const cTag = tok.name || 'Crawler';
            ctx.font = 'bold 9.5px JetBrains Mono, monospace';
            const tw = ctx.measureText(cTag).width + 8;
            const ty = cy + br + 9;
            ctx.fillStyle = 'rgba(7, 9, 14, 0.88)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.lineWidth = 1 / uiState.camZoom;
            ctx.beginPath();
            ctx.roundRect(cx - tw / 2, ty - 7, tw, 14, 4);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#bae6fd';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cTag, cx, ty);
          }
        }
      }
    });

    ctx.restore();
  }

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(uiState.camX, uiState.camY);
  ctx.scale(uiState.camZoom, uiState.camZoom);
  renderActiveVfxLayer(ctx, scene, gs, timestamp || performance.now());
  ctx.restore();

  requestAnimationFrame(renderBattleCanvas);
}

// =========================================================================
// 6. CANVAS POINTER & CAMERA INTERACTION HANDLERS
// =========================================================================
canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
  const nextZoom = Math.max(0.3, Math.min(3.0, uiState.camZoom * zoomFactor));
  uiState.camX = mx - (mx - uiState.camX) * (nextZoom / uiState.camZoom);
  uiState.camY = my - (my - uiState.camY) * (nextZoom / uiState.camZoom);
  uiState.camZoom = nextZoom;
  exploredMemDirty = true;
}, { passive: false });

canvas.addEventListener('pointerdown', e => {
  const scene = getActiveScene();
  if (!scene) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
  const { wx, wy } = screenToWorld(e.clientX, e.clientY);
  const { gx, gy } = worldToGrid(wx, wy);
  uiState.hoverGx = gx;
  uiState.hoverGy = gy;

  if (!IS_PLAYER_WINDOW && uiState.canvasTool === 'floor') {
    if (e.button === 2) {
      adjustFloorAtGrid(gx, gy, -5, false);
      return;
    }
    if (e.button === 0) {
      applyFloorBrushAtGrid(gx, gy, e);
      return;
    }
  }

  if (e.button === 2) {
    if (!IS_PLAYER_WINDOW && uiState.canvasTool === 'wall') {
      const hitWall = findWallSegmentAtWorld(wx, wy, 14 / uiState.camZoom);
      if (hitWall) {
        scene.walls = (scene.walls || []).filter(w => w.id !== hitWall.id);
        visPolyCache.clear();
        commitStateChange();
        showVttToast('🧱 Removed wall/door segment');
        return;
      }
    }
    uiState.isPanning = true;
    uiState.panStartX = e.clientX - uiState.camX;
    uiState.panStartY = e.clientY - uiState.camY;
    uiState.panDownClientX = e.clientX;
    uiState.panDownClientY = e.clientY;
    return;
  }

  if (!IS_PLAYER_WINDOW && uiState.canvasTool === 'wall') {
    const hitDoor = findWallSegmentAtWorld(wx, wy, 12 / uiState.camZoom);
    if (hitDoor && hitDoor.kind === 'door' && !e.shiftKey) {
      hitDoor.open = !hitDoor.open;
      visPolyCache.clear();
      commitStateChange();
      showVttToast(hitDoor.open ? '🚪 Door Opened' : '🚪 Door Closed');
      return;
    }
    const snapped = snapPointIfNeeded(wx, wy, gs);
    uiState.isDrawingWall = true;
    uiState.wallStartPt = snapped;
    uiState.wallPreviewPt = snapped;
    return;
  }

  if (!IS_PLAYER_WINDOW && uiState.canvasTool === 'dropLight') {
    const existingLight = findDroppedLightAtWorld(wx, wy, gs);
    if (existingLight) {
      uiState.selectedLightId = existingLight.id;
      uiState.isDraggingLight = true;
      uiState.draggedLightId = existingLight.id;
      const pop = document.getElementById('gridCalibratorPopover');
      if (pop) pop.classList.remove('hidden');
      syncLightCalibratorControls();
      return;
    }
    const newLight = {
      id: 'lt_' + Date.now(),
      wx,
      wy,
      gx,
      gy,
      radiusFt: uiState.lightBrush.radiusFt || 25,
      color: uiState.lightBrush.color || '#f97316',
      lightEffect: uiState.lightBrush.lightEffect || 'flicker',
      flicker: (uiState.lightBrush.lightEffect || 'flicker') !== 'steady',
      dimOnly: Boolean(uiState.lightBrush.dimOnly),
      angleDeg: uiState.lightBrush.angleDeg || 360,
      facingDeg: uiState.lightBrush.facingDeg || 0,
      maxReachFt: uiState.lightBrush.maxReachFt || ((uiState.lightBrush.dimOnly ? 1 : 2) * (uiState.lightBrush.radiusFt || 25))
    };
    scene.droppedLights = scene.droppedLights || [];
    scene.droppedLights.push(newLight);
    uiState.selectedLightId = newLight.id;
    const pop = document.getElementById('gridCalibratorPopover');
    if (pop) pop.classList.remove('hidden');
    syncLightCalibratorControls();
    commitStateChange();
    showVttToast('🔥 Dropped light source');
    return;
  }

  if (uiState.canvasTool === 'measure') {
    uiState.measureStart = { wx, wy };
    uiState.measureEnd = { wx, wy };
    return;
  }

  // Select / Move Tool
  const hitTok = findTokenAtWorldOrGrid(wx, wy, gx, gy, gs);
  if (hitTok) {
    uiState.selectedTokenId = hitTok.id;
    const pPerm = (IS_PLAYER_WINDOW && hitTok.role === 'crawler') ? getCrawlerPhasePermissions(hitTok) : { locked: false };
    const canDragThisToken = !IS_PLAYER_WINDOW || (hitTok.role === 'crawler' && hitTok.id === uiState.claimedCrawlerId && !pPerm.locked);
    if (IS_PLAYER_WINDOW && hitTok.role === 'crawler' && hitTok.id === uiState.claimedCrawlerId && pPerm.locked) {
      showVttToast(pPerm.bannerText || '🔒 Wait for Step 2 (React) or Step 4 (Crawler Action) to move!');
    }
    if (canDragThisToken) {
      uiState.isDraggingToken = true;
      uiState.draggedTokenId = hitTok.id;
      uiState.dragStartGx = hitTok.gx;
      uiState.dragStartGy = hitTok.gy;
      uiState.dragPreviewGx = hitTok.gx;
      uiState.dragPreviewGy = hitTok.gy;
    } else if (IS_PLAYER_WINDOW && hitTok.role === 'crawler' && !uiState.claimedCrawlerId) {
      showVttToast('🎭 Click "Claim Crawler" in the top bar to control a character.');
    }
    renderAllUI();
    return;
  }

  if (!IS_PLAYER_WINDOW) {
    const hitObj = findObjectAtWorldOrGrid(wx, wy, gx, gy, gs);
    if (hitObj) {
      uiState.isDraggingObject = true;
      uiState.draggedObjectId = hitObj.id;
      return;
    }
    const hitLight = findDroppedLightAtWorld(wx, wy, gs);
    if (hitLight) {
      uiState.selectedLightId = hitLight.id;
      uiState.isDraggingLight = true;
      uiState.draggedLightId = hitLight.id;
      const pop = document.getElementById('gridCalibratorPopover');
      if (pop) pop.classList.remove('hidden');
      syncLightCalibratorControls();
      return;
    }
  }

  uiState.isPanning = true;
  uiState.panStartX = e.clientX - uiState.camX;
  uiState.panStartY = e.clientY - uiState.camY;
  uiState.panDownClientX = e.clientX;
  uiState.panDownClientY = e.clientY;
});

function escapeHtmlAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function lookupEffectCatalogDetails(kind, rawLabel) {
  const label = String(rawLabel || '').trim();
  const stripped = label.replace(/^\[(?:Passive|Aura)\]\s*/i, '').trim();
  const baseNoParen = stripped.replace(/\s*\([^)]*\)\s*/g, '').trim();

  if (kind === 'buff') {
    const buffs = appState?.buffs || [];
    const match = buffs.find(b => String(b.name || '').trim().toLowerCase() === stripped.toLowerCase()) ||
                  buffs.find(b => String(b.name || '').replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase() === baseNoParen.toLowerCase()) ||
                  buffs.find(b => stripped.toLowerCase().startsWith(String(b.name || '').replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase()));
    if (match) {
      return {
        title: stripped,
        kindLabel: /^\[Passive\]\s*/i.test(label) ? 'Passive Buff' : 'Active Buff',
        duration: match.duration || 'Active',
        category: match.category || '',
        color: match.color || '#10b981',
        description: match.description || 'Active beneficial effect.'
      };
    }
    const spMatch = (appState?.spells || []).find(sp => String(sp.name || '').trim().toLowerCase() === baseNoParen.toLowerCase());
    if (spMatch) {
      return {
        title: stripped,
        kindLabel: 'Active Spell Aura',
        duration: 'While inside Aura Radius',
        category: spMatch.tags || 'Aura',
        color: '#38bdf8',
        description: spMatch.description || spMatch.rank1Effect || 'Active proximity spell aura.'
      };
    }
    const sk = (appState?.skills || []).find(s => String(s.name || '').trim().toLowerCase() === baseNoParen.toLowerCase());
    if (sk) {
      return {
        title: stripped,
        kindLabel: 'Passive Skill Buff',
        duration: 'Passive (Always Active)',
        category: sk.tags || 'Passive',
        color: '#10b981',
        description: sk.description || sk.rank1Effect || 'Passive skill bonus.'
      };
    }
    return {
      title: stripped,
      kindLabel: 'Active Buff',
      duration: 'Until Cleansed / Expired',
      category: '',
      color: '#10b981',
      description: 'Custom active buff applied to this unit.'
    };
  } else {
    const debuffs = appState?.debuffs || [];
    const match = debuffs.find(d => String(d.name || '').trim().toLowerCase() === stripped.toLowerCase()) ||
                  debuffs.find(d => String(d.name || '').replace(/\s*\([^)]*\)\s*/g, '').trim().toLowerCase() === baseNoParen.toLowerCase());
    if (match) {
      return {
        title: stripped,
        kindLabel: 'Active Debuff',
        duration: match.duration || 'Until Cleansed',
        category: match.category || '',
        color: match.color || '#ef4444',
        description: match.description || 'Active negative condition.'
      };
    }
    return {
      title: stripped,
      kindLabel: 'Active Debuff',
      duration: 'Until Cleansed / Expired',
      category: '',
      color: '#ef4444',
      description: 'Custom debuff or condition affecting this unit.'
    };
  }
}

function lookupAbilityHoverDetails(kind, rawIdOrName, rank = 1, casterId = '') {
  const r = Math.max(1, Math.min(15, Number(rank) || 1));
  const scene = getActiveScene();
  const caster = casterId ? (scene?.tokens || []).find(t => t.id === casterId) : null;

  if (kind === 'attack') {
    const atk = caster ? getEffectiveTokenAttacks(caster).find(a => a.name === rawIdOrName) : null;
    const flatHit = atk ? getFlatNumericDc(atk.hitBonus, 12) : null;
    return {
      title: atk?.name || rawIdOrName,
      badge: caster?.role === 'crawler' ? 'Weapon / Attack' : 'Monster Attack',
      accent: 'amber',
      color: '#f59e0b',
      stats: [
        atk?.rangeFt ? `📏 Range: ${atk.rangeFt}ft` : '',
        flatHit !== null && caster?.role !== 'crawler' ? `🎯 Flat Hit: ${flatHit}` : (atk?.hitBonus ? `🎯 Hit: ${atk.hitBonus}` : ''),
        atk?.damage ? `💥 Effect: ${atk.damage}` : '',
        atk ? (doesMobAttackIgnoreLos(atk) ? '👁️ Ignores LOS' : '🧱 Requires LOS') : ''
      ].filter(Boolean),
      quote: '',
      description: atk?.special || 'Standard combat attack.',
      upgrades: [],
      limitations: ''
    };
  }

  const catalog = kind === 'skill' ? (appState?.skills || []) : (appState?.spells || []);
  const entry = catalog.find(e => e.id === rawIdOrName) ||
                catalog.find(e => String(e.name || '').trim().toLowerCase() === String(rawIdOrName || '').trim().toLowerCase());
  if (!entry) {
    return {
      title: rawIdOrName,
      badge: kind === 'skill' ? 'Skill' : 'Spell',
      accent: kind === 'skill' ? 'amber' : 'indigo',
      color: kind === 'skill' ? '#f59e0b' : '#818cf8',
      stats: [],
      quote: '',
      description: 'No catalog details found.',
      upgrades: [],
      limitations: ''
    };
  }

  const info = analyzeAbilityEffects(caster, kind, entry.id, r);
  const hitModInfo = caster ? getCrawlerAbilityAttackMod(caster, info) : null;
  const stats = [];
  if (info.manaCost > 0) stats.push(`💧 Cost: ${info.manaCost} MP`);
  stats.push(`📏 Range: ${info.isSelfOnly ? 'Self' : (entry.range || `${info.rangeFt}ft`)}`);
  if (info.isAttack && hitModInfo) {
    stats.push(`🎯 Hit Roll: d20 +${hitModInfo.mod} (${hitModInfo.statKey})`);
  } else if (info.isAttack) {
    const tagStat = (entry.tags || '').match(/\b(Str|Int|Con|Dex|Cha|Charisma|Strength|Intelligence|Dexterity|Constitution)\b/i);
    if (tagStat) stats.push(`🎯 Check: ${tagStat[1]}`);
  }
  if (entry.baseDamage) {
    const shortDmg = entry.baseDamage.length > 48 ? entry.baseDamage.slice(0, 45) + '…' : entry.baseDamage;
    stats.push(`💥 Effect: ${shortDmg}`);
  }
  if (entry.cooldown) stats.push(`⏱️ CD: ${entry.cooldown}`);
  if (entry.aiFavor) stats.push(`⭐ AI Favor: ${entry.aiFavor}`);
  stats.push(info.ignoreLos ? '👁️ Ignores LOS' : '🧱 Requires LOS');

  const vfx = inferVfxFromAbility(entry, info);
  const vfxPreset = VFX_PRESET_LIBRARY.find(x => x.id === vfx.vfxType);
  if (vfxPreset) stats.push(`✨ VFX: ${vfxPreset.label.replace(/^[^\s]+\s*/, '')}`);

  const allUpgrades = (entry.upgrades || []).map(u => {
    const m = String(u).match(/^Rank\s+(\d+)/i);
    const reqRank = m ? parseInt(m[1], 10) : 1;
    return { text: u, unlocked: r >= reqRank };
  });

  return {
    title: `${entry.name}${casterId ? ` (Rank ${r})` : ''}`,
    badge: kind === 'skill' ? ((entry.skillGroup || 'utility') === 'attack' ? '⚔️ Attack Skill' : '🛠️ Utility Skill') : '✨ Spell',
    accent: kind === 'skill' ? 'amber' : 'indigo',
    color: vfx.vfxColor || (kind === 'skill' ? '#f59e0b' : '#818cf8'),
    tags: entry.tags || '',
    quote: entry.quote || '',
    stats,
    description: entry.description || entry.rank1Effect || '',
    upgrades: allUpgrades,
    limitations: entry.limitations || ''
  };
}

function showEffectHoverInfo(kind, encodedName, rank = 1, casterId = '') {
  const box = document.getElementById('effectHoverInfoBox');
  if (!box) return;
  const rawName = decodeURIComponent(encodedName || '');

  if (kind === 'spell' || kind === 'skill' || kind === 'attack') {
    const ab = lookupAbilityHoverDetails(kind, rawName, rank, casterId);
    const borderCls = kind === 'spell' ? 'border-indigo-400/70' : 'border-amber-400/70';
    const titleCls = kind === 'spell' ? 'text-indigo-200' : 'text-amber-200';
    const badgeCls = kind === 'spell'
      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/40'
      : 'bg-amber-500/20 text-amber-200 border border-amber-500/40';

    box.className = `absolute bottom-3 right-3 pointer-events-none z-30 w-80 max-w-[calc(100%-1.5rem)] bg-dungeon-900/95 backdrop-blur-md border ${borderCls} rounded-xl p-3 shadow-2xl transition-all space-y-1.5`;
    box.innerHTML = `
      <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${ab.color}"></span>
            <span class="font-bold text-xs ${titleCls} truncate">${escapeHtmlAttr(ab.title)}</span>
          </div>
          ${ab.tags ? `<div class="text-[9px] font-mono text-slate-400 mt-0.5 truncate">${escapeHtmlAttr(ab.tags)}</div>` : ''}
        </div>
        <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${badgeCls}">${escapeHtmlAttr(ab.badge)}</span>
      </div>
      ${ab.quote ? `<div class="text-[10px] italic text-amber-300/90 leading-snug">${escapeHtmlAttr(ab.quote)}</div>` : ''}
      ${ab.stats.length > 0 ? `
        <div class="flex flex-wrap gap-1">
          ${ab.stats.map(st => `<span class="px-1.5 py-0.5 rounded bg-dungeon-950 border border-slate-800 text-[9px] font-mono text-slate-200">${escapeHtmlAttr(st)}</span>`).join('')}
        </div>
      ` : ''}
      ${ab.description ? `<p class="text-[11px] text-slate-200 leading-snug">${escapeHtmlAttr(ab.description)}</p>` : ''}
      ${ab.limitations ? `<div class="text-[10px] font-mono text-rose-300/90 bg-rose-950/30 border border-rose-500/30 rounded px-1.5 py-0.5">⚠️ ${escapeHtmlAttr(ab.limitations)}</div>` : ''}
      ${ab.upgrades.length > 0 ? `
        <div class="pt-1 border-t border-slate-800/80 space-y-0.5">
          ${ab.upgrades.map(u => `
            <div class="text-[9.5px] leading-snug ${u.unlocked ? 'text-emerald-300 font-semibold' : 'text-slate-400'}">
              ${u.unlocked ? '✓ ' : '• '}${escapeHtmlAttr(u.text)}
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    return;
  }

  const info = lookupEffectCatalogDetails(kind, rawName);
  const isBuff = kind === 'buff';
  box.className = `absolute bottom-3 right-3 pointer-events-none z-30 w-80 max-w-[calc(100%-1.5rem)] bg-dungeon-900/95 backdrop-blur-md border ${isBuff ? 'border-emerald-500/60' : 'border-rose-500/60'} rounded-xl p-3 shadow-2xl transition-all`;
  box.innerHTML = `
    <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${info.color}"></span>
        <span class="font-bold text-xs ${isBuff ? 'text-emerald-300' : 'text-rose-300'} truncate">${escapeHtmlAttr(info.title)}</span>
      </div>
      <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${isBuff ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-200 border border-rose-500/40'}">${escapeHtmlAttr(info.kindLabel)}</span>
    </div>
    <div class="flex items-center justify-between gap-2 text-[10px] font-mono text-amber-300 mb-1.5">
      <span>⏳ Duration: <b>${escapeHtmlAttr(info.duration)}</b></span>
      ${info.category ? `<span class="text-slate-400 truncate">${escapeHtmlAttr(info.category)}</span>` : ''}
    </div>
    <p class="text-[11px] text-slate-200 leading-snug">${escapeHtmlAttr(info.description)}</p>
  `;
}

function hideEffectHoverInfo() {
  const box = document.getElementById('effectHoverInfoBox');
  if (box) box.classList.add('hidden');
}

function updateCanvasHoverCard(e, scene, wx, wy, gx, gy, gs) {
  const card = document.getElementById('tokenHoverCard');
  if (!card) return;
  if (uiState.isPanning || uiState.isDraggingToken || uiState.isDraggingObject || uiState.isDraggingLight || uiState.isDrawingWall) {
    card.classList.add('hidden');
    return;
  }
  const hitTok = findTokenAtWorldOrGrid(wx, wy, gx, gy, gs);
  if (hitTok) {
    if (IS_PLAYER_WINDOW && hitTok.role === 'mob') {
      const blockingWalls = getBlockingWallSegments(scene);
      const crawlerVisList = getCrawlerVisionSources(scene, gs, blockingWalls);
      const tx = (hitTok.gx + 0.5) * gs;
      const ty = (hitTok.gy + 0.5) * gs;
      const inLos = isPointSeenInLightOrSight(tx, ty, scene, gs, crawlerVisList, blockingWalls);
      if (!inLos) {
        const det = typeof isMobDetectedOnMinimap === 'function' ? isMobDetectedOnMinimap(hitTok, scene) : { detected: false };
        if (!det.detected) {
          card.classList.add('hidden');
          return;
        }
        card.innerHTML = `
          <div class="flex items-center justify-between gap-1.5 border-b border-rose-500/40 pb-1 mb-1">
            <span class="font-bold text-xs text-rose-300">🔴 Minimap Blip</span>
            <span class="text-[9.5px] font-mono text-amber-300">${escapeHtmlAttr(det.reason)}</span>
          </div>
          ${det.showSizeAndKnown ? `
            <div class="text-[10px] font-mono text-slate-200">Size: <b>${escapeHtmlAttr(det.sizeLabel)}</b></div>
            <div class="text-[10px] font-mono ${det.known ? 'text-emerald-300' : 'text-amber-300'}">Type: <b>${det.known ? `Known (${escapeHtmlAttr(hitTok.name)})` : 'Unknown Mob'}</b></div>
          ` : `
            <div class="text-[10px] font-mono text-slate-300">Hostile signature detected out of sight.</div>
          `}
        `;
        card.style.left = `${Math.min(window.innerWidth - 252, e.clientX + 14)}px`;
        card.style.top = `${Math.min(window.innerHeight - 110, e.clientY + 14)}px`;
        card.classList.remove('hidden');
        return;
      }
    }
    const hm = getTokenHealthMetrics(hitTok);
    const isHiddenMob = IS_PLAYER_WINDOW && hitTok.role === 'mob';
    const illum = getIlluminationBuffForToken(hitTok);
    const hoverImg = getResolvedTokenPortraitImage(hitTok);
    const hoverPortraitSrc = hitTok.portraitDataUrl || hitTok.portraitUrl || (hoverImg && hoverImg.src) || '';
    const hoverBorderCol = hitTok.color || (hitTok.role === 'crawler' ? '#38bdf8' : '#ef4444');
    card.innerHTML = `
      <div class="flex items-center gap-2 border-b border-slate-800 pb-1.5 mb-1">
        <div class="w-9 h-9 rounded-lg bg-dungeon-900 border-2 flex items-center justify-center overflow-hidden shrink-0" style="border-color:${escapeHtmlAttr(hoverBorderCol)}">
          ${hoverPortraitSrc
            ? `<img src="${escapeHtmlAttr(hoverPortraitSrc)}" alt="${escapeHtmlAttr(hitTok.name || 'Unit')}" class="w-full h-full object-cover" />`
            : `<span class="text-base">${hitTok.iconSymbol || (hitTok.role === 'crawler' ? '⚔️' : '👹')}</span>`
          }
        </div>
        <div class="flex-1 min-w-0 flex items-center justify-between gap-1.5">
          <span class="font-bold text-xs text-slate-100 truncate">${hitTok.name}</span>
          <span class="text-[10px] font-mono text-amber-400 shrink-0">Lvl ${hitTok.level || 1}</span>
        </div>
      </div>
      <div class="text-[10px] font-mono text-slate-300 flex justify-between">
        <span>❤️ ${isHiddenMob ? `${hm.pct}% HP` : `${hm.curHp}/${hm.maxHp} HP`}</span>
        ${hitTok.shieldPips ? `<span class="text-sky-300">+${hitTok.shieldPips}🛡</span>` : ''}
        ${!isHiddenMob ? `<span>Evade ${getEffectiveEvadeDisplay(hitTok)}</span>` : ''}
      </div>
      <div class="mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${illum.badgeCls} truncate">${illum.label}</div>
    `;
    card.style.left = `${Math.min(window.innerWidth - 252, e.clientX + 14)}px`;
    card.style.top = `${Math.min(window.innerHeight - 110, e.clientY + 14)}px`;
    card.classList.remove('hidden');
    return;
  }
  const hitObj = findObjectAtWorldOrGrid(wx, wy, gx, gy, gs);
  if (hitObj) {
    card.innerHTML = `
      <div class="font-bold text-xs text-emerald-300 truncate">${hitObj.iconSymbol || '📦'} ${hitObj.name}</div>
      <div class="text-[10px] font-mono text-slate-400">${hitObj.category || 'Map Object'}</div>
      ${hitObj.notes ? `<div class="text-[10px] text-slate-300 mt-1 leading-snug">${hitObj.notes}</div>` : ''}
    `;
    card.style.left = `${Math.min(window.innerWidth - 252, e.clientX + 14)}px`;
    card.style.top = `${Math.min(window.innerHeight - 110, e.clientY + 14)}px`;
    card.classList.remove('hidden');
    return;
  }
  card.classList.add('hidden');
}

canvas.addEventListener('pointerleave', () => {
  const card = document.getElementById('tokenHoverCard');
  if (card) card.classList.add('hidden');
});

canvas.addEventListener('pointermove', e => {
  const scene = getActiveScene();
  if (!scene) return;
  const gs = scene.gridSize || 56;
  const { wx, wy } = screenToWorld(e.clientX, e.clientY);
  const { gx, gy } = worldToGrid(wx, wy);

  if (uiState.isDrawingWall && uiState.wallStartPt) {
    uiState.wallPreviewPt = snapPointIfNeeded(wx, wy, gs);
    return;
  }

  if (uiState.isPanning) {
    uiState.camX = e.clientX - uiState.panStartX;
    uiState.camY = e.clientY - uiState.panStartY;
    exploredMemDirty = true;
    return;
  }

  if (uiState.measureStart && uiState.canvasTool === 'measure') {
    uiState.measureEnd = { wx, wy };
    return;
  }

  if (uiState.isDraggingToken && uiState.draggedTokenId) {
    uiState.dragPreviewGx = gx;
    uiState.dragPreviewGy = gy;
    return;
  }

  if (uiState.isDraggingObject && uiState.draggedObjectId) {
    const obj = (scene.mapObjects || []).find(o => o.id === uiState.draggedObjectId);
    if (obj) {
      obj.gx = gx;
      obj.gy = gy;
    }
    return;
  }

  if (uiState.isDraggingLight && uiState.draggedLightId) {
    const lt = (scene.droppedLights || []).find(l => l.id === uiState.draggedLightId);
    if (lt) {
      lt.wx = wx;
      lt.wy = wy;
      lt.gx = gx;
      lt.gy = gy;
    }
    return;
  }

  updateCanvasHoverCard(e, scene, wx, wy, gx, gy, gs);
});

canvas.addEventListener('pointerup', e => {
  const scene = getActiveScene();
  if (!scene) return;
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  const gs = Math.max(16, Math.min(240, Number(scene.gridSize) || 56));
  if (uiState.isDrawingWall && uiState.wallStartPt && uiState.wallPreviewPt) {
    const dist = Math.hypot(uiState.wallPreviewPt.x - uiState.wallStartPt.x, uiState.wallPreviewPt.y - uiState.wallStartPt.y);
    if (dist >= 8) {
      scene.walls = scene.walls || [];
      scene.walls.push({
        id: 'wall_' + Date.now(),
        kind: uiState.wallDrawKind || 'wall',
        open: false,
        x1: uiState.wallStartPt.x,
        y1: uiState.wallStartPt.y,
        x2: uiState.wallPreviewPt.x,
        y2: uiState.wallPreviewPt.y
      });
      visPolyCache.clear();
      commitStateChange();
    }
    uiState.isDrawingWall = false;
    uiState.wallStartPt = null;
    uiState.wallPreviewPt = null;
    return;
  }

  if (uiState.isDraggingToken && uiState.draggedTokenId) {
    const tok = (scene.tokens || []).find(t => t.id === uiState.draggedTokenId);
    if (tok) {
      const targetGx = uiState.dragPreviewGx;
      const targetGy = uiState.dragPreviewGy;
      if (targetGx !== tok.gx || targetGy !== tok.gy) {
        const isCombat = (appState?.round ?? 0) > 0;
        const metrics = getTokenRangeMetrics(tok);
        const maxAllowedFt = metrics.canDoubleMove
          ? metrics.ring4DoubleMoveFt
          : metrics.canSingleMove
          ? metrics.ring2MoveStepFt
          : metrics.canFreeStep
          ? metrics.ring1StepFt
          : 0;

        const wallBlock = tok.role === 'crawler' ? findWallBlockedCrawlerStep(tok.gx, tok.gy, targetGx, targetGy, scene) : null;
        const pathMap = (isCombat && tok.role === 'crawler')
          ? computeReachableGridMap(tok.gx, tok.gy, maxAllowedFt, scene)
          : null;
        const pathSteps = pathMap ? pathMap.get(`${targetGx},${targetGy}`) : null;

        if (wallBlock) {
          showVttToast('🧱 Movement blocked by closed wall or door!');
        } else if (isCombat && tok.role === 'crawler' && pathSteps === undefined) {
          showVttToast(IS_PLAYER_WINDOW && getCrawlerPhasePermissions(tok).canStepOnly ? `⚡ Step 2 (React): Only a ${maxAllowedFt}ft Interrupt Step is allowed!` : `⚠️ Out of movement range (${maxAllowedFt}ft max) — ${tok.name} snapped back!`);
        } else {
          const movedFt = (isCombat && tok.role === 'crawler' && pathSteps !== null)
            ? pathSteps * 5
            : calcGridDistanceFt(tok.gx, tok.gy, targetGx, targetGy);
          tok.gx = targetGx;
          tok.gy = targetGy;
          if (typeof syncTokenElevationToTerrainOnMove === 'function') syncTokenElevationToTerrainOnMove(tok, scene);
          applyAutomaticMovementEconomy(tok, movedFt);
          exploredMemDirty = true;
          if (IS_PLAYER_WINDOW) {
            sendPlayerMoveToHost(tok.id, targetGx, targetGy, movedFt);
            renderAllUI();
          } else {
            commitStateChange();
          }
        }
      }
    }
    uiState.isDraggingToken = false;
    uiState.draggedTokenId = null;
    return;
  }

  if (uiState.isDraggingObject) {
    uiState.isDraggingObject = false;
    uiState.draggedObjectId = null;
    commitStateChange();
    return;
  }

  if (uiState.isDraggingLight) {
    uiState.isDraggingLight = false;
    uiState.draggedLightId = null;
    commitStateChange();
    return;
  }

  if (uiState.measureStart && uiState.canvasTool === 'measure') {
    uiState.measureStart = null;
    uiState.measureEnd = null;
    return;
  }

  if (uiState.isPanning) {
    const moveDist = Math.hypot(e.clientX - uiState.panDownClientX, e.clientY - uiState.panDownClientY);
    uiState.isPanning = false;
    if (e.button === 0 && moveDist < 6 && uiState.selectedTokenId) {
      uiState.selectedTokenId = null;
      uiState.activeCastPanel = null;
      uiState.previewEffectRange = null;
      renderAllUI();
    }
  }
});

