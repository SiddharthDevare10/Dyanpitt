/**
 * Form Auto-save Utility
 * Automatically saves form data to localStorage and recovers it
 */

import logger from './logger';

class FormAutoSave {
  constructor(formId, options = {}) {
    this.formId = formId;
    this.storageKey = `autosave_${formId}`;
    this.options = {
      saveInterval: 3000, // Save every 3 seconds
      excludeFields: ['password', 'confirmPassword'], // Fields to exclude from auto-save
      onSave: null, // Callback when data is saved
      onRestore: null, // Callback when data is restored
      ...options
    };
    
    this.saveTimer = null;
    this.isEnabled = true;
  }

  /**
   * Save form data to localStorage
   * @param {Object} formData - Form data to save
   */
  save(formData) {
    if (!this.isEnabled) return;

    try {
      // Filter out excluded fields
      const filteredData = this.filterData(formData);
      
      const saveData = {
        data: filteredData,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };

      localStorage.setItem(this.storageKey, JSON.stringify(saveData));
      
      if (this.options.onSave) {
        this.options.onSave(filteredData);
      }

      logger.debug(`Auto-saved form: ${this.formId}`);
    } catch (error) {
      logger.error('Auto-save failed:', error);
    }
  }

  /**
   * Load saved form data from localStorage
   * @returns {Object|null} - Saved form data or null
   */
  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const saveData = JSON.parse(saved);
      
      // Check if data is not too old (24 hours)
      const saveTime = new Date(saveData.timestamp);
      const now = new Date();
      const hoursDiff = (now - saveTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        this.clear();
        return null;
      }

      if (this.options.onRestore) {
        this.options.onRestore(saveData.data);
      }

      logger.debug(`Restored form data: ${this.formId}`);
      return saveData.data;
    } catch (error) {
      logger.error('Auto-restore failed:', error);
      return null;
    }
  }

  /**
   * Start auto-saving with debounced timer
   * @param {Object} formData - Current form data
   */
  scheduleAutoSave(formData) {
    if (!this.isEnabled) return;

    // Clear existing timer
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    // Schedule new save
    this.saveTimer = setTimeout(() => {
      this.save(formData);
    }, this.options.saveInterval);
  }

  /**
   * Clear saved data
   */
  clear() {
    localStorage.removeItem(this.storageKey);
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    logger.debug(`Cleared auto-save data: ${this.formId}`);
  }

  /**
   * Disable auto-save
   */
  disable() {
    this.isEnabled = false;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Enable auto-save
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Filter out excluded fields from form data
   * @param {Object} formData - Raw form data
   * @returns {Object} - Filtered form data
   */
  filterData(formData) {
    const filtered = { ...formData };
    
    this.options.excludeFields.forEach(field => {
      delete filtered[field];
    });

    return filtered;
  }

  /**
   * Check if there's saved data available
   * @returns {boolean} - Whether saved data exists
   */
  hasSavedData() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) return false;

    try {
      const saveData = JSON.parse(saved);
      const saveTime = new Date(saveData.timestamp);
      const now = new Date();
      const hoursDiff = (now - saveTime) / (1000 * 60 * 60);
      
      return hoursDiff <= 24;
    } catch {
      return false;
    }
  }

  /**
   * Get save timestamp
   * @returns {Date|null} - When data was last saved
   */
  getSaveTime() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const saveData = JSON.parse(saved);
      return new Date(saveData.timestamp);
    } catch {
      return null;
    }
  }
}

/**
 * React hook for form auto-save
 * @param {string} formId - Unique form identifier
 * @param {Object} formData - Current form data
 * @param {Object} options - Auto-save options
 * @returns {Object} - Auto-save utilities
 */
import { useMemo, useCallback } from 'react';

export const useFormAutoSave = (formId, formData, options = {}) => {
  // Create autoSave instance only once using useMemo
  // options is intentionally excluded as it should not recreate the instance
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const autoSave = useMemo(() => new FormAutoSave(formId, options), [formId]);

  // Auto-save when form data changes
  const scheduleAutoSave = useCallback(() => {
    autoSave.scheduleAutoSave(formData);
  }, [autoSave, formData]);

  // Load saved data
  const loadSavedData = useCallback(() => {
    return autoSave.load();
  }, [autoSave]);

  // Clear saved data
  const clearSavedData = useCallback(() => {
    autoSave.clear();
  }, [autoSave]);

  // Check if saved data exists
  const hasSavedData = useCallback(() => {
    return autoSave.hasSavedData();
  }, [autoSave]);

  // Get save time
  const getSaveTime = useCallback(() => {
    return autoSave.getSaveTime();
  }, [autoSave]);

  return useMemo(() => ({
    scheduleAutoSave,
    loadSavedData,
    clearSavedData,
    hasSavedData,
    getSaveTime,
    disable: () => autoSave.disable(),
    enable: () => autoSave.enable()
  }), [scheduleAutoSave, loadSavedData, clearSavedData, hasSavedData, getSaveTime, autoSave]);
};

/**
 * Simple auto-save function for immediate use
 * @param {string} formId - Form identifier
 * @param {Object} formData - Form data to save
 */
export const quickSave = (formId, formData) => {
  const autoSave = new FormAutoSave(formId);
  autoSave.save(formData);
};

/**
 * Simple load function for immediate use
 * @param {string} formId - Form identifier
 * @returns {Object|null} - Saved data or null
 */
export const quickLoad = (formId) => {
  const autoSave = new FormAutoSave(formId);
  return autoSave.load();
};

/**
 * Clear all auto-save data (for cleanup)
 * @param {string[]} formIds - Array of form IDs to clear
 */
export const clearAllAutoSave = (formIds = []) => {
  formIds.forEach(formId => {
    const autoSave = new FormAutoSave(formId);
    autoSave.clear();
  });
};

export default FormAutoSave;