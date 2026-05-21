---
description: "Step 7: Report — summarize what was done, tested, and documented"
---

# Step 7: Report

Provide a short summary to the user:
- What was changed (chart name, overlay, values keys, manifest kinds touched)
- What was tested and what you observed (`kubectl rollout status` output, curl HTTP codes, relevant log lines)
- Current cluster state (release revision after `helm upgrade`, namespaces affected, any resources left in a transient state)
- Whether `README.md` or in-chart docs needed updating (or why they were skipped)
