import cors from "cors";
import express from "express";
import { db, initializeDatabase } from "./database/init.js";

const app = express();
const port = process.env.PORT || 4001;

// Initialize database
initializeDatabase();

app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());

const dashboardData = {
  summary: {
    nextService: {
      title: "Sunday Celebration Service",
      time: "Sunday, 9:00 AM",
      note: "Worship team and ushers confirmed. Children check-in opens at 8:30 AM."
    }
  },
  metrics: [
    { label: "Attendance This Week", value: "842", change: "+6.2% from last Sunday" },
    { label: "First-Time Guests", value: "24", change: "9 follow-up calls pending" },
    { label: "Volunteers Scheduled", value: "67", change: "5 ministry teams covered" },
    { label: "Giving This Month", value: "$48,240", change: "+12.4% from last month" }
  ],
  activities: [
    {
      id: 1,
      category: "Care",
      title: "Hospital visitation updated",
      description: "Pastoral team assigned follow-up for the Mensah household.",
      time: "15 mins ago"
    },
    {
      id: 2,
      category: "Events",
      title: "Youth retreat registration reached capacity",
      description: "54 students confirmed and waitlist has been opened.",
      time: "1 hour ago"
    },
    {
      id: 3,
      category: "Finance",
      title: "Offering reconciliation completed",
      description: "Sunday service cash count matched the giving report.",
      time: "2 hours ago"
    }
  ],
  careQueue: [
    { name: "Deborah Owusu", reason: "Bereavement support request", priority: "High" },
    { name: "Michael Johnson", reason: "Missed 3 weeks, leader follow-up needed", priority: "Medium" },
    { name: "Ama Boateng", reason: "Prayer and counseling appointment", priority: "High" }
  ]
};

// Function to fetch members from the database
const getMembersFromDb = () => {
  const rows = db.prepare('SELECT * FROM members').all();
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    ministry: row.ministry,
    status: row.status,
    lastSeen: row.lastSeen,
    household: row.household
  }));
};

// Hardcoded summary for now (can be replaced with database queries later)
const membersSummary = [
  { label: "Total Members", value: "1,284" },
  { label: "Active Households", value: "416" },
  { label: "Serving Volunteers", value: "219" },
  { label: "New Members This Quarter", value: "37" }
];

const eventsData = {
  upcoming: [
    {
      id: 1,
      day: "27",
      month: "APR",
      title: "Leaders Prayer Gathering",
      description: "Monthly prayer meeting for pastors, coordinators, and team leads.",
      time: "6:00 PM",
      location: "Upper Chapel",
      team: "Leadership"
    },
    {
      id: 2,
      day: "01",
      month: "MAY",
      title: "Community Food Drive",
      description: "Serve neighborhood families through food distribution and prayer support.",
      time: "10:00 AM",
      location: "Outreach Center",
      team: "Missions"
    },
    {
      id: 3,
      day: "05",
      month: "MAY",
      title: "New Members Orientation",
      description: "Introduce church culture, ministries, and next steps for incoming members.",
      time: "1:30 PM",
      location: "Welcome Hall",
      team: "Connections"
    }
  ],
  volunteerCoverage: [
    { event: "Sunday Celebration", team: "Worship and Production", coverage: 92 },
    { event: "Youth Retreat", team: "Youth Ministry", coverage: 76 },
    { event: "Food Drive", team: "Outreach Volunteers", coverage: 64 }
  ]
};

const financeData = {
  summary: [
    { label: "General Fund", value: "$31,480", note: "Healthy weekly trend" },
    { label: "Missions Fund", value: "$8,650", note: "Driven by special offering" },
    { label: "Benevolence", value: "$4,210", note: "3 active family support cases" }
  ],
  funds: [
    {
      name: "General Offering",
      description: "Used for staffing, operations, and ministry care.",
      amount: "$31,480"
    },
    {
      name: "Building Project",
      description: "Designated contributions for expansion and repairs.",
      amount: "$18,930"
    },
    {
      name: "Missions Support",
      description: "Partner missionaries and outreach efforts.",
      amount: "$8,650"
    }
  ],
  transactions: [
    { id: 1, title: "Online giving batch", date: "Apr 21, 2026", amount: "+$5,420", type: "Income" },
    { id: 2, title: "Community care disbursement", date: "Apr 20, 2026", amount: "-$650", type: "Expense" },
    { id: 3, title: "Sound equipment maintenance", date: "Apr 19, 2026", amount: "-$1,200", type: "Expense" },
    { id: 4, title: "Missions pledge transfer", date: "Apr 18, 2026", amount: "+$2,100", type: "Income" }
  ]
};

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "church-cms-server"
  });
});

