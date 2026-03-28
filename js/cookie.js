// Cookie Consent Banner
document.addEventListener("DOMContentLoaded", function () {
  if (!localStorage.getItem("cookieConsent")) {
    const banner = document.createElement("div");
    banner.id = "cookie-banner";
    banner.innerHTML = `
      <div style="position: fixed; bottom: 0; left: 0; width: 100%; background: #222; color: #fff; padding: 15px 20px; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 -2px 10px rgba(0,0,0,0.5);">
        <p style="margin: 0 0 10px; font-size: 0.95rem; line-height: 1.4;">
          Wir nutzen Cookies (z.B. für Google Analytics/Meta Pixel), um unsere Webseite optimal zu gestalten und fortlaufend zu verbessern. 
          / We use cookies (e.g., for Google Analytics/Meta Pixel) to ensure you get the best experience on our website.
          <br><a href="/datenschutz.html" style="color: #f4b41a; text-decoration: underline; margin-right: 15px;">Datenschutzerklärung</a>
          <a href="/privacy.html" style="color: #f4b41a; text-decoration: underline;">Privacy Policy</a>
        </p>
        <div>
          <button id="accept-cookies" style="background: #cc0605; color: #fff; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-right: 10px;">Alle akzeptieren / Accept All</button>
          <button id="decline-cookies" style="background: #555; color: #fff; border: none; padding: 8px 20px; border-radius: 5px; cursor: pointer;">Ablehnen / Decline</button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById("accept-cookies").addEventListener("click", function() {
      localStorage.setItem("cookieConsent", "accepted");
      document.body.removeChild(banner);
      // Optional: Initialize tracking scripts here
    });
    
    document.getElementById("decline-cookies").addEventListener("click", function() {
      localStorage.setItem("cookieConsent", "declined");
      document.body.removeChild(banner);
    });
  }
});
