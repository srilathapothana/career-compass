// Realistic, hand-curated seed data for Career Compass.
// Kept intentionally in the few-hundred-nodes range per the CognoDB free-tier
// sizing guidance — enough to make traversals meaningful, small enough to
// load in a couple of seconds on a c0 instance.

const skills = [
  { id: "sk_html_css", name: "HTML & CSS", category: "Web" },
  { id: "sk_javascript", name: "JavaScript", category: "Web" },
  { id: "sk_typescript", name: "TypeScript", category: "Web" },
  { id: "sk_react", name: "React", category: "Web" },
  { id: "sk_node", name: "Node.js", category: "Backend" },
  { id: "sk_sql", name: "SQL", category: "Data" },
  { id: "sk_python", name: "Python", category: "Data" },
  { id: "sk_pandas", name: "Pandas", category: "Data" },
  { id: "sk_stats", name: "Statistics", category: "Data" },
  { id: "sk_ml", name: "Machine Learning", category: "Data" },
  { id: "sk_dl", name: "Deep Learning", category: "Data" },
  { id: "sk_graph_db", name: "Graph Databases", category: "Data" },
  { id: "sk_docker", name: "Docker", category: "Infra" },
  { id: "sk_k8s", name: "Kubernetes", category: "Infra" },
  { id: "sk_aws", name: "AWS", category: "Infra" },
  { id: "sk_ci_cd", name: "CI/CD", category: "Infra" },
  { id: "sk_system_design", name: "System Design", category: "Backend" },
  { id: "sk_api_design", name: "API Design", category: "Backend" },
  { id: "sk_ux_research", name: "UX Research", category: "Design" },
  { id: "sk_ui_design", name: "UI Design", category: "Design" },
  { id: "sk_prototyping", name: "Prototyping", category: "Design" },
  { id: "sk_data_viz", name: "Data Visualisation", category: "Data" },
  { id: "sk_product_sense", name: "Product Sense", category: "Product" },
  { id: "sk_leadership", name: "Team Leadership", category: "Management" },
];

// PREREQUISITE_OF chains — what genuinely unlocks what. This is the field
// that powers the variable-length "what could I learn next" traversal.
const prerequisites = [
  ["sk_html_css", "sk_javascript"],
  ["sk_javascript", "sk_typescript"],
  ["sk_javascript", "sk_react"],
  ["sk_typescript", "sk_react"],
  ["sk_javascript", "sk_node"],
  ["sk_node", "sk_api_design"],
  ["sk_api_design", "sk_system_design"],
  ["sk_sql", "sk_pandas"],
  ["sk_python", "sk_pandas"],
  ["sk_pandas", "sk_stats"],
  ["sk_stats", "sk_ml"],
  ["sk_ml", "sk_dl"],
  ["sk_python", "sk_ml"],
  ["sk_sql", "sk_graph_db"],
  ["sk_graph_db", "sk_system_design"],
  ["sk_docker", "sk_k8s"],
  ["sk_docker", "sk_ci_cd"],
  ["sk_k8s", "sk_aws"],
  ["sk_ux_research", "sk_ui_design"],
  ["sk_ui_design", "sk_prototyping"],
  ["sk_prototyping", "sk_product_sense"],
  ["sk_system_design", "sk_leadership"],
  ["sk_pandas", "sk_data_viz"],
];

const courses = [
  { id: "co_web_foundations", name: "Web Foundations", provider: "Codecademy", hours: 20 },
  { id: "co_modern_js", name: "Modern JavaScript", provider: "Frontend Masters", hours: 15 },
  { id: "co_react_deep", name: "React In Depth", provider: "Frontend Masters", hours: 18 },
  { id: "co_node_apis", name: "Building APIs with Node.js", provider: "Udemy", hours: 12 },
  { id: "co_system_design_primer", name: "System Design Primer", provider: "Educative", hours: 25 },
  { id: "co_sql_essentials", name: "SQL Essentials", provider: "DataCamp", hours: 10 },
  { id: "co_python_data", name: "Python for Data Analysis", provider: "DataCamp", hours: 22 },
  { id: "co_ml_foundations", name: "Machine Learning Foundations", provider: "Coursera", hours: 40 },
  { id: "co_deep_learning_spec", name: "Deep Learning Specialization", provider: "Coursera", hours: 60 },
  { id: "co_graph_thinking", name: "Graph Thinking for Engineers", provider: "CognoDB Academy", hours: 8 },
  { id: "co_docker_k8s", name: "Docker & Kubernetes Bootcamp", provider: "Udemy", hours: 20 },
  { id: "co_aws_solutions", name: "AWS Solutions Architect Prep", provider: "A Cloud Guru", hours: 30 },
  { id: "co_ux_research_101", name: "UX Research Fundamentals", provider: "IDEO U", hours: 14 },
  { id: "co_ui_systems", name: "Design Systems & UI", provider: "DesignLab", hours: 16 },
  { id: "co_leading_teams", name: "Leading Technical Teams", provider: "Reforge", hours: 12 },
];

