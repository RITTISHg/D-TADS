import { extractFeatureVector, IsolationForest, GradientBoostedTrees } from "../src/models/anomalyModels";
import { generateNormalTransaction } from "../src/utils/dataset";

function runThroughputBenchmark() {
  console.log("=========================================================");
  console.log(" NEXUS ENGINE - HIGH-THROUGHPUT MICRO-BENCHMARK RUNNER ");
  console.log("=========================================================");
  console.log("Initializing classification models...");

  const forest = new IsolationForest(100, 256);
  const gbdt = new GradientBoostedTrees(35, 0.15, 4);

  // Train with minimal dummy datasets to warm up compiler optimizations
  const dummyFeatures: number[][] = [];
  const dummyLabels: number[] = [];
  for (let i = 0; i < 200; i++) {
    dummyFeatures.push([
      Math.random() * 500, // amount
      Math.random() > 0.5 ? 1 : 0, // card brand
      Math.random() > 0.5 ? 1 : 0, // card type
      Math.random() * 500, // addr1
      87, // addr2
      Math.random() * 50, // dist1
      Math.random() * 10, // C13
      Math.random() * 30, // D1
      Math.random() * 30, // D3
      Math.random() > 0.5 ? 1 : 0, // email domain matches
      Math.random() > 0.5 ? 1 : 0  // info matches
    ]);
    dummyLabels.push(Math.random() > 0.9 ? 1 : 0);
  }

  forest.fit(dummyFeatures);
  gbdt.fit(dummyFeatures, dummyLabels);

  console.log("Generating 10,000 synthetic transaction records...");
  const transactions = Array.from({ length: 10000 }, (_, idx) => 
    generateNormalTransaction(3000000 + idx)
  );

  console.log("Warming up JIT compiler...");
  // Warm up loop
  for (let i = 0; i < 500; i++) {
    const feat = extractFeatureVector(transactions[i]);
    const scoreA = forest.score(feat);
    const scoreB = gbdt.predictProbability(feat);
    const combined = 0.3 * scoreA + 0.7 * scoreB;
  }

  console.log("\nExecuting core performance throughput scan...");
  const startTime = Date.now();

  let totalProcessed = 0;
  for (let i = 0; i < transactions.length; i++) {
    const currentTx = transactions[i];
    const feat = extractFeatureVector(currentTx);
    
    // Core ensembled scoring iteration
    const ifScore = forest.score(feat);
    const gbdtProb = gbdt.predictProbability(feat);
    const finalScore = 0.3 * ifScore + 0.7 * gbdtProb;
    
    // Flag if threshold is breached (0.52 peak optimization cutoff)
    const isFlagged = finalScore >= 0.52;
    totalProcessed++;
  }

  const durationMs = Date.now() - startTime;
  const durationSec = durationMs / 1000;
  const eventsPerSecond = Math.round(totalProcessed / durationSec);
  const averageLatencyMs = (durationMs / totalProcessed).toFixed(4);

  console.log("---------------------------------------------------------");
  console.log("BENCHMARK RESULTS SUMMARY:");
  console.log(`- Total Events Scored:     ${totalProcessed.toLocaleString()}`);
  console.log(`- Total Execution Time:    ${durationMs} ms`);
  console.log(`- Average Event Latency:   ${averageLatencyMs} ms`);
  console.log(`- Peak System Throughput:  ${eventsPerSecond.toLocaleString()} events/sec`);
  console.log("---------------------------------------------------------");
  
  if (eventsPerSecond >= 10000) {
    console.log("✅ STATUS: SUCCESS - Pipeline exceeds the target 10,000+ EPS benchmark limit!");
  } else {
    console.log("⚠️ STATUS: WARNING - Pipeline operates below the high-throughput 10,000 EPS standard.");
  }
  console.log("=========================================================\n");
}

runThroughputBenchmark();
