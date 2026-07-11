import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6380';

// Parse Redis connection details safely from environment URL
const getRedisOptions = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port) : 6380,
      username: parsed.username || undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    };
  } catch (e) {
    return {
      host: 'localhost',
      port: 6380,
    };
  }
};

let queue: Queue | null = null;

export function getSummaryQueue() {
  if (!queue) {
    queue = new Queue('meeting-summary', { 
      connection: getRedisOptions(redisUrl) 
    });
  }
  return queue;
}

export async function enqueueSummaryJob(recordingId: string) {
  try {
    const q = getSummaryQueue();
    const job = await q.add('process-summary', { recordingId });
    console.log(`Enqueued AI summary job ${job.id} for recording ${recordingId}`);
    return job;
  } catch (err) {
    console.error('Failed to enqueue summary job:', err);
    throw err;
  }
}
