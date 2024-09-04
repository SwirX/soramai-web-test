window.onload = () => {
    // Get the current URL
    const currentUrl = window.location.href;

    // Parse the query parameters from the URL
    const url = new URL(currentUrl);
    const params = new URLSearchParams(url.search);

    // Get the 'id' query parameter
    var id = params.get("id");
    
    // Display the 'id' parameter in the element with id 'id'
    document.getElementById("id").textContent = id;
};