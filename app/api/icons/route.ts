import { listIconNames } from '@/src/svg';

export async function GET(): Promise<Response> {
  const icons = listIconNames();
  return Response.json({ icons });
}
