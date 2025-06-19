// Test if config can be imported properly

import pumpConfig from './infusion-pump-config.json' assert { type: 'json' };

console.log('Config loaded:', !!pumpConfig);
console.log('Medications available:', Object.keys(pumpConfig.medications || {}));
console.log('ELFABRIO config:', pumpConfig.medications?.ELFABRIO);