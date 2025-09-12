import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { approvalsSatisfied } from './policy';
import type { PermissionRequest, ApprovalReceipt } from './types';

const REQUESTS_PATH = path.resolve(process.cwd(), 'requests.json'); // append-only log

function loadRequests(): PermissionRequest[] {
  if (!fs.existsSync(REQUESTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(REQUESTS_PATH, 'utf8'));
}

function saveRequests(reqs: PermissionRequest[]) {
  fs.writeFileSync(REQUESTS_PATH, JSON.stringify(reqs, null, 2) + '\n', 'utf8');
}

/** Create a signature placeholder (replace with real cryptographic signing later). */
function sign(approverId: string, requestId: string): string {
  return crypto.createHash('sha256').update(`${approverId}:${requestId}`).digest('hex');
}

export function listRequests(): PermissionRequest[] {
  return loadRequests();
}

export function newRequest(req: Omit<PermissionRequest, 'approvals'>): PermissionRequest {
  const full: PermissionRequest = { ...req, approvals: [] };
  const reqs = loadRequests();
  reqs.push(full);
  saveRequests(reqs);
  return full;
}

export function approveRequest(requestId: string, approverId: 'ray_czar' | 'white_star'): PermissionRequest {
  const reqs = loadRequests();
  const idx = reqs.findIndex(r => r.id === requestId);
  if (idx < 0) throw new Error(`Request not found: ${requestId}`);
  const r = reqs[idx];
  const already = r.approvals.some(a => a.approverId === approverId);
  if (!already) {
    const receipt: ApprovalReceipt = {
      approverId,
      approvedAt: new Date().toISOString(),
      signature: sign(approverId, r.id),
    };
    r.approvals.push(receipt);
    reqs[idx] = r;
    saveRequests(reqs);
  }
  return r;
}

/** Build a CI artifact summarizing approvals & policy verdict. */
export function buildApprovalArtifact(requestId: string) {
  const reqs = loadRequests();
  const r = reqs.find(x => x.id === requestId);
  if (!r) throw new Error(`Request not found: ${requestId}`);
  const ok = approvalsSatisfied(r);
  const artifact = {
    requestId: r.id,
    ok,
    approvals: r.approvals,
    scopes: r.scopes,
    generatedAt: new Date().toISOString()
  };
  const out = path.resolve(process.cwd(), `approval-artifact_${r.id}.json`);
  fs.writeFileSync(out, JSON.stringify(artifact, null, 2) + '\n', 'utf8');
  return out;
}
