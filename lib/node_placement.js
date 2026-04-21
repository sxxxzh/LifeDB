const crypto = require('crypto');

function normalize(v) {
  const n = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

function seedDir(text, created_at) {
  const base = `${text || ''}|${created_at || ''}`;
  const h = crypto.createHash('md5').update(base).digest('hex');
  const a = parseInt(h.slice(0, 8), 16);
  const b = parseInt(h.slice(8, 16), 16);
  const c = parseInt(h.slice(16, 24), 16);
  const x = ((a % 2000) - 1000) / 1000;
  const y = ((b % 2000) - 1000) / 1000;
  const z = ((c % 2000) - 1000) / 1000;
  return normalize({ x, y, z });
}

async function getConstellationAnchor(supabase, name) {
  const { data } = await supabase
    .from('constellations')
    .select('position_x, position_y, position_z')
    .eq('name', name)
    .single();
  if (!data) return null;
  const { position_x, position_y, position_z } = data;
  if (position_x == null || position_y == null || position_z == null) return null;
  return { x: position_x, y: position_y, z: position_z };
}

function getNodeGalaxy(existing) {
  try {
    if (existing.cosmic_constellation) {
      const c = JSON.parse(existing.cosmic_constellation || '[]');
      if (Array.isArray(c) && c[0]) return String(c[0]);
    }
  } catch {}
  try {
    const t = Array.isArray(existing.ai_tags) ? existing.ai_tags : JSON.parse(existing.ai_tags || '[]');
    if (Array.isArray(t) && t[0]) return String(t[0]);
  } catch {}
  return null;
}

async function getGalaxyNodes(supabase, name) {
  const { data: rows } = await supabase
    .from('moments')
    .select('id, cosmic_position_x, cosmic_position_y, cosmic_position_z, cosmic_constellation, ai_tags')
    .limit(5000);
  const list = (rows || []).filter(r => {
    const g = getNodeGalaxy(r);
    return g === name;
  }).map(r => ({ id: r.id, x: r.cosmic_position_x, y: r.cosmic_position_y, z: r.cosmic_position_z }))
    .filter(p => p.x != null && p.y != null && p.z != null);
  return list;
}

function filterByRange(positions, center, rangeMin, rangeMax) {
  return positions.filter(p => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const dz = p.z - center.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return d >= rangeMin && d <= rangeMax;
  });
}

function placeWithMinDistance(center, existing, dir, opts) {
  const minDist = opts.minDist ?? 120;
  const preferredMin = opts.preferredMin ?? 300;
  const preferredMax = opts.preferredMax ?? 500;
  const maxRadius = opts.maxRadius ?? 800;
  const step = opts.step ?? 30;
  const rangeMin = opts.rangeMin ?? 0;
  const rangeMax = opts.rangeMax ?? maxRadius;
  const initPref = preferredMin + ((opts.importance ?? 2) - 2) * 50;
  const initMin = Math.max(preferredMin, rangeMin);
  const initMax = Math.min(preferredMax, rangeMax);
  let radius = Math.max(initMin, Math.min(initMax, initPref));
  let candidate = { x: center.x + dir.x * radius, y: center.y + dir.y * radius, z: center.z + dir.z * radius };
  let attempts = 0;
  const tooClose = () => existing.some(p => {
    const dx = candidate.x - p.x;
    const dy = candidate.y - p.y;
    const dz = candidate.z - p.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < minDist;
  });
  while (tooClose() && attempts < 30) {
    radius = Math.min(Math.min(maxRadius, rangeMax), radius + step);
    candidate.x = center.x + dir.x * radius;
    candidate.y = center.y + dir.y * radius;
    candidate.z = center.z + dir.z * radius;
    attempts++;
  }
  return candidate;
}

async function reassignNodeDistance(supabase, nodeId, params) {
  const { data: existing } = await supabase
    .from('moments')
    .select('*')
    .eq('id', nodeId)
    .single();
  if (!existing) return null;
  const galaxy = getNodeGalaxy(existing);
  if (!galaxy) return null;
  const center = await getConstellationAnchor(supabase, galaxy);
  if (!center) return null;
  const allNodes = await getGalaxyNodes(supabase, galaxy);
  const rangeMin = params.rangeMin ?? 0;
  const rangeMax = params.rangeMax ?? 800;
  const existingInRange = filterByRange(allNodes.filter(p => p.id !== nodeId), center, rangeMin, rangeMax);
  const dir = seedDir(existing.text, existing.created_at);
  const candidate = placeWithMinDistance(center, existingInRange, dir, {
    minDist: params.minDist,
    preferredMin: params.preferredMin,
    preferredMax: params.preferredMax,
    maxRadius: params.maxRadius,
    step: params.step,
    rangeMin,
    rangeMax,
    importance: existing.ai_importance
  });
  await supabase
    .from('moments')
    .update({
      cosmic_position_x: candidate.x,
      cosmic_position_y: candidate.y,
      cosmic_position_z: candidate.z
    })
    .eq('id', nodeId);
  return candidate;
}

module.exports = {
  getConstellationAnchor,
  getGalaxyNodes,
  filterByRange,
  placeWithMinDistance,
  reassignNodeDistance
};
