document.addEventListener("DOMContentLoaded", function() {
    const navElement = document.getElementById("main-nav");
    if (!navElement) return;

    // 1. Define your navigation links here. 
    // To add or remove a page in the future, JUST edit this array!
    const links = [
        { name: "Home", url: "index.html" },
        { name: "Registration", url: "registration.html" },
        { name: "Parent Info", url: "parent-info.html" },
        { name: "About Us", url: "about.html" },
        { name: "Coach Info", url: "coaching.html" },
        { name: "Field Locations", url: "fields.html" }
    ];

    // 2. Detect the current page filename to automatically highlight the active tab
    let currentPath = window.location.pathname.split("/").pop();
    if (!currentPath.endsWith(".html")) {
        currentPath = "index.html"; // Defaults to home if URL ends in a trailing slash
    }

    // 3. Build the navigation HTML structure
    let navHtml = '<div class="container"><ul>';
    links.forEach(link => {
        const isActive = currentPath === link.url ? ' class="active"' : '';
        navHtml += `<li><a href="${link.url}"${isActive}>${link.name}</a></li>`;
    });
    navHtml += '</ul></div>';

    // 4. Inject it into the page
    navElement.innerHTML = navHtml;
});
