import { AllAnime } from "./providers/allanime.js";

window.onload = async () => {
    const currentUrl = window.location.href;

    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search);

    var query = params.get("q");

    let allanime = new AllAnime();
    await allanime.getSearch(1, query).then((results) => {
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';
        data.forEach(anime => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = anime.url;
            a.textContent = anime.title;
            li.appendChild(a);
            resultsList.appendChild(li);
        });
    });
}