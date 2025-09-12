import { z } from 'zod';

export const OverseerZ = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  status: z.string(),
  domains: z.array(z.string()),
});

export const MemoryZ = z.object({
  meta: z.object({
    project: z.literal('Avalon'),
    file_name: z.string(),
    version: z.string(),
    last_updated: z.string(),
    author: z.string(),
    notes: z.string(),
  }),
  governance: z.object({
    overseers: z.array(OverseerZ).min(2)
  }),
  access_control: z.object({
    roles: z.array(z.object({ name: z.string(), privileges: z.array(z.string()) })),
    vault_references: z.object({
      tokens: z.string(),
      passwords: z.string(),
      permissions: z.string()
    })
  }),
}).passthrough(); // allow the rest of your fields

export type Memory = z.infer<typeof MemoryZ>;
export type Overseer = z.infer<typeof OverseerZ>;

/** Minimal permission request model kept OUTSIDE memory file (append-only log). */
export interface PermissionRequest {
  id: string;                 // e.g., "req_2025-09-11_001"
  assistantId: string;        // e.g., "clarice"
  scopes: string[];           // e.g., ["read_memory","generate_reports"]
  reason: string;
  createdAt: string;          // ISO
  approvals: ApprovalReceipt[]; // appended as overseers sign
}

export interface ApprovalReceipt {
  approverId: string;         // "ray_czar" or "white_star"
  approvedAt: string;         // ISO
  signature: string;          // placeholder for real signature
}
