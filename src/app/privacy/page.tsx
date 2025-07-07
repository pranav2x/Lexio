"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white text-black font-sans">

      {/* Main content */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-6">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-black transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm">back to home</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Page heading */}
            <div className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl font-medium tracking-tight mb-4">
                privacy.
              </h1>
              <p className="text-gray-600 text-lg">
                last updated: {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Privacy content */}
            <div className="space-y-12 max-w-3xl mx-auto">
                
                <section>
                  <h2 className="text-xl font-medium text-black mb-4">
                    information we collect
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
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
                  <h2 className="text-xl font-medium text-black mb-4">
                    how we use your information
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
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
                  <h2 className="text-xl font-medium text-black mb-4">
                    data storage and security
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
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
                  <h2 className="text-xl font-medium text-black mb-4">
                    third-party services
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
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
                  <h2 className="text-xl font-medium text-black mb-4">
                    your rights
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
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
                  <h2 className="text-xl font-medium text-black mb-4">
                    children's privacy
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
                    <p>
                      Lexio is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
                    </p>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-medium text-black mb-4">
                    contact us
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
                    <p>
                      if you have any questions about this privacy policy or our data practices, please contact us:
                    </p>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <p>email: <a href="mailto:rapellipranav1@gmail.com" className="text-black hover:underline transition-colors">rapellipranav1@gmail.com</a></p>
                      <p>github: <a href="https://github.com/pranav2x" target="_blank" rel="noopener noreferrer" className="text-black hover:underline transition-colors">@pranav2x</a></p>
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-medium text-black mb-4">
                    changes to this policy
                  </h2>
                  <div className="text-gray-700 space-y-4 leading-relaxed">
                    <p>
                      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Changes are effective immediately upon posting.
                    </p>
                  </div>
                </section>

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