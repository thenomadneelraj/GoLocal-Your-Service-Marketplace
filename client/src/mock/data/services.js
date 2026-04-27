/**
 * Service data templates and utilities
 */

export const serviceCategories = [
  'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 
  'HVAC', 'Roofing', 'Moving', 'Appliance Repair', 'Pest Control', 'Home Security',
  'Flooring', 'Window Installation', 'Insulation', 'Concrete', 'Pool Maintenance', 'Tree Service'
];

export const serviceDescriptions = [
  'Professional and reliable service with years of experience',
  'High-quality workmanship guaranteed, licensed and insured',
  'Fast response time, competitive pricing',
  'Expert solutions for all your needs',
  'Trusted local provider with excellent reviews',
  'Specializing in residential and commercial projects',
  'Eco-friendly and sustainable solutions available',
  'Emergency services available 24/7'
];

export const generateMockService = (providerId, providerName, category, overrides = {}) => {
  return {
    providerId,
    providerName,
    title: `${category} Service`,
    description: serviceDescriptions[Math.floor(Math.random() * serviceDescriptions.length)],
    price: Math.floor(Math.random() * 450) + 50, // $50-$500
    duration: `${Math.floor(Math.random() * 8) + 1} hours`, // 1-8 hours
    category,
    isActive: Math.random() > 0.1,
    ...overrides
  };
};
