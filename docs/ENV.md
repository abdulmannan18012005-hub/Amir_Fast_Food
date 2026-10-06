# Environment Variables Reference

Create a `.env` or configure these in Vercel.

```env
# Supabase
VITE_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...

# Email (Nodemailer via SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Admin Auth
ADMIN_PIN=7864
SHOP_EMAIL=support@amirfastfood.com

# Push Notifications (Web Push)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@gmail.com

# AI Bot (Optional)
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
```
