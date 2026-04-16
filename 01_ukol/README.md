# 01_ukol – Tool calling

Tento skript zavolá OpenAI LLM, nechá model spustit výpočetní funkci a následně vrátí odpověď zpět modelu pro finální shrnutí.

## Požadavky

- Python 3.12+
- OpenAI API klíč

## Nastavení

Zkopírujte `.env.example` do `.env` a doplňte API klíč:

```bash
copy .env.example .env
```

## Spuštění

### Spuštění přes uv

```bash
uv run main.py
```

### Spuštění přes venv

```bash
uv venv
```

```bash
source .venv/bin/activate
```

```bash
uv sync
```

```bash
python main.py
```

Skript vypíše první odpověď modelu, spustí výpočet a následně vytiskne finální odpověď.