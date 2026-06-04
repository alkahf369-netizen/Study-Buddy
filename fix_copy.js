const fs = require('fs');
const file = "src/components/StudyAssistant.jsx";
let data = fs.readFileSync(file, 'utf8');

const oldHandleCopy = `  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };`;

if(data.includes(oldHandleCopy)){
   data = data.replace(oldHandleCopy, '');
}

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
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.top = "-999999px";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); } catch(e){}
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };`;

if(data.includes(isImageBlock)){
    data = data.replace(isImageBlock, newHandleCopy);
}

fs.writeFileSync(file, data);
