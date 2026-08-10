require("dotenv").config();
const { getDriver, verifyConnection, closeDriver } = require("./db");

const personId = process.argv[2] || "pe_dilnoza";

async function run() {
  const status = await verifyConnection();
  if (!status.ok) {
    console.error("✗ Can't connect:", status.error);
    process.exit(1);
  }
  console.log(`✓ Connected. Diagnosing unlockable-skills for personId="${personId}"\n`);

  const session = getDriver().session({ defaultAccessMode: "READ" });
  try {
    // Step 1: does this person exist, and what skills do they have?
    const step1 = await session.run(
      `MATCH (p:Person {id: $personId}) RETURN p.name AS name`,
      { personId }
    );
    if (step1.records.length === 0) {
      console.log(`✗ No Person found with id "${personId}". Check the id is correct.`);
      return;
    }
    console.log(`Step 1 — person found: ${step1.records[0].get("name")}`);

    const step2 = await session.run(
      `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(s:Skill) RETURN s.id AS id, s.name AS name`,
      { personId }
    );
    console.log(`Step 2 — HAS_SKILL count: ${step2.records.length}`);
    step2.records.forEach((r) => console.log(`   - ${r.get("id")} (${r.get("name")})`));

    // Step 3: do PREREQUISITE_OF relationships exist at all in the DB?
    const step3 = await session.run(`MATCH ()-[r:PREREQUISITE_OF]->() RETURN count(r) AS c`);
    console.log(`\nStep 3 — total PREREQUISITE_OF relationships in DB: ${step3.records[0].get("c").toNumber()}`);

    // Step 4: 1-hop only, no exclusion — simplest possible version
    const step4 = await session.run(
      `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(known:Skill)-[:PREREQUISITE_OF]->(target:Skill)
       RETURN known.name AS known, target.name AS target`,
      { personId }
    );
    console.log(`\nStep 4 — 1-hop known->target pairs (no exclusion filter): ${step4.records.length}`);
    step4.records.forEach((r) => console.log(`   - ${r.get("known")} -> ${r.get("target")}`));

    // Step 5: add the "not already known" exclusion
    const step5 = await session.run(
      `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(known:Skill)-[:PREREQUISITE_OF]->(target:Skill)
       WHERE NOT (p)-[:HAS_SKILL]->(target)
       RETURN known.name AS known, target.name AS target`,
      { personId }
    );
    console.log(`\nStep 5 — same, with "not already known" filter: ${step5.records.length}`);
    step5.records.forEach((r) => console.log(`   - ${r.get("known")} -> ${r.get("target")}`));

    // Step 6: the full variable-length version used by the app
    const step6 = await session.run(
      `MATCH (p:Person {id: $personId})-[:HAS_SKILL]->(known:Skill)
       MATCH path = (known)-[:PREREQUISITE_OF*1..3]->(target:Skill)
       WHERE NOT (p)-[:HAS_SKILL]->(target)
       RETURN known.name AS known, target.name AS target, length(path) AS hops`,
      { personId }
    );
    console.log(`\nStep 6 — full variable-length (1..3) query used by the app: ${step6.records.length}`);
    step6.records.forEach((r) =>
      console.log(`   - ${r.get("known")} -> ${r.get("target")} (${r.get("hops")} hops)`)
    );

    console.log("\nDiagnosis:");
    if (step3.records[0].get("c").toNumber() === 0) {
      console.log("→ No PREREQUISITE_OF relationships exist in the DB at all. Re-run `npm run seed`.");
    } else if (step2.records.length === 0) {
      console.log(`→ This person has no HAS_SKILL relationships. Check the seed loaded correctly, or the personId.`);
    } else if (step4.records.length === 0) {
      console.log("→ This specific person's skills have no outgoing PREREQUISITE_OF edges in the data. That's expected for some people, not a bug.");
    } else if (step5.records.length === 0) {
      console.log("→ Edges exist, but every reachable target is already known — nothing new to unlock. Not a bug.");
    } else if (step6.records.length === 0) {
      console.log("→ 1-hop works but the *1..3 variable-length version returns nothing. This points to CognoDB not fully supporting variable-length path syntax the same way Neo4j does — try the app's fallback query (ask Claude to swap in the fixed-hop UNION version).");
    } else {
      console.log("→ The query works fine here. If the app still shows nothing, the bug is in the API route or frontend, not the query — check the server logs for the actual request.");
    }
  } finally {
    await session.close();
    await closeDriver();
  }
}

run().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
