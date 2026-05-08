
// ==========================
// 1. Factorial Function
// ==========================
function factorial(n) {
    let result = 1;

    for (let i = 1; i <= n; i++) {
        result *= i;
    }

    return result;
}

function findFactorial() {
    let num = Number(document.getElementById("factorialNum").value);

    document.getElementById("factorialResult").innerText =
        "Factorial = " + factorial(num);
}


// ==========================
// 2. Reverse String
// ==========================
function reverseString(str) {
    return str.split("").reverse().join("");
}

function reverseText() {
    let text = document.getElementById("reverseText").value;

    document.getElementById("reverseResult").innerText =
        reverseString(text);
}


// ==========================
// 3. Palindrome Checker
// ==========================
function isPalindrome(str) {
    let reversed = str.split("").reverse().join("");

    return str === reversed;
}

function checkPalindrome() {
    let text = document.getElementById("palindromeText").value;

    if (isPalindrome(text)) {
        document.getElementById("palindromeResult").innerText =
            text + " is a Palindrome";
    } else {
        document.getElementById("palindromeResult").innerText =
            text + " is Not a Palindrome";
    }
}


// ==========================
// 4. To-Do List
// ==========================
let tasks = [];

function addTask() {
    let taskInput = document.getElementById("taskInput");
    let taskText = taskInput.value;

    if (taskText === "") {
        alert("Please enter a task");
        return;
    }

    tasks.push({
        text: taskText,
        completed: false
    });

    taskInput.value = "";

    showTasks();
}

function showTasks() {
    let taskList = document.getElementById("taskList");

    taskList.innerHTML = "";

    tasks.forEach((task, index) => {

        let li = document.createElement("li");

        li.innerHTML = `
            <span class="${task.completed ? 'completed' : ''}">
                ${task.text}
            </span>

            <button onclick="completeTask(${index})">
                Complete
            </button>

            <button onclick="deleteTask(${index})">
                Delete
            </button>
        `;

        taskList.appendChild(li);
    });
}

function deleteTask(index) {
    tasks.splice(index, 1);

    showTasks();
}

function completeTask(index) {
    tasks[index].completed = true;

    showTasks();
}