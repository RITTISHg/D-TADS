import { IEEECisTransaction, ModelParams, ModelMetrics, ConfusionMatrix, RocCurvePoint } from '../types';

export const FEATURE_NAMES = [
  'TransactionAmt', 'ProductCD_enc', 'card1', 'card6_enc', 'addr1', 'addr2',
  'dist1_filled', 'C1', 'C2', 'C11', 'C13', 'D1', 'D3', 'D15',
  'M1_enc', 'M2_enc', 'M4_enc', 'M6_enc'
];

export function extractFeatureVector(t: IEEECisTransaction): number[] {
  let productCDEnc = 0;
  switch (t.ProductCD) {
    case 'W': productCDEnc = 0; break;
    case 'H': productCDEnc = 1; break;
    case 'C': productCDEnc = 2; break;
    case 'S': productCDEnc = 3; break;
    case 'R': productCDEnc = 4; break;
  }

  const card6Enc = t.card6 === 'credit' ? 1 : 0;

  const m1Enc = t.M1 === 'T' ? 1 : (t.M1 === 'F' ? 0 : 0.5);
  const m2Enc = t.M2 === 'T' ? 1 : (t.M2 === 'F' ? 0 : 0.5);
  const m6Enc = t.M6 === 'T' ? 1 : (t.M6 === 'F' ? 0 : 0.5);

  let m4Enc = 0.5;
  switch (t.M4) {
    case 'M0': m4Enc = 0; break;
    case 'M1': m4Enc = 1; break;
    case 'M2': m4Enc = 2; break;
    case 'unknown': m4Enc = 1.5; break;
  }

  return [
    t.TransactionAmt,
    productCDEnc,
    t.card1 || 1000,
    card6Enc,
    t.addr1 || 299,
    t.addr2 || 87,
    t.dist1 !== undefined ? t.dist1 : 12,
    t.C1,
    t.C2,
    t.C11,
    t.C13,
    t.D1,
    t.D3,
    t.D15,
    m1Enc,
    m2Enc,
    m4Enc,
    m6Enc
  ];
}

class IsolationTreeNode {
  featureIndex: number = -1;
  splitValue: number = 0;
  leftChild: IsolationTreeNode | null = null;
  rightChild: IsolationTreeNode | null = null;
  size: number = 0;
  isLeaf: boolean = true;

  constructor(size: number) {
    this.size = size;
  }
}

export class IsolationForest {
  private nEstimators: number;
  private maxSamples: number;
  private trees: IsolationTreeNode[] = [];
  private numFeatures: number = 0;

  constructor(nEstimators: number = 100, maxSamples: number = 256) {
    this.nEstimators = nEstimators;
    this.maxSamples = maxSamples;
  }

  fit(X: number[][]): void {
    if (X.length === 0) return;
    this.numFeatures = X[0].length;
    this.trees = [];

    const numSamples = X.length;
    const subSampleSize = Math.min(this.maxSamples, numSamples);

    for (let i = 0; i < this.nEstimators; i++) {
      const sampleIndices: number[] = [];
      while (sampleIndices.length < subSampleSize) {
        const randIdx = Math.floor(Math.random() * numSamples);
        if (!sampleIndices.includes(randIdx)) {
          sampleIndices.push(randIdx);
        }
      }
      const subX = sampleIndices.map(idx => X[idx]);
      const maxDepth = Math.ceil(Math.log2(subSampleSize));
      this.trees.push(this.buildTree(subX, 0, maxDepth));
    }
  }

  private buildTree(X: number[][], currentHeight: number, maxDepth: number): IsolationTreeNode {
    const node = new IsolationTreeNode(X.length);
    if (currentHeight >= maxDepth || X.length <= 1) {
      node.isLeaf = true;
      return node;
    }

    const mins = new Array(this.numFeatures).fill(Infinity);
    const maxs = new Array(this.numFeatures).fill(-Infinity);
    for (const row of X) {
      for (let f = 0; f < this.numFeatures; f++) {
        if (row[f] < mins[f]) mins[f] = row[f];
        if (row[f] > maxs[f]) maxs[f] = row[f];
      }
    }

    const validFeatures: number[] = [];
    for (let f = 0; f < this.numFeatures; f++) {
      if (maxs[f] > mins[f]) validFeatures.push(f);
    }

    if (validFeatures.length === 0) {
      node.isLeaf = true;
      return node;
    }

    const randomFeature = validFeatures[Math.floor(Math.random() * validFeatures.length)];
    const minVal = mins[randomFeature];
    const maxVal = maxs[randomFeature];

    const splitValue = minVal + Math.random() * (maxVal - minVal);

    node.featureIndex = randomFeature;
    node.splitValue = splitValue;
    node.isLeaf = false;

    const leftX: number[][] = [];
    const rightX: number[][] = [];
    for (const row of X) {
      if (row[randomFeature] < splitValue) {
        leftX.push(row);
      } else {
        rightX.push(row);
      }
    }

    node.leftChild = this.buildTree(leftX, currentHeight + 1, maxDepth);
    node.rightChild = this.buildTree(rightX, currentHeight + 1, maxDepth);

    return node;
  }

