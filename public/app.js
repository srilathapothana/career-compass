// Keyed to the --cat-* custom properties in styles.css so a skill's color
// stays consistent whether it shows up in a chip, a waypoint, or the graph.
const CATEGORY_COLORS = {
  Web: "var(--cat-web)",
  Backend: "var(--cat-backend)",
  Data: "var(--cat-data)",
  Infra: "var(--cat-infra)",
  Design: "var(--cat-design)",
  Product: "var(--cat-product)",
  Management: "var(--cat-management)",
};
function catColor(category) {
  return CATEGORY_COLORS[category] || "var(--text-dim)";
}

const personSelect = document.getElementById("personSelect");
const careerSelect = document.getElementById("careerSelect");
const dbError = document.getElementById("dbError");
const resultsEl = document.getElementById("results");
const loadingEl = document.getElementById("loadingState");

async function api(path) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || body.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function showError(message) {
  dbError.textContent = message;
  dbError.classList.remove("hidden");
}
function clearError() {
  dbError.classList.add("hidden");
}

function initials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

async function loadStats() {
  try {
    const stats = await api("/stats");
    document.getElementById("graphStats").innerHTML = [
      `<span>${stats.skills} skills</span>`,
      `<span>${stats.careers} careers</span>`,
      `<span>${stats.courses} courses</span>`,
      `<span>${stats.people} travelers</span>`,
      `<span>${stats.relationships} connections</span>`,
    ].join("");
  } catch (err) {
    // Non-critical — quietly skip if stats aren't reachable, the rest of the app still works
  }
}

async function boot() {
  loadStats();
  try {
    const [people, careers] = await Promise.all([api("/people"), api("/careers")]);

    personSelect.innerHTML = people
      .map((p) => `<option value="${p.id}">${p.name} — ${p.currentRole}</option>`)
      .join("");
    careerSelect.innerHTML = careers
      .map((c) => `<option value="${c.id}">${c.name} (${c.level})</option>`)
      .join("");

    clearError();
    if (people.length && careers.length) {
      await loadRoute();
    }
  } catch (err) {
    showError(
      err.status === 503
        ? `Can't reach CognoDB right now: ${err.message}. Check your connection details in .env and that your instance is running.`
        : `Something went wrong loading Career Compass: ${err.message}`
    );
    personSelect.innerHTML = `<option value="">Unavailable</option>`;
    careerSelect.innerHTML = `<option value="">Unavailable</option>`;
  }
}

