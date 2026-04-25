import { useState, useEffect } from "react";
import { fetchBibleChapter, fetchBibleBooks, fetchDailyDevotional, fetchDevotionals, fetchBibleGroups, fetchJson } from "../services/api";

const bibleVersions = [
  { code: "kjv", name: "King James Version" },
  { code: "web", name: "World English Bible" },
  { code: "bbe", name: "Basic English Bible" },
  { code: "webbe", name: "World English Bible (BE)" }
];

export default function BiblePage({ bootstrap }) {
  const [selectedVersion, setSelectedVersion] = useState("kjv");
  const [searchTerm, setSearchTerm] = useState("");
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  const [dailyDevotional, setDailyDevotional] = useState(null);
  const [devotionals, setDevotionals] = useState([]);
  const [bibleGroups, setBibleGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const dayOfWeek = new Date().toLocaleDateString('en-GB', { weekday: 'long' });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [booksData, devotionalData, devotionalsData, groupsData] = await Promise.all([
          fetchBibleBooks(),
          fetchDailyDevotional(),
          fetchDevotionals(),
          fetchBibleGroups()
        ]);
        setBooks(booksData);
        setDailyDevotional(devotionalData);
        setDevotionals(devotionalsData);
        setBibleGroups(groupsData);
      } catch (err) {
        console.error("Failed to load Bible data:", err);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedBook || !selectedChapter) {
      setChapterData(null);
      return;
    }
    
    const loadChapter = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchBibleChapter(selectedBook.name, selectedChapter, selectedVersion);
        setChapterData(data);
      } catch (err) {
        setError("Could not load chapter. Please try again.");
      }
      setLoading(false);
    };
    
    loadChapter();
  }, [selectedBook, selectedChapter, selectedVersion]);

  const filteredBooks = searchTerm 
    ? books.filter(book => 
        book.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : books;

  return (
    <div className="page-content">
      <section className="page-section-header">
        <div>
          <span className="section-kicker"> Scripture</span>
          <h2>The Holy Bible - Read Online</h2>
        </div>
        <span className="church-hero-date">{today}</span>
      </section>

      <section className="bible-version-bar">
        <span className="bible-version-label">Bible Version:</span>
        <div className="bible-version-buttons">
          {bibleVersions.map((version) => (
            <button 
              key={version.code}
              className={`bible-version-btn ${selectedVersion === version.code ? 'is-active' : ''}`}
              onClick={() => {
                setSelectedVersion(version.code);
                setChapterData(null);
              }}
            >
              {version.name}
            </button>
          ))}
        </div>
      </section>

      {dailyDevotional && (
        <section className="bible-daily-section">
          <div className="bible-daily-card">
            <div className="bible-daily-label">Daily Devotional - {dailyDevotional.day}</div>
            <div className="bible-daily-title">{dailyDevotional.title}</div>
            <div className="bible-daily-reference">{dailyDevotional.verse}</div>
            <div className="bible-daily-text">"{dailyDevotional.text}"</div>
          </div>
          <div className="bible-weekly-verse">
            <div className="bible-weekly-label">Verse of the Week</div>
            <div className="bible-weekly-reference">Philippians 4:13</div>
            <div className="bible-weekly-text">"I can do all things through Christ who strengthens me."</div>
          </div>
        </section>
      )}

      <section className="bible-search-section">
        <h3>Read The Bible - Select Book & Chapter</h3>
        <p className="bible-reading-intro">Choose a book of the Bible and chapter to read the full text:</p>
        
        <div className="bible-search-box">
          <input 
            type="text" 
            placeholder="Search books (e.g., Psalms, Romans, John)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="bible-books-grid">
          {filteredBooks.map((book) => (
            <button 
              key={book.name} 
              className={`bible-book-card ${selectedBook?.name === book.name ? 'is-selected' : ''}`}
              onClick={() => {
                setSelectedBook(book);
                setSelectedChapter(1);
                setChapterData(null);
              }}
            >
              <span className="bible-book-name">{book.name}</span>
              <span className="bible-book-chapters">{book.chapters} chs</span>
            </button>
          ))}
        </div>
      </section>

      {selectedBook && (
        <section className="bible-chapter-section">
          <h3>{selectedBook.name}</h3>
          <div className="bible-chapter-nav">
            <span className="bible-chapter-label">Select Chapter:</span>
            <div className="bible-chapter-grid">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((chap) => (
                <button 
                  key={chap}
                  className={`bible-chapter-btn ${selectedChapter === chap ? 'is-active' : ''}`}
                  onClick={() => setSelectedChapter(chap)}
                >
                  {chap}
                </button>
              ))}
            </div>
          </div>
          
          {loading && (
            <div className="bible-loading">
              <div className="loading-spinner"></div>
              <p>Loading {selectedBook.name} Chapter {selectedChapter}...</p>
            </div>
          )}
          
          {error && (
            <div className="bible-error">
              <p>{error}</p>
            </div>
          )}
          
          {chapterData && !loading && (
            <div className="bible-chapter-content">
              <div className="bible-chapter-header">
                <h4>{chapterData.book_name} Chapter {chapterData.chapter_nr}</h4>
                <span className="bible-chapter-version">{bibleVersions.find(v => v.code === selectedVersion)?.name}</span>
              </div>
              <div className="bible-verses">
                {chapterData.verses?.map((verse) => (
                  <div key={verse.verse_nr} className="bible-verse">
                    <span className="bible-verse-nr">{verse.verse_nr}</span>
                    <span className="bible-verse-text">{verse.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(!chapterData && !loading) && (
            <div className="bible-select-prompt">
              <p>Select a chapter above to read the full Bible text.</p>
            </div>
          )}
        </section>
      )}

      <section className="bible-devotionals-section">
        <h3>This Week's Devotionals</h3>
        <div className="bible-devotionals-grid">
          {devotionals.map((dev) => (
            <div key={dev.day} className="bible-devotional-card">
              <div className="bible-devotional-day">{dev.day}</div>
              <div className="bible-devotional-title">{dev.title}</div>
              <div className="bible-devotional-verse">{dev.verse}</div>
              <div className="bible-devotional-text">"{dev.text}"</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bible-community-section">
        <h3>Bible Study Groups</h3>
        <div className="bible-group-cards">
          {bibleGroups.map((group) => (
            <div key={group.id} className="bible-group-card">
              <div className="bible-group-name">{group.name}</div>
              <div className="bible-group-time">{group.time}</div>
              <div className="bible-group-loc">{group.location}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}