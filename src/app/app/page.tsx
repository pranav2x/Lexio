"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scrapeWebsite, isValidUrl } from "@/lib/firecrawl";
import { useLexioActions, useLexioState } from "@/lib/store";

// Developer mode hardcoded data
const DEVELOPER_MODE_DATA = {
  title: "AP World History: Modern Period 1 Notes (1200-1450)",
  url: "https://www.kaptest.com/study/ap-world-history/ap-world-history-modern-period-1-notes-1200-1450/",
  text: `The period from 1200 to 1450 CE represents a crucial era in world history known as the Post-Classical Period. This era witnessed unprecedented expansion of trade networks, the rise of powerful new empires, and significant cultural exchanges across Afro-Eurasia. Understanding this period is essential for AP World History: Modern success, as it establishes foundational patterns that continue into later periods.

Key Characteristics of Period 1 (1200-1450):
The Post-Classical Period is characterized by several major trends that shaped global development. First, expanded trade networks connected previously isolated regions, creating the first truly global economy. The Silk Road reached its peak efficiency under Mongol protection, while new maritime routes linked the Indian Ocean basin. Second, powerful new empires emerged, including the Mongol Empire, various Islamic states, and the Ming Dynasty in China. Third, significant cultural and technological exchanges occurred as merchants, missionaries, and travelers spread ideas, religions, and innovations across vast distances.

The Islamic World and Expansion:
Islamic civilization experienced tremendous growth and influence during this period. The Abbasid Caliphate, centered in Baghdad, became a major center of learning and trade. Islamic traders and missionaries spread Islam throughout Africa, Southeast Asia, and parts of Europe. The concept of Dar al-Islam (the realm of Islam) created a unified cultural sphere that facilitated trade and cultural exchange. Major Islamic empires included the Ottoman Empire in the Eastern Mediterranean, the Safavid Empire in Persia, and various sultanates in India and Southeast Asia.

The Mongol Empire and Its Impact:
The Mongol Empire, established by Genghis Khan in the early 13th century, became the largest contiguous land empire in history. Under Mongol rule, the Pax Mongolica (Mongol Peace) facilitated unprecedented trade and cultural exchange along the Silk Road. The Mongols conquered China, establishing the Yuan Dynasty, and extended their influence into the Middle East and Eastern Europe. Despite their reputation for destruction, the Mongols often adopted local customs and promoted religious tolerance, creating a unique synthesis of cultures across their vast empire.

Trade Networks and Economic Development:
Trade networks expanded dramatically during this period, connecting Europe, Asia, and Africa in complex commercial relationships. The Silk Road continued to be the primary overland trade route, while maritime trade in the Indian Ocean basin flourished. New trading cities emerged, including Malacca, Venice, and various Swahili city-states along the East African coast. These networks facilitated not only the exchange of goods but also the spread of technologies, ideas, and diseases. The development of new financial instruments, such as bills of exchange and banking houses, supported long-distance trade.

Technological and Cultural Innovations:
This period saw remarkable technological and cultural achievements. Chinese innovations, including gunpowder, the compass, and printing technology, spread westward along trade routes. Islamic scholars made significant advances in mathematics, astronomy, and medicine. The establishment of universities in Europe and madrasas in the Islamic world promoted learning and scholarship. Architecture flourished, with the construction of magnificent mosques, cathedrals, and palaces that still stand today.

Social and Political Structures:
Social hierarchies remained largely intact during this period, with most societies organized around agricultural production and ruled by monarchical or imperial systems. The feudal system dominated Europe, while China maintained its bureaucratic imperial structure under the Song and later Ming dynasties. Labor systems varied by region but generally included various forms of free and coerced labor, including serfdom and slavery. The period also saw the continuation and sometimes intensification of patriarchal structures across most societies.

Environmental and Demographic Changes:
The period experienced significant environmental and demographic changes. The Medieval Warm Period (roughly 900-1300 CE) facilitated agricultural expansion and population growth. However, the Little Ice Age began around 1300, contributing to crop failures and social unrest. The most devastating demographic event was the Black Death (1347-1351), which killed an estimated one-third of Europe's population and had significant impacts throughout Afro-Eurasia. These changes forced societies to adapt their agricultural practices and social structures.

Regional Developments:
Different regions experienced unique developments during this period. In Europe, the rise of powerful monarchies and the growth of towns and universities marked the transition from the early medieval period. China saw the flourishing of the Song Dynasty, known for its technological innovations and economic prosperity, followed by Mongol conquest and the eventual establishment of the Ming Dynasty. Africa experienced the rise of powerful trading kingdoms, including Mali and Songhai, while the Americas saw the development of sophisticated civilizations like the Aztec and Inca empires.

Religious and Cultural Exchange:
The period was marked by significant religious and cultural exchange. Islam continued to spread through trade and conquest, while Buddhism expanded throughout East and Southeast Asia. Christianity saw both expansion and internal division, with the Great Schism between Eastern and Western Christianity. The period also witnessed increased interaction between different religious and cultural traditions, leading to syncretism and the development of new forms of artistic and intellectual expression.

Legacy and Historical Significance:
The developments of the 1200-1450 period established patterns that would shape the modern world. The trade networks created during this era laid the foundation for the global economy that emerged in subsequent periods. The cultural exchanges facilitated by these networks contributed to the Renaissance in Europe and continued technological advancement in Asia. The political structures and social systems developed during this time influenced governance and society for centuries to come. Understanding this period is crucial for comprehending how the modern world system emerged from medieval foundations.`,
  cleanText: `The period from 1200 to 1450 CE represents the Post-Classical Period in world history, characterized by expanded trade networks, powerful new empires, and significant cultural exchanges across Afro-Eurasia. This era established foundational patterns crucial for understanding later historical developments.

Key developments include the rise of the Mongol Empire, which created the largest contiguous land empire in history and facilitated unprecedented trade along the Silk Road through the Pax Mongolica. Islamic civilization experienced tremendous growth, with the Abbasid Caliphate becoming a major center of learning and Islamic traders spreading their religion throughout Africa and Southeast Asia.

Trade networks expanded dramatically, connecting Europe, Asia, and Africa through both overland routes like the Silk Road and maritime trade in the Indian Ocean basin. These networks facilitated the exchange of goods, technologies, ideas, and diseases, while new financial instruments supported long-distance commerce.

Technological innovations flourished, with Chinese inventions like gunpowder, the compass, and printing spreading westward. Islamic scholars advanced mathematics, astronomy, and medicine, while universities and madrasas promoted learning across different regions.

The period also witnessed significant environmental and demographic changes, including the Medieval Warm Period, the beginning of the Little Ice Age, and the devastating Black Death pandemic that killed one-third of Europe's population.

Different regions experienced unique developments: Europe transitioned from early medieval structures to powerful monarchies and growing towns; China saw the Song Dynasty's prosperity followed by Mongol conquest and Ming establishment; Africa experienced powerful trading kingdoms like Mali; and the Americas developed sophisticated civilizations.

Religious and cultural exchange marked the era, with Islam spreading through trade and conquest, Buddhism expanding in East and Southeast Asia, and increased interaction between different traditions leading to syncretism and new forms of expression. These developments established patterns that shaped the emergence of the modern world system.`,
  sections: [
    {
      title: "Trade Networks and Economic Development",
      content: "Trade networks expanded dramatically during the period 1200-1450, connecting Europe, Asia, and Africa in complex commercial relationships. The Silk Road continued as the primary overland trade route, reaching peak efficiency under Mongol protection through the Pax Mongolica. Maritime trade in the Indian Ocean basin flourished, linking East Africa, the Middle East, India, Southeast Asia, and China. New trading cities emerged as crucial commercial hubs, including Malacca in Southeast Asia, Venice in Europe, and various Swahili city-states along the East African coast. These networks facilitated not only the exchange of luxury goods like silk, spices, and precious metals, but also the spread of technologies, ideas, religions, and unfortunately, diseases. The development of new financial instruments, such as bills of exchange, credit systems, and banking houses, supported the growing complexity of long-distance trade and commerce.",
      level: 1
    },
    {
      title: "The Mongol Empire and Pax Mongolica",
      content: "The Mongol Empire, established by Genghis Khan in the early 13th century, became the largest contiguous land empire in world history, stretching from Eastern Europe to the Pacific Ocean. Under Mongol rule, the Pax Mongolica (Mongol Peace) created unprecedented opportunities for trade and cultural exchange along the Silk Road. The Mongols conquered China, establishing the Yuan Dynasty under Kublai Khan, and extended their influence into the Middle East through the Il-Khanate and into Eastern Europe through the Golden Horde. Despite their fearsome reputation for military conquest and destruction, the Mongols often adopted local customs and administrative practices, promoted religious tolerance, and facilitated cultural synthesis across their vast empire. Their decimal military organization, efficient communication systems, and promotion of trade made them effective rulers who connected distant regions of Afro-Eurasia.",
      level: 1
    },
    {
      title: "Islamic Expansion and Cultural Influence",
      content: "Islamic civilization experienced tremendous growth and territorial expansion during the Post-Classical Period. The Abbasid Caliphate, centered in Baghdad, became a major center of learning, translation, and scientific advancement, preserving and building upon Greek, Persian, and Indian knowledge. Islamic traders and missionaries spread Islam throughout sub-Saharan Africa, Southeast Asia, and parts of Eastern Europe through both commercial networks and conquest. The concept of Dar al-Islam (the realm of Islam) created a unified cultural and religious sphere that facilitated trade, scholarship, and cultural exchange across vast distances. Major Islamic empires and states included the Ottoman Empire in the Eastern Mediterranean and Anatolia, various sultanates in India including the Delhi Sultanate, and trading communities throughout the Indian Ocean basin. Islamic scholars made significant contributions to mathematics, astronomy, medicine, and philosophy during this period.",
      level: 1
    },
    {
      title: "Technological Innovation and Cultural Exchange",
      content: "The period 1200-1450 witnessed remarkable technological innovations and their diffusion across trade networks. Chinese innovations, including gunpowder, the magnetic compass, printing technology, and advanced metallurgy, spread westward along the Silk Road and maritime routes. Islamic scholars and inventors made crucial advances in mathematics (including algebra and trigonometry), astronomy (improving the astrolabe), medicine, and engineering. The printing press, adapted and improved in Europe during the 15th century, revolutionized the spread of knowledge and literacy. Architectural achievements flourished across different cultures, from Gothic cathedrals in Europe to Islamic madrasas and mosques, Chinese pagodas, and impressive structures like Angkor Wat in Southeast Asia. The establishment of universities in Europe and madrasas in the Islamic world created new centers of learning that promoted scholarship, scientific inquiry, and cultural exchange between different intellectual traditions.",
      level: 1
    },
    {
      title: "Environmental Changes and the Black Death",
      content: "The Post-Classical Period experienced significant environmental and demographic changes that profoundly impacted human societies. The Medieval Warm Period (roughly 900-1300 CE) facilitated agricultural expansion, population growth, and the establishment of new settlements, contributing to increased trade and urbanization. However, around 1300, the Little Ice Age began, bringing cooler temperatures, crop failures, and social unrest in many regions. The most catastrophic demographic event was the Black Death pandemic (1347-1351), which originated in Central Asia and spread along trade routes throughout Afro-Eurasia. This bubonic plague killed an estimated one-third of Europe's population and had devastating impacts in the Middle East, North Africa, and parts of Asia. The pandemic forced societies to adapt their agricultural practices, labor systems, and social structures, leading to significant changes in wages, land tenure, and social mobility. These environmental and demographic pressures contributed to social upheavals, religious movements, and political transformations across the affected regions.",
      level: 1
    }
  ]
};

