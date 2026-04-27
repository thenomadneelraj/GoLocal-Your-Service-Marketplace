/**
 * Mock In-Memory Database
 * Acts as the single source of truth for all mock data
 * Supports localStorage persistence
 */

class MockDatabase {
  constructor() {
    this.collections = {
      users: [],
      services: [],
      bookings: [],
      messages: [],
      disputes: [],
    };
    this.loadFromStorage();
  }

  // Storage operations
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('mockDatabase');
      if (stored) {
        this.collections = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load mock database from storage:', error);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('mockDatabase', JSON.stringify(this.collections));
    } catch (error) {
      console.warn('Failed to save mock database to storage:', error);
    }
  }

  // Generic CRUD operations
  find(collection, query = {}) {
    let items = [...this.collections[collection]];
    
    if (query._id) {
      items = items.filter(item => item._id === query._id);
    }
    
    if (query.clientId) {
      items = items.filter(item => item.clientId === query.clientId);
    }
    
    if (query.providerId) {
      items = items.filter(item => item.providerId === query.providerId);
    }
    
    if (query.bookingId) {
      items = items.filter(item => item.bookingId === query.bookingId);
    }
    
    if (query.role) {
      items = items.filter(item => item.role === query.role);
    }
    
    if (query.status) {
      items = items.filter(item => item.status === query.status);
    }
    
    return items;
  }

  findOne(collection, query) {
    return this.find(collection, query)[0] || null;
  }

  insert(collection, data) {
    const newItem = {
      _id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    
    this.collections[collection].push(newItem);
    this.saveToStorage();
    return newItem;
  }

  update(collection, query, updates) {
    const index = this.collections[collection].findIndex(item => 
      Object.keys(query).every(key => item[key] === query[key])
    );
    
    if (index !== -1) {
      this.collections[collection][index] = {
        ...this.collections[collection][index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveToStorage();
      return this.collections[collection][index];
    }
    
    return null;
  }

  delete(collection, query) {
    const initialLength = this.collections[collection].length;
    this.collections[collection] = this.collections[collection].filter(item =>
      !Object.keys(query).every(key => item[key] === query[key])
    );
    
    const deleted = initialLength - this.collections[collection].length;
    this.saveToStorage();
    return deleted;
  }

  // Specific collection methods
  getUsers() {
    return this.find('users');
  }

  getProviders() {
    return this.find('users', { role: 'provider' });
  }

  getClients() {
    return this.find('users', { role: 'client' });
  }

  getServices() {
    return this.find('services');
  }

  getServicesByProvider(providerId) {
    return this.find('services', { providerId });
  }

  getBookings() {
    return this.find('bookings');
  }

  getBookingsByClient(clientId) {
    return this.find('bookings', { clientId });
  }

  getBookingsByProvider(providerId) {
    return this.find('bookings', { providerId });
  }

  getMessages(bookingId) {
    return this.find('messages', { bookingId });
  }

  getDisputes() {
    return this.find('disputes');
  }

  getDisputesByUser(userId) {
    return this.find('disputes').filter(dispute => 
      dispute.raisedBy === userId || 
      this.find('bookings', { _id: dispute.bookingId })[0]?.providerId === userId
    );
  }

  // Utility methods
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  clear() {
    this.collections = {
      users: [],
      services: [],
      bookings: [],
      messages: [],
      disputes: [],
    };
    this.saveToStorage();
  }

  // Get provider with all related data
  getProviderDetails(providerId) {
    const provider = this.findOne('users', { _id: providerId, role: 'provider' });
    if (!provider) return null;

    const services = this.getServicesByProvider(providerId);
    const bookings = this.getBookingsByProvider(providerId);
    
    return {
      provider,
      services,
      bookings,
      stats: {
        totalBookings: bookings.length,
        completedBookings: bookings.filter(b => b.status === 'completed').length,
        pendingBookings: bookings.filter(b => b.status === 'pending').length,
        acceptedBookings: bookings.filter(b => b.status === 'accepted').length,
      }
    };
  }

  // Get booking with related data
  getBookingDetails(bookingId) {
    const booking = this.findOne('bookings', { _id: bookingId });
    if (!booking) return null;

    const client = this.findOne('users', { _id: booking.clientId });
    const provider = this.findOne('users', { _id: booking.providerId });
    const service = this.findOne('services', { _id: booking.serviceId });
    const messages = this.getMessages(bookingId);
    const dispute = this.findOne('disputes', { bookingId });

    return {
      booking,
      client,
      provider,
      service,
      messages,
      dispute,
    };
  }
}

// Singleton instance
const mockDB = new MockDatabase();

export default mockDB;