  private pathLength(x: number[], node: IsolationTreeNode, currentDepth: number): number {
    if (node.isLeaf) {
      return currentDepth + this.c(node.size);
    }

    if (x[node.featureIndex] < node.splitValue) {
      return this.pathLength(x, node.leftChild!, currentDepth + 1);
    } else {
      return this.pathLength(x, node.rightChild!, currentDepth + 1);
    }
  }

  private c(n: number): number {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    const eulerConstant = 0.5772156649;
    return 2 * (Math.log(n - 1) + eulerConstant) - (2 * (n - 1)) / n;
  }

  score(x: number[]): number {
    if (this.trees.length === 0) return 0.5;

    let totalLength = 0;
    for (const tree of this.trees) {
      totalLength += this.pathLength(x, tree, 0);
    }
    const avgLength = totalLength / this.trees.length;
    const subSampleSize = Math.min(this.maxSamples, this.trees[0].size);
    const cSize = this.c(subSampleSize);

    if (cSize === 0) return 0.5;
    return Math.pow(2, -avgLength / cSize);
  }
}

class RegTreeNode {
  featureIndex: number = -1;
  splitValue: number = 0;
  leftChild: RegTreeNode | null = null;
  rightChild: RegTreeNode | null = null;
  leafValue: number = 0;
  isLeaf: boolean = true;
}

class RegressionTree {
  root: RegTreeNode | null = null;
  maxDepth: number;

  constructor(maxDepth: number = 3) {
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], residuals: number[]): void {
    this.root = this.buildTree(X, residuals, 0);
  }

  private buildTree(X: number[][], r: number[], depth: number): RegTreeNode {
    const node = new RegTreeNode();
    const numSamples = X.length;

    if (depth >= this.maxDepth || numSamples < 4) {
      node.isLeaf = true;
      node.leafValue = this.mean(r);
      return node;
    }

    const numFeatures = X[0]?.length || 0;
    let bestFeature = -1;
    let bestSplitValue = 0;
    let bestVarianceReduction = -1;

    const currentVar = this.variance(r);
    if (currentVar < 1e-7) {
      node.isLeaf = true;
      node.leafValue = this.mean(r);
      return node;
    }

    const featureCount = Math.ceil(numFeatures * 0.8);
    const featuresToTry: number[] = [];
    while (featuresToTry.length < featureCount) {
      const idx = Math.floor(Math.random() * numFeatures);
      if (!featuresToTry.includes(idx)) featuresToTry.push(idx);
    }

    for (const f of featuresToTry) {
      const vals = X.map(row => row[f]);
      const uniqueVals = Array.from(new Set(vals)).sort((a, b) => a - b);

      const maxSplits = Math.min(10, uniqueVals.length - 1);
      const step = Math.max(1, Math.floor(uniqueVals.length / maxSplits));

      for (let i = 0; i < uniqueVals.length - 1; i += step) {
        const splitVal = (uniqueVals[i] + uniqueVals[i + 1]) / 2;

        const leftRes: number[] = [];
        const rightRes: number[] = [];

        for (let s = 0; s < numSamples; s++) {
          if (X[s][f] < splitVal) {
            leftRes.push(r[s]);
          } else {
            rightRes.push(r[s]);
          }
        }

        if (leftRes.length < 2 || rightRes.length < 2) continue;

        const leftVar = this.variance(leftRes);
        const rightVar = this.variance(rightRes);
        const splitVar = (leftRes.length / numSamples) * leftVar + (rightRes.length / numSamples) * rightVar;
        const varReduction = currentVar - splitVar;

        if (varReduction > bestVarianceReduction) {
          bestVarianceReduction = varReduction;
          bestFeature = f;
          bestSplitValue = splitVal;
        }
      }
    }

    if (bestVarianceReduction <= 1e-6 || bestFeature === -1) {
      node.isLeaf = true;
      node.leafValue = this.mean(r);
      return node;
    }

    node.featureIndex = bestFeature;
    node.splitValue = bestSplitValue;
    node.isLeaf = false;

    const leftX: number[][] = [];
    const leftR: number[] = [];
    const rightX: number[][] = [];
    const rightR: number[] = [];

    for (let s = 0; s < numSamples; s++) {
      if (X[s][bestFeature] < bestSplitValue) {
        leftX.push(X[s]);
        leftR.push(r[s]);
      } else {
        rightX.push(X[s]);
        rightR.push(r[s]);
      }
    }

    node.leftChild = this.buildTree(leftX, leftR, depth + 1);
    node.rightChild = this.buildTree(rightX, rightR, depth + 1);

    return node;
  }

  predictRow(x: number[], node: RegTreeNode): number {
    if (node.isLeaf) {
      return node.leafValue;
    }
    if (x[node.featureIndex] < node.splitValue) {
      return this.predictRow(x, node.leftChild!);
    } else {
      return this.predictRow(x, node.rightChild!);
    }
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
  }

  private variance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const m = this.mean(arr);
    return arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length;
  }
}

