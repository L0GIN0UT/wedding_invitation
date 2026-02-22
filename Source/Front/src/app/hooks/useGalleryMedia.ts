import { useEffect, useState } from 'react';
import { galleryAPI } from '../api/apiAdapter';

/**
 * Возвращает URL для просмотра медиа по относительным путям в файловом хранилище.
 * Запросы идут с текущим access_token (страницы под PrivateRoute).
 */
export function useMediaUrls(paths: string[]): {
  urls: Record<string, string>;
  loading: boolean;
  error: Error | null;
} {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const active = paths.filter(Boolean);
    if (active.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(active.map((path) => galleryAPI.getStreamUrl(path)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        active.forEach((path, i) => {
          next[path] = results[i].url;
        });
        setUrls(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paths.join(',')]);

  return { urls, loading, error };
}

/** Имя файла black_tie_{male|female}_{num}.jpg — для сортировки дресс-кода */
const DRESS_CODE_RE = /black_tie_(male|female)_(\d+)\.jpg$/i;

/**
 * Сортирует пути дресс-кода: по номеру, затем male раньше female (чередование мужские/женские).
 */
function sortDressCodePaths(paths: string[]): string[] {
  const withMeta = paths.map((path) => {
    const name = path.split('/').pop() ?? '';
    const m = name.match(DRESS_CODE_RE);
    if (!m) return { path, num: 0, sex: 'female' as const };
    const sex = m[1].toLowerCase() as 'male' | 'female';
    const num = parseInt(m[2], 10);
    return { path, num, sex };
  });
  withMeta.sort((a, b) => {
    if (a.num !== b.num) return a.num - b.num;
    return a.sex === 'male' ? -1 : 1; // male раньше female
  });
  return withMeta.map((x) => x.path);
}

/**
 * Список URL фото дресс-кода: один запрос stream-urls-batch, сортировка male/female по номеру.
 */
export function useDressCodeUrls(): { urls: string[]; loading: boolean; error: Error | null } {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    galleryAPI
      .getStreamUrlsBatch('dress_code')
      .then(({ items }) => {
        if (cancelled || items.length === 0) {
          setUrls([]);
          return;
        }
        const paths = items.map((i) => i.path);
        const pathToUrl = Object.fromEntries(items.map((i) => [i.path, i.url]));
        const ordered = sortDressCodePaths(paths);
        if (!cancelled) setUrls(ordered.map((p) => pathToUrl[p] ?? ''));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { urls, loading, error };
}
