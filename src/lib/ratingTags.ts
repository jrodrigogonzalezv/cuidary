import type { RatingTag } from '@/types/models';

export const RATING_TAGS: RatingTag[] = [
  'amabilidad',
  'puntualidad',
  'limpieza',
  'empatia',
  'orden',
  'buen_trato',
  'responsabilidad',
  'comunicacion',
];

export const RATING_TAG_LABEL: Record<RatingTag, string> = {
  amabilidad: 'Amabilidad',
  puntualidad: 'Puntualidad',
  limpieza: 'Limpieza',
  empatia: 'Empatía',
  orden: 'Orden',
  buen_trato: 'Buen trato',
  responsabilidad: 'Responsabilidad',
  comunicacion: 'Comunicación',
};

export function topTags(ratings: { tags?: RatingTag[] }[], max = 3): { tag: RatingTag; count: number }[] {
  const counts = new Map<RatingTag, number>();
  for (const rating of ratings) {
    for (const tag of rating.tags ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag, count]) => ({ tag, count }));
}