export class GradientBoostedTrees {
  private nTrees: number;
  private learningRate: number;
  private maxDepth: number;
  private basePrediction: number = 0;
  private trees: RegressionTree[] = [];

  constructor(nTrees: number = 15, learningRate: number = 0.1, maxDepth: number = 3) {
    this.nTrees = nTrees;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
  }

  fit(X: number[][], y: number[]): void {
    if (X.length === 0) return;
    this.trees = [];

    const fraudRate = y.reduce((sum, v) => sum + v, 0) / y.length;
    const clampedRate = Math.max(0.01, Math.min(0.99, fraudRate));
    this.basePrediction = Math.log(clampedRate / (1 - clampedRate));

    const numSamples = X.length;
    const rawPredictions = new Array(numSamples).fill(this.basePrediction);

    for (let t = 0; t < this.nTrees; t++) {
      const residuals = new Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const p = 1 / (1 + Math.exp(-rawPredictions[i]));
        residuals[i] = y[i] - p;
      }

      const tree = new RegressionTree(this.maxDepth);
      tree.fit(X, residuals);

      for (let i = 0; i < numSamples; i++) {
        const leafVal = tree.predictRow(X[i], tree.root!);
        rawPredictions[i] += this.learningRate * leafVal;
      }

      this.trees.push(tree);
    }
  }

  predictProbability(x: number[]): number {
    let raw = this.basePrediction;
    for (const tree of this.trees) {
      if (tree.root) {
        raw += this.learningRate * tree.predictRow(x, tree.root);
      }
    }
    return 1 / (1 + Math.exp(-raw));
  }
}

export function evaluateModelPerformance(
  X_val: number[][],
  y_val: number[],
  predictFn: (x: number[]) => number,
  threshold: number = 0.5
): {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: ConfusionMatrix;
  rocCurve: RocCurvePoint[];
} {
  const predictions = X_val.map(x => predictFn(x));

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (let i = 0; i < X_val.length; i++) {
    const actual = y_val[i];
    const score = predictions[i];
    const pred = score >= threshold ? 1 : 0;

    if (actual === 1 && pred === 1) tp++;
    else if (actual === 0 && pred === 1) fp++;
    else if (actual === 0 && pred === 0) tn++;
    else if (actual === 1 && pred === 0) fn++;
  }

  const accuracy = (tp + tn) / Math.max(1, X_val.length);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const f1Score = (2 * precision * recall) / Math.max(1e-9, precision + recall);

  const rocCurve: RocCurvePoint[] = [];
  const sortedScores = [...predictions].sort((a, b) => a - b);
  const threshSteps = 20;

  rocCurve.push({ fpr: 1, tpr: 1, threshold: 0 });

  for (let s = 1; s < threshSteps; s++) {
    const t = s / threshSteps;
    let localTp = 0;
    let localFp = 0;
    let localTn = 0;
    let localFn = 0;

    for (let i = 0; i < X_val.length; i++) {
      const actual = y_val[i];
      const pred = predictions[i] >= t ? 1 : 0;
      if (actual === 1 && pred === 1) localTp++;
      else if (actual === 0 && pred === 1) localFp++;
      else if (actual === 0 && pred === 0) localTn++;
      else if (actual === 1 && pred === 0) localFn++;
    }

    const tpr = localTp / Math.max(1, localTp + localFn);
    const fpr = localFp / Math.max(1, localFp + localTn);
    rocCurve.push({ fpr, tpr, threshold: t });
  }

  rocCurve.push({ fpr: 0, tpr: 0, threshold: 1 });

  rocCurve.sort((a, b) => b.fpr - a.fpr);

  let auc = 0;
  for (let i = 0; i < rocCurve.length - 1; i++) {
    const p1 = rocCurve[i];
    const p2 = rocCurve[i + 1];
    const width = p1.fpr - p2.fpr;
    const height = (p1.tpr + p2.tpr) / 2;
    auc += width * height;
  }
  auc = Math.abs(auc);

  return {
    accuracy,
    precision,
    recall,
    f1Score,
    auc: isNaN(auc) ? 0.5 : Math.max(0.5, Math.min(1, auc)),
    confusionMatrix: { tp, fp, tn, fn },
    rocCurve: rocCurve.reverse()
  };
}
