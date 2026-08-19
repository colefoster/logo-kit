import { listIconNames } from '@/src/svg';

export async function GET(): Promise<Response> {
  try {
    // The icon set is fixed for the lifetime of a deploy, and this list is ~21 KB
    // fetched on every page load. Let the browser and the edge hold onto it.
    return Response.json(
      { icons: listIconNames() },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  } catch (err) {
    console.error('Icon list unavailable:', err);
    return Response.json({ error: 'Icon list unavailable' }, { status: 500 });
  }
}
