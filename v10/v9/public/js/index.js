// Get the button:
let mybutton = document.getElementById("myBtn");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}


// script.js
document.addEventListener("DOMContentLoaded", function() {
  // Get the button and dropdown elements
  var getSelectedValueButton = document.getElementById("getSelectedValue");
  var myDropdown = document.getElementById("Category");

  // Add a click event listener to the button
  getSelectedValueButton.addEventListener("click", function() {
    // Get the selected value from the dropdown
    var selectedValue = myDropdown.value;

    // Log or use the selected value
    console.log("Selected value:", selectedValue);

    // You can perform other actions with the selected value here
  });
});
