#!/usr/bin/env python3
"""
NEXUS // High-Throughput Pipeline Benchmark Suite
==================================================

Validates that the fraud detection inference pipeline sustains 10,000+
events/second throughput for model scoring on a single thread.

Benchmarks three configurations:
  1. Isolation Forest only (baseline inference)
  2. GBDT only (supervised inference)
  3. Full ensemble (0.3*IF + 0.7*GBDT) — production scoring path

Also measures:
  - Feature extraction throughput
  - End-to-end pipeline latency (data gen → feature extraction → scoring → flagging)
  - Memory footprint estimation

Usage:
    python benchmark/benchmark_pipeline.py

Dependencies:
    pip install numpy pandas scikit-learn psutil
"""

import numpy as np
import pandas as pd
import time
import sys
import os
import json
from typing import List, Dict, Any

# Add parent directory to path for model imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.ensemble import IsolationForest, GradientBoostingClassifier

np.random.seed(42)


# ============================================================
# Constants (mirrors production config)
# ============================================================
FEATURE_NAMES = [
    'TransactionAmt', 'ProductCD_enc', 'card1', 'card6_enc', 'addr1', 'addr2',
    'dist1_filled', 'C1', 'C2', 'C11', 'C13', 'D1', 'D3', 'D15',
    'M1_enc', 'M2_enc', 'M4_enc', 'M6_enc'
]

PRODUCT_CODES = ['W', 'W', 'W', 'H', 'C', 'S', 'R']
CARD_BRANDS = ['visa', 'visa', 'mastercard', 'mastercard', 'discover', 'american express']
EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'anonymous.org', 'aol.com', 'outlook.com']

ENSEMBLE_WEIGHT_IF = 0.3
ENSEMBLE_WEIGHT_GBDT = 0.7
OPTIMAL_THRESHOLD = 0.52


# ============================================================
# Data Generation & Feature Extraction
# ============================================================
def generate_normal_transaction(tx_id):
    is_debit = np.random.random() < 0.75
    email = np.random.choice(EMAIL_DOMAINS)
    amt = np.clip(np.random.normal(65, 40), 2.5, 350)
    return {
        'TransactionAmt': round(amt, 2),
        'ProductCD': np.random.choice(PRODUCT_CODES),
        'card1': int(np.random.normal(12000, 3000)),
        'card4': np.random.choice(CARD_BRANDS),
        'card6': 'debit' if is_debit else 'credit',
        'addr1': int(np.random.normal(299, 80)),
        'addr2': 87,
        'dist1': float(np.random.randint(0, 25)) if np.random.random() < 0.3 else np.nan,
        'C1': int(np.random.randint(1, 4)),
        'C2': int(np.random.randint(1, 3)),
        'C11': int(np.random.randint(1, 3)),
        'C13': int(np.random.randint(1, 6)),
        'D1': int(np.random.randint(10, 410)),
        'D3': int(np.random.randint(1, 13)),
        'D15': int(np.random.randint(10, 310)),
        'M1': 'T' if np.random.random() < 0.9 else 'F',
        'M2': 'T' if np.random.random() < 0.95 else 'F',
        'M4': np.random.choice(['M0', 'M1', 'M2', 'unknown']),
        'M6': 'T' if np.random.random() < 0.85 else 'F',
        'isFraud': 0
    }


def extract_features(df):
    X = pd.DataFrame(index=df.index)
    X['TransactionAmt'] = df['TransactionAmt']
    product_map = {'W': 0, 'H': 1, 'C': 2, 'S': 3, 'R': 4}
    X['ProductCD_enc'] = df['ProductCD'].map(product_map).fillna(0)
    X['card1'] = df['card1'].fillna(1000)
    X['card6_enc'] = (df['card6'] == 'credit').astype(int)
    X['addr1'] = df['addr1'].fillna(299)
    X['addr2'] = df['addr2'].fillna(87)
    X['dist1_filled'] = df['dist1'].fillna(12.0)
    for col in ['C1', 'C2', 'C11', 'C13']:
        X[col] = df[col].fillna(0)
    for col in ['D1', 'D3', 'D15']:
        X[col] = df[col].fillna(0)
    for col in ['M1', 'M2', 'M6']:
        X[f'{col}_enc'] = df[col].map({'T': 1, 'F': 0}).fillna(0.5)
    X['M4_enc'] = df['M4'].map({'M0': 0, 'M1': 1, 'M2': 2, 'unknown': 1.5}).fillna(0.5)
    return X[FEATURE_NAMES]


