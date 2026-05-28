type Env = {
  IMAGES: R2Bucket;
  DB: D1Database;
  GENERATION_QUEUE: Queue;
  AI_PROVIDER: string;
  AI_API_KEY?: string;
  PUBLIC_R2_BASE_URL: string;
};

type CreateJobBody = { originalKey: string; requestedStyles: string[] };
type QueueMessage = { jobId: string; originalKey: string; requestedStyles: string[] };

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json;charset=UTF-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization'
  }
});

const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const now = () => new Date().toISOString();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return json({ ok: true });
    const url = new URL(request.url);

    if (url.pathname === '/api/upload-url' && request.method === 'POST') {
      const body = await request.json<{ fileName: string; contentType: string }>();
      const key = `uploads/${crypto.randomUUID()}-${safeName(body.fileName || 'photo.jpg')}`;
      const uploadUrl = await env.IMAGES.createMultipartUpload
        ? request.url.replace(url.pathname, `/api/mock-r2-put/${encodeURIComponent(key)}`)
        : request.url.replace(url.pathname, `/api/mock-r2-put/${encodeURIComponent(key)}`);
      // Production note: replace this mock URL with an S3-compatible presigned URL for R2.
      return json({ key, uploadUrl });
    }

    if (url.pathname.startsWith('/api/mock-r2-put/') && request.method === 'PUT') {
      const key = decodeURIComponent(url.pathname.replace('/api/mock-r2-put/', ''));
      await env.IMAGES.put(key, request.body, { httpMetadata: { contentType: request.headers.get('content-type') || 'image/jpeg' } });
      return json({ ok: true, key });
    }

    if (url.pathname === '/api/create-job' && request.method === 'POST') {
      const body = await request.json<CreateJobBody>();
      if (!body.originalKey || !Array.isArray(body.requestedStyles)) return json({ error: 'Bad request' }, 400);
      const jobId = id('job');
      await env.DB.prepare('INSERT INTO jobs (id, original_key, status, requested_styles, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(jobId, body.originalKey, 'queued', JSON.stringify(body.requestedStyles), now(), now()).run();
      await env.GENERATION_QUEUE.send({ jobId, originalKey: body.originalKey, requestedStyles: body.requestedStyles });
      return json({ jobId, status: 'queued' });
    }

    if (url.pathname.startsWith('/api/job/') && request.method === 'GET') {
      const jobId = url.pathname.replace('/api/job/', '');
      const job = await env.DB.prepare('SELECT * FROM jobs WHERE id = ?').bind(jobId).first();
      if (!job) return json({ error: 'Not found' }, 404);
      const { results } = await env.DB.prepare('SELECT id, image_url as imageUrl, style, liked FROM results WHERE job_id = ? ORDER BY created_at ASC').bind(jobId).all();
      return json({ ...job, results });
    }

    if (url.pathname === '/api/swipe' && request.method === 'POST') {
      const body = await request.json<{ jobId: string; resultId: string; liked: boolean }>();
      await env.DB.prepare('UPDATE results SET liked = ? WHERE id = ? AND job_id = ?')
        .bind(body.liked ? 1 : 0, body.resultId, body.jobId).run();
      return json({ ok: true });
    }

    return json({ ok: true, service: 'hair-ai-tryon-api' });
  },

  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { jobId, originalKey, requestedStyles } = message.body;
      try {
        await env.DB.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').bind('processing', now(), jobId).run();
        for (const style of requestedStyles.slice(0, 6)) {
          const resultId = id('res');
          const imageUrl = await generateHairstyleVariant(env, originalKey, style, resultId);
          await env.DB.prepare('INSERT INTO results (id, job_id, image_url, style, liked, created_at) VALUES (?, ?, ?, ?, NULL, ?)')
            .bind(resultId, jobId, imageUrl, style, now()).run();
        }
        await env.DB.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').bind('done', now(), jobId).run();
        message.ack();
      } catch (error) {
        console.error(error);
        await env.DB.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').bind('error', now(), jobId).run();
        message.retry();
      }
    }
  }
};

async function generateHairstyleVariant(env: Env, originalKey: string, style: string, resultId: string): Promise<string> {
  if (env.AI_PROVIDER === 'mock') {
    // MVP placeholder: returns original image URL. Replace with Replicate/Fal/RunPod call.
    return `${env.PUBLIC_R2_BASE_URL}/${originalKey}?style=${encodeURIComponent(style)}&result=${resultId}`;
  }

  // TODO: implement provider adapters in src/providers/replicate.ts / fal.ts / runpod.ts
  // Required behavior: keep identity and face, change hair only, save output to R2, return public image URL.
  throw new Error(`AI provider not implemented: ${env.AI_PROVIDER}`);
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}
