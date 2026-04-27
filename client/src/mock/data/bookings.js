/**
 * Booking data templates and utilities
 */

export const bookingStatuses = ['pending', 'accepted', 'completed', 'cancelled'];

export const generateMockBooking = (clientId, providerId, serviceId, overrides = {}) => {
  const createdAt = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    clientId,
    providerId,
    serviceId,
    status: bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)],
    notes: 'Booking request for service',
    createdAt,
    updatedAt: createdAt,
    scheduledDate: new Date(Date.parse(createdAt) + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  };
};
