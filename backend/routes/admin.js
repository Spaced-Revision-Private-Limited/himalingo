import express from 'express';
import fs from 'fs';
import path from 'path';
import Translation from '../models/Translation.js';

const router = express.Router();

router.get("/all-data", async (req, res) => {
    try {
        const translations = await Translation.find().sort({ createdAt: -1 });
        res.json({ success: true, translations });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/sync-json", async (req, res) => {
    try {
        const dataPath = path.join(process.cwd(), 'data');
        const files = fs.readdirSync(dataPath);
        const allData = [];

        files.forEach(file => {
            if (!file.endsWith('.json')) return;
            try {
                const content = JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf-8'));
                const items = Array.isArray(content) ? content : [content];

                items.forEach(item => {

                    // handle nested formal/informal arrays
                    if (item.formal || item.informal) {
                        const nested = [...(item.formal || []), ...(item.informal || [])];
                        nested.forEach(n => {
                            const eng = (n.english || "").trim();
                            const bhu = (n.bhutia || n.transliteration_bhutia || n.transliteration || "").trim();
                            if (eng && bhu) {
                                allData.push({ english: eng, transliteration: bhu, language: "Bhutia" });
                            }
                        });
                        return;
                    }

                    // skip heading/content format — unstructured free text
                    if (item.heading && item.content) return;

                    // handle normal formats
                    const eng = (
                        item.english ||
                        item.English ||
                        item.text ||
                        item.question ||
                        item.word ||
                        item.phrase ||
                        item.sentence || ""
                    ).trim();

                    const bhu = (
                        item.transliteration_bhutia ||
                        item.transliteration ||
                        item.bhutia ||
                        item.Bhutia ||
                        item.answer ||
                        item.translation ||
                        item.bhutia_translation ||
                        item.romanized || ""
                    ).trim();

                    if (eng && bhu) {
                        allData.push({ english: eng, transliteration: bhu, language: "Bhutia" });
                    }
                });

            } catch (e) {
                console.error(`Error in ${file}`);
            }
        });

        if (allData.length > 0) {
            await Translation.deleteMany({});
            await Translation.insertMany(allData, { ordered: false });
            return res.json({ success: true, message: `Synced ${allData.length} items!` });
        }

        res.json({ success: false, message: "No data found." });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post("/toggle-status/:id", async (req, res) => {
    try {
        const item = await Translation.findById(req.params.id);
        if (item) {
            item.isChecked = !item.isChecked;
            await item.save();
            return res.json({ success: true, isChecked: item.isChecked });
        }
        res.status(404).json({ success: false, message: "Item not found" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

export default router;