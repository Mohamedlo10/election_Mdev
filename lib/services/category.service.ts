import { createClient } from '@/lib/supabase/client';
import type { Category, CreateCategory, UpdateCategory, ApiResponse } from '@/types';

const supabase = createClient();

export async function getCategories(instanceId: string): Promise<ApiResponse<Category[]>> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('instance_id', instanceId)
    .order('order', { ascending: true });

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Category[], error: null, success: true };
}

export async function getCategory(id: string): Promise<ApiResponse<Category>> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Category, error: null, success: true };
}

export async function createCategory(category: CreateCategory): Promise<ApiResponse<Category>> {
  // Obtenir le prochain ordre
  const { data: maxOrder } = await supabase
    .from('categories')
    .select('order')
    .eq('instance_id', category.instance_id)
    .order('order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = maxOrder ? maxOrder.order + 1 : 0;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...category,
      order: category.order ?? nextOrder,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Category, error: null, success: true };
}

export async function updateCategory(id: string, updates: UpdateCategory): Promise<ApiResponse<Category>> {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: data as Category, error: null, success: true };
}

export async function deleteCategory(id: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    return { data: null, error: error.message, success: false };
  }

  return { data: null, error: null, success: true };
}

export async function reorderCategories(
  instanceId: string,
  categoryIds: string[]
): Promise<ApiResponse<null>> {
  const updates = categoryIds.map((id, index) => ({
    id,
    order: index,
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('categories')
      .update({ order: update.order })
      .eq('id', update.id);

    if (error) {
      return { data: null, error: error.message, success: false };
    }
  }

  return { data: null, error: null, success: true };
}
