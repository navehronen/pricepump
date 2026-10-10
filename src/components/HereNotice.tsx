export function HereNotice({ search = false }: { search?: boolean }) {
  return <div className="here-notice">
    {search ? <p>Searching sends your entered place or approximate search area to HERE. By searching, you agree to the <a href="https://legal.here.com/terms/here-end-user-terms">HERE End User Terms</a>. Read the <a href="https://legal.here.com/privacy">HERE Privacy Policy</a>.</p> : <>
      <p>Fuel prices, station information, and location search provided by HERE. Map tiles: OpenStreetMap contributors.</p>
      <p><a href="https://legal.here.com/terms/here-end-user-terms">HERE End User Terms</a> · <a href="https://legal.here.com/privacy">HERE Privacy Policy</a></p>
      <p>Fuel-price data must not be used to calculate or display averages, or retrieved in bulk covering all or substantially all available content. <a href="https://legal.here.com/us-en/terms/general-content-supplier-terms-and-notices">HERE supplier terms and notices</a>.</p>
    </>}
  </div>;
}
