export default function Footer() {
  return (
    <footer className="w-full bg-stone-900 text-stone-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs tracking-widest uppercase">
        <div className="mb-4 md:mb-0">
          &copy; {new Date().getFullYear()} Magnolia by Rahat Jamal. All Rights Reserved.
        </div>
        <div className="flex gap-6">
          <a
            href="https://www.instagram.com/magnoliabyrahatjamal/"
            target="_blank"
            rel="noreferrer"
            className="text-stone-500 hover:text-stone-100 transition-colors"
            aria-label="Instagram"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
          </a>

          <a
            href="mailto:magnoliabyrahatjamal@gmail.com"
            className="text-stone-500 hover:text-stone-100 transition-colors"
            aria-label="Email"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
