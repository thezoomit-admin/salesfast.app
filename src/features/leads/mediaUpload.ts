import { api } from '@/api/client';
import type { ApiResponse } from '@/types/api';

type MediaItem = { url: string; name?: string };

/** Same CRM media upload web NoteComposer uses (`files` multipart field). */
export async function uploadMediaFile(
  uri: string,
  name: string,
  mimeType = 'audio/m4a',
  options: { accountId?: string; folder?: string } = {}
) {
  const form = new FormData();
  form.append('files', {
    uri,
    name,
    type: mimeType,
  } as unknown as Blob);
  form.append('title', name);
  form.append('folder', options.folder ?? 'crm/documents');

  const { data } = await api.post<ApiResponse<MediaItem[] | MediaItem>>(
    '/media/upload',
    form,
    {
      accountId: options.accountId,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }
  );

  const uploaded = data.data;
  const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  if (!first?.url) throw new Error('Upload failed — no media URL returned');
  return {
    url: first.url,
    name: name || first.name || 'Voice note',
  };
}
