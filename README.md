# Innsideradar

Appen er et læringsverktøy for aksjer og fond på Oslo Børs. Den viser innsidehandel og short, kurser med candlestick-grafer, nøkkeltall og makro. I tillegg har den fiktiv handel med journal og vurdering, trening og en skole. Appen kan installeres på PC og mobil (PWA).

## Faner

| Fane | Innhold |
|---|---|
| **Radar** | Innsidehandel, mest shortede aksjer, og «dragkamp» (selskaper der innsidere kjøper mens fond shorter) |
| **Marked** | Makrostripe (olje, USD/NOK, EUR/NOK, styringsrente, laks, strøm), alle aksjer på Oslo Børs, Euronext Expand og Euronext Growth (ca. 300), 9 fond og papirer du legger til selv (aksjer, ETF-er og fond fra hele verden). Filter på sektor. Filteret «Fond» viser også en sammenligning av kostnad, avkastning over 1, 3 og 5 år, svingninger, største fall og likhet med indeks |
| **Aksjeside** | Se egen tabell under |
| **Portefølje** | Se egen tabell under |
| **Trening** | Blindtest på historiske grafer (med statistikk over egne gjetninger og over hvor ofte signalene traff), oversikt over quizene, sparekalkulator (hva kostnader koster deg over tid) og en ASK-modell |
| **Skole** | 11 leksjoner med quiz |
| **Gruppe** | Toppliste og felles feed med handler og begrunnelser |
| **Oppsett** | Navn og deling, brukere (admin), push-varsler, kurtasje og ny start |

**Aksjeside:**

| Del | Innhold |
|---|---|
| Graf | Candlesticks, glidende snitt, volum, RSI og markerte mønstre |
| Signaler | Dagens signaler, forklart med vanlige ord |
| Nøkkeltall | Sammenlignet med bransjen |
| Makro | Makrotall som påvirker bransjen, med målt sammenheng |
| Hva skjedde her? | Største kursbevegelser siste år, med børsmeldinger samme dag |
| Handel | Fiktiv handel med stop-loss, kursmål, forslag til posisjonsstørrelse og sjekkliste før kjøp |

**Portefølje:**

| Del | Innhold |
|---|---|
| Til vurdering | Appen spør hvordan handelen gikk etter 30 og 90 dager |
| Varsler og hendelser | Varsler, og kommende kvartalsrapporter og utbyttedatoer |
| Utvikling | Porteføljen sammenlignet med indeksfondet |
| Beholdning og fordeling | Hva du eier, og spredning på bransjer |
| Hva lærer du? | Avkastning sortert etter begrunnelse, signal og sjekkliste |
| Journal | Alle handler med begrunnelse og vurdering |

## Oppsett

### 1. GitHub

1. Erstatt filene i repoet med innholdet i zip-filen, inkludert de skjulte mappene `.github/` og `netlify/`.
2. Gå til *Settings → Actions → General → Workflow permissions* og velg **Read and write permissions**. Har du gjort dette før, trenger du ikke gjøre det igjen.
3. Gå til *Actions → Oppdater data → Run workflow*. Første kjøring tar 3–6 minutter, fordi den henter strømpriser 120 dager tilbake og børsmeldinger for alle selskapene. Senere kjøringer går raskere.

### 2. Netlify

1. Gå til *Site configuration → Environment variables*. Legg inn `APP_PIN` hvis du ikke har gjort det.
2. Valgfritt: legg inn `VAPID_SUBJECT`, for eksempel `mailto:deg@eksempel.no`. Den brukes som avsender for push-varsler.
3. Push-nøklene lages automatisk første gang, så du trenger ikke lage dem selv.
4. Trigg en ny deploy. Netlify installerer `@netlify/blobs` og `web-push` automatisk.

### 3. Hver enhet

1. Gå til **Oppsett** og skriv inn PIN.
2. Velg **Slå på varsler på denne enheten**, og deretter **Send testvarsel**.
3. På iPhone må appen først være lagt til på Hjem-skjermen før varsler kan slås på.


## Brukere og innlogging (samme oppsett som SofaPilot)

Appen krever innlogging med Netlify Identity. Bare personer du inviterer, kommer inn. Hver bruker har sin egen portefølje, journal, quiz og blindtest.

**Oppsett (én gang):**

1. Netlify: **Project configuration → Identity**. Slå på Identity, og velg **Invite only** under Registration.
2. Gå til **Environment variables** og legg inn `ADMIN_EMAILS` med e-postadressen din. Flere adresser skilles med komma. De som står her, er alltid admin. `APP_PIN` trengs ikke lenger og kan slettes.
3. Publiser på nytt: **Deploys → Trigger deploy**.
4. Åpne appen og velg **Glemt passord?** med e-postadressen din, eller inviter deg selv under **Identity → Invite users** i Netlify. Lag passord via lenken i e-posten.

