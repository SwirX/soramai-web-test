class VideoLink {
    constructor(link = "", hls = false, mp4 = false, resolutionStr = "", src = "", rawUrls = {}) {
        this.link = link;
        this.hls = hls;
        this.mp4 = mp4;
        this.resolutionStr = resolutionStr;
        this.src = src;
        this.rawUrls = rawUrls;
    }
}

export class AllAnime {
    constructor() {
        this.agent = "Mozilla/5.0 (Windows NT 6.1; Win64; rv:109.0) Gecko/20100101 Firefox/109.0";
        this.allanimeApi = "https://api.allanime.day";
        this.allanimeBase = "https://allanime.to";
        this.lang = "en";
        this.mode = "sub";
        this.internalLinks = [
            "Luf-mp4",
            "Sak",
            "Default",
            "S-mp4",
        ];
        this.endpoint = "";
        this.initialize();
    }

    async initialize() {
        try {
            const response = await fetch(`${this.allanimeBase}/getVersion`);
            const data = await response.json();
            this.endpoint = data.episodeIframeHead;
        } catch (error) {
            console.error('Error initializing:', error);
        }
    }

    decrypt(providerId) {
        let decrypted = '';
        for (let i = 0; i < providerId.length; i += 2) {
            const hexValue = providerId.substring(i, i + 2);
            const dec = parseInt(hexValue, 16);
            const xor = dec ^ 56;
            const octValue = xor.toString(8).padStart(3, '0');
            decrypted += String.fromCharCode(parseInt(octValue, 8));
        }
        return decrypted;
    }

    isInternal(link) {
        return this.internalLinks.includes(link);
    }

    async getPopular(page) {
        try {
            const response = await fetch(`${this.allanimeApi}/api?variables=${encodeURIComponent(JSON.stringify({
                type: "anime",
                size: 26,
                dateRange: 7,
                page: page
            }))}&query=${this.popularQuery}`, {
                headers: {
                    Referer: this.allanimeBase,
                    "User-Agent": this.agent
                }
            });
            const data = await response.json();
            return data.data.queryPopular.recommendations;
        } catch (error) {
            console.error('Error fetching popular:', error);
        }
    }

    async getLatestUpdate(page) {
        try {
            const response = await fetch(`${this.allanimeApi}/api?variables=${encodeURIComponent(JSON.stringify({
                search: {
                    allowAdult: false,
                    allowUnknown: false,
                },
                limit: 26,
                page: page,
                translationType: this.mode,
                countryOrigin: "ALL"
            }))}&query=${this.searchQuery}`, {
                headers: {
                    Referer: this.allanimeBase,
                    "User-Agent": this.agent
                }
            });
            const data = await response.json();
            return data.data.shows.edges;
        } catch (error) {
            console.error('Error fetching latest update:', error);
        }
    }

    async getSearch(page, query) {
        try {
            const response = await fetch(`${this.allanimeApi}/api?variables=${encodeURIComponent(JSON.stringify({
                search: {
                    query: query,
                    allowAdult: false,
                    allowUnknown: false,
                },
                limit: 50,
                page: page,
                translationType: this.mode,
                countryOrigin: "ALL"
            }))}&query=${this.searchQuery}`, {
                headers: {
                    Referer: this.allanimeBase,
                    "User-Agent": this.agent
                }
            });
            const data = await response.json();
            const edges = data.data.shows.edges;
            return edges.map(edge => new Anime(edge._id, edge.name, edge.thumbnail, parseInt(edge.episodeCount || "0"), edge.__typename, edge.score));
        } catch (error) {
            console.error('Error fetching search results:', error);
        }
    }

    async getAnimeDetails(animeId) {
        try {
            const response = await fetch(`${this.allanimeApi}/api?variables=${encodeURIComponent(JSON.stringify({ _id: animeId }))}&query=${this.detailsQuery}`, {
                headers: {
                    Referer: this.allanimeBase,
                    "User-Agent": this.agent
                }
            });
            const data = await response.json();
            return data.data.show;
        } catch (error) {
            console.error('Error fetching anime details:', error);
        }
    }

    async getEpisodesList(animeId) {
        try {
            const response = await fetch(`${this.allanimeApi}/api?variables=${encodeURIComponent(JSON.stringify({ _id: animeId }))}&query=${this.episodesQuery}`, {
                headers: {
                    Referer: this.allanimeBase,
                    "User-Agent": this.agent
                }
            });
            const data = await response.json();
            return data.data.show.availableEpisodesDetail[this.mode];
        } catch (error) {
            console.error('Error fetching episodes list:', error);
        }
    }

    async getEpisodeStreams(animeId, episodeNum) {
        try {
            const response = await fetch(`${this.allanimeApi}/api?variables=${encodeURIComponent(JSON.stringify({
                showId: animeId,
                translationType: this.mode,
                episodeString: `${episodeNum}`
            }))}&query=${this.streamsQuery}`, {
                headers: {
                    Referer: this.allanimeBase,
                    "User-Agent": this.agent
                }
            });
            const data = await response.json();
            return data.data.episode.sourceUrls;
        } catch (error) {
            console.error('Error fetching episode streams:', error);
        }
    }

    async getVideoFromUrl(url, name) {
        try {
            const decryptedUrl = this.decrypt(url.replace("--", ""));
            const response = await fetch(`${this.endpoint}${decryptedUrl.replace("/clock?", "/clock.json?")}`);
            if (!response.ok) {
                return null;
            }
            const data = await response.json();
            return data.links;
        } catch (error) {
            console.error('Error fetching video from URL:', error);
        }
    }

    async getVideoList(animeId, episodeNum) {
        try {
            const episodeStreams = await this.getEpisodeStreams(animeId, episodeNum);
            const videoList = await Promise.all(episodeStreams.filter(stream => this.isInternal(stream.sourceName)).map(async stream => {
                const video = await this.getVideoFromUrl(stream.url, stream.sourceName);
                return video ? video : null;
            }));
            return videoList.flat().map(video => {
                try {
                    const link = video.link;
                    const hls = this.select(video, "hls", "mp4", true);
                    const mp4 = this.select(video, "mp4", "hls", true);
                    const resolution = video.resolutionStr;
                    const src = this.select(video, "src", "");
                    const rawUrls = this.select(video, "rawUrls", {});
                    return new VideoLink(link, hls, mp4, resolution, src, rawUrls);
                } catch (e) {
                    return null;
                }
            }).filter(videoLink => videoLink !== null);
        } catch (error) {
            console.error('Error fetching video list:', error);
        }
    }

    select(video, key, defaultValue, strict = false) {
        const value = video[key];
        if (strict) {
            return value || defaultValue;
        }
        return value ? value : defaultValue;
    }
}

// Usage example
const allAnime = new AllAnime();
(async () => {
    try {
        const popularAnimes = await allAnime.getPopular(1);
        console.log('Popular Animes:', popularAnimes);
    } catch (error) {
        console.error('Error fetching popular animes:', error);
    }
})();
