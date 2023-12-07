document.addEventListener("DOMContentLoaded", function () {


    const inputElement = document.getElementById('imageInput'); // Replace 'fileInput' with your file input element's ID.
    const addressForm = document.getElementById('addressForm')
    const addressList = document.querySelector('#route > ol')
    const progressBar = document.getElementById('progressbar')

    var addresses = []

    document.getElementById("sendaddresses").addEventListener("click", function (event) {
        sendToMaps(addresses)
    })

    inputElement.addEventListener('change', function (event) {

        progressBar.classList.remove('visually-hidden')

        document.getElementById("sendaddresses").disabled = true
        console.log(addressForm)
        console.log(addressList)
        addressForm.innerHTML = ""
        addressList.innerHTML = ""
        addresses = []

        handleImage(event)

        
    })





    function handleImage() {

        const file = event.target.files[0];
        const maxWidth = 1920;
        const maxHeight = 1080;
        const maxFileSizeInBytes = 1000000; // 1MB
        const outputFormat = 'image/jpeg'; // Change to your desired image format.

        compressImage(file, maxWidth, maxHeight, maxFileSizeInBytes, outputFormat, (compressedBlob) => {
            // Handle the compressed image blob here (e.g., upload or display it).

            const formData = formForImageUpload(compressedBlob)
            submitImageToOCR(formData)

        })
    }

    function formForImageUpload(compressedBlob) {

        let formData = new FormData();
        formData.append("file", compressedBlob, "compressed.jpg");
        formData.append("language", "eng");
        formData.append("apikey", "K82133973888957"); // Replace with your actual API key
        formData.append("isOverlayRequired", true);

        return formData
    }


    function generateCheckboxes(streets) {


        const form = document.getElementById("addressForm");

        streets.forEach(function(address,i) {
            
            const listItem = document.createElement('li')
            listItem.classList.add('list-group-item')


            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "address";
            checkbox.setAttribute('id',`checkbox-${i}`)
            checkbox.classList.add('form-check-input,me-1,mr-2')

            const label = document.createElement("label");
            label.classList.add('form-check-label,stretched-link,ml-2')
            label.setAttribute('for', `checkbox-${i}`)
            label.textContent = address

            listItem.appendChild(checkbox)
            listItem.appendChild(label)

            form.appendChild(listItem);
        });

        const checkboxes = document.querySelectorAll('input[type="checkbox"]'); 

        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', function () {
                console.log(checkbox.checked)
                updateRoute(checkbox, checkbox.checked)
            })
        });

        progressBar.classList.add('visually-hidden')

    }

    function updateRoute(checkbox, checkboxState) {

        const list = document.querySelector("#route > ol");
        var listItems = document.querySelectorAll("#route > ol > li")
        var label = checkbox.nextElementSibling

        console.log(list)
        console.log(label.textContent)

        if (checkboxState) {
            const newItem = document.createElement('li')
            newItem.textContent = label.textContent
            list.appendChild(newItem)
            addresses.push(label.textContent)
        } else {
            addresses = addresses.filter(function (item) {

                console.log(item + " ==? " + label.textContent)
                return item !== label.textContent
            });


            listItems.forEach(function (li) {
                if (li.textContent === label.textContent) {
                    // Remove the <li> element if the text matches
                    li.remove();
                }
            })

        }

        goButtonSwitch()

    }

    function submitImageToOCR(formData) {

        console.log(formData)

        fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data["OCRExitCode"] === 1 && data["ParsedResults"]) {

                    const streets = handleFetchResults(data["ParsedResults"])
                    generateCheckboxes(streets)

                } else if (data["IsErroredOnProcessing"]) {
                    document.getElementById('output').textContent = `Error: ${data["ErrorMessage"]} Details: ${data["ErrorDetails"]}`;
                } else {
                    document.getElementById('output').textContent = "No ParsedResults found in the response";
                }
            })
            .catch(error => {
                document.getElementById('output').textContent = "Error: " + error.message;
            });

    }

    function handleFetchResults(parsedResults) {

        var resultsData = parsedResults
        var results = []


        resultsData.forEach((line) => {

            results += line["ParsedText"]

        })

        return parseStreets(results)

    }

    function parseStreets(results) {

        // Use regular expressions to find the street numbers and names
        const regex = /(\d+)\s+([A-Za-z\s]+)\n/g;
        const matches = [...results.matchAll(regex)];

        var streetData = matches
            .map(match => `${match[1]} ${match[2].split('\n')[0]}`)

        streetData = streetData.filter(entry => {
            const trimmedEntry = entry.trim();
            // Check if the entry is not just a number followed by a single word and is at least 8 characters long
            return !/^\d+\s+\w+$/.test(trimmedEntry) && trimmedEntry.length >= 8;
        });

        streetData = streetData.filter(entry => !/^\d+\s+\w+$/.test(entry))

        streetData = streetData.map(add => add + ", Chesapeake, VA")


        return streetData

    }


    function compressImage(file, maxWidth, maxHeight, maxFileSizeInBytes, outputFormat, callback) {
        const image = new Image();

        image.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let newWidth = image.width;
            let newHeight = image.height;

            if (image.width > maxWidth) {
                newWidth = maxWidth;
                newHeight = (image.height * maxWidth) / image.width;
            }

            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = (image.width * maxHeight) / image.height;
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            ctx.drawImage(image, 0, 0, newWidth, newHeight);

            canvas.toBlob(
                (blob) => {
                    if (blob.size > maxFileSizeInBytes) {
                        // If the compressed image is still too large, recursively call the function with lower quality or dimensions.
                        compressImage(file, maxWidth, maxHeight, maxFileSizeInBytes, outputFormat, callback);
                    } else {
                        callback(blob);
                    }
                },
                outputFormat,
                0.7 // Adjust the quality as needed (0.7 is 70% quality).
            );
        };

        image.src = URL.createObjectURL(file);
    }

    function getCheckedAddresses() {
        const checkedAddresses = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkedAddresses.push(checkbox.value);
            }
        });

        return checkedAddresses

    }

    function sendToMaps(addresses) {
        const startAddress = "346 S Battlefield Blvd, Chesapeake, VA"
        const endAddress = "346 S Battlefield Blvd, Chesapeake, VA"
        const waypoints = addresses.join('/');

        const mapLink = `https://www.google.com/maps/dir/${encodeURIComponent(startAddress)}/${waypoints}/${encodeURIComponent(endAddress)}`;

        window.location.href = mapLink;
    }

    function goButtonSwitch() {
        var allCheckboxesUnchecked = true

        const goButton = document.getElementById("sendaddresses")
        var checkboxes = document.querySelectorAll('input[type="checkbox"')

        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
                allCheckboxesUnchecked = false
                break
            }
        }

        console.log("allCheckBoxesUnchecked: " + allCheckboxesUnchecked)
        goButton.disabled = allCheckboxesUnchecked
    }

})

