import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Camera, Heart, X, Wand2, Upload } from 'lucide-react';
import './styles.css';

type JobStatus = 'idle' | 'uploaded' | 'queued' | 'processing' | 'done' | 'error';
type Result = { id: string; imageUrl: string; style: string; liked?: boolean };

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const styles = ['Textured crop', 'Curtain bangs', 'Layered medium', 'Soft bob', 'Long waves', 'Classic fade'];

function App() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const activeCard = results[active];

  const helperText = useMemo(() => {
    if (status === 'idle') return 'Загрузи фото лица. Лучше фронтально, хорошее освещение, без очков и шапки.';
    if (status === 'uploaded') return 'Фото готово. Запускай генерацию вариантов.';
    if (status === 'queued' || status === 'processing') return 'Генерируем прически и подгоняем под ракурс лица.';
    if (status === 'done') return 'Свайпай: нравится / не нравится. Сохраняй лучшие варианты.';
    return 'Что-то пошло не так. Можно попробовать другое фото.';
  }, [status]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setStatus('uploaded');
    setResults([]);
    setActive(0);
  }

  async function createJob() {
    if (!file) return;
    setStatus('queued');
    try {
      const uploadReq = await fetch(`${API_BASE}/api/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type })
      }).then(r => r.json());

      await fetch(uploadReq.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

      const job = await fetch(`${API_BASE}/api/create-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalKey: uploadReq.key, requestedStyles: styles })
      }).then(r => r.json());

      setJobId(job.jobId);
      pollJob(job.jobId);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  async function pollJob(id: string) {
    setStatus('processing');
    const timer = window.setInterval(async () => {
      const job = await fetch(`${API_BASE}/api/job/${id}`).then(r => r.json());
      if (job.status === 'done') {
        window.clearInterval(timer);
        setResults(job.results);
        setStatus('done');
      }
      if (job.status === 'error') {
        window.clearInterval(timer);
        setStatus('error');
      }
    }, 2000);
  }

  async function swipe(liked: boolean) {
    if (!activeCard || !jobId) return;
    setResults(prev => prev.map((r, i) => i === active ? { ...r, liked } : r));
    await fetch(`${API_BASE}/api/swipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, resultId: activeCard.id, liked })
    }).catch(() => null);
    setActive(v => Math.min(v + 1, results.length - 1));
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="badge"><Wand2 size={16}/> AI Hair Try-On MVP</div>
        <h1>Подбор причесок свайпами</h1>
        <p>{helperText}</p>
      </section>

      <section className="grid">
        <div className="panel uploadPanel">
          <label className="dropzone">
            {preview ? <img src={preview} alt="Uploaded face" /> : <Camera size={64} />}
            <input type="file" accept="image/*" onChange={onPick} />
          </label>
          <button disabled={!file || status === 'processing' || status === 'queued'} onClick={createJob}>
            <Upload size={18}/> Сгенерировать 6 вариантов
          </button>
        </div>

        <div className="panel resultPanel">
          {activeCard ? (
            <div className="card">
              <img src={activeCard.imageUrl} alt={activeCard.style} />
              <h2>{activeCard.style}</h2>
              <div className="actions">
                <button className="no" onClick={() => swipe(false)}><X/> Не нравится</button>
                <button className="yes" onClick={() => swipe(true)}><Heart/> Нравится</button>
              </div>
            </div>
          ) : (
            <div className="empty">Здесь появятся AI-варианты причесок</div>
          )}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
