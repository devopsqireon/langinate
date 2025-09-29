# Translator SaaS Platform

A professional SaaS platform designed for freelance translators and interpreters to manage their business operations efficiently.

## 🚀 Features

### Core Functionality
- **Dashboard**: Overview of business metrics and recent activity
- **Job Management**: Handle both translation (word-based) and interpreting (time-based) projects
- **Client Management**: Maintain client relationships and contact information
- **Invoice Management**: Create, track, and manage billing
- **Training Records**: Track professional development and certifications

### Technical Features
- **Modern Stack**: Next.js 15 with App Router and TypeScript
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components
- **Database**: Supabase with PostgreSQL and Row Level Security
- **Authentication**: Email/password + OAuth (Google, Microsoft) via Supabase Auth
- **Mobile-First**: Collapsible sidebar navigation for all screen sizes

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui with default theme
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## 📁 Project Structure

```
translator-saas/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── jobs/              # Jobs management
│   │   ├── clients/           # Client management
│   │   ├── invoices/          # Invoice management
│   │   ├── training/          # Training records
│   │   ├── profile/           # User profile
│   │   ├── settings/          # Application settings
│   │   ├── layout.tsx         # Root layout with sidebar
│   │   └── page.tsx           # Root page (redirects to dashboard)
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── app-sidebar.tsx    # Main navigation sidebar
│   └── lib/
│       ├── supabase.ts        # Legacy Supabase client
│       ├── supabase-client.ts # Browser Supabase client
│       ├── supabase-server.ts # Server Supabase client
│       └── utils.ts           # Utility functions
├── migrations/                # Database migration scripts
├── SUPABASE_SETUP.md         # Supabase setup instructions
└── .env.local.example        # Environment variables template
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd translator-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

4. **Set up the database**

   Follow the detailed instructions in `SUPABASE_SETUP.md` to:
   - Configure your Supabase project
   - Run the migration scripts
   - Set up authentication providers
   - Configure Row Level Security

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**

   Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📊 Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

### Core Tables
- **users**: Extended user profiles with professional details
- **clients**: Client contact and company information
- **jobs**: Translation and interpreting project management
- **invoices**: Billing and payment tracking
- **training_records**: Professional development tracking

### Key Features
- **Row Level Security (RLS)**: All tables have proper RLS policies
- **Automatic Triggers**: Auto-calculation of totals, status updates
- **Flexible Pricing**: Supports both word-based and time-based billing
- **Multi-currency**: Support for USD, EUR, GBP, CAD, AUD
- **File Management**: JSON storage for file attachments and metadata

## 🔐 Security

- **Row Level Security**: All data access is user-scoped
- **Authentication**: Secure Supabase Auth with multiple providers
- **Environment Variables**: Sensitive data stored in environment variables
- **Type Safety**: Full TypeScript coverage for compile-time safety

## 🎨 UI/UX

- **Responsive Design**: Mobile-first approach with collapsible sidebar
- **Consistent Theming**: shadcn/ui components with neutral color scheme
- **Accessible**: Built with accessibility best practices
- **Professional**: Clean, modern interface suitable for business use

## 🚧 Development Status

This is a **functional SaaS platform** with:

✅ **Completed**:
- Project structure and configuration
- Sidebar navigation layout
- Skeleton pages for all main features
- Complete database schema with migrations
- Supabase integration setup
- TypeScript configuration
- Tailwind CSS and shadcn/ui setup
- **Authentication system with login/signup pages**
- **OAuth integration (Google + Microsoft)**
- **Route protection middleware**
- **Session management and logout**

🔄 **Next Steps**:
- Connect pages to Supabase data
- Build CRUD operations for all entities
- Add form validation and error handling
- Implement file upload functionality
- Add email notifications
- Build reporting and analytics features

## 📝 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the linter and tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For setup help or questions:
1. Check `SUPABASE_SETUP.md` for detailed setup instructions
2. Review the migration scripts in the `migrations/` folder
3. Consult the Supabase documentation for advanced configuration
