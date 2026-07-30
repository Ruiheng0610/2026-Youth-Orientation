// =====================
// 遊戲資料
// =====================

const teams = [
    { name: "紅隊", color: "red", start: [0, 0] },
    { name: "藍隊", color: "blue", start: [0, 4] },
    { name: "黃隊", color: "yellow", start: [4, 4] },
    { name: "綠隊", color: "green", start: [4, 0] }
];

let currentTeam = 0;
let map = [];

let target = null;
let selectedCell = null;
let selectedElement = null;
let isChallenging = false;
let isBattling = false;
let battleTarget = null;

// 🎯 設定 C2, B3, D3, C4 四格的固定對戰遊戲
// 座標說明：C2=[1,2], B3=[2,1], D3=[2,3], C4=[3,2]
const specialBattleCells = {
    "1,2": { name: "C2", game: "人體杯架" },
    "2,1": { name: "B3", game: "地雷撲克牌" },
    "2,3": { name: "D3", game: "粒粒皆辛苦" },
    "3,2": { name: "C4", game: "精準翻轉" }
};

// 一般挑戰題庫
const challengeMap = [
    [null, "醜照三連拍", "模仿猩猩走路繞隊伍一圈", "平板撐20秒", null],
    ["全組用超浮誇慢動作走秀", "唸完繞口令", "演一個馬克杯", "不能用唱的唸完ㄅ-ㄦ、A-Z", "唸完同字順口溜"],
    ["emoji挑戰-全組一起擺出😊😎😡🫠的表情", "假裝自己中樂透演出慶祝10秒", "鴨子走路", "學一種動物叫三次", "句子英翻中翻台"],
    ["擺出最帥/最美的姿勢5秒", "模仿動漫角色喊招式", "閉眼原地轉五圈再往前走五步", "用台語或英語自我介紹", "說一句最土味的情話"],
    [null, "一起不能停的大笑10秒", "假裝自己在拍洗髮精廣告", "每人講一個不為人知的祕密", null]
];

const battleGames = [
    "默契大挑戰",
    "打出好成績",
    "人體拼字",
    "夾子園",
    "猜歌",
    "你說我猜"
];

const readingChallenges = {
    "1,1": "牛郎戀劉娘，劉娘念牛郎。\n牛郎年年戀劉娘，劉娘年年念牛郎。\n郎戀娘來娘念郎，念娘戀郎。", //B2 唸完繞口令
    "1,4": "人要是行，\n幹一行行一行，\n一行行行行行，\n行行行幹哪行都行。\n要是不行，\n幹一行不行一行，\n一行不行行行不行，\n行行不行幹哪行都不行。", //E2 唸完同字順口溜
    "2,4": "Where there is a will, \nthere is a way." //E3 句子英翻中翻台
};

let wheelAngle = 0;
let spinning = false;

// 顏色對應表
const colorMap = {
    "red": "#ff6666",
    "blue": "#6699ff",
    "yellow": "#ffff66",
    "green": "#66cc66"
};

// =====================
// 初始化地圖
// =====================
function init() {
    for (let r = 0; r < 5; r++) {
        map[r] = [];
        for (let c = 0; c < 5; c++) {
            let key = `${r},${c}`;
            let specialInfo = specialBattleCells[key];

            map[r][c] = {
                owner: null,
                corner: false,
                challenge: challengeMap[r][c],
                isSpecial: !!specialInfo,               // 是否為特殊四組對戰格
                fixedGame: specialInfo ? specialInfo.game : null, // 固定對戰項目
                locked: false                           // 是否永久鎖定
            };
        }
    }

    // 設定出生點
    teams.forEach((team) => {
        let [r, c] = team.start;
        map[r][c].owner = team.color;
        map[r][c].corner = true;
        map[r][c].challenge = "出生點";
    });

    drawMap();
    updateTurn();
}

