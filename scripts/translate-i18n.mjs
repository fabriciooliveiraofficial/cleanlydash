import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generai';
import dotenv from 'dotenv';

// Load environment variables manually to ensure they are available
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const LOCALES_DIR = './lib/locales';
const TARGET_LANGS = ['pt', 'es']; // Add more as needed
const SOURCE_LANG = 'en';

async function translateText(text, targetLang) {
    if (!text || text.trim() === '') return '';

    // Skip if already translated (placeholder check)
    if (text.startsWith('__')) return text;

    const prompt = `Translate the following UI string to ${targetLang}. 
    Keep the same tone (professional and efficient for a management app).
    Maintain any variables like {{count}} or {{name}}.
    Target Language: ${targetLang}
    Text: "${text}"
    Translation:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim().replace(/^"|"$/g, '');
    } catch (error) {
        console.error(`❌ Translation error for "${text}":`, error.message);
        return text; // Return source on failure
    }
}

async function processTranslations(obj, targetLang) {
    const translated = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
            translated[key] = await processTranslations(value, targetLang);
        } else {
            // Only translate if it matches the marker __NOT_TRANSLATED__ or if the value is equal to the key (fallback from parser)
            if (value === '__NOT_TRANSLATED__' || value === '' || value === key) {
                console.log(`  🌐 Translating [${key}]: "${value}"...`);
                translated[key] = await translateText(key, targetLang);
            } else {
                translated[key] = value;
            }
        }
    }
    return translated;
}

async function run() {
    console.log('🚀 Starting Intelligent Translation Sync...');

    for (const lang of TARGET_LANGS) {
        const filePath = path.join(LOCALES_DIR, `${lang}.json`);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${filePath}, skipping.`);
            continue;
        }

        console.log(`\nProcessing ${lang.toUpperCase()}...`);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const updatedContent = await processTranslations(content, lang);

        fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf8');
        console.log(`✅ ${lang.toUpperCase()} sync complete.`);
    }

    console.log('\n✨ All translations synced successfully.');
}

run();
