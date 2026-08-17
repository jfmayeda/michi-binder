import { NextResponse } from 'next/server';
import { allowedCardImageSrc } from '@/export/cardImageAllowlist';

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get('src') ?? '';
  if (!allowedCardImageSrc(src)) {
    return NextResponse.json({ error: 'forbidden-host' }, { status: 400 });
  }
  const upstream = await fetch(src);
  if (!upstream.ok) {
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
