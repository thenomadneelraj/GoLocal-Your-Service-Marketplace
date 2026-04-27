/**
 * Message data templates and utilities
 */

export const clientMessageTemplates = [
  'Hi, I need this service as soon as possible',
  'Are you available this weekend?',
  'What\'s your availability for next week?',
  'Can you provide a quote for this service?',
  'I have a few questions about the service',
  'Thank you for your quick response',
  'Looking forward to working with you',
  'Is there anything I need to prepare before the service?'
];

export const providerMessageTemplates = [
  'Hello! I\'d be happy to help you with this service',
  'Yes, I\'m available this weekend',
  'I can schedule you for next week',
  'My rates are competitive and flexible',
  'I have over 10 years of experience in this field',
  'Thank you for choosing my service',
  'I\'ll bring all necessary equipment',
  'The service usually takes about 2-3 hours'
];

export const generateMockMessage = (bookingId, senderId, senderName, senderRole, overrides = {}) => {
  const templates = senderRole === 'client' ? clientMessageTemplates : providerMessageTemplates;
  const text = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    bookingId,
    senderId,
    senderName,
    senderRole,
    text,
    read: Math.random() > 0.3,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  };
};
