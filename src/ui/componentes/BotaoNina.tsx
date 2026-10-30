export function BotaoNina({ aoAbrir, inverso = false }: { aoAbrir: () => void; inverso?: boolean }) {
  return <button type="button" onClick={aoAbrir} aria-label="Abrir chat com a Nina (NewAI)"
    className={`newai-nina ${inverso ? 'newai-nina-inverse' : ''}`}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 18V8m0 5a5 5 0 0 1 10 0v5m4-10v10" />
    </svg>
    <span>Nina</span>
  </button>;
}
