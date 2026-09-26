# Amir Fast Food AI - Deployment Guide

This project is built with **React 19**, **TanStack Start (Nitro)**, and **Supabase**. It is optimized for serverless deployment on **Vercel**.

## Vercel Deployment Checklist

1. **Import the Repository**:
   - Go to your Vercel Dashboard and click "Add New..." -> "Project".
   - Select the `Amir_Fast_Food` repository.

2. **Framework Preset**:
   - Vercel should auto-detect **Vite** or **Other**. Ensure the build command is `npm run build` and the output directory is `.vercel/output` (Nitro standard) or `dist`.

3. **Environment Variables**:
   Ensure you add the following keys to the **Production** and **Preview** environments in Vercel before deploying:
   
   - `VITE_SUPABASE_URL`: Your Supabase Project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase public anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase secret service role key (Required for atomic checkout and server functions).
   - `GMAIL_USER`: The Gmail address used for Nodemailer.
   - `GMAIL_APP_PASSWORD`: The 16-character Google App Password.
   - `GEMINI_API_KEY`: Your Google AI Studio API key for AmirBot (RAG).

4. **Deploy**:
   - Click "Deploy".
   - The `.npmrc` file is configured with `legacy-peer-deps=true` to ensure clean resolution for React 19 dependencies (Three.js, R3F).

## Testing

Once deployed, visit your `.vercel.app` domain:
- The wallet should auto-credit PKR 10,000 on signup.
- Orders under PKR 1,000 will incur a PKR 100 delivery fee.
- You will receive a fully formatted HTML receipt to your email address via Gmail SMTP.