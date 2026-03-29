import { supabase } from '../../lib/supabase';

export type BridalDNAResponse = {
  energy_anchor: string | null;
  construction_priority: string | null;
  budget_range: string | null;
  silhouette: string[];
  detail_draw: string[];
  inspiration_source: string[];
  non_negotiables: string[];
  soul_weight: string | null;
};

export async function saveBridalDNA(userId: string, responses: BridalDNAResponse): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('bridal_dna_responses')
    .upsert(
      { user_id: userId, ...responses, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (error) return { error: new Error(error.message) };
  return { error: null };
}
