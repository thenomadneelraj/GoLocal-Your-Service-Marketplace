/**
 * User data templates and utilities
 */

export const userTemplates = {
  admin: {
    name: 'Admin User',
    email: 'admin@golocal.com',
    role: 'admin',
    avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0d47a1&color=fff',
    phone: '(555) 123-4567',
    address: '123 Admin St, New York, NY',
    approvalStatus: 'approved',
    isVerified: true,
    isActive: true
  },
  
  provider: {
    role: 'provider',
    approvalStatus: 'approved',
    isVerified: true,
    isActive: true,
    rating: 4.5,
    totalReviews: 25,
    experience: 5,
    hourlyRate: 75,
    skills: []
  },
  
  client: {
    role: 'client',
    isVerified: false,
    isActive: true
  }
};

export const generateMockUser = (type, overrides = {}) => {
  const template = userTemplates[type];
  if (!template) {
    throw new Error(`Unknown user type: ${type}`);
  }
  
  return {
    ...template,
    ...overrides
  };
};