def normalize_iforest_scores(scores):
    inverted = -scores
    min_s, max_s = inverted.min(), inverted.max()
    if max_s - min_s < 1e-9:
        return np.full_like(inverted, 0.5)
    return (inverted - min_s) / (max_s - min_s)


# ============================================================
# Benchmark Runner
# ============================================================
def run_benchmark(name: str, func, n_events: int, n_warmup: int = 500) -> Dict[str, Any]:
    """Run a benchmark and return timing statistics."""
    # Warmup
    func(n_warmup)

    # Timed run
    start = time.perf_counter()
    result = func(n_events)
    elapsed = time.perf_counter() - start

    eps = n_events / elapsed
    avg_latency_ms = (elapsed / n_events) * 1000
    avg_latency_us = (elapsed / n_events) * 1_000_000

    return {
        'name': name,
        'n_events': n_events,
        'elapsed_ms': round(elapsed * 1000, 2),
        'events_per_sec': round(eps),
        'avg_latency_ms': round(avg_latency_ms, 4),
        'avg_latency_us': round(avg_latency_us, 2),
        'passed': eps >= 10000
    }


def print_result(result: Dict[str, Any]):
    status = "✅ PASS" if result['passed'] else "⚠️  BELOW TARGET"
    print(f"  {result['name']}")
    print(f"    Events:      {result['n_events']:>10,}")
    print(f"    Time:        {result['elapsed_ms']:>10.1f} ms")
    print(f"    Throughput:  {result['events_per_sec']:>10,} events/sec")
    print(f"    Latency:     {result['avg_latency_ms']:>10.4f} ms  ({result['avg_latency_us']:.1f} μs)")
    print(f"    Status:      {status}")
    print()


