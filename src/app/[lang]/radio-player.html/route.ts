import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  const html = await readFile(
    join(process.cwd(), 'public', 'radio-player.html'),
    'utf-8',
  );

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
