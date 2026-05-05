# 02_ukol - Nastaveni kodovaciho agenta

Tento ukol sdili navrh nastaveni kodovaciho agenta pro **Codex** i **Claude Code**. Vychazi z kurzovych podkladu v `podklady/2_Codex`, `podklady/3_Codex_SDK`, `podklady/4_Claude_Code` a `podklady/5_Claude_Agent_SDK`.

Reseni pouziva:

- repository instrukce pro hlavniho agenta,
- MCP servery,
- skills,
- subagenty,
- guardrails pro bezpecnost a kontrolu kvality.

Plugins ani marketplace nejsou pouzite, protoze jsou v zadani zakazane.

## Obsah

```text
02_ukol/
├── README.md
├── agent-setup.elements.json
├── agent-setup.png
├── codex/
│   ├── AGENTS.md
│   ├── .codex/
│   │   ├── config.toml
│   │   └── agents/
│   │       ├── dead-code-analyzer.toml
│   │       └── qa-reviewer.toml
│   └── .agents/
│       └── skills/
│           └── repo-audit/
│               └── SKILL.md
└── claude-code/
    ├── CLAUDE.md
    ├── .mcp.json
    └── .claude/
        ├── settings.json
        ├── agents/
        │   ├── dead-code-analyzer.md
        │   └── qa-reviewer.md
        └── skills/
            └── repo-audit/
                └── SKILL.md
```

## Zvolene nastaveni

### 1. Instrukce agenta

Hlavni instrukce jsou ulozene v:

- `codex/AGENTS.md`
- `claude-code/CLAUDE.md`

Obsahuji pravidla pro praci v repozitari: nejmensi rozumny rozsah zmen, ochranu existujicich user zmen, spousteni testu, praci bez secretnu v commitech a zasadni pravidlo, ze agent necommitne bez vyslovneho pokynu.

### 2. MCP servery

Codex konfigurace je v `codex/.codex/config.toml`, Claude Code konfigurace v `claude-code/.mcp.json`.

Pouzite MCP servery:

- `playwright` pro browser automatizaci a vizualni kontrolu,
- `excalidraw-canvas` jako lokalni Docker MCP/canvas server na `http://localhost:3000`.

V tomto vypracovani byl lokalni Docker kontejner `mcp-excalidraw-canvas` overen pres Docker a jeho health endpoint. Diagram `agent-setup.elements.json` byl importovan do Excalidraw canvas serveru a vyexportovan jako `agent-setup.png`.

### 3. Skills

Skill `repo-audit` je ukazkovy filesystem skill pro predavaci checklist pred odevzdanim. Je ulozeny oddelene pro oba agenty:

- `codex/.agents/skills/repo-audit/SKILL.md`
- `claude-code/.claude/skills/repo-audit/SKILL.md`

Skill se ma pouzit pri dotazech typu "zkontroluj repo pred odevzdanim", "udelat audit" nebo "overit ukol".

### 4. Subagenti

Reseni definuje dva subagenty:

- `dead-code-analyzer` - read-only analyza nepouziteho kodu bez uprav,
- `qa-reviewer` - kontrola zadani, testovacich poznamek a rizik pred commitem.

U Codexu jsou subagenti v `codex/.codex/agents/*.toml`, u Claude Code v `claude-code/.claude/agents/*.md`.

### 5. Guardrails

Nastaveni pouziva princip nejmensich opravneni:

- hlavni agent muze menit workspace, ale destructive prikazy vyzaduji opatrnost,
- analyzator mrtveho kodu je read-only,
- QA subagent je read-only,
- MCP nastroje jsou povolene jen podle potreby,
- secrety se zapisuji pres environment promenne, ne napevno do konfigurace.

Kurzove podklady obsahovaly ukazky s `danger-full-access`; v tomto ukolu je produkcnejsi varianta nastavena konzervativneji.

## Jak bych to pouzil v praxi

1. Do repozitare zkopiruji odpovidajici konfiguraci pro vybraneho agenta.
2. Doplnim environment promenne, napr. `TAVILY_API_KEY`, pokud pouziju externi MCP server.
3. Spustim agenta v rootu repozitare, aby nacetl `AGENTS.md` nebo `CLAUDE.md`.
4. Pro vizualni/browser workflow povolim Playwright MCP.
5. Pro kontrolu pred odevzdanim zavolam `repo-audit` skill a podle potreby subagenta `qa-reviewer`.

## Overeni

Pri zpracovani bylo overeno:

- dostupnost lokalniho Docker kontejneru `mcp-excalidraw-canvas`,
- health endpoint `http://localhost:3000/health`,
- import a PNG export diagramu pres lokalni Excalidraw canvas,
- syntakticka validita JSON konfiguraci,
- syntakticka kontrola TOML konfiguraci pres Python `tomllib`,
- kontrola, ze reseni nevytvari zadne plugin/marketplace adresare ani manifesty; zakaz je uvedeny jen jako pravidlo v instrukcich.
