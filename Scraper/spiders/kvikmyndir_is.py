import scrapy
from datetime import datetime, date
from urllib import parse


def utc_iso8601():
    return datetime.now().replace(microsecond=0).isoformat()

def to_uct_iso8601(hour_minute):
    return datetime.combine(date.today(), datetime.strptime(hour_minute,'%H:%M').time()).replace(microsecond=0).isoformat()

def parse_queries(url):
    return dict(parse.parse_qsl(parse.urlsplit(url).query))

class kvikmyndir_is(scrapy.Spider):
    name = "kvikmyndir_is"  # name of our project. This will enable other features in future
    allowed_domains = ["kvikmyndir.is"]  # our crawler will ignore links not mentioned in this list

    custom_settings = {
        'CONCURRENT_REQUESTS': 2,
        'FEED_URI': f'scraped_data/{utc_iso8601()} - {name}.json',
        'FEED_FORMAT': 'json',
        'FEED_EXPORT_ENCODING': 'utf-8',
        'FEED_EXPORT_INDENT': 4,
    }

    headers = {
        'authority': 'kvikmyndir.is/',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,la;q=0.7',
        'cache-control': 'max-age=0',
        'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    }

    def start_requests(self):
        yield scrapy.Request(
            url='https://www.kvikmyndir.is/bio/syningatimar/',
            callback=self.parse_showtimes,
            headers=self.headers,
        )

    def parse_movie(self, response):
        icon = response.css('div.badge > img::attr(src)').get() 
        yield {
            'title': response.css('h1::text').get().strip(),
            'alt_title': alt_title.get().strip()[1:-1] if (alt_title := response.css('div.top_details').css('h4::text')) else '',
            'kvikmyndir_is_id': int(parse_queries(response.url)['id']),
            'release_year': int(response.css('span.year::text').get().strip()),
            'poster_url': response.css('div.poster').css('a::attr(href)').get().strip(),
            'content_rating_in_years': 0 if icon is None or 'xl.png' in icon else 12 if 'x12.png' in icon else 16,
            'scrape_url': response.url,
            'description': response.css('p.description::text').get().strip(),
            'genres': genres if (genres := response.css('div.genres').css('span::text').getall()) else [],
            'duration_in_mins': int(response.css('span.duration::text').get().replace('mín', '').replace('MÍN', '').strip()),
            'rating_urls': set(response.css('div.movie-ratings > div.rating-box > a::attr(href)').getall()),
            'language': response.css('div.combined_details > span:nth-child(2)::text').get().strip(),
        } | response.meta['movie']
    
    def parse_trailer(sefl, response):
        *_, youtube_id = parse.urlsplit(response.css('iframe::attr(src)').get().strip()).path.split('/')
        yield {'trailer_url' : f'https://www.youtube.com/watch?v={youtube_id}'} | response.meta['movie']
        

    def parse_showtimes(self, response):
        for movie in response.css('div.stimar'):
            trailer_url = movie.css('div.poster').css('div.skodatrailer::attr(data-src)').get()
            parsed_movie = {
                'showtimes': [
                    {
                        'time': to_uct_iso8601(time),
                        'cinema': cinema.css('h3::text').get().strip(),
                        'purchase_url': showtime.css('a.rate::attr(href)').get().strip(),
                        'hall': showtime.css('div.salur::text').get().strip(),
                        'tags': list(filter(None, (tag.get().strip() if (tag := showtime.css(selector)) else None for selector in ('div.bola::text', 'div.tegund::text')))),
                    } 
                    for cinema in movie.css('div.biotimar') 
                    for showtime in cinema.css('li.qtip.tip-top') 
                    if (time := showtime.css('a.rate::text').get().replace('.', ':').strip())
                ],
            }
            response.follow(trailer_url, self.parse_trailer, meta={'movie': parsed_movie})
            yield response.follow(movie.css('a.movie_title::attr(href)').get(), self.parse_movie, meta={'movie': parsed_movie})