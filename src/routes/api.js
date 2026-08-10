const express = require("express");
const { runQuery, verifyConnection } = require("../db");

const router = express.Router();

// Wraps a route handler so DB errors become clean JSON instead of crashing
// the process or leaking a raw driver stack trace to the client.
function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      const status = err.code === "DB_UNAVAILABLE" ? 503 : 500;
      res.status(status).json({
        error: status === 503 ? "Database unavailable" : "Query failed",
        detail: err.message,
      });
    }
  };
}

router.get(
  "/health",
  handle(async (req, res) => {
    const status = await verifyConnection();
    res.status(status.ok ? 200 : 503).json(status);
  })
);

router.get(
  "/stats",
  handle(async (req, res) => {
    const records = await runQuery(
      `MATCH (s:Skill) WITH count(s) AS skills
       MATCH (c:Career) WITH skills, count(c) AS careers
       MATCH (co:Course) WITH skills, careers, count(co) AS courses
       MATCH (p:Person) WITH skills, careers, courses, count(p) AS people
       MATCH ()-[r]->() RETURN skills, careers, courses, people, count(r) AS relationships`
    );
    const r = records[0];
    res.json({
      skills: r.get("skills").toNumber(),
      careers: r.get("careers").toNumber(),
      courses: r.get("courses").toNumber(),
      people: r.get("people").toNumber(),
      relationships: r.get("relationships").toNumber(),
    });
  })
);

router.get(
  "/people",
  handle(async (req, res) => {
    const records = await runQuery(
      `MATCH (p:Person)
       RETURN p.id AS id, p.name AS name, p.currentRole AS currentRole
       ORDER BY p.name`
    );
    res.json(records.map((r) => r.toObject()));
  })
);

router.get(
  "/careers",
  handle(async (req, res) => {
    const records = await runQuery(
      `MATCH (c:Career)
       OPTIONAL MATCH (c)-[:REQUIRES_SKILL]->(s:Skill)
       OPTIONAL MATCH (co:Company)-[:HIRES_FOR]->(c)
       RETURN c.id AS id, c.name AS name, c.level AS level,
              count(DISTINCT s) AS skillCount,
              collect(DISTINCT co.name) AS hiringCompanies
       ORDER BY c.name`
    );
    res.json(
      records.map((r) => ({
        id: r.get("id"),
        name: r.get("name"),
        level: r.get("level"),
        skillCount: r.get("skillCount").toNumber(),
        hiringCompanies: r.get("hiringCompanies").filter(Boolean),
      }))
    );
  })
);

// Gap analysis: for a career + a person, work out which required skills the
// person already has, which are missing, and which courses would teach the
// missing ones. This chains two different relationship types (REQUIRES_SKILL
// and TEACHES) around a shared Skill node and aggregates a nested collection
// per row — the kind of fan-out-then-fan-in query that needs multiple LEFT
// JOINs plus careful NULL handling in SQL, and falls out naturally here.
router.get(
  "/careers/:careerId/gap",
  handle(async (req, res) => {
    const { careerId } = req.params;
    const { personId } = req.query;
    if (!personId) return res.status(400).json({ error: "personId query param is required" });

    const records = await runQuery(
      `MATCH (c:Career {id: $careerId})-[req:REQUIRES_SKILL]->(s:Skill)
       OPTIONAL MATCH (p:Person {id: $personId})-[hs:HAS_SKILL]->(s)
       OPTIONAL MATCH (course:Course)-[:TEACHES]->(s)
       WITH s, req.importance AS importance, hs IS NOT NULL AS hasSkill, hs.level AS level,
            collect(DISTINCT CASE WHEN hs IS NULL THEN {id: course.id, name: course.name, provider: course.provider} END) AS courseOptions
       RETURN s.id AS skillId, s.name AS skillName, s.category AS category,
              importance, hasSkill, level,
              [c IN courseOptions WHERE c.id IS NOT NULL] AS courses
       ORDER BY hasSkill ASC, importance ASC, s.name ASC`,
      { careerId, personId }
    );

    const skills = records.map((r) => r.toObject());
    const matched = skills.filter((s) => s.hasSkill).length;
    res.json({
      careerId,
      personId,
      readiness: skills.length ? Math.round((matched / skills.length) * 100) : 0,
      skills,
    });
  })
);

