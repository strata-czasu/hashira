# Polityka prywatności bota Biszkopt

**Ostatnia aktualizacja:** 27 lipca 2026 r.

## 1. Administrator i kontakt

Administratorem danych osobowych przetwarzanych za pomocą bota Biszkopt („Bot”) jest osoba prowadząca serwer Discord Strata Czasu, działająca pod nazwą użytkownika **defous** („Administrator”).

Z Administratorem można skontaktować się:

- pod adresem e-mail: **[defous@strataczasu.org](mailto:defous@strataczasu.org)**;
- za pośrednictwem administracji serwera Discord Strata Czasu;
- poprzez wiadomość prywatną wysłaną do Bota.

W sprawach dotyczących przetwarzania danych osobowych, uzyskania kopii danych, ich sprostowania, ograniczenia przetwarzania lub usunięcia należy skontaktować się z Administratorem za pomocą wskazanego adresu e-mail.

Wiadomości prywatne wysłane do Bota mogą być przekazywane do wewnętrznego kanału dostępnego dla upoważnionych członków administracji serwera.

## 2. Zakres polityki i role podmiotów

Polityka dotyczy przetwarzania podczas korzystania z Bota, jego komend, przycisków, formularzy, wiadomości prywatnych oraz funkcji działających automatycznie na skonfigurowanych serwerach. Wszystkie funkcje opisane w polityce są włączone w środowisku produkcyjnym, chyba że wprost wskazano inaczej.

