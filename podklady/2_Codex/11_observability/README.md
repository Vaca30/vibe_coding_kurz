No tracing observability. Only logs.

Here's the important nuance — Codex emits OTel logs/events, not OTel traces/spans. openai The exporter options are described in the context of "log export" and the endpoint paths reference /v1/logs. Meanwhile, Langfuse's OTLP endpoint is designed to receive traces (spans), and the signal-specific endpoint is /api/public/otel/v1/traces. 

This is the same issue that came up in the earlier Langfuse GitHub discussion — the community found that the direct Claude Code → OTel → Langfuse path didn't work because the tool emits OTel logs, but Langfuse is essentially an OTel trace visualizer. GitHub Codex CLI has the same architecture.