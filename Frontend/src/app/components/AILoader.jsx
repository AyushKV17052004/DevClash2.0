import { useState, useEffect } from "react";
import { BookOpen, Sparkles } from "lucide-react";

const LOADING_MESSAGES = [
  "Iron Man is calibrating thrusters and compiling your notes...",
  "Spider-Man is web-slinging your equations together...",
  "Batman is analyzing clues in the Batcave...",
  "Hulk is smashing complex problems into bite-sized pieces...",
  "Captain America is assembling your custom study guide...",
  "Thor is powering up the AI servers with Mjolnir...",
  "Doctor Strange is searching 14,000,605 futures for the best answers...",
  "Black Panther is researching in the Wakandan archives...",
  "The Flash is running around the web at super-speed to fetch explanations...",
  "Superman is using X-ray vision to scan the textbook database..."
];

export function AILoader() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger fade out
      setFade(false);
      setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 300); // match transition timing
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center p-8 my-6 text-center transition-all duration-300"
      style={{
        border: "2px dashed var(--border-hard)",
        borderRadius: "4px",
        background: "var(--card)",
      }}
    >
      <div className="relative mb-4">
        {/* Pulsing Outer Circle */}
        <div className="absolute inset-0 rounded-full bg-[#C0392B]/10 animate-ping" />
        
        {/* Main Icon Container */}
        <div
          className="relative flex items-center justify-center w-16 h-16 rounded-full text-white"
          style={{
            background: "#1B2540",
            border: "2px solid var(--border-hard)",
          }}
        >
          <BookOpen className="w-8 h-8 animate-pulse text-[#F4D03F]" />
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-[#C0392B] animate-bounce" />
        </div>
      </div>

      <div className="max-w-md">
        <h3
          className="text-sm font-black text-foreground uppercase tracking-widest mb-1.5"
          style={{ fontFamily: "'Merriweather', Georgia, serif" }}
        >
          AI Tutor is thinking
        </h3>
        
        <p
          className={`text-sm text-muted-foreground font-medium transition-opacity duration-300 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
          style={{ minHeight: "20px" }}
        >
          {LOADING_MESSAGES[index]}
        </p>
      </div>

      {/* Tiny progress dots */}
      <div className="flex gap-1.5 mt-4">
        {LOADING_MESSAGES.map((_, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              background: i === index ? "#C0392B" : "var(--border-hard)",
              transform: i === index ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
