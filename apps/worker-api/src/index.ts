type Env = {
  AI_PROVIDER?: string;
  OPENAI_API_KEY?: string;
};

type Result = {
  id: string;
  style: string;
  liked: null;
  imageUrl: string;
  provider?: string;
};

type Job = {
  id: string;
  status: "done";
  results: Result[];
  createdAt: string;
};

const corsHeaders = {
  "content-type": "application/json;charset=UTF-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: corsHeaders });

const jobs = new Map<string, Job>();

const styles = [
  "Textured crop",
  "Curtain bangs",
  "Layered medium",
  "Soft bob",
  "Long waves",
  "Classic fade"
];

function createMockResult(style: string): Result {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="100%" height="100%" fill="#f2e4d8"/><circle cx="450" cy="300" r="190" fill="#2c2019"/><circle cx="450" cy="470" r="170" fill="#ddb18b"/><rect x="290" y="730" width="320" height="180" rx="50" fill="#1f1a17"/><text x="450" y="1020" text-anchor="middle" font-size="48" font-family="Arial" fill="#ffffff">${style}</text></svg>`;
  return {
    id: `res_${crypto.randomUUID()}`,
    style,
    liked: null,
    imageUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    provider: "mock"
  };
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

async function generateWithOpenAI(imageDataUrl: string, style: string, apiKey: string): Promise<Result> {
  const form = new FormData();
  form.append("model", "gpt-image-1");
  form.append("image", dataUrlToFile(imageDataUrl, "portrait.png"));
  form.append("prompt", `Change only the hairstyle to ${style}. Preserve the same face identity, lighting, background and camera angle. Make the hairstyle realistic and naturally blended.`);
  form.append("size", "1024x1024");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = await response.json<any>();
  const b64 = payload?.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("No image returned from OpenAI");
  }

  return {
    id: `res_${crypto.randomUUID()}`,
    style,
    liked: null,
    imageUrl: `data:image/png;base64,${b64}`,
    provider: "openai"
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return json({ ok: true });

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "hair-ai-tryon-api",
        mode: env.AI_PROVIDER || "mock",
        openaiConfigured: Boolean(env.OPENAI_API_KEY)
      });
    }

    if (url.pathname === "/api/create-job" && request.method === "POST") {
      const body = await request.json<any>().catch(() => ({}));
      const jobId = `job_${crypto.randomUUID()}`;

      let results: Result[] = [];

      if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY && body.imageDataUrl) {
        const generated = await Promise.allSettled(
          styles.slice(0, 3).map((style) => generateWithOpenAI(body.imageDataUrl, style, env.OPENAI_API_KEY!))
        );

        results = generated.map((item, index) => {
          if (item.status === "fulfilled") return item.value;
          return createMockResult(styles[index]);
        });
      } else {
        results = styles.map(createMockResult);
      }

      const job: Job = {
        id: jobId,
        status: "done",
        results,
        createdAt: new Date().toISOString()
      };

      jobs.set(jobId, job);
      return json({ jobId, status: "done", results });
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