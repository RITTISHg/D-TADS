export interface IEEECisTransaction {
  TransactionID: number;
  TransactionDT: number;
  TransactionAmt: number;
  ProductCD: 'W' | 'H' | 'C' | 'S' | 'R';
  card1: number;
  card2: number;
  card3: number;
  card4: 'visa' | 'mastercard' | 'discover' | 'american express';
  card5: number;
  card6: 'debit' | 'credit';
  addr1: number;
  addr2: number;
  dist1?: number;
  dist2?: number;
  P_emaildomain: string;
  R_emaildomain: string;
  C1: number;
  C2: number;
  C11: number;
  C13: number;
  D1: number;
  D3: number;
  D15: number;
  M1: 'T' | 'F' | 'unknown';
  M2: 'T' | 'F' | 'unknown';
  M4: 'M0' | 'M1' | 'M2' | 'unknown';
  M6: 'T' | 'F' | 'unknown';
  isFraud: number;
  fraudScenario?: string;
}

export interface AnomalyAlert {
  id: string;
  transaction: IEEECisTransaction;
  timestamp: string;
  baselineScore: number;
  tunedScore: number;
  isBaselineFlagged: boolean;
  isTunedFlagged: boolean;
  flaggingModel: 'Baseline' | 'Tuned' | 'Both';
  riskScore: number;
  keyRiskFactors: string[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  geminiExplanation?: string;
  geminiLoading?: boolean;
}

export interface ModelParams {
  nEstimators: number;
  maxSamples: number;
  contamination: number;
  learningRate: number;
  maxDepth: number;
  nTrees: number;
  subsample: number;
}

export interface ConfusionMatrix {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface RocCurvePoint {
  fpr: number;
  tpr: number;
  threshold: number;
}

export interface ModelMetrics {
  version: string;
  name: 'Baseline (Isolation Forest)' | 'Tuned (XGBoost + IF)';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  trainingTimeMs: number;
  confusionMatrix: ConfusionMatrix;
  rocCurve: RocCurvePoint[];
  hyperparameters: ModelParams;
}

export interface QueuePartition {
  id: number;
  offset: number;
  lag: number;
  status: 'ACTIVE' | 'IDLE' | 'BACKPRESSURE';
}

export interface QueueStats {
  throughput: number;
  totalIngested: number;
  totalProcessed: number;
  queueSize: number;
  partitions: QueuePartition[];
  brokerType: 'MemoryStream' | 'KafkaEmulator';
}

export interface SimulatorConfig {
  isRunning: boolean;
  speedTps: number;
  scenario: 'Balanced' | 'HighVolume' | 'FraudWave' | 'Custom';
  contaminationRate: number;
}

export interface SystemStats {
  cpuUsage: number;
  memoryUsageMb: number;
  latencyMs: number;
}