const users = [
  { email: "admin@redemptionpresby.org", password: "password123", name: "Administrator", role: "Super Admin" },
  { email: "audiovisual@redemptionpresby.org", password: "password123", name: "Media Team Lead", role: "AudioVisual" },
  { email: "accountant@redemptionpresby.org", password: "password123", name: "Finance Officer", role: "Accountant" },
  { email: "clerk@redemptionpresby.org", password: "password123", name: "Church Clerk", role: "Clerk" },
  { email: "member@redemptionpresby.org", password: "password123", name: "Church Member", role: "Member" }
];

app.post("/api/auth/login", (request, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({
      message: "Email and password are required."
    });
  }

  const user = users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return response.status(401).json({
      message: "Invalid email or password."
    });
  }

  return response.json({
    message: "Login successful.",
    user: {
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

app.get("/api/bootstrap", (_request, response) => {
  const records = getMembersFromDb();
  response.json({
    dashboard: dashboardData,
    members: {
      summary: membersSummary,
      records
    },
    events: eventsData,
    finance: financeData
  });
});

app.get("/api/dashboard", (_request, response) => {
  response.json(dashboardData);
});

app.get("/api/members", (_request, response) => {
  const records = getMembersFromDb();
  response.json({
    summary: membersSummary,
    records
  });
});

app.get("/api/events", (_request, response) => {
  response.json(eventsData);
});

app.get("/api/finance", (_request, response) => {
  response.json(financeData);
});

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
  { day: "Monday", title: "The Good Shepherd", verse: "Psalm 23:1", text: "The Lord is my shepherd; I shall not want. When we recognize Jesus as our Shepherd, we lack nothing because He provides all our needs." },
  { day: "Tuesday", title: "Trust Without Understanding", verse: "Proverbs 3:5", text: "Trust in the Lord with all your heart. True faith means surrendering our need to control everything." },
  { day: "Wednesday", title: "All Things Work Together", verse: "Romans 8:28", text: "All things work together for good. Even our trials are transformed into blessings when we love God." },
  { day: "Thursday", title: "God So Loved", verse: "John 3:16", text: "For God so loved the world that He gave His only Son. His love is so vast!" },
  { day: "Friday", title: "I Can Do All Things", verse: "Philippians 4:13", text: "I can do all things through Christ. His strength in us is greater than any challenge." },
  { day: "Saturday", title: "Renewed Strength", verse: "Isaiah 40:31", text: "They who wait for the Lord shall renew their strength. When we wait on Him, He renews us." },
  { day: "Sunday", title: "I Am With You", verse: "Matthew 28:20", text: "I am with you always. Jesus promises His presence every single day." }
];

const bibleGroups = [
  { id: 1, name: "Wednesday Bible Study", time: "Wednesdays 6:00 PM", location: "Main Hall" },
  { id: 2, name: "Men's Fellowship", time: "Saturdays 7:00 AM", location: "Fellowship Hall" },
  { id: 3, name: "Women's Ministry", time: "Saturdays 9:00 AM", location: "Annex Building" },
  { id: 4, name: "Youth Fellowship", time: "Fridays 6:00 PM", location: "Youth Center" }
];

app.get("/api/bible/chapter", async (request, response) => {
  const { book, chapter, version = "kjv" } = request.query;
  
  if (!book || !chapter) {
    return response.status(400).json({ error: "Book and chapter are required" });
  }
  
  const bookSlug = bookSlugMap[book];
  if (!bookSlug) {
    return response.status(404).json({ error: "Book not found" });
  }
  
  try {
    const apiUrl = `https://bible-api.com/${bookSlug}%20${chapter}?translation=${version}`;
    console.log("Fetching Bible from:", apiUrl);
    const res = await fetch(apiUrl);
    if (!res.ok) {
      throw new Error("Chapter not found");
    }
    const data = await res.json();
    response.json(data);
  } catch (error) {
    console.error("Bible API error:", error);
    response.status(500).json({ error: "Failed to load chapter from Bible server" });
  }
});

app.get("/api/bible/books", (_request, response) => {
  const books = [
    { name: "Genesis", chapters: 50, abbr: "Gen" }, { name: "Exodus", chapters: 40, abbr: "Exod" },
    { name: "Leviticus", chapters: 27, abbr: "Lev" }, { name: "Numbers", chapters: 36, abbr: "Num" },
    { name: "Deuteronomy", chapters: 34, abbr: "Deut" }, { name: "Joshua", chapters: 24, abbr: "Josh" },
    { name: "Judges", chapters: 21, abbr: "Judg" }, { name: "Ruth", chapters: 4, abbr: "Ruth" },
    { name: "1 Samuel", chapters: 31, abbr: "1Sam" }, { name: "2 Samuel", chapters: 24, abbr: "2Sam" },
    { name: "1 Kings", chapters: 22, abbr: "1Kgs" }, { name: "2 Kings", chapters: 25, abbr: "2Kgs" },
    { name: "1 Chronicles", chapters: 29, abbr: "1Chr" }, { name: "2 Chronicles", chapters: 36, abbr: "2Chr" },
    { name: "Ezra", chapters: 10, abbr: "Ezra" }, { name: "Nehemiah", chapters: 13, abbr: "Neh" },
    { name: "Esther", chapters: 10, abbr: "Esth" }, { name: "Job", chapters: 42, abbr: "Job" },
    { name: "Psalms", chapters: 150, abbr: "Ps" }, { name: "Proverbs", chapters: 31, abbr: "Prov" },
    { name: "Ecclesiastes", chapters: 12, abbr: "Eccl" }, { name: "Song of Solomon", chapters: 8, abbr: "Song" },
    { name: "Isaiah", chapters: 66, abbr: "Isa" }, { name: "Jeremiah", chapters: 52, abbr: "Jer" },
    { name: "Lamentations", chapters: 5, abbr: "Lam" }, { name: "Ezekiel", chapters: 48, abbr: "Ezek" },
    { name: "Daniel", chapters: 12, abbr: "Dan" }, { name: "Hosea", chapters: 14, abbr: "Hos" },
    { name: "Joel", chapters: 3, abbr: "Joel" }, { name: "Amos", chapters: 9, abbr: "Amos" },
    { name: "Obadiah", chapters: 1, abbr: "Obad" }, { name: "Jonah", chapters: 4, abbr: "Jonah" },
    { name: "Micah", chapters: 7, abbr: "Mic" }, { name: "Nahum", chapters: 3, abbr: "Nah" },
    { name: "Habakkuk", chapters: 3, abbr: "Hab" }, { name: "Zephaniah", chapters: 3, abbr: "Zeph" },
    { name: "Haggai", chapters: 2, abbr: "Hag" }, { name: "Zechariah", chapters: 14, abbr: "Zech" },
    { name: "Malachi", chapters: 4, abbr: "Mal" }, { name: "Matthew", chapters: 28, abbr: "Matt" },
    { name: "Mark", chapters: 16, abbr: "Mark" }, { name: "Luke", chapters: 24, abbr: "Luke" },
    { name: "John", chapters: 21, abbr: "John" }, { name: "Acts", chapters: 28, abbr: "Acts" },
    { name: "Romans", chapters: 16, abbr: "Rom" }, { name: "1 Corinthians", chapters: 16, abbr: "1Cor" },
    { name: "2 Corinthians", chapters: 13, abbr: "2Cor" }, { name: "Galatians", chapters: 6, abbr: "Gal" },
    { name: "Ephesians", chapters: 6, abbr: "Eph" }, { name: "Philippians", chapters: 4, abbr: "Phil" },
    { name: "Colossians", chapters: 4, abbr: "Col" }, { name: "1 Thessalonians", chapters: 5, abbr: "1Thess" },
    { name: "2 Thessalonians", chapters: 3, abbr: "2Thess" }, { name: "1 Timothy", chapters: 6, abbr: "1Tim" },
    { name: "2 Timothy", chapters: 4, abbr: "2Tim" }, { name: "Titus", chapters: 3, abbr: "Titus" },
    { name: "Philemon", chapters: 1, abbr: "Phlm" }, { name: "Hebrews", chapters: 13, abbr: "Heb" },
    { name: "James", chapters: 5, abbr: "Jas" }, { name: "1 Peter", chapters: 5, abbr: "1Pet" },
    { name: "2 Peter", chapters: 3, abbr: "2Pet" }, { name: "1 John", chapters: 5, abbr: "1John" },
    { name: "2 John", chapters: 1, abbr: "2John" }, { name: "3 John", chapters: 1, abbr: "3John" },
    { name: "Jude", chapters: 1, abbr: "Jude" }, { name: "Revelation", chapters: 22, abbr: "Rev" }
  ];
  response.json(books);
});

app.get("/api/bible/daily", (_request, response) => {
  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const devotional = dailyDevotionals.find(d => d.day === dayOfWeek) || dailyDevotionals[0];
  response.json(devotional);
});

app.get("/api/bible/devotionals", (_request, response) => {
  response.json(dailyDevotionals);
});

app.get("/api/bible/groups", (_request, response) => {
  response.json(bibleGroups);
});

app.listen(port, () => {
  console.log(`Church CMS server running on port ${port}`);
});
