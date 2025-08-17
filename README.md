# Lexio

A modern web application built with Next.js 15, TypeScript, and Tailwind CSS, featuring responsive design, dark mode support, and clean minimal styling.

## ✨ Features

- **⚡ Next.js 15** - Latest version with App Router and enhanced performance
- **🔷 TypeScript** - Full type safety and better developer experience
- **🎨 Tailwind CSS v4** - Modern utility-first CSS framework with latest features
- **🌙 Dark Mode** - Seamless dark/light mode toggle with system preference detection
- **📱 Responsive Design** - Mobile-first approach with perfect cross-device compatibility
- **🎯 Clean Architecture** - Minimal, well-organized codebase structure
- **♿ Accessibility** - Built with accessibility best practices
- **🚀 Performance** - Optimized for speed and user experience
- **🔧 Web Scraping** - Integrated with Firecrawl API for content extraction
- **📖 Content Reading** - Clean, readable layout for scraped content
- **🎧 Text-to-Speech** - AI-powered audio narration using ElevenLabs

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Fonts**: Geist Sans & Geist Mono
- **Linting**: ESLint with Next.js configuration
- **Package Manager**: npm
- **API Integration**: Firecrawl for web scraping, ElevenLabs for text-to-speech

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn
- Firecrawl API key (get one from [https://firecrawl.dev/](https://firecrawl.dev/))
- ElevenLabs API key (get one from [https://elevenlabs.io/](https://elevenlabs.io/))
- OpenAI API key (get one from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys))

### Installation

1. Clone the repository or navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Copy the example file and edit it
   cp .env.example .env.local
   # Then edit .env.local with your actual API keys
   ```

   Or manually create `.env.local` with:
   ```env
   FIRECRAWL_API_KEY=your_firecrawl_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

   **Security Note:** Both API keys (without `NEXT_PUBLIC_` prefix) are kept secure on the server and never exposed to the browser. All TTS functionality is handled server-side for security.

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build

Create a production build:

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

## 🚀 Vercel Deployment

When deploying to Vercel, make sure to add the following environment variables in your Vercel project settings:

1. Go to your Vercel dashboard → Your Project → Settings → Environment Variables
2. Add these variables for **Production**, **Preview**, and **Development** environments:
   - `FIRECRAWL_API_KEY` - Your Firecrawl API key from [https://firecrawl.dev/](https://firecrawl.dev/)
   - `ELEVENLABS_API_KEY` - Your ElevenLabs API key from [https://elevenlabs.io/](https://elevenlabs.io/)
   - `OPENAI_API_KEY` - Your OpenAI API key from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Note**: These API keys are server-side only and will never be exposed to the browser for security.

## 🌐 Using the Application

1. **Enter a URL** - Paste any website URL into the input field
2. **Click "Read This Site"** - The app will scrape the website content
3. **Read the Content** - View the extracted content in a clean, readable format
4. **Dark Mode** - Toggle between light and dark themes using the button in the top-right

### Example URLs to try:
- `https://news.ycombinator.com`
- `https://en.wikipedia.org/wiki/Artificial_intelligence`
- `https://github.com/trending`

## 📁 Project Structure

```
lexio/
├── src/
│   ├── app/
│   │   ├── globals.css       # Global styles and CSS variables
│   │   ├── layout.tsx        # Root layout component
│   │   ├── page.tsx          # Homepage with URL input
│   │   └── read/
│   │       └── page.tsx      # Content reading page
│   ├── components/
│   │   ├── DarkModeToggle.tsx # Dark mode toggle component
│   │   └── ScrapeExample.tsx  # Example scraping component
│   └── lib/
│       ├── firecrawl.ts      # Firecrawl API integration
│       └── store.ts          # Zustand state management
├── public/                   # Static assets
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies and scripts
```

## 🔧 API Integration

The application uses the Firecrawl API for web scraping. Key features:

- **Intelligent Content Extraction** - Extracts title, text, and structured sections
- **Error Handling** - Graceful error handling with user-friendly messages
- **TypeScript Support** - Fully typed API responses
- **Utility Functions** - URL validation, text sanitization, and content summarization

### Environment Variables

Make sure to set these environment variables:

```env
# Required for web scraping functionality (server-side only, secure)
FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Required for text-to-speech functionality (server-side only, secure)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Required for smart chat functionality (server-side only, secure)
OPENAI_API_KEY=your_openai_api_key_here
```

**Important Security Note:**
- All API keys (`FIRECRAWL_API_KEY`, `ELEVENLABS_API_KEY`, and `OPENAI_API_KEY`) are server-side only and never exposed to the browser
- All TTS and chat functionality is handled securely through server-side API routes

## 🎨 Customization

### Colors

The application uses a comprehensive color system defined in `globals.css`. You can customize the color palette by modifying the CSS variables:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #0ea5e9;
  /* ... other colors */
}
```

### Components

All components are built with Tailwind CSS and follow a consistent design system. The `DarkModeToggle` component demonstrates how to create interactive elements with proper accessibility.

### Dark Mode

Dark mode is implemented using CSS classes and localStorage for persistence. The system automatically detects user preferences and maintains the selected theme across sessions.

## 🔧 Configuration

### Tailwind CSS

The project uses Tailwind CSS v4 with a custom configuration that includes:
- Custom color variables
- Extended font families
- Dark mode support
- Responsive breakpoints

### TypeScript

Strict TypeScript configuration is enabled for better type safety and code quality.

## 📝 Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Firecrawl API Documentation](https://firecrawl.dev/docs)

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS.
