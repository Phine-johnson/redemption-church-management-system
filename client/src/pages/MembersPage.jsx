import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchDailyDevotional, fetchDevotionals, fetchBibleGroups, fetchBibleBooks, fetchBibleChapter } from "../services/api";

export default function MembersPage({ bootstrap, session }) {
  const data = bootstrap.data;
  const today = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const [bibleData, setBibleData] = useState({
    dailyVerse: null,
    devotionals: [],
    groups: [],
    books: []
  });
  const [loadingBible, setLoadingBible] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapterData, setChapterData] = useState(null);
  const [showBible, setShowBible] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadBibleData = async () => {
      try {
        const [daily, devs, groups, books] = await Promise.all([
          fetchDailyDevotional(),
          fetchDevotionals(),
          fetchBibleGroups(),
          fetchBibleBooks()
        ]);
        setBibleData({ dailyVerse: daily, devotionals: devs, groups: groups, books: books });
      } catch (err) {
        console.error("Failed to load Bible data:", err);
      }
    };
    loadBibleData();
  }, []);

  useEffect(() => {
    if (!selectedBook || !selectedChapter) {
      setChapterData(null);
      return;
    }
    const loadChapter = async () => {
      setLoadingBible(true);
      try {
        const data = await fetchBibleChapter(selectedBook.name, selectedChapter, "kjv");
        setChapterData(data);
      } catch (err) {
        console.error("Failed to load chapter:", err);
      }
      setLoadingBible(false);
    };
    loadChapter();
  }, [selectedBook, selectedChapter]);

  if (!data) {
    return null;
  }

  const isAdminView = session && ['Super Admin', 'Clerk'].includes(session.role);

  return (
    <div className="page-content">
      {isAdminView ? (
        <>
          <section className="page-section-header">
            <div>
              <span className="section-kicker">People</span>
              <h2>Member Directory</h2>
            </div>
            <button className="primary-button" type="button">
              Add Member
            </button>
          </section>

          <section className="members-summary">
            {data.members.summary.map((item) => (
              <article key={item.label} className="mini-stat">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </section>

          <article className="panel-card">
            <div className="panel-header">
              <h3>Active Members</h3>
              <span>Households, ministries, and attendance patterns</span>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Ministry</th>
                    <th>Status</th>
                    <th>Last Seen</th>
                    <th>Household</th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.records.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.name}</strong>
                        <span>{member.email}</span>
                      </td>
                      <td>{member.ministry}</td>
                      <td>
                        <span className={`status-pill status-${member.status.toLowerCase()}`}>
                          {member.status}
                        </span>
                      </td>
                      <td>{member.lastSeen}</td>
                      <td>{member.household}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : (
        <>
          <section className="church-hero">
            <div className="church-hero-content">
              <div className="church-hero-date">{today}</div>
              <h1>Redemption Presby Congregation</h1>
              <p className="church-hero-tagline">New Gbawe District Church Management System</p>
              <div className="church-hero-buttons">
                <button className="primary-button">Join Us This Sunday</button>
              </div>
            </div>
            <div className="church-hero-logo">
              <div className="presby-logo-large">
                <span className="shield-large shield-blue"></span>
                <span className="shield-large shield-red"></span>
                <span className="cross-large"></span>
              </div>
            </div>
          </section>

          <section className="church-grid">
            <article className="church-card">
              <div className="church-card-header">
                <span className="church-card-icon">📅</span>
                <div>
                  <h3>Upcoming Events</h3>
                  <span className="church-card-date">{today}</span>
                </div>
              </div>
              <ul className="church-event-list">
                {data.events.upcoming.map((event) => (
                  <li key={event.id} className="church-event-item">
                    <div className="church-event-date">
                      <span className="church-event-day">{event.day}</span>
                      <span className="church-event-month">{event.month}</span>
                    </div>
                    <div className="church-event-details">
                      <strong>{event.title}</strong>
                      <span>{event.time} - {event.location}</span>
                      <span className="church-event-team">{event.team}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="church-card">
              <div className="church-card-header">
                <span className="church-card-icon">📖</span>
                <div>
                  <h3>The Holy Bible</h3>
                  <span className="church-card-date">Read God's Word</span>
                </div>
              </div>
              {bibleData.dailyVerse && !showBible && (
                <div className="bible-verse-mini">
                  <div className="bible-verse-ref">{bibleData.dailyVerse.verse}</div>
                  <div className="bible-verse-text">"{bibleData.dailyVerse.text}"</div>
                </div>
              )}
              <button className="primary-button" onClick={() => setShowBible(!showBible)}>
                {showBible ? "Close Bible" : "📖 Read The Bible"}
              </button>
              {showBible && (
                <div className="bible-full-reader">
                  <div className="bible-selectors">
                    <select 
                      value={selectedBook?.name || ""} 
                      onChange={(e) => {
                        const book = bibleData.books.find(b => b.name === e.target.value);
                        setSelectedBook(book);
                        setSelectedChapter(1);
                        setChapterData(null);
                      }}
                    >
                      <option value="">Select Book</option>
                      {bibleData.books.filter(b => !bookSearch || b.name.toLowerCase().includes(bookSearch.toLowerCase())).map(b => (
                        <option key={b.name} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Search book..." 
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                    />
                  </div>
                  {selectedBook && (
                    <div className="bible-selectors">
                      <select 
                        value={selectedChapter || ""} 
                        onChange={(e) => setSelectedChapter(parseInt(e.target.value))}
                      >
                        <option value="">Select Chapter</option>
                        {Array.from({length: selectedBook.chapters}, (_, i) => i + 1).map(c => (
                          <option key={c} value={c}>Chapter {c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {loadingBible && <p className="bible-loading">Loading...</p>}
                  {chapterData && chapterData.verses && (
                    <div className="bible-text-display">
                      <div className="bible-chapter-title">{chapterData.book_name} Chapter {chapterData.chapter_nr}</div>
                      {chapterData.verses.map(v => (
                        <div key={v.verse_nr} className="bible-verse-full">
                          <span className="verse-num">{v.verse_nr}</span>
                          <span className="verse-text">{v.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>

            <article className="church-card">
              <div className="church-card-header">
                <span className="church-card-icon">🎙️</span>
                <div>
                  <h3>Sermon Archives</h3>
                  <span className="church-card-date">Recent Teachings</span>
                </div>
              </div>
              <ul className="church-event-list">
                <li className="church-event-item">
                  <div className="church-event-date">
                    <span className="church-event-day">20</span>
                    <span className="church-event-month">APR</span>
                  </div>
                  <div className="church-event-details">
                    <strong>Walking in Faith</strong>
                    <span>Sunday Service - Pastor John Doe</span>
                  </div>
                </li>
                <li className="church-event-item">
                  <div className="church-event-date">
                    <span className="church-event-day">16</span>
                    <span className="church-event-month">APR</span>
                  </div>
                  <div className="church-event-details">
                    <strong>Bible Study: Prayer</strong>
                    <span>Wednesday - Elder Jane Smith</span>
                  </div>
                </li>
                <li className="church-event-item">
                  <div className="church-event-date">
                    <span className="church-event-day">13</span>
                    <span className="church-event-month">APR</span>
                  </div>
                  <div className="church-event-details">
                    <strong>Easter Sunday</strong>
                    <span>Sunday Service - Rev. Mensah</span>
                  </div>
                </li>
              </ul>
            </article>

            <article className="church-card">
              <div className="church-card-header">
                <span className="church-card-icon">📣</span>
                <div>
                  <h3>Church News</h3>
                  <span className="church-card-date">{today}</span>
                </div>
              </div>
              <ul className="church-news-list">
                {data.dashboard.activities.map((activity) => (
                  <li key={activity.id}>
                    <span className="church-news-category">{activity.category}</span>
                    <strong>{activity.title}</strong>
                    <span>{activity.description}</span>
                    <span className="church-news-time">{activity.time}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="church-card">
              <div className="church-card-header">
                <span className="church-card-icon">📞</span>
                <div>
                  <h3>Contact Information</h3>
                  <span className="church-card-date">Church Leaders</span>
                </div>
              </div>
              <ul className="church-contact-list">
                <li>
                  <div className="church-contact-role">Senior Pastor</div>
                  <div className="church-contact-name">Rev. John Doe</div>
                  <div className="church-contact-info">pastor@redemptionpresby.org</div>
                </li>
                <li>
                  <div className="church-contact-role">Elder</div>
                  <div className="church-contact-name">Elder Jane Smith</div>
                  <div className="church-contact-info">elder@redemptionpresby.org</div>
                </li>
                <li>
                  <div className="church-contact-role">Church Office</div>
                  <div className="church-contact-name">Administrator</div>
                  <div className="church-contact-info">+233 123 456 789</div>
                </li>
              </ul>
            </article>

            <article className="church-card church-card-wide">
              <div className="church-card-header">
                <span className="church-card-icon">⛪</span>
                <div>
                  <h3>Next Sunday Service</h3>
                  <span className="church-card-date">{today}</span>
                </div>
              </div>
              <div className="church-service-card">
                <div className="church-service-time">
                  <span className="church-service-day-name">Sunday</span>
                  <span className="church-service-hour">9:00 AM</span>
                </div>
                <div className="church-service-info">
                  <h4>{data.dashboard.summary.nextService.title}</h4>
                  <p>{data.dashboard.summary.nextService.note}</p>
                  <div className="church-service-actions">
                    <button className="primary-button">Save My Seat</button>
                  </div>
                </div>
              </div>
            </article>

            <article className="church-card church-card-wide">
              <div className="church-card-header">
                <span className="church-card-icon">🙏</span>
                <div>
                  <h3>Prayer Requests</h3>
                  <span className="church-card-date">{today}</span>
                </div>
              </div>
              <div className="church-prayer-form">
                <p>We believe in the power of prayer. Submit your prayer requests and our pastoral team will pray with you.</p>
                <div className="church-prayer-inputs">
                  <input type="text" placeholder="Your name (optional)" />
                  <input type="text" placeholder="Prayer request..." />
                  <button className="primary-button">Submit Prayer</button>
                </div>
              </div>
            </article>
          </section>

          <footer className="church-footer">
            <p>© 2026 Redemption Presby Congregation, New Gbawe District</p>
            <p>All rights reserved</p>
          </footer>
        </>
      )}
    </div>
  );
}