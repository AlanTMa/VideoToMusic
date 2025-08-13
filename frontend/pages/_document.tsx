// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document'

export default class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          {/* Optional PWA theme colors (match your Tailwind palette) */}
          <meta name="theme-color" media="(prefers-color-scheme: light)" content="#0ea5e9" />
          <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />
          <link rel="shortcut icon" href="/favicon.ico" />
        </Head>
        <body className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
