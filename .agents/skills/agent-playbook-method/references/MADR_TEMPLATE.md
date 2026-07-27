# MADR 3.0 Standardized ADR Template

Use this golden-path template when creating new Architectural Decision Records in `.wiki/adr/MEOW-XXX-<topic>.md`.

---

\`\`\`markdown
# MEOW-XXX: [Short Title of Decision]

Status: [PROPOSED | ACCEPTED | REJECTED | DEPRECATED | SUPERSEDED]
Date: YYYY-MM-DD
Author: ACC / MEOW Core Architecture Group
Implementing Surfaces:
  - \`src/core/path/to/surface.ts\`
  - \`broccolidb/core/agent-context/...\`

---

## 1. Context & Motivation (The Why)

### Problem Statement
Clear explanation of the real-world operational problem, failure mode, or scaling bottleneck being addressed.

### Operational Drivers
- Driver 1: Hard limits or failure modes observed.
- Driver 2: Performance, correctness, or safety invariants required.

---

## 2. Decision & Architecture (The What)

### Architectural Invariants
Clear specification of guaranteed state boundaries, operational contracts, and invariants.

### Decision Outcome
We decided to implement:
1. Feature/Mechanism 1: Description of contract.
2. Feature/Mechanism 2: Description of behavior.

---

## 3. Technical Implementation (The How)

### File Mappings & Monolith Surfaces
- Monolith: \`src/core/path/to/monolith.ts\`
- Adapters: \`src/core/path/to/adapter.ts\`

### Code Signature / Schema Migration
\`\`\`typescript
// Primary TypeScript interface or method signature
\`\`\`

---

## 4. Consequences & Verification

### Trade-offs & Guarantees
- Positive: Benefits gained.
- Negative: Additional complexity or overhead incurred.

### Automated Validation Commands
\`\`\`bash
npm test
npm run audit:adr
npm run test:guardrails && npm run build
\`\`\`
\`\`\`
