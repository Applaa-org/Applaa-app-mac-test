// User data types and mock data for development
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'moderator';
  avatar?: string;
  created_at: string;
  updated_at: string;
}

// Mock users data for development/testing
export const users: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    avatar: 'https://via.placeholder.com/150',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Regular User',
    email: 'user@example.com',
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper functions for user management
export const getUserById = (id: string): User | undefined => {
  return users.find(user => user.id === id);
};

export const getUserByEmail = (email: string): User | undefined => {
  return users.find(user => user.email === email);
};

export const getUsersByRole = (role: 'admin' | 'user' | 'moderator'): User[] => {
  return users.filter(user => user.role === role);
};

// Export default for easier importing
export default users;
