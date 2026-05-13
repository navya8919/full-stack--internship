
// =====================================
// 1. Fetch First 5 Posts
// =====================================

async function fetchPosts() {

    let response =
        await fetch("https://jsonplaceholder.typicode.com/posts");

    let posts = await response.json();

    let postList =
        document.getElementById("postList");

    postList.innerHTML = "";

    posts.slice(0, 5).forEach(post => {

        let li = document.createElement("li");

        li.innerText = post.title;

        postList.appendChild(li);
    });
}


// =====================================
// 2. Simulate Download
// =====================================

function simulateDownload(file) {

    return new Promise(resolve => {

        let time =
            Math.floor(Math.random() * 5000) + 1000;

        setTimeout(() => {

            resolve(file + " downloaded in " + time / 1000 + " seconds");

        }, time);
    });
}

async function downloadFiles() {

    let result =
        document.getElementById("downloadResult");

    result.innerHTML = "Downloading files...";

    let file1 =
        await simulateDownload("File1");

    let file2 =
        await simulateDownload("File2");

    let file3 =
        await simulateDownload("File3");

    result.innerHTML =
        `${file1}<br>
         ${file2}<br>
         ${file3}`;
}


// =====================================
// 3. Display API Data on Webpage
// =====================================

async function fetchUsers() {

    let response =
        await fetch("https://jsonplaceholder.typicode.com/users");

    let users =
        await response.json();

    let container =
        document.getElementById("userContainer");

    container.innerHTML = "";

    users.forEach(user => {

        let div =
            document.createElement("div");

        div.classList.add("user-card");

        div.innerHTML = `
            <h3>${user.name}</h3>
            <p>${user.email}</p>
        `;

        container.appendChild(div);
    });
}


// =====================================
// 4. Weather Simulator
// =====================================

async function getWeather(city) {

    return new Promise(resolve => {

        setTimeout(() => {

            resolve(`Weather in ${city}: 30°C ☀️`);

        }, 2000);
    });
}

async function showWeather() {

    let city =
        document.getElementById("cityInput").value;

    let weatherResult =
        document.getElementById("weatherResult");

    weatherResult.innerText =
        "Fetching weather...";

    let result =
        await getWeather(city);

    weatherResult.innerText = result;
}