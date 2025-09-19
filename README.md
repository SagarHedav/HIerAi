# HIerAi - Professional Networking Platform

![HIerAi Logo](./frontend/public/banner.png)

A modern professional networking platform built for students and recruiters, inspired by LinkedIn. HIerAi connects job seekers with opportunities and enables professional networking in a clean, intuitive interface.

## 🚀 Features

### For Students
- **Professional Profile Management** - Showcase experience, education, skills, and projects
- **Job Search & Application** - Browse and apply for relevant opportunities  
- **Professional Networking** - Connect with other professionals and students
- **Social Feed** - Share updates, achievements, and professional content
- **Real-time Notifications** - Stay updated with connection requests and job updates

### For Recruiters  
- **Job Posting** - Post job opportunities with detailed requirements
- **Candidate Discovery** - Find qualified candidates based on skills and experience
- **Company Profiles** - Showcase company information and culture
- **Application Management** - Review and manage job applications

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library with latest features
- **Vite** - Fast build tool and development server
- **TailwindCSS + DaisyUI** - Utility-first styling with LinkedIn-inspired theme
- **React Router DOM v7** - Client-side routing
- **React Query** - Server state management and caching
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Beautiful toast notifications
- **Lucide React** - Modern icon library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB + Mongoose** - Database and ODM
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image storage and management
- **Mailtrap** - Email service integration
- **Cookie Parser** - HTTP cookie parsing
- **CORS** - Cross-Origin Resource Sharing

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (local installation or MongoDB Atlas)
- **npm** or **yarn**

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/hierai
# or for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/hierai

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key  
CLOUDINARY_API_SECRET=your_api_secret

# Mailtrap (for emails)
MAILTRAP_TOKEN=your_mailtrap_token

# Server
PORT=5001
NODE_ENV=development
```

## 🚀 Getting Started

### Option 1: Using Workspace Commands (Recommended)

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd HIerAi
   npm run install:all
   ```

2. **Start Development**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run dev:backend  # Backend only (http://localhost:5001)
   npm run dev:frontend # Frontend only (http://localhost:5173)
   ```

### Option 2: Manual Setup

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend Setup** (in new terminal)
   ```bash
   cd frontend  
   npm install
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5001

## 📁 Project Structure

```
HIerAi/
├── backend/                 # Backend API server
│   ├── controllers/         # Request handlers
│   ├── models/             # Database models (MongoDB/Mongoose)
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── lib/                # Utility functions (DB, Cloudinary, etc.)
│   ├── emails/             # Email templates and handlers
│   └── server.js           # Express server entry point
│
├── frontend/               # React frontend application  
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Frontend utilities (axios config)
│   │   └── utils/          # Helper functions
│   ├── public/             # Static assets
│   └── index.html          # HTML template
│
├── .env                    # Environment variables
├── package.json            # Workspace configuration
└── README.md              # Project documentation
```

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### User Management  
- `GET /api/v1/users/profile/:username` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `POST /api/v1/users/profile-picture` - Upload profile picture

### Jobs & Applications
- `GET /api/v1/job` - Get all jobs
- `POST /api/v1/job` - Create job (recruiters only)
- `POST /api/v1/application/apply` - Apply for job
- `GET /api/v1/application/me` - Get user's applications

### Social Features
- `GET /api/v1/posts` - Get posts feed
- `POST /api/v1/posts` - Create new post
- `POST /api/v1/connections/request/:userId` - Send connection request
- `GET /api/v1/notifications` - Get user notifications

## 🔒 Authentication & Authorization

- **JWT-based authentication** with HTTP-only cookies
- **Role-based access control** (student/recruiter)
- **Protected routes** requiring authentication
- **Secure password hashing** using bcryptjs

## 🎨 Design System

The application uses a **LinkedIn-inspired design** with:
- **Primary Color**: #0A66C2 (LinkedIn Blue)
- **Secondary Color**: #FFFFFF (White) 
- **Background**: #F3F2EF (Light Gray)
- **Success**: #057642 (Dark Green)
- **Error**: #CC1016 (Red)

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables
3. Deploy to platforms like Heroku, Railway, or DigitalOcean
4. Update CORS origin to match frontend URL

### Frontend Deployment
1. Build the application: `npm run build`
2. Deploy to Vercel, Netlify, or similar platforms
3. Update API base URL in axios configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 Recent Fixes Applied

This project has been recently cleaned up with the following improvements:

### ✅ Fixed Issues
- **Git Repository**: Initialized with proper version control
- **Backend Structure**: Removed problematic mixed content files
- **Naming Conventions**: Fixed typos in variable names and imports  
- **MongoDB Schema**: Corrected data type inconsistencies and field naming
- **Package Management**: Organized dependencies with proper workspace structure
- **Branding**: Updated HTML metadata and branding information

### 🎯 Code Quality Improvements
- Proper separation of frontend/backend dependencies
- Consistent naming conventions throughout codebase
- Clean project structure with logical organization
- Professional branding and metadata

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) section
2. Review environment variable configuration
3. Ensure MongoDB is running and accessible
4. Verify all dependencies are installed correctly

---

**Built with ❤️ for connecting professionals and opportunities**