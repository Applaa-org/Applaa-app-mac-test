/**
 * 🚨 APPLAA TEMPLATE FILE - Colors used throughout the app.
 * Provides a consistent color scheme with support for light and dark themes.
 * IMPORT PATH: '../constants/Colors' (from app/ folder)
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#f8f9fa',
    border: '#e9ecef',
    notification: '#ff3b30',
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    card: '#1c1c1e',
    border: '#38383a',
    notification: '#ff453a',
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
  },
};

export default Colors;
