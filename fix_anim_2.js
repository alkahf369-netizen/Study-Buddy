const fs = require('fs');
const file = "/var/www/my-ai-teacher/src/components/StudyAssistant.jsx";
let data = fs.readFileSync(file, 'utf8');

const search = '<div className="group relative rounded-2xl border border-zinc-200 bg-white/80 p-2 shadow-[0_12px_40px_rgba(17,24,39,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 focus-within:border-zinc-400 focus-within:shadow-[0_16px_50px_rgba(17,24,39,0.10),inset_0_1px_0_rgba(255,255,255,1)]">';

const replace1 = '<div className={cn("group relative rounded-2xl border border-zinc-200 bg-white/80 p-2 shadow-[0_12px_40px_rgba(17,24,39,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 focus-within:border-zinc-400 focus-within:shadow-[0_16px_50px_rgba(17,24,39,0.10),inset_0_1px_0_rgba(255,255,255,1)]", mcqLoading && "sine-wave-border")}>';

const replace2 = '<div className={cn("group relative rounded-2xl border border-zinc-200 bg-white/80 p-2 shadow-[0_12px_40px_rgba(17,24,39,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 focus-within:border-zinc-400 focus-within:shadow-[0_16px_50px_rgba(17,24,39,0.10),inset_0_1px_0_rgba(255,255,255,1)]", isTyping && "sine-wave-border")}>';

let parts = data.split(search);
if (parts.length === 3) {
  data = parts[0] + replace1 + parts[1] + replace2 + parts[2];
  fs.writeFileSync(file, data);
  console.log("Successfully replaced both prompt bar frames!");
} else {
  console.error("Found " + (parts.length - 1) + " matches instead of 2.");
}
