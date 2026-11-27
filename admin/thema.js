// Licht of donker thema op de adminpagina. Dezelfde keuze als op de site (localStorage 'thema', standaard donker).
// Staat bovenin de <head>, zodat data-thema op <html> staat voordat er iets getekend wordt.
(function (d) {
  const kleur = { donker: '#1a1714', licht: '#f1ebe1' };
  const zet = t => {
    d.setAttribute('data-thema', t);
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = kleur[t];
    const k = document.getElementById('thema');
    if (k) { k.textContent = t === 'donker' ? 'Licht' : 'Donker'; k.setAttribute('aria-label', t === 'donker' ? 'Wissel naar licht thema' : 'Wissel naar donker thema'); }
  };
  let t; try { t = localStorage.getItem('thema'); } catch { /* privémodus */ }
  zet(t === 'licht' ? 'licht' : 'donker');
  document.addEventListener('DOMContentLoaded', () => {
    zet(d.getAttribute('data-thema'));
    document.getElementById('thema').addEventListener('click', () => {
      const nieuw = d.getAttribute('data-thema') === 'licht' ? 'donker' : 'licht';
      try { localStorage.setItem('thema', nieuw); } catch { /* privémodus */ }
      zet(nieuw);
    });
  });
})(document.documentElement);
