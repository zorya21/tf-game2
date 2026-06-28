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

    if (!Array.isArray(students)) {
        students = [];
    }

    if (!Array.isArray(seats) || seats.length !== TOTAL_SEATS) {
        seats = Array(TOTAL_SEATS).fill(null);
    }
}

function renderAll() {
    renderWaitingList();
    renderSeats();
    renderActionButtons();
    saveData();
}

function clearSelection() {
    selectedStudentId = null;
    selectedSourceSeatIndex = null;
}

function getSelectedStudent() {
    if (selectedStudentId === null) {
        return null;
    }

    return students.find(student => student.id === selectedStudentId) || null;
}

function renderActionButtons() {
    const renameBtn = document.getElementById("renameBtn");
    const deleteBtn = document.getElementById("deleteBtn");

    if (!renameBtn || !deleteBtn) {
        return;
    }

    const hasSelectedStudent = getSelectedStudent() !== null;

    renameBtn.disabled = !hasSelectedStudent;
    deleteBtn.disabled = !hasSelectedStudent;
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

        card.addEventListener("click", () => {
            selectStudentFromWaiting(student.id);
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

            if (selectedSourceSeatIndex === seatIndex) {
                seat.classList.add("selected-seat");
            }

            seat.innerHTML = `
                <span class="seat-number">${row + 1}-${col + 1}</span>
                <span class="seat-name">${seats[seatIndex] ? seats[seatIndex].name : "空座"}</span>
            `;

            seat.addEventListener("click", () => {
                handleSeatClick(seatIndex);
            });

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

    // 双击 / 双点已有人的座位：取消安排，但不会删除这个同学
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

    // 如果已经选中了一个同学，点座位就是安排 / 移动 / 交换
    if (selectedStudentId !== null) {
        if (selectedSourceSeatIndex === seatIndex) {
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

    // 如果目标座位有人，就交换
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

function renameSelectedStudent() {
    const student = getSelectedStudent();

    if (!student) {
        alert("请先点击一个同学名字，再点击修改。");
        return;
    }

    const newName = prompt(`把「${student.name}」修改为：`, student.name);

    if (newName === null) {
        return;
    }

    const trimmedName = newName.trim();

    if (trimmedName === "") {
        alert("名字不能为空哦。");
        return;
    }

    // 修改名单里的名字
    student.name = trimmedName;

    // 如果这个同学已经在座位上，也同步修改座位里的名字
    for (let i = 0; i < seats.length; i++) {
        if (seats[i] && seats[i].id === student.id) {
            seats[i].name = trimmedName;
        }
    }

    renderAll();
}

function deleteSelectedStudent() {
    const student = getSelectedStudent();

    if (!student) {
        alert("请先点击一个同学名字，再点击删除。");
        return;
    }

    const confirmDelete = confirm(
        `确定要彻底删除「${student.name}」吗？\n\n删除后，这个同学会从名单和座位表里消失。`
    );

    if (!confirmDelete) {
        return;
    }

    // 从学生名单里删除
    students = students.filter(item => item.id !== student.id);

    // 从座位表里删除
    for (let i = 0; i < seats.length; i++) {
        if (seats[i] && seats[i].id === student.id) {
            seats[i] = null;
        }
    }

    clearSelection();
    renderAll();
}

function cancelSelectionByBlankClick(event) {
    const clickedOnUsefulElement = event.target.closest(
        ".student-card, .seat, .waiting-actions, button, textarea, input"
    );

    // 如果点的是同学、座位、按钮、输入框，就不取消
    if (clickedOnUsefulElement) {
        return;
    }

    // 如果点的是空白区域，并且当前有选中的同学，就取消选择
    if (selectedStudentId !== null) {
        clearSelection();
        renderAll();
    }
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

document.addEventListener("click", cancelSelectionByBlankClick);
