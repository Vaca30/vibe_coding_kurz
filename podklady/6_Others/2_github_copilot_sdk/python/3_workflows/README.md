# Workflow patterns

Four common ways to wire multiple agent calls together. Each file is
self-contained — pick the one that matches your problem shape:

| File                          | Shape                                                                        | Good for                                                |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| `1_sequential_workflow.py`    | A → B → C                                                                    | Stages with strict dependencies                         |
| `2_parallel_workflow.py`      | (A ∥ B ∥ C ∥ D) → synthesis                                                  | Independent multi-perspective analysis                  |
| `3_conditional_workflow.py`   | classifier → one of {A, B, C, D}                                             | Routing requests to specialists                         |
| `4_loop_workflow.py`          | generate → evaluate → (refine if score < threshold) → ...                    | Iterative refinement with quality gating                |

Run any of them with `python 3_workflows/<file>.py`.

The patterns here use the **session** primitive directly rather than custom
agents — both work, but for plain orchestration code one fresh session per
"role" is the simplest mental model.
