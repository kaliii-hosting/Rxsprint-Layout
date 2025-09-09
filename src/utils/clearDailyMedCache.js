// Clear DailyMed cache utility
export const clearDailyMedCache = () => {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  keys.forEach(key => {
    if (key.startsWith('dailymed_cache_')) {
      localStorage.removeItem(key);
      cleared++;
    }
  });
  console.log(`Cleared ${cleared} DailyMed cache entries`);
  return cleared;
};

// Auto-clear on load if needed
if (typeof window !== 'undefined') {
  window.clearDailyMedCache = clearDailyMedCache;
}