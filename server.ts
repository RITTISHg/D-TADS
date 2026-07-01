import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

import {
  IEEECisTransaction,
  AnomalyAlert,
  ModelParams,
  ModelMetrics,
  QueueStats,
  SimulatorConfig,
  SystemStats
} from "./src/types";
import {
  extractFeatureVector,
  IsolationForest,
  GradientBoostedTrees,
  evaluateModelPerformance
} from "./src/models/anomalyModels";
import {
  generateNormalTransaction,
  generateFraudTransaction,
  generateInitialDataset
} from "./src/utils/dataset";
import { StreamBroker } from "./src/utils/streamBroker";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const TOPIC_NAME = "financial-transactions";
const CONSUMER_GROUP = "anomaly-detector-group";

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

const streamBroker = new StreamBroker<IEEECisTransaction>([TOPIC_NAME], 3);

let transactionsStore: IEEECisTransaction[] = [];
let alertsStore: AnomalyAlert[] = [];
let transactionIdCounter = 2987350;

let baselineModel = new IsolationForest(100, 256);
let tunedModel = new GradientBoostedTrees(15, 0.1, 3);

let baselineParams: ModelParams = {
  nEstimators: 100,
  maxSamples: 256,
  contamination: 0.10,
  learningRate: 0.1,
  maxDepth: 3,
  nTrees: 15,
  subsample: 0.8
};

let tunedParams: ModelParams = {
  nEstimators: 150,
  maxSamples: 256,
  contamination: 0.08,
  learningRate: 0.15,
  maxDepth: 4,
  nTrees: 35,
  subsample: 0.85
};

const trainDataRaw = generateInitialDataset(300, 0.08);
const valDataRaw = generateInitialDataset(150, 0.10);

const X_train = trainDataRaw.map(t => extractFeatureVector(t));
const y_train = trainDataRaw.map(t => t.isFraud);

const X_val = valDataRaw.map(t => extractFeatureVector(t));
const y_val = valDataRaw.map(t => t.isFraud);

let baselineMetrics: ModelMetrics;
let tunedMetrics: ModelMetrics;

let simulatorConfig: SimulatorConfig = {
  isRunning: true,
  speedTps: 1,
  scenario: "Balanced",
  contaminationRate: 0.07
};

let streamInterval: NodeJS.Timeout | null = null;

function trainModels() {
  const startBaseline = Date.now();
  baselineModel = new IsolationForest(baselineParams.nEstimators, baselineParams.maxSamples);
  baselineModel.fit(X_train);
  const baselineTrainTime = Date.now() - startBaseline;

  const startTuned = Date.now();
  tunedModel = new GradientBoostedTrees(tunedParams.nTrees, tunedParams.learningRate, tunedParams.maxDepth);
  tunedModel.fit(X_train, y_train);
  const tunedTrainTime = Date.now() - startTuned;

  const baselinePredictFn = (x: number[]) => baselineModel.score(x);
  const baselineEval = evaluateModelPerformance(X_val, y_val, baselinePredictFn, 0.55);

  baselineMetrics = {
    version: "v1.0.0 (Baseline)",
    name: "Baseline (Isolation Forest)",
    ...baselineEval,
    trainingTimeMs: baselineTrainTime,
    hyperparameters: baselineParams
  };

  const tunedPredictFn = (x: number[]) => {
    const ifScore = baselineModel.score(x);
    const gbdtProb = tunedModel.predictProbability(x);
    return 0.3 * ifScore + 0.7 * gbdtProb;
  };
  const tunedEval = evaluateModelPerformance(X_val, y_val, tunedPredictFn, 0.50);

  tunedMetrics = {
    version: "v2.1.0-tuned (XGBoost + IF)",
    name: "Tuned (XGBoost + IF)",
    ...tunedEval,
    trainingTimeMs: tunedTrainTime,
    hyperparameters: tunedParams
  };
}

trainModels();

