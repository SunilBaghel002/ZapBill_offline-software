import { create } from 'zustand';

export const useLicenseStore = create((set, get) => ({
  license: null,
  hardwareId: null,
  isInitialized: false,
  amcExpiredFlag: false,

  init: async () => {
    try {
      const hwId = await window.electronAPI.invoke('license:getHardwareId');
      const lic = await window.electronAPI.invoke('license:getLicense');
      
      let isAmcExpired = false;
      if (lic && lic.amc_end_date) {
        if (new Date(lic.amc_end_date) < new Date()) {
          isAmcExpired = true;
        }
      }

      set({ license: lic, hardwareId: hwId, isInitialized: true, amcExpiredFlag: isAmcExpired });

      // Listen for live updates from heartbeat
      if (window.electronAPI?.on) {
        window.electronAPI.on('license:updated', async () => {
          const freshLicense = await window.electronAPI.invoke('license:getLicense');
          if (freshLicense) {
            let expired = false;
            if (freshLicense.amc_end_date && new Date(freshLicense.amc_end_date) < new Date()) {
              expired = true;
            }
            set({ license: freshLicense, amcExpiredFlag: expired });
          }
        });
      }
    } catch (error) {
      console.error('Failed to init license store:', error);
      set({ isInitialized: true });
    }
  },

  activate: async (credentials) => {
    try {
      const response = await window.electronAPI.invoke('license:activate', credentials);
      if (response.success) {
        let isAmcExpired = false;
        if (response.license?.amc_end_date && new Date(response.license.amc_end_date) < new Date()) {
          isAmcExpired = true;
        }
        set({ license: response.license, amcExpiredFlag: isAmcExpired });
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  sync: async () => {
    try {
      const lic = await window.electronAPI.invoke('license:sync');
      if (lic) {
        let isAmcExpired = false;
        if (lic.amc_end_date && new Date(lic.amc_end_date) < new Date()) {
          isAmcExpired = true;
        }
        set({ license: lic, amcExpiredFlag: isAmcExpired });
      }
    } catch (e) {
      console.error('License sync failed', e);
    }
  },

  hasFeature: (featureKey) => {
    const { license } = get();
    if (!license || !license.features) return false;
    // Simple check: is the feature_key in the features array?
    return license.features.includes(featureKey);
  },
  
  getTrialInfo: (featureKey) => {
    const { license } = get();
    if (!license || !license.feature_trials) return null;
    if (license.feature_trials[featureKey]) {
      return license.feature_trials[featureKey];
    }
    return null;
  }
}));