**Invitere andre:** gå til **Oppsett → Brukere** i appen og skriv inn e-postadressen. Den inviterte får en e-post, trykker på lenken, velger passord og er inne. Samme sted kan du sende invitasjonen på nytt, gjøre andre til admin eller fjerne tilgang.

**Gruppe-fanen:**

- **Toppliste:** avkastning mot indeksfondet, avkastning, verdi, antall handler, treffprosent i blindtest og antall quizer.
- **Feed:** kjøp og salg med begrunnelser de siste 60 dagene.
- **Deling:** hver bruker velger selv under **Oppsett → Deg** om de vises på topplisten og i feeden.

**Porteføljen fra PIN-versjonen** flyttes automatisk til den første admin som logger inn.

## Hvor dataene lagres

- **Grenen `data`:** GitHub Actions lagrer dataene her. Grenen overskrives hver gang, så repoet vokser ikke.
- **Appen:** leser dataene direkte fra `raw.githubusercontent.com/<bruker>/innsideradar/data/public/data/`. Netlify publiserer derfor ikke på nytt ved dataoppdatering, og det koster ingen credits.
- **Annet repo- eller brukernavn:** endre `REPO` i `public/datasource.js` og standardadressen i `netlify/functions/varsler.mjs`.
- **Repoet må være offentlig** for at appen skal kunne lese dataene.

## Papirer du legger til selv

- **Krever variabel:** GitHub-variabelen `SITE_URL` må være satt, under *Settings → Secrets and variables → Actions → Variables*, for eksempel `https://innsideradar-kenneth.netlify.app`.
- **Slik henger det sammen:** appen lagrer listen i Netlify. Actions henter den fra `/api/ekstra` og tar papirene med i neste kjøring.
- **Valuta:** kurser i andre valutaer regnes om til kroner i porteføljen med dagens valutakurs fra Yahoo.

## Datakilder

| Hva | Kilde | Hvor ofte |
|---|---|---|
| Aksjeliste for Oslo Børs | Euronext (CSV) | Én gang i uken |
| Kurser | Yahoo Finance (aksjer 2 år, fond 5 år, deretter bare nye dager) | Hver time på hverdager |
| Innsidehandel | Newsweb, Oslo Børs | Hver time |
| Short | Finanstilsynet | Hver time |
| Nøkkeltall, rapportdatoer og fondskostnad | Yahoo Finance | Én gang i døgnet |
| Børsmeldinger per selskap | Newsweb | Én gang i døgnet |
| Olje og valuta | Yahoo Finance | Hver time |
| Styringsrente | Norges Bank | Hver time |
| Laksepris | SSB, tabell 03024 (ukentlig) | Hver time |
| Strøm | hvakosterstrommen.no (ENTSO-E) | Hver time |
| Varsler | Netlify-funksjon `varsler` | Hver time |

Hver kilde er valgfri. Feiler én, beholdes forrige data, og resten av appen virker som før.

## Filer

| Fil | Hva den gjør |
|---|---|
| `scripts/fetch.mjs`, `parse.mjs` | Innsidehandel og short |
| `scripts/prices.mjs`, `universe.json` | Kurser. Endre utvalget i `universe.json` |
| `scripts/fundamentals.mjs` | Nøkkeltall og fondskostnader |
| `scripts/news.mjs` | Børsmeldinger per selskap |
| `scripts/macro.mjs` | Makrotall |
| `public/core.js` | Felles tilstand, data og synk |
| `public/views/*.js` | Visningene (marked, aksje, portefølje, trening, skole, oppsett) |
| `public/lib/indicators.js` | Indikatorer, mønstre og signaler. Brukes både av appen og av GitHub Actions |
| `public/lib/portfolio.js` | Beholdning og stop-loss/kursmål |
| `public/lib/alerts.js` | Varselregler. Brukes både av appen og av push-funksjonen |
| `public/lib/stats.js` | Avkastning, volatilitet og korrelasjon |
| `public/lib/lessons.js` | Leksjoner og quiz |
| `netlify/functions/portefolje.mjs` | Synk av porteføljen |
| `netlify/functions/push.mjs`, `varsler.mjs` | Push-varsler |

## Begrensninger

- **Yahoo Finance er uoffisielt.** Nøkkeltall krever en «crumb» fra Yahoo, og det kan slutte å virke. Da vises «Ingen nøkkeltall», mens resten virker som før.
- **Selskaper rapporterer i ulik valuta.** Nøkkeltall i andre valutaer enn NOK er merket med valuta.
- **ASK-modellen er forenklet.** Den ser bort fra skjermingsfradrag. Sjekk gjeldende skattesats hos Skatteetaten.
- **Ikke investeringsråd.** Alt innhold er laget for læring.