function processIncomingStream() {
  const isFraud = Math.random() < simulatorConfig.contaminationRate;
  let transaction: IEEECisTransaction;

  if (isFraud) {
    transaction = generateFraudTransaction(transactionIdCounter++);
  } else {
    transaction = generateNormalTransaction(transactionIdCounter++);
  }

  streamBroker.publish(TOPIC_NAME, transaction);

  const consumed = streamBroker.consume(TOPIC_NAME, CONSUMER_GROUP, 1);
  if (consumed.length === 0) return;

  const currentTransaction = consumed[0];
  const featVector = extractFeatureVector(currentTransaction);

  const baselineScore = baselineModel.score(featVector);
  const gbdtProb = tunedModel.predictProbability(featVector);
  const tunedScore = 0.3 * baselineScore + 0.7 * gbdtProb;

  const isBaselineFlagged = baselineScore >= 0.55;
  const isTunedFlagged = tunedScore >= 0.50;

  const keyRiskFactors: string[] = [];
  if (currentTransaction.TransactionAmt > 400) {
    keyRiskFactors.push(`High transaction value ($${currentTransaction.TransactionAmt})`);
  }
  if (currentTransaction.D3 === 0) {
    keyRiskFactors.push("Zero timedelta velocity spike (D3)");
  }
  if (currentTransaction.C13 > 20) {
    keyRiskFactors.push(`Transaction frequency spike (C13 count: ${currentTransaction.C13})`);
  }
  if (currentTransaction.addr2 !== 87 && currentTransaction.addr2 !== undefined) {
    keyRiskFactors.push(`International/Rare region mismatch (addr2: ${currentTransaction.addr2})`);
  }
  if (currentTransaction.M1 === "F" || currentTransaction.M6 === "F") {
    keyRiskFactors.push("Mismatching name/signature matches (M1/M6)");
  }
  if (currentTransaction.D1 === 0) {
    keyRiskFactors.push("Immediate cold-card activation execution (D1=0)");
  }

  if (keyRiskFactors.length === 0 && (isBaselineFlagged || isTunedFlagged)) {
    if (baselineScore > 0.6) keyRiskFactors.push("Multi-dimensional density anomaly (Isolation Forest)");
    if (gbdtProb > 0.6) keyRiskFactors.push("XGBoost boosted tree structural fraud probability");
  }

  if (isBaselineFlagged || isTunedFlagged) {
    const combinedRiskScore = Math.round(
      Math.max(baselineScore * 100, tunedScore * 100)
    );

    const alert: AnomalyAlert = {
      id: `alert-${Date.now()}-${currentTransaction.TransactionID}`,
      transaction: currentTransaction,
      timestamp: new Date().toLocaleTimeString(),
      baselineScore,
      tunedScore,
      isBaselineFlagged,
      isTunedFlagged,
      flaggingModel: isBaselineFlagged && isTunedFlagged ? "Both" : (isBaselineFlagged ? "Baseline" : "Tuned"),
      riskScore: combinedRiskScore,
      keyRiskFactors: keyRiskFactors.length > 0 ? keyRiskFactors : ["Statistical anomaly outlier"],
      status: "OPEN"
    };

    alertsStore.unshift(alert);
    if (alertsStore.length > 50) alertsStore.pop();
  }

  transactionsStore.unshift(currentTransaction);
  if (transactionsStore.length > 150) transactionsStore.pop();
}

function startSimulator() {
  if (streamInterval) clearInterval(streamInterval);
  const msInterval = 1000 / simulatorConfig.speedTps;
  streamInterval = setInterval(() => {
    if (simulatorConfig.isRunning) {
      processIncomingStream();
    }
  }, msInterval);
}

startSimulator();

app.get("/api/transactions", (req, res) => {
  const brokerStats = streamBroker.getStats(TOPIC_NAME, CONSUMER_GROUP);
  res.json({
    transactions: transactionsStore,
    brokerStats
  });
});

app.get("/api/alerts", (req, res) => {
  res.json(alertsStore);
});

app.post("/api/alerts/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const alert = alertsStore.find(a => a.id === id);
  if (alert) {
    alert.status = status;
    return res.json({ success: true, alert });
  }
  res.status(404).json({ error: "Alert not found" });
});

app.get("/api/models/stats", (req, res) => {
  res.json({
    baseline: baselineMetrics,
    tuned: tunedMetrics
  });
});

app.post("/api/models/tune", (req, res) => {
  const { baseline, tuned } = req.body;

  if (baseline) {
    baselineParams = { ...baselineParams, ...baseline };
  }
  if (tuned) {
    tunedParams = { ...tunedParams, ...tuned };
  }

  trainModels();

  res.json({
    success: true,
    baseline: baselineMetrics,
    tuned: tunedMetrics,
    f1Improvement: parseFloat((tunedMetrics.f1Score - baselineMetrics.f1Score).toFixed(4))
  });
});

