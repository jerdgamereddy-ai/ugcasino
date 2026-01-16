import { z } from 'zod';
import { insertUserSchema, insertVoucherSchema, redeemVoucherSchema, users, vouchers, transactions } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout',
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  vouchers: {
    create: {
      method: 'POST' as const,
      path: '/api/vouchers',
      input: insertVoucherSchema,
      responses: {
        201: z.custom<typeof vouchers.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    redeem: {
      method: 'POST' as const,
      path: '/api/vouchers/redeem',
      input: redeemVoucherSchema,
      responses: {
        200: z.object({ balance: z.number(), message: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/vouchers',
      responses: {
        200: z.array(z.custom<typeof vouchers.$inferSelect>()),
        403: errorSchemas.forbidden,
      },
    },
  },
  games: {
    slots: {
      spin: {
        method: 'POST' as const,
        path: '/api/games/slots/spin',
        input: z.object({ bet: z.number().min(100) }), // Min 100 UGX
        responses: {
          200: z.custom<{
            won: boolean;
            payout: number;
            balance: number;
            reels: string[];
          }>(),
          400: errorSchemas.validation,
        },
      },
    },
    roulette: {
      spin: {
        method: 'POST' as const,
        path: '/api/games/roulette/spin',
        input: z.object({
          bet: z.number().min(100),
          type: z.enum(['number', 'color', 'parity']),
          value: z.union([z.number(), z.string()]),
        }),
        responses: {
          200: z.custom<{
            won: boolean;
            payout: number;
            balance: number;
            result: { number: number; color: string };
          }>(),
          400: errorSchemas.validation,
        },
      },
    },
  },
  admin: {
    users: {
      method: 'GET' as const,
      path: '/api/admin/users',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        403: errorSchemas.forbidden,
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
