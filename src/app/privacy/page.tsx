"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PrivacyPage() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animations on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-blue-500/5 to-transparent rounded-full" />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Page heading */}
            <div
              className={`transform transition-all duration-1000 ease-out text-center mb-12 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 bg-clip-text text-transparent">
                  Privacy Policy
                </span>
              </h1>
              <p className="text-gray-400 text-lg">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Privacy content */}
            <div
              className={`transform transition-all duration-1000 ease-out delay-300 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 space-y-8">
                
                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Information We Collect
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      Lexio is designed with privacy in mind. We collect minimal information necessary to provide our text-to-speech service:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Website URLs that you provide for content extraction</li>
                      <li>Extracted text content (temporarily processed for speech generation)</li>
                      <li>Basic usage analytics (page views, feature usage)</li>
                      <li>Technical information (browser type, device type) for optimization</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    How We Use Your Information
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      Your information is used solely to provide and improve our service:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Converting text content to speech</li>
                      <li>Improving our content extraction algorithms</li>
                      <li>Analyzing usage patterns to enhance user experience</li>
                      <li>Providing technical support when needed</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Data Storage and Security
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      We take data security seriously:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Text content is processed temporarily and not permanently stored</li>
                      <li>All data transmission is encrypted using HTTPS</li>
                      <li>We use secure, industry-standard hosting services</li>
                      <li>Regular security audits and updates are performed</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Third-Party Services
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      Lexio integrates with the following third-party services:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Content extraction services for website scraping</li>
                      <li>Text-to-speech APIs for audio generation</li>
                      <li>Analytics services for usage monitoring</li>
                    </ul>
                    <p>
                      These services have their own privacy policies, and we encourage you to review them.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Your Rights
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      You have the following rights regarding your data:
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-4">
                      <li>Request information about what data we collect</li>
                      <li>Request deletion of your data</li>
                      <li>Opt out of analytics tracking</li>
                      <li>Report data protection concerns</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Children's Privacy
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      Lexio is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Contact Us
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      If you have any questions about this Privacy Policy or our data practices, please contact us:
                    </p>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p>Email: <a href="mailto:privacy@lexio.app" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@lexio.app</a></p>
                      <p>GitHub: <a href="https://github.com/pranav2x" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">@pranav2x</a></p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-3">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full" />
                    Changes to This Policy
                  </h2>
                  <div className="text-gray-300 space-y-4">
                    <p>
                      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Changes are effective immediately upon posting.
                    </p>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer
          className={`transform transition-all duration-1000 ease-out delay-500 ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <div className="px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <a
                  href="https://github.com/pranav2x"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-300 transition-colors duration-200"
                >
                  GitHub
                </a>
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                <button
                  onClick={() => router.push("/about")}
                  className="hover:text-gray-300 transition-colors duration-200"
                >
                  About
                </button>
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                <button
                  onClick={() => router.push("/privacy")}
                  className="hover:text-gray-300 transition-colors duration-200 text-gray-300"
                >
                  Privacy
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 