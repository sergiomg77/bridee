import { apiFetch } from '../api';
import { API } from '../../constants/api';

export async function getKeywords(): Promise<{ data: string[] | null; error: string | null }> {
  return apiFetch<string[]>(API.search.keywords(), { method: 'GET' });
}
