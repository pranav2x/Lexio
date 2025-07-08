"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scrapeWebsite, isValidUrl } from "@/lib/firecrawl";
import { useLexioActions, useLexioState } from "@/lib/store";

// Developer mode hardcoded data
const DEVELOPER_MODE_DATA = {
  title: "Relentlessly Resourceful",
  url: "https://paulgraham.com/relres.html",
  text: `March 2009 A couple days ago I finally got being a good startup founder down to two words: relentlessly resourceful. Till then the best I'd managed was to get the opposite quality down to one: hapless. Most dictionaries say hapless means unlucky. But the dictionaries are not doing a very good job. A team that outplays its opponents but loses because of a bad decision by the referee could be called unlucky, but not hapless. Hapless implies passivity. To be hapless is to be battered by circumstances — to let the world have its way with you, instead of having your way with the world. [1] Unfortunately there's no antonym of hapless, which makes it difficult to tell founders what to aim for. "Don't be hapless" is not much of a rallying cry. It's not hard to express the quality we're looking for in metaphors. The best is probably a running back. A good running back is not merely determined, but flexible as well. They want to get downfield, but they adapt their plans on the fly. Unfortunately this is just a metaphor, and not a useful one to most people outside the US. "Be like a running back" is no better than "Don't be hapless." But finally I've figured out how to express this quality directly. I was writing a talk for investors, and I had to explain what to look for in founders. What would someone who was the opposite of hapless be like? They'd be relentlessly resourceful. Not merely relentless. That's not enough to make things go your way except in a few mostly uninteresting domains. In any interesting domain, the difficulties will be novel. Which means you can't simply plow through them, because you don't know initially how hard they are; you don't know whether you're about to plow through a block of foam or granite. So you have to be resourceful. You have to keep trying new things. Be relentlessly resourceful. That sounds right, but is it simply a description of how to be successful in general? I don't think so. This isn't the recipe for success in writing or painting, for example. In that kind of work the recipe is more to be actively curious. Resourceful implies the obstacles are external, which they generally are in startups. But in writing and painting they're mostly internal; the obstacle is your own obtuseness. [2] There probably are other fields where "relentlessly resourceful" is the recipe for success. But though other fields may share it, I think this is the best short description we'll find of what makes a good startup founder. I doubt it could be made more precise. Now that we know what we're looking for, that leads to other questions. For example, can this quality be taught? After four years of trying to teach it to people, I'd say that yes, surprisingly often it can. Not to everyone, but to many people. [3] Some people are just constitutionally passive, but others have a latent ability to be relentlessly resourceful that only needs to be brought out. This is particularly true of young people who have till now always been under the thumb of some kind of authority. Being relentlessly resourceful is definitely not the recipe for success in big companies, or in most schools. I don't even want to think what the recipe is in big companies, but it is certainly longer and messier, involving some combination of resourcefulness, obedience, and building alliances. Identifying this quality also brings us closer to answering a question people often wonder about: how many startups there could be. There is not, as some people seem to think, any economic upper bound on this number. There's no reason to believe there is any limit on the amount of newly created wealth consumers can absorb, any more than there is a limit on the number of theorems that can be proven. So probably the limiting factor on the number of startups is the pool of potential founders. Some people would make good founders, and others wouldn't. And now that we can say what makes a good founder, we know how to put an upper bound on the size of the pool. This test is also useful to individuals. If you want to know whether you're the right sort of person to start a startup, ask yourself whether you're relentlessly resourceful. And if you want to know whether to recruit someone as a cofounder, ask if they are. You can even use it tactically. If I were running a startup, this would be the phrase I'd tape to the mirror. "Make something people want" is the destination, but "Be relentlessly resourceful" is how you get there. Notes [1] I think the reason the dictionaries are wrong is that the meaning of the word has shifted. No one writing a dictionary from scratch today would say that hapless meant unlucky. But a couple hundred years ago they might have. People were more at the mercy of circumstances in the past, and as a result a lot of the words we use for good and bad outcomes have origins in words about luck. When I was living in Italy, I was once trying to tell someone that I hadn't had much success in doing something, but I couldn't think of the Italian word for success. I spent some time trying to describe the word I meant. Finally she said "Ah! Fortuna!" [2] There are aspects of startups where the recipe is to be actively curious. There can be times when what you're doing is almost pure discovery. Unfortunately these times are a small proportion of the whole. On the other hand, they are in research too. [3] I'd almost say to most people, but I realize (a) I have no idea what most people are like, and (b) I'm pathologically optimistic about people's ability to change. Thanks to Trevor Blackwell and Jessica Livingston for reading drafts of this.`,
  cleanText: `A couple days ago I finally got being a good startup founder down to two words: relentlessly resourceful. Till then the best I'd managed was to get the opposite quality down to one: hapless. Most dictionaries say hapless means unlucky. But the dictionaries are not doing a very good job. A team that outplays its opponents but loses because of a bad decision by the referee could be called unlucky, but not hapless. Hapless implies passivity. To be hapless is to be battered by circumstances, to let the world have its way with you, instead of having your way with the world. Unfortunately there's no antonym of hapless, which makes it difficult to tell founders what to aim for. Don't be hapless is not much of a rallying cry. It's not hard to express the quality we're looking for in metaphors. The best is probably a running back. A good running back is not merely determined, but flexible as well. They want to get downfield, but they adapt their plans on the fly. Unfortunately this is just a metaphor, and not a useful one to most people outside the US. Be like a running back is no better than Don't be hapless. But finally I've figured out how to express this quality directly. I was writing a talk for investors, and I had to explain what to look for in founders. What would someone who was the opposite of hapless be like? They'd be relentlessly resourceful. Not merely relentless. That's not enough to make things go your way except in a few mostly uninteresting domains. In any interesting domain, the difficulties will be novel. Which means you can't simply plow through them, because you don't know initially how hard they are. You don't know whether you're about to plow through a block of foam or granite. So you have to be resourceful. You have to keep trying new things. Be relentlessly resourceful. That sounds right, but is it simply a description of how to be successful in general? I don't think so. This isn't the recipe for success in writing or painting, for example. In that kind of work the recipe is more to be actively curious. Resourceful implies the obstacles are external, which they generally are in startups. But in writing and painting they're mostly internal. The obstacle is your own obtuseness. There probably are other fields where relentlessly resourceful is the recipe for success. But though other fields may share it, I think this is the best short description we'll find of what makes a good startup founder. I doubt it could be made more precise. Now that we know what we're looking for, that leads to other questions. For example, can this quality be taught? After four years of trying to teach it to people, I'd say that yes, surprisingly often it can. Not to everyone, but to many people. Some people are just constitutionally passive, but others have a latent ability to be relentlessly resourceful that only needs to be brought out. This is particularly true of young people who have till now always been under the thumb of some kind of authority. Being relentlessly resourceful is definitely not the recipe for success in big companies, or in most schools. I don't even want to think what the recipe is in big companies, but it is certainly longer and messier, involving some combination of resourcefulness, obedience, and building alliances.`,
  sections: [
    {
      title: "The Definition",
      content: "A couple days ago I finally got being a good startup founder down to two words: relentlessly resourceful. Till then the best I'd managed was to get the opposite quality down to one: hapless. Most dictionaries say hapless means unlucky. But the dictionaries are not doing a very good job. A team that outplays its opponents but loses because of a bad decision by the referee could be called unlucky, but not hapless. Hapless implies passivity. To be hapless is to be battered by circumstances, to let the world have its way with you, instead of having your way with the world.",
      level: 1
    },
    {
      title: "The Problem with Metaphors",
      content: "Unfortunately there's no antonym of hapless, which makes it difficult to tell founders what to aim for. Don't be hapless is not much of a rallying cry. It's not hard to express the quality we're looking for in metaphors. The best is probably a running back. A good running back is not merely determined, but flexible as well. They want to get downfield, but they adapt their plans on the fly. Unfortunately this is just a metaphor, and not a useful one to most people outside the US.",
      level: 1
    },
    {
      title: "Being Resourceful",
      content: "But finally I've figured out how to express this quality directly. I was writing a talk for investors, and I had to explain what to look for in founders. What would someone who was the opposite of hapless be like? They'd be relentlessly resourceful. Not merely relentless. That's not enough to make things go your way except in a few mostly uninteresting domains. In any interesting domain, the difficulties will be novel. Which means you can't simply plow through them, because you don't know initially how hard they are. You don't know whether you're about to plow through a block of foam or granite. So you have to be resourceful. You have to keep trying new things.",
      level: 1
    }
  ]
};

