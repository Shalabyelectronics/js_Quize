class App {
  constructor(baseURL = "https://restcountries.com/v3.1/") {
    this.baseURL = baseURL;
    this.countryDataEndpoint = "alpha/";
    this.allCountriesEndpoint = "all";
    this.weatherCastEndPoint = `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.006&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;
    this.optionsParams = {
      allCountriesEndPointParams: "?fields=name,cca2",
    };
    this.countryData = [];
    this.weatherData = [];
    this.initEventListeners();
    this.getCountriesToSelect();
    this.selectedCountry = null;
    this.selectedCity = null;
    this.coords = null;
    this.selectedYear = 2026;
  }
  getCountriesToSelect = async () => {
    const response = await fetch(
      `${this.baseURL + this.allCountriesEndpoint + this.optionsParams.allCountriesEndPointParams}`,
    );
    const data = await response.json();
    const selectCountryEle = document.querySelector("#global-country");
    const countriesSorted = data.sort((a, b) => {
      return a.name.common.localeCompare(b.name.common);
    });
    countriesSorted.forEach((country) => {
      const optionHTML = `<option value=${country.cca2}>${country.cca2} ${country.name.common}</option>`;
      selectCountryEle.insertAdjacentHTML("beforeend", optionHTML);
    });

    // console.log(countriesSorted);
  };
  fetchWeatherData = async () => {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${this.coords[0]}&longitude=${this.coords[1]}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`,
    );
    const data = await response.json();
    this.weatherData = data;
    this.displayWeatherInfo(this.weatherData);
  };
  fetchCountryData = async (countryCode) => {
    const response = await fetch(
      `${this.baseURL + this.countryDataEndpoint + countryCode}`,
    );
    const data = await response.json();
    this.countryData = data[0];
    this.coords = this.countryData.latlng;
    this.selectedCity = this.countryData.capital[0];
    this.displayCountryInfo(this.countryData);
  };
  initEventListeners = () => {
    const countryCardContainer = document.querySelector(
      "#dashboard-country-info-section",
    );
    countryCardContainer.classList.add("hide");
    const selectCountryEle = document.querySelector("#global-country");
    selectCountryEle.addEventListener("change", (e) => {
      if (e.currentTarget.value) {
        countryCardContainer.classList.remove("hide");
        this.fetchCountryData(e.currentTarget.value);
        this.selectedCountry = e.currentTarget.value;
      } else {
        countryCardContainer.classList.add("hide");
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
        // console.log(bordersElements);
      }
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
    console.log("Applying icon:", style.icon);

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
    console.log(forecastList);
  };
  initRounting = () => {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((navItem) =>
      navItem.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.currentTarget.getAttribute("data-view");
        if (!view) return;
        this.mapViews(view, e.currentTarget);
        window.history.pushState({ view }, "", `/${view}`);
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
  mapViews = (viewName, clickedLinkEle) => {
    this.clearActiveView();
    const viewComponent = document.querySelector(`#${viewName}-view`);
    clickedLinkEle.classList.add("active");
    viewComponent.classList.add("active");
    console.log(viewName);
    if (this.selectedCountry && viewName === "weather") {
      if (this.coords) {
        console.log("Loading weather for: " + this.selectedCountry);
        this.fetchWeatherData();
      }
    }
  };
}

const initApp = new App();
initApp.initRounting();
