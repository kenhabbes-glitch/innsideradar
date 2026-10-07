// Leksjoner i Skole-fanen. Kort, praktisk og knyttet til det appen viser.
import { PATTERNS } from "./indicators.js";

const candleSvg = `
<svg viewBox="0 0 420 210" role="img" aria-label="Oppbygningen av et grønt og et rødt lys">
  <g font-family="IBM Plex Sans Condensed, sans-serif" font-size="12" fill="var(--dim)">
    <line x1="90" y1="20" x2="90" y2="190" stroke="var(--up)" stroke-width="2"/>
    <rect x="70" y="60" width="40" height="80" fill="var(--panel)" stroke="var(--up)" stroke-width="2"/>
    <line x1="290" y1="20" x2="290" y2="190" stroke="var(--down)" stroke-width="2"/>
    <rect x="270" y="60" width="40" height="80" fill="var(--down)"/>
    <text x="118" y="24">Høyeste kurs</text><text x="118" y="64">Slutt (lukket høyere)</text>
    <text x="118" y="144">Åpning</text><text x="118" y="192">Laveste kurs</text>
    <text x="318" y="24">Høyeste</text><text x="318" y="64">Åpning</text>
    <text x="318" y="144">Slutt (lukket lavere)</text><text x="318" y="192">Laveste</text>
    <text x="10" y="44" fill="var(--fg)">Veke</text><text x="10" y="104" fill="var(--fg)">Kropp</text>
    <text x="66" y="208" fill="var(--up)">Grønt: opp</text><text x="266" y="208" fill="var(--down)">Rødt: ned</text>
  </g>
</svg>`;

