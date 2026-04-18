import { create } from 'zustand';

export const useLicenseStore = create((set, get) => ({
  license: null,
  hardwareId: null,
  isInitialized: false,
  amcExpiredFlag: false,

  init: async () => {
    // don't re-initialize if already done
    if (get().isInitialized) return;

    try {
      // Try to get hardware ID and license status in parallel
      const [hwId, status] = await Promise.all([
        window.electronAPI ? window.electronAPI.invoke('license:getHardwareId') : Promise.resolve(null),
        window.zapbillCloud ? window.zapbillCloud.getLicenseStatus() : (window.electronAPI ? window.electronAPI.invoke('license:getLicense') : Promise.resolve(null))
      ]);

      console.log('License Init - Status:', status);
      
      let lic = null;
      // If we got an object from zapbillCloud, check is_activated
      if (status && typeof status === 'object') {
        if (status.is_activated) {
          lic = status;
        } else if (Object.keys(status).length > 0) {
          // It's the status object but not activated yet
          lic = null;
        } else {
          // Possibly raw license data (fallback)
          lic = status.license_key ? status : null;
        }
      } else {
        lic = status; // Likely null from electronAPI
      }
      
      let isAmcExpired = false;
      if (lic && lic.amc_end_date) {
        if (new Date(lic.amc_end_date) < new Date()) {
          isAmcExpired = true;
        }
      }

      set({ 
        license: lic, 
        hardwareId: hwId, 
        isInitialized: true, 
        amcExpiredFlag: isAmcExpired 
      });

      // Listen for live updates
      if (window.zapbillCloud?.onFeaturesChanged) {
        window.zapbillCloud.onFeaturesChanged(async () => {
          const freshStatus = await window.zapbillCloud.getLicenseStatus();
          if (freshStatus && freshStatus.is_activated) {
            let expired = false;
            if (freshStatus.amc_end_date && new Date(freshStatus.amc_end_date) < new Date()) {
              expired = true;
            }
            set({ license: freshStatus, amcExpiredFlag: expired });
          }
        });
      }
    } catch (error) {
      console.error('Failed to init license store:', error);
      set({ isInitialized: true, license: null });
    }
  },

  activate: async (credentials) => {
    try {
      let response;
      if (window.zapbillCloud?.activateLicense) {
        response = await window.zapbillCloud.activateLicense(credentials.licenseKey, credentials.licenseSecret);
      } else {
        response = await window.electronAPI.invoke('license:activate', credentials);
      }
      
      if (response.success) {
        const lic = await window.zapbillCloud.getLicenseStatus();
        let isAmcExpired = false;
        if (lic?.amc_end_date && new Date(lic.amc_end_date) < new Date()) {
          isAmcExpired = true;
        }
        set({ license: lic, amcExpiredFlag: isAmcExpired });
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  sync: async () => {
    try {
      if (window.zapbillCloud?.heartbeatNow) {
        await window.zapbillCloud.heartbeatNow();
        const lic = await window.zapbillCloud.getLicenseStatus();
        if (lic) {
          let isAmcExpired = false;
          if (lic.amc_end_date && new Date(lic.amc_end_date) < new Date()) {
            isAmcExpired = true;
          }
          set({ license: lic, amcExpiredFlag: isAmcExpired });
        }
      } else {
        const lic = await window.electronAPI.invoke('license:sync');
        if (lic) {
          let isAmcExpired = false;
          if (lic.amc_end_date && new Date(lic.amc_end_date) < new Date()) {
            isAmcExpired = true;
          }
          set({ license: lic, amcExpiredFlag: isAmcExpired });
        }
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