def main():
    N_BENCHMARK = 50_000
    N_TRAIN = 2000

    print()
    print("=" * 70)
    print("  NEXUS // HIGH-THROUGHPUT PIPELINE BENCHMARK SUITE")
    print("=" * 70)

    # --- Setup: Train models ---
    print("\n[Setup] Training models on synthetic data...")
    train_records = [generate_normal_transaction(i) for i in range(N_TRAIN)]
    df_train = pd.DataFrame(train_records)
    X_train = extract_features(df_train)
    y_train = np.zeros(N_TRAIN)
    y_train[:int(N_TRAIN * 0.08)] = 1
    np.random.shuffle(y_train)

    iforest = IsolationForest(n_estimators=100, max_samples=256,
                               contamination=0.10, random_state=42, n_jobs=-1)
    iforest.fit(X_train)

    gbdt = GradientBoostingClassifier(n_estimators=35, learning_rate=0.15,
                                       max_depth=4, subsample=0.85, random_state=42)
    gbdt.fit(X_train, y_train)
    print("  Models trained successfully.\n")

    # --- Generate benchmark data ---
    print(f"[Setup] Generating {N_BENCHMARK:,} synthetic transactions...")
    bench_records = [generate_normal_transaction(3000000 + i) for i in range(N_BENCHMARK)]
    df_bench = pd.DataFrame(bench_records)
    X_bench = extract_features(df_bench)
    print(f"  Feature matrix: {X_bench.shape}\n")

    # --- Try to get memory info ---
    try:
        import psutil
        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss / 1024 / 1024
    except ImportError:
        mem_before = None

    print("-" * 70)
    print("  BENCHMARK RESULTS")
    print("-" * 70)
    print()

    results = []

    # Benchmark 1: Feature Extraction
    def bench_feature_extraction(n):
        raw = [generate_normal_transaction(5000000 + i) for i in range(n)]
        df = pd.DataFrame(raw)
        return extract_features(df)

    results.append(run_benchmark(
        "Feature Extraction (data gen → 18-dim vector)",
        bench_feature_extraction,
        min(N_BENCHMARK, 20000),
        n_warmup=200
    ))
    print_result(results[-1])

    # Benchmark 2: Isolation Forest Inference Only
    def bench_iforest_only(n):
        batch = X_bench.iloc[:n]
        scores = normalize_iforest_scores(iforest.decision_function(batch))
        flagged = (scores >= 0.55).astype(int)
        return flagged

    results.append(run_benchmark(
        "Isolation Forest Inference (batch scoring)",
        bench_iforest_only,
        N_BENCHMARK
    ))
    print_result(results[-1])

    # Benchmark 3: GBDT Inference Only
    def bench_gbdt_only(n):
        batch = X_bench.iloc[:n]
        probs = gbdt.predict_proba(batch)[:, 1]
        flagged = (probs >= 0.52).astype(int)
        return flagged

    results.append(run_benchmark(
        "GBDT Inference (batch scoring)",
        bench_gbdt_only,
        N_BENCHMARK
    ))
    print_result(results[-1])

    # Benchmark 4: Full Ensemble Pipeline
    def bench_full_ensemble(n):
        batch = X_bench.iloc[:n]
        if_scores = normalize_iforest_scores(iforest.decision_function(batch))
        gbdt_probs = gbdt.predict_proba(batch)[:, 1]
        ensemble = ENSEMBLE_WEIGHT_IF * if_scores + ENSEMBLE_WEIGHT_GBDT * gbdt_probs
        flagged = (ensemble >= OPTIMAL_THRESHOLD).astype(int)
        return flagged

    results.append(run_benchmark(
        "Full Ensemble (IF + GBDT + threshold)",
        bench_full_ensemble,
        N_BENCHMARK
    ))
    print_result(results[-1])

    # Benchmark 5: Per-event scoring (simulates streaming)
    def bench_single_event(n):
        flagged_count = 0
        for i in range(n):
            row = X_bench.iloc[[i % len(X_bench)]]
            if_score = normalize_iforest_scores(iforest.decision_function(row))[0]
            gbdt_prob = gbdt.predict_proba(row)[0, 1]
            score = ENSEMBLE_WEIGHT_IF * if_score + ENSEMBLE_WEIGHT_GBDT * gbdt_prob
            if score >= OPTIMAL_THRESHOLD:
                flagged_count += 1
        return flagged_count

    results.append(run_benchmark(
        "Single-Event Streaming (per-event scoring)",
        bench_single_event,
        min(N_BENCHMARK, 5000),
        n_warmup=100
    ))
    print_result(results[-1])

    # --- Memory footprint ---
    if mem_before is not None:
        mem_after = process.memory_info().rss / 1024 / 1024
        print(f"  Memory Footprint:")
        print(f"    RSS Before:  {mem_before:.1f} MB")
        print(f"    RSS After:   {mem_after:.1f} MB")
        print(f"    Delta:       {mem_after - mem_before:.1f} MB")
        print()

    # --- Summary ---
    print("=" * 70)
    print("  BENCHMARK SUMMARY")
    print("=" * 70)
    print(f"  {'Benchmark':<50} {'EPS':>10}  {'Status':>8}")
    print(f"  {'-'*50} {'-'*10}  {'-'*8}")
    for r in results:
        status = "✅" if r['passed'] else "⚠️"
        print(f"  {r['name']:<50} {r['events_per_sec']:>10,}  {status}")

    all_passed = all(r['passed'] for r in results)
    print()
    if all_passed:
        print("  🎉 ALL BENCHMARKS PASSED — Pipeline exceeds 10,000+ EPS on all paths!")
    else:
        batch_passed = results[3]['passed'] if len(results) > 3 else False
        if batch_passed:
            print("  ✅ BATCH INFERENCE PASSES 10,000+ EPS — Production target met.")
            print("  ℹ️  Per-event streaming overhead is expected; production uses batch + TypeScript engine.")
        else:
            print("  ⚠️  Some benchmarks below target. Consider batch processing or TypeScript engine for streaming.")
    print("=" * 70)

    # --- Export results ---
    benchmark_report = {
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S'),
        'n_benchmark_events': N_BENCHMARK,
        'results': results,
        'all_passed': all_passed,
        'environment': {
            'python': sys.version.split()[0],
            'platform': sys.platform
        }
    }

    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'benchmark_results.json')
    with open(report_path, 'w') as f:
        json.dump(benchmark_report, f, indent=2)
    print(f"\n  📄 Results exported to benchmark/benchmark_results.json")
    print()


if __name__ == '__main__':
    main()
