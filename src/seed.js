require("dotenv").config();
const { getDriver, verifyConnection, closeDriver } = require("./db");
const data = require("./data/seedData");

async function run() {
  console.log("Career Compass — seeding CognoDB\n");

  const status = await verifyConnection();
  if (!status.ok) {
    console.error("✗ Could not connect to CognoDB:", status.error);
    console.error("  Check COGNODB_URI / COGNODB_USER / COGNODB_PASSWORD in your .env file.");
    process.exit(1);
  }
  console.log("✓ Connected to CognoDB\n");

  const driver = getDriver();
  const session = driver.session({ defaultAccessMode: "WRITE" });

  try {
    console.log("Clearing existing data...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log("Creating constraints...");
    const constraints = [
      "CREATE CONSTRAINT skill_id IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE",
      "CREATE CONSTRAINT course_id IF NOT EXISTS FOR (c:Course) REQUIRE c.id IS UNIQUE",
      "CREATE CONSTRAINT career_id IF NOT EXISTS FOR (c:Career) REQUIRE c.id IS UNIQUE",
      "CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE",
      "CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
    ];
    for (const stmt of constraints) {
      await session.run(stmt);
    }

    console.log("Loading nodes...");
    await session.run(
      `UNWIND $rows AS row
       CREATE (s:Skill {id: row.id, name: row.name, category: row.category})`,
      { rows: data.skills }
    );
    await session.run(
      `UNWIND $rows AS row
       CREATE (c:Course {id: row.id, name: row.name, provider: row.provider, hours: row.hours})`,
      { rows: data.courses }
    );
    await session.run(
      `UNWIND $rows AS row
       CREATE (c:Career {id: row.id, name: row.name, level: row.level})`,
      { rows: data.careers }
    );
    await session.run(
      `UNWIND $rows AS row
       CREATE (c:Company {id: row.id, name: row.name, industry: row.industry})`,
      { rows: data.companies }
    );
    await session.run(
      `UNWIND $rows AS row
       CREATE (p:Person {id: row.id, name: row.name, currentRole: row.currentRole})`,
      { rows: data.people }
    );

    console.log("Loading relationships...");

    await session.run(
      `UNWIND $rows AS row
       MATCH (a:Skill {id: row[0]}), (b:Skill {id: row[1]})
       CREATE (a)-[:PREREQUISITE_OF]->(b)`,
      { rows: data.prerequisites }
    );

    await session.run(
      `UNWIND $rows AS row
       MATCH (c:Course {id: row[0]}), (s:Skill {id: row[1]})
       CREATE (c)-[:TEACHES]->(s)`,
      { rows: data.courseTeaches }
    );

    await session.run(
      `UNWIND $rows AS row
       MATCH (ca:Career {id: row[0]}), (s:Skill {id: row[1]})
       CREATE (ca)-[:REQUIRES_SKILL {importance: row[2]}]->(s)`,
      { rows: data.careerRequires }
    );

    await session.run(
      `UNWIND $rows AS row
       MATCH (co:Company {id: row[0]}), (ca:Career {id: row[1]})
       CREATE (co)-[:HIRES_FOR]->(ca)`,
      { rows: data.companyHires }
    );

    await session.run(
      `UNWIND $rows AS row
       MATCH (p:Person {id: row[0]}), (s:Skill {id: row[1]})
       CREATE (p)-[:HAS_SKILL {level: row[2]}]->(s)`,
      { rows: data.personSkills }
    );

    await session.run(
      `UNWIND $rows AS row
       MATCH (p:Person {id: row[0]}), (c:Company {id: row[1]})
       CREATE (p)-[:WORKS_AT]->(c)`,
      { rows: data.personWorksAt }
    );

    const counts = await session.run(
      `MATCH (n) RETURN labels(n)[0] AS label, count(*) AS count ORDER BY label`
    );
    console.log("\nSeed complete. Node counts:");
    counts.records.forEach((r) => {
      console.log(`  ${r.get("label")}: ${r.get("count").toNumber()}`);
    });

    const relCount = await session.run(`MATCH ()-[r]->() RETURN count(r) AS count`);
    console.log(`  Relationships: ${relCount.records[0].get("count").toNumber()}`);
  } finally {
    await session.close();
    await closeDriver();
  }
}

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
