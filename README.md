# Monitor termínov NÚDCH

Projekt každých šesť minút skontroluje verejnú stránku Psychiatrickej ambulancie 03 (MUDr. Böhmer). Keď sa objaví text **Najbližší termín**, konkrétny dátum a čas a možnosť **Rezervovať termín**, pošle ntfy push a vytvorí GitHub Issue priradený vášmu účtu. GitHub môže toto priradenie doručiť aj e-mailom.

Monitor nič nerezervuje, neprihlasuje sa a neposiela portálu žiadne osobné ani zdravotné údaje.

## Čo potrebujete

- verejný GitHub repozitár,
- voliteľne aplikáciu [ntfy](https://ntfy.sh/) v telefóne alebo jej webovú aplikáciu,
- GitHub e-mailové upozornenia zapnuté pre priradené Issues.

## Nastavenie ntfy

1. Nainštalujte ntfy z Google Play/App Store alebo otvorte webovú aplikáciu.
2. Vymyslite dlhý náhodný názov témy, ideálne aspoň 32 náhodných znakov. Bezplatná anonymná téma nie je chránená používateľským účtom; jej neuhádnuteľný názov funguje ako heslo.
3. Prihláste sa v aplikácii na túto tému a povoľte upozornenia.
4. Názov témy nevkladajte do kódu ani verejných GitHub premenných. Uloží sa ako secret `NTFY_TOPIC`.

ntfy.sh je pre tento objem bezplatné, ale poskytuje iba „best effort“ dostupnosť bez SLA. Preto monitor zároveň používa GitHub upozornenie.

## Nastavenie GitHub e-mailu

V osobných **GitHub Settings → Notifications** povoľte e-mail pre „Participating and @mentions“. Monitor vytvorí Issue priradený vášmu účtu. Čas doručenia závisí od GitHubu a vášho e-mailového poskytovateľa; nie je garantovaný.

## Nastavenie GitHub projektu

1. Vytvorte verejný repozitár a nahrajte doň tento projekt.
2. Ak chcete aj ntfy push, vytvorte repository secret `NTFY_TOPIC` s náhodným názvom témy. Bez secretu funguje GitHub Issue/e-mail samostatne.
3. Ak repozitár vlastní organizácia, vytvorte repository variable `GITHUB_NOTIFY_USER` s vaším GitHub používateľským menom. Pri osobnom repozitári sa automaticky použije vlastník.
4. V **Settings → Actions → General → Workflow permissions** povoľte **Read and write permissions**. Workflow zapisuje iba `state.json`, mesačný `heartbeat.txt` a notifikačné Issues.
5. Otvorte **Actions → Monitor NUDCH appointments → Run workflow**, ponechajte `dry_run` zapnuté a skontrolujte úspešný výsledok.
6. Spustite workflow ešte raz s `dry_run` vypnutým. Ak je termín nedostupný, upozornenie sa neposiela; prvé príde pri novom termíne alebo po troch chybách portálu.

Naplánované GitHub workflow sa môžu spustiť s veľkým oneskorením alebo byť vynechané. Produkčné kontroly preto používa [externý plánovač cron-job.org](docs/external-scheduler.md), ktorý cez obmedzený GitHub token spúšťa workflow každých šesť minút. Natívny GitHub rozvrh bol po úspešnom overení externých behov odstránený, aby sa kontroly neduplikovali.

### Kontrola, že monitor funguje

Na karte **Actions → Monitor NUDCH appointments** je každý pravidelný beh samostatný záznam. Zelený výsledok znamená, že portál vrátil definitívny stav; červený beh znamená chybu kontroly.

Externý automatický beh má názov **External scheduled check** a ručný test **Manual check**. Oba technicky používajú udalosť `workflow_dispatch`, preto ich rozlišuje názov behu.

Každý deň príde cez ntfy súhrn za posledných 24 hodín. Obsahuje počet úspešných a neúspešných kontrol, samostatné počty externého a GitHub plánovača a čas poslednej úspešnej kontroly. Ak neprebehla ani jedna úspešná kontrola, správa je urgentná. Denný report má byť tiež spustený externou úlohou, aby nebol závislý od nespoľahlivého GitHub rozvrhu.

## Lokálne použitie

```powershell
npm install
npx playwright install chromium
npm run check -- --dry-run
```

Výstup je jeden JSON objekt s hodnotou `available`, `unavailable` alebo `error`. Dry run neposiela upozornenia a nemení `state.json`.

Pre skutočné lokálne odoslanie nastavte `NTFY_TOPIC`, `GITHUB_TOKEN`, `GITHUB_REPOSITORY` a `GITHUB_NOTIFY_USER` ako premenné prostredia a spustite `npm run check` bez `--dry-run`.

## Správanie upozornení

- Nový alebo zmenený termín sa pošle raz.
- Rovnaký termín sa každých šesť minút neopakuje.
- Po troch po sebe idúcich chybách príde jednorazové servisné upozornenie.
- Po obnovení portálu príde správa o náprave.
- GitHub Issue obsahuje stabilný skrytý identifikátor, takže opakovanie nevytvorí duplicitný e-mail.
- Ak ntfy push zlyhá, nový stav sa neuloží a ďalší beh push zopakuje.

> **Dôležité:** Stránka ambulancie uvádza, že na prvé vyšetrenie sa objednáva telefonicky a online rezervovaný prvý termín môže byť automaticky zrušený.
