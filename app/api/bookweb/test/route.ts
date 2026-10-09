import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
export async function GET(request: NextRequest) {
  const hp_id = '97b86d41-d26e-4262-a694-9c852e10899f';
  const { data: edges } = await supabase.from('book_edges').select('*').or('book_a_id.eq.' + hp_id + ',book_b_id.eq.' + hp_id);
  return NextResponse.json({ hp_edges: edges?.length, edges });
}
