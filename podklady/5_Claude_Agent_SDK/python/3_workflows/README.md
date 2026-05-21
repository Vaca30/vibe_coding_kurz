# Workflow Patterns

Four execution patterns for orchestrating AI agents. Each pattern solves a different coordination problem.

## 1. Sequential Workflow

A linear pipeline where the output of one agent becomes the input to the next.

```mermaid
graph LR
    A[Research Agent] -->|findings| B[Analysis Agent]
    B -->|analysis| C[Summary Agent]
    C -->|executive summary| D((Result))
```

**Example:** Research the benefits of Python's asyncio, analyze the findings, then produce an executive summary.

**When to use:** Tasks with clear, dependent stages where each step needs the previous step's output.

```bash
python 1_sequential_workflow.py
```

---

## 2. Parallel Workflow (Fan-Out / Fan-In)

Multiple specialist agents analyze the same problem simultaneously from different angles, then a synthesis agent aggregates the results.

```mermaid
graph TD
    T[Task] --> FO{Fan-Out}
    FO --> S1[Technical Specialist]
    FO --> S2[Business Specialist]
    FO --> S3[Security Specialist]
    FO --> S4[UX Specialist]
    S1 --> FI{Fan-In}
    S2 --> FI
    S3 --> FI
    S4 --> FI
    FI --> SY[Synthesis Agent]
    SY --> R((Result))
```

**Example:** Analyze "adopting microservices architecture" from four perspectives (technical, business, security, UX) in parallel, then synthesize into a unified report.

**When to use:** Multi-perspective analysis where specialists are independent and can run concurrently. Uses `anyio.create_task_group()` for parallel execution.

```bash
python 2_parallel_workflow.py
```

---

## 3. Conditional Workflow (IF/ELSE Routing)

A classifier agent categorizes the request, then routes it to the appropriate specialized handler.

```mermaid
graph TD
    I[User Request] --> C[Classifier Agent]
    C -->|TECHNICAL| T[Technical Handler]
    C -->|CREATIVE| CR[Creative Handler]
    C -->|ANALYTICAL| AN[Analytical Handler]
    C -->|OTHER| G[General Handler]
    T --> R((Result))
    CR --> R
    AN --> R
    G --> R
```

**Example:** The classifier categorizes requests like "write a Fibonacci function" (TECHNICAL), "write a story about a robot" (CREATIVE), or "analyze remote vs office work" (ANALYTICAL), then routes to the matching handler.

**When to use:** Requests that need different treatment depending on their nature. The classifier determines the path, and only one handler runs.

```bash
python 3_conditional_workflow.py
```

---

## 4. Loop Workflow (Iterative Refinement)

An agent generates content, an evaluator scores it, and if the quality threshold isn't met, a refiner improves it. The loop repeats until the score is acceptable or max iterations are reached.

```mermaid
graph TD
    G[Generator Agent] -->|initial content| E{Evaluator Agent}
    E -->|score >= 80| D((Result))
    E -->|score < 80 + feedback| R[Refiner Agent]
    R -->|improved content| E
    E -->|max iterations reached| D
```

**Example:** Generate a technical blog post introduction, evaluate its quality (score 0-100), refine based on feedback, repeat until score >= 80 or 5 iterations.

**When to use:** Tasks where quality is measurable and iterative improvement is possible. The evaluator provides structured feedback (score + suggestions) that guides refinement.

```bash
python 4_loop_workflow.py
```