export default function App() {
  const [url, setUrl] = useState("");
  const [useLLMExtraction, setUseLLMExtraction] = useState(true);
  const [developerMode, setDeveloperMode] = useState(true); // Enable developer mode by default
  const router = useRouter();
  const { setScrapedData, setLoading, setError, setCurrentUrl } = useLexioActions();
  const { isLoading, error } = useLexioState();

  const handleLexio = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Developer mode - use hardcoded data
    if (developerMode) {
      setLoading(true);
      setError(null);
      setCurrentUrl(DEVELOPER_MODE_DATA.url);
      
      // Simulate loading delay for realism
      setTimeout(() => {
        setScrapedData({
          title: DEVELOPER_MODE_DATA.title,
          text: DEVELOPER_MODE_DATA.text,
          cleanText: DEVELOPER_MODE_DATA.cleanText,
          html: `<article><h1>${DEVELOPER_MODE_DATA.title}</h1><p>${DEVELOPER_MODE_DATA.text}</p></article>`,
          sections: DEVELOPER_MODE_DATA.sections
        });
        setLoading(false);
        router.push("/read");
      }, 1000);
      return;
    }

    // Regular mode - validate URL and scrape
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentUrl(url);

    try {
      const result = await scrapeWebsite(url, useLLMExtraction);
      setScrapedData(result);
      router.push("/read");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scrape website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-[600px] mx-auto">
          {/* Back to Home Button */}
          <div className="mb-12">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">back to home</span>
            </button>
          </div>

          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-medium tracking-tight mb-6">
              lexio.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
              enter any website url to convert its content into natural speech
            </p>
          </div>

          <form onSubmit={handleLexio} className="space-y-8">
            <div className="relative">
              <input
                type="url"
                value={developerMode ? "https://paulgraham.com/relres.html (developer mode)" : url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={developerMode ? "developer mode enabled - paul graham essay loaded" : "https://example.com"}
                className="w-full px-4 py-3 text-lg border border-gray-200 bg-white text-black placeholder-gray-400 focus:outline-none focus:border-black transition-all duration-200"
                disabled={isLoading || developerMode}
              />
              {!developerMode && url && !isValidUrl(url) && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              )}
              {developerMode && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <div className="text-xs bg-black text-white px-2 py-1">
                    dev
                  </div>
                </div>
              )}
            </div>

            {/* Developer Mode Toggle */}
            <div className="flex items-center justify-between text-sm mb-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">developer mode</span>
                <div className="group relative">
                  <svg className="w-4 h-4 text-gray-400 hover:text-black transition-colors cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    use paul graham essay for testing
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeveloperMode(!developerMode)}
                disabled={isLoading}
                className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  developerMode ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                    developerMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* AI Enhancement Toggle */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">ai enhancement</span>
                <div className="group relative">
                  <svg className="w-4 h-4 text-gray-400 hover:text-black transition-colors cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    cleans text for better narration
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUseLLMExtraction(!useLLMExtraction)}
                disabled={isLoading || developerMode}
                className={`relative inline-flex h-6 w-11 items-center transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  useLLMExtraction ? 'bg-black' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                    useLLMExtraction ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!developerMode && (!url || !isValidUrl(url)))}
              className="w-full px-6 py-3 bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {developerMode ? "loading paul graham essay..." : "processing..."}
                </span>
              ) : (
                developerMode ? "convert to speech (dev mode)" : "convert to speech"
              )}
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600 mb-6">
              {developerMode ? "developer mode active - using paul graham essay" : "try these examples:"}
            </p>
            {!developerMode && (
              <div className="flex flex-wrap gap-3 justify-center">
                {[
                  "https://news.ycombinator.com",
                  "https://www.wikipedia.org",
                  "https://github.com/trending"
                ].map((exampleUrl) => (
                  <button
                    key={exampleUrl}
                    onClick={() => setUrl(exampleUrl)}
                    className="px-4 py-2 text-sm bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-black border border-gray-200 hover:border-gray-300 transition-all duration-200"
                    disabled={isLoading}
                  >
                    {new URL(exampleUrl).hostname}
                  </button>
                ))}
              </div>
            )}
            {developerMode && (
              <div className="text-sm text-gray-500">
                click "convert to speech (dev mode)" to test with the paul graham essay
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 