const TOTAL_SEATS = 40;

let students = [];
let seats = Array(TOTAL_SEATS).fill(null);

// 当前选中的同学
let selectedStudentId = null;

// 如果这个同学来自座位，记录原座位；如果来自未安排名单，就是 null
let selectedSourceSeatIndex = null;

// 用来判断双击 / 双点取消座位
let lastTapSeatIndex = null;
let lastTapTime = 0;
const DOUBLE_TAP_TIME = 350;

loadData();
renderAll();

function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches;
}

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

function clearSelection() {
    selectedStudentId = null;
    selectedSourceSeatIndex = null;
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

        if (selectedStudentId === student.id && selectedSourceSeatIndex === null) {
            card.classList.add("selected");
        }

        // 手机 / iPad / 电脑都可以点一下选择
        card.addEventListener("click", () => {
            selectStudentFromWaiting(student.id);
        });

        // 电脑端保留拖拽，移动端不强制拖拽
        if (!isTouchDevice()) {
            card.draggable = true;

            card.addEventListener("dragstart", event => {
                event.dataTransfer.setData("sourceType", "waiting");
                event.dataTransfer.setData("studentId", student.id);
            });
        }

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

            if (selectedSourceSeatIndex === seatIndex) {
                seat.classList.add("selected-seat");
            }

            seat.innerHTML = `
                <span class="seat-number">${row + 1}-${col + 1}</span>
                <span>${seats[seatIndex] ? seats[seatIndex].name : "空座"}</span>
            `;

            // 统一手感：点击座位
            seat.addEventListener("click", () => {
                handleSeatClick(seatIndex);
            });

            // 电脑端拖拽功能
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

                clearSelection();
                renderAll();
            });

            if (seats[seatIndex] && !isTouchDevice()) {
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

function selectStudentFromWaiting(studentId) {
    // 如果已经选中了这个未安排同学，再点一次就是取消选择
    if (selectedStudentId === studentId && selectedSourceSeatIndex === null) {
        clearSelection();
    } else {
        selectedStudentId = studentId;
        selectedSourceSeatIndex = null;
    }

    renderAll();
}

function handleSeatClick(seatIndex) {
    const now = Date.now();
    const hasStudent = seats[seatIndex] !== null;

    const isDoubleTapSameSeat =
        hasStudent &&
        lastTapSeatIndex === seatIndex &&
        now - lastTapTime < DOUBLE_TAP_TIME;

    // 双击 / 双点已有人的座位：取消安排
    if (
        isDoubleTapSameSeat &&
        (selectedStudentId === null || selectedSourceSeatIndex === seatIndex)
    ) {
        seats[seatIndex] = null;
        lastTapSeatIndex = null;
        lastTapTime = 0;
        clearSelection();
        renderAll();
        return;
    }

    lastTapSeatIndex = seatIndex;
    lastTapTime = now;

    // 如果已经选中了一个同学，点座位就是移动 / 安排 / 交换
    if (selectedStudentId !== null) {
        if (selectedSourceSeatIndex === seatIndex) {
            // 点回原座位，不做移动，保持选中状态
            return;
        }

        if (selectedSourceSeatIndex !== null) {
            moveStudentFromSeatToSeat(selectedSourceSeatIndex, seatIndex);
        } else {
            placeStudentById(selectedStudentId, seatIndex);
        }

        clearSelection();
        renderAll();
        return;
    }

    // 如果没有选中任何同学，点一个已经有人的座位，就是选中这个同学
    if (hasStudent) {
        selectedStudentId = seats[seatIndex].id;
        selectedSourceSeatIndex = seatIndex;
        renderAll();
    }
}

function moveStudentFromSeatToSeat(fromSeatIndex, toSeatIndex) {
    if (fromSeatIndex === toSeatIndex) {
        return;
    }

    const movingStudent = seats[fromSeatIndex];

    if (!movingStudent) {
        return;
    }

    const targetStudent = seats[toSeatIndex];

    seats[toSeatIndex] = movingStudent;
    seats[fromSeatIndex] = targetStudent;
}

function placeStudentById(studentId, seatIndex) {
    const student = students.find(item => item.id === studentId);

    if (!student) {
        return;
    }

    // 如果这个同学之前已经坐在别的位置，先清掉原位置
    for (let i = 0; i < seats.length; i++) {
        if (seats[i] && seats[i].id === studentId) {
            seats[i] = null;
        }
    }

    // 如果目标座位原来有人，那个人会自动回到“未安排的同学”
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
    clearSelection();
    renderAll();
}

function resetAll() {
    const confirmReset = confirm("确定要清空所有同学和座位吗？");

    if (!confirmReset) {
        return;
    }

    students = [];
    seats = Array(TOTAL_SEATS).fill(null);
    clearSelection();
    localStorage.clear();
    renderAll();
}

document.getElementById("studentInput").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        addStudent();
    }
});
