class App {
  constructor() {
    this.baseURL = "https://restcountries.com/v3.1/";
    this.countryDataEndpoint = "alpha/";
    this.allCountriesEndpoint = "all";
    this.weatherCastEndPoint = `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;
    this.optionsParams = {
      allCountriesEndPointParams: "?fields=name,cca2",
    };
    // Inside constructor
    this.currencyAPIKey = "058a72e450aee0cf3afa55ea";
    this.currencyBaseURL = `https://v6.exchangerate-api.com/v6/${this.currencyAPIKey}/latest/`;
    this.currencyData = {};
    this.selectedCountryCurrency = null;
    this.populateCurrencySelectors();
    this.initCurrencyEventListeners();
    this.countryData = [];
    this.weatherData = [];
    this.holidayData = [];
    this.eventsData = [];
    this.sunTimesData = {};
    this.longWeekendsData = [];
    // Load existing plans from memory or start with an empty array
    this.savedPlans =
      JSON.parse(localStorage.getItem("wanderlust_plans")) || [];
    this.selectCountrytEventListeners();
    this.clearSelectionEventListeners();
    this.exploreBtnEventListeners();
    this.initRounting();
    this.setupMyPlansListeners();
    this.attachHeartListeners();
    this.fetchCountriesAvailable();
    this.updatePlansUI();
    this.selectedCountry = null;
    this.selectedCity = null;
    this.coords = null;
    this.selectedYear = 2026;
  }
  fetchCurrencyRates = async (baseCode = "USD") => {
    try {
      const response = await fetch(`${this.currencyBaseURL}${baseCode}`);
      if (!response.ok) throw new Error("Currency API error");

      const data = await response.json();
      this.currencyData = data.conversion_rates;
      const countryCurrencyCode = Object.keys(this.countryData.currencies)[0];
      this.selectedCountryCurrency = countryCurrencyCode;
      return data.conversion_rates;
    } catch (error) {
      console.error("Rates fetch failed:", error.message);
    }
  };
  handleConversion = async () => {
    const amount = document.querySelector("#currency-amount").value;
    const from = document.querySelector("#currency-from").value;
    const to = document.querySelector("#currency-to").value;

    // Fetch new rates if the "From" currency changed
    const rates = await this.fetchCurrencyRates(from);
    const rate = rates[to];
    const result = (amount * rate).toFixed(2);

    // Update UI Result Card
    const resultContainer = document.querySelector("#currency-result");
    resultContainer.querySelector(".conversion-from .amount").textContent =
      amount;
    resultContainer.querySelector(
      ".conversion-from .currency-code",
    ).textContent = from;
    resultContainer.querySelector(".conversion-to .amount").textContent =
      result;
    resultContainer.querySelector(".conversion-to .currency-code").textContent =
      to;
    resultContainer.querySelector(".exchange-rate-info p").textContent =
      `1 ${from} = ${rate.toFixed(4)} ${to}`;
  };
  initCurrencyEventListeners = () => {
    const convertBtn = document.querySelector("#convert-btn");
    const swapBtn = document.querySelector("#swap-currencies-btn");

    document
      .querySelector("#currency-from")
      .addEventListener("change", () => this.handleConversion());
    document
      .querySelector("#currency-to")
      .addEventListener("change", () => this.handleConversion());
    convertBtn.addEventListener("click", () => this.handleConversion());

    swapBtn.addEventListener("click", () => {
      const fromEle = document.querySelector("#currency-from");
      const toEle = document.querySelector("#currency-to");
      const temp = fromEle.value;
      fromEle.value = toEle.value;
      toEle.value = temp;
      this.handleConversion(); // Re-calculate after swap
    });
  };
  populateCurrencySelectors = async () => {
    try {
      // We use the 'codes' endpoint to get all supported currencies
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${this.currencyAPIKey}/codes`,
      );
      if (!response.ok) throw new Error("Could not fetch currency codes");

      const data = await response.json();
      const fromSelect = document.querySelector("#currency-from");
      const toSelect = document.querySelector("#currency-to");

      // Clear existing static options
      fromSelect.innerHTML = "";
      toSelect.innerHTML = "";

      data.supported_codes.forEach(([code, name]) => {
        const option = `<option value="${code}">${code} - ${name}</option>`;
        fromSelect.insertAdjacentHTML("beforeend", option);
        toSelect.insertAdjacentHTML("beforeend", option);
      });

      // Set defaults after population
      fromSelect.value = "USD";
      toSelect.value = "EGP";
    } catch (error) {
      console.error("Failed to load selectors:", error.message);
    }
  };
  fetchCountriesAvailable = async () => {
    try {
      const response = await fetch(
        `${this.baseURL + this.allCountriesEndpoint + this.optionsParams.allCountriesEndPointParams}`,
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from Available countries API");
      }
      const data = JSON.parse(text);
      const selectCountryEle = document.querySelector("#global-country");
      const countriesSorted = data.sort((a, b) => {
        return a.name.common.localeCompare(b.name.common);
      });
      countriesSorted.forEach((country) => {
        const optionHTML = `<option value=${country.cca2}>${country.cca2} ${country.name.common}</option>`;
        selectCountryEle.insertAdjacentHTML("beforeend", optionHTML);
      });
    } catch (error) {
      console.error("Available Countries fetch failed:", error.message);
    }
  };
  fetchHolidayData = async () => {
    this.showLoading("Fetching holidays...");
    try {
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${this.selectedYear}/${this.selectedCountry}`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from holiday API");
      }

      const data = JSON.parse(text);
      this.holidayData = data;
      const holidayView = document.querySelector("#holidays-view");
      const holidayHeader = holidayView.querySelector(".view-header-content");
      const holidayBadge = holidayView.querySelector(
        ".current-selection-badge",
      );
      holidayHeader.querySelector("p").textContent =
        `Browse public holidays for ${this.countryData.name.common} and plan your trips around them`;

      holidayBadge.querySelector("img").src = this.countryData.flags.png;
      holidayBadge.querySelector("img").alt = this.countryData.name.common;
      holidayBadge.querySelector("span").textContent =
        this.countryData.name.common;
      holidayBadge.querySelector(".selection-year").textContent =
        this.selectedYear;

      holidayView.querySelector(".view-header-selection").style.display =
        "flex";
      this.displayHolidayInfo(this.holidayData);
    } catch (error) {
      console.error("Holiday fetch failed:", error.message);
      this.renderNoDataState(
        "#holidays-content",
        "No Holidays Found",
        `No public holidays found for ${this.selectedYear}`,
        "calendar-xmark",
      );
    } finally {
      this.hideLoading();
    }
  };

  fetchEventsData = async () => {
    const eventsContainer = document.querySelector("#events-content");
    if (!this.selectedCity) {
      eventsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-ticket"></i></div>
        <h3>No City Selected</h3>
        <p>Select a country and city from the dashboard to discover events</p>
        <button class="btn btn-primary" id="event-redirect">
          <i class="fa-solid fa-globe"></i> Go to Dashboard
        </button>
      </div>`;
      document.querySelector("#event-redirect").onclick = () =>
        this.mapViews(
          "dashboard",
          document.querySelector('[data-view="dashboard"]'),
        );
      return;
    }
    this.showLoading("Loading events details...");
    try {
      const apiKey = "VwECw2OiAzxVzIqnwmKJUG41FbeXJk1y";
      const city = this.selectedCity || "New York";
      const countryCode = this.selectedCountry || "US";

      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&city=${encodeURIComponent(city)}&countryCode=${countryCode}&size=20`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from Events API");
      }

      const data = JSON.parse(text);
      const eventsView = document.querySelector("#events-view");
      const eventsHeader = eventsView.querySelector(".view-header-content");
      const eventsBadge = eventsView.querySelector(".current-selection-badge");

      eventsHeader.querySelector("p").textContent =
        `Discover concerts, sports, theatre and more in ${this.selectedCity}`;

      eventsBadge.querySelector("img").src = this.countryData.flags.png;
      eventsBadge.querySelector("img").alt = this.countryData.name.common;
      eventsBadge.querySelector("span").textContent =
        this.countryData.name.common;
      eventsBadge.querySelector(".selection-city").textContent =
        ` • ${this.selectedCity}`;

      eventsView.querySelector(".view-header-selection").style.display = "flex";
      this.eventsData = data._embedded?.events || [];
      this.displayEventsInfo(this.eventsData);
    } catch (error) {
      console.error("Events fetch failed:", error.message);
      document.querySelector("#events-content").innerHTML = `
      <div class="event-error" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
        <i class="fa-solid fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>No events available for ${city}, ${countryCode}.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Try selecting a different city or country.</p>
      </div>
    `;
    } finally {
      this.hideLoading();
    }
  };

  fetchSunTimesData = async () => {
    try {
      if (!this.coords) {
        throw new Error("No coordinates available");
      }

      const lat = this.coords[0];
      const lng = this.coords[1];
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // Format: YYYY-MM-DD

      const response = await fetch(
        `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&date=${dateStr}&formatted=0`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from Sunrise-Sunset API");
      }

      const data = JSON.parse(text);
      if (data.status !== "OK") {
        throw new Error("API returned error status");
      }

      this.sunTimesData = data.results;
      this.displaySunTimesInfo(this.sunTimesData);
    } catch (error) {
      console.error("Sun times fetch failed:", error.message);
      document.querySelector("#sun-times-content").innerHTML = `
      <div class="sun-error" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
        <i class="fa-solid fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Unable to load sun times data for this location.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">Please select a country to view sun times.</p>
      </div>
    `;
    }
  };

  fetchLongWeekendsData = async () => {
    this.showLoading("Loading long weekends details...");
    try {
      if (!this.selectedCountry) {
        throw new Error("No country selected");
      }

      const response = await fetch(
        `https://date.nager.at/api/v3/LongWeekend/${this.selectedYear}/${this.selectedCountry}`,
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from Long Weekend API");
      }

      const data = JSON.parse(text);
      if (!data || data.length === 0) {
        this.displayNoLongWeekendsState();
        return;
      }

      this.longWeekendsData = data;
      this.displayLongWeekendsInfo(this.longWeekendsData);
    } catch (error) {
      console.error("Long weekends fetch failed:", error.message);
      this.displayNoLongWeekendsState();
    } finally {
      this.hideLoading();
    }
  };

  displayNoLongWeekendsState = () => {
    document.querySelector("#lw-content").innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">
        <i class="fa-solid fa-umbrella-beach"></i>
      </div>
      <h3>No Long Weekends</h3>
      <p>No long weekends found for ${this.selectedYear}</p>
    </div>
  `;
  };

  fetchWeatherData = async () => {
    this.showLoading("Loading weather details...");
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${this.coords[0]}&longitude=${this.coords[1]}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`,
      );
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from Weather API");
      }
      const data = JSON.parse(text);
      this.weatherData = data;
      this.displayWeatherInfo(this.weatherData);
    } catch (error) {
      console.error("Weather fetch failed:", error.message);

      document.querySelector("#weather-content").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <i class="fa-solid fa-cloud-sun"></i>
        </div>
        <h3>No Weather Data Found</h3>
        <p>Unable to retrieve weather information for ${this.selectedCity} in ${this.selectedYear}. Please try again later.</p>
      </div>
    `;
    } finally {
      this.hideLoading();
    }
  };
  fetchCountryData = async (countryCode) => {
    this.showLoading("Loading destination details...");
    try {
      const response = await fetch(
        `${this.baseURL + this.countryDataEndpoint + countryCode}`,
      );
      if (!response.ok) {
        throw new Error(`API error: $ {response.status}`);
      }
      const text = await response.text();
      if (!text) {
        throw new Error("Empty response from Country API");
      }
      const data = JSON.parse(text);
      this.countryData = data[0];
      this.coords = this.countryData.latlng;
      this.selectedCity = this.countryData.capital[0];
      this.selectedCountryCurrency = Object.keys(
        this.countryData.currencies,
      )[0];
      const countryCurrency = Object.keys(this.countryData.currencies)[0];
      const fromSelect = document.querySelector("#currency-from");
      if (fromSelect && countryCurrency) {
        fromSelect.value = countryCurrency;

        if (typeof this.handleConversion === "function") {
          this.handleConversion();
        }
      }
      this.displayCountryInfo(this.countryData);
      document.querySelector("#global-city").innerHTML =
        `<option value='${this.selectedCity}' selected><i class="fa-solid fa-city"></i> ${this.selectedCity}</option>`;
      // Update the flag in destination component
      const countryFlagInDestinationComponent = document.querySelector(
        "#selected-country-flag",
      );

      countryFlagInDestinationComponent.setAttribute(
        "src",
        `${this.countryData.flags.png}`,
      );
      countryFlagInDestinationComponent.setAttribute(
        "alt",
        `${this.countryData.name.common} flag`,
      );
      // update the country name
      document.querySelector("#selected-country-name").textContent =
        this.countryData.name.common;
      // update the city name
      document.querySelector("#selected-city-name").textContent =
        `• ${this.selectedCity}`;
      // Show the selected destination component
      document
        .querySelector("#selected-destination")
        .classList.remove("hidden");
      console.log(this.countryData);
    } catch (error) {
      document.querySelector("#dashboard-country-info").innerHTML = `
      <div class="country-info-placeholder">
        <div class="placeholder-icon error">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <p>Failed to load country information. Please try again.</p>
      </div>`;
    } finally {
      this.hideLoading();
    }
  };
  selectCountrytEventListeners = () => {
    const selectCountryEle = document.querySelector("#global-country");
    selectCountryEle.addEventListener("change", (e) => {
      if (e.currentTarget.value) {
        this.fetchCountryData(e.currentTarget.value);
        this.selectedCountry = e.currentTarget.value;
      }
    });
  };
  clearSelectionEventListeners = () => {
    const closeBTN = document.querySelector("#clear-selection-btn");
    closeBTN.addEventListener("click", () => {
      const countryInfoGroup = document.querySelector(
        ".dashboard-country-info-group",
      );
      const countryInfoPlaeHolder = document.querySelector(
        ".country-info-placeholder",
      );
      const globalCountrySelection = document.querySelector("#global-country");
      globalCountrySelection.value = "";
      const globalCitySelection = document.querySelector("#global-city");
      globalCitySelection.innerHTML = `<option value='' selected disabled><i class="fa-solid fa-city"></i> Select a City</option>`;
      // Hide the destination component
      document.querySelector("#selected-destination").classList.add("hidden");
      countryInfoGroup.classList.add("hidden");
      // Hide the country card container

      countryInfoPlaeHolder.classList.remove("hidden");
    });
  };
  exploreBtnEventListeners = () => {
    const exploreBTN = document.querySelector("#global-search-btn");
    exploreBTN.addEventListener("click", () => {
      const countryInfoGroup = document.querySelector(
        ".dashboard-country-info-group",
      );
      const countryInfoPlaeHolder = document.querySelector(
        ".country-info-placeholder",
      );
      if (this.selectedCountry) {
        this.selectedCity = document.querySelector("#global-city").value;
        this.selectedYear = document.querySelector("#global-year").value;
        console.log(this.selectedCity, this.selectedYear);
        countryInfoGroup.classList.remove("hidden");
        countryInfoPlaeHolder.classList.add("hidden");
        document
          .querySelectorAll(".selection-year")
          .forEach((el) => (el.textContent = this.selectedYear));

        document
          .querySelectorAll(".selection-city")
          .forEach((el) => (el.textContent = " • " + this.selectedCity));
      }
    });
  };
  // Display Methods
  displayCountryInfo = (countryData) => {
    // 1- Country Flag image
    const countryFlagImg = document.querySelector(".dashboard-country-flag");
    countryFlagImg.setAttribute("src", countryData.flags.svg);
    countryFlagImg.setAttribute("alt", countryData.flags.alt);
    // 2- Country name
    const countryName = document.querySelector(".dashboard-country-title h3");
    countryName.textContent = countryData.name.common;
    // 3- country official name
    const countryOfficialName = document.querySelector(".official-name");
    countryOfficialName.textContent = countryData.name.official;
    // 4- country region
    const countryRegion = document.querySelector(".region");
    countryRegion.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${countryData.region} • ${countryData.subregion}`;
    // 5- Country Details
    const countryDetails = document.querySelector(
      ".dashboard-country-grid",
    ).children;
    const countryDetailsData = {
      capital: countryData.capital[0],
      population: countryData.population.toLocaleString(),
      area: countryData.area.toLocaleString(),
      continent: countryData.continents[0],
      "calling code": countryData.idd.root + [...countryData.idd.suffixes],
      "driving side":
        countryData.car.side.charAt(0).toUpperCase() +
        countryData.car.side.slice(1).toLowerCase(),
      "week starts":
        countryData.startOfWeek.charAt(0).toUpperCase() +
        countryData.startOfWeek.slice(1).toLowerCase(),
    };

    for (let countryDetail of countryDetails) {
      let keyName = countryDetail
        .querySelector(".label")
        .textContent.toLowerCase();
      countryDetail.querySelector(".value").textContent =
        countryDetailsData[keyName];
    }
    // 6- country Extras
    const countryExtraContainer = document.querySelector(
      ".dashboard-country-extras",
    ).children;
    const countryExtraData = {
      currency: Object.values(countryData.currencies)[0],
      languages: Object.values(countryData.languages).join(", "),
      neighbors: countryData.borders,
    };

    for (let counteryExtra of countryExtraContainer) {
      let keyName = counteryExtra.children[0].textContent.toLowerCase();
      if (keyName !== "neighbors") {
        if (keyName === "currency") {
          counteryExtra.children[1].children[0].textContent = `${countryExtraData[keyName].name} (${countryExtraData[keyName].symbol})`;
        } else if (keyName === "languages") {
          counteryExtra.children[1].children[0].textContent =
            countryExtraData[keyName];
        }
      } else {
        const bordersContainer = counteryExtra.children[1];
        bordersContainer.innerHTML = "";

        if (!countryExtraData[keyName]) return;

        const bordersElements = countryExtraData[keyName].map(
          (border) => `<span class="extra-tag border-tag">${border}</span>`,
        );
        bordersContainer.innerHTML = [...bordersElements].join("");
      }
      // Map link
      document
        .querySelector(".btn-map-link")
        .setAttribute("href", `${countryData.maps.googleMaps}`);
    }
    // console.log(countryExtraContainer);
    // console.log(countryExtraData);
  };
  displayWeatherInfo = (weatherData) => {
    const weatherCodeDescriptions = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Drizzle: Light",
      53: "Drizzle: Moderate",
      55: "Drizzle: Dense",
      61: "Rain: Slight",
      63: "Rain: Moderate",
      65: "Rain: Heavy",
      71: "Snow fall: Slight",
      73: "Snow fall: Moderate",
      75: "Snow fall: Heavy",
      80: "Rain showers: Slight",
      81: "Rain showers: Moderate",
      82: "Rain showers: Violent",
      95: "Thunderstorm: Slight",
      96: "Thunderstorm: Moderate with hail",
      99: "Thunderstorm: Moderate with hail",
    };
    const weatherStyles = {
      0: { class: "weather-sunny", icon: "fa-sun" },
      1: { class: "weather-sunny", icon: "fa-sun" },
      2: { class: "weather-cloudy", icon: "fa-cloud-sun" },
      3: { class: "weather-cloudy", icon: "fa-cloud" },
      45: { class: "weather-foggy", icon: "fa-water" }, // use fa-water instead of fa-smog
      48: { class: "weather-foggy", icon: "fa-water" },
      51: { class: "weather-rainy", icon: "fa-cloud-rain" },
      61: { class: "weather-rainy", icon: "fa-cloud-rain" },
      71: { class: "weather-snowy", icon: "fa-snowflake" },
      80: { class: "weather-rainy", icon: "fa-cloud-showers-heavy" },
      95: { class: "weather-stormy", icon: "fa-bolt" },
    };

    const code = weatherData.current.weather_code;
    const weatherViewComponent = document.querySelector("#weather-view");
    const viewHeaderContentEle = weatherViewComponent.querySelector(
      ".view-header-content",
    );
    viewHeaderContentEle.children[1].textContent = `Check 7-day weather forecasts for ${this.selectedCity}`;
    // Change header style
    const style = weatherStyles[code] || {
      class: "weather-default",
      icon: "fa-question",
    };
    const heroCard = document.querySelector(".weather-hero-card");
    const heroIcon = document.querySelector(".weather-hero-icon i");

    heroCard.className = `weather-hero-card   ${style.class}`;
    heroIcon.classList.remove(
      "fa-sun",
      "fa-cloud",
      "fa-cloud-sun",
      "fa-bolt",
      "fa-snowflake",
      "fa-cloud-rain",
      "fa-cloud-showers-heavy",
      "fa-water",
    );
    heroIcon.classList.add(style.icon);

    const weatherLocationEle =
      weatherViewComponent.querySelector(".weather-location");
    weatherLocationEle.children[1].textContent = this.selectedCity;
    // Date
    const apiTime = weatherData.current.time;
    const date = new Date(apiTime);
    const optionsDate = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const formattedDate = date.toLocaleDateString("en-US", optionsDate);
    weatherLocationEle.children[2].textContent = formattedDate;
    // Temp and unit
    const temp = Math.round(weatherData.current.temperature_2m);
    const unit = weatherData.current_units.temperature_2m;
    weatherViewComponent.querySelector(".temp-value").textContent = temp;
    weatherViewComponent.querySelector(".temp-unit").textContent = unit;
    // weather hero right element

    weatherViewComponent.querySelector(".weather-condition").textContent =
      weatherCodeDescriptions[code];
    const feelsLike = Math.round(weatherData.current.apparent_temperature);
    const feelsLikeUnit = weatherData.current_units.apparent_temperature;
    weatherViewComponent.querySelector(".weather-feels").textContent =
      `Feels like ${feelsLike}${feelsLikeUnit}`;

    const high = Math.round(weatherData.daily.temperature_2m_max[0]);
    const low = Math.round(weatherData.daily.temperature_2m_min[0]);

    weatherViewComponent.querySelector(".high").innerHTML =
      `<i class="fa-solid fa-arrow-up"></i> ${high}°`;
    weatherViewComponent.querySelector(".low").innerHTML =
      `<i class="fa-solid fa-arrow-down"></i> ${low}°`;

    // Weather details grid
    const weatherDetailsContainer = weatherViewComponent.querySelector(
      ".weather-details-grid",
    );
    // Humidity
    const humidityCard = weatherDetailsContainer.children[0];
    humidityCard.querySelector(".detail-value").textContent =
      `${weatherData.current.relative_humidity_2m}%`;
    // Wind
    const windCard = weatherDetailsContainer.children[1];
    windCard.querySelector(".detail-value").textContent =
      `${Math.round(weatherData.current.wind_speed_10m)} km/h`;
    // if uv available
    if (weatherData.current.uv_index !== undefined) {
      weatherDetailsContainer.children[2].querySelector(
        ".detail-value",
      ).textContent = weatherData.current.uv_index;
    }

    // if Precipitation available

    if (weatherData.daily.precipitation_probability) {
      weatherDetailsContainer.children[3].querySelector(
        ".detail-value",
      ).textContent = `${weatherData.daily.precipitation_probability[0]}%`;
    }

    // Hourly Forecast

    const weatherIcons = {
      0: "fa-sun", // Clear sky
      1: "fa-sun", // Mainly clear
      2: "fa-cloud-sun", // Partly cloudy
      3: "fa-cloud", // Overcast
      45: "fa-smog", // Fog
      48: "fa-smog", // Depositing rime fog
      51: "fa-cloud-rain", // Drizzle
      61: "fa-cloud-rain", // Rain
      71: "fa-snowflake", // Snow
      80: "fa-cloud-showers-heavy", // Rain showers
      95: "fa-bolt", // Thunderstorm
    };

    const hourlyScroll = weatherViewComponent.querySelector(".hourly-scroll");
    hourlyScroll.innerHTML = "";
    const times = weatherData.hourly.time;
    const codes = weatherData.hourly.weather_code;
    const temps = weatherData.hourly.temperature_2m;
    const precip = weatherData.hourly.precipitation_probability;
    times.slice(0, 12).forEach((time, index) => {
      const date = new Date(time);
      const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      });
      const temp = Math.round(temps[index]);
      const code = codes[index];
      const iconClass = weatherIcons[code] || "fa-question";
      const item = document.createElement("div");
      item.classList.add("hourly-item");
      index === 0 ? item.classList.add("now") : "";
      item.innerHTML = ` <span class="hourly-time ">${index === 0 ? "Now" : formattedTime}</span> <div class="hourly-icon"><i class="fa-solid ${iconClass}"></i></div> <span class="hourly-temp">${temp}°</span> <span class="hourly-precip">${precip[index]}%</span> `;
      hourlyScroll.appendChild(item);
    });

    // 7-Day Forecast
    const forecastList = weatherViewComponent.querySelector(".forecast-list");
    forecastList.innerHTML = "";
    const days = weatherData.daily.time;
    const maxTemps = weatherData.daily.temperature_2m_max;
    const minTemps = weatherData.daily.temperature_2m_min;
    const codesDaily = weatherData.daily.weather_code;
    const precipDaily = weatherData.daily.precipitation_probability_max;

    days.forEach((day, index) => {
      const date = new Date(day);
      const dayLabel =
        index === 0
          ? "Today"
          : date.toLocaleDateString("en-US", { weekday: "short" });
      const dayDate = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });
      const max = Math.round(maxTemps[index]);
      const min = Math.round(minTemps[index]);
      const code = codesDaily[index];
      const iconClass = weatherIcons[code] || "fa-question";
      const precipVal = precipDaily[index] || 0;
      const item = document.createElement("div");
      item.classList.add("forecast-day");
      if (index === 0) item.classList.add("today");
      item.innerHTML = ` <div class="forecast-day-name"> <span class="day-label">${dayLabel}</span> <span class="day-date">${dayDate}</span> </div> <div class="forecast-icon"><i class="fa-solid ${iconClass}"></i></div> <div class="forecast-temps"> <span class="temp-max">${max}°</span> <span class="temp-min">${min}°</span> </div> <div class="forecast-precip"> ${precipVal > 0 ? `<i class="fa-solid fa-droplet"></i><span>${precipVal}%</span>` : ""} </div> `;
      forecastList.appendChild(item);
    });
    // console.log(forecastList);
  };
  displayHolidayInfo = (holidaysData) => {
    const holidayCardsContainer = document.querySelector("#holidays-content");
    holidayCardsContainer.innerHTML = "";
    holidaysData.forEach((holiday) => {
      const date = new Date(holiday.date);
      const day = date.getDate();
      const month = date.toLocaleString("en-US", { month: "short" });
      const weekday = date.toLocaleString("en-US", { weekday: "long" });
      const holidayCard = document.createElement("div");
      holidayCard.classList.add("holiday-card");
      holidayCard.innerHTML = ` <div class="holiday-card-header"> <div class="holiday-date-box"> <span class="day">${day}</span><span class="month">${month}</span> </div> <button class="holiday-action-btn"> <i class="fa-regular fa-heart"></i> </button> </div> <h3>${holiday.name}</h3> <p class="holiday-name">${holiday.localName}</p> <div class="holiday-card-footer"> <span class="holiday-day-badge"> <i class="fa-regular fa-calendar"></i> ${weekday} </span> <span class="holiday-type-badge">${holiday.types.join(", ")}</span> </div> `;
      const saveBtn = holidayCard.querySelector(".holiday-action-btn");
      saveBtn.addEventListener("click", () => {
        this.saveToPlans({
          id: `holiday-${holiday.date}-${holiday.name}`, // Unique ID
          type: "holiday",
          title: holiday.name,
          date: holiday.date,
          detail: holiday.localName,
        });
      });
      holidayCardsContainer.appendChild(holidayCard);
    });
  };

  displayEventsInfo = (eventsData) => {
    const eventsContainer = document.querySelector("#events-content");
    eventsContainer.innerHTML = "";

    if (!eventsData || eventsData.length === 0) {
      eventsContainer.innerHTML = `
        <div class="event-error" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>No events found for this location.</p>
        </div>
      `;
      return;
    }

    eventsData.forEach((event) => {
      const eventDate = new Date(event.dates.start.localDate);
      const eventTime = event.dates.start.localTime || "Time TBA";
      const dateFormatted = eventDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const eventImage =
        event.images?.[0]?.url ||
        "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=200&fit=crop";
      const eventCategory =
        event.classifications?.[0]?.segment?.name || "Event";
      const eventName = event.name;
      const venueName = event._embedded?.venues?.[0]?.name || "Venue TBA";
      const venueCity =
        event._embedded?.venues?.[0]?.city?.name || this.selectedCity || "";
      const eventUrl = event.url || "#";

      const eventCard = document.createElement("div");
      eventCard.classList.add("event-card");
      eventCard.innerHTML = `
        <div class="event-card-image">
          <img
            src="${eventImage}"
            alt="${eventName}"
            onerror="this.src='https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=200&fit=crop'"
          />
          <span class="event-card-category">${eventCategory}</span>
          <button class="event-card-save">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
        <div class="event-card-body">
          <h3>${eventName}</h3>
          <div class="event-card-info">
            <div>
              <i class="fa-regular fa-calendar"></i>${dateFormatted} at ${eventTime}
            </div>
            <div>
              <i class="fa-solid fa-location-dot"></i>${venueName}, ${venueCity}
            </div>
          </div>
          <div class="event-card-footer">
            <button class="btn-event">
              <i class="fa-regular fa-heart"></i> Save
            </button>
            <a href="${eventUrl}" target="_blank" class="btn-buy-ticket">
              <i class="fa-solid fa-ticket"></i> Buy Tickets
            </a>
          </div>
        </div>
      `;
      eventsContainer.appendChild(eventCard);
    });
  };

  displaySunTimesInfo = (sunData) => {
    const sunTimesContainer = document.querySelector("#sun-times-content");

    // Helper function to format time from ISO string to local time
    const formatTime = (isoString) => {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    // Helper function to calculate time difference in hours and minutes
    const calculateDuration = (start, end) => {
      const startTime = new Date(start);
      const endTime = new Date(end);
      const diffMs = endTime - startTime;
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    // Calculate day length
    const dayLength = calculateDuration(sunData.sunrise, sunData.sunset);
    const nightLength = calculateDuration(sunData.sunset, sunData.sunrise);

    // Calculate percentage of daylight
    const dayLengthMs = new Date(sunData.sunset) - new Date(sunData.sunrise);
    const dayPercentage = ((dayLengthMs / (1000 * 60 * 60 * 24)) * 100).toFixed(
      1,
    );

    // Get current date
    const today = new Date();
    const dateFormatted = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

    sunTimesContainer.innerHTML = `
      <div class="sun-main-card">
        <div class="sun-main-header">
          <div class="sun-location">
            <h2><i class="fa-solid fa-location-dot"></i> ${this.selectedCity || "Selected Location"}</h2>
            <p>Sun times for your selected location</p>
          </div>
          <div class="sun-date-display">
            <div class="date">${dateFormatted}</div>
            <div class="day">${dayOfWeek}</div>
          </div>
        </div>

        <div class="sun-times-grid">
          <div class="sun-time-card dawn">
            <div class="icon"><i class="fa-solid fa-moon"></i></div>
            <div class="label">Civil Dawn</div>
            <div class="time">${formatTime(sunData.civil_twilight_begin)}</div>
            <div class="sub-label">Civil Twilight</div>
          </div>
          <div class="sun-time-card sunrise">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Sunrise</div>
            <div class="time">${formatTime(sunData.sunrise)}</div>
            <div class="sub-label">Golden Hour Start</div>
          </div>
          <div class="sun-time-card noon">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Solar Noon</div>
            <div class="time">${formatTime(sunData.solar_noon)}</div>
            <div class="sub-label">Sun at Highest</div>
          </div>
          <div class="sun-time-card sunset">
            <div class="icon"><i class="fa-solid fa-sun"></i></div>
            <div class="label">Sunset</div>
            <div class="time">${formatTime(sunData.sunset)}</div>
            <div class="sub-label">Golden Hour End</div>
          </div>
          <div class="sun-time-card dusk">
            <div class="icon"><i class="fa-solid fa-moon"></i></div>
            <div class="label">Civil Dusk</div>
            <div class="time">${formatTime(sunData.civil_twilight_end)}</div>
            <div class="sub-label">Civil Twilight</div>
          </div>
          <div class="sun-time-card daylight">
            <div class="icon">
              <i class="fa-solid fa-hourglass-half"></i>
            </div>
            <div class="label">Day Length</div>
            <div class="time">${dayLength}</div>
            <div class="sub-label">Total Daylight</div>
          </div>
        </div>
      </div>

      <div class="day-length-card">
        <h3>
          <i class="fa-solid fa-chart-pie"></i> Daylight Distribution
        </h3>
        <div class="day-progress">
          <div class="day-progress-bar">
            <div class="day-progress-fill" style="width: ${dayPercentage}%"></div>
          </div>
        </div>
        <div class="day-length-stats">
          <div class="day-stat">
            <div class="value">${dayLength}</div>
            <div class="label">Daylight</div>
          </div>
          <div class="day-stat">
            <div class="value">${dayPercentage}%</div>
            <div class="label">of 24 Hours</div>
          </div>
          <div class="day-stat">
            <div class="value">${nightLength}</div>
            <div class="label">Night Time</div>
          </div>
        </div>
      </div>
    `;
  };

  displayLongWeekendsInfo = (longWeekendsData) => {
    const lwContainer = document.querySelector("#lw-content");
    lwContainer.innerHTML = "";

    if (!longWeekendsData || longWeekendsData.length === 0) {
      lwContainer.innerHTML = `
        <div class="lw-error" style="padding: 2rem; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">
          <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <p>No long weekends found for ${this.selectedCountry} in ${this.selectedYear}.</p>
        </div>
      `;
      return;
    }

    longWeekendsData.forEach((lw, index) => {
      const startDate = new Date(lw.startDate);
      const endDate = new Date(lw.endDate);

      const startFormatted = startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endFormatted = endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const dayCount = lw.dayCount;
      const needsBridge = lw.needBridgeDay;

      // Generate visual days representation
      let daysVisual = "";
      const currentDate = new Date(startDate);
      for (let i = 0; i < dayCount; i++) {
        const dayName = currentDate.toLocaleDateString("en-US", {
          weekday: "short",
        });
        const dayNum = currentDate.getDate();
        const isWeekend =
          currentDate.getDay() === 0 || currentDate.getDay() === 6;

        daysVisual += `
          <div class="lw-day ${isWeekend ? "weekend" : ""}">
            <span class="name">${dayName}</span><span class="num">${dayNum}</span>
          </div>
        `;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const lwCard = document.createElement("div");
      lwCard.classList.add("lw-card");
      lwCard.innerHTML = `
        <div class="lw-card-header">
          <span class="lw-badge">
            <i class="fa-solid fa-calendar-days"></i> ${dayCount} Days
          </span>
          <button class="holiday-action-btn">
            <i class="fa-regular fa-heart"></i>
          </button>
        </div>
        <h3>Long Weekend #${index + 1}</h3>
        <div class="lw-dates">
          <i class="fa-regular fa-calendar"></i> ${startFormatted} - ${endFormatted}
        </div>
        <div class="lw-info-box ${needsBridge ? "warning" : "success"}">
          <i class="fa-solid fa-${needsBridge ? "info-circle" : "check-circle"}"></i> 
          ${needsBridge ? "Requires taking a bridge day off" : "No extra days off needed!"}
        </div>
        <div class="lw-days-visual">
          ${daysVisual}
        </div>
      `;
      lwContainer.appendChild(lwCard);
    });
  };

  initRounting = () => {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((navItem) =>
      navItem.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.currentTarget.getAttribute("data-view");
        if (!view) return;
        this.mapViews(view, e.currentTarget);
        // window.history.pushState({ view }, "", `/${view}`);
        window.location.hash = `#/${view}`;
      }),
    );
  };

  clearActiveView = () => {
    const navItems = document.querySelectorAll(".nav-item");
    const viewSections = document.querySelectorAll(".view");
    viewSections.forEach((viewSection) =>
      viewSection.classList.remove("active"),
    );
    navItems.forEach((navItem) => navItem.classList.remove("active"));
  };
  updatePageTitle = (viewName) => {
    const titles = {
      dashboard: {
        title: "Dashboard",
        subtitle: "Welcome back! Ready to plan your next adventure?",
      },
      holidays: {
        title: "Public Holidays",
        subtitle: "Discover public holidays and plan your trips accordingly",
      },
      events: {
        title: "Local Events",
        subtitle: "Explore exciting events happening around the world",
      },
      weather: {
        title: "Weather Forecast",
        subtitle: "Check current weather conditions and forecasts",
      },
      "long-weekends": {
        title: "Long Weekends",
        subtitle: "Find the perfect long weekends for your getaway",
      },
      "sun-times": {
        title: "Sunrise & Sunset Times",
        subtitle: "Track daylight hours for your destination",
      },
      "my-plans": {
        title: "My Travel Plans",
        subtitle: "Manage and organize your upcoming trips",
      },
    };

    const pageData = titles[viewName] || {
      title: "Wanderlust",
      subtitle: "Your global travel planner",
    };

    document.querySelector("#page-title").textContent = pageData.title;
    document.querySelector("#page-subtitle").textContent = pageData.subtitle;
  };

  mapViews = (viewName, clickedLinkEle) => {
    this.clearActiveView();
    const viewComponent = document.querySelector(`#${viewName}-view`);
    clickedLinkEle.classList.add("active");
    viewComponent.classList.add("active");

    // Update page title and subtitle
    this.updatePageTitle(viewName);
    if (
      !this.selectedCountry &&
      viewName !== "dashboard" &&
      viewName !== "my-plans"
    ) {
      this.showEmptyState(viewName);
      return;
    }
    // console.log(viewName);
    if (this.selectedCountry && viewName === "weather") {
      if (this.coords) {
        // console.log("Loading weather for: " + this.selectedCountry);
        this.fetchWeatherData();
      }
    } else if (this.selectedCountry && viewName === "holidays") {
      this.fetchHolidayData();
    } else if (viewName === "events") {
      this.fetchEventsData();
    } else if (viewName === "sun-times") {
      if (this.coords) {
        this.fetchSunTimesData();
      }
    } else if (this.selectedCountry && viewName === "long-weekends") {
      this.fetchLongWeekendsData();
    } else if (viewName === "currency") {
      this.handleConversion();
    }
  };

  showEmptyState = (viewName) => {
    const containerMap = {
      holidays: "#holidays-content",
      weather: "#weather-content",
      events: "#events-content",
      "long-weekends": "#lw-content",
      "sun-times": "#sun-times-content",
    };

    const containerSelector = containerMap[viewName];
    if (!containerSelector) return;

    const container = document.querySelector(containerSelector);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fa-solid fa-calendar-xmark"></i></div>
        <h3>No Country Selected</h3>
        <p>Select a country from the dashboard to explore ${viewName.replace("-", " ")}</p>
        <button class="btn btn-primary" id="redirect-dashboard">
          <i class="fa-solid fa-globe"></i> Go to Dashboard
        </button>
      </div>
    `;

    document
      .querySelector("#redirect-dashboard")
      .addEventListener("click", () => {
        const dashboardNav = document.querySelector('[data-view="dashboard"]');
        this.mapViews("dashboard", dashboardNav);
      });
  };

  saveToPlans = (planData) => {
    if (!this.savedPlans.some((p) => p.id === planData.id)) {
      this.savedPlans.push(planData);
      localStorage.setItem("wanderlust_plans", JSON.stringify(this.savedPlans));
      this.updatePlansUI();
      this.showToast(`${planData.title} added to your plans!`, "success");
    } else {
      this.showToast("Already in your plans", "info");
    }
  };

  removeFromPlans = (planId) => {
    this.savedPlans = this.savedPlans.filter((p) => p.id !== planId);
    localStorage.setItem("wanderlust_plans", JSON.stringify(this.savedPlans));
    this.updatePlansUI();
    this.showToast("Removed from plans", "success");
  };

  updatePlansUI = () => {
    // Update badge count
    const plansCount = this.savedPlans.length;
    const plansBadge = document.querySelector("#plans-count");
    if (plansBadge) {
      if (plansCount > 0) {
        plansBadge.textContent = plansCount;
        plansBadge.classList.remove("hidden");
      } else {
        plansBadge.classList.add("hidden");
      }
    }

    // Update dashboard stat card
    const statSaved = document.querySelector("#stat-saved");
    if (statSaved) {
      statSaved.textContent = plansCount;
    }

    // Update filter counts
    const holidayCount = this.savedPlans.filter(
      (p) => p.type === "holiday",
    ).length;
    const eventCount = this.savedPlans.filter((p) => p.type === "event").length;
    const lwCount = this.savedPlans.filter(
      (p) => p.type === "longweekend",
    ).length;

    const filterAllCount = document.querySelector("#filter-all-count");
    const filterHolidayCount = document.querySelector("#filter-holiday-count");
    const filterEventCount = document.querySelector("#filter-event-count");
    const filterLwCount = document.querySelector("#filter-lw-count");

    if (filterAllCount) filterAllCount.textContent = plansCount;
    if (filterHolidayCount) filterHolidayCount.textContent = holidayCount;
    if (filterEventCount) filterEventCount.textContent = eventCount;
    if (filterLwCount) filterLwCount.textContent = lwCount;

    // Display plans
    this.displayMyPlans();
  };

  displayMyPlans = (filter = "all") => {
    const plansContent = document.querySelector("#plans-content");

    if (!plansContent) return;

    if (this.savedPlans.length === 0) {
      plansContent.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fa-solid fa-heart-crack"></i>
          </div>
          <h3>No Saved Plans Yet</h3>
          <p>Start exploring and save holidays, events, or long weekends you like!</p>
          <button class="btn-primary" id="start-exploring-btn">
            <i class="fa-solid fa-compass"></i> Start Exploring
          </button>
        </div>
      `;

      // Add event listener to start exploring button
      const startBtn = document.querySelector("#start-exploring-btn");
      if (startBtn) {
        startBtn.addEventListener("click", () => {
          const dashboardLink = document.querySelector(
            '[data-view="dashboard"]',
          );
          if (dashboardLink) dashboardLink.click();
        });
      }
      return;
    }

    const filteredPlans =
      filter === "all"
        ? this.savedPlans
        : this.savedPlans.filter((p) => p.type === filter);

    plansContent.innerHTML = "";

    filteredPlans.forEach((plan) => {
      const planCard = document.createElement("div");
      planCard.classList.add("plan-card");
      planCard.setAttribute("data-type", plan.type);

      if (plan.type === "holiday") {
        planCard.innerHTML = `
          <span class="plan-card-type holiday">Holiday</span>
          <div class="plan-card-content">
            <h4>${plan.title}</h4>
            <div class="plan-card-details">
              <div><i class="fa-regular fa-calendar"></i>${plan.date}</div>
              <div><i class="fa-solid fa-circle-info"></i>${plan.localName || plan.title}</div>
            </div>
            <div class="plan-card-actions">
              <button class="btn-plan-remove" data-id="${plan.id}">
                <i class="fa-solid fa-trash"></i> Remove
              </button>
            </div>
          </div>
        `;
      } else if (plan.type === "event") {
        planCard.innerHTML = `
          <span class="plan-card-type event">Event</span>
          <div class="plan-card-content">
            <h4>${plan.title}</h4>
            <div class="plan-card-details">
              <div><i class="fa-regular fa-calendar"></i>${plan.date}</div>
              <div><i class="fa-solid fa-location-dot"></i>${plan.venue}</div>
            </div>
            <div class="plan-card-actions">
              <button class="btn-plan-remove" data-id="${plan.id}">
                <i class="fa-solid fa-trash"></i> Remove
              </button>
            </div>
          </div>
        `;
      } else if (plan.type === "longweekend") {
        planCard.innerHTML = `
          <span class="plan-card-type longweekend">Long Weekend</span>
          <div class="plan-card-content">
            <h4>${plan.title}</h4>
            <div class="plan-card-details">
              <div><i class="fa-regular fa-calendar"></i>${plan.dateRange}</div>
              <div><i class="fa-solid fa-circle-info"></i>${plan.needsBridge ? "Bridge day needed" : "No extra days off needed"}</div>
            </div>
            <div class="plan-card-actions">
              <button class="btn-plan-remove" data-id="${plan.id}">
                <i class="fa-solid fa-trash"></i> Remove
              </button>
            </div>
          </div>
        `;
      }

      plansContent.appendChild(planCard);
    });

    // Add remove button event listeners
    document.querySelectorAll(".btn-plan-remove").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const planId = e.currentTarget.getAttribute("data-id");
        this.removeFromPlans(planId);
      });
    });
  };

  setupMyPlansListeners = () => {
    // Filter buttons
    const filterButtons = document.querySelectorAll(".plan-filter");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        const filter = e.currentTarget.getAttribute("data-filter");
        this.displayMyPlans(filter);
      });
    });

    // Clear all button
    const clearAllBtn = document.querySelector("#clear-all-plans-btn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        this.showConfirmModal(
          "Clear All Plans?",
          "Are you sure you want to clear all saved plans? This action cannot be undone.",
          () => {
            this.savedPlans = [];
            localStorage.setItem(
              "wanderlust_plans",
              JSON.stringify(this.savedPlans),
            );
            this.updatePlansUI();
            this.showToast("All plans cleared", "success");
          },
        );
      });
    }
  };

  showConfirmModal = (title, message, onConfirm) => {
    const modalOverlay = document.querySelector("#modal-overlay");
    const modalBody = document.querySelector("#modal-body");
    const modalCloseBtn = document.querySelector("#modal-close-btn");

    if (!modalOverlay || !modalBody) return;

    modalBody.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, var(--danger-100) 0%, var(--danger-200) 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 36px; color: var(--danger-600);"></i>
        </div>
        <h2 style="font-size: 24px; font-weight: 700; color: var(--slate-800); margin-bottom: 12px;">${title}</h2>
        <p style="color: var(--slate-600); margin-bottom: 32px; font-size: 15px;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="modal-cancel-btn" class="btn-outline" style="padding: 12px 24px;">
            <i class="fa-solid fa-xmark"></i> Cancel
          </button>
          <button id="modal-confirm-btn" class="btn-danger-outline" style="padding: 12px 24px;">
            <i class="fa-solid fa-trash"></i> Clear All
          </button>
        </div>
      </div>
    `;

    modalOverlay.classList.remove("hidden");

    const closeModal = () => {
      modalOverlay.classList.add("hidden");
    };

    // Cancel button
    const cancelBtn = modalBody.querySelector("#modal-cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", closeModal);
    }

    // Confirm button
    const confirmBtn = modalBody.querySelector("#modal-confirm-btn");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        onConfirm();
        closeModal();
      });
    }

    // Close button
    if (modalCloseBtn) {
      modalCloseBtn.onclick = closeModal;
    }

    // Click outside to close
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  };

  attachHeartListeners = () => {
    // Holiday heart buttons
    document.addEventListener("click", (e) => {
      if (e.target.closest(".holiday-action-btn")) {
        const holidayCard = e.target.closest(".holiday-card");
        if (holidayCard) {
          const title = holidayCard.querySelector("h3").textContent;
          const date = holidayCard
            .querySelector(".holiday-day-badge")
            .textContent.trim();
          const localName =
            holidayCard.querySelector(".holiday-name")?.textContent || title;

          const planData = {
            id: `holiday-${title}-${date}`,
            type: "holiday",
            title: title,
            date: date,
            localName: localName,
            savedAt: new Date().toISOString(),
          };

          this.saveToPlans(planData);
          e.target.closest(".holiday-action-btn").innerHTML =
            '<i class="fa-solid fa-heart"></i>';
        }
      }

      // Event heart buttons
      if (
        e.target.closest(".event-card-save") ||
        e.target.closest(".btn-event")
      ) {
        const eventCard = e.target.closest(".event-card");
        if (eventCard) {
          const title = eventCard.querySelector("h3").textContent;
          const dateInfo =
            eventCard
              .querySelector(".event-card-info div:first-child")
              ?.textContent.trim() || "";
          const venueInfo =
            eventCard
              .querySelector(".event-card-info div:last-child")
              ?.textContent.trim() || "";
          const ticketLink =
            eventCard.querySelector(".btn-buy-ticket")?.getAttribute("href") ||
            "";

          const planData = {
            id: `event-${title}-${Date.now()}`,
            type: "event",
            title: title,
            date: dateInfo,
            venue: venueInfo,
            url: ticketLink,
            savedAt: new Date().toISOString(),
          };

          this.saveToPlans(planData);
          const heartBtn =
            eventCard.querySelector(".event-card-save") ||
            eventCard.querySelector(".btn-event");
          if (heartBtn) {
            heartBtn.innerHTML = '<i class="fa-solid fa-heart"></i>';
          }
        }
      }

      // Long weekend heart buttons
      if (e.target.closest(".lw-card .holiday-action-btn")) {
        const lwCard = e.target.closest(".lw-card");
        if (lwCard) {
          const title = lwCard.querySelector("h3").textContent;
          const dateRange = lwCard
            .querySelector(".lw-dates")
            .textContent.trim();
          const dayCount = lwCard.querySelector(".lw-badge").textContent.trim();

          const planData = {
            id: `lw-${title}-${dateRange}`,
            type: "longweekend",
            title: title,
            dateRange: dateRange,
            dayCount: dayCount,
            savedAt: new Date().toISOString(),
          };

          this.saveToPlans(planData);
          e.target.closest(".holiday-action-btn").innerHTML =
            '<i class="fa-solid fa-heart"></i>';
        }
      }
    });
  };

  showToast = (message, type = "info") => {
    const toastContainer = document.querySelector("#toast-container");
    if (!toastContainer) return;

    const toast = document.createElement("div");
    toast.classList.add("toast", `toast-${type}`);
    toast.innerHTML = `
      <i class="fa-solid fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  };

  showLoading = (text = "Loading...") => {
    const loadingOverlay = document.querySelector("#loading-overlay");
    const loadingText = document.querySelector("#loading-text");

    if (loadingOverlay) {
      if (loadingText) {
        loadingText.textContent = text;
      }
      loadingOverlay.classList.remove("hidden");
    }
  };

  hideLoading = () => {
    const loadingOverlay = document.querySelector("#loading-overlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden");
    }
  };
}

const initApp = new App();
