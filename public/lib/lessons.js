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

// Quiz per leksjon (samme rekkefølge som LESSONS). c = indeks for riktig svar i a.
// Svaralternativene stokkes hver gang, og det trekkes 3 tilfeldige spørsmål per runde.
export const QUIZ = [
  [ // Aksjer og fond
    { q: "Et indeksfond for Oslo Børs har en årlig kostnad på 0,2 %. Et aktivt Norge-fond koster 1,5 % og har gitt samme avkastning før kostnader de siste ti årene. Hvilket har gitt deg mest?", a: ["Indeksfondet", "Det aktive fondet, fordi forvalteren følger med", "Like mye, siden avkastningen før kostnader var lik", "Det aktive, fordi det har lavere risiko"], c: 0, f: "Kostnaden trekkes hvert år. Med lik avkastning før kostnader gir 1,3 prosentpoeng lavere kostnad en tydelig høyere sluttverdi." },
    { q: "Hva skjer med andelen din i et indeksfond når ett av selskapene i indeksen går konkurs?", a: ["Fondet taper bare den lille andelen selskapet utgjorde", "Fondet stenges og du får pengene tilbake", "Hele fondet faller like mye som selskapet", "Banken dekker tapet"], c: 0, f: "Spredningen gjør at et enkelt selskap betyr lite for helheten." },
    { q: "Hvorfor kan en enkeltaksje falle 50 % på en dag, mens et bredt indeksfond nesten aldri gjør det?", a: ["Selskapsspesifikk risiko jevnes ut når du eier mange selskaper", "Indeksfond har en garanti mot store fall", "Børsen stopper handel i fond ved fall over 10 %", "Indeksfond eier bare de tryggeste selskapene"], c: 0, f: "Risiko knyttet til ett selskap (dårlig resultat, skandale) sprer seg ikke til hele markedet." },
    { q: "Du vil slå markedet. Hva er den mest realistiske målestokken for om du lykkes?", a: ["Avkastning sammenlignet med et indeksfond over samme periode", "Om porteføljen har steget i kroner", "Om du har flere vinnere enn tapere", "Om du slår renten på sparekontoen"], c: 0, f: "Steg markedet 20 % og du 15 %, har du tapt på å velge selv, selv om du tjente penger." },
    { q: "Hva er en ETF?", a: ["Et fond som handles på børs gjennom dagen som en aksje", "Et fond du bare kan kjøpe en gang i måneden", "En aksje i et finansselskap", "En type obligasjon med fast rente"], c: 0, f: "ETF = Exchange Traded Fund. Kjøpes og selges som en aksje, med kurtasje." },
  ],
  [ // Candlesticks
    { q: "Et lys åpner på 100, går ned til 92, opp til 104 og slutter på 98. Hvordan ser det ut?", a: ["Rødt, kropp 100–98, nedre veke til 92, øvre veke til 104", "Grønt, kropp 92–104", "Rødt, kropp 104–92 uten veker", "Grønt, kropp 98–100, veker til 92 og 104"], c: 0, f: "Slutt under åpning gir rød kropp mellom 100 og 98. Vekene går til dagens høyeste og laveste." },
    { q: "Hva forteller en lang nedre veke etter flere dager med fall?", a: ["Selgerne presset kursen ned, men kjøperne tok den tilbake", "Selgerne har full kontroll", "Det var lite handel den dagen", "Selskapet har lagt frem et dårlig resultat"], c: 0, f: "Kjøpere kom inn på lavere nivåer. Det kan være et første tegn på at fallet bremser." },
    { q: "Kursen gikk opp 8 % i dag, men lyset har en lang øvre veke og liten kropp. Hva er den vanligste tolkningen?", a: ["Kjøperne presset hardt, men selgerne tok mye av oppgangen tilbake", "Det er et sterkt kjøpssignal", "Lyset er ugyldig fordi det mangler volum", "Kursen vil stige videre i morgen"], c: 0, f: "Lang øvre veke viser at høye nivåer ble solgt ned. Etter en oppgang er det et faresignal." },
    { q: "Hvorfor tegnes grønne lys hule og røde fylte i mange grafer?", a: ["For å skille dager som endte opp fra dager som endte ned også uten farger", "Hule lys betyr lavt volum", "Fylte lys betyr at børsen var åpen hele dagen", "Det har ingen betydning"], c: 0, f: "Det er en konvensjon som gjør grafen lesbar i svart-hvitt." },
    { q: "Hva er den største svakheten ved å lese ett enkelt lys?", a: ["Det sier lite uten trenden før, volumet og kursnivået", "Det viser ikke åpningskursen", "Det er alltid forsinket én dag", "Det tar ikke hensyn til utbytte"], c: 0, f: "Samme lys kan bety ulike ting avhengig av sammenhengen." },
  ],
  [ // Trend og glidende snitt
    { q: "Kursen er 120. 50-dagers snitt er 115 og 200-dagers snitt er 125. Hva beskriver situasjonen best?", a: ["Kortsiktig styrke i en langsiktig nedtrend", "En sunn opptrend", "En klar nedtrend på alle tidsrammer", "Et gyllent kors"], c: 0, f: "Kurs over 50, men 50 under 200: oppgang på kort sikt, men den lange trenden peker fortsatt ned." },
    { q: "Hvorfor kommer et gyllent kors ofte «sent»?", a: ["Glidende snitt bygger på historiske kurser og reagerer etter at bevegelsen har startet", "Børsen publiserer snittet med en ukes forsinkelse", "Det beregnes bare én gang i måneden", "Det kommer aldri sent"], c: 0, f: "Snittene glatter ut historikken. Oppgangen har ofte pågått en stund før 50-dagers krysser 200-dagers." },
    { q: "En aksje har falt fra 200 til 90 og ligger langt under alle snitt. Hva sier trendregelen?", a: ["Vent på tegn til at trenden snur før du kjøper", "Kjøp, fordi den er halvert", "Kjøp mer jo mer den faller", "Snittene er irrelevante for store fall"], c: 0, f: "En billig aksje kan bli billigere. Trendregelen sier at du venter på bekreftelse." },
    { q: "Hvilket snitt reagerer raskest på en plutselig kursendring?", a: ["20-dagers", "50-dagers", "200-dagers", "Alle reagerer like raskt"], c: 0, f: "Jo færre dager i snittet, jo mer vekt får hver ny dag." },
    { q: "I et marked som går sidelengs (ingen trend), hva skjer ofte med signaler fra glidende snitt?", a: ["De gir mange falske kryss fram og tilbake", "De blir ekstra pålitelige", "De forsvinner helt", "De viser alltid kjøp"], c: 0, f: "Uten trend krysser kursen snittene stadig. Det gir mange feilsignaler." },
  ],
  [ // Støtte og motstand
    { q: "En aksje har snudd ned ved 150 kr tre ganger. I dag går den til 156 med tre ganger normalt volum. Hva er en vanlig tolkning?", a: ["Motstanden er brutt, og 150 kan bli ny støtte", "Aksjen må falle tilbake under 150", "Volum betyr ingenting ved brudd", "150 er nå enda sterkere motstand"], c: 0, f: "Brudd med høyt volum er mer troverdig, og gammel motstand blir ofte ny støtte." },
    { q: "Hvorfor fungerer støtte ofte? Hvilken forklaring er mest presis?", a: ["Mange husker nivået og har ordrer liggende der", "Børsen stopper handel ved støttenivåer", "Selskapet kjøper alltid tilbake aksjer der", "Støtte beregnes av Finanstilsynet"], c: 0, f: "Det er markedets hukommelse: investorer som angret på at de ikke kjøpte sist, kjøper når kursen kommer tilbake." },
    { q: "Kursen faller gjennom en støtte som har holdt i et år. Hva er mest sannsynlig rett etterpå?", a: ["Gammel støtte kan bli ny motstand hvis kursen prøver å stige igjen", "Kursen må straks tilbake over støtten", "Støtten flytter seg automatisk ned", "Det betyr at aksjen er billig"], c: 0, f: "Rollene bytter: de som kjøpte på støtten, vil gjerne selge når de kommer ut i null." },
    { q: "Hvor setter mange stop-loss ved kjøp nær en støtte?", a: ["Litt under støtten", "Rett over støtten", "På 50 % av kjøpskursen", "Ved forrige toppnivå"], c: 0, f: "Brytes støtten, er tesen svekket. Litt under gir rom for normal støy." },
    { q: "Hva er det største problemet med støtte og motstand?", a: ["Nivåene er omtrentlige og blir ofte brutt midlertidig", "De kan bare brukes på fond", "De fungerer bare i USA", "De er hemmelige"], c: 0, f: "Se på dem som soner, ikke eksakte tall." },
  ],
  [ // Volum
    { q: "Kursen stiger 3 % på volum som er halvparten av normalt. Hva er den beste tolkningen?", a: ["Oppgangen har svak støtte fra markedet", "Et sterkt kjøpssignal", "Volum har ingen betydning ved oppgang", "Selskapet har kjøpt egne aksjer"], c: 0, f: "Lite volum betyr at få er med på bevegelsen. Den er lettere å reversere." },
    { q: "Etter et langt fall kommer en dag med enormt volum og en lang nedre veke. Hva kalles dette ofte?", a: ["Kapitulasjon: de siste selgerne gir opp", "Et dødskors", "Et utbytte", "En emisjon"], c: 0, f: "Panikksalg med høyt volum markerer ofte slutten på et fall, men ikke alltid." },
    { q: "Hvorfor er volumet ofte svært høyt på dagen for en kvartalsrapport?", a: ["Ny informasjon får mange til å endre syn samtidig", "Børsen dobler handelstiden", "Kurtasjen er gratis den dagen", "Fond er pålagt å handle da"], c: 0, f: "Nye tall gir nye vurderinger, og mange handler samtidig." },
    { q: "Hva er en praktisk ulempe ved å handle aksjer med svært lavt volum?", a: ["Du kan måtte betale mer og få dårligere pris når du vil selge", "Du får ikke stemmerett", "De kan ikke legges i aksjesparekonto", "Kursen kan ikke endres"], c: 0, f: "Stor forskjell mellom kjøps- og salgskurs (spread) og få kjøpere når du vil ut." },
    { q: "Volumet stiger kraftig uten børsmelding. Hva er lurt å sjekke først?", a: ["Innsidehandel, short, sektornyheter og makro", "Om børsen har tekniske feil", "Om aksjen har byttet navn", "Ingenting, det er tilfeldig"], c: 0, f: "Radar-fanen og «Hva skjedde her?» hjelper deg å finne årsaken." },
  ],
  [ // RSI
    { q: "RSI har vært over 70 i tre uker mens kursen fortsetter opp. Hva viser dette best?", a: ["Sterke aksjer kan være overkjøpt lenge", "RSI er feilberegnet", "Aksjen må falle i morgen", "Du bør shorte"], c: 0, f: "Overkjøpt er ikke et salgssignal alene. I sterke trender kan RSI ligge høyt lenge." },
    { q: "Kursen gjør en ny bunn, men RSI gjør en høyere bunn enn sist. Hva kalles dette?", a: ["Positiv divergens", "Dødskors", "Gap", "Negativ divergens"], c: 0, f: "Fallet mister kraft selv om kursen er lavere. Det kan varsle en snuoperasjon." },
    { q: "Hva måler RSI egentlig?", a: ["Forholdet mellom gjennomsnittlig oppgang og nedgang de siste dagene", "Hvor mange som eier aksjen", "Selskapets relative styrke mot konkurrentene", "Antall kjøps- og salgsordrer"], c: 0, f: "RSI sammenligner størrelsen på opp- og ned-dager, vanligvis over 14 dager." },
    { q: "I en tydelig nedtrend faller RSI under 30. Hva er risikoen ved å kjøpe bare på det?", a: ["Svake aksjer kan holde seg oversolgt og falle videre", "Det finnes ingen risiko", "RSI under 30 betyr at aksjen er gratis", "Kurtasjen blir høyere"], c: 0, f: "I nedtrender er oversolgt ofte bare et hvil før neste fall." },
    { q: "Hvilken kombinasjon regnes som sterkest?", a: ["Opptrend, og RSI som faller mot 40 og snur opp", "Nedtrend og RSI over 80", "RSI på 50 og lavt volum", "RSI over 70 og dødskors"], c: 0, f: "Kjøp i retning trenden på en midlertidig svakhet." },
  ],
  [ // Mønstre
    { q: "Du ser en hammer, men den kommer etter en lang oppgang. Hva betyr det?", a: ["Lite. Hammer er et snumønster etter fall, ikke etter oppgang", "Et sterkt kjøpssignal", "At oppgangen akselererer", "At selskapet skal betale utbytte"], c: 0, f: "Samme form kalles «hengt mann» etter oppgang, og tolkes forsiktig negativt." },
    { q: "Hvorfor bør du ikke kjøpe på et mønster alene?", a: ["Mønstre har lav treffsikkerhet uten trend, volum og nivå", "Mønstre er ulovlige å handle på", "Mønstre vises bare dagen etter", "Mønstre gjelder bare for fond"], c: 0, f: "Test det selv i blindtesten under Trening." },
    { q: "Hva kreves for en bullish engulfing?", a: ["En grønn kropp som helt dekker forrige røde kropp", "To grønne lys på rad", "En doji etterfulgt av et rødt lys", "Lang øvre veke og liten kropp"], c: 0, f: "Kjøperne har tatt tilbake mer enn hele forrige dags fall." },
    { q: "En doji etter en lang oppgang med høyt volum. Hva er rimelig å gjøre?", a: ["Følge ekstra med og vurdere å stramme inn stop-loss", "Selge alt umiddelbart", "Kjøpe mer, siden doji er positivt", "Ignorere den"], c: 0, f: "Doji viser balanse. Etter en lang trend kan det bety at kraften svekkes." },
    { q: "Hva er forskjellen på en morgenstjerne og en hammer?", a: ["Morgenstjernen består av tre lys, hammeren av ett", "Morgenstjernen kommer etter oppgang", "Hammeren er alltid rød", "Det er samme mønster"], c: 0, f: "Morgenstjernen: stort rødt, lite lys, stort grønt. Den regnes som sterkere enn ett enkelt lys." },
  ],
  [ // Det fundamentale
    { q: "Selskap A har P/E 8 og fallende inntekter. Selskap B har P/E 25 og vokser 30 % i året. Hva er riktig?", a: ["Lav P/E er ikke automatisk billig. Veksten må tas med", "A er alltid det beste kjøpet", "B er alltid overpriset", "P/E sier alt om verdien"], c: 0, f: "Markedet priser forventet fremtid. Lav P/E kan skyldes at resultatene ventes å falle." },
    { q: "Et selskap leverer rekordresultat, men aksjen faller 7 %. Hva er den mest sannsynlige forklaringen?", a: ["Resultatet var svakere enn forventet, eller utsiktene ble nedjustert", "Børsen har gjort en feil", "Gode resultater gir alltid fall", "Aksjen gikk ex-utbytte samme dag"], c: 0, f: "Kursen reagerer på avvik fra forventning og på hva ledelsen sier om fremtiden." },
    { q: "Hva er det viktigste å sjekke når et selskap har høy utbytteavkastning, for eksempel 12 %?", a: ["Om utbyttet er bærekraftig, eller om kursen har falt fordi problemer er ventet", "Ingenting, høyt utbytte er alltid bra", "Om selskapet er notert i USA", "Om aksjen har høyt volum"], c: 0, f: "Svært høy utbytteavkastning skyldes ofte at kursen har falt, og utbyttet kan bli kuttet." },
    { q: "Lakseprisen faller 20 % på en måned. Hvilke aksjer påvirkes mest direkte?", a: ["Oppdrettere som Mowi og SalMar", "Banker", "Teknologiselskaper", "Telenor"], c: 0, f: "Lakseprisen driver inntektene til oppdretterne direkte." },
    { q: "Hvorfor er gjeld viktig å følge med på når renten stiger?", a: ["Høyere rentekostnader spiser av resultatet", "Gjeld blir automatisk slettet", "Det påvirker bare banker", "Gjeld har ingen betydning for kursen"], c: 0, f: "Selskaper med mye gjeld og lav margin rammes hardest av renteøkninger." },
  ],
  [ // Risiko
    { q: "Porteføljen er 100 000 kr, og du tåler å tape 1 % per handel. Du kjøper på 50 kr med stop-loss på 45 kr. Hvor mange aksjer kan du kjøpe?", a: ["200", "2 000", "20", "1 000"], c: 0, f: "Maks tap 1 000 kr delt på 5 kr risiko per aksje gir 200 aksjer (10 000 kr)." },
    { q: "En aksje faller 50 %. Hvor mye må den stige for å komme tilbake til start?", a: ["100 %", "50 %", "25 %", "75 %"], c: 0, f: "Fra 100 til 50 er −50 %. Fra 50 tilbake til 100 er +100 %. Store tap er vanskelige å hente inn." },
    { q: "Du eier fem aksjer: Mowi, SalMar, Lerøy, Bakkafrost og Grieg. Hvor godt spredt er du?", a: ["Dårlig. Alle påvirkes av lakseprisen", "Godt, med fem selskaper", "Perfekt, alle er store selskaper", "Spredning gjelder bare fond"], c: 0, f: "Selskaper i samme bransje svinger sammen. Det er nesten én posisjon." },
    { q: "Hva er forholdet gevinst/risiko i en handel med kjøp på 100, stop-loss på 95 og kursmål på 115?", a: ["3 : 1", "1 : 3", "1 : 1", "15 : 1"], c: 0, f: "Mulig gevinst 15, mulig tap 5. Mange krever minst 2 : 1." },
    { q: "Med et forhold på 3 : 1 mellom gevinst og risiko, hvor ofte må du ha rett for å gå i pluss over tid (før kostnader)?", a: ["Litt over 25 % av gangene", "Minst 75 %", "Minst 50 %", "Hver gang"], c: 0, f: "Én vinner på +3 dekker tre tap på −1. Du kan ta feil oftere enn du har rett." },
  ],
  [ // Kostnader og skatt
    { q: "Du handler 10 ganger i måneden for 5 000 kr per handel med minstekurtasje 29 kr. Hvor mye koster det i året?", a: ["Ca. 3 500 kr", "Ca. 350 kr", "Ca. 29 kr", "Ca. 35 000 kr"], c: 0, f: "29 kr × 10 × 12 = 3 480 kr i året. På så små handler er 29 kr nesten 0,6 % hver gang, så kursen må stige over 1 % på hver kjøp-og-salg bare for å gå i null." },
    { q: "Hva skjer skattemessig når du selger en aksje med gevinst og kjøper en annen innenfor aksjesparekonto (ASK)?", a: ["Ingen skatt før du tar pengene ut av kontoen", "Du betaler skatt på gevinsten med en gang", "Gevinsten er skattefri for alltid", "Du betaler dobbel skatt"], c: 0, f: "ASK utsetter skatten. Merk at regler kan endres, så sjekk Skatteetaten." },
    { q: "Hva er spread?", a: ["Forskjellen mellom beste kjøpskurs og beste salgskurs", "Kurtasjen til megleren", "Det årlige forvaltningshonoraret", "Utbyttet delt på kursen"], c: 0, f: "Du kjøper på salgskursen og selger på kjøpskursen. Forskjellen er en skjult kostnad." },
    { q: "To fond gir 7 % før kostnad. Fond A koster 0,2 %, fond B 1,5 %. Omtrent hvor mye mer har du i A etter 20 år med 2 000 kr i måneden?", a: ["Rundt 15 % mer", "Rundt 1 % mer", "Like mye", "Rundt 100 % mer"], c: 0, f: "Prøv selv i sparekalkulatoren under Trening." },
    { q: "Hvorfor kan et fond med høyere kostnad likevel være riktig valg?", a: ["Hvis det over tid gir høyere avkastning etter kostnader enn alternativene", "Høyere kostnad betyr alltid bedre forvaltning", "Det gir høyere skattefradrag", "Det er aldri riktig"], c: 0, f: "Det som teller, er avkastning etter kostnader. Få aktive fond klarer å slå indeksen over tid." },
  ],
  [ // Psykologi
    { q: "En aksje du eier, har falt 30 %. Du tenker: «Jeg selger når den er tilbake på kjøpskurs.» Hvilken felle er dette?", a: ["Tapsaversjon og forankring til kjøpskursen", "FOMO", "Overtrading", "Diversifisering"], c: 0, f: "Markedet bryr seg ikke om hva du betalte. Spørsmålet er om du ville kjøpt aksjen i dag." },
    { q: "Alle snakker om en aksje som har steget 80 % på en måned. Du kjøper. Hva er størst risiko?", a: ["Du kjøper sent, etter at mye av oppgangen er tatt ut (FOMO)", "At du får for mye utbytte", "At kurtasjen blir høyere", "Ingen risiko, trenden er sterk"], c: 0, f: "Sterk trend er ikke feil i seg selv, men kjøp på grunn av at «alle» gjør det, er FOMO." },
    { q: "Du leser bare nyheter som støtter at aksjen din skal opp. Hva heter dette?", a: ["Bekreftelsesfellen", "Momentum", "Ankereffekt", "Rebalansering"], c: 0, f: "Let aktivt etter argumenter mot din egen tese. Høy short kan være et slikt signal." },
    { q: "Etter fem vellykkede handler øker du innsatsen kraftig. Hvilken felle er det?", a: ["Overmot etter flaks i et lite utvalg", "Tapsaversjon", "Bekreftelsesfellen", "Spredning"], c: 0, f: "Fem handler er for lite til å skille ferdighet fra flaks." },
    { q: "Hva er det beste verktøyet for å oppdage egne dårlige vaner?", a: ["En ærlig journal du leser i etterkant", "Flere handler for å få mer erfaring", "Å følge tips fra forum", "Å slutte å se på porteføljen"], c: 0, f: "Vurderingene etter 30 og 90 dager i Portefølje viser deg dine egne mønstre." },
  ],
];