const courseTeaches = [
  ["co_web_foundations", "sk_html_css"],
  ["co_modern_js", "sk_javascript"],
  ["co_react_deep", "sk_react"],
  ["co_react_deep", "sk_typescript"],
  ["co_node_apis", "sk_node"],
  ["co_node_apis", "sk_api_design"],
  ["co_system_design_primer", "sk_system_design"],
  ["co_sql_essentials", "sk_sql"],
  ["co_python_data", "sk_python"],
  ["co_python_data", "sk_pandas"],
  ["co_ml_foundations", "sk_stats"],
  ["co_ml_foundations", "sk_ml"],
  ["co_deep_learning_spec", "sk_dl"],
  ["co_graph_thinking", "sk_graph_db"],
  ["co_docker_k8s", "sk_docker"],
  ["co_docker_k8s", "sk_k8s"],
  ["co_aws_solutions", "sk_aws"],
  ["co_ux_research_101", "sk_ux_research"],
  ["co_ui_systems", "sk_ui_design"],
  ["co_ui_systems", "sk_prototyping"],
  ["co_leading_teams", "sk_leadership"],
];

const careers = [
  { id: "ca_frontend_eng", name: "Frontend Engineer", level: "Mid" },
  { id: "ca_backend_eng", name: "Backend Engineer", level: "Mid" },
  { id: "ca_data_scientist", name: "Data Scientist", level: "Mid" },
  { id: "ca_ml_engineer", name: "Machine Learning Engineer", level: "Senior" },
  { id: "ca_devops_eng", name: "DevOps Engineer", level: "Mid" },
  { id: "ca_product_designer", name: "Product Designer", level: "Mid" },
  { id: "ca_eng_manager", name: "Engineering Manager", level: "Senior" },
];

const careerRequires = [
  ["ca_frontend_eng", "sk_html_css", "core"],
  ["ca_frontend_eng", "sk_javascript", "core"],
  ["ca_frontend_eng", "sk_react", "core"],
  ["ca_frontend_eng", "sk_typescript", "nice-to-have"],

  ["ca_backend_eng", "sk_node", "core"],
  ["ca_backend_eng", "sk_api_design", "core"],
  ["ca_backend_eng", "sk_sql", "core"],
  ["ca_backend_eng", "sk_system_design", "nice-to-have"],

  ["ca_data_scientist", "sk_python", "core"],
  ["ca_data_scientist", "sk_pandas", "core"],
  ["ca_data_scientist", "sk_stats", "core"],
  ["ca_data_scientist", "sk_data_viz", "nice-to-have"],

  ["ca_ml_engineer", "sk_python", "core"],
  ["ca_ml_engineer", "sk_ml", "core"],
  ["ca_ml_engineer", "sk_dl", "core"],
  ["ca_ml_engineer", "sk_stats", "core"],

  ["ca_devops_eng", "sk_docker", "core"],
  ["ca_devops_eng", "sk_k8s", "core"],
  ["ca_devops_eng", "sk_aws", "core"],
  ["ca_devops_eng", "sk_ci_cd", "nice-to-have"],

  ["ca_product_designer", "sk_ux_research", "core"],
  ["ca_product_designer", "sk_ui_design", "core"],
  ["ca_product_designer", "sk_prototyping", "core"],
  ["ca_product_designer", "sk_product_sense", "nice-to-have"],

  ["ca_eng_manager", "sk_system_design", "core"],
  ["ca_eng_manager", "sk_leadership", "core"],
  ["ca_eng_manager", "sk_api_design", "nice-to-have"],
];

