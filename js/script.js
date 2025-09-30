function openCity(evt, cityName) {
  var i, tabcontent, tablinks;
  
  // Hide all tabcontent
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  // Remove active class from all tabs
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }

  // Show current tab
  var currentTab = document.getElementById(cityName);
  currentTab.style.display = "block";

  // Animate elements
  var detail = currentTab.querySelector(".tabcontent-detail");
  if (detail) {
    detail.classList.remove("active"); // reset
    setTimeout(() => detail.classList.add("active"), 10);
  }

  // Add active to clicked tab
  evt.currentTarget.className += " active";
}



