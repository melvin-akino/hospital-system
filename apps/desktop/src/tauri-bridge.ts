/**
 * tauri-bridge.ts
 *
 * Loaded early in the app to wire up Tauri-specific behaviour:
 *  - Sets window.__TAURI_API_URL__ once the API sidecar reports ready
 *  - Shows a splash screen while the API is booting
 *  - Registers protocol handlers (if needed)
 *
 * Import this from apps/web/src/main.tsx when running inside Tauri.
 */

declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_API_URL__?: string;
    __TAURI_DESKTOP__?: boolean;
  }
}

export function isTauriDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI__;
}

export async function initTauriBridge(): Promise<void> {
  if (!isTauriDesktop()) return;

  const { invoke, listen } = await import('@tauri-apps/api/core');

  // Get API URL from Rust backend
  const apiUrl = await invoke<string>('get_api_url');
  window.__TAURI_API_URL__ = apiUrl;
  console.log('[Tauri Bridge] API URL:', apiUrl);

  // Listen for API ready event
  await listen<boolean>('api-ready', () => {
    console.log('[Tauri Bridge] API is ready');
    hideSplash();
  });

  // Listen for API loading progress
  await listen<number>('api-loading', (event) => {
    updateSplashProgress(event.payload);
  });

  // Listen for API timeout
  await listen<boolean>('api-timeout', () => {
    showSplashError('API server did not start in time. Please restart the application.');
  });

  // Check if already ready
  const ready = await invoke<boolean>('is_api_ready');
  if (ready) {
    hideSplash();
  } else {
    showSplash();
  }
}

// ── Splash screen helpers ──────────────────────────────────────────────────────

function showSplash() {
  const splash = getSplashElement();
  splash.style.display = 'flex';
}

function hideSplash() {
  const splash = getSplashElement();
  splash.style.opacity = '0';
  setTimeout(() => {
    splash.style.display = 'none';
  }, 400);
}

function updateSplashProgress(attempt: number) {
  const el = document.getElementById('tauri-splash-status');
  if (el) {
    const dots = '.'.repeat((attempt % 3) + 1);
    el.textContent = `Starting services${dots} (${attempt}s)`;
  }
}

function showSplashError(message: string) {
  const el = document.getElementById('tauri-splash-status');
  if (el) {
    el.textContent = message;
    el.style.color = '#ff4d4f';
  }
}

function getSplashElement(): HTMLElement {
  let el = document.getElementById('tauri-splash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tauri-splash';
    el.innerHTML = `
      <div style="
        position: fixed; inset: 0; z-index: 99999;
        background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transition: opacity 0.4s ease;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">🏥</div>
        <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">iHIMS</div>
        <div style="font-size: 13px; opacity: 0.75; margin-top: 4px; margin-bottom: 32px;">
          Integrated Hospital Information Management System
        </div>
        <div style="
          width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        "></div>
        <div id="tauri-splash-status" style="margin-top: 20px; font-size: 13px; opacity: 0.8;">
          Starting services...
        </div>
        <style>
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </div>
    `;
    document.body.prepend(el);
  }
  return el;
}
