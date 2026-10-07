# Innsideradar

Appen er et læringsverktøy for aksjer og fond på Oslo Børs. Den viser innsidehandel og short, kurser med candlestick-grafer, nøkkeltall og makro. I tillegg har den fiktiv handel med journal og vurdering, trening og en skole. Appen kan installeres på PC og mobil (PWA).

## Faner

| Fane | Innhold |
|---|---|
| **Radar** | Innsidehandel, mest shortede aksjer, og «dragkamp» (selskaper der innsidere kjøper mens fond shorter) |
| **Marked** | Makrostripe (olje, USD/NOK, EUR/NOK, styringsrente, laks, strøm), 53 aksjer og 9 fond med signaler. Filteret «Fond» viser også en sammenligning av kostnad, avkastning over 1, 3 og 5 år, svingninger, største fall og likhet med indeks |
| **Aksjeside** | Se egen tabell under |
| **Portefølje** | Se egen tabell under |
| **Trening** | Blindtest på historiske grafer (med statistikk over egne gjetninger og over hvor ofte signalene traff), oversikt over quizene, sparekalkulator (hva kostnader koster deg over tid) og en ASK-modell |
| **Skole** | 11 leksjoner med quiz |
| **Oppsett** | PIN for synk, push-varsler, kurtasje og ny start |

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

## Datakilder

| Hva | Kilde | Hvor ofte |
|---|---|---|
| Kurser | Yahoo Finance (aksjer 2 år, fond 5 år) | Hver time på hverdager |
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
