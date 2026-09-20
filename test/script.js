const num1 = document.getElementById("num1");
const num2 = document.getElementById("num2");
const operation = document.getElementById("operation");
const button = document.getElementById("calculateBtn");
const result = document.getElementById("result");

button.addEventListener("click", calculate);

function calculate() {
    let first = num1.value;
    let second = num2.value;

    if (first === "" || second === "") {
        result.textContent = "Please enter both numbers";
        return;
    }

    let answer;

    if (operation.value === "add") {
        answer = first + second;
    }
    else if (operation.value === "subtract") {
        answer = first - second;
    }
    else if (operation.value === "multiply") {
        answer = first * second;
    }
    else if (operation.value === "divide") {
        answer = first / second;
    }

    result.textContent = "Result: " + answer;
}