"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const router = useRouter();
  
  // Typewriter effect state
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const targetText = "lexio.";
  
  useEffect(() => {
    const typewriterInterval = setInterval(() => {
      if (!isDeleting && currentIndex < targetText.length) {
        // Typing mode
        setDisplayText(targetText.substring(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      } else if (!isDeleting && currentIndex === targetText.length) {
        // Pause before deleting
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && currentIndex > 0) {
        // Deleting mode
        setDisplayText(targetText.substring(0, currentIndex - 1));
        setCurrentIndex(currentIndex - 1);
      } else if (isDeleting && currentIndex === 0) {
        // Pause before typing again
        setIsDeleting(false);
        setTimeout(() => {}, 1000);
      }
    }, isDeleting ? 100 : 150); // Faster when deleting, slower when typing

    return () => clearInterval(typewriterInterval);
  }, [currentIndex, isDeleting, targetText]);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Main content */}
      <div className="min-h-screen flex flex-col">
        {/* Hero section */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-[700px] mx-auto text-center space-y-12">
            {/* Main heading */}
            <h1 className="text-6xl sm:text-7xl font-medium tracking-tight">
              {displayText}
              <span className="animate-pulse">|</span>
            </h1>

            {/* Content paragraphs */}
            <div className="space-y-6 text-lg leading-relaxed">
              <p className="text-gray-600">
                transform any webpage into natural, flowing speech with intelligent text extraction and high-quality voice synthesis — 
                <a 
                  href="/app" 
                  className="text-black hover:underline transition-all duration-200"
                >
                  try now
                </a>
              </p>
              
              <p className="text-gray-600">
                perfect for consuming long-form content, research papers, or articles while multitasking or on the go — 
                <a 
                  href="/about" 
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/about");
                  }}
                  className="text-black hover:underline transition-all duration-200"
                >
                  learn more
                </a>
              </p>
              
              <p className="text-gray-600">
                built with privacy in mind, processing content temporarily without permanent storage or tracking — 
                <a 
                  href="/privacy"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/privacy");
                  }}
                  className="text-black hover:underline transition-all duration-200"
                >
                  see details
                </a>
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-white border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              lexio © 2025
            </div>
            
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/pranav2x"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
              
              <a
                href="https://www.linkedin.com/in/pranav-rapelli-0161312a4/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>

              <a
                href="mailto:rapellipranav1@gmail.com"
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
