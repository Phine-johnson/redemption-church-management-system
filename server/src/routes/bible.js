import { Router } from 'express';
import { query } from '../database/init.js';

const router = Router();

const bookSlugMap = {
  "Genesis": "genesis", "Exodus": "exodus", "Leviticus": "leviticus", "Numbers": "numbers",
  "Deuteronomy": "deuteronomy", "Joshua": "joshua", "Judges": "judges", "Ruth": "ruth",
  "1 Samuel": "1samuel", "2 Samuel": "2samuel", "1 Kings": "1kings", "2 Kings": "2kings",
  "1 Chronicles": "1chronicles", "2 Chronicles": "2chronicles", "Ezra": "ezra", "Nehemiah": "nehemiah",
  "Esther": "esther", "Job": "job", "Psalms": "psalms", "Proverbs": "proverbs",
  "Ecclesiastes": "ecclesiastes", "Song of Solomon": "songs", "Isaiah": "isaiah", "Jeremiah": "jeremiah",
  "Lamentations": "lamentations", "Ezekiel": "ezekiel", "Daniel": "daniel", "Hosea": "hosea",
  "Joel": "joel", "Amos": "amos", "Obadiah": "obadiah", "Jonah": "jonah",
  "Micah": "micah", "Nahum": "nahum", "Habakkuk": "habakkuk", "Zephaniah": "zephaniah",
  "Haggai": "haggai", "Zechariah": "zechariah", "Malachi": "malachi", "Matthew": "matthew",
  "Mark": "mark", "Luke": "luke", "John": "john", "Acts": "acts",
  "Romans": "romans", "1 Corinthians": "1corinthians", "2 Corinthians": "2corinthians", "Galatians": "galatians",
  "Ephesians": "ephesians", "Philippians": "philippians", "Colossians": "colossians", "1 Thessalonians": "1thessalonians",
  "2 Thessalonians": "2thessalonians", "1 Timothy": "1timothy", "2 Timothy": "2timothy", "Titus": "titus",
  "Philemon": "philemon", "Hebrews": "hebrews", "James": "james", "1 Peter": "1peter",
  "2 Peter": "2peter", "1 John": "1john", "2 John": "2john", "3 John": "3john",
  "Jude": "jude", "Revelation": "revelation"
};

const dailyDevotionals = [
  { day: "Monday", title: "The Good Shepherd", verse: "Psalm 23:1", text: "The Lord is my shepherd; I shall not want." },
  { day: "Tuesday", title: "Trust Without Understanding", verse: "Proverbs 3:5", text: "Trust in the Lord with all your heart." },
  { day: "Wednesday", title: "All Things Work Together", verse: "Romans 8:28", text: "All things work together for good." },
  { day: "Thursday", title: "God So Loved", verse: "John 3:16", text: "For God so loved the world." },
  { day: "Friday", title: "I Can Do All Things", verse: "Philippians 4:13", text: "I can do all things through Christ." },
  { day: "Saturday", title: "Renewed Strength", verse: "Isaiah 40:31", text: "They who wait for the Lord shall renew their strength." },
  { day: "Sunday", title: "I Am With You", verse: "Matthew 28:20", text: "I am with you always." }
];

const bibleGroups = [
  { id: 1, name: "Wednesday Bible Study", time: "Wednesdays 6:00 PM", location: "Main Hall" },
  { id: 2, name: "Men's Fellowship", time: "Saturdays 7:00 AM", location: "Fellowship Hall" },
  { id: 3, name: "Women's Ministry", time: "Saturdays 9:00 AM", location: "Annex Building" },
  { id: 4, name: "Youth Fellowship", time: "Fridays 6:00 PM", location: "Youth Center" }
];