export default function App() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const { setScrapedData, setLoading, setError, setCurrentUrl } = useLexioActions();
  const { isLoading, error } = useLexioState();

  const handleCachedContentLoad = () => {
    console.log('📄 Loading cached content with demo effect...');
    setLoading(true);
    setError(null);
    setCurrentUrl(DEVELOPER_MODE_DATA.url);
    
    // Show loading spinner for 2 seconds for demo effect
    setTimeout(() => {
      setScrapedData({
        title: DEVELOPER_MODE_DATA.title,
        text: DEVELOPER_MODE_DATA.text,
        cleanText: DEVELOPER_MODE_DATA.cleanText,
        html: `<article><h1>${DEVELOPER_MODE_DATA.title}</h1><p>${DEVELOPER_MODE_DATA.text}</p></article>`,
        sections: DEVELOPER_MODE_DATA.sections
      });
      setLoading(false);
      console.log('✅ Cached content loaded, navigating to /read...');
      router.push("/read");
    }, 2000); // 2 second delay for demo effect
  };

  const handleLexio = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL input
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    console.log('🔍 URL entered:', { 
      entered: url.trim(), 
      cached: DEVELOPER_MODE_DATA.url, 
      match: url.trim() === DEVELOPER_MODE_DATA.url 
    });

    // Check if URL matches cached content
    if (url.trim() === DEVELOPER_MODE_DATA.url) {
      console.log('📄 Using cached content for demo URL');
      handleCachedContentLoad();
      return;
    }

    // Regular mode - scrape the website
    console.log('🔍 Starting scraping for URL:', url.trim());
    setLoading(true);
    setError(null);
    setCurrentUrl(url);

    try {
      const result = await scrapeWebsite(url); // AI enhancement is now always enabled by default
      
      console.log('✅ Scraping successful:', {
        title: result.title,
        textLength: result.text?.length || 0,
        cleanTextLength: result.cleanText?.length || 0,
        sectionsCount: result.sections?.length || 0
      });
      
      // Validate result has necessary content
      if (!result.title || (!result.text && !result.cleanText)) {
        throw new Error('Scraped content is incomplete - missing title or text content');
      }
      
      setScrapedData(result);
      console.log('🚀 Navigating to /read...');
      
      // Force a small delay to ensure state is set
      setTimeout(() => {
        router.push("/read");
      }, 100);
    } catch (err) {
      console.error('❌ Scraping error:', err);
      setError(err instanceof Error ? err.message : "Failed to scrape website");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-xl mx-auto space-y-6">
          
          {/* Back to Home Button */}
          <div className="flex justify-start">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-neutral-400 hover:text-black transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">back to home</span>
            </button>
          </div>

          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-5xl font-bold tracking-tight leading-none">
              lexio.
            </h1>
            <p className="text-base text-neutral-500 max-w-md mx-auto leading-relaxed">
              enter any website url to convert its content<br />
              into natural speech
            </p>
          </div>

          {/* Main Form */}
          <form onSubmit={handleLexio} className="space-y-6">
            {/* URL Input */}
            <div className="w-full">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-6 py-4 text-lg border border-neutral-200 rounded-xl bg-white text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all duration-200"
                disabled={isLoading}
                autoFocus
              />
            </div>



            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !url || !isValidUrl(url)}
              className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  processing...
                </span>
              ) : (
                "convert to speech"
              )}
            </button>
          </form>

          {/* Example Links */}
          <div className="text-center space-y-4">
            <p className="text-sm text-neutral-500">try these examples:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { url: "https://news.ycombinator.com", label: "news.ycombinator.com" },
                { url: "https://www.wikipedia.org", label: "wikipedia.org" },
                { url: "https://github.com/trending", label: "github.com/trending" },
                { url: DEVELOPER_MODE_DATA.url, label: "ap world history" }
              ].map((example) => (
                <button
                  key={example.url}
                  onClick={() => setUrl(example.url)}
                  className="px-4 py-2 text-sm border border-neutral-200 rounded-lg text-neutral-600 hover:text-black hover:border-neutral-300 hover:shadow-sm transition-all duration-200"
                  disabled={isLoading}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
} 