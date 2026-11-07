# Subsystem Specification: Team 04 - CodeArena (Algorithmic Judge & Compiler Sandbox)

## 1. Executive Summary & Functional Scope
CodeArena is the cloud-native coding, competitive programming, and automated evaluation platform for computer science courses at Chanakya University. Engineered with secure gVisor container sandboxing, CodeArena delivers automated testcase execution across Python, C++, Java, and Go, coupled with AST token normalization for industrial-grade plagiarism detection.

### Key Capabilities
- **Monaco Browser IDE**: Fully featured code editor with syntax highlighting, auto-completion, line numbers, and theme support.
- **gVisor Container Sandbox**: High-security isolated microVM environments running user code with zero external network connectivity, deterministic CPU quotas (1.0 core), and memory ceilings (256 MB).
- **Plagiarism Forensics Engine**: Abstract Syntax Tree (AST) token serialization and Winnowing fingerprinting algorithm comparing student submissions against previous year corpora.
- **Contest Leaderboard**: Real-time rank aggregation based on problem weight, execution time, memory usage, and penalty minutes.

---

## 2. Component Hierarchy & Module Layout
```
src/modules/team04_codearena/
|-- components/
|   |-- CodeEditor.tsx           # Monaco code editing interface with language selector
|   |-- TestCaseRunner.tsx       # Standard input/output runner with diff assertions
|   |-- PlagiarismDetector.tsx   # AST token similarity engine and comparison diff
|   \-- ContestLeaderboard.tsx   # Dynamic scoreboard with testcase benchmarks
|-- services/
|   \-- codeArenaService.ts      # Sandbox dispatch service with queue throttling
|-- types/
|   \-- codearena.types.ts       # Programming problem and submission definitions
|-- index.tsx                    # Subsystem entrypoint with ModuleErrorBoundary
\-- README.md                    # Technical specification and onboarding guide
```

---

## 3. Normalized Database Schema (PostgreSQL 16)
```sql
CREATE TABLE codearena_problems (
    problem_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(128) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    difficulty VARCHAR(16) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    time_limit_ms INT DEFAULT 1000,
    memory_limit_mb INT DEFAULT 256,
    problem_statement TEXT NOT NULL,
    input_format TEXT NOT NULL,
    output_format TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE codearena_testcases (
    testcase_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES codearena_problems(problem_id) ON DELETE CASCADE,
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    weight INT DEFAULT 1
);

CREATE TABLE codearena_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID REFERENCES codearena_problems(problem_id),
    student_id UUID NOT NULL,
    language VARCHAR(16) NOT NULL CHECK (language IN ('PYTHON3', 'CPP20', 'JAVA17', 'GO')),
    source_code TEXT NOT NULL,
    verdict VARCHAR(32) DEFAULT 'PENDING' CHECK (verdict IN ('ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'PLAGIARISM_FLAGGED')),
    passed_testcases INT DEFAULT 0,
    total_testcases INT DEFAULT 0,
    max_runtime_ms INT DEFAULT 0,
    max_memory_mb INT DEFAULT 0,
    ast_hash VARCHAR(64),
    plagiarism_score NUMERIC(5, 2) DEFAULT 0.0,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API Specification & Network Contracts
### REST & Execution Endpoints
- `POST /api/v1/codearena/run`
  - **Payload**: `{"language": "PYTHON3", "source_code": "...", "custom_input": "5\n1 2 3 4 5"}`
  - **Response 200**: `{"stdout": "15\n", "stderr": "", "execution_time_ms": 42, "memory_mb": 14.2, "status": "SUCCESS"}`
- `POST /api/v1/codearena/submit`
  - **Payload**: `{"problem_id": "...", "language": "CPP20", "source_code": "..."}`
  - **Response 200**: `{"submission_id": "...", "verdict": "ACCEPTED", "passed": 10, "total": 10, "runtime_ms": 18}`
- `POST /api/v1/codearena/plagiarism-audit`
  - **Auth**: Bearer JWT (Role: `FACULTY`, `SUPER_ADMIN`)
  - **Response 200**: Pairwise similarity matrices identifying shared code fragments.

---

## 5. Resilience & Fault-Isolation Architecture
- **Sandboxing Boundaries**: Fork bombs, network sockets, and unprivileged system calls are blocked by seccomp filters. If a student writes an infinite loop or allocates excessive RAM, only the ephemeral runner terminates.
- **Client Cache**: Unsubmitted editor code is saved continuously to `cu_mod_codearena_draft_*`.
