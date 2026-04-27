# Mock Backend System

A comprehensive mock backend system that simulates real API behavior for the GoLocal service marketplace frontend.

## 🎯 Purpose

This mock system allows the frontend to behave exactly like production without requiring a live backend. It's perfect for:

- Development when the backend isn't ready
- Testing UI interactions and user flows
- Demonstrating the application functionality
- Frontend-only development workflows

## 🏗️ Architecture

```
src/mock/
├── db.js              # In-memory database with localStorage persistence
├── seed.js            # Data generation and seeding
├── mockApi.js         # Mock API layer with realistic delays
├── websocket.js       # WebSocket simulation for real-time features
├── index.js           # System initialization
├── data/              # Data templates and utilities
│   ├── users.js
│   ├── services.js
│   ├── bookings.js
│   ├── messages.js
│   └── disputes.js
└── README.md          # This file
```

## 🔧 How It Works

### 1. Automatic Detection
The system automatically detects when to use mock mode based on:
- `VITE_USE_MOCK_API=true` environment variable
- Missing or unavailable backend URL

### 2. Data Persistence
- All mock data persists in localStorage
- Data survives browser refreshes
- Can be cleared via browser dev tools

### 3. Realistic Behavior
- API calls have artificial delays (300-800ms)
- Proper error handling and response formats
- Relational data integrity
- Real-time WebSocket simulation

## 📊 Generated Data

### Users
- **Admin**: 1 user with full permissions
- **Providers**: 15 service providers with various skills
- **Clients**: 25 clients looking for services

### Services
- 1-4 services per provider
- Realistic pricing ($50-$500)
- Various categories (Plumbing, Electrical, etc.)

### Bookings
- Multiple bookings per client
- Different statuses (pending, accepted, completed)
- Proper client-provider-service relationships

### Messages
- 3-10 messages per booking
- Realistic conversation flow
- Client/provider message differentiation

### Disputes
- ~20% of bookings have disputes
- Various reasons and statuses
- Proper relationship to bookings

## 🚀 Usage

### Enable Mock Mode
Set in your `.env` file:
```bash
VITE_USE_MOCK_API=true
```

### Disable Mock Mode
```bash
VITE_USE_MOCK_API=false
# or remove the variable
```

### API Integration
The mock system integrates seamlessly with existing code:

```javascript
import api from '@/lib/api';

// This automatically uses mock or real API
const response = await api.get('providers');
```

### WebSocket Integration
```javascript
import { shouldUseMockSocket, createMockSocket } from '@/mock/websocket';

if (shouldUseMockSocket()) {
  const socket = createMockSocket();
  await socket.connect(token);
}
```

## 🔌 Available Endpoints

### Authentication
- `POST /auth` - Sign in/up
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update profile

### Providers
- `GET /providers` - List all providers
- `GET /providers/:id` - Get provider details

### Services
- `GET /services/provider/:id` - Get provider's services

### Bookings
- `POST /bookings` - Create booking
- `GET /bookings/client/:id` - Get client's bookings
- `GET /bookings/provider/:id` - Get provider's bookings
- `PUT /bookings/:id/status` - Update booking status

### Messages
- `GET /messages/:bookingId` - Get booking messages
- `POST /messages` - Send message
- `PUT /messages/:bookingId/read` - Mark as read

### Disputes
- `POST /disputes` - Create dispute
- `GET /disputes/user/:id` - Get user's disputes
- `PUT /disputes/:id/status` - Update dispute status

## 🎮 Real-time Features

The WebSocket mock simulates:
- **New messages**: Random chat messages
- **Booking updates**: Status changes
- **Notifications**: System alerts
- **Provider status**: Availability changes

Events are triggered randomly every 10-30 seconds when connected.

## 🛠️ Development Tools

### Access Mock Database
```javascript
import { mockDB } from '@/mock';

// Get all providers
const providers = mockDB.getProviders();

// Get provider details
const details = mockDB.getProviderDetails(providerId);

// Add custom data
const newUser = mockDB.insert('users', userData);
```

### Reset Mock Data
```javascript
import { mockDB } from '@/mock';

// Clear all data
mockDB.clear();

// Re-seed with fresh data
import { seedDatabase } from '@/mock/seed';
seedDatabase();
```

## 🔄 Switching Between Modes

The system automatically switches between mock and real API:

1. **Mock Mode**: When `VITE_USE_MOCK_API=true` or backend unavailable
2. **Real Mode**: When backend is available and mock mode disabled

All existing components work without modification thanks to the API wrapper.

## 🧪 Testing Scenarios

The mock system supports realistic testing:

- **Multiple user roles**: Switch between client/provider/admin
- **Booking lifecycle**: From creation to completion
- **Chat conversations**: Full message threads
- **Dispute resolution**: Complete dispute workflow
- **Real-time updates**: Live notifications and status changes

## 📝 Data Structure

### User
```javascript
{
  _id: string,
  name: string,
  email: string,
  role: 'client' | 'provider' | 'admin',
  avatar: string,
  approvalStatus: 'pending' | 'approved' | 'rejected',
  isVerified: boolean,
  // Provider-specific fields
  serviceType?: string,
  rating?: number,
  totalReviews?: number,
  hourlyRate?: number
}
```

### Booking
```javascript
{
  _id: string,
  clientId: string,
  providerId: string,
  serviceId: string,
  status: 'pending' | 'accepted' | 'completed' | 'cancelled',
  price: number,
  createdAt: string,
  updatedAt: string
}
```

### Message
```javascript
{
  _id: string,
  bookingId: string,
  senderId: string,
  senderName: string,
  senderRole: string,
  text: string,
  read: boolean,
  createdAt: string
}
```

## 🎉 Benefits

- **No Backend Dependency**: Frontend works independently
- **Realistic Data**: Generated data matches production structure
- **Persistent State**: Data survives browser sessions
- **Real-time Features**: WebSocket simulation included
- **Easy Integration**: Works with existing components
- **Full Coverage**: All major features supported

## 🔍 Debugging

Mock API calls are logged in console:
```
🔧 Mock API: GET providers
🔧 Mock API: POST bookings
🔌 Mock WebSocket connected
```

Enable/disable mock mode by changing the environment variable and restarting the dev server.
