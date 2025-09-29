# Supabase Setup Instructions

This guide will help you set up Supabase for your Translator SaaS application.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new project in your Supabase dashboard

## Environment Configuration

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your project URL (found in Project Settings > API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key (found in Project Settings > API)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (found in Project Settings > API)

## Database Schema Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration scripts in the following order:
   - `migrations/001_create_users_table.sql`
   - `migrations/002_create_clients_table.sql`
   - `migrations/003_create_jobs_table.sql`
   - `migrations/004_create_invoices_table.sql`
   - `migrations/005_create_training_records_table.sql`
   - `migrations/006_setup_rls_policies.sql`

## Authentication Setup

1. Navigate to Authentication > Settings in your Supabase dashboard
2. Configure the following providers:
   - **Email**: Already enabled by default
   - **Google**:
     - Enable the Google provider
     - Add your Google OAuth credentials
   - **Microsoft**:
     - Enable the Microsoft provider
     - Add your Microsoft OAuth credentials

3. Set up redirect URLs:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

4. Configure Site URL:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

## Row Level Security (RLS)

The migration scripts include RLS policies that ensure:
- Users can only access their own data
- Proper data isolation between different users
- Secure access patterns for all tables

## Testing the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000` to test the application
3. The app should redirect to the login page if not authenticated
4. Create an account or sign in to access the dashboard

## Authentication Flow

The application includes complete authentication functionality:

- **Login Page** (`/login`): Email/password and OAuth sign-in
- **Signup Page** (`/signup`): Account creation with email confirmation
- **OAuth Callback** (`/auth/callback`): Handles Google and Microsoft OAuth
- **Protected Routes**: Middleware protects all main app pages
- **Logout**: Functional logout button in sidebar

### Available Auth Methods:
1. **Email/Password**: Standard email signup with confirmation
2. **Google OAuth**: Sign in with Google account
3. **Microsoft OAuth**: Sign in with Microsoft account

## Next Steps

After setting up Supabase:
1. Implement authentication pages and flows
2. Connect the skeleton pages to actual Supabase data
3. Set up user registration and profile creation
4. Implement CRUD operations for jobs, clients, and invoices

## Troubleshooting

### Common Issues

1. **Environment variables not loading**: Ensure `.env.local` is in the project root and restart your dev server
2. **RLS policies blocking access**: Check that policies are correctly applied and user authentication is working
3. **CORS errors**: Ensure your domain is added to the allowed origins in Supabase settings

### Useful Supabase Commands

```bash
# Install Supabase CLI (optional, for local development)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Pull schema changes
supabase db pull
```

## Security Notes

- Never commit `.env.local` to version control
- Use environment-specific variables for different environments
- Regularly rotate your service role key
- Monitor your Supabase usage and set up billing alerts