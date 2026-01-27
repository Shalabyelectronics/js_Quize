class App {
  constructor(baseURL = "https://restcountries.com/v3.1/alpha/") {
    this.baseURL = baseURL;
    this.data = [];
  }
  fetchCountryData = async (countryCode) => {
    const response = await fetch(`${this.baseURL + countryCode}`);
    const data = await response.json();
    this.data = data;
    this.displayCountryInfo(data[0]);
  };
  displayCountryInfo = (countryData) => {
    // 1- Country Flag image
    const countryFlagImg = document.querySelector(".dashboard-country-flag");
    countryFlagImg.setAttribute("src", countryData.flags.svg);
    countryFlagImg.setAttribute("alt", countryData.flags.alt);
    // 2- Country name
    const countryName = document.querySelector(".dashboard-country-title h3");
    countryName.innerText = countryData.name.common;
    // 3- country official name
    const countryOfficialName = document.querySelector(".official-name");
    countryOfficialName.innerText = countryData.name.official;
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
        .innerText.toLowerCase();
      countryDetail.querySelector(".value").innerText =
        countryDetailsData[keyName];
    }
    // 6- country Extras
    const countryExtraContainer = document.querySelector(
      ".dashboard-country-extras",
    ).children;
    const countryExtraData = {
      currency: Object.values(countryData.currencies)[0],
      languages: Object.values(countryData.languages).join(', '),
      neighbors: countryData.borders,
    };
    
    for (let counteryExtra of countryExtraContainer) {
      let keyName = counteryExtra.children[0].innerText.toLowerCase();
      if (keyName !== "neighbors") {
        if (keyName === "currency") {
          counteryExtra.children[1].children[0].innerText = `${countryExtraData[keyName].name} (${countryExtraData[keyName].symbol})`;
        } else if (keyName === "languages") {
          counteryExtra.children[1].children[0].innerText =
            countryExtraData[keyName];
        }
      } else {
        const bordersContainer = counteryExtra.children[1];
        // <span class="extra-tag border-tag">LBY</span>
        bordersContainer.innerHTML = "";
        const bordersElements = countryExtraData[keyName].map(
          (border) => `<span class="extra-tag border-tag">${border}</span>`,
        );
        bordersContainer.innerHTML = [...bordersElements].join('');
        // console.log(bordersElements);
      }
    }
    // console.log(countryExtraContainer);
    // console.log(countryExtraData);

    // console.log(countryData);
  };
  initRounting = () => {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((navItem) =>
      navItem.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.currentTarget.getAttribute("data-view");
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
  };
}
const selectCountryEle = document.querySelector("#global-country");
console.log(selectCountryEle)
const initApp = new App();
initApp.initRounting();
initApp.fetchCountryData("EG");