const companies = [
  { id: "cp_northwind", name: "Northwind Labs", industry: "Fintech" },
  { id: "cp_helio", name: "Helio Robotics", industry: "Robotics" },
  { id: "cp_brightpath", name: "BrightPath Health", industry: "Healthtech" },
  { id: "cp_cognoware", name: "Cognoware", industry: "Developer Tools" },
  { id: "cp_marketleaf", name: "MarketLeaf", industry: "E-commerce" },
];

const companyHires = [
  ["cp_northwind", "ca_backend_eng"],
  ["cp_northwind", "ca_data_scientist"],
  ["cp_helio", "ca_ml_engineer"],
  ["cp_helio", "ca_devops_eng"],
  ["cp_brightpath", "ca_data_scientist"],
  ["cp_brightpath", "ca_product_designer"],
  ["cp_cognoware", "ca_backend_eng"],
  ["cp_cognoware", "ca_frontend_eng"],
  ["cp_cognoware", "ca_eng_manager"],
  ["cp_marketleaf", "ca_frontend_eng"],
  ["cp_marketleaf", "ca_devops_eng"],
];

const people = [
  { id: "pe_amara", name: "Amara Chen", currentRole: "Junior Frontend Developer" },
  { id: "pe_dilnoza", name: "Dilnoza Karimova", currentRole: "Data Analyst" },
  { id: "pe_felix", name: "Felix Ortega", currentRole: "Backend Developer" },
  { id: "pe_grace", name: "Grace Mwangi", currentRole: "UX Designer" },
  { id: "pe_ravi", name: "Ravi Subramaniam", currentRole: "DevOps Intern" },
  { id: "pe_sam", name: "Sam Whitfield", currentRole: "Product Analyst" },
  { id: "pe_lena", name: "Lena Novak", currentRole: "ML Research Assistant" },
  { id: "pe_tomas", name: "Tomas Andrade", currentRole: "Backend Developer" },
];

const personSkills = [
  ["pe_amara", "sk_html_css", "advanced"],
  ["pe_amara", "sk_javascript", "intermediate"],
  ["pe_amara", "sk_ux_research", "beginner"],

  ["pe_dilnoza", "sk_sql", "advanced"],
  ["pe_dilnoza", "sk_python", "intermediate"],
  ["pe_dilnoza", "sk_pandas", "intermediate"],

  ["pe_felix", "sk_node", "advanced"],
  ["pe_felix", "sk_sql", "advanced"],
  ["pe_felix", "sk_api_design", "intermediate"],
  ["pe_felix", "sk_docker", "beginner"],

  ["pe_grace", "sk_ux_research", "advanced"],
  ["pe_grace", "sk_ui_design", "advanced"],
  ["pe_grace", "sk_html_css", "beginner"],

  ["pe_ravi", "sk_docker", "intermediate"],
  ["pe_ravi", "sk_sql", "beginner"],

  ["pe_sam", "sk_sql", "intermediate"],
  ["pe_sam", "sk_data_viz", "intermediate"],
  ["pe_sam", "sk_product_sense", "beginner"],

  ["pe_lena", "sk_python", "advanced"],
  ["pe_lena", "sk_stats", "advanced"],
  ["pe_lena", "sk_pandas", "intermediate"],

  ["pe_tomas", "sk_node", "intermediate"],
  ["pe_tomas", "sk_sql", "intermediate"],
  ["pe_tomas", "sk_javascript", "advanced"],
];

const personWorksAt = [
  ["pe_amara", "cp_marketleaf"],
  ["pe_felix", "cp_cognoware"],
  ["pe_grace", "cp_brightpath"],
  ["pe_ravi", "cp_helio"],
  ["pe_sam", "cp_marketleaf"],
  ["pe_lena", "cp_helio"],
  ["pe_tomas", "cp_northwind"],
];

module.exports = {
  skills,
  prerequisites,
  courses,
  courseTeaches,
  careers,
  careerRequires,
  companies,
  companyHires,
  people,
  personSkills,
  personWorksAt,
};
