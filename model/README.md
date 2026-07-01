# Model Store & Serialized Configurations

This folder houses the hyperparameter specifications, calibration metrics, and architecture summaries for our dual-model ensemble pipeline.

## Ensemble Design
Our classification topology ensembles two distinct modeling techniques to minimize False Positives while preserving absolute Recall:

1. **Isolation Forest (iForest)**: An unsupervised algorithm that isolates anomalies through recursive random feature partitioning. Best suited for high-dimensional spatial density outliers and unknown zero-day threat vectors.
2. **Gradient Boosted Decision Trees (GBDT)**: A supervised sequential tree boosting classifier (akin to LightGBB / XGBoost) trained to model transaction probability based on historical indicators.

```text
       Input Transaction Matrix (18 Engineered Features)
                       |
             +---------+---------+
             |                   |
             v                   v
      Isolation Forest    Gradient Boosting
      (Density Outlier)  (Risk Probability)
             |                   |
             | (Score: 0-1)      | (Prob: 0-1)
             +---------+---------+
                       |
                       v
              Ensembled Weighted Risk Score
          [Score = 0.3 * iForest + 0.7 * GBDT]
                       |
                (Cutoff: 0.52)
                       |
             +---------+---------+
             |                   |
        (Score >= 0.52)    (Score < 0.52)
             v                   v
         ALARM / BLOCK        PASS
```

## Production Configurations
The active hyperparameter configurations are serialized inside `/model/hyperparameters.json` for reproducibility across deployment partitions.