async function loadRoute() {
  const personId = personSelect.value;
  const careerId = careerSelect.value;
  if (!personId || !careerId) return;

  resultsEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  clearError();

  try {
    const [gap, unlockable, peers, graph] = await Promise.all([
      api(`/careers/${careerId}/gap?personId=${personId}`),
      api(`/people/${personId}/unlockable-skills`),
      api(`/people/${personId}/peers`),
      api(`/careers/${careerId}/graph`),
    ]);

    renderGap(gap);
    renderUnlockable(unlockable);
    renderPeers(peers);
    renderGraph(graph, gap.skills);

    resultsEl.classList.remove("hidden");
  } catch (err) {
    showError(
      err.status === 503
        ? `Can't reach CognoDB right now: ${err.message}.`
        : `Couldn't chart that route: ${err.message}`
    );
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function renderGap(gap) {
  const careerName = careerSelect.options[careerSelect.selectedIndex]?.text || "";
  document.getElementById("careerLabel").textContent = careerName;
  document.getElementById("graphCareerLabel").textContent = careerName;

  const value = gap.readiness;
  document.getElementById("readinessValue").textContent = value;
  const circumference = 314;
  document.getElementById("readinessArc").style.strokeDashoffset =
    circumference - (circumference * value) / 100;

  const personName = personSelect.options[personSelect.selectedIndex]?.text.split(" — ")[0] || "This traveler";
  const missingCount = gap.skills.filter((s) => !s.hasSkill).length;
  document.getElementById("readinessText").textContent =
    missingCount === 0
      ? `${personName} already has every skill this career requires. Route complete.`
      : `${personName} has reached ${gap.skills.length - missingCount} of ${gap.skills.length} required waypoints — ${missingCount} left on the route.`;

  const trail = document.getElementById("skillTrail");
  trail.innerHTML = gap.skills
    .map((s, i) => {
      const coursesText = s.courses && s.courses.length
        ? `→ ${s.courses.map((c) => c.name).slice(0, 2).join(", ")}`
        : "";
      return `<span class="skill-chip ${s.hasSkill ? "have" : "missing"}" style="--cat-color:${catColor(s.category)}; animation-delay:${i * 0.03}s">
        <i class="dot ${s.hasSkill ? "dot-have" : "dot-missing"}"></i>
        ${s.skillName}
        ${!s.hasSkill && coursesText ? `<span class="courses">${coursesText}</span>` : ""}
      </span>`;
    })
    .join("");
}

function renderUnlockable(list) {
  const ul = document.getElementById("unlockableList");
  const empty = document.getElementById("unlockableEmpty");
  if (!list.length) {
    ul.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  ul.innerHTML = list
    .map(
      (s, i) => `<li style="--cat-color:${catColor(s.category)}; animation-delay:${i * 0.04}s">
        <span class="hop-badge">${s.hopsAway} hop${s.hopsAway > 1 ? "s" : ""}</span>
        <span>
          <span class="waypoint-name">${s.skillName}</span>
          <span class="waypoint-meta">${s.category} · reachable via ${s.unlockedBy.join(", ")}</span>
        </span>
      </li>`
    )
    .join("");
}

function renderPeers(list) {
  const ul = document.getElementById("peerList");
  const empty = document.getElementById("peerEmpty");
  if (!list.length) {
    ul.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  ul.innerHTML = list
    .map(
      (p, i) => `<li style="animation-delay:${i * 0.04}s">
        <span class="peer-avatar">${initials(p.peerName)}</span>
        <span class="peer-info">
          <span class="peer-name">${p.peerName}</span>
          <span class="peer-meta">${p.currentRole}${p.company ? " · " + p.company : ""} · ${p.sharedSkills} shared skill${p.sharedSkills > 1 ? "s" : ""}</span>
          ${p.suggestedSkills.length ? `<span class="peer-suggested">Also knows: <strong>${p.suggestedSkills.join(", ")}</strong></span>` : ""}
        </span>
      </li>`
    )
    .join("");
}

function renderGraph(graph, gapSkills) {
  const svg = document.getElementById("graphSvg");
  svg.innerHTML = "";
  if (!graph.career) return;

  const hasSet = new Set(gapSkills.filter((s) => s.hasSkill).map((s) => s.skillId));
  const cx = 320, cy = 230, radius = 165;
  const n = graph.skills.length || 1;
  const positions = {};
  graph.skills.forEach((s, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions[s.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  const ns = "http://www.w3.org/2000/svg";
  const edgeGroup = document.createElementNS(ns, "g");
  const spokeGroup = document.createElementNS(ns, "g");
  const nodeGroup = document.createElementNS(ns, "g");

  // spokes from career center to each required skill
  graph.skills.forEach((s) => {
    const p = positions[s.id];
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", cx); line.setAttribute("y1", cy);
    line.setAttribute("x2", p.x); line.setAttribute("y2", p.y);
    line.setAttribute("class", "graph-edge");
    line.setAttribute("opacity", "0.5");
    spokeGroup.appendChild(line);
  });

  // prerequisite edges between required skills — drawn as a gentle curve
  // (quadratic bezier through a perpendicular-offset midpoint) so chains
  // are visually distinct from the straight career→skill spokes
  graph.edges.forEach((e) => {
    const from = positions[e.from], to = positions[e.to];
    if (!from || !to) return;
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
    const dx = to.x - from.x, dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const bow = 18;
    const cx2 = mx + (-dy / dist) * bow, cy2 = my + (dx / dist) * bow;
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", `M ${from.x} ${from.y} Q ${cx2} ${cy2} ${to.x} ${to.y}`);
    path.setAttribute("class", "graph-prereq-edge");
    path.setAttribute("stroke", "var(--accent)");
    path.setAttribute("marker-end", "url(#arrowhead)");
    edgeGroup.appendChild(path);
  });

  // career center node
  const center = document.createElementNS(ns, "g");
  center.setAttribute("class", "graph-center");
  center.innerHTML = `<circle cx="${cx}" cy="${cy}" r="34"></circle>
    <text x="${cx}" y="${cy + 4}" text-anchor="middle">${graph.career.name.split(" ").map(w=>w[0]).join("").slice(0,3)}</text>`;

  // skill nodes — stroke shows readiness (reached vs ahead), the small
  // category dot + label ties each node back to the color used everywhere
  // else in the UI for that same skill
  graph.skills.forEach((s) => {
    const p = positions[s.id];
    const color = catColor(s.category);
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", `graph-node ${hasSet.has(s.id) ? "core" : ""}`);
    g.innerHTML = `<circle cx="${p.x}" cy="${p.y}" r="22" stroke="${hasSet.has(s.id) ? "var(--have)" : "var(--missing)"}"></circle>
      <circle cx="${p.x - 15}" cy="${p.y - 15}" r="3.5" fill="${color}"></circle>
      <text x="${p.x}" y="${p.y - 1}" text-anchor="middle">${s.name.length > 14 ? s.name.slice(0,13)+"…" : s.name}</text>
      <text class="cat" x="${p.x}" y="${p.y + 11}" text-anchor="middle">${s.category}</text>`;
    nodeGroup.appendChild(g);
  });

  // arrowhead marker def for prerequisite edges
  const defs = document.createElementNS(ns, "defs");
  defs.innerHTML = `<marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)"></path>
  </marker>`;

  svg.appendChild(defs);
  svg.appendChild(spokeGroup);
  svg.appendChild(edgeGroup);
  svg.appendChild(center);
  svg.appendChild(nodeGroup);

  // legend: which categories are actually present in this map, plus the
  // reached/ahead stroke meaning
  const legendEl = document.getElementById("graphLegend");
  const cats = [...new Set(graph.skills.map((s) => s.category))];
  legendEl.innerHTML = [
    ...cats.map((c) => `<span class="legend-item"><i class="dot" style="background:${catColor(c)}"></i>${c}</span>`),
    `<span class="legend-item"><i class="dot" style="background:var(--have)"></i>reached</span>`,
    `<span class="legend-item"><i class="dot" style="background:var(--missing)"></i>ahead</span>`,
  ].join("");
}

personSelect.addEventListener("change", loadRoute);
careerSelect.addEventListener("change", loadRoute);

boot();