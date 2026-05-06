import dotenv from "dotenv";
import express from "express";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const publicPath = path.join(process.cwd(), "public");

// Comprehensive Star Wars character database
const STAR_WARS_CHARACTERS = [
  // Original Trilogy
  "Luke Skywalker", "Leia Organa", "Han Solo", "Darth Vader", "Yoda", "Lando Calrissian",
  "Chewbacca", "C-3PO", "R2-D2", "Obi-Wan Kenobi", "Emperor Palpatine", "Boba Fett",
  "Moff Tarkin", "Princess Leia", "Grand Moff Tarkin", "Jabba the Hutt", "Ewok",
  // Prequel Trilogy
  "Anakin Skywalker", "Padmé Amidala", "Jar Jar Binks", "Qui-Gon Jinn", "Obi-Wan",
  "Mace Windu", "Palpatine", "Dooku", "General Grievous", "Jango Fett", "Liam Neeson",
  "Ewan McGregor", "Natalie Portman", "Hayden Christensen",
  // Sequel Trilogy
  "Rey", "Finn", "Poe Dameron", "Kylo Ren", "Supreme Leader Snoke", "Rose Tico",
  "BB-8", "Captain Phasma", "General Hux", "Maz Kanata", "Luke", "Leia",
  // Rogue One
  "Jyn Erso", "Cassian Andor", "K-2SO", "Bodhi Rook", "Saw Gerrera", "Orson Krennic",
  // Other characters
  "Ahsoka Tano", "Asajj Ventress", "Barriss Offee", "Boba", "Bossk", "Cad Bane",
  "Clone Trooper", "Darth Maul", "Darth Tyranus", "Dengar", "General Crix", "General Veers",
  "Greedo", "IG-88", "Jawa", "Lobot", "Nien Nunb", "Salacious Crumb", "Sly Moore",
  "Stormtrooper", "Tatooine", "Tusken Raider", "Ugnaught", "Wedge Antilles",
  // Disney+ Shows
  "Grogu", "Baby Yoda", "The Child", "Din Djarin", "Mando", "The Mandalorian",
  "Obi-Wan Kenobi", "Owen Lars", "Reva", "Fifth Brother", "Rogue Inquisitor",
  "Andor", "Mon Mothma", "Dedra Meero", "Grandpa Tarkin", "Luthen Rael",
  // Spin-offs
  "Jedi Survivor", "Cal Kestis", "BD-1", "Cere Junda", "Trilla", "The Second Sister"
];

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();
  const distances = [];
  
  for (let i = 0; i <= lower1.length; i++) {
    distances[i] = [i];
  }
  
  for (let j = 0; j <= lower2.length; j++) {
    distances[0][j] = j;
  }
  
  for (let i = 1; i <= lower1.length; i++) {
    for (let j = 1; j <= lower2.length; j++) {
      if (lower1[i - 1] === lower2[j - 1]) {
        distances[i][j] = distances[i - 1][j - 1];
      } else {
        distances[i][j] = Math.min(
          distances[i - 1][j - 1] + 1,
          distances[i][j - 1] + 1,
          distances[i - 1][j] + 1
        );
      }
    }
  }
  
  return distances[lower1.length][lower2.length];
}

// Find the closest matching character name
function findClosestCharacter(input) {
  let closestMatch = input;
  let minDistance = Infinity;
  
  for (const character of STAR_WARS_CHARACTERS) {
    const distance = levenshteinDistance(input, character);
    
    // Only consider matches with reasonable similarity
    if (distance < minDistance && distance <= Math.max(3, Math.floor(input.length * 0.3))) {
      minDistance = distance;
      closestMatch = character;
    }
  }
  
  return closestMatch;
}

app.use(express.json());
app.use(express.static(publicPath));

async function fetchDuckDuckGoToken(query) {
  const response = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ImageSearchBot/1.0; +https://example.com)"
    }
  });

  const text = await response.text();
  const match = text.match(/vqd=['"]([\d-]+)['"]/);
  if (!match) {
    throw new Error("Unable to extract DuckDuckGo token.");
  }

  return match[1];
}

async function searchDuckDuckGoImages(query) {
  const token = await fetchDuckDuckGoToken(query);
  const url = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${token}`;
  const response = await fetch(url, {
    headers: {
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://duckduckgo.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest"
    }
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed with status ${response.status}`);
  }

  return response.json();
}

