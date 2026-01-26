class App {
  constructor(baseURL = "https://restcountries.com/v3.1/alpha/") {
    this.baseURL = baseURL;
    this.data = [];
  }
  fetchCountryData = async (countryCode) => {
    const response = await fetch(`${this.baseURL + countryCode}`);
    const data = await response.json();
    this.data = data;
    console.log(this.data);
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

const initApp = new App();
initApp.initRounting();
initApp.fetchCountryData("EG");