// True multi-hop traversal: starting from the skills a person already has,
// walk 1-3 PREREQUISITE_OF hops to find skills that are now within reach,
// excluding skills they already have. Variable-length path matching like
// this is native to Cypher; the SQL equivalent needs a recursive CTE.
//
// Exclusion is done via explicit id-list membership (collect + IN) rather
// than a `WHERE NOT (p)-[:HAS_SKILL]->(target)` pattern predicate. The two
// are equivalent in standard openCypher, but CognoDB's engine was found
// (via src/diagnose-unlockable.js) to not evaluate negated relationship-
// pattern predicates inside WHERE the way Neo4j does — it was silently
// excluding every row instead of just the ones that matched the pattern.
// The id-list form sidesteps that and is more portable besides.
router.get(
  "/people/:personId/unlockable-skills",
  handle(async (req, res) => {
    const { personId } = req.params;
    const records = await runQuery(
      `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(known:Skill)
       WITH p, collect(DISTINCT known) AS knownNodes, collect(DISTINCT known.id) AS knownIds
       UNWIND knownNodes AS k
       MATCH path = (k)-[:PREREQUISITE_OF*1..3]->(target:Skill)
       WHERE NOT target.id IN knownIds
       WITH target, k, length(path) AS hops
       RETURN target.id AS skillId, target.name AS skillName, target.category AS category,
              min(hops) AS hopsAway, collect(DISTINCT k.name)[0..3] AS unlockedBy
       ORDER BY hopsAway ASC, skillName ASC
       LIMIT 12`,
      { personId }
    );
    res.json(
      records.map((r) => ({
        skillId: r.get("skillId"),
        skillName: r.get("skillName"),
        category: r.get("category"),
        hopsAway: r.get("hopsAway").toNumber ? r.get("hopsAway").toNumber() : r.get("hopsAway"),
        unlockedBy: r.get("unlockedBy"),
      }))
    );
  })
);

// Peer recommendation: find people who share the most skills with this
// person, then surface skills those peers have that this person doesn't.
// This is a two-hop "people who know what I know" pattern followed by a
// second fan-out — classic graph-native collaborative filtering.
//
// Same id-list exclusion technique as unlockable-skills above, for the
// same reason: avoids the negated relationship-pattern predicate that
// CognoDB doesn't evaluate correctly.
router.get(
  "/people/:personId/peers",
  handle(async (req, res) => {
    const { personId } = req.params;
    const records = await runQuery(
      `MATCH (me:Person {id: $personId})
       OPTIONAL MATCH (me)-[:HAS_SKILL]->(myKnown:Skill)
       WITH me, collect(DISTINCT myKnown.id) AS myKnownIds
       MATCH (me)-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(peer:Person)
       WHERE peer.id <> $personId
       WITH me, myKnownIds, peer, count(DISTINCT s) AS sharedSkills
       ORDER BY sharedSkills DESC
       LIMIT 5
       OPTIONAL MATCH (peer)-[:HAS_SKILL]->(theirSkill:Skill)
       WHERE NOT theirSkill.id IN myKnownIds
       OPTIONAL MATCH (peer)-[:WORKS_AT]->(co:Company)
       RETURN peer.id AS peerId, peer.name AS peerName, peer.currentRole AS currentRole,
              co.name AS company, sharedSkills,
              collect(DISTINCT theirSkill.name)[0..5] AS suggestedSkills
       ORDER BY sharedSkills DESC`,
      { personId }
    );
    res.json(
      records.map((r) => ({
        peerId: r.get("peerId"),
        peerName: r.get("peerName"),
        currentRole: r.get("currentRole"),
        company: r.get("company"),
        sharedSkills: r.get("sharedSkills").toNumber(),
        suggestedSkills: r.get("suggestedSkills"),
      }))
    );
  })
);

// Subgraph for the visual explorer: a career, the skills it requires, any
// prerequisite edges between those skills, and the courses that teach them.
router.get(
  "/careers/:careerId/graph",
  handle(async (req, res) => {
    const { careerId } = req.params;
    const records = await runQuery(
      `MATCH (c:Career {id: $careerId})-[:REQUIRES_SKILL]->(s:Skill)
       OPTIONAL MATCH (s)-[:PREREQUISITE_OF]->(s2:Skill)<-[:REQUIRES_SKILL]-(c)
       OPTIONAL MATCH (course:Course)-[:TEACHES]->(s)
       RETURN c.id AS careerId, c.name AS careerName,
              s.id AS skillId, s.name AS skillName, s.category AS category,
              s2.id AS prereqOfId,
              collect(DISTINCT course.name) AS courses`,
      { careerId }
    );

    if (records.length === 0) return res.json({ career: null, skills: [], edges: [], courses: {} });

    const career = { id: records[0].get("careerId"), name: records[0].get("careerName") };
    const skillMap = new Map();
    const edges = [];
    const coursesBySkill = {};

    records.forEach((r) => {
      const skillId = r.get("skillId");
      skillMap.set(skillId, {
        id: skillId,
        name: r.get("skillName"),
        category: r.get("category"),
      });
      coursesBySkill[skillId] = r.get("courses").filter(Boolean);
      const prereqOfId = r.get("prereqOfId");
      if (prereqOfId) edges.push({ from: skillId, to: prereqOfId });
    });

    res.json({
      career,
      skills: Array.from(skillMap.values()),
      edges,
      courses: coursesBySkill,
    });
  })
);

module.exports = router;