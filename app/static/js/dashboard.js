document.addEventListener('DOMContentLoaded', () => {

    // --- API KEYS ---
    // This key is public and safe to use on the client-side for OpenTripMap.
    const TRIPMAP_API_KEY = "5ae2e3f221c38a28845f05b60a339f36bd2e48ff06daa20928a400e2";
    // IMPORTANT: Replace with your actual Google AI Studio API Key
    const GEMINI_API_KEY = "PASTE_YOUR_GOOGLE_AI_STUDIO_KEY_HERE";

    //--- Element Selectors ---
    const addPlanButton = document.querySelector('.add-plan-btn');
    const addDestinationBtn = document.querySelector('.add-destination-btn');
    const destinationsContainer = document.getElementById('destinations-container');
    const planInputsContainer = document.querySelector('.plan-inputs');
    const wrapper = document.querySelector('.dashboard-content-wrapper');
    const spotResultsContainer = document.querySelector('.spot-results-container');
    const geminiModal = document.getElementById('gemini-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    let destinationCount = 1;

    // --- Function to add a new destination input field ---
    addDestinationBtn.addEventListener('click', () => {
        destinationCount++;
        const newDestinationWrapper = document.createElement('div');
        newDestinationWrapper.className = 'destination-input-wrapper';
        newDestinationWrapper.style.marginTop = '15px';
        newDestinationWrapper.innerHTML = `
            <div class="input-group">
                <i class="fa-solid fa-map-pin"></i>
                <input type="text" class="destination-input" placeholder="Destination ${destinationCount}">
            </div>
            <button class="spot-search-btn" title="Search for famous spots">
                <i class="fa-solid fa-magnifying-glass"></i>
            </button>
        `;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-destination-btn';
        removeBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        removeBtn.title = 'Remove Destination';
        removeBtn.addEventListener('click', () => {
            newDestinationWrapper.remove();
        });

        newDestinationWrapper.appendChild(removeBtn);
        destinationsContainer.appendChild(newDestinationWrapper);
    });

    // --- Function to handle adding the plan ---
    addPlanButton.addEventListener('click', async () => {
        const currentLocation = document.getElementById('current-location').value;
        const date = document.getElementById('trip-date').value;
        const budget = document.getElementById('trip-budget').value;

        const destinations = [];
        const firstDestinationInput = document.getElementById('first-destination-input');
        if (firstDestinationInput && firstDestinationInput.value.trim() !== '') {
            destinations.push(firstDestinationInput.value.trim());
        }

        const additionalDestinationInputs = destinationsContainer.querySelectorAll('.destination-input');
        additionalDestinationInputs.forEach(input => {
            if (input.value.trim() !== '') {
                destinations.push(input.value.trim());
            }
        });

        if (!currentLocation || destinations.length === 0 || !date) {
            showToast('Please fill out current location, date, and at least one destination!');
            return;
        }

        const planData = {
            currentLocation,
            destinations,
            date,
            budget: budget || 'Not Set'
        };

        try {
            const response = await fetch('/add_plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(planData),
            });
            const result = await response.json();
            showToast(result.message);

            if (result.success) {
                document.getElementById('current-location').value = '';
                document.getElementById('trip-date').value = '';
                document.getElementById('trip-budget').value = '';
                if (firstDestinationInput) firstDestinationInput.value = '';
                destinationsContainer.innerHTML = ''; // Clear additional destinations
                destinationCount = 1;
            }
        } catch (error) {
            console.error('Error adding plan:', error);
            showToast('An error occurred while adding the plan.');
        }
    });

    // --- SPOT SEARCH LOGIC ---
    planInputsContainer.addEventListener('click', function(event) {
        const searchButton = event.target.closest('.spot-search-btn');
        if (searchButton) {
            const wrapperDiv = searchButton.closest('.destination-input-wrapper');
            const inputField = wrapperDiv.querySelector('.destination-input');
            if (inputField && inputField.value) {
                searchSpots(inputField.value);
            } else {
                showToast('Please enter a destination to search!', false);
            }
        }
    });

    window.openGeminiModal = function(title, content) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        geminiModal.classList.add('show');
    }

    window.closeGeminiModal = function() {
        geminiModal.classList.remove('show');
    }

    async function callGeminiAPI(prompt) {
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "PASTE_YOUR_GOOGLE_AI_STUDIO_KEY_HERE") {
            const instructions = `<p style="font-weight: 600; font-size: 1.1rem;">Gemini API Key Needed</p><p>To use this AI feature, you need a free API key from Google AI Studio.</p><ol><li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.</li><li>Click "Create API key" and copy it.</li><li>Paste the key into the <code>GEMINI_API_KEY</code> variable in the dashboard.js file.</li></ol>`;
            openGeminiModal('Configuration Needed', instructions);
            return null;
        }
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
        try {
            const payload = {
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            };
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                console.error("API call failed:", response.status, response.statusText);
                return "Sorry, there was an error getting a response.";
            }
            const result = await response.json();
            return result.candidates ?.[0]?.content ?.[0]?.parts ?.[0]?.text || "Sorry, I couldn't generate a response.";
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            return "An error occurred fetching data. Please try again later.";
        }
    }
    
    window.getFunFact = async function (placeName, button) {
        const originalButtonText = button.innerHTML;
        button.innerHTML = '<div class="loading-spinner" style="width:15px; height:15px; margin: 0 auto; border-width: 2px;"></div>';
        button.disabled = true;

        const prompt = `Tell me a single, interesting fun fact about "${placeName}". Keep it concise.`;
        const fact = await callGeminiAPI(prompt);
        openGeminiModal(`Fun Fact about ${placeName}`, fact);
        
        button.innerHTML = originalButtonText;
        button.disabled = false;
    }


    async function searchSpots(destinationQuery) {
        const destination = destinationQuery.trim();
        spotResultsContainer.innerHTML = "";
        if (!destination) {
            showToast('Please enter a destination to search!', false);
            return;
        }

        wrapper.classList.add('search-active');
        spotResultsContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const geoRes = await fetch(`https://api.opentripmap.com/0.1/en/places/geoname?name=${destination}&apikey=${TRIPMAP_API_KEY}`);
            const geoData = await geoRes.json();

            if (!geoData.lat || !geoData.lon) {
                spotResultsContainer.innerHTML = `<p style='text-align:center;'>Destination not found. Please try another city.</p>`;
                return;
            }

            const { lat, lon } = geoData;
            const placesRes = await fetch(`https://api.opentripmap.com/0.1/en/places/radius?lat=${lat}&lon=${lon}&radius=20000&kinds=interesting_places&rate=3&limit=9&format=json&apikey=${TRIPMAP_API_KEY}`);
            const placesData = await placesRes.json();
            const destinationTitle = destination.charAt(0).toUpperCase() + destination.slice(1);
            spotResultsContainer.innerHTML = `<h2 class="results-title">Famous Spots in ${destinationTitle}</h2><div class="results-grid"></div>`;
            const gridContainer = spotResultsContainer.querySelector('.results-grid');

            if (!placesData.length) {
                gridContainer.innerHTML = "<p style='text-align:center;'>No famous spots found in this area.</p>";
                return;
            }

            const placePromises = placesData.map(place =>
                fetch(`https://api.opentripmap.com/0.1/en/places/xid/${place.xid}?apikey=${TRIPMAP_API_KEY}`).then(res => res.json())
            );

            const allPlaceInfo = await Promise.all(placePromises);

            allPlaceInfo.forEach(info => {
                const name = info.name?.trim();
                if (!name || name.length < 3) return;

                const desc = info.wikipedia_extracts?.text || "No description available.";
                const image = info.preview?.source;
                const sanitizedName = name.replace(/'/g, "\\'").replace(/"/g, '\\"');
                const div = document.createElement("div");
                div.className = "place";
                div.innerHTML = `
                    ${image ? `<img src="${image}" alt="${name}">` : ''}
                    <div class="place-content">
                        <h3>${name}</h3>
                        <p>${desc.substring(0, 150)}${desc.length > 150 ? '...' : ''}</p>
                        <div class="place-actions">
                            <button class="fun-fact-btn" onclick="getFunFact('${sanitizedName}', this)"> Tell Me More</button>
                        </div>
                    </div>
                `;
                gridContainer.appendChild(div);
            });

        } catch (err) {
            console.error(err);
            spotResultsContainer.innerHTML = "<p style='color: red; text-align:center;'>Something went wrong. Please try again.</p>";
        }
    }

    //--- Toast Notification Function ---
    function showToast(message, isSuccess = true) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = 'toast-notification';

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: isSuccess ? 'rgba(17, 24, 39, 0.8)' : 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: '2000',
            opacity: '0',
            transition: 'opacity 0.4s ease, bottom 0.4s ease'
        });

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.bottom = '30px';
        }, 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.bottom = '20px';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 500);
        }, 3500);
    }
});
