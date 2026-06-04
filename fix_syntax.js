const fs = require('fs');
const file = "/var/www/my-ai-teacher/src/components/StudyAssistant.jsx";
let data = fs.readFileSync(file, 'utf8');

const badBlock = `    if (el) {
        // Prevent scroll jumping and thrashing
        const scrollPos = window.scrollY;
        el.style.height = "inherit";
        el.style.height = \`\${Math.min(el.scrollHeight, 220)}px\`;
        window.scrollTo(0, scrollPos);
    text,
  });`;

const replacedBlocks = `    if (el) {
        // Prevent scroll jumping and thrashing
        const scrollPos = window.scrollY;
        el.style.height = "inherit";
        el.style.height = \`\${Math.min(el.scrollHeight, 220)}px\`;
        window.scrollTo(0, scrollPos);
    }
  };

  const buildPayload = () => ({
    text,
  });`;

data = data.replace(badBlock, replacedBlocks);
fs.writeFileSync(file, data);
