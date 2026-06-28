const TOTAL_SEATS = 40;

let students = [];
let seats = Array(TOTAL_SEATS).fill(null);
let selectedStudentId = null;

let lastTapSeatIndex = null;
let lastTapTime = 0;

loadData();
renderAll();

function saveData() {
    localStorage.setItem("students", JSON.stringify(students));
    localStorage.setItem("seats", JSON.stringify(seats));
}

function loadData() {
    const savedStudents = localStorage.getItem("students");
    const savedSeats = localStorage.getItem("seats");

    if (savedStudents) {
        students = JSON.parse(savedStudents);
    }

    if (savedSeats) {
        seats = JSON.parse(savedSeats);
    }

    if (!Array.isArray(seats) || seats.length !== TOTAL_SEATS) {
        seats = Array(TOTAL_SEATS).fill(null);
    }
}

function renderAll() {
    renderWaitingList();
    renderSeats();
    saveData();
}

function addStudent() {
    const input = document.getElementById("studentInput");
    const name = input.value.trim();

    if (name === "") {
        alert("请输入同学名字哦");
        return;
    }

    students.push({
        id: Date.now() + Math.random(),
        name: name
    });

    input.value = "";
    renderAll();
}

function addManyStudents() {
    const textarea = document.getElementById("bulkInput");
    const names = textarea.value
        .split("\n")
        .map(name => name.trim())
        .filter(name => name !== "");

    if (names.length === 0) {
        alert("请至少输入一个名字");
        return;
    }

    names.forEach(name => {
        students.push({
            id: Date.now() + Math.random(),
            name: name
        });
    });

    textarea.value = "";
    renderAll();
}

function getPlacedStudentIds() {
    return seats
        .filter(student => student !== null)
        .map(student => student.id);
}

function renderWaitingList() {
    const waitingList = document.getElementById("waitingList");
    waitingList.innerHTML = "";

    const placedIds = getPlacedStudentIds();

    const waitingStudents = students.filter(student => {
        return !placedIds.includes(student.id);
    });

    if (waitingStudents.length === 0) {
        waitingList.innerHTML = `<p class="empty-text">暂时没有未安排的同学</p>`;
        return;
    }

    waitingStudents.forEach(student => {
        const card = document.createElement("div");
        card.className = "student-card";
        card.textContent = student.name;
        card.draggable = true;

        if (selectedStudentId === student.id) {
            card.classList.add("selected");
        }

        card.addEventListener("click", () => {
            selectedStudentId = student.id;
            renderAll();
        });

        card.addEventListener("dragstart", event => {
            event.dataTransfer.setData("sourceType", "waiting");
            event.dataTransfer.setData("studentId", student.id);
        });

        waitingList.appendChild(card);
    });
}

function renderSeats() {
    const seatMap = document.getElementById("seatMap");
    seatMap.innerHTML = "";

    for (let row = 0; row < 5; row++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "seat-row";

        for (let col = 0; col < 8; col++) {
            const seatIndex = row * 8 + col;
            const seat = document.createElement("div");
            seat.className = "seat";

            if (seats[seatIndex]) {
                seat.classList.add("filled");
            }

            seat.innerHTML = `
                <span class="seat-number">${row + 1}-${col + 1}</span>
                <span>${seats[seatIndex] ? seats[seatIndex].name : "空座"}</span>
            `;

            seat.addEventListener("click", () => {
                handleSeatClick(seatIndex);
            });

            seat.addEventListener("dragover", event => {
                event.preventDefault();
                seat.classList.add("drag-over");
            });

            seat.addEventListener("dragleave", () => {
                seat.classList.remove("drag-over");
            });

            seat.addEventListener("drop", event => {
                event.preventDefault();
                seat.classList.remove("drag-over");

                const sourceType = event.dataTransfer.getData("sourceType");
                const studentId = Number(event.dataTransfer.getData("studentId"));
                const fromSeatIndex = Number(event.dataTransfer.getData("fromSeatIndex"));

                if (sourceType === "waiting") {
                    placeStudentById(studentId, seatIndex);
                }

                if (sourceType === "seat") {
                    swapSeats(fromSeatIndex, seatIndex);
                }

                renderAll();
            });

            if (seats[seatIndex]) {
                seat.draggable = true;

                seat.addEventListener("dragstart", event => {
                    event.dataTransfer.setData("sourceType", "seat");
                    event.dataTransfer.setData("fromSeatIndex", seatIndex);
                });
            }

            rowDiv.appendChild(seat);
        }

        seatMap.appendChild(rowDiv);
    }
}

function placeSelectedStudent(seatIndex) {
    if (selectedStudentId === null) {
        return;
    }

    placeStudentById(selectedStudentId, seatIndex);
    selectedStudentId = null;
    renderAll();
}

function handleSeatClick(seatIndex) {
    // 如果已经选中了一个同学，单击座位就是安排同学
    if (selectedStudentId !== null) {
        placeSelectedStudent(seatIndex);
        return;
    }

    // 如果没有选中同学，双击已经有人的座位就是取消安排
    const now = Date.now();

    if (
        seats[seatIndex] &&
        lastTapSeatIndex === seatIndex &&
        now - lastTapTime < 350
    ) {
        seats[seatIndex] = null;
        lastTapSeatIndex = null;
        lastTapTime = 0;
        renderAll();
        return;
    }

    lastTapSeatIndex = seatIndex;
    lastTapTime = now;
}

function placeStudentById(studentId, seatIndex) {
    const student = students.find(item => item.id === studentId);

    if (!student) {
        return;
    }

    for (let i = 0; i < seats.length; i++) {
        if (seats[i] && seats[i].id === studentId) {
            seats[i] = null;
        }
    }

    seats[seatIndex] = student;
}

function swapSeats(fromSeatIndex, toSeatIndex) {
    if (fromSeatIndex === toSeatIndex) {
        return;
    }

    const temp = seats[toSeatIndex];
    seats[toSeatIndex] = seats[fromSeatIndex];
    seats[fromSeatIndex] = temp;
}

function clearSeats() {
    seats = Array(TOTAL_SEATS).fill(null);
    selectedStudentId = null;
    renderAll();
}

function resetAll() {
    const confirmReset = confirm("确定要清空所有同学和座位吗？");

    if (!confirmReset) {
        return;
    }

    students = [];
    seats = Array(TOTAL_SEATS).fill(null);
    selectedStudentId = null;
    localStorage.clear();
    renderAll();
}

document.getElementById("studentInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        addStudent();
    }
});
