export const MASTER_RESUME = {
  personalInfo: {
    name: "Pavan Krishna",
    headline: "Software Development Engineer | PostgreSQL Engine & Performance | Distributed Systems",
    email: "kp302165@gmail.com",
    phone: "7797070761",
    location: "United States"
  },
  summary: "Software Development Engineer with 3+ years of experience building high-performance, data-intensive database systems and scalable distributed architectures. Expert in C, Java, and PostgreSQL engine internals, with a proven track record of translating complex requirements into reliable, multi-threaded engine features and core-level extensions. Specialized in contributing to open-source PostgreSQL core and optimizing database performance through rigorous benchmarking, patch reviews, and kernel-level fixes.",
  skillCategories: [
    { name: "Systems & Programming", skills: "C (Core Competency), C++, Java (Expert), SQL, Python, Perl, JavaScript, TypeScript" },
    { name: "Database Internals", skills: "PostgreSQL Engine Internals, Query Plan Analysis, PostgreSQL Benchmarking, Workload Tuning, Indexing Strategies, Concurrency Control" },
    { name: "Distributed Systems", skills: "Multi-threaded Development, Microservices, Scalability & Reliability Design, RESTful Web Services, Object-Oriented Design (OOD)" },
    { name: "DevOps & Tools", skills: "Git/GitHub, Patch Review, GDB (Debugging), Docker, Jenkins, CI/CD Pipelines, Maven, Linux/Unix Systems" }
  ],
  experience: [
    {
      company: "Renasant Bank",
      role: "Full Stack Software Engineer",
      location: "Tupelo, MS",
      period: "Jan 2025 - Present",
      bullets: [
        "Lead the design and development of high-performance system modules for large-scale, multi-tiered banking systems supporting high-throughput PostgreSQL transactional workloads.",
        "Integrated complex RESTful services with PostgreSQL-backed data layers to ensure seamless data synchronization and consistency across distributed environments.",
        "Optimized database interaction performance and query execution strategies, reducing system latency by 25% through deep-dive query plan analysis and workload tuning.",
        "Developed scalable, multi-threaded backend components using Java and C-based logic, ensuring high availability and reliability.",
        "Collaborated in architectural discussions focused on database engine reliability, scalability, and fault tolerance."
      ]
    },
    {
      company: "Wipro Limited",
      role: "Software Engineer",
      location: "India",
      period: "Jun 2021 - Sep 2023",
      bullets: [
        "Designed and developed high-performance distributed systems for large-scale, multi-tiered architectures, ensuring optimized interaction with PostgreSQL and MySQL.",
        "Optimized PostgreSQL workloads through deep-dive query plan analysis, indexing strategies, and benchmarking efforts.",
        "Built and maintained high-volume transactional systems supporting distributed backend services, focusing on data integrity.",
        "Implemented backend performance enhancements and database-level optimizations that significantly increased system throughput.",
        "Leveraged Git-based workflows and CI/CD pipelines to manage complex deployments and maintain release quality."
      ]
    }
  ],
  projects: [
    {
      title: "AI-Powered Developer Assistance Platform",
      tech: "Kafka, Spark, Airflow, Iceberg, Trino",
      bullets: [
        "Engineered a real-time fraud detection pipeline processing high-volume transaction streams using Apache Kafka and Spark Structured Streaming.",
        "Built streaming ETL workflows orchestrated with Apache Airflow for fraud risk computation and analytics reporting.",
        "Integrated lakehouse architecture (Iceberg/Delta Lake) with Trino for scalable data querying."
      ]
    }
  ],
  education: [
    { school: "Roosevelt University", degree: "Master of Science - Computer Science", period: "Sep 2023 - Dec 2024" },
    { school: "Hindustan Institute Of Technology & Science", degree: "Bachelor of Technology - Computer Science", period: "Jun 2018 - May 2022" }
  ]
};