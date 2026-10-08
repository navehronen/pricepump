import 'server-only';
import { demoProvider } from './demo';
import { hereProvider } from './here';
import type { ProviderMode } from '@/lib/domain/types';
export function providerMode(): ProviderMode { return process.env.DATA_PROVIDER === 'here' ? 'here' : 'demo'; }
export function getProvider() { return providerMode() === 'here' ? hereProvider : demoProvider; }
