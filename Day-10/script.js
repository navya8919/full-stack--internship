
// =========================
// Dynamic Projects
// =========================

let projects = [

    "Calculator App",

    "To-Do List",

    "Number Guessing Game",

    "Portfolio Website"
];

let projectList =
    document.getElementById("project-list");

projects.forEach(project => {

    let li =
        document.createElement("li");

    li.innerText = project;

    projectList.appendChild(li);
});


// =========================
// Form Validation
// =========================

document.getElementById("contactForm")
    .addEventListener("submit", function (e) {

        e.preventDefault();

        let name =
            document.getElementById("name").value.trim();

        let email =
            document.getElementById("email").value.trim();

        let phone =
            document.getElementById("phone").value.trim();

        let message =
            document.getElementById("message").value.trim();

        let msg =
            document.getElementById("formMessage");

        if (
            name === "" ||
            email === "" ||
            phone === "" ||
            message === ""
        ) {

            msg.innerText =
                "All fields are required!";

            msg.style.color = "red";

        }

        else if (!email.includes("@")) {

            msg.innerText =
                "Please enter a valid email!";

            msg.style.color = "red";
        }

        else if (phone.length < 10) {

            msg.innerText =
                "Phone number must be 10 digits!";

            msg.style.color = "red";
        }

        else {

            msg.innerText =
                "Message sent successfully!";

            msg.style.color = "green";
        }
    });


// =========================
// Smooth Scroll
// =========================

document.querySelectorAll('a[href^="#"]')
    .forEach(anchor => {

        anchor.addEventListener("click", function (e) {

            e.preventDefault();

            document.querySelector(
                this.getAttribute("href")
            ).scrollIntoView({

                behavior: "smooth"
            });
        });
    });


// =========================
// Dark Mode Toggle
// =========================

document.getElementById("darkModeBtn")
    .addEventListener("click", function () {

        document.body.classList.toggle("dark-mode");
    });