function isCharacterSpecificResult(title, prompt) {
  const titleLower = title.toLowerCase();
  const promptLower = prompt.toLowerCase();
  
  // Exclude generic franchise images
  const genericPatterns = [
    /^star wars$/i,
    /logo/i,
    /poster collection/i,
    /wallpaper pack/i,
    /fan art compilation/i
  ];
  
  if (genericPatterns.some(pattern => pattern.test(title))) {
    return false;
  }
  
  // Ensure the title contains the character name
  const promptWords = promptLower.split(/\s+/).filter(w => w.length > 2);
  const containsCharacterKeywords = promptWords.some(word => titleLower.includes(word));
  
  // Also accept titles that include character-related keywords
  const characterKeywords = ['character', 'actor', 'portrait', 'cosplay', 'figure', 'statue'];
  const hasCharacterKeyword = characterKeywords.some(keyword => titleLower.includes(keyword));
  
  return containsCharacterKeywords || hasCharacterKeyword;
}

app.post("/api/search-images", async (req, res) => {
  let prompt = req.body.prompt?.trim();

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  // Apply fuzzy matching to correct misspelled character names
  const correctedPrompt = findClosestCharacter(prompt);
  const wasCorrected = correctedPrompt.toLowerCase() !== prompt.toLowerCase();
  
  if (wasCorrected) {
    prompt = correctedPrompt;
  }

  // Use multiple search queries to find character scenes and Star Wars content
  const sceneQuery = `${prompt} scene Star Wars`;
  const actionQuery = `${prompt} action Star Wars`;
  const hdQuery = `${prompt} Star Wars 4K HD`;
  const screenshotQuery = `${prompt} screenshot Star Wars`;
  const movieQuery = `${prompt} Star Wars movie scene`;
  const showQuery = `${prompt} Star Wars show scene`;

  try {
    const [sceneResult, actionResult, hdResult, screenshotResult, movieResult, showResult] = await Promise.all([
      searchDuckDuckGoImages(sceneQuery),
      searchDuckDuckGoImages(actionQuery),
      searchDuckDuckGoImages(hdQuery),
      searchDuckDuckGoImages(screenshotQuery),
      searchDuckDuckGoImages(movieQuery),
      searchDuckDuckGoImages(showQuery)
    ]);

    const formatResults = (result) => 
      (result?.results || [])
        .map((item) => ({
          title: item.title || item.source || "Star Wars image",
          image: item.image,
          source: item.source,
          url: item.url
        }))
        .filter((item) => item.image && isCharacterSpecificResult(item.title, prompt));

    const sceneItems = formatResults(sceneResult).slice(0, 50);
    const actionItems = formatResults(actionResult).slice(0, 45);
    const hdItems = formatResults(hdResult).slice(0, 40);
    const screenshotItems = formatResults(screenshotResult).slice(0, 40);
    const movieItems = formatResults(movieResult).slice(0, 40);
    const showItems = formatResults(showResult).slice(0, 35);

    // Combine results while avoiding duplicates - aim for maximum variety
    const usedImages = new Set();
    const items = [];
    
    for (const item of [...sceneItems, ...actionItems, ...hdItems, ...screenshotItems, ...movieItems, ...showItems]) {
      if (!usedImages.has(item.image)) {
        items.push(item);
        usedImages.add(item.image);
        if (items.length >= 80) break;
      }
    }

    if (items.length === 0) {
      return res.status(404).json({ 
        error: "No character-specific images found. Try a different character name." 
      });
    }

    res.json({ 
      items,
      character: prompt,
      wasCorrected
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Unable to search for images." });
  }
});

app.get("/api/image", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send("Missing url");
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image");
    }
    const buffer = await response.arrayBuffer();
    res.set('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).send("Error fetching image");
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
