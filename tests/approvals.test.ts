import { describe, it, expect } from 'vitest';
import { approvalsSatisfied } from '../src/policy';
import type { PermissionRequest } from '../src/types';

const mk = (scopes: string[], approvals: string[]): PermissionRequest => ({
  id: 'req1',
  assistantId: 'clarice',
  scopes,
  reason: 'test',
  createdAt: new Date().toISOString(),
  approvals: approvals.map(a => ({ approverId: a, approvedAt: new Date().toISOString(), signature: 'x' }))
});

describe('policy', () => {
  it('low-risk needs 1 approval', () => {
    expect(approvalsSatisfied(mk(['read_memory'], ['ray_czar']))).toBe(true);
  });
  it('high-risk needs both approvals', () => {
    expect(approvalsSatisfied(mk(['approve_deployments'], ['ray_czar']))).toBe(false);
    expect(approvalsSatisfied(mk(['approve_deployments'], ['ray_czar','white_star']))).toBe(true);
  });
});
