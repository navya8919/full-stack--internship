
// 1. Positive / Negative / Zero
function checkNumber() {
    let num = Number(document.getElementById("checkNum").value);

    if (num > 0) {
        document.getElementById("checkResult").innerText = "Positive";
    } else if (num < 0) {
        document.getElementById("checkResult").innerText = "Negative";
    } else {
        document.getElementById("checkResult").innerText = "Zero";
    }
}


// 2. Max of 3 Numbers
function max(a, b, c) {
    if (a >= b && a >= c) return a;
    else if (b >= a && b >= c) return b;
    else return c;
}

function findMax() {
    let a = Number(document.getElementById("numA").value);
    let b = Number(document.getElementById("numB").value);
    let c = Number(document.getElementById("numC").value);

    let result = max(a, b, c);
    document.getElementById("maxResult").innerText = "Largest: " + result;
}


// 3. Multiplication Table
function printTable() {
    let num = Number(document.getElementById("tableNum").value);
    let output = "";

    for (let i = 1; i <= 10; i++) {
        output += num + " x " + i + " = " + (num * i) + "\n";
    }

    document.getElementById("tableResult").innerText = output;
}


// 4. Calculator Functions
function getValues() {
    let a = Number(document.getElementById("num1").value);
    let b = Number(document.getElementById("num2").value);
    return { a, b };
}

function add() {
    let { a, b } = getValues();
    document.getElementById("calcResult").innerText = "Result: " + (a + b);
}

function subtract() {
    let { a, b } = getValues();
    document.getElementById("calcResult").innerText = "Result: " + (a - b);
}

function multiply() {
    let { a, b } = getValues();
    document.getElementById("calcResult").innerText = "Result: " + (a * b);
}

function divide() {
    let { a, b } = getValues();

    if (b === 0) {
        document.getElementById("calcResult").innerText = "Cannot divide by zero";
    } else {
        document.getElementById("calcResult").innerText = "Result: " + (a / b);
    }
}


// Even / Odd Check
function checkEvenOdd() {
    let a = Number(document.getElementById("num1").value);

    if (a % 2 === 0) {
        document.getElementById("calcResult").innerText = a + " is Even";
    } else {
        document.getElementById("calcResult").innerText = a + " is Odd";
    }
}