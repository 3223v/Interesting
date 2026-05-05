import { NextResponse } from 'next/server';
import crypto from 'crypto';

interface TranslateRequest {
  text: string;
  from?: string;
  to: string;
}

function generateAuthStr(params: Record<string, string | number>, apiKey: string): string {
  const allParams = { ...params, apikey: apiKey };
  const sortedKeys = Object.keys(allParams).sort() as (keyof typeof allParams)[];
  const paramStr = sortedKeys.map(key => `${key}=${allParams[key]}`).join('&');
  return crypto.createHash('md5').update(paramStr).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body: TranslateRequest = await request.json();
    const { text, from = 'en', to } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const appId = process.env.NIUTRANS_APP_ID;
    const apiKey = process.env.NIUTRANS_API_KEY;

    if (!appId || !apiKey) {
      return NextResponse.json({ error: 'NIUTRANS_APP_ID or NIUTRANS_API_KEY is not configured' }, { status: 500 });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const authParams = {
      from,
      to,
      appId,
      timestamp
    };

    const authStr = generateAuthStr(authParams, apiKey);

    const apiUrl = process.env.NIUTRANS_API_URL || 'https://api.niutrans.com/v2/text/translate/json';

    let srcText: unknown;
    try {
      srcText = JSON.parse(text);
      if (typeof srcText !== 'object' || srcText === null) {
        srcText = { value: text };
      }
    } catch {
      srcText = { value: text };
    }

    const requestBody = {
      from,
      to,
      appId,
      timestamp,
      authStr,
      srcText,
    };

    console.log('NiuTrans Request:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok || data.errorCode) {
      console.error('NiuTrans API Error:', { status: response.status, data });
      return NextResponse.json({
        error: `Translation error: ${data.errorMsg || data.errorCode || response.statusText}`,
        details: data
      }, { status: response.ok ? 400 : response.status });
    }

    let translatedText = data.tgtText;
    if (typeof translatedText === 'object' && translatedText !== null) {
      translatedText = JSON.stringify(translatedText);
    }

    return NextResponse.json({
      translatedText,
      from: data.from,
      to: data.to,
    });
  } catch (error) {
    console.error('Translate API Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}