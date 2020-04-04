const axios = require('axios');
import dompurify from 'dompurify'; // Used to avoid injection attacks

function searchResultsHTML(stores) {
    return stores.map(store => {
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            </a>
        `;
    }).join('')
}

function typeAhead(search) {
    if (!search) return; // Don't run if this page does not have a search box

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');
    searchInput.on('input', function() {
        // if there is no value, hide it
        if (!this.value) {
            searchResults.style.display = 'none';
            return; // stop!
        }

        // show the search results
        searchResults.style.display = 'block';
        searchResults.innerHTML = '';
        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                if (res.data.length) {
                    searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
                    return;
                }

                // Tell them nothing came back
                searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found!</div>`);
            })
            .catch(err => {
                console.error(err);
            });
    });

    // handle keyboard inputs
    searchInput.on('keyup', e => {
        if (![38, 40, 13].includes(e.keyCode)) {
            return; // skip it
        }

        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;

        if (e.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0];
        } else if (e.keyCode === 40) { // if they press down and there isn't one currently selected
            next = items[0];
        } else if (e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length - 1];
        } else if (e.keyCode === 38) {
            next = items[items.length - 1];
        } else if (e.keyCode === 13 && current.href) {
            window.location = current.href;
            return; // stop remainder of function
        }

        console.log(next);

        if (current) {
            current.classList.remove(activeClass);
        }
        next.classList.add(activeClass);

    });

}

export default typeAhead;