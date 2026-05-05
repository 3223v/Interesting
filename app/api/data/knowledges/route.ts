import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'app', 'api', 'data', 'knowledges.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFile)) {
      return NextResponse.json({ knowledges: [] });
    }
    const data = fs.readFileSync(dataFile, 'utf-8');
    const parsed = JSON.parse(data);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ knowledges: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    fs.writeFileSync(dataFile, JSON.stringify(body, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}