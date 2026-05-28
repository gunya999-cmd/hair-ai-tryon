export const HAIR_STYLES = [
  'Textured crop',
  'Curtain bangs',
  'Layered medium',
  'Soft bob',
  'Long waves',
  'Classic fade'
] as const;

export type HairStyle = typeof HAIR_STYLES[number];
export type JobStatus = 'queued' | 'processing' | 'done' | 'error';
