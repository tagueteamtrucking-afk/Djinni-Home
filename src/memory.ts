import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { MemoryZ, type Memory } from './types';

export function loadMemory(memoryPath: string): Memory {
  const raw = fs.readFileSync(memoryPath, 'utf8');
  const doc = yaml.load(raw);
  const parsed = MemoryZ.parse(doc);
  return parsed;
}

/** Utility: resolve default memory path if not provided. */
export function defaultMemoryPath(): string {
  // adjust to where you placed Cody's Memory.yaml
  const p = path.resolve(process.cwd(), '../memory/Cody\'s Memory.yaml');
  if (!fs.existsSync(p)) {
    throw new Error(`Memory file not found at ${p}`);
  }
  return p;
}
