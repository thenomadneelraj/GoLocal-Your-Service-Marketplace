/**
 * Mock WebSocket Simulation
 * Simulates real-time features like chat notifications, booking updates, etc.
 */

class MockWebSocket {
  constructor() {
    this.connected = false;
    this.listeners = new Map();
    this.userId = null;
    this.simulationInterval = null;
  }

  // Connection management
  connect(token) {
    return new Promise((resolve, reject) => {
      // Simulate connection delay
      setTimeout(() => {
        try {
          // Extract user ID from mock token
          if (token && token.startsWith('mock-token-')) {
            this.userId = token.split('-')[1];
            this.connected = true;
            this.startSimulation();
            console.log('🔌 Mock WebSocket connected');
            resolve();
          } else {
            reject(new Error('Invalid token'));
          }
        } catch (error) {
          reject(error);
        }
      }, 500);
    });
  }

  disconnect() {
    this.connected = false;
    this.stopSimulation();
    this.userId = null;
    console.log('🔌 Mock WebSocket disconnected');
  }

  // Event listeners
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('WebSocket listener error:', error);
        }
      });
    }
  }

  // Send messages (for chat)
  send(data) {
    if (!this.connected) {
      console.warn('WebSocket not connected');
      return;
    }

    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Echo message back to simulate real-time delivery
      setTimeout(() => {
        this.emit('message', {
          type: 'message_delivered',
          data: parsedData,
          timestamp: new Date().toISOString()
        });
      }, 100);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // Simulation of real-time events
  startSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    // Simulate random events every 10-30 seconds
    this.simulationInterval = setInterval(() => {
      if (!this.connected) return;

      const events = [
        this.simulateNewMessage.bind(this),
        this.simulateBookingUpdate.bind(this),
        this.simulateNotification.bind(this),
        this.simulateProviderStatus.bind(this)
      ];

      // Randomly choose an event (25% chance each interval)
      if (Math.random() < 0.25) {
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        randomEvent();
      }
    }, 15000); // Check every 15 seconds
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  // Simulation methods
  simulateNewMessage() {
    // Simulate receiving a new message
    const mockMessage = {
      type: 'new_message',
      data: {
        _id: `msg-${Date.now()}`,
        bookingId: this.getRandomBookingId(),
        senderId: this.getRandomOtherUserId(),
        text: this.getRandomMessageText(),
        createdAt: new Date().toISOString(),
        read: false
      }
    };

    this.emit('message', mockMessage);
    console.log('📨 Simulated new message:', mockMessage.data.text);
  }

  simulateBookingUpdate() {
    // Simulate booking status change
    const statuses = ['accepted', 'completed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const mockUpdate = {
      type: 'booking_update',
      data: {
        bookingId: this.getRandomBookingId(),
        status,
        updatedAt: new Date().toISOString()
      }
    };

    this.emit('message', mockUpdate);
    console.log('📅 Simulated booking update:', status);
  }

  simulateNotification() {
    // Simulate system notification
    const notifications = [
      'You have a new booking request!',
      'A provider has accepted your booking',
      'Your booking is completed',
      'You received a new review',
      'Payment processed successfully'
    ];

    const mockNotification = {
      type: 'notification',
      data: {
        _id: `notif-${Date.now()}`,
        userId: this.userId,
        message: notifications[Math.floor(Math.random() * notifications.length)],
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      }
    };

    this.emit('message', mockNotification);
    console.log('🔔 Simulated notification:', mockNotification.data.message);
  }

  simulateProviderStatus() {
    // Simulate provider availability change
    const mockStatusUpdate = {
      type: 'provider_status',
      data: {
        providerId: this.getRandomProviderId(),
        available: Math.random() > 0.3,
        timestamp: new Date().toISOString()
      }
    };

    this.emit('message', mockStatusUpdate);
    console.log('👤 Simulated provider status update');
  }

  // Helper methods to get random data
  getRandomBookingId() {
    // This would ideally get from the mock database
    const bookingIds = [`booking-${Math.floor(Math.random() * 100)}`];
    return bookingIds[Math.floor(Math.random() * bookingIds.length)];
  }

  getRandomOtherUserId() {
    // Return a different user ID
    return `user-${Math.floor(Math.random() * 50)}`;
  }

  getRandomProviderId() {
    // Return a random provider ID
    return `provider-${Math.floor(Math.random() * 20)}`;
  }

  getRandomMessageText() {
    const messages = [
      'Hi, I\'m available for the job!',
      'Can we reschedule to next week?',
      'Thank you for your business!',
      'I\'m running a few minutes late',
      'The work is completed successfully',
      'Do you have any questions?',
      'Looking forward to working with you',
      'I\'ve arrived at the location'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// Mock Socket.IO-like interface
class MockSocket {
  constructor() {
    this.ws = new MockWebSocket();
    this.connected = false;
  }

  async connect(token) {
    try {
      await this.ws.connect(token);
      this.connected = true;
      return this;
    } catch (error) {
      console.error('Mock socket connection failed:', error);
      throw error;
    }
  }

  disconnect() {
    this.ws.disconnect();
    this.connected = false;
  }

  on(event, callback) {
    this.ws.on(event, callback);
  }

  off(event, callback) {
    this.ws.off(event, callback);
  }

  emit(event, data) {
    if (!this.connected) {
      console.warn('Socket not connected');
      return;
    }
    this.ws.send(JSON.stringify({ event, data }));
  }

  // Convenience methods
  emitMessage(data) {
    this.emit('message', data);
  }

  emitNotification(data) {
    this.emit('notification', data);
  }
}

// Factory function
export function createMockSocket() {
  return new MockSocket();
}

// Auto-detect if we should use mock socket
export function shouldUseMockSocket() {
  return import.meta.env.VITE_USE_MOCK_API === 'true' || !import.meta.env.VITE_SOCKET_URL;
}

export default MockSocket;
