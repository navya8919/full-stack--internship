// Multiplication Table
function printTable() {
    let num = Number(document.getElementById("tableNum").value);
    let output = "";

    for (let i = 1; i <= 10; i++) {
        output += num + " x " + i + " = " + (num * i) + "\n";
    }

    document.getElementById("tableResult").innerText = output;
}


// Prime Number
function checkPrime() {
    let n = Number(document.getElementById("primeNum").value);
    let isPrime = true;

    if (n <= 1) {
        isPrime = false;
    } else {
        for (let i = 2; i < n; i++) {
            if (n % i === 0) {
                isPrime = false;
                break;
            }
        }
    }

    document.getElementById("primeResult").innerText =
        isPrime ? n + " is Prime" : n + " is Not Prime";
}


// Sum 1–100
function calculateSum() {
    let sum = 0;

    for (let i = 1; i <= 100; i++) {
        sum += i;
    }

    document.getElementById("sumResult").innerText = "Sum = " + sum;
}


// Guessing Game
let secret = Math.floor(Math.random() * 10) + 1;
let attempts = 5;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("attemptsLeft").innerText = "Attempts left: " + attempts;
});

function checkGuess() {
    let guess = Number(document.getElementById("guessInput").value);

    if (attempts <= 0) {
        document.getElementById("gameResult").innerText = "Game Over! Number was " + secret;
        return;
    }

    if (guess === secret) {
        document.getElementById("gameResult").innerText = "Correct! You win 🎉";
    } else if (guess > secret) {
        document.getElementById("gameResult").innerText = "Too high!";
        attempts--;
    } else {
        document.getElementById("gameResult").innerText = "Too low!";
        attempts--;
    }

    document.getElementById("attemptsLeft").innerText = "Attempts left: " + attempts;

    if (attempts === 0 && guess !== secret) {
        document.getElementById("gameResult").innerText = "Game Over! Number was " + secret;
    }
}