// Utility to clear all DailyMed cache
export const clearAllDailyMedCache = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('dailymed_') || key.includes('search_') || key.includes('details_') || key.includes('images_'))) {
      keys.push(key);
    }
  }
  
  keys.forEach(key => localStorage.removeItem(key));
  console.log(`Cleared ${keys.length} DailyMed cache entries`);
  return keys.length;
};