// =====================
// 畫地圖
// =====================
function drawMap() {
    let table = document.getElementById("map");
    table.innerHTML = "";

    let header = document.createElement("tr");
    header.innerHTML = "<th></th>";
    ["A", "B", "C", "D", "E"].forEach(x => {
        header.innerHTML += `<th>${x}</th>`;
    });
    table.appendChild(header);

    for (let r = 0; r < 5; r++) {
        let row = document.createElement("tr");
        row.innerHTML += `<th>${r + 1}</th>`;

        for (let c = 0; c < 5; c++) {
            let td = document.createElement("td");
            let cell = map[r][c];

            if (cell.owner) {
                td.classList.add(cell.owner);
            }

            // 圖示優先層級判定
            if (cell.corner) {
                td.innerHTML = "🏰";
            } else if (cell.locked) {
                td.innerHTML = "🛡️"; 
                td.classList.add("lockedCell");
            } else if (cell.isSpecial && !cell.owner) {
                td.innerHTML = "⚔️"; // 爭奪中顯示雙刀
                td.classList.add("specialCell");
            }

            td.onclick = (event) => clickCell(r, c, event);
            row.appendChild(td);
        }
        table.appendChild(row);
    }
}

// 建立轉盤
function drawWheel() {
    let canvas = document.getElementById("wheel");
    let ctx = canvas.getContext("2d");
    let center = 175;
    let radius = 160;

    ctx.clearRect(0, 0, 350, 350);
    let colors = ["#ff7675", "#74b9ff", "#55efc4", "#ffeaa7", "#a29bfe", "#fd79a8"];

    for (let i = 0; i < 6; i++) {
        let start = i * Math.PI * 2 / 6;
        let end = (i + 1) * Math.PI * 2 / 6;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, start, end);
        ctx.fillStyle = colors[i];
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(start + Math.PI / 6);
        ctx.textAlign = "center";
        ctx.fillStyle = "black";
        ctx.font = "18px Microsoft JhengHei";
        ctx.fillText(battleGames[i], 100, 5);
        ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(center, center, 35, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
}

// =====================
// 點擊格子
// =====================
function clickCell(r, c, event) {
    if (isChallenging || isBattling) return;

    let cell = map[r][c];

    //  判定是否已被永久鎖定
    if (cell.locked) {
        alert("此格子已被永久占領，無法再次攻擊！");
        return;
    }

    if (cell.corner) {
        alert("不能挑戰起始的格子");
        return;
    }

    // 已經有人占領 → 普通對戰
    if (cell.owner != null) {
        if (cell.owner == teams[currentTeam].color) {
            alert("不能攻擊自己的領地");
            return;
        }

        if (canAttack(r, c)) {
            startBattleSelect(r, c, event);
        } else {
            alert("只能攻擊自己領地旁邊的格子");
        }
        return;
    }

    // 判斷是否鄰近自己的地
    if (!canAttack(r, c)) {
        alert("只能挑戰自己領地旁邊的格子");
        return;
    }

    // ⚔️ 特殊對戰格（空白時觸發四組大亂鬥）
    if (cell.isSpecial) {
        startSpecialBattleSelect(r, c, event);
        return;
    }

    // 普通空白格挑戰
    if (selectedElement) {
        selectedElement.classList.remove("selectedCell");
        selectedElement.classList.remove("battleCell");
    }

    selectedElement = event.target;
    selectedElement.classList.add("selectedCell");
    selectedCell = [r, c];

    let text = `是否確認挑戰：\n${String.fromCharCode(65 + c)}${r + 1}`;
    document.getElementById("challengeBox").innerHTML = text;

    let confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.onclick = confirmChallenge;
    confirmBtn.innerHTML = "確認";
    confirmBtn.style.display = "inline-block";
}

// 選擇一般挑戰
function confirmChallenge() {
    if (selectedCell == null) return;

    let [r, c] = selectedCell;
    target = [r, c];
    isChallenging = true;

    let text = `挑戰內容：\n<span class="challengeText">${map[r][c].challenge}</span>`;
    document.getElementById("challengeBox").innerHTML = text;

    document.getElementById("confirmBtn").style.display = "none";
    if (selectedElement) selectedElement.classList.remove("selectedCell");

    // 判斷是否為 B2(1,1)、E2(1,4)、E3(2,4)
    let key = `${r},${c}`;
    let leftPanel = document.getElementById("leftPanel");

    if (readingChallenges[key]) {
        // 如果點擊的是這三格，把文字塞進去並顯示左側面板
        document.getElementById("readingText").innerText = readingChallenges[key];
        leftPanel.style.display = "block"; 
    } else {
        // 如果是其他格，確保左側面板隱藏
        leftPanel.style.display = "none";  
    }

    // 重設按鈕為預設成功/失敗
    let successBtn = document.getElementById("successBtn");
    let failBtn = document.getElementById("failBtn");

    successBtn.innerHTML = "成功";
    successBtn.style.backgroundColor = "";
    successBtn.style.color = "";
    successBtn.style.display = "inline-block";

    failBtn.innerHTML = "失敗";
    failBtn.style.backgroundColor = "";
    failBtn.style.color = "";
    failBtn.style.display = "inline-block";
}

// 選擇普通領地攻擊
function startBattleSelect(r, c, event) {
    if (selectedElement) {
        selectedElement.classList.remove("selectedCell");
        selectedElement.classList.remove("battleCell");
    }

    selectedElement = event.target;
    selectedElement.classList.add("battleCell");
    battleTarget = [r, c];

    let text = `是否確認攻擊：\n${String.fromCharCode(65 + c)}${r + 1}`;
    document.getElementById("challengeBox").innerHTML = text;

    let confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.innerHTML = "確認";
    confirmBtn.style.display = "inline-block";
    confirmBtn.onclick = confirmBattle;
}

// 確認普通攻擊（開啟轉盤）
function confirmBattle() {
    if (battleTarget == null) return;
    let [r, c] = battleTarget;

    isBattling = true;
    selectedCell = null;
    target = null;

    let text = `準備對戰！<br><span class="challengeText" style="font-size:24px;">請點擊下方「開始轉盤」抽出對戰項目</span>`;
    document.getElementById("challengeBox").innerHTML = text;
    document.getElementById("wheelArea").style.display = "block";
    drawWheel();

    document.getElementById("confirmBtn").style.display = "none";

    let attacker = teams[currentTeam];
    let defenderColor = map[r][c].owner;
    let defender = teams.find(t => t.color === defenderColor);

    let successBtn = document.getElementById("successBtn");
    let failBtn = document.getElementById("failBtn");

    successBtn.innerHTML = attacker.name + " 勝";
    successBtn.style.backgroundColor = colorMap[attacker.color];
    successBtn.style.color = attacker.color === "yellow" ? "#333" : "white";
    successBtn.style.display = "inline-block";

    failBtn.innerHTML = (defender ? defender.name : "防守方") + " 勝";
    failBtn.style.backgroundColor = defender ? colorMap[defender.color] : "#e74c3c";
    failBtn.style.color = (defender && defender.color === "yellow") ? "#333" : "white";
    failBtn.style.display = "inline-block";

    if (selectedElement) selectedElement.classList.remove("battleCell");
}

// ⚔️ 選擇特殊四組對戰格
function startSpecialBattleSelect(r, c, event) {
    if (selectedElement) {
        selectedElement.classList.remove("selectedCell");
        selectedElement.classList.remove("battleCell");
    }

    selectedElement = event.target;
    selectedElement.classList.add("battleCell");
    battleTarget = [r, c];

    let cellName = `${String.fromCharCode(65 + c)}${r + 1}`;
    let text = `是否爭奪四組PK格【${cellName}】？`;
    document.getElementById("challengeBox").innerHTML = text;

    let confirmBtn = document.getElementById("confirmBtn");
    confirmBtn.innerHTML = "確認發動PK";
    confirmBtn.style.display = "inline-block";
    confirmBtn.onclick = confirmSpecialBattle;
}

// ⚔️ 確認發動四組大亂鬥
function confirmSpecialBattle() {
    if (battleTarget == null) return;
    let [r, c] = battleTarget;

    isBattling = true;
    selectedCell = null;

    let cell = map[r][c];
    let text = `🔥 四組爭奪戰 🔥<br>固定項目：<span class="challengeText">${cell.fixedGame}</span><br><small>(獲勝隊伍將永久獲得此地！)</small>`;
    document.getElementById("challengeBox").innerHTML = text;

    document.getElementById("wheelArea").style.display = "none"; // 不需要轉盤
    document.getElementById("confirmBtn").style.display = "none";
    document.getElementById("successBtn").style.display = "none";
    document.getElementById("failBtn").style.display = "none";

    // 動態產生 4 個隊伍的勝利按鈕
    let buttonArea = document.getElementById("buttonArea");
    buttonArea.innerHTML = ""; // 清空舊按鈕

    teams.forEach((team, index) => {
        let btn = document.createElement("button");
        btn.innerHTML = team.name + " 勝";
        btn.style.backgroundColor = colorMap[team.color];
        btn.style.color = team.color === "yellow" ? "#333" : "white";
        btn.onclick = () => winSpecialBattle(r, c, index);
        buttonArea.appendChild(btn);
    });

    if (selectedElement) selectedElement.classList.remove("battleCell");
}

// ⚔️ 判定四組大亂鬥贏家
function winSpecialBattle(r, c, winningTeamIndex) {
    let winner = teams[winningTeamIndex];

    map[r][c].owner = winner.color;
    map[r][c].locked = true; // 🔒 永久鎖定此格！

    restoreStandardButtons();
    endTurnProcess(`${winner.name} 贏得了爭奪戰！該格子已被永久鎖定！`);
}

// 還原按鈕區域結構
function restoreStandardButtons() {
    let buttonArea = document.getElementById("buttonArea");
    buttonArea.innerHTML = `
        <button id="confirmBtn" onclick="confirmChallenge()" style="display:none;">確認</button>
        <button id="successBtn" onclick="challengeResult(true)" style="display:none;">成功</button>
        <button id="failBtn" onclick="challengeResult(false)" style="display:none;">失敗</button>
    `;
}

// 判斷附近是否有自己的格子
function canAttack(r, c) {
    let team = teams[currentTeam].color;
    let dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let d of dirs) {
        let nr = r + d[0];
        let nc = c + d[1];
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
            if (map[nr][nc].owner == team) return true;
        }
    }
    return false;
}

