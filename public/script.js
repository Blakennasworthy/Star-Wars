const form = document.querySelector("#prompt-form");
const promptInput = document.querySelector("#prompt");
const statusEl = document.querySelector("#status");
const resultsPanel = document.querySelector("#results-panel");
const backgroundLayer = document.querySelector("#background-layer");

// Generate a color based on a string hash
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  
  const hue = Math.abs(hash % 360);
  const saturation = 70 + (Math.abs(hash) % 30);
  const lightness = 35 + (Math.abs(hash) % 20);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Update background based on character search
function updateBackground(characterName) {
  const color1 = stringToColor(characterName);
  const color2 = stringToColor(characterName + "_accent");
  
  const svgBg = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="charBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${color1.replace("#", "%23")};stop-opacity:0.15" /><stop offset="100%" style="stop-color:${color2.replace("#", "%23")};stop-opacity:0.2" /></linearGradient><filter id="glow2"><feGaussianBlur stdDeviation="12" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="1000" height="1000" fill="%23050816"/><rect width="1000" height="1000" fill="url(%23charBg)"/><circle cx="200" cy="200" r="300" fill="${color1}" opacity="0.08" filter="url(%23glow2)"/><circle cx="800" cy="800" r="250" fill="${color2}" opacity="0.06" filter="url(%23glow2)"/></svg>')`;
  
  backgroundLayer.style.background = svgBg;
  backgroundLayer.style.backgroundSize = "cover";
  backgroundLayer.style.backgroundPosition = "center";
}

// Reset background to Star Wars logo
function resetBackground() {
  backgroundLayer.style.background = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="starWarsBg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23050816;stop-opacity:1" /><stop offset="50%" style="stop-color:%23090a14;stop-opacity:1" /><stop offset="100%" style="stop-color:%23040609;stop-opacity:1" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="8" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="1000" height="1000" fill="url(%23starWarsBg)"/><circle cx="500" cy="300" r="150" fill="%23385dc0" opacity="0.08" filter="url(%23glow)"/><text x="500" y="600" font-family="serif" font-size="180" font-weight="bold" fill="%23f2f2f2" opacity="0.05" text-anchor="middle" style="font-style:italic;letter-spacing:20px;">STAR WARS</text></svg>')`;
  backgroundLayer.style.backgroundSize = "cover";
  backgroundLayer.style.backgroundPosition = "center";
}

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const prompt = promptInput.value.trim();
  if (!prompt) {
    statusEl.textContent = "Please enter a Star Wars description to search for images.";
    return;
  }

  statusEl.textContent = "🔍 Searching for matching Star Wars images...";
  statusEl.classList.add("loading");
  resultsPanel.innerHTML = "";
  form.querySelector("button").disabled = true;

  try {
    const response = await fetch("/api/search-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const result = await response.json();

    if (!response.ok) {
      statusEl.textContent = "❌ " + (result.error || "Image search failed.");
      statusEl.classList.remove("loading");
      form.querySelector("button").disabled = false;
      return;
    }

    const items = result.items || [];
    
    // Update background based on the character found
    updateBackground(result.character || prompt);
    
    // Show correction message if name was corrected
    if (result.wasCorrected) {
      statusEl.textContent = `✓ Searching for "${result.character}" — Found ${items.length} images.`;
    } else {
      statusEl.textContent = `✓ Found ${items.length} Star Wars images for your description.`;
    }
    
    statusEl.classList.remove("loading");
    
    if (!items.length) {
      statusEl.textContent = "No matching images found. Try refining your description.";
      form.querySelector("button").disabled = false;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "image-card loading";

      const image = document.createElement("img");
      image.src = `/api/image?url=${encodeURIComponent(item.image)}`;
      image.alt = item.title;
      image.loading = "lazy";
      image.style.cursor = "pointer";
      
      // Handle broken images
      image.onerror = () => {
        card.style.opacity = "0.5";
        card.style.pointerEvents = "none";
        card.title = "Image failed to load";
      };
      
      image.onload = () => {
        card.classList.remove("loading");
        card.style.opacity = "1";
      };
      
      image.onclick = () => window.open(`/api/image?url=${encodeURIComponent(item.image)}`, '_blank');

      const caption = document.createElement("p");
      caption.textContent = item.title;

      card.append(image, caption);
      resultsPanel.append(card);
    });

    form.querySelector("button").disabled = false;
    
  } catch (error) {
    console.error(error);
    statusEl.textContent = "❌ Unable to search for images. Check the server and your network.";
    statusEl.classList.remove("loading");
    form.querySelector("button").disabled = false;
  }
});

// Reset background when page loads
window.addEventListener("load", () => {
  resetBackground();
});
