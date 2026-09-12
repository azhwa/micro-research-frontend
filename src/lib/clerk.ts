import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { Clerk } from '@clerk/clerk-js';

let instance: Clerk | null = null;
let loadPromise: Promise<Clerk | null> | null = null;

async function getInstance() {
  if (!browser || !env.PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  const { Clerk: ClerkConstructor } = await import('@clerk/clerk-js');
  instance ??= new ClerkConstructor(env.PUBLIC_CLERK_PUBLISHABLE_KEY);
  return instance;
}

export async function loadClerk() {
  const clerk = await getInstance();
  if (!clerk) return null;

  // `mountSignIn` and `mountUserButton` are embedded Clerk UI components.
  // When using clerk-js directly, the UI bundle must be provided explicitly.
  const { ui } = await import('@clerk/ui');
  const options = ui.ClerkUI ? { ui: { ClerkUI: ui.ClerkUI } } : undefined;

  loadPromise ??= clerk.load(options).then(() => clerk);
  return loadPromise;
}

export async function getClerkToken() {
  const clerk = await loadClerk();
  return clerk?.session?.getToken() ?? null;
}

export function clerkConfigured() {
  return Boolean(env.PUBLIC_CLERK_PUBLISHABLE_KEY);
}
