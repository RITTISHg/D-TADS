import { QueueStats, QueuePartition } from '../types';

export class StreamBroker<T> {
  private queue: Map<string, T[]> = new Map();
  private offsets: Map<string, Map<string, number>> = new Map();
  private totalIngested: number = 0;
  private totalProcessed: number = 0;
  private publishTimestamps: number[] = [];
  private consumeTimestamps: number[] = [];
  private partitions: QueuePartition[] = [];
  private numPartitions: number;

  constructor(topicNames: string[], numPartitions: number = 3) {
    this.numPartitions = numPartitions;
    for (const topic of topicNames) {
      this.queue.set(topic, []);
      this.offsets.set(topic, new Map());
    }

    for (let p = 0; p < numPartitions; p++) {
      this.partitions.push({
        id: p,
        offset: 0,
        lag: 0,
        status: 'IDLE'
      });
    }
  }

  publish(topic: string, event: T): void {
    const topicQueue = this.queue.get(topic);
    if (!topicQueue) return;

    topicQueue.push(event);
    this.totalIngested++;
    this.publishTimestamps.push(Date.now());

    const partitionId = this.totalIngested % this.numPartitions;
    const partition = this.partitions[partitionId];
    if (partition) {
      partition.offset++;
      partition.status = 'ACTIVE';
    }

    const cutoff = Date.now() - 10000;
    this.publishTimestamps = this.publishTimestamps.filter(t => t > cutoff);
  }

  consume(topic: string, consumerGroupId: string, limit: number = 10): T[] {
    const topicQueue = this.queue.get(topic);
    if (!topicQueue) return [];

    const groupOffsets = this.offsets.get(topic);
    if (!groupOffsets) return [];

    const currentOffset = groupOffsets.get(consumerGroupId) || 0;
    const availableMessages = topicQueue.slice(currentOffset, currentOffset + limit);

    if (availableMessages.length > 0) {
      const newOffset = currentOffset + availableMessages.length;
      groupOffsets.set(consumerGroupId, newOffset);
      this.totalProcessed += availableMessages.length;
      
      for (let i = 0; i < availableMessages.length; i++) {
        this.consumeTimestamps.push(Date.now());
      }

      const cutoff = Date.now() - 10000;
      this.consumeTimestamps = this.consumeTimestamps.filter(t => t > cutoff);

      const remainingLag = topicQueue.length - newOffset;
      for (let p = 0; p < this.numPartitions; p++) {
        const partition = this.partitions[p];
        if (partition) {
          partition.lag = Math.max(0, Math.ceil(remainingLag / this.numPartitions));
          if (partition.lag > 25) {
            partition.status = 'BACKPRESSURE';
          } else if (partition.lag > 0) {
            partition.status = 'ACTIVE';
          } else {
            partition.status = 'ACTIVE';
          }
        }
      }
    }

    return availableMessages;
  }

  resetConsumerOffsets(topic: string, consumerGroupId: string): void {
    const groupOffsets = this.offsets.get(topic);
    if (groupOffsets) {
      groupOffsets.set(consumerGroupId, 0);
    }
  }

  getStats(topic: string, consumerGroupId: string): QueueStats {
    const topicQueue = this.queue.get(topic) || [];
    const groupOffsets = this.offsets.get(topic);
    const currentOffset = groupOffsets?.get(consumerGroupId) || 0;
    const queueSize = topicQueue.length;
    const currentLag = Math.max(0, queueSize - currentOffset);

    const now = Date.now();
    const activePublishCount = this.publishTimestamps.length;
    const throughput = activePublishCount / 10;

    const lagPerPartition = Math.ceil(currentLag / this.numPartitions);
    const updatedPartitions = this.partitions.map(p => ({
      ...p,
      lag: currentLag > 0 ? lagPerPartition : 0,
      status: currentLag > 150 ? 'BACKPRESSURE' as const : (currentLag > 0 ? 'ACTIVE' as const : 'IDLE' as const)
    }));

    return {
      throughput: parseFloat(throughput.toFixed(1)),
      totalIngested: this.totalIngested,
      totalProcessed: this.totalProcessed,
      queueSize: currentLag,
      partitions: updatedPartitions,
      brokerType: 'MemoryStream'
    };
  }

  clearTopic(topic: string): void {
    this.queue.set(topic, []);
    this.offsets.set(topic, new Map());
    this.totalIngested = 0;
    this.totalProcessed = 0;
    this.publishTimestamps = [];
    this.consumeTimestamps = [];
    this.partitions = this.partitions.map(p => ({
      ...p,
      offset: 0,
      lag: 0,
      status: 'IDLE'
    }));
  }
}
