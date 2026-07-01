# NEXUS Pipeline Visual Documentation & Screenshots

This folder is reserved for UI/UX captures, dashboard charts, and performance diagrams of the NEXUS pipeline. Standard portfolio captures should include:

## Key Screenshot Specifications

1. **`01_live_ingestion_dashboard.png`**
   * **Subject**: The main streaming control dashboard displaying real-time financial transaction streams.
   * **Metrics to highlight**: Stable throughput (eps) indicators, live Kafka/Redis broker lags, memory-buffer stream volume, and flagged threat counters.

2. **`02_ml_version_tuning.png`**
   * **Subject**: The "ML Version Tuning" tab showing a side-by-side comparison of baseline Isolation Forest ($V1.0$, unsupervised) versus the ensembled treatment model ($V2.1$, supervised ensemble).
   * **Metrics to highlight**: The F1-score improvement banner ($+20.8\%$ or greater) and the interactive validation confusion matrices.

3. **`03_ab_testing_evaluator.png`**
   * **Subject**: The live A/B testing tab monitoring randomized incoming traffic (Group A vs Group B).
   * **Metrics to highlight**: Statistically significant False Positive Rate reduction (targeting a $38\%$ reduction in false alarms).

4. **`04_threshold_scan_maximization.png`**
   * **Subject**: The F1 Threshold Scan Chart.
   * **Metrics to highlight**: The precision-recall intersection line, and the peak F1-Score of $94.2\%$ achieved at the optimal classification cutoff of $0.52$.

5. **`05_gemini_threat_analysis.png`**
   * **Subject**: Expanded "AI Threat Assessment" details containing Gemini contextual incident response advice for a high-risk flagged fraud vector.
