
// ======================================
// 1. Even Numbers using filter()
// ======================================

function showEvenNumbers() {

    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    let evenNumbers = numbers.filter(function(num) {
        return num % 2 === 0;
    });

    document.getElementById("evenResult").innerText =
        "Even Numbers: " + evenNumbers.join(", ");
}


// ======================================
// 2. Laptop Object
// ======================================

const Laptop = {

    brand: "HP",

    ram: "16GB",

    price: "₹65,000",

    details: function() {

        return `
        Brand: ${this.brand}
        | RAM: ${this.ram}
        | Price: ${this.price}
        `;
    }
};

function showLaptopDetails() {

    document.getElementById("laptopResult").innerText =
        Laptop.details();
}


// ======================================
// 3. Marks Analysis
// ======================================

function analyzeMarks() {

    let marks = [78, 92, 65, 88, 95];

    let highest = Math.max(...marks);

    let lowest = Math.min(...marks);

    let total = 0;

    for (let mark of marks) {
        total += mark;
    }

    let average = total / marks.length;

    document.getElementById("marksResult").innerText =
        `
        Highest: ${highest}
        | Lowest: ${lowest}
        | Average: ${average.toFixed(2)}
        `;
}


// ======================================
// 4. Student Records App
// ======================================

let students = [];

function addStudent() {

    let name =
        document.getElementById("studentName").value;

    let marks =
        document.getElementById("studentMarks").value;

    if (name === "" || marks === "") {

        alert("Please fill all fields");

        return;
    }

    students.push({
        name: name,
        marks: marks
    });

    showStudents();

    document.getElementById("studentName").value = "";

    document.getElementById("studentMarks").value = "";
}

function showStudents() {

    let studentList =
        document.getElementById("studentList");

    studentList.innerHTML = "";

    students.forEach(function(student) {

        let li = document.createElement("li");

        li.innerText =
            `${student.name} - ${student.marks} Marks`;

        studentList.appendChild(li);
    });
}