const fs = require('fs');
const file = "/var/www/my-ai-teacher/src/app/login/page.tsx";
let data = fs.readFileSync(file, 'utf8');

// Replace import
data = data.replace('import { signIn } from "next-auth/react";', 'import { loginWithGoogle } from "./actions";\nimport { useTransition } from "react";');

// In modern React, you shouldn't use useTransition if you don't need to but let's just await it
data = data.replace('signIn("google", { callbackUrl: "/" });', 'await loginWithGoogle();');

fs.writeFileSync(file, data);
