class App {
  constructor() {
    const navItems = document.querySelectorAll(".nav-item");
    const defaultView = document.querySelector(".view.active");
    let viewComponent = null;
    const mapViews = (viewName) => {
      viewComponent = document.querySelector(`#${viewName}-view`);
      const pattern = /\/[a-zA-Z-]+$/;
      let pastView = window.location.href.match(pattern);
      // clear mainLayout inner HTML

      if (pastView) {
        pastView = pastView[0].slice(1);

        document.querySelector(`#${pastView}-view`).classList.remove("active");
      } else {
        defaultView.classList.remove("active");
      }
      viewComponent.classList.add("active");
    };
    navItems.forEach((navItem) =>
      navItem.addEventListener("click", function (e) {
        e.preventDefault();
        const view = this.getAttribute("data-view");
        mapViews(view);
        window.history.pushState({ view }, "", `/${view}`);
        console.log("Navigation to " + view);
      }),
    );
  }
}

const initApp = new App();
