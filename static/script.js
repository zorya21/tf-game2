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

// 长按删除相关
const LONG_PRESS_TIME = 650;
let lastLongPressTime = 0;

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
    saveData();
}

function clearSelection() {
    selectedStudentId = null;
    selectedSourceSeatIndex = null;
}

function shouldIgnoreClickAfterLongPress() {
    return Date.now() - lastLongPressTime < 700;
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

        // 单击选择未安排同学
        card.addEventListener("click", () => {
            if (shouldIgnoreClickAfterLongPress()) {
                return;
            }

            selectStudentFromWaiting(student.id);
        });

        // 长按彻底删除同学
        addLongPressDelete(card, student.id);

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

            // 单击座位：安排 / 选择 / 移动 / 交换
            seat.addEventListener("click", () => {
                if (shouldIgnoreClickAfterLongPress()) {
                    return;
                }

                handleSeatClick(seatIndex);
            });

            // 如果座位上有人，长按这个名字也可以彻底删除同学
            if (seats[seatIndex]) {
                addLongPressDelete(seat, seats[seatIndex].id);
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
            // 点回原座位，不移动
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

function deleteStudentWithConfirm(studentId) {
    const student = students.find(item => item.id === studentId);

    if (!student) {
        return;
    }

    const confirmDelete = confirm(
        `确定要彻底删除「${student.name}」吗？\n\n删除后，这个同学会从名单和座位表里消失。`
    );

    if (!confirmDelete) {
        return;
    }

    // 从学生名单里删除
    students = students.filter(item => item.id !== studentId);

    // 从座位表里删除
    for (let i = 0; i < seats.length; i++) {
        if (seats[i] && seats[i].id === studentId) {
            seats[i] = null;
        }
    }

    if (selectedStudentId === studentId) {
        clearSelection();
    }

    renderAll();
}

function addLongPressDelete(element, studentId) {
    let pressTimer = null;
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    element.addEventListener("pointerdown", event => {
        // 鼠标右键不触发
        if (event.button !== undefined && event.button !== 0) {
            return;
        }

        hasMoved = false;
        startX = event.clientX;
        startY = event.clientY;

        pressTimer = setTimeout(() => {
            lastLongPressTime = Date.now();
            clearSelection();
            deleteStudentWithConfirm(studentId);
        }, LONG_PRESS_TIME);
    });

    element.addEventListener("pointermove", event => {
        const moveX = Math.abs(event.clientX - startX);
        const moveY = Math.abs(event.clientY - startY);

        if (moveX > 10 || moveY > 10) {
            hasMoved = true;
            clearPressTimer();
        }
    });

    element.addEventListener("pointerup", () => {
        clearPressTimer();
    });

    element.addEventListener("pointerleave", () => {
        clearPressTimer();
    });

    element.addEventListener("pointercancel", () => {
        clearPressTimer();
    });

    // 防止手机长按时弹出浏览器自带菜单
    element.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

    function clearPressTimer() {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
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