// 轉盤旋轉
function spinWheel() {
    if (spinning) return;
    spinning = true;

    let canvas = document.getElementById("wheel");
    let result = Math.floor(Math.random() * 6);
    let targetAngle = result * 60 + 30;
    let rotateAngle = 270 - targetAngle;

    if (rotateAngle < 0) rotateAngle += 360;

    let currentSpins = Math.floor(wheelAngle / 360);
    wheelAngle = (currentSpins + 5) * 360 + rotateAngle;

    canvas.style.transform = `rotate(${wheelAngle}deg)`;

    setTimeout(() => {
        spinning = false;
        document.getElementById("challengeBox").innerHTML = `
        對戰遊戲：
        <span class="challengeText">
        ${battleGames[result]}
        </span>
        `;
    }, 4200);
}

// =====================
// 主持人判定 (一般對戰 / 一般空地)
// =====================
function challengeResult(success) {
    if (!isBattling && target == null) {
        alert("請先選擇格子");
        return;
    }

    if (isBattling && battleTarget == null) {
        alert("請先選擇對戰格");
        return;
    }

    if (success) {
        let [r, c] = isBattling ? battleTarget : target;
        map[r][c].owner = teams[currentTeam].color;
    }

    endTurnProcess("請選擇下一個挑戰");
}

// 結算回合與重置狀態
function endTurnProcess(message) {
    target = null;
    selectedCell = null;
    battleTarget = null;
    isChallenging = false;
    isBattling = false;

    document.getElementById("confirmBtn").style.display = "none";
    document.getElementById("successBtn").style.display = "none";
    document.getElementById("failBtn").style.display = "none";

    drawMap();
    nextTurn();

    document.getElementById("challengeBox").innerHTML = message;

    if (selectedElement) {
        selectedElement.classList.remove("selectedCell");
        selectedElement = null;
    }

    document.getElementById("wheelArea").style.display = "none";
    document.getElementById("leftPanel").style.display = "none";
}

// 換回合
function nextTurn() {
    currentTeam++;
    if (currentTeam >= 4) currentTeam = 0;
    updateTurn();
}

function updateTurn() {
    let team = teams[currentTeam];
    document.getElementById("turnInfo").innerHTML = `目前回合：
    <span class="${team.color}">${team.name}</span>`;
}

init();