# 🛠️ How to Fix "Failed to find Server Action" & NextAuth Errors

## 🤔 Why does this happen every time you update code?
You are using **Next.js 16 (Turbopack)**. Every time you change code and rebuild
, Next.js generates new cryptographic hash IDs for all your `Server Actions`. 
If you update the site but the `.next` cache folder isn't completely wiped out,
or if the user's browser holds onto an old cache from their Disk Cache, the Fron
tend asks for an Action ID (like "x") that no longer exists in the Backend cache. 
**Boom, the site crashes.**

## 🎯 The Bulletproof Deployment Step
Whenever you pull new code from Git, **NEVER** just restart PM2. **NEVER** just
run `npm run build`. You must completely nuke the build cache first.

Run this exact command chain every time you update your VPS:

```bash
cd /var/www/my-ai-teacher

# 1. REMOVE THE CACHE ENTIRELY (Crucial Step!)
rm -rf .next

# 2. Rebuild the optimized production bundle
npm run build

# 3. Restart PM2 smoothly
pm2 restart 0
```

## 🚨 What if a user still sees the error?
If a user is visiting the site and sees the "Failed to find Server Action" error
, their browser is holding onto an outdated Javascript file.
Tell them to do a **Hard Refresh**:
- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

## 🔒 Golden Rule for Coding Auth Buttons
NextAuth v5 beta allows using Server Actions for auth, but **AVOID IT.** If your users cache the login page, the server action ID WILL crash on subsequent deployments.

Instead of writing a `<form action={async () => signIn()}>` logic, ALWAYS use the Client-Side SDK from NextAuth:

**WRONG (Will crash eventually on deployments):**
```tsx
import { signIn } from "@/auth"; // Server-side
<form action={async () => { "use server"; await signIn("google") }}>
  <button type="submit">Click me</button>
</form>
```

**RIGHT (Bulletproof - uses static API routes /api/auth/signin/google):**
```tsx
"use client";
import { signIn } from "next-auth/react"; // Client-side

<button onClick={() => signIn("google", { callbackUrl: "/" })}>Click me</button>
```
