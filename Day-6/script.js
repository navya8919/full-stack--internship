
// ==========================
// Counter App
// ==========================

let count = 0;

function increase() {
    count++;

    document.getElementById("counter").innerText = count;
}

function decrease() {
    count--;

    document.getElementById("counter").innerText = count;
}


// ==========================
// Image Gallery
// ==========================

function changeImage(src) {

    document.getElementById("mainImage").src = src;
}


// ==========================
// To-Do List
// ==========================

document.getElementById("addBtn").addEventListener("click", function () {

    let input = document.getElementById("taskInput");

    let taskText = input.value;

    if (taskText === "") return;

    let li = document.createElement("li");

    li.innerText = taskText;

    // Toggle completed
    li.addEventListener("click", function () {

        li.classList.toggle("completed");
    });

    // Delete button
    let delBtn = document.createElement("button");

    delBtn.innerText = "❌";

    delBtn.addEventListener("click", function (event) {

        event.stopPropagation();

        li.remove();
    });

    li.appendChild(delBtn);

    document.getElementById("taskList").appendChild(li);

    input.value = "";
});


// Clear All
document.getElementById("clearBtn").addEventListener("click", function () {

    document.getElementById("taskList").innerHTML = "";
});


// ==========================
// Character Counter
// ==========================

document.getElementById("textArea").addEventListener("keyup", function () {

    let length = this.value.length;

    document.getElementById("charCount").innerText =
        length + " / 280 characters";
});