/**
 * Style reminder — The Marginalia Room: contemporary editorial modernism with ink-black and warm-ivory rooms, Archive Cobalt wayfinding, catalogue metadata, asymmetric layouts, documentary imagery, and restrained motion. This page must make people, conversations, ideas, and archive paths feel more valuable than a simple episode feed.
 */
import { FormEvent, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Menu, Play, Search, X } from "lucide-react";

const assetPath = (fileName: string) => `${import.meta.env.BASE_URL}assets/${fileName}`;
const heroImage = assetPath("DrLawrence.jpg");
const conversationImage = assetPath("influential-minds-conversation.jpg");
const peopleImage = assetPath("influential-minds-people.jpg");
const archiveTexture = assetPath("influential-minds-archive-texture.jpg");
const mark = assetPath("influential-minds-mark.png");

const suggestedQuestions = [
  "What does it take to build through uncertainty?",
  "Who has talked about artificial intelligence?",
  "Where have guests discussed failure?",
  "What have guests said about leadership?",
  "Who discussed the future of energy?",
];

const results = [
  { guest: "Jennifer Sciubba", title: "The Future of Population and Power", excerpt: "Leadership during periods of uncertainty requires a wider view of the forces moving beneath the surface.", time: "01:14:32", topic: "Society & power" },
  { guest: "Steve Hamm", title: "Building Through Disruption", excerpt: "The strongest leaders do not wait for certainty; they create the conditions for people to move through disruption together.", time: "32:18", topic: "Leadership" },
  { guest: "Michael Spence", title: "Global Change and Opportunity", excerpt: "Periods of global change expose the assumptions that no longer serve us—and the opportunities hidden inside them.", time: "48:05", topic: "Global perspective" },
];

const topics = ["Leadership", "Innovation", "Personal growth", "AI & technology", "Energy", "Society", "Entrepreneurship", "Human experience"];

const latestEpisodes = [
  { title: "Influential Minds: A Conversation with Ann Christine Duhaime", guest: "Ann Christine Duhaime", videoId: "vPJhbI81jSw", duration: "1 hr", topic: "Human experience", note: "Latest / playlist 16", image: "https://i.ytimg.com/vi/vPJhbI81jSw/hqdefault.jpg", playlistUrl: "https://www.youtube.com/watch?v=vPJhbI81jSw&list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV&index=16" },
  { title: "Influential Minds: A Conversation with Jesper Brodin", guest: "Jesper Brodin", videoId: "S2nj2IKXE4Y", duration: "57 min", topic: "Leadership", note: "Playlist 12", image: "https://i.ytimg.com/vi/S2nj2IKXE4Y/hqdefault.jpg", playlistUrl: "https://www.youtube.com/watch?v=S2nj2IKXE4Y&list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV&index=12" },
  { title: "Influential Minds: A Conversation with Rana Foroohar", guest: "Rana Foroohar", videoId: "cughCiJVw1E", duration: "46 min", topic: "Business", note: "Playlist 01", image: "https://i.ytimg.com/vi/cughCiJVw1E/hqdefault.jpg", playlistUrl: "https://www.youtube.com/watch?v=cughCiJVw1E&list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV&index=1" },
];

