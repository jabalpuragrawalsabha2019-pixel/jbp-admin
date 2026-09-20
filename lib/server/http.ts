/**
 * Shared JSON / CORS helpers for API routes.
 */
import { NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

/**
 * Handles CORS preflight for API routes.
 * @returns Empty 204 response with CORS headers
 */
export function corsOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * JSON response with CORS headers.
 * @param body - Response payload
 * @param status - HTTP status code
 */
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS })
}
