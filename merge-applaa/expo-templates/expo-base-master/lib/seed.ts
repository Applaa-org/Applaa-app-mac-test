import { storageUtils } from './storage';

// Sample data structure
interface AppData {
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  posts: Array<{
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: string;
  }>;
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
}

const SEED_DATA: AppData = {
  users: [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    },
  ],
  posts: [
    {
      id: '1',
      title: 'Welcome to the App!',
      content: 'This is your first post. Start building amazing features!',
      authorId: '1',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Getting Started',
      content: 'Here are some tips to help you get the most out of this app.',
      authorId: '2',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  settings: {
    theme: 'light',
    notifications: true,
    language: 'en',
  },
};

export async function seedData() {
  try {
    // Check if data already exists
    const existing = await storageUtils.getObject('app_data', null);
    
    if (!existing) {
      // Seed with initial data
      await storageUtils.setObject('app_data', SEED_DATA);
      console.log('✅ App seeded with initial data');
    } else {
      console.log('📱 App data already exists, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

// Utility functions to get seeded data
export const getData = {
  async users() {
    const data = await storageUtils.getObject<AppData>('app_data', SEED_DATA);
    return data.users;
  },

  async posts() {
    const data = await storageUtils.getObject<AppData>('app_data', SEED_DATA);
    return data.posts;
  },

  async settings() {
    const data = await storageUtils.getObject<AppData>('app_data', SEED_DATA);
    return data.settings;
  },
};

