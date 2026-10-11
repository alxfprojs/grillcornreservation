import { NextResponse } from 'next/server';
import { z } from 'zod';
import { API_VERSION, VERSION } from './version';

/**
 * Versioned REST API conventions.
 *
 * Every response under `/api/v1` uses the same envelope so clients can rely on
 * a single parsing strategy:
 *
 *   success: { "data": <payload>, "meta": { ... } }
 *   failure: { "error": { "code": "VALIDATION_ERROR", "message": "...", "fields": {...} } }
 *
 * `X-App-Version` and `X-API-Version` are attached to every response.
 */

export const API_PREFIX = `/api/${API_VERSION}`;

export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export type ApiMeta = Record<string, unknown>;

function withHeaders(body: unknown, status: number, extraHeaders?: HeadersInit) {
  const res = NextResponse.json(body, { status, headers: extraHeaders });
  res.headers.set('X-App-Version', VERSION);
  res.headers.set('X-API-Version', API_VERSION);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

/** 200/201 with the standard envelope. */
export function apiOk<T>(data: T, meta: ApiMeta = {}, status = 200) {
  return withHeaders(
    { data, meta: { ...meta, apiVersion: API_VERSION, appVersion: VERSION } },
    status,
  );
}

/** 201 for resource creation. */
export function apiCreated<T>(data: T, meta: ApiMeta = {}) {
  return apiOk(data, meta, 201);
}

/** A paginated list response. */
export function apiList<T>(
  items: T[],
  meta: { total: number; page: number; pageSize: number } & ApiMeta,
) {
  const { total, page, pageSize, ...rest } = meta;
  return withHeaders(
    {
      data: items,
      meta: {
        ...rest,
        apiVersion: API_VERSION,
        appVersion: VERSION,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    },
    200,
  );
}

export function apiError(code: ErrorCode, message: string, fields?: Record<string, string>) {
  const status = STATUS_BY_CODE[code];
  return withHeaders(
    {
      error: {
        code,
        message,
        ...(fields ? { fields } : {}),
      },
    },
    status,
  );
}

/** Map a thrown error to a response. Unknown errors become a generic 500. */
export function apiErrorFrom(err: unknown) {
  if (err instanceof z.ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!(key in fields)) fields[key] = issue.message;
    }
    return apiError(ERROR_CODES.VALIDATION_ERROR, 'The request body failed validation.', fields);
  }
  return apiError(ERROR_CODES.INTERNAL, 'Something went wrong on our end.');
}

/**
 * Translate the sentinel errors thrown by `lib/rbac.ts` and the domain layer
 * into HTTP responses.
 */
export function apiErrorForThrown(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  switch (message) {
    case 'UNAUTHENTICATED':
      return apiError(ERROR_CODES.UNAUTHENTICATED, 'Sign in to continue.');
    case 'FORBIDDEN':
      return apiError(ERROR_CODES.FORBIDDEN, 'Your account does not have access to this resource.');
    case 'NOT_FOUND':
      return apiError(ERROR_CODES.NOT_FOUND, 'Resource not found.');
    case 'CONFLICT':
      return apiError(ERROR_CODES.CONFLICT, 'That change conflicts with the current state.');
    case 'PACKAGE_NOT_FOUND':
    case 'ADDON_NOT_FOUND':
    case 'SLOT_NOT_FOUND':
      return apiError(ERROR_CODES.NOT_FOUND, 'The selected menu item is no longer available.');
    case 'PACKAGE_INACTIVE':
      return apiError(ERROR_CODES.UNPROCESSABLE, 'That package is not currently bookable.');
    case 'PARTY_SIZE_OUT_OF_RANGE':
      return apiError(ERROR_CODES.UNPROCESSABLE, 'Party size is outside the package limits.');
    case 'SLOT_FULL':
      return apiError(ERROR_CODES.CONFLICT, 'That slot no longer has enough seats remaining.');
    case 'SLOT_CLOSED':
      return apiError(ERROR_CODES.CONFLICT, 'That slot is closed for bookings.');
    case 'SLOT_FULLY_BOOKED':
      return apiError(ERROR_CODES.UNPROCESSABLE, 'This reservation is already booked.');
    case 'INVALID_STATUS_TRANSITION':
      return apiError(ERROR_CODES.UNPROCESSABLE, 'That status change is not allowed.');
    case 'RESERVATION_LOCKED':
      return apiError(ERROR_CODES.UNPROCESSABLE, 'This reservation can no longer be edited.');
    case 'LAST_ADMIN':
      return apiError(ERROR_CODES.CONFLICT, 'At least one active admin account must remain.');
    case 'SELF_DEMOTE':
      return apiError(ERROR_CODES.UNPROCESSABLE, 'You cannot remove your own admin access.');
    default:
      return apiErrorFrom(err);
  }
}

