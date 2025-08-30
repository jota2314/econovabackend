import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Check if environment variables are loaded
  const envCheck = {
    hasUrl: !!url,
    hasAnonKey: !!anonKey,
    urlLength: url?.length,
    anonKeyLength: anonKey?.length,
    urlFirst10: url?.substring(0, 10),
    urlLast10: url?.substring(url.length - 10),
    keyFirst10: anonKey?.substring(0, 10),
    keyLast10: anonKey?.substring(anonKey.length - 10),
  };

  return NextResponse.json(envCheck);
}