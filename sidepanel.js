const memes = {
  rickroll: ["Never", "Gonna", "Give", "You", "Up", "Never", "Gonna", "Let", "You", "Down"],
  base: ["All", "Your", "Base", "Are", "Belong", "To", "Us"],
  fine: ["This", "Is", "Fine", "Everything", "Is", "Fine"]
};

// 1. Storage & Key Management
chrome.storage.local.get(['openai_key'], (res) => { 
  if(res.openai_key) document.getElementById('apiKeyInput').value = res.openai_key; 
});

document.getElementById('saveKeyBtn').addEventListener('click', () => {
  const key = document.getElementById('apiKeyInput').value;
  chrome.storage.local.set({ openai_key: key }, () => alert("Key saved!"));
});

// 2. FIXED: Selection Listener (Works instantly on right-click)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedText) {
    document.getElementById('inputText').value = changes.selectedText.newValue;
    // Clean up storage so it doesn't re-paste on refresh
    chrome.storage.local.remove('selectedText');
  }
});

// 3. File Upload Logic
document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.name.endsWith('.txt')) {
    const reader = new FileReader();
    reader.onload = (e) => document.getElementById('inputText').value = e.target.result;
    reader.readAsText(file);
  } else if (file.name.endsWith('.docx')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      mammoth.extractRawText({ arrayBuffer: e.target.result })
        .then(result => document.getElementById('inputText').value = result.value);
    };
    reader.readAsArrayBuffer(file);
  }
});

// 4. Main AI Engine
document.getElementById('generateBtn').addEventListener('click', async () => {
  const text = document.getElementById('inputText').value;
  const choice = document.getElementById('memeSelector').value;
  const mode = document.querySelector('input[name="encMode"]:checked').value;
  const memeWords = memes[choice];
  const { openai_key } = await chrome.storage.local.get(['openai_key']);

  if (!openai_key) return alert("Save key first!");
  if (!text) return alert("Enter text first!");

  const resultCard = document.getElementById('resultCard');
  const output = document.getElementById('output');
  const fill = document.getElementById('progressFill');
  const scoreText = document.getElementById('scoreText');

  resultCard.style.display = "block";
  output.innerText = "Encoding... 🎭";
  fill.style.width = "0%";

  let targetSequence = mode === 'word' ? memeWords : memeWords.join('').toUpperCase().split('');
  
  // FIXED PROMPT: Demands authentic preservation scoring
  const prompt = `Task: Rewrite the text into a professional prose biography/document. 
  Original Text: "${text}"
  Constraint: Exactly ${targetSequence.length} lines. 
  ${mode === 'word' 
    ? `Line i must start with word i of: ${targetSequence.join(', ')}.` 
    : `Line i must start with the letter: ${targetSequence.join(', ')}.`}
  
  Rule: NO POETRY. Maintain original tone. 
  Return valid JSON: {"rewritten_text": "line1\\nline2...", "preservation_score": integer_0_to_100}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openai_key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are an expert editor specializing in prose steganography." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4 // Lower temperature for stricter adherence
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    scoreText.innerText = result.preservation_score + "%";
    fill.style.width = result.preservation_score + "%";

    const lines = result.rewritten_text.trim().split('\n').filter(l => l.trim());
    
    // FIXED HIGHLIGHTING: Ensures correct word/letter index mapping
    output.innerHTML = lines.map((line) => {
      const trimmed = line.trim();
      if (mode === 'word') {
        const firstSpace = trimmed.indexOf(' ');
        const firstWord = firstSpace === -1 ? trimmed : trimmed.substring(0, firstSpace);
        const rest = firstSpace === -1 ? "" : trimmed.substring(firstSpace);
        return `<span class="meme-highlight">${firstWord}</span>${rest}`;
      } else {
        return `<span class="meme-highlight">${trimmed[0]}</span>${trimmed.slice(1)}`;
      }
    }).join('\n');

  } catch (e) { output.innerText = "Error: " + e.message; }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(document.getElementById('output').innerText).then(() => alert("Copied!"));
});