import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Missing environment variables' });
  }

  try {
    const response = await fetch(`${url}/rest/v1/users?select=count&limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });

    const text = await response.text();
    
    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      body: text,
      url: url,
      keyLength: anonKey.length,
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}