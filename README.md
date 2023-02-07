# Hvað er í bíó? (scraper)

Sækir upplýsingar um hvað er í bíó af [kvikmyndir.is](www.kvikmyndir.is) og vistar í `kvikmyndir_is.json` skrá.

Dæmi um `kvikmyndir_is.json`:

```json
[
  {
    "title": "Napóleonsskjölin",
    "alt_title": "Operation Napoleon",
    "kvikmyndir_is_id": 14384,
    "release_year": 2023,
    "poster_url": "https://kvikmyndir.is/images/poster/327092458_3367804013538075_157996108085253869_n-1674479787.jpg",
    "content_rating_in_years": 12,
    "scrape_url": "https://kvikmyndir.is/mynd/?id=14384",
    "description": "Þegar bróðir lögfræðingsins Kristínar rekst á þýskt flugvélarflak úr seinni heimstyrjöld á toppi Vatnajökuls, dragast þau bæði inn í atburðarás upp á líf og dauða, hundelt af hópi manna sem skirrist einskis við að halda áratuga gamalt leyndarmál.",
    "genres": ["Spennutryllir", "Íslensk mynd"],
    "duration_in_mins": 112,
    "rating_urls": ["http://imdb.com/title/tt15485390"],
    "language": "Íslenska",
    "showtimes": [
      {
        "time": "2023-02-07T16:00:00",
        "cinema": "Sambíóin Kringlunni",
        "purchase_url": "http://www.sambio.is/websales/show/351850/",
        "hall": "Salur 1",
        "tags": []
      },
      {
        "time": "2023-02-07T16:20:00",
        "cinema": "Sambíóin Kringlunni",
        "purchase_url": "http://www.sambio.is/websales/show/352257/",
        "hall": "Ásberg",
        "tags": []
      },
      // ...
    ],
  }
  // ...
]
```