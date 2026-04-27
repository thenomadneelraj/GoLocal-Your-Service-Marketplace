/**
 * Dispute data templates and utilities
 */

export const disputeReasons = ['Poor quality', 'Late arrival', 'Damage to property', 'Incomplete work', 'Billing issue', 'Unprofessional behavior'];
export const disputeStatuses = ['open', 'resolved', 'investigating'];

export const generateMockDispute = (bookingId, raisedBy, overrides = {}) => {
  return {
    bookingId,
    raisedBy,
    reason: disputeReasons[Math.floor(Math.random() * disputeReasons.length)],
    description: `Issue with booking service`,
    status: disputeStatuses[Math.floor(Math.random() * disputeStatuses.length)],
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
};
