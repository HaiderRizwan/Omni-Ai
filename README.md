# Omni AI Platform

A comprehensive AI-powered platform with React frontend and Node.js backend, featuring multiple AI tools and subscription management.

## Features

- **AI Chat Creation**: Interactive chat with AI LLM models
- **Image Generation**: Create AI images from text prompts
- **Video Creation**: Generate AI-powered videos
- **Avatar Creation**: Design custom avatars
- **Avatar Video Creation**: Combine avatars with video generation
- **API Testing**: Test LLM API connections
- **Subscription Management**: Pro plans with trial support
- **User Authentication**: Secure user registration and login
- **Document Conversion**: Convert various document formats
- **Currency Converter**: Real-time currency conversion

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Framer Motion
- React Hot Toast
- Lucide React Icons

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- Multer (file uploads)

## Project Structure

```
Omni Ai/
├── front-end/          # React frontend application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── contexts/   # React contexts
│   │   └── utils/      # Utility functions
│   └── public/         # Static assets
└── omni-master/        # Node.js backend
    ├── controllers/    # Route controllers
    ├── models/         # Database models
    ├── routes/         # API routes
    ├── middleware/     # Custom middleware
    └── utils/          # Backend utilities
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- Git

### Backend Setup
```bash
cd omni-master
npm install
npm start
```

### Frontend Setup
```bash
cd front-end
npm install
npm start
```

## Environment Variables

Create a `.env` file in the `omni-master` directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=3001
```

## API Endpoints

- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile
- `POST /api/subscriptions/start-trial` - Start free trial
- `POST /api/subscriptions/upgrade` - Upgrade subscription
- `GET /api/subscriptions/status` - Get subscription status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

## Author

Haider Rizwan
