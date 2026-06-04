# 🛠️ How to Fix "Failed to find Server Action" & NextAuth Errors

## 🤔 Why does this happen every time you update code?
You are using **Next.js 16 (Turbopack)**. Every time you change code and rebuild, Next.js generates new cryptographic hash IDs for all your `Server Actions`. 
If you update the site but the `.next` cache folder isn't completely wiped out, or if the user's browser holds onto an old cache, the Frontend asks for an Action ID (like "x") that no longer exists in the Backend cache. **Boom, the site crashes.**

## 🎯 The Bulletproof Deployment Step
Whenever you pull new code from Git, **NEVER** just restart PM2. **NEVER** just run `npm run build`. You must completely nuke the build cache first.

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
If a user is visiting the site and sees the "Failed to find Server Action" error, their browser is holding onto an outdated Javascript file.
Tell them to do a **Hard Refresh**:
- **Windows/Linux:** `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac:** `Cmd + Shift + R`

## 🔒 Golden Rule for Coding Auth Buttons
If you add any more Server Actions in the future (like a logout button), **do not put them in `onClick={}`.**
Always wrap the button in a standard HTML Form. Turbopack understands Forms better than complex `onClick` hydration.

**WRONG (Will crash eventually):**
```tsx
<button onClick={async () => await myServerAction()}>Click me</button>
```

**RIGHT (Bulletproof):**
```tsx
<form action={myServerAction}>
  <button type="submit">Click me</button>
</form>
```
