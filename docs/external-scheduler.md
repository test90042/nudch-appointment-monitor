# Externý plánovač cez cron-job.org

GitHub plánované workflow sú služba typu best effort a môžu niektoré behy oneskoriť alebo úplne vynechať. Preto produkčné kontroly spúšťa bezplatný externý plánovač cez GitHub REST API. Token nikdy nepatrí do repozitára ani do logov.

## 1. Obmedzený GitHub token

V GitHub **Settings → Developer settings → Personal access tokens → Fine-grained tokens** vytvorte token:

- Resource owner: `test90042`
- Repository access: iba `nudch-appointment-monitor`
- Repository permissions: iba **Actions: Read and write**
- nastavte si pripomienku pred dátumom expirácie

## 2. Pravidelná kontrola

V cron-job.org vytvorte HTTPS úlohu s intervalom každých 6 minút:

- URL: `https://api.github.com/repos/test90042/nudch-appointment-monitor/actions/workflows/monitor.yml/dispatches`
- metóda: `POST`
- hlavička `Authorization`: `Bearer VÁŠ_FINE_GRAINED_TOKEN`
- hlavička `Accept`: `application/vnd.github+json`
- hlavička `X-GitHub-Api-Version`: `2022-11-28`
- hlavička `Content-Type`: `application/json`
- telo:

```json
{"ref":"main","inputs":{"dry_run":"false","external_trigger":"true"}}
```

Úspešný GitHub dispatch vracia HTTP `204`. V GitHub Actions sa beh zobrazí s názvom **External scheduled check**. Iný úspešný HTTP kód nepovažujte za dôkaz spustenia workflow.

## 3. Denný report

Vytvorte druhú úlohu raz denne, napríklad o 08:15 slovenského času:

- URL: `https://api.github.com/repos/test90042/nudch-appointment-monitor/actions/workflows/daily-report.yml/dispatches`
- rovnaká metóda a hlavičky
- telo:

```json
{"ref":"main"}
```

Report počíta pôvodné GitHub `schedule` behy aj behy označené **External scheduled check**, ale ignoruje ručné testy.

## 4. Overenie

V cron-job.org použite **Test run**. Skontrolujte HTTP 204 a následne zelený beh **External scheduled check** v GitHub Actions. Produkčné nastavenie bolo overené tromi po sebe idúcimi automatickými behmi a natívne bloky `schedule` boli odstránené, aby sa kontroly neduplikovali. Pri chybe 401/403 skontrolujte, či token stále existuje a má oprávnenie Actions: Read and write.
