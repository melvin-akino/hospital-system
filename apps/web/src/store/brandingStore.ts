import { create } from 'zustand';
import axios from 'axios';

export interface BrandingConfig {
  systemName: string;
  systemSubtitle: string;
  logoUrl: string | null;
  primaryColor: string;
  sidebarColor: string;
}

interface BrandingState extends BrandingConfig {
  loaded: boolean;
  loadBranding: () => Promise<void>;
  updateBranding: (data: Partial<BrandingConfig>) => void;
}

const DEFAULTS: BrandingConfig = {
  systemName:     'iHIMS',
  systemSubtitle: 'intelligent Hospital Information System',
  logoUrl:        null,
  primaryColor:   '#1890ff',
  sidebarColor:   '#001529',
};

export const useBrandingStore = create<BrandingState>((set) => ({
  ...DEFAULTS,
  loaded: false,

  loadBranding: async () => {
    try {
      const res = await axios.get('/api/settings/branding');
      const d = res.data?.data;
      if (d) {
        set({
          systemName:     d.systemName     || DEFAULTS.systemName,
          systemSubtitle: d.systemSubtitle || DEFAULTS.systemSubtitle,
          logoUrl:        d.logoUrl        || null,
          primaryColor:   d.primaryColor   || DEFAULTS.primaryColor,
          sidebarColor:   d.sidebarColor   || DEFAULTS.sidebarColor,
          loaded: true,
        });
      } else {
        set({ ...DEFAULTS, loaded: true });
      }
    } catch {
      // Network/API not ready — use defaults silently
      set({ ...DEFAULTS, loaded: true });
    }
  },

  updateBranding: (data) => set((state) => ({ ...state, ...data })),
}));
