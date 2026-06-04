const fs = require('fs');
const file = "/var/www/my-ai-teacher/src/app/login/page.tsx";
let data = fs.readFileSync(file, 'utf8');

// Replace handleGoogle with a standard direct redirect to fix the server action problem. Previous redirection was done with a typo (window is not available on SSR but button click runs in client).
const oldFunc = 'const handleGoogle = async () => {\n    if (busy || done) return;\n    setBusy(true);\n    try {\n      await signIn("google", { callbackUrl: "/" });\n    } catch {\n      setBusy(false);\n      setDone(false);\n    }\n  };';
const newFunc = 'const handleGoogle = async () => {\n    if (busy || done) return;\n    setBusy(true);\n    window.location.href = "/api/auth/signin/google?callbackUrl=/";\n  };';

data = data.replace(oldFunc, newFunc);
fs.writeFileSync(file, data);
