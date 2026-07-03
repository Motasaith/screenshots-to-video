const fs = require('fs');
let code = fs.readFileSync('src/components/wizard/StepEditorPanel.tsx', 'utf8');

// 1. Swap SIDEBAR 2 and RIGHT MAIN AREA.
const s2Marker = '          {/* ══════════ SIDEBAR 2: PROPERTIES & SETTINGS ══════════ */}';
const rmaMarker = '          {/* ══════════ RIGHT MAIN AREA ══════════ */}';

if (code.includes(s2Marker) && code.includes(rmaMarker)) {
    const partsS2 = code.split(s2Marker);
    const beforeS2 = partsS2[0];
    const restS2 = partsS2.slice(1).join(s2Marker);
    
    const partsRMA = restS2.split(rmaMarker);
    const s2Content = partsRMA[0];
    const rightmainAndRest = partsRMA.slice(1).join(rmaMarker);
    
    const endMarkerRegex = /(\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/motion\.div>)/;
    const match = rightmainAndRest.match(endMarkerRegex);
    
    if (match) {
        const endMarker = match[1];
        const partsMain = rightmainAndRest.split(endMarker);
        let rightmainContent = partsMain[0];
        const afterMain = partsMain.slice(1).join(endMarker);
        
        const timelineCode = `
              {/* TIMELINE BELOW CANVAS & DESCRIPTION */}
              <div className="mt-2 bg-[var(--sketch-card-bg)] border border-[var(--sketch-border-color)]/60 rounded-md p-2 flex gap-2 overflow-x-auto min-h-[70px] flex-shrink-0">
                {steps.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStepIndex(idx)}
                    className={\`flex-shrink-0 w-32 rounded border transition-all flex flex-col relative overflow-hidden group \${
                      idx === currentStepIndex
                        ? "border-teal-400 bg-teal-400/10 shadow-[2px_2px_0px_0px_rgba(45,212,191,0.5)]"
                        : "border-[var(--sketch-fg-subtle)]/30 hover:border-[var(--sketch-border-color)]/60 hover:bg-[var(--sketch-fg-subtle)]/5"
                    }\`}
                  >
                    {s.screenshotPath && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-40 transition-opacity"
                        style={{ backgroundImage: \`url(\${s.screenshotPath})\` }}
                      />
                    )}
                    <div className="flex items-center justify-between p-1 z-10 w-full bg-black/40">
                      <span className="font-mono text-[9px] font-bold text-white">Step {idx + 1}</span>
                      {s.transition !== "none" && (
                        <span className="text-[8px] bg-teal-500/80 text-white px-1 rounded">
                          {s.transition}
                        </span>
                      )}
                    </div>
                    <div className="p-1 text-[8px] font-body text-white/80 line-clamp-2 z-10 h-full flex-1">
                      {s.description}
                    </div>
                  </button>
                ))}
              </div>`;
        
        const fragEndRegex = /(\s*<\/>\s*\)\}\s*<\/div>)/;
        const fragMatch = rightmainContent.match(fragEndRegex);
        
        if (fragMatch) {
            const fragEnd = fragMatch[1];
            const partsFrag = rightmainContent.split(fragEnd);
            rightmainContent = partsFrag[0] + timelineCode + fragEnd + partsFrag.slice(1).join(fragEnd);
        }
        
        code = beforeS2 + rmaMarker + rightmainContent + 
               "            </div>\n          </div>\n" + // Fix unclosed RIGHT MAIN AREA
               s2Marker + s2Content + endMarker + afterMain;
               
        fs.writeFileSync('src/components/wizard/StepEditorPanel.tsx', code, 'utf8');
        console.log('Layout swapped and timeline added via node script.');
    } else {
        console.log('Could not find end marker of right main area');
    }
} else {
  console.log('Could not find markers');
}