export const LESSONS = [
  {
    t: "Aksjer og fond", s: "Hva du faktisk kjøper",
    b: `<p>En <strong>aksje</strong> er en eierandel i ett selskap. Går selskapet godt, kan aksjen stige og gi utbytte. Går det dårlig, kan den falle mye.</p>
<p>Et <strong>fond</strong> eier mange aksjer samtidig. Et <strong>indeksfond</strong> kopierer en hel børs eller verden, og koster lite. Et <strong>aktivt fond</strong> har forvaltere som velger aksjer, og koster mer.</p>
<ul><li>Aksjer: høyere risiko, mer å følge med på, mulighet for å slå markedet.</li><li>Indeksfond: lav kostnad, bred spredning, du får markedets avkastning.</li></ul>
<p class="tipbox">Bruk indeksfondet KLP AksjeNorge som målestokk. Slår ikke de fiktive aksjevalgene dine indeksen over tid, er indeksfond et godt valg.</p>`,
  },
  {
    t: "Candlesticks (lys)", s: "Hvordan lese én dag i grafen",
    b: `<p>Hvert «lys» viser én handelsdag med fire tall: <strong>åpning, høyeste, laveste og slutt</strong>.</p>${candleSvg}
<ul><li><strong>Kroppen</strong> er avstanden mellom åpning og slutt. Grønn (hul) betyr at kursen endte høyere enn den åpnet. Rød (fylt) betyr lavere.</li>
<li><strong>Vekene</strong> viser hvor langt kursen var opp og ned i løpet av dagen.</li>
<li>Lang kropp betyr at én side (kjøpere eller selgere) dominerte. Lange veker betyr kamp og usikkerhet.</li></ul>
<p class="tipbox">Ett lys alene sier lite. Se det i sammenheng med trenden før, volumet og nivået kursen står på.</p>`,
  },
  {
    t: "Trend og glidende snitt", s: "Den viktigste regelen: følg trenden",
    b: `<p>Et <strong>glidende snitt</strong> er gjennomsnittet av sluttkursen de siste X dagene. Det glatter ut støy.</p>
<ul><li><strong>20 dager</strong> (blå): kortsiktig retning.</li><li><strong>50 dager</strong> (gul): mellomlang trend.</li><li><strong>200 dager</strong> (lilla): den lange trenden. Mange profesjonelle ser på denne først.</li></ul>
<p>Kurs over 50 og 200, og 50 over 200, er en <strong>opptrend</strong>. Når 50 krysser over 200 kalles det <strong>gyllent kors</strong>. Motsatt er et <strong>dødskors</strong>.</p>
<p class="tipbox">Nybegynnere taper ofte på å kjøpe aksjer i fallende trend fordi de «ser billige ut». Det er lettere å svømme med strømmen.</p>`,
  },
  {
    t: "Støtte og motstand", s: "Nivåer markedet husker",
    b: `<p><strong>Støtte</strong> er et kursnivå der fallet har stoppet før, fordi kjøpere kommer inn. <strong>Motstand</strong> er et nivå der oppgangen har stoppet før.</p>
<ul><li>Se etter flere bunner eller topper på omtrent samme nivå.</li><li>Brytes motstand med høyt volum, blir den ofte ny støtte.</li><li>Runde tall (100, 200 kr) fungerer ofte som psykologiske nivåer.</li></ul>
<p class="tipbox">Øvelse: Åpne en aksje i Marked, velg 1 år, og finn to nivåer der kursen har snudd flere ganger.</p>`,
  },
  {
    t: "Volum", s: "Bekreftelse på at bevegelsen er ekte",
    b: `<p>Volum er hvor mange aksjer som ble handlet. Søylene nederst i grafen viser det.</p>
<ul><li>Oppgang med høyt volum er sterkere enn oppgang med lavt volum.</li><li>Plutselig volumhopp betyr ofte nyheter. Sjekk børsmeldinger og Radar-fanen.</li><li>Lavt volum gjør det lettere å flytte kursen, og gir større spread mellom kjøp og salg.</li></ul>`,
  },
  {
    t: "RSI", s: "Har kursen gått for langt for fort?",
    b: `<p>RSI (Relative Strength Index) går fra 0 til 100 og måler hvor kraftig kursen har beveget seg de siste 14 dagene.</p>
<ul><li><strong>Over 70:</strong> overkjøpt. Mye oppgang på kort tid. Kan komme en pause.</li><li><strong>Under 30:</strong> oversolgt. Mye fall på kort tid. Kan komme en rekyl.</li></ul>
<p class="tipbox">RSI fungerer best sammen med trenden. I en sterk opptrend er RSI ned mot 40 ofte et bedre kjøpspunkt enn RSI under 30 i en nedtrend.</p>`,
  },
  {
    t: "Candlestick-mønstre", s: "Mønstrene appen markerer i grafen",
    b: `<p>Appen markerer mønstrene med ▲ (mulig snu opp), ▼ (mulig snu ned) og ◆ (usikkerhet). De er signaler, ikke garantier, og bommer ofte alene.</p>
<div class="patgrid">${Object.values(PATTERNS).map(p => `<div><b>${p.retning === "opp" ? "▲" : p.retning === "ned" ? "▼" : "◆"} ${p.navn}</b><span>${p.tekst}</span></div>`).join("")}</div>`,
  },
  {
    t: "Det fundamentale", s: "Hva selskapet faktisk tjener",
    b: `<p>Teknisk analyse sier noe om <em>når</em>. Fundamental analyse sier noe om <em>hva</em> du bør eie.</p>
<ul><li><strong>Kvartalsrapporter:</strong> vokser inntekter og resultat? Kursen reagerer mest på avvik fra forventningene.</li>
<li><strong>P/E:</strong> kurs delt på resultat per aksje. Lav P/E kan være billig, eller et tegn på problemer.</li>
<li><strong>Utbytte:</strong> stabilt og voksende utbytte tyder på sunn drift.</li>
<li><strong>Innsidehandel:</strong> ledere som kjøper for egne penger er et av de mest kjente positive signalene. Se Radar.</li>
<li><strong>Short:</strong> mange profesjonelle som satser på fall, betyr at noen har en negativ tese. Kan også gi kraftig oppgang hvis de må dekke inn.</li>
<li><strong>Makro:</strong> oljepris (energi), laksepris (sjømat), strømpris (kraft), renter (bank og eiendom) og kronekurs (eksportselskaper).</li></ul>`,
  },
  {
    t: "Risiko og posisjonsstørrelse", s: "Det som skiller de som overlever",
    b: `<ul><li><strong>Maks 10 % i én aksje.</strong> Da tåler porteføljen at én aksje halveres.</li>
<li><strong>Bestem på forhånd når du selger.</strong> For eksempel ved −10 % (stop-loss) eller når grunnen til kjøpet ikke lenger stemmer.</li>
<li><strong>Spre på bransjer.</strong> Fem sjømataksjer er nesten én posisjon.</li>
<li><strong>La vinnerne løpe, kutt taperne.</strong> De fleste gjør det motsatte.</li></ul>
<p class="tipbox">Appen ber deg skrive hvorfor du kjøper. Les begrunnelsene i Portefølje etter en måned. Det er den raskeste måten å lære på.</p>`,
  },
  {
    t: "Kostnader og skatt", s: "Små tall som blir store",
    b: `<ul><li><strong>Kurtasje:</strong> avgiften per handel. Appen simulerer 0,05 %, minst 29 kr. Mange små handler blir dyrt.</li>
<li><strong>Spread:</strong> forskjellen mellom kjøps- og salgskurs. Større i små, lite omsatte aksjer.</li>
<li><strong>Forvaltningshonorar i fond:</strong> indeksfond rundt 0,2 % i året, aktive fond ofte 1–2 %.</li>
<li><strong>Aksjesparekonto (ASK):</strong> lar deg bytte aksjer og aksjefond uten å skatte før du tar pengene ut.</li></ul>
<p class="tipbox">Dette er generell informasjon og ikke skatte- eller finansrådgivning. Sjekk gjeldende regler hos Skatteetaten.</p>`,
  },
  {
    t: "Psykologi", s: "Den største fienden er deg selv",
    b: `<ul><li><strong>FOMO:</strong> å kjøpe fordi alle andre gjør det, ofte etter at kursen allerede har steget mye.</li>
<li><strong>Tapsaversjon:</strong> vi holder på tapere for lenge fordi det gjør vondt å realisere tap.</li>
<li><strong>Bekreftelsesfelle:</strong> vi leter etter nyheter som bekrefter det vi allerede mener.</li>
<li><strong>Overtrading:</strong> handle for å «gjøre noe». Kostnadene spiser avkastningen.</li></ul>
<p class="tipbox">Fiktiv handel er perfekt for å oppdage egne mønstre uten at det koster noe. Vær ærlig i journalen.</p>`,
  },
];