const featuredEpisode = { title: "Influential Minds: A Conversation with Rana Foroohar", guest: "Rana Foroohar", videoId: "cughCiJVw1E", duration: "46 min", topic: "Business", image: "https://i.ytimg.com/vi/cughCiJVw1E/hqdefault.jpg", playlistUrl: "https://www.youtube.com/watch?v=cughCiJVw1E&list=PLaqXzRqTnPvCncnQM6zvC2vafHKg9a_bV&index=1" };

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) setSearched(true);
  };

  const submitNewsletter = (event: FormEvent) => {
    event.preventDefault();
    if (email.trim()) setJoined(true);
  };

  return (
    <div className="site-shell">
      <header className={`site-nav ${scrolled ? "site-nav--scrolled" : ""}`}>
        <button className="wordmark" aria-label="Influential Minds home" onClick={() => scrollToId("top")}>
          <img src={mark} alt="" className="wordmark-mark" />
          <span><strong>INFLUENTIAL</strong><strong>MINDS</strong></span>
        </button>
        <nav className="desktop-links" aria-label="Primary navigation">
          <button onClick={() => scrollToId("conversations")}>Conversations</button>
          <button onClick={() => scrollToId("people")}>People</button>
          <button onClick={() => scrollToId("ideas")}>Ideas</button>
          <button onClick={() => scrollToId("collections")}>Collections</button>
          <button onClick={() => scrollToId("about")}>About Lawrence</button>
        </nav>
        <div className="nav-actions">
          <button className="archive-trigger" onClick={() => scrollToId("ask")}>Ask the podcast AI<ArrowUpRight size={15} /></button>
          <button className="mobile-icon" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
        {menuOpen && <nav className="mobile-menu" aria-label="Mobile navigation">
          {[["conversations", "Conversations"], ["people", "People"], ["ideas", "Ideas"], ["collections", "Collections"], ["about", "About Lawrence"]].map(([id, label]) => <button key={id} onClick={() => { scrollToId(id); setMenuOpen(false); }}>{label}</button>)}
          <button onClick={() => { scrollToId("ask"); setMenuOpen(false); }}>Ask the podcast AI<ArrowUpRight size={15} /></button>
        </nav>}
      </header>

      <main id="top">
        <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(10, 12, 15, .92) 0%, rgba(10, 12, 15, .64) 42%, rgba(10, 12, 15, .08) 100%), url(${heroImage})` }}>
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="hero-brand"><span><strong></strong><br /><small></small></span></div>
              <p className="eyebrow">A conversation series with Dr. Lawrence E. Jones</p>
              <h1>Influential<br /><em>Minds</em></h1>
              <p className="hero-deck">Conversations with people who shape how we understand the world.</p>
              <p className="hero-body">A global forum for leading thinkers, innovators, practitioners and experts exploring business, leadership, technology, energy, society and the forces shaping our future.</p>
              <div className="hero-ctas"><button className="button button--cobalt" onClick={() => scrollToId("conversations")}>Watch the conversations <ArrowDownRight size={17} /></button><button className="text-link text-link--light" onClick={() => scrollToId("ask")}>Ask the podcast AI <ArrowUpRight size={16} /></button></div>
            </div>
            <div className="hero-index" aria-label="Current season metadata"><span></span><div><b></b><small>Global conversations<br />Ideas · People · Perspectives</small></div></div>
          </div>
          <div className="hero-caption">.</div>
        </section>

        <section className="feature-section section-paper" id="conversations">
          <div className="section-heading"><div><p className="section-kicker">01 / The Podcast</p><h2>The<br /><em>conversations</em></h2></div><p className="section-intro">A growing record of serious conversations—connected by the people in them and the ideas that stay useful long after the recording ends.</p></div>
          <article className="feature-story">
            <div className="feature-image-wrap"><a className="feature-video-link" href={featuredEpisode.playlistUrl} target="_blank" rel="noreferrer" aria-label={`Watch ${featuredEpisode.title} on YouTube`}><img src={featuredEpisode.image} alt={`YouTube thumbnail for ${featuredEpisode.title}`} className="feature-image" /><span className="play-button" aria-hidden="true"><Play size={21} fill="currentColor" /></span><span className="image-note">Featured conversation / YouTube playlist 01</span></a></div>
            <div className="feature-copy"><p className="editorial-label">Featured conversation / verified playlist entry</p><h3>A conversation<br /><em>with {featuredEpisode.guest}</em></h3><p className="guest-line">Hosted by Dr. Lawrence E. Jones<br />From the Influential Minds YouTube archive</p><p className="feature-description">{featuredEpisode.title}. Trace the conversation from the guest’s perspective into the wider archive of ideas, people and related moments.</p><div className="story-meta"><span>{featuredEpisode.topic}</span><span>{featuredEpisode.duration}</span><span>Playlist 01</span></div><a className="text-link" href={featuredEpisode.playlistUrl} target="_blank" rel="noreferrer">Watch more on YouTube <ArrowUpRight size={16} /></a></div>
          </article>
        </section>

        <section className="ask-section" id="ask" style={{ backgroundImage: `linear-gradient(rgba(20, 39, 76, .93), rgba(20, 39, 76, .93)), url(${archiveTexture})` }}>
          <div className="ask-layout"><div className="ask-lede"><p className="section-kicker section-kicker--blue">02 / Knowledge discovery</p><h2>Ask the<br /><em>Podcast AI</em></h2><p>Don’t just browse episodes. Search the ideas inside them.</p><span className="ask-note">See link to exact monment in episode.</span></div>
            <div className="ask-tool"><div className="ask-tool-head"><span className="archive-symbol">⌁</span><span>Influential Minds / AI search</span><span className="simulated"></span></div><form onSubmit={submitSearch}><label htmlFor="archive-query">Ask a question about the conversations &amp; our AI agent will find the exact thought for you</label><textarea id="archive-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What have guests said about leading through crisis?" rows={3} /><div className="ask-submit-row"><span>Question → Idea → Guest → Moment</span><button type="submit" className="button button--cobalt">Search <Search size={16} /></button></div></form><div className="suggestions"><span>Try asking</span>{suggestedQuestions.map((question) => <button key={question} onClick={() => { setQuery(question); setSearched(false); }}>{question}</button>)}</div>{searched && <div className="search-results" aria-live="polite"><div className="answer"><span className="result-label">Answer from the archive</span><p>Several Influential Minds conversations explore leadership under pressure, from navigating uncertainty to creating the conditions for people to move together.</p></div>{results.map((result, index) => <article className="result-row" key={result.guest}><span className="result-number">0{index + 1}</span><div className="result-main"><p className="result-label">{result.topic}</p><h4>{result.guest}</h4><p className="result-title">{result.title}</p><p className="result-excerpt">“{result.excerpt}”</p></div><div className="result-time"><span>{result.time}</span><button aria-label={`Watch moment from ${result.guest}`} onClick={() => alert("This deep link will connect to the exact YouTube timestamp in the live archive.")}>Watch this moment <ArrowUpRight size={14} /></button></div></article>)}</div>}</div>
          </div>
        </section>

        <section className="latest-section section-paper"><div className="section-heading section-heading--latest"><div><p className="section-kicker">03 / The shelf</p><h2>Latest<br /><em>conversations</em></h2></div><button className="text-link" onClick={() => alert("The full archive will open here.")}>Open the archive index <ArrowUpRight size={16} /></button></div><div className="episode-shelf">{latestEpisodes.map((episode, index) => <article className={`episode-card ${index === 0 ? "episode-card--lead" : ""}`} key={episode.videoId}><a className="episode-art episode-art--photo" href={episode.playlistUrl} target="_blank" rel="noreferrer" aria-label={`Watch ${episode.title} on YouTube`}><img src={episode.image} alt={`YouTube thumbnail for ${episode.title}`} /><span>IM<br />{String(index + 1).padStart(2, "0")}</span><small>{episode.note}<br />YouTube still</small><i><Play size={16} fill="currentColor" /></i></a><div className="episode-card-copy"><p className="editorial-label">{episode.note}</p><h3>A conversation<br /><em>with {episode.guest}</em></h3><p>{episode.title}. Follow the guest, then trace the ideas into the wider archive.</p><div className="story-meta"><span>{episode.topic}</span><span>{episode.duration}</span><span>Related moment →</span></div><a className="text-link" href={episode.playlistUrl} target="_blank" rel="noreferrer">Watch on YouTube <ArrowUpRight size={15} /></a></div></article>)}</div></section>

        <section className="ideas-section" id="ideas"><div className="ideas-inner"><div><p className="section-kicker">04 / Cross-cutting themes</p><h2>Explore by<br /><em>idea</em></h2><p className="ideas-copy">The podcast is bigger than its episode list. Follow a question across conversations, people and time.</p></div><div className="topic-list">{topics.map((topic, index) => <button key={topic} onClick={() => alert(`${topic} topic hub coming next in the archive.`)}><span>0{index + 1}</span>{topic}<ArrowUpRight size={17} /></button>)}</div></div></section>

        <section className="people-section section-paper" id="people"><div className="people-layout"><div className="people-image-wrap"><img src={peopleImage} alt="A contact sheet of unidentified conversation participants" /><span className="image-note image-note--dark">People make the archive</span></div><div className="people-copy"><p className="section-kicker">05 / The people</p><h2>Meet the<br /><em>voices</em></h2><p>Lawrence brings us into the room. The guests and ideas make us stay.</p><p className="body-muted">Browse the thinkers, leaders and practitioners whose experience gives the archive its range. Every person is a doorway into a set of conversations.</p><button className="text-link" onClick={() => alert("The People directory will open here.")}>Trace the people <ArrowUpRight size={16} /></button></div></div></section>

        <section className="about-section" id="about"><div className="about-layout"><div><p className="section-kicker section-kicker--blue">06 / Meet Dr. Lawrence Jones</p><h2>About<br /><em>the host</em></h2></div><div><p className="quote">“The best conversations do more than answer a question. They change the quality of the questions we ask next.”</p><p className="about-body">Dr. Lawrence E. Jones is the editorial guide of Influential Minds—a platform for deep conversations across the forces shaping business, society and human experience.</p><button className="text-link text-link--light" onClick={() => alert("The full host profile will open here.")}>Read the host profile <ArrowUpRight size={16} /></button></div></div></section>

        <section className="collections-section section-paper" id="collections"><div className="section-heading"><div><p className="section-kicker">07 / Curated pathways</p><h2>Follow a<br /><em>thread</em></h2></div><p className="section-intro">Start with a question, stay for the pattern. Editorial collections gather conversations around the challenges that keep returning.</p></div><div className="collection-grid"><button className="collection-card collection-card--dark"><span>Collection 01</span><strong>Mastering<br /><em>resilience</em></strong><small>5 conversations <ArrowUpRight size={14} /></small></button><button className="collection-card collection-card--blue"><span>Collection 02</span><strong>Building<br /><em>from zero</em></strong><small>8 conversations <ArrowUpRight size={14} /></small></button><button className="collection-card collection-card--paper"><span>Collection 03</span><strong>The future<br /><em>we inherit</em></strong><small>6 conversations <ArrowUpRight size={14} /></small></button></div></section>

        <section className="join-section"><div><p className="section-kicker section-kicker--blue">08 / Keep exploring</p><h2>Get Updated<br /><em>first</em></h2></div><div><p>A quiet line into new conversations, useful moments and the paths connecting them—sent occasionally, never noisily.</p>{joined ? <p className="joined-message">You’re on the list. The next conversation will find you there.</p> : <form className="newsletter-form" onSubmit={submitNewsletter}><label htmlFor="email">Your email address</label><div><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><button type="submit" className="button button--cobalt">Subscribe <ArrowUpRight size={15} /></button></div></form>}<small>By subscribing, you agree to receive Influential Minds updates. Unsubscribe anytime.</small></div></section>
      </main>

      <footer className="footer"><div className="footer-top"><button className="wordmark wordmark--footer" onClick={() => scrollToId("top")}><img src={mark} alt="" className="wordmark-mark" /><span><strong>INFLUENTIAL</strong><strong>MINDS</strong></span></button><p>A living index of people,<br />questions and moments.</p><button className="back-top" onClick={() => scrollToId("top")}>Back to top <ChevronDown size={15} /></button></div><div className="footer-bottom"><span>© 2026 Influential Minds Media</span><span>Ideas · People · Perspectives</span><span>Built for discovery</span></div></footer>
    </div>
  );
}