// GET /api/bible/chapter
router.get('/chapter', async (req, res) => {
  const { book, chapter, version = "kjv" } = req.query;
  if (!book || !chapter) {
    return res.status(400).json({ error: "Book and chapter are required" });
  }
  const bookSlug = bookSlugMap[book];
  if (!bookSlug) {
    return res.status(404).json({ error: "Book not found" });
  }
  try {
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(bookSlug + ' ' + chapter)}?translation=${version}`);
    if (!response.ok) throw new Error("Chapter not found");
    res.json(await response.json());
  } catch (error) {
    console.error("Bible API error:", error);
    res.status(500).json({ error: 'Failed to load chapter' });
  }
});

// GET /api/bible/books
router.get('/books', (req, res) => {
  const books = [
    { name: "Genesis", chapters: 50 }, { name: "Exodus", chapters: 40 }, { name: "Leviticus", chapters: 27 },
    { name: "Numbers", chapters: 36 }, { name: "Deuteronomy", chapters: 34 }, { name: "Joshua", chapters: 24 },
    { name: "Judges", chapters: 21 }, { name: "Ruth", chapters: 4 },
    { name: "1 Samuel", chapters: 31 }, { name: "2 Samuel", chapters: 24 }, { name: "1 Kings", chapters: 22 }, { name: "2 Kings", chapters: 25 },
    { name: "1 Chronicles", chapters: 29 }, { name: "2 Chronicles", chapters: 36 }, { name: "Ezra", chapters: 10 }, { name: "Nehemiah", chapters: 13 },
    { name: "Esther", chapters: 10 }, { name: "Job", chapters: 42 }, { name: "Psalms", chapters: 150 }, { name: "Proverbs", chapters: 31 },
    { name: "Ecclesiastes", chapters: 12 }, { name: "Song of Solomon", chapters: 8 }, { name: "Isaiah", chapters: 66 }, { name: "Jeremiah", chapters: 52 },
    { name: "Lamentations", chapters: 5 }, { name: "Ezekiel", chapters: 48 }, { name: "Daniel", chapters: 12 }, { name: "Hosea", chapters: 14 },
    { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 }, { name: "Obadiah", chapters: 1 }, { name: "Jonah", chapters: 4 },
    { name: "Micah", chapters: 7 }, { name: "Nahum", chapters: 3 }, { name: "Habakkuk", chapters: 3 }, { name: "Zephaniah", chapters: 3 },
    { name: "Haggai", chapters: 2 }, { name: "Zechariah", chapters: 14 }, { name: "Malachi", chapters: 4 },
    { name: "Matthew", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 }, { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 },
    { name: "Romans", chapters: 16 }, { name: "1 Corinthians", chapters: 16 }, { name: "2 Corinthians", chapters: 13 }, { name: "Galatians", chapters: 6 },
    { name: "Ephesians", chapters: 6 }, { name: "Philippians", chapters: 4 }, { name: "Colossians", chapters: 4 }, { name: "1 Thessalonians", chapters: 5 },
    { name: "2 Thessalonians", chapters: 3 }, { name: "1 Timothy", chapters: 6 }, { name: "2 Timothy", chapters: 4 }, { name: "Titus", chapters: 3 },
    { name: "Philemon", chapters: 1 }, { name: "Hebrews", chapters: 13 }, { name: "James", chapters: 5 }, { name: "1 Peter", chapters: 5 },
    { name: "2 Peter", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 }, { name: "3 John", chapters: 1 },
    { name: "Jude", chapters: 1 }, { name: "Revelation", chapters: 22 }
  ];
  res.json(books);
});

// GET /api/bible/daily
router.get('/daily', (req, res) => {
  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const devotional = dailyDevotionals.find(d => d.day === dayOfWeek) || dailyDevotionals[0];
  res.json(devotional);
});

// GET /api/bible/devotionals
router.get('/devotionals', (req, res) => {
  res.json(dailyDevotionals);
});

// GET /api/bible/groups
router.get('/groups', (req, res) => {
  res.json(bibleGroups);
});

export default router;
