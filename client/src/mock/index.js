/**
 * Mock System Initialization
 * Sets up the mock backend system and initializes data
 */

import { autoSeed } from './seed.js';
import { shouldUseMock } from './mockApi.js';

// Initialize mock system if needed
export function initializeMockSystem() {
  if (shouldUseMock()) {
    console.log('🔧 Initializing Mock Backend System...');
    
    // Auto-seed data if database is empty
    autoSeed();
    
    console.log('✅ Mock Backend System Ready!');
    console.log('📊 Mock mode is ENABLED');
    console.log('💾 Data persists in localStorage');
    console.log('⚡ Real-time features simulated');
    
    return true;
  } else {
    console.log('🌐 Using real backend API');
    return false;
  }
}

// Export utilities for debugging
export { mockDB } from './db.js';
export { mockApi } from './mockApi.js';
export { createMockSocket, shouldUseMockSocket } from './websocket.js';

// Initialize on import
initializeMockSystem();