app.post("/api/simulator/control", (req, res) => {
  const { isRunning, speedTps, scenario, contaminationRate } = req.body;

  if (isRunning !== undefined) simulatorConfig.isRunning = isRunning;
  if (speedTps !== undefined) simulatorConfig.speedTps = speedTps;
  if (scenario !== undefined) {
    simulatorConfig.scenario = scenario;
    if (scenario === "Balanced") simulatorConfig.contaminationRate = 0.06;
    if (scenario === "HighVolume") simulatorConfig.contaminationRate = 0.04;
    if (scenario === "FraudWave") simulatorConfig.contaminationRate = 0.16;
  }
  if (contaminationRate !== undefined) {
    simulatorConfig.contaminationRate = contaminationRate;
  }

  startSimulator();

  res.json({ success: true, config: simulatorConfig });
});

app.post("/api/transactions/inject", (req, res) => {
  const { isFraud, scenario } = req.body;
  let transaction: IEEECisTransaction;

  if (isFraud) {
    transaction = generateFraudTransaction(transactionIdCounter++, scenario);
  } else {
    transaction = generateNormalTransaction(transactionIdCounter++);
  }

  streamBroker.publish(TOPIC_NAME, transaction);
  processIncomingStream();

  res.json({ success: true, transaction });
});

app.post("/api/gemini/explain", async (req, res) => {
  const { alertId } = req.body;
  
  const alert = alertsStore.find(a => a.id === alertId);
  if (!alert) {
    return res.status(404).json({ error: "Alert not found" });
  }

  if (alert.geminiExplanation) {
    return res.json({ explanation: alert.geminiExplanation });
  }

  if (!ai) {
    return res.json({
      explanation: "⚠️ **Gemini API Key is missing.** Set `GEMINI_API_KEY` in the secrets or environment configuration to enable AI fraud explanation logs."
    });
  }

  try {
    const t = alert.transaction;
    const prompt = `You are an expert fraud risk operations scientist analyzing an anomalous financial transaction flagged by our machine learning models (Isolation Forest + XGBoost).
Analyze the transaction details:
- Transaction ID: ${t.TransactionID}
- Amount: $${t.TransactionAmt}
- Product Code: ${t.ProductCD}
- Card Issuer ID (card1): ${t.card1}
- Card Brand (card4) / Type (card6): ${t.card4} / ${t.card6}
- Billing Country ID (addr2): ${t.addr2} (US is 87)
- Days since card activation (D1): ${t.D1}
- Days since last transaction (D3): ${t.D3}
- Card matches count (C13): ${t.C13}
- Email Domain Match (P_email / R_email): ${t.P_emaildomain} -> ${t.R_emaildomain}
- Name match (M1) / Signature match (M6): Name matches=${t.M1}, Signature matches=${t.M6}
- ML Combined Risk Score: ${alert.riskScore}/100
- Specific Risk Factors Flagged: ${alert.keyRiskFactors.join(", ")}
${t.isFraud === 1 && t.fraudScenario ? `- Simulated Attack Scenario: ${t.fraudScenario}` : ""}

Please explain:
1. **Anomaly Analysis**: Why did the models flag this transaction? Highlight specific matching fields or numbers that triggered outliers.
2. **Fraud Pattern**: What typical fraud vector does this resemble?
3. **Recommended Incident Response**: What should our risk analysts do immediately (e.g., hold funds, suspend account, trigger 2FA, contact banking partner)?

Keep your response professional, insightful, formatted in beautiful, concise Markdown. Avoid technical developer jargon. Limit your response to 200 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const explanation = response.text || "No response received from Gemini.";
    alert.geminiExplanation = explanation;
    res.json({ explanation });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: `Gemini evaluation failed: ${err.message}` });
  }
});

app.get("/api/system/stats", (req, res) => {
  const cpuUsage = Math.round(5 + Math.random() * 8);
  const memoryUsageMb = Math.round(180 + Math.random() * 15);
  const latencyMs = Math.round(2 + Math.random() * 15);

  const stats: SystemStats = {
    cpuUsage,
    memoryUsageMb,
    latencyMs
  };
  res.json(stats);
});

app.post("/api/simulator/reset", (req, res) => {
  streamBroker.clearTopic(TOPIC_NAME);
  transactionsStore = [];
  alertsStore = [];
  transactionIdCounter = 2987350;
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