To my określamy cele wykorzystania danych przez Bota. Discord przetwarza dane także dla własnych celów jako odrębny administrator platformy. Dla użytkowników z Europejskiego Obszaru Gospodarczego administratorem danych przetwarzanych przez samą platformę jest Discord Netherlands B.V.; dla pozostałych użytkowników co do zasady Discord Inc. Szczegóły określa [polityka prywatności Discorda](https://discord.com/privacy).

Pozostali dostawcy wskazani w punkcie 9 mogą działać jako podmioty przetwarzające Administratora albo jako niezależni administratorzy, zależnie od właściwej usługi i zawartej umowy.

## 3. Źródła danych

Dane pochodzą:

- bezpośrednio od użytkownika, gdy wysyła wiadomość, załącznik, formularz, głos, zgłoszenie albo używa komendy lub przycisku;
- z Discord API i zdarzeń Gateway, w szczególności z profilu Discord, członkostwa, ról, wiadomości, reakcji i stanu kanału głosowego;
- od moderatorów i administratorów, którzy tworzą wpisy moderacyjne, konfigurują role lub opisują zdarzenia;
- od innych użytkowników, np. gdy zgłaszają zachowanie, wskazują wiadomość albo wybierają użytkownika w funkcji społecznościowej;
- z działania Bota, który wylicza statystyki, salda, wyniki, czasy sesji, statusy zadań i rezultaty wydarzeń;
- od dostawców technicznych, gdy zwracają wynik transkrypcji, odpowiedź AI, raport błędu albo dane zaimportowane z udostępnionego linku.

Źródła Discord API nie są publicznymi rejestrami; są dostępne Botowi na podstawie uprawnień aplikacji, konfiguracji serwera i zasad Discorda.

## 4. Czy podanie danych jest obowiązkowe

Dane przekazywane w komendach, formularzach, głosowaniach, giveawayach, ustawieniach profilu i wiadomościach prywatnych są podawane dobrowolnie, ale bez danych wymaganych przez daną funkcję Bot nie wykona żądanej operacji.

Identyfikatory konta, serwera, kanału i wiadomości oraz zdarzenia członkostwa, wiadomości i kanałów głosowych są przetwarzane automatycznie podczas przebywania i aktywności na serwerze. Bez tego nie mogą działać moderacja, role, logi, statystyki i część wydarzeń. Zaprzestanie takiego przetwarzania dla pojedynczego użytkownika może wymagać opuszczenia serwera albo wyłączenia przez nas danej funkcji.

## 5. Kategorie przetwarzanych danych

### 5.1. Konto i członkostwo

- identyfikator użytkownika Discord, nazwa użytkownika, wyświetlana nazwa, pseudonim i avatar;
- identyfikatory serwera, kanałów, wiadomości, emoji i ról;
- role, uprawnienia, przynależność do zespołów oraz informacje o dołączeniu, opuszczeniu serwera i zmianach profilu;
- dane potrzebne do ponownego nadania ról, ograniczeń lub ustawień po powrocie na serwer.

Bot nie otrzymuje od Discorda adresu e-mail, hasła ani adresu IP użytkownika.

### 5.2. Wiadomości, załączniki i formularze

- treść wiadomości, komend, formularzy, zgłoszeń, linków, elementów osadzonych i załączników dostępnych Botowi;
- treść wiadomości prywatnych wysyłanych do Bota;
- treść edytowanych i usuniętych wiadomości oraz adresy ich załączników;
- treść skonfigurowanych wiadomości przypiętych („sticky messages”).

Treść zwykłych wiadomości nie jest zapisywana w tabeli statystyk aktywności. Tabela ta zawiera autora, identyfikator wiadomości, kanał i czas wysłania. Treść może jednak zostać utrwalona w kanałach logów Discorda, zgłoszeniu, konfiguracji wiadomości przypiętej albo przetworzona przez funkcję AI.

### 5.3. Aktywność tekstowa i głosowa

- daty, kanały i identyfikatory wiadomości;
- identyfikatory używanych niestandardowych emoji i czas użycia;
- kanał głosowy, czas dołączenia i wyjścia oraz czas spędzony w stanach wyciszenia, ogłuszenia, transmisji ekranu, włączonego wideo lub przebywania samemu.

Bot nie nagrywa ani nie zapisuje treści rozmów głosowych.

### 5.4. Moderacja i bezpieczeństwo

- ostrzeżenia, wyciszenia, ograniczenia dostępu, ultimata i bany;
- powody, daty, czas trwania oraz identyfikatory użytkownika i moderatora;
- historia zmian, anulowania i logicznego usunięcia wpisów;
- zgłoszenia użytkowników i wskazane w nich osoby, wiadomości oraz okoliczności.

### 5.5. Funkcje społecznościowe i rozrywkowe

- salda, portfele, transakcje, przedmioty, zakupy i ustawienia profilu;
- udział i wyniki giveawayów, wydarzeń, rankingów i zespołów;
- udział w głosowaniach prywatnych, oddane głosy i rezygnacja z kolejnych głosowań;
- relacje profilowe, odznaki, tytuły i kolory profilu;
- postępy i rezultaty czasowych wydarzeń oraz gier serwerowych.

### 5.6. Diagnostyka

Sentry jest używane do raportowania błędów i danych wydajnościowych. Raport może zawierać identyfikator i nazwę użytkownika, typ interakcji, nazwę i parametry komendy, identyfikator i nazwę kanału, identyfikator wskazanej wiadomości lub użytkownika, treść wyjątku, ślad wykonania i dane wydajnościowe.

## 6. Cele, podstawy prawne, retencja i odbiorcy

Podstawą większości operacji jest art. 6 ust. 1 lit. f RODO, czyli nasz prawnie uzasadniony interes. Dobrowolne uruchomienie funkcji nie jest w tej polityce traktowane samo w sobie jako zgoda ani jako dowód zawarcia umowy. Art. 6 ust. 1 lit. c RODO ma zastosowanie tylko wtedy, gdy konkretny przepis nakłada na nas obowiązek przetwarzania.

| Cel                                                                         | Kategorie danych                                                                           | Podstawa prawna i uzasadniony interes                                                                                                                                            | Obecny okres lub kryterium przechowywania                                                                                                                                                                       | Odbiorcy                                                                                         |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Obsługa konta, komend, ról i ustawień                                       | identyfikatory, członkostwo, role, dane komend i ustawień                                  | art. 6 ust. 1 lit. f RODO — zapewnienie działania Bota i ciągłości ustawień użytkownika                                                                                          | baza nie ma automatycznego terminu; dane pozostają do ręcznego usunięcia, uwzględnienia skutecznego żądania użytkownika albo zakończenia działania Bota, więc mogą być przechowywane bezterminowo               | Administrator, Discord, Oracle Cloud Infrastructure                                              |
| Statystyki wiadomości, emoji, głosu, rankingi i wydarzenia                  | metadane wiadomości, emoji, sesje głosowe, wyniki i postępy                                | art. 6 ust. 1 lit. f RODO — prowadzenie statystyk, rankingów i mechanik społecznościowych                                                                                        | baza nie ma automatycznego terminu; rekordy mogą pozostawać bezterminowo, dopóki nie wdrożymy harmonogramu usuwania lub nie uwzględnimy skutecznego żądania                                                     | Administrator, Discord, Oracle Cloud Infrastructure                                              |
| Logowanie edycji i usunięć wiadomości, zmian ról, pseudonimów i członkostwa | treść, załączniki, profil, role, daty i kanały                                             | art. 6 ust. 1 lit. f RODO — bezpieczeństwo, egzekwowanie regulaminu i audyt działań                                                                                              | log pozostaje w kanale Discord do ręcznego usunięcia wiadomości lub kanału; nie skonfigurowano automatycznego terminu                                                                                           | Administrator, upoważniona administracja, Discord                                                |
| Moderacja, obsługa zgłoszeń i bezpieczeństwo                                | historia sankcji, powody, treść zgłoszeń, dane moderatorów i użytkowników                  | art. 6 ust. 1 lit. f RODO — ochrona społeczności, przeciwdziałanie nadużyciom, spójność i możliwość kontroli działań; art. 6 ust. 1 lit. c, gdy zachowanie danych wynika z prawa | wpisy moderacyjne i rekordy oznaczone jako usunięte logicznie nie mają automatycznego terminu i mogą pozostawać bezterminowo; zgłoszenia na Discordzie pozostają do ręcznego usunięcia                          | Administrator, upoważniona administracja, Discord, organy publiczne gdy wymaga tego prawo        |
| Ekonomia, profile, zespoły, głosowania i giveawaye                          | salda, transakcje, przedmioty, głosy, udział, wyniki i ustawienia profilu                  | art. 6 ust. 1 lit. f RODO — prowadzenie dobrowolnych funkcji społecznościowych oraz zapewnienie ich integralności                                                                | większość rekordów nie ma automatycznego terminu; część jest usuwana logicznie i może pozostawać bezterminowo                                                                                                   | Administrator, Discord, Oracle Cloud Infrastructure; w określonych raportach także bin.debile.co |
| Wiadomości prywatne, masowe wiadomości i komunikacja administracji          | treść, załączniki, identyfikatory nadawcy i odbiorcy                                       | art. 6 ust. 1 lit. f RODO — komunikacja, pomoc użytkownikom i prowadzenie społeczności                                                                                           | wiadomości pozostają w Discordzie do ich ręcznego usunięcia; Bot nie kopiuje ich do PostgreSQL, ale przekazuje przychodzące wiadomości do kanału administracji                                                  | Administrator, upoważniona administracja, Discord                                                |
| Asystent AI dla moderacji                                                   | treść, obrazy, audio i transkrypcje, profil autora, wskazane wiadomości i historia sankcji | art. 6 ust. 1 lit. f RODO — usprawnienie moderacji i analiza kontekstu przy zachowaniu odpowiedzialności administracji                                                           | Bot nie tworzy trwałych obiektów OpenAI; domyślne logi przeciwdziałania nadużyciom Chat Completions mogą być przechowywane do 30 dni; wynik jest publikowany w wątku Discorda i pozostaje do ręcznego usunięcia | Administrator, Discord, OpenAI Ireland Ltd. i jej podmioty podprzetwarzające                     |
| Diagnostyka i bezpieczeństwo techniczne                                     | identyfikatory, komenda, kanał, wyjątek, ślad i metryki                                    | art. 6 ust. 1 lit. f RODO — wykrywanie awarii, bezpieczeństwo i utrzymanie usługi                                                                                                | dane diagnostyczne pozostają w Sentry do automatycznego usunięcia zgodnie z retencją konta usługi; lokalne logi podlegają rotacji na serwerze                                                                   | bezpośredni programiści, Oracle Cloud Infrastructure, Functional Software, Inc. (Sentry)         |
| Kolejki i aktywne zadania                                                   | dane zdarzenia, aktywna sesja głosowa i zaplanowane działanie                              | art. 6 ust. 1 lit. f RODO — niezawodne wykonanie funkcji Bota                                                                                                                    | kolejki aktywności są zwykle opróżniane po przetworzeniu partii; aktywna sesja głosowa pozostaje w Redisie do zakończenia lub obsługi sesji osieroconej; zadanie pozostaje do wykonania lub anulowania          | Administrator, Oracle Cloud Infrastructure                                                       |

Brak automatycznego terminu oznacza, że dane mogą pozostać zapisane bezterminowo. Opuszczenie serwera nie powoduje ich automatycznego usunięcia.

Kopie zapasowe wykonujemy codziennie i przechowujemy przez 14 dni w Cloudflare R2. Po upływie tego okresu są automatycznie usuwane.

## 7. Uprzywilejowane uprawnienia Discorda

Bot korzysta z:

- **Message Content** — do obsługi wiadomości prywatnych, analizy niestandardowych emoji, funkcji zależnych od treści, logowania edycji i usunięć oraz asystenta moderacji uruchamianego przez wzmiankę;
- **Server Members / Guild Members** — do obsługi ról i moderacji, przywracania ustawień po powrocie, głosowań, wiadomości grupowych, wydarzeń oraz logowania zmian członkostwa, ról i pseudonimów.

Nie korzystamy z **Guild Presences** i nie przechowujemy statusów obecności ani aktywności wyświetlanej w profilu Discorda.

## 8. Asystent AI i decyzje moderacyjne

Asystent AI jest dostępny tylko dla członków posiadających uprawnienia moderatorskie i uruchamia się po oznaczeniu Bota. Analizuje polecenie moderatora oraz, zależnie od żądania, treść wiadomości wywołującej i wiadomości, na którą odpowiedziano, autora i pseudonim, obrazy, transkrypcje audio, wiadomości pobrane po identyfikatorze oraz maksymalnie pięć ostatnich aktywnych ostrzeżeń lub wyciszeń wskazanego użytkownika.

Asystent może określić użytkownika, powód i czas wyciszenia, a następnie bez osobnego ekranu zatwierdzenia wywołać narzędzie nakładające wyciszenie. Moderator inicjuje użycie AI, ale obecny kod nie wymaga, aby człowiek zatwierdził konkretną sankcję przed jej wykonaniem. Konsekwencją może być czasowe odebranie możliwości komunikowania się lub inne skutki wynikające z roli wyciszenia na serwerze.

Osoba, której dotyczy sankcja, może poprosić o jej ponowną ocenę przez moderatora, który nie uczestniczył w pierwotnej decyzji, albo przez właściciela serwera. Wniosek można złożyć kanałem z punktu 1. Sprawdzimy kontekst zdarzenia, dane wejściowe, historię istotnych sankcji oraz adekwatność powodu i czasu wyciszenia. Wynik przekażemy w ciągu 7 dni od potwierdzenia kontroli nad kontem.

### 8.1. Konfiguracja OpenAI

Korzystamy z API OpenAI do obsługi asystenta i transkrypcji nagrań. Udostępnianie danych do trenowania modeli jest wyłączone, a Bot nie zapisuje wywołań jako stanu aplikacji. OpenAI może przechowywać logi bezpieczeństwa do 30 dni. Szczegóły znajdują się w [dokumentacji OpenAI](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint).

## 9. Odbiorcy i transfery międzynarodowe

Dane mogą być dostępne dla:

- upoważnionych członków administracji serwera, odpowiednio do obowiązków;
- bezpośrednich programistów utrzymujących Bota;
- Discord Netherlands B.V. oraz Discord Inc. jako dostawców platformy;
- OpenAI Ireland Ltd. oraz jej podmiotów podprzetwarzających przy użyciu AI;
- Functional Software, Inc. (Sentry) i jej podmiotów podprzetwarzających;
- Oracle Cloud Infrastructure — hosting Bota, bazy danych i pamięci podręcznej;
- Cloudflare, Inc. — przechowywanie kopii zapasowych w usłudze R2;
- `bin.debile.co` przy generowaniu przez administratora raportów tekstowych dotyczących głosowania, uczestników lub błędów wysyłki;
- operatora Discohook (`discohook.app`) przy imporcie lub udostępnianiu konfiguracji wiadomości przypiętych;
- organów publicznych, gdy udostępnienie jest wymagane przez prawo.

Nie sprzedajemy danych osobowych i nie wykorzystujemy ich do reklamy behawioralnej.

Discord, OpenAI, Sentry, Oracle i Cloudflare mogą przetwarzać dane poza EOG. W zależności od odbiorcy transfer jest zabezpieczony decyzją Komisji Europejskiej stwierdzającą odpowiedni stopień ochrony, EU–U.S. Data Privacy Framework, standardowymi klauzulami umownymi albo wiążącymi regułami korporacyjnymi.

`bin.debile.co` otrzymuje raporty administracyjne generowane na żądanie, a Discohook — konfiguracje wiadomości przypiętych. Nie mamy potwierdzenia, w jakim państwie ich operatorzy przetwarzają dane, dlatego przekazujemy wyłącznie informacje niezbędne do wykonania wybranej funkcji. Więcej informacji o zabezpieczeniach transferu można uzyskać przez kontakt wskazany w punkcie 1.

## 10. Prawa użytkownika

W zakresie przewidzianym przez prawo użytkownik może zażądać:

- informacji o przetwarzaniu i kopii danych;
- sprostowania nieprawidłowych danych;
- usunięcia danych;
- ograniczenia przetwarzania;
- przeniesienia danych, gdy ma ono zastosowanie;
- wniesienia sprzeciwu wobec przetwarzania opartego na art. 6 ust. 1 lit. f RODO;
- informacji o wykorzystaniu AI oraz ponownej oceny sankcji przez człowieka.

Realizacja żądania może być ograniczona, jeżeli dane są nadal niezbędne do ochrony społeczności, rozpatrywania roszczeń, zachowania spójności transakcji albo wykonania obowiązku prawnego. Usunięcie danych z PostgreSQL nie usuwa automatycznie wiadomości i logów znajdujących się na Discordzie ani danych przechowywanych zgodnie z retencją dostawcy.

Żądanie można przesłać kanałem wskazanym w punkcie 1. Możemy poprosić o potwierdzenie kontroli nad właściwym kontem Discord i odpowiemy w terminie wymaganym przez RODO. Użytkownik może złożyć skargę do właściwego organu nadzorczego, w Polsce do Prezesa Urzędu Ochrony Danych Osobowych.

## 11. Bezpieczeństwo

Bota, PostgreSQL i Redis utrzymujemy w Oracle Cloud Infrastructure. Baza danych nie jest dostępna bezpośrednio z publicznego Internetu, a dostęp do niej mają wyłącznie bezpośredni programiści utrzymujący Bota. Funkcje administracyjne i kanały logów są ograniczone rolami i uprawnieniami Discorda, Bot opuszcza serwery spoza skonfigurowanej listy, a tokeny i klucze usług są przekazywane aplikacji przez konfigurację środowiska i nie są przechowywane w repozytorium.

Żadna metoda ochrony nie gwarantuje całkowitego bezpieczeństwa. Incydenty dotyczące danych można zgłaszać nam kanałem z punktu 1.

## 12. Zmiany polityki

Polityka może zostać zaktualizowana po zmianie funkcji Bota, zakresu danych, retencji, dostawców lub przepisów. Data ostatniej aktualizacji znajduje się na początku dokumentu. Istotne zmiany będą ogłaszane na serwerze Strata Czasu.
