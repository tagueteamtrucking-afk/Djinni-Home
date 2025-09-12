import type { PermissionRequest } from './types';

const HIGH_RISK_SCOPES = new Set([
  'grant_permissions',
  'revoke_permissions',
  'approve_deployments',
  'manage_secrets'
]);

export function isHighRisk(scopes: string[]): boolean {
  return scopes.some(s => HIGH_RISK_SCOPES.has(s));
}

/** Two distinct overseers must approve high-risk requests; one is enough for low-risk. */
export function approvalsSatisfied(req: PermissionRequest): boolean {
  const uniqueApprovers = new Set(req.approvals.map(a => a.approverId));
  if (isHighRisk(req.scopes)) return uniqueApprovers.size >= 2;
  return uniqueApprovers.size >= 1;
}
