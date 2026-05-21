# AI Code Review & Improvement System

Dobrovolný úkol 1 z kurzu vibe codingu – praktická ukázka orchestrace agentů pomocí **Claude Agent SDK**.

## Vzory orchestrace

| Vzor | Popis |
|------|-------|
| **Supervisor** (multi-agent) | Supervisor řídí pipeline přes strukturovaný JSON výstup, deleguje úkoly specializovaným subagentům |
| **Parallel** (workflow) | 3 revieweři běží paralelně (fan-out přes `anyio.create_task_group`) a výsledky jsou agregované (fan-in) |

## Diagram architektury

```
main.py  ──►  CodeReviewSupervisor
                     │
                     │  Iteration 1: "run_reviews"
                     ├─────────────────────────────────────────
                     │         PHASE 1 – PARALLEL (fan-out)
                     │  ┌──────────────────────────────────┐
                     │  │  SecurityReviewer     (Read, Grep) │
                     │  │  PerformanceReviewer  (Read, Grep) │  → simultánně
                     │  │  CodeQualityReviewer  (Read, Grep) │
                     │  └──────────────────────────────────┘
                     │         fan-in: agregace výsledků
                     │
                     │  Iteration 2: "fix_code"
                     ├─────────────────────────────────────────
                     │         PHASE 2 – SEQUENTIAL
                     │  FixerAgent  (Read, Write, Edit)
                     │  → implementuje opravy → output/fixed_*.py
                     │
                     │  Iteration 3: "write_report"
                     ├─────────────────────────────────────────
                     │         PHASE 3 – SEQUENTIAL
                     │  ReportWriter  (Read, Write)
                     │  → generuje report → output/review_report.md
                     │
                     │  Iteration 4: "finish"
                     └─────────────────────────────────────────
                               pipeline dokončen
```

## Praktické využití

Code review je každodenní součástí vývojářské práce. Tento systém automatizuje:
- **Bezpečnostní analýzu** – SQL injection, resource leaky, unsafe input handling
- **Výkonnostní analýzu** – algoritmická složitost, nadbytečné operace
- **Analýzu kvality kódu** – type hints, error handling, Pythonic idiomy
- **Automatické opravy** – na základě doporučení reviewerů
- **Strukturovaný report** – markdown dokument pro tým nebo archiv

## Instalace

```bash
cd dobrovolny_ukol_1
uv sync
```

Vyžaduje Python 3.10+ a [uv](https://github.com/astral-sh/uv).

## Spuštění

```bash
# Na přiloženém ukázkovém souboru s úmyslnými chybami
uv run python main.py sample_buggy.py

# Na vlastním souboru
uv run python main.py path/to/your_file.py
```

## Výstup

Po spuštění jsou v adresáři `output/` dva soubory:

```
output/
├── fixed_sample_buggy.py    # Opravená verze kódu
└── review_report.md         # Strukturovaný markdown report
```

### Ukázka report struktury

```markdown
# AI Code Review Report

## Executive Summary
...

## Security Findings
- SQL injection na řádku 12 (string concatenation)
- Resource leak v read_config() – file není uzavřen při výjimce
...

## Performance Findings
- find_duplicates(): O(n²) → doporučeno použít set pro O(n)
...

## Code Quality Findings
- Chybí type hints ve všech funkcích
- Variable shadowing v process_records()
...

## Changes Implemented
...

## Recommendations
...
```

## Struktura projektu

```
dobrovolny_ukol_1/
├── README.md           # Tato dokumentace
├── pyproject.toml      # Závislosti (claude-agent-sdk, anyio)
├── main.py             # CLI entry point
├── review_system.py    # Jádro: CodeReviewSupervisor + definice agentů
├── sample_buggy.py     # Ukázkový Python kód s úmyslnými chybami
└── output/             # Generovaný výstup (fixed kód + report)
```

## Použité technologie

- **Claude Agent SDK** (`claude-agent-sdk`) – orchestrace AI agentů
- **anyio** – asynchronní paralelní spuštění (task groups)
- **Claude Sonnet** – model pro všechny agenty

## Agenti a jejich nástroje

| Agent | Specializace | Nástroje | Vzor |
|-------|-------------|----------|------|
| SecurityReviewer | Bezpečnostní zranitelnosti | Read, Grep | Parallel |
| PerformanceReviewer | Výkonnostní problémy | Read, Grep | Parallel |
| CodeQualityReviewer | Kvalita a styl kódu | Read, Grep | Parallel |
| FixerAgent | Implementace oprav | Read, Write, Edit | Sequential |
| ReportWriter | Markdown report | Read, Write | Sequential |
| Supervisor | Řízení pipeline | – | Control loop |
