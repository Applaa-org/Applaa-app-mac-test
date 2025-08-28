export interface DevicePreset {
  id: string;
  name: string;
  category: 'iOS' | 'Android' | 'Tablet' | 'Desktop';
  dimensions: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  borderRadius: string;
  features?: {
    notch?: boolean;
    homeIndicator?: boolean;
    punchHole?: boolean;
    physicalHomeButton?: boolean;
  };
  icon: string;
  userAgent?: string;
  description?: string;
}

export const DEVICE_PRESETS: Record<string, DevicePreset> = {
  // === iOS DEVICES ===
  'iphone-15-pro': {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    category: 'iOS',
    dimensions: { width: 393, height: 852 },
    pixelRatio: 3,
    borderRadius: '47px',
    features: {
      notch: true,
      homeIndicator: true,
    },
    icon: '📱',
    userAgent: 'iPhone15,2',
    description: 'Latest iPhone with Dynamic Island'
  },
  
  'iphone-14': {
    id: 'iphone-14',
    name: 'iPhone 14',
    category: 'iOS',
    dimensions: { width: 390, height: 844 },
    pixelRatio: 3,
    borderRadius: '47px',
    features: {
      notch: true,
      homeIndicator: true,
    },
    icon: '📱',
    userAgent: 'iPhone14,7',
    description: 'Popular iPhone model'
  },
  
  'iphone-13-mini': {
    id: 'iphone-13-mini',
    name: 'iPhone 13 Mini',
    category: 'iOS',
    dimensions: { width: 375, height: 812 },
    pixelRatio: 3,
    borderRadius: '39px',
    features: {
      notch: true,
      homeIndicator: true,
    },
    icon: '📱',
    userAgent: 'iPhone14,4',
    description: 'Compact iPhone'
  },
  
  'iphone-se': {
    id: 'iphone-se',
    name: 'iPhone SE',
    category: 'iOS',
    dimensions: { width: 375, height: 667 },
    pixelRatio: 2,
    borderRadius: '22px',
    features: {
      physicalHomeButton: true,
    },
    icon: '📱',
    userAgent: 'iPhone14,6',
    description: 'Classic iPhone design'
  },

  // === ANDROID DEVICES ===
  'galaxy-s24': {
    id: 'galaxy-s24',
    name: 'Galaxy S24',
    category: 'Android',
    dimensions: { width: 384, height: 854 },
    pixelRatio: 3,
    borderRadius: '32px',
    features: {
      punchHole: true,
    },
    icon: '🤖',
    userAgent: 'SM-S921B',
    description: 'Samsung flagship'
  },
  
  'galaxy-s23': {
    id: 'galaxy-s23',
    name: 'Galaxy S23',
    category: 'Android',
    dimensions: { width: 360, height: 780 },
    pixelRatio: 3,
    borderRadius: '32px',
    features: {
      punchHole: true,
    },
    icon: '🤖',
    userAgent: 'SM-S911B',
    description: 'Previous Samsung flagship'
  },
  
  'pixel-8': {
    id: 'pixel-8',
    name: 'Pixel 8',
    category: 'Android',
    dimensions: { width: 412, height: 915 },
    pixelRatio: 2.75,
    borderRadius: '28px',
    features: {
      punchHole: true,
    },
    icon: '🤖',
    userAgent: 'Pixel 8',
    description: 'Google Pixel latest'
  },
  
  'pixel-7a': {
    id: 'pixel-7a',
    name: 'Pixel 7a',
    category: 'Android',
    dimensions: { width: 393, height: 851 },
    pixelRatio: 2.75,
    borderRadius: '28px',
    features: {
      punchHole: true,
    },
    icon: '🤖',
    userAgent: 'Pixel 7a',
    description: 'Mid-range Pixel'
  },
  
  'oneplus-12': {
    id: 'oneplus-12',
    name: 'OnePlus 12',
    category: 'Android',
    dimensions: { width: 450, height: 1000 },
    pixelRatio: 3.5,
    borderRadius: '35px',
    features: {
      punchHole: true,
    },
    icon: '🤖',
    userAgent: 'CPH2573',
    description: 'OnePlus flagship'
  },
  
  'galaxy-a54': {
    id: 'galaxy-a54',
    name: 'Galaxy A54',
    category: 'Android',
    dimensions: { width: 360, height: 800 },
    pixelRatio: 2.5,
    borderRadius: '28px',
    features: {
      punchHole: true,
    },
    icon: '🤖',
    userAgent: 'SM-A546B',
    description: 'Mid-range Samsung'
  },

  // === TABLETS ===
  'ipad-pro-12': {
    id: 'ipad-pro-12',
    name: 'iPad Pro 12.9"',
    category: 'Tablet',
    dimensions: { width: 1024, height: 1366 },
    pixelRatio: 2,
    borderRadius: '18px',
    icon: '📟',
    userAgent: 'iPad13,8',
    description: 'Large iPad Pro'
  },
  
  'ipad-air': {
    id: 'ipad-air',
    name: 'iPad Air',
    category: 'Tablet',
    dimensions: { width: 820, height: 1180 },
    pixelRatio: 2,
    borderRadius: '18px',
    icon: '📟',
    userAgent: 'iPad13,1',
    description: 'Mid-size iPad'
  },
  
  'ipad-mini': {
    id: 'ipad-mini',
    name: 'iPad Mini',
    category: 'Tablet',
    dimensions: { width: 744, height: 1133 },
    pixelRatio: 2,
    borderRadius: '18px',
    icon: '📟',
    userAgent: 'iPad14,1',
    description: 'Compact iPad'
  },
  
  'galaxy-tab-s9': {
    id: 'galaxy-tab-s9',
    name: 'Galaxy Tab S9',
    category: 'Tablet',
    dimensions: { width: 800, height: 1280 },
    pixelRatio: 2.5,
    borderRadius: '16px',
    icon: '📟',
    userAgent: 'SM-X710',
    description: 'Samsung tablet'
  },
  
  'surface-pro': {
    id: 'surface-pro',
    name: 'Surface Pro',
    category: 'Tablet',
    dimensions: { width: 912, height: 1368 },
    pixelRatio: 2,
    borderRadius: '8px',
    icon: '💻',
    userAgent: 'Surface Pro',
    description: 'Microsoft tablet'
  },

  // === DESKTOP/WEB ===
  'desktop-1080p': {
    id: 'desktop-1080p',
    name: 'Desktop 1080p',
    category: 'Desktop',
    dimensions: { width: 1920, height: 1080 },
    pixelRatio: 1,
    borderRadius: '8px',
    icon: '🖥️',
    description: 'Standard desktop'
  },
  
  'desktop-1440p': {
    id: 'desktop-1440p',
    name: 'Desktop 1440p',
    category: 'Desktop',
    dimensions: { width: 2560, height: 1440 },
    pixelRatio: 1,
    borderRadius: '8px',
    icon: '🖥️',
    description: 'High-res desktop'
  },
  
  'laptop-13': {
    id: 'laptop-13',
    name: 'Laptop 13"',
    category: 'Desktop',
    dimensions: { width: 1280, height: 800 },
    pixelRatio: 1,
    borderRadius: '8px',
    icon: '💻',
    description: 'Compact laptop'
  }
};

// Helper functions
export const getDevicesByCategory = (category: DevicePreset['category']) => {
  return Object.values(DEVICE_PRESETS).filter(device => device.category === category);
};

export const getDevicePreset = (deviceId: string): DevicePreset | undefined => {
  return DEVICE_PRESETS[deviceId];
};

export const getAllDevices = (): DevicePreset[] => {
  return Object.values(DEVICE_PRESETS);
};

export const getPopularDevices = (): DevicePreset[] => {
  // Return most commonly used devices
  return [
    DEVICE_PRESETS['iphone-15-pro'],
    DEVICE_PRESETS['iphone-14'],
    DEVICE_PRESETS['galaxy-s24'],
    DEVICE_PRESETS['pixel-8'],
    DEVICE_PRESETS['ipad-air'],
    DEVICE_PRESETS['galaxy-tab-s9']
  ];
};

// Device categories for UI grouping
export const DEVICE_CATEGORIES = [
  { id: 'iOS', name: 'iOS Devices', icon: '🍎' },
  { id: 'Android', name: 'Android Devices', icon: '🤖' },
  { id: 'Tablet', name: 'Tablets', icon: '📟' },
  { id: 'Desktop', name: 'Desktop/Web', icon: '🖥️' }
] as const;




