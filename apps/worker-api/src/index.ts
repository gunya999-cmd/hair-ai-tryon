type Env = {
  AI_PROVIDER: string;
};

const corsHeaders = {
  "content-type": "application/json;charset=UTF-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: corsHeaders });

const jobs = new Map<string, any>();

const styles = [
  "Textured crop",
  "Curtain bangs",
  "Layered medium",
  "Soft bob",
  "Long waves",
  "Classic fade"
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return json({ ok: true });

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "hair-ai-tryon-api", mode: env.AI_PROVIDER || "mock" });
    }

    if (url.pathname === "/api/create-job" && request.method === "POST") {
      const jobId = `job_${crypto.randomUUID()}`;

      const results = styles.map((style) => ({
        id: `res_${crypto.randomUUID()}`,
        style,
        liked: null,
        imageUrl: `https://placehold.co/900x1100/png?text=${encodeURIComponent(style)}`
      }));

      jobs.set(jobId, {
        id: jobId,
        status: "done",
        results,
        createdAt: new Date().toISOString()
      });

      return json({ jobId, status: "done" });
    }

    if (url.pathname.startsWith("/api/job/") && request.method === "GET") {
      const jobId = url.pathname.replace("/api/job/", "");
      const job = jobs.get(jobId);
      if (!job) return json({ error: "Job not found" }, 404);
      return json(job);
    }

    if (url.pathname === "/api/swipe" && request.method === "POST") {
      return json({ ok: true });
    }

    return json({ ok: true, service: "hair-ai-tryon-api" });
  }
};
