const fs = require('fs');
const file = "/var/www/my-ai-teacher/src/components/StudyAssistant.jsx";
let data = fs.readFileSync(file, 'utf8');

// 1. IMAGE DROPDOWN POSITIONING
data = data.replace(
  'absolute top-full left-0 z-50 mt-1.5 min-w-[200px] origin-top',
  'absolute bottom-full left-0 z-50 mb-1.5 min-w-[200px] origin-bottom'
).replace(
  'transformOrigin: "top left"',
  'transformOrigin: "bottom left"'
);

// 2. COPY FUNCTION (Async Fallback)
const oldHandleCopy = `  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };`;
data = data.replace(oldHandleCopy, '');

const isImageBlock = `      displayContent = imageMatch ? imageMatch[0] : "";
    }
  }`;
const newHandleCopy = `      displayContent = imageMatch ? imageMatch[0] : "";
    }
  }

  const handleCopy = async () => {
    const textToCopy = displayContent || content || "";
    if (!textToCopy) return;
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        ta.style.position = "fixed";
        ta.style.top = "-999999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch(e){}
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(err) {}
  };`;
if(data.includes(isImageBlock)) data = data.replace(isImageBlock, newHandleCopy);

// 3. TEXTAREA RESIZING (Prompt Bar MCQ)
const oldTaRe1 = `    const handleInput = (e) => {
      setText(e.target.value);
      const el = taRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = \`\${Math.min(el.scrollHeight, 220)}px\`;
      }
    };`;
const newTaRe1 = `    const handleInput = (e) => {
      setText(e.target.value);
      const el = taRef.current;
      if (el) {
        const scrollPos = window.scrollY;
        el.style.height = "inherit";
        el.style.height = \`\${Math.min(el.scrollHeight, 220)}px\`;
        window.scrollTo(0, scrollPos);
      }
    };`;
data = data.replace(oldTaRe1, newTaRe1);

// 4. TEXTAREA RESIZING (Prompt Bar Chat 1)
const oldTaRe2 = `    const handleInput = (e) => {
      const val = e.target.value;
      setText(val);
      const el = taRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = \`\${Math.min(el.scrollHeight, 220)}px\`;
      }
      updateSlashState(val, e.target.selectionStart ?? val.length);
    };`;
const newTaRe2 = `    const handleInput = (e) => {
      const val = e.target.value;
      setText(val);
      const el = taRef.current;
      if (el) {
        const scrollPos = window.scrollY;
        el.style.height = "inherit";
        el.style.height = \`\${Math.min(el.scrollHeight, 220)}px\`;
        window.scrollTo(0, scrollPos);
      }
      updateSlashState(val, e.target.selectionStart ?? val.length);
    };`;
data = data.replace(oldTaRe2, newTaRe2);

// 5. TEXTAREA RESIZING (Prompt Bar Chat Selection)
const oldTaRe3 = `        if (taRef.current) {
          const newCaret = replaced.length;
          taRef.current.focus();
          taRef.current.setSelectionRange(newCaret, newCaret);
          taRef.current.style.height = "auto";
          taRef.current.style.height = \`\${Math.min(taRef.current.scrollHeight, 220)}px\`;
        }`;
const newTaRe3 = `        if (taRef.current) {
          const newCaret = replaced.length;
          taRef.current.focus();
          taRef.current.setSelectionRange(newCaret, newCaret);
          const scrollPos = window.scrollY;
          taRef.current.style.height = "inherit";
          taRef.current.style.height = \`\${Math.min(taRef.current.scrollHeight, 220)}px\`;
          window.scrollTo(0, scrollPos);
        }`;
data = data.replace(oldTaRe3, newTaRe3);

// 6. OVERFLOW SCROLL (MCQ TEXTAREA)
data = data.replace(
  'className="block max-h-[220px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-black placeholder:text-zinc-400 outline-none"',
  'className="block max-h-[220px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-[15px] leading-relaxed text-black placeholder:text-zinc-400 outline-none overflow-y-auto"'
);

// 7. OVERFLOW SCROLL (CHAT TEXTAREA)
data = data.replace(
  '"relative block max-h-[220px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-zinc-400",',
  '"relative block max-h-[220px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-zinc-400 overflow-y-auto",'
);

fs.writeFileSync(file, data);
