// Beck on the Rocks: recepten en ingrediënten voor de boodschappenlijst.
// Klassiekers volgens de officiële IBA-specificaties (International Bartenders Association, iba-world.com).
// Mocktails zijn eigen recepten (geen IBA-cocktails).
window.BeckRecepten = (() => {
  // Ingrediënten: hoe je ze koopt.
  //   per: inhoud van één verpakking (in de eenheid van het recept)
  //   eenheid: eenheid in het recept (ml, stuks, g, dash, blad)
  //   koop: naam van de verpakking (enkelvoud, meervoud)
  //   groep: indeling op de lijst
  const ING = {
    bourbon:      { naam: 'Bourbon (of rye whiskey)', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    vodka:        { naam: 'Vodka', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    citroenvodka: { naam: 'Citroenvodka (vodka citron)', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    vanillevodka: { naam: 'Vanillevodka', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    gin:          { naam: 'Gin', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    witterum:     { naam: 'Witte rum', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    cachaca:      { naam: 'Cachaça', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    tequila:      { naam: 'Tequila (100% agave)', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    campari:      { naam: 'Campari', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    vermout:      { naam: 'Zoete rode vermout', eenheid: 'ml', per: 750, koop: ['fles 75 cl', 'flessen 75 cl'], groep: 'Sterke drank & likeuren' },
    koffielikeur: { naam: 'Koffielikeur (bijv. Kahlúa)', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    triplesec:    { naam: 'Triple sec (bijv. Cointreau)', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    passoa:       { naam: 'Passievruchtlikeur (bijv. Passoã)', eenheid: 'ml', per: 700, koop: ['fles 70 cl', 'flessen 70 cl'], groep: 'Sterke drank & likeuren' },
    bubbels:      { naam: 'Champagne of prosecco', eenheid: 'ml', per: 750, koop: ['fles 75 cl', 'flessen 75 cl'], groep: 'Sterke drank & likeuren' },
    angostura:    { naam: 'Angostura bitters', eenheid: 'dash', per: 200, koop: ['flesje 200 ml', 'flesjes 200 ml'], groep: 'Overig' },

    limoensap:    { naam: 'Limoenen (vers geperst)', eenheid: 'ml', per: 25, koop: ['limoen', 'limoenen'], groep: 'Vers fruit & kruiden', noot: '≈ 25 ml sap per limoen' },
    limoen:       { naam: 'Limoenen (in partjes)', eenheid: 'stuks', per: 1, koop: ['limoen', 'limoenen'], groep: 'Vers fruit & kruiden' },
    citroensap:   { naam: 'Citroenen (vers geperst)', eenheid: 'ml', per: 35, koop: ['citroen', 'citroenen'], groep: 'Vers fruit & kruiden', noot: '≈ 35 ml sap per citroen' },
    munt:         { naam: 'Verse munt', eenheid: 'blad', per: 40, koop: ['bosje', 'bosjes'], groep: 'Vers fruit & kruiden', noot: '≈ 40 blaadjes per bosje' },
    passievrucht: { naam: 'Passievruchten (garnering)', eenheid: 'stuks', per: 1, koop: ['passievrucht', 'passievruchten'], groep: 'Vers fruit & kruiden' },
    sinaasappel:  { naam: 'Sinaasappels (zeste/schijfje)', eenheid: 'stuks', per: 8, koop: ['sinaasappel', 'sinaasappels'], groep: 'Vers fruit & kruiden', noot: '≈ 8 garneringen per sinaasappel' },
    limoengarnering: { naam: 'Limoenen (schijfje garnering)', eenheid: 'stuks', per: 8, koop: ['limoen', 'limoenen'], groep: 'Vers fruit & kruiden', noot: '≈ 8 schijfjes per limoen' },

    passiepuree:  { naam: 'Passievruchtpuree', eenheid: 'ml', per: 1000, koop: ['pak/fles 1 L', 'pakken/flessen 1 L'], groep: 'Fris & sappen' },
    cranberry:    { naam: 'Cranberrysap', eenheid: 'ml', per: 1000, koop: ['pak 1 L', 'pakken 1 L'], groep: 'Fris & sappen' },
    ananassap:    { naam: 'Ananassap', eenheid: 'ml', per: 1000, koop: ['pak 1 L', 'pakken 1 L'], groep: 'Fris & sappen' },
    kokosroom:    { naam: 'Cream of coconut (gezoete kokosroom)', eenheid: 'ml', per: 400, koop: ['blik/fles ≈ 400 ml', 'blikken/flessen ≈ 400 ml'], groep: 'Fris & sappen' },
    gingerbeer:   { naam: 'Ginger beer', eenheid: 'ml', per: 200, koop: ['flesje 200 ml', 'flesjes 200 ml'], groep: 'Fris & sappen' },
    soda:         { naam: 'Spuitwater (soda)', eenheid: 'ml', per: 1000, koop: ['fles 1 L', 'flessen 1 L'], groep: 'Fris & sappen' },
    espresso:     { naam: 'Espresso', eenheid: 'shot', per: 1, koop: ['shot', 'shots'], groep: 'Overig', noot: '≈ 8 g koffiebonen per shot' },

    siroop:       { naam: 'Suikersiroop', eenheid: 'ml', per: 1000, koop: ['liter', 'liter'], groep: 'Overig', noot: 'zelf maken: gelijke delen suiker en water, of kant-en-klaar' },
    suiker:       { naam: 'Witte rietsuiker', eenheid: 'g', per: 1000, koop: ['pak 1 kg', 'pakken 1 kg'], groep: 'Overig' },
    vanillesuiker:{ naam: 'Vanillesuiker', eenheid: 'g', per: 250, koop: ['pot/zak ≈ 250 g', 'potten/zakken ≈ 250 g'], groep: 'Overig', noot: 'vanillesiroop kan ook' },
    zout:         { naam: 'Zout voor de rand', eenheid: 'g', per: 500, koop: ['pak', 'pakken'], groep: 'Overig' },
    koffiebonen:  { naam: 'Koffiebonen (garnering)', eenheid: 'stuks', per: 300, koop: ['zakje', 'zakjes'], groep: 'Overig' },
    kersen:       { naam: 'Cocktailkersen (maraschino)', eenheid: 'stuks', per: 40, koop: ['potje', 'potjes'], groep: 'Overig' },

    ijs:          { naam: 'IJsblokjes', eenheid: 'g', per: 2000, koop: ['zak 2 kg', 'zakken 2 kg'], groep: 'IJs' },
    crushedijs:   { naam: 'Crushed ice', eenheid: 'g', per: 2000, koop: ['zak 2 kg', 'zakken 2 kg'], groep: 'IJs' }
  };

  // Recepten per cocktail (hoeveelheden per glas). 1 tl suiker ≈ 4 g, 1 barlepel ≈ 5 g, 1 klontje ≈ 4 g.
  const RECEPTEN = {
    'Old Fashioned':    { bron: 'IBA', ing: { bourbon: 45, suiker: 4, angostura: 3, sinaasappel: 1, ijs: 300 } },
    'Negroni':          { bron: 'IBA', ing: { gin: 30, campari: 30, vermout: 30, sinaasappel: 1, ijs: 300 } },
    'Espresso Martini': { bron: 'IBA', ing: { vodka: 50, koffielikeur: 30, siroop: 10, espresso: 1, koffiebonen: 3, ijs: 150 } },
    'Whiskey Sour':     { bron: 'IBA', ing: { bourbon: 45, citroensap: 25, siroop: 20, sinaasappel: 1, kersen: 1, ijs: 300 } },
    'Daiquiri':         { bron: 'IBA', ing: { witterum: 60, limoensap: 20, suiker: 10, ijs: 150 } },
    'Cosmopolitan':     { bron: 'IBA', ing: { citroenvodka: 40, triplesec: 15, limoensap: 15, cranberry: 30, ijs: 150 } },
    'Mojito':           { bron: 'IBA', ing: { witterum: 45, limoensap: 20, munt: 8, suiker: 8, soda: 60, limoengarnering: 1, ijs: 300 } },
    'Caipirinha':       { bron: 'IBA', ing: { cachaca: 60, limoen: 1, suiker: 16, crushedijs: 250 } },
    'Margarita':        { bron: 'IBA', ing: { tequila: 50, triplesec: 20, limoensap: 15, zout: 2, ijs: 150 } },
    'Pornstar Martini': { bron: 'IBA', ing: { vanillevodka: 50, passoa: 20, passiepuree: 50, vanillesuiker: 10, bubbels: 50, passievrucht: 0.5, ijs: 150 } },
    'Moscow Mule':      { bron: 'IBA', ing: { vodka: 45, limoensap: 10, gingerbeer: 120, limoengarnering: 1, ijs: 300 } },
    'Piña Colada':      { bron: 'IBA', ing: { witterum: 30, ananassap: 90, kokosroom: 30, crushedijs: 250 } },
    'Virgin Mojito':    { bron: 'eigen', ing: { limoensap: 20, munt: 8, suiker: 8, soda: 120, limoengarnering: 1, ijs: 300 } },
    'Virgin Colada':    { bron: 'eigen', ing: { ananassap: 90, kokosroom: 30, limoensap: 10, crushedijs: 250 } },
    'Virgin Mule':      { bron: 'eigen', ing: { limoensap: 15, gingerbeer: 150, munt: 4, limoengarnering: 1, ijs: 300 } }
  };

  const GROEPEN = ['Sterke drank & likeuren', 'Fris & sappen', 'Vers fruit & kruiden', 'Overig', 'IJs'];

  // Aantal cocktails op basis van gasten en uren
  function aantalCocktails({ gasten, uren, aandeel = 75, perUur = 1 }) {
    return Math.max(0, Math.round((+gasten || 0) * (aandeel / 100) * (+uren || 0) * perUur));
  }

  // Lijst berekenen: totaal wordt gelijk verdeeld over de gekozen cocktails, plus marge
  function bereken({ cocktails, totaal, marge = 10 }) {
    const gekozen = cocktails.filter(c => RECEPTEN[c]);
    if (!gekozen.length || !totaal) return { perCocktail: [], groepen: [] };
    const basis = Math.floor(totaal / gekozen.length);
    let rest = totaal - basis * gekozen.length;
    const perCocktail = gekozen.map(c => ({ naam: c, aantal: basis + (rest-- > 0 ? 1 : 0), bron: RECEPTEN[c].bron }));
    const factor = 1 + marge / 100;
    const som = {};
    perCocktail.forEach(({ naam, aantal }) => {
      Object.entries(RECEPTEN[naam].ing).forEach(([k, hoeveel]) => { som[k] = (som[k] || 0) + hoeveel * aantal * factor; });
    });
    const regels = Object.entries(som).map(([k, nodig]) => {
      const i = ING[k];
      const stuks = Math.max(1, Math.ceil(nodig / i.per - 1e-9));
      return { key: k, naam: i.naam, groep: i.groep, stuks, koop: stuks === 1 ? i.koop[0] : i.koop[1], nodig, eenheid: i.eenheid, noot: i.noot || '' };
    });
    const groepen = GROEPEN.map(g => ({ groep: g, regels: regels.filter(r => r.groep === g).sort((a, b) => a.naam.localeCompare(b.naam)) })).filter(g => g.regels.length);
    return { perCocktail, groepen };
  }

  // Hoeveelheid die nodig is, leesbaar
  function nodigTekst(r) {
    const n = r.nodig;
    switch (r.eenheid) {
      case 'ml': return n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} L nodig` : `${Math.ceil(n)} ml nodig`;
      case 'g': return n >= 1000 ? `${(n / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 1 })} kg nodig` : `${Math.ceil(n)} g nodig`;
      case 'dash': return `${Math.ceil(n)} dashes`;
      case 'blad': return `${Math.ceil(n)} blaadjes`;
      case 'shot': return `${Math.ceil(n)} shots (≈ ${Math.ceil(n * 8)} g bonen)`;
      default: return `${Math.ceil(n)} nodig`;
    }
  }

  return { RECEPTEN, ING, aantalCocktails, bereken, nodigTekst, namen: Object.keys(RECEPTEN) };
})();
