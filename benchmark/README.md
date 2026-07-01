# Micro-Benchmarking & Performance Suite

This directory contains benchmarking scripts and throughput statistics for the NEXUS pipeline.

## Throughput Standards
To maintain standard processing capacities of **10,000+ events/second** per consumer thread, our custom TypeScript execution engine is audited for performance across two key axes:

1. **Broker Ingestion Latency**: The round-trip write/read overhead for event streams.
2. **Model Inference Latency**: The execution speed of GBDT and Isolation Forest scoring logic combined.

## Run Benchmarks
You can run the standalone performance benchmark suite locally using:

```bash
# Execute local micro-benchmarks
npx tsx benchmark/benchmark_runner.ts
```

## Production Latency Profile
* **System CPU Overhead**: ~4% to 9% during active high-speed streaming
* **Inference Speed**: `< 0.8ms` per transaction event
* **Memory Buffer Envelope**: `< 160MB` standard RSS footprint
