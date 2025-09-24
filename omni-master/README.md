# Express.js Application with MVC Architecture

A robust Express.js application built with MongoDB, featuring user authentication, authorization, and a clean MVC (Model-View-Controller) architecture.

## Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Subscription System**: Free and premium tiers with feature restrictions
- **Currency Converter**: Live exchange rates with caching (Free tier feature)
- **Document Converter**: Convert between PDF, text, CSV, JSON, and HTML formats (Free tier feature)
- **MVC Architecture**: Clean separation of concerns with Models, Views (Controllers), and Routes
- **Database Integration**: MongoDB with Mongoose ODM
- **Input Validation**: Joi-based request validation
- **Security**: Helmet for security headers, CORS support, rate limiting
- **Error Handling**: Comprehensive error handling middleware
- **Environment Configuration**: dotenv for environment variables

## Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   └── userController.js    # User business logic
├── middleware/
│   ├── auth.js             # Authentication & authorization
│   └── validation.js       # Input validation
├── models/
│   └── User.js             # User data model
├── routes/
│   └── userRoutes.js       # User API routes
├── utils/                  # Utility functions (optional)
├── server.js               # Main application file
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/express_app
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user

### User Management (Protected)
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile

### Admin Only
- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Currency Converter (Free Tier)
- `GET /api/currency/supported` - Get all supported currencies
- `GET /api/currency/rates?base=USD` - Get current exchange rates
- `GET /api/currency/convert?from=USD&to=EUR&amount=100` - Convert currency
- `GET /api/currency/historical?date=2023-12-01&base=USD` - Get historical rates
- `POST /api/currency/convert-multiple` - Convert to multiple currencies

### Document Converter (Free Tier)
- `GET /api/documents/supported` - Get supported conversions and file types
- `POST /api/documents/convert` - Convert document (upload file with conversionType)

### Video Generation with Audio (Premium)
- `GET /api/videos/supported` - Get supported providers and options
- `POST /api/videos/generate` - Generate video with main character and audio
- `GET /api/videos/job/:id` - Get generation status
- `GET /api/videos/history` - Get generation history
- `POST /api/videos/job/:id/cancel` - Cancel generation

**Audio Features:**
- Text-to-Speech for dialogue
- Background music generation
- Sound effects integration
- Audio track mixing
- Multiple voice styles and music genres

### Health Check
- `GET /health` - Application health check

## Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "password123"
  }'
```

### Get user profile (requires authentication)
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get supported currencies (free)
```bash
curl -X GET http://localhost:3000/api/currency/supported
```

### Get exchange rates (free)
```bash
curl -X GET "http://localhost:3000/api/currency/rates?base=USD"
```

### Convert currency (free)
```bash
curl -X GET "http://localhost:3000/api/currency/convert?from=USD&to=EUR&amount=100"
```

### Convert to multiple currencies (free)
```bash
curl -X POST http://localhost:3000/api/currency/convert-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "from": "USD",
    "amount": 100,
    "to": ["EUR", "GBP", "JPY"]
  }'
```

### Get supported document conversions (free)
```bash
curl -X GET http://localhost:3000/api/documents/supported
```

### Convert document (free)
```bash
# Convert PDF to text
curl -X POST http://localhost:3000/api/documents/convert \
  -F "file=@document.pdf" \
  -F "conversionType=pdf-to-text"

# Convert CSV to JSON
curl -X POST http://localhost:3000/api/documents/convert \
  -F "file=@data.csv" \
  -F "conversionType=csv-to-json"

# Convert text to PDF
curl -X POST http://localhost:3000/api/documents/convert \
  -F "file=@document.txt" \
  -F "conversionType=text-to-pdf"
```

### Generate video with audio (premium)
```bash
curl -X POST http://localhost:3001/api/videos/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A powerful prophet standing on a mountain delivering an epic speech",
    "mainCharacterId": "character_id_here",
    "duration": 8,
    "style": "cinematic",
    "aspectRatio": "16:9",
    "includeAudio": true,
    "voiceStyle": "dramatic",
    "backgroundMusic": "epic",
    "soundEffects": true,
    "dialogue": "And the LORD said unto Moses, I AM THAT I AM..."
  }'
```

### Get video generation status
```bash
curl -X GET http://localhost:3000/api/videos/job/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/express_app` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3001` |
| `OPENROUTER_API_KEY` | OpenRouter API key | Required |
| `OPENAI_API_KEY` | OpenAI API key for images | Required for image generation |
| `STABILITY_API_KEY` | Stability AI API key | Backup for images |
| `REPLICATE_API_KEY` | Replicate API key | Open source models |
| `RUNWAYML_API_KEY` | RunwayML API key | Primary video generation |
| `PIKA_API_KEY` | Pika Labs API key | Fast video generation |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | TTS voice generation |
| `SUNO_API_KEY` | Suno AI API key | Background music |
| `BIBLE_API_KEY` | Bible API key | Optional for accuracy verification |

### Phyllo Integration

Add the following to your `.env` for Phyllo:

```env
PHYLLO_CLIENT_ID=your_phyllo_client_id
PHYLLO_CLIENT_SECRET=your_phyllo_client_secret
PHYLLO_BASE_URL=https://api.getphyllo.com/v1
PHYLLO_WEBHOOK_SECRET=optional_if_using_signature_verification
```

Endpoints:
- `POST /api/phyllo/users` → create Phyllo user with `{ name, externalId }`
- `POST /api/phyllo/sdk-token` → generate Connect token with `{ userId }`
- `POST /api/phyllo/webhook` → receive webhook events
- `POST /api/phyllo/publish` → publish content `{ accountId, content }`

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Joi validation for all inputs
- **CORS**: Configured for cross-origin requests
- **Helmet**: Security headers
- **Role-based Access Control**: Admin and user roles

## Development

### Available Scripts
- `npm start` - Start the production server
- `npm run dev` - Start with nodemon for development
- `npm test` - Run tests

### Adding New Features

1. **Models**: Create new models in the `models/` directory
2. **Controllers**: Add business logic in the `controllers/` directory
3. **Routes**: Define API endpoints in the `routes/` directory
4. **Middleware**: Add custom middleware in the `middleware/` directory

### Database Models

The application uses Mongoose for MongoDB integration. Models include:
- **User Model**: Handles user data, authentication, and authorization

## Testing

```bash
npm test
```

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Update `MONGODB_URI` to your production database
3. Set a strong `JWT_SECRET`
4. Run `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