// Quiz per leksjon (samme rekkefølge som LESSONS). c = indeks for riktig svar.
export const QUIZ = [
  [
    { q: "Hva eier du når du kjøper en andel i et indeksfond for Oslo Børs?", a: ["Én aksje valgt av forvalteren", "Litt av alle selskapene i indeksen", "Et lån til selskapene", "En garanti mot tap"], c: 1, f: "Indeksfondet kopierer hele indeksen, så du eier en liten bit av alle selskapene." },
    { q: "Hva er den største fordelen med indeksfond for de fleste?", a: ["Garantert avkastning", "Lav kostnad og bred spredning", "De stiger alltid mer enn aksjer", "Ingen svingninger"], c: 1, f: "Lave kostnader og spredning gjør at du får markedets avkastning uten å måtte velge vinnere." },
    { q: "Hvorfor bruker appen et indeksfond som målestokk?", a: ["Fordi det er gratis", "For å se om egne valg faktisk gir mer enn det enkle alternativet", "Fordi det aldri faller", "Det er et krav fra Finanstilsynet"], c: 1, f: "Slår du ikke indeksen over tid, er indeksfond et bedre valg enn å velge aksjer selv." },
  ],
  [
    { q: "Et grønt lys betyr at …", a: ["volumet var høyt", "kursen endte høyere enn den åpnet", "aksjen er et kjøp", "kursen er over 200-dagers snitt"], c: 1, f: "Grønn (hul) kropp: slutt over åpning. Rød (fylt): slutt under åpning." },
    { q: "Hva viser vekene på et lys?", a: ["Åpning og slutt", "Dagens høyeste og laveste kurs", "Volumet", "Utbyttet"], c: 1, f: "Vekene strekker seg til dagens høyeste og laveste handlede kurs." },
    { q: "Lange veker på begge sider og liten kropp tyder på …", a: ["at kjøperne vant klart", "kamp og usikkerhet", "at børsen var stengt", "at aksjen er billig"], c: 1, f: "Kursen gikk både langt opp og ned, men endte nesten der den startet. Ingen vant." },
  ],
  [
    { q: "Hva regnes som en sunn opptrend?", a: ["Kurs under 200-dagers snitt", "Kurs over 50-dagers, og 50 over 200-dagers", "RSI under 30", "Lavt volum"], c: 1, f: "Når kurs > 50-dagers > 200-dagers, peker både kort og lang trend opp." },
    { q: "Hva er et «gyllent kors»?", a: ["50-dagers krysser over 200-dagers", "Kursen dobles", "RSI krysser 50", "To grønne lys på rad"], c: 0, f: "Det klassiske tegnet på at en ny opptrend kan være i gang." },
    { q: "Hvorfor taper nybegynnere ofte på aksjer i fallende trend?", a: ["De kjøper fordi aksjen «ser billig ut»", "Kurtasjen er høyere", "De får ikke utbytte", "De kan ikke selges"], c: 0, f: "Billig kan bli billigere. Det er lettere å følge trenden enn å gjette bunnen." },
  ],
  [
    { q: "Hva er støtte?", a: ["Et nivå der fallet har stoppet før", "Et lån fra banken", "Utbyttet", "Høyeste kurs noensinne"], c: 0, f: "Kjøpere har kommet inn på dette nivået før, og markedet husker det." },
    { q: "Hva skjer ofte når motstand brytes med høyt volum?", a: ["Den blir ny støtte", "Aksjen stenges", "RSI går til 0", "Ingenting"], c: 0, f: "Gammel motstand blir ofte ny støtte når den først er brutt overbevisende." },
    { q: "Hvorfor fungerer runde tall (100 kr, 200 kr) ofte som nivåer?", a: ["Psykologi: mange legger ordre der", "Børsen krever det", "Kurtasjen endres der", "Tilfeldig"], c: 0, f: "Mange investorer setter kjøps- og salgsordre på runde tall." },
  ],
  [
    { q: "En oppgang med høyt volum er …", a: ["svakere enn med lavt volum", "sterkere og mer troverdig", "et salgssignal", "uten betydning"], c: 1, f: "Høyt volum betyr at mange er enige i bevegelsen." },
    { q: "Plutselig volumhopp betyr ofte at …", a: ["det har kommet nyheter", "børsen har feil", "aksjen deles", "renten endres"], c: 0, f: "Sjekk børsmeldinger. Appen viser dem under «Hva skjedde her?»." },
    { q: "Hva er ulempen med aksjer med lavt volum?", a: ["Større spread og lettere å flytte kursen", "De gir ikke utbytte", "De kan ikke shortes", "Ingen ulemper"], c: 0, f: "Få handler gjør at kjøps- og salgskurs ligger langt fra hverandre." },
  ],
  [
    { q: "RSI på 78 betyr …", a: ["oversolgt", "overkjøpt: mye oppgang på kort tid", "at aksjen skal falle i morgen", "at selskapet tjener 78 %"], c: 1, f: "Over 70 regnes som overkjøpt, men sterke aksjer kan holde seg der lenge." },
    { q: "Når fungerer RSI best?", a: ["Alene", "Sammen med trenden", "Bare for fond", "Bare på fredager"], c: 1, f: "I en opptrend er RSI ned mot 40 ofte et bedre kjøpspunkt enn RSI under 30 i en nedtrend." },
    { q: "Hvor mange dager bruker standard RSI?", a: ["5", "14", "50", "200"], c: 1, f: "RSI 14 er standarden, og det appen viser." },
  ],
  [
    { q: "En hammer etter et fall kan bety at …", a: ["fallet kan stoppe", "fallet akselererer", "aksjen skal deles", "det er utbytte"], c: 0, f: "Selgerne presset ned, men kjøperne tok kursen tilbake." },
    { q: "Bearish engulfing er sterkest …", a: ["etter en oppgang og med høyt volum", "etter et fall", "i helgen", "med lavt volum"], c: 0, f: "Et rødt lys som sluker forrige grønne etter en oppgang viser at selgerne tar over." },
    { q: "Hvor pålitelige er mønstre alene?", a: ["Svært pålitelige", "De bommer ofte. Bruk dem sammen med trend, volum og nivå", "Alltid riktige på fond", "Brukes bare av banker"], c: 1, f: "Mønstre er hint, ikke fasit. Blindtesten i Trening viser hvor ofte de treffer." },
  ],
  [
    { q: "Hva er P/E?", a: ["Kurs delt på resultat per aksje", "Pris per eiendel", "Prosent endring", "Produksjon per ansatt"], c: 0, f: "P/E 10 betyr at du betaler 10 kr for hver krone selskapet tjener i året." },
    { q: "Hva reagerer kursen mest på ved en kvartalsrapport?", a: ["Avvik fra forventningene", "Lengden på rapporten", "Hvilken dag den kommer", "Logoen"], c: 0, f: "Et godt resultat kan gi fall hvis markedet ventet enda bedre." },
    { q: "Hvilken makrofaktor påvirker sjømataksjer mest?", a: ["Laksepris", "Strømpris", "Styringsrenten", "Gullprisen"], c: 0, f: "Lakseprisen driver inntektene direkte. Se makropanelet på aksjesiden." },
  ],
  [
    { q: "Hvorfor maks ca. 10 % i én aksje?", a: ["Da tåler porteføljen at én aksje halveres", "Det er lovpålagt", "Kurtasjen blir lavere", "For å få mer utbytte"], c: 0, f: "Halveres en posisjon på 10 %, taper porteføljen bare 5 %." },
    { q: "Hva er en stop-loss?", a: ["En ordre om å selge hvis kursen faller til et bestemt nivå", "En garanti mot tap", "En type fond", "Et utbytte"], c: 0, f: "Du bestemmer før du kjøper hvor mye du er villig til å tape. Appen kan utløse den automatisk." },
    { q: "Hva gjør de fleste feil med vinnere og tapere?", a: ["Selger vinnere for tidlig og holder tapere for lenge", "Holder alt for evig", "Kjøper bare fond", "Ingenting"], c: 0, f: "Regelen er motsatt: la vinnerne løpe, kutt taperne." },
  ],
  [
    { q: "Hva er kurtasje?", a: ["Avgiften per handel", "Årlig fondskostnad", "Skatt på utbytte", "Renten på kontoen"], c: 0, f: "Mange små handler gjør kurtasjen dyr." },
    { q: "Hva er hovedfordelen med aksjesparekonto (ASK)?", a: ["Du kan bytte aksjer og fond uten skatt før du tar ut pengene", "Ingen skatt noensinne", "Garantert avkastning", "Gratis kurtasje"], c: 0, f: "Skatten utsettes til uttak. Kalkulatoren i Trening viser effekten." },
    { q: "Hva koster 1 prosentpoeng høyere årlig kostnad over 20 år?", a: ["Nesten ingenting", "Ofte 15–20 % av sluttbeløpet", "Nøyaktig 1 %", "Det gir høyere avkastning"], c: 1, f: "Kostnader renteres også. Prøv sparekalkulatoren." },
  ],
  [
    { q: "Hva er FOMO i aksjehandel?", a: ["Å kjøpe fordi alle andre gjør det, ofte etter oppgangen", "En type fond", "Et candlestick-mønster", "Et skattefradrag"], c: 0, f: "Frykten for å gå glipp av noe får mange til å kjøpe på toppen." },
    { q: "Hvorfor holder mange tapere for lenge?", a: ["Tapsaversjon: det gjør vondt å realisere tap", "Kurtasjen", "Skatteregler", "Fordi de alltid kommer tilbake"], c: 0, f: "Vi føler tap omtrent dobbelt så sterkt som gevinster." },
    { q: "Hva er det beste verktøyet mot dårlige vaner?", a: ["En ærlig handelsjournal du leser i etterkant", "Flere handler", "Å følge tips på forum", "Å aldri se på porteføljen"], c: 0, f: "Journalen og vurderingene etter 30 og 90 dager viser deg dine egne mønstre." },
  ],
];
