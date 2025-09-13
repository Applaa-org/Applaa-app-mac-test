// Profile data types and mock data for development
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'pro';
  created_at: string;
  updated_at: string;
}

// Mock profiles data for development/testing
export const profiles: Profile[] = [
  {
    id: '1',
    email: 'user@example.com',
    full_name: 'John Doe',
    avatar_url: null,
    subscription_tier: 'free',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'pro@example.com',
    full_name: 'Jane Smith',
    avatar_url: 'https://via.placeholder.com/150',
    subscription_tier: 'pro',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper functions for profile management
export const getProfileById = (id: string): Profile | undefined => {
  return profiles.find(profile => profile.id === id);
};

export const getProfileByEmail = (email: string): Profile | undefined => {
  return profiles.find(profile => profile.email === email);
};

export const getProfilesByTier = (tier: 'free' | 'pro'): Profile[] => {
  return profiles.filter(profile => profile.subscription_tier === tier);
};

// Export default for easier importing
export default profiles